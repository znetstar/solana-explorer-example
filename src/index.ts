import {
  Client,
  HTTPClientTransport,
  JSONSerializer
} from 'multi-rpc-browser';
import * as _ from 'lodash';
import * as path from 'path';

const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');

const GET_ACCOUNT_INFO_OPTIONS = Object.freeze({
  "encoding": "jsonParsed",
  "commitment": "confirmed"
});

export function makeSolanaRpcClient(clusterName: string = 'mainnet-beta') {
  const client = new Client(new HTTPClientTransport(new JSONSerializer(), `https://explorer-api.${clusterName}.solana.com`));

  return client;
}

const client = makeSolanaRpcClient();

export async function getWalletHistory(walletAddress: string, requestSize: number = 100) {
  let transArr: any[] = [];
  let lastTrans: any;
  // Loop through all transactions of a given wallet
  while (true) {
    const trans = await client.invoke('getConfirmedSignaturesForAddress2', [
      walletAddress,
      { limit: requestSize, before: lastTrans }
    ]);

    transArr.push(...trans);
    if (trans.length)
      lastTrans = trans.slice(-1)[0].signature;
    else
      break;

  }

  return transArr;
}

export async function* getAllTokensCreatedByInstructions(walletAddress: string) {
  // First we need to get all transactions associated with the wallet
  const signatures = (await getWalletHistory(walletAddress));

  // Let's keep a cache of parsed transactions (e.g., mints) so we don't have re-crawl across the whole blockchain upon each run
  const transDb = levelup(encode(leveldown(path.join(__dirname, '..', 'data', 'trans.db')), { valueEncoding: 'json' }));

  // console.log(`${signatures.length} signatures`);
  // Next we loop through transactions looking for "spl-token"s "mint"ed by the wallet.
  for (let n = 0; n < signatures.length; n++) {
    const s = signatures[n];
    let transaction: any;
    try {
      transaction = await transDb.get(s.signature)
    } catch (err) {
      transaction = await client.invoke('getConfirmedTransaction', [s.signature, GET_ACCOUNT_INFO_OPTIONS]);
      await transDb.put(s.signature, transaction);
      // console.log(`${Math.round((n/signatures.length)*100)}% processed ${n}/${signatures.length}`);
    }
    const instructions = _.get(transaction, 'transaction.message.instructions') || [];
    for (const instruction of instructions) {
      // We only care about "initializeMint" (aka first mint) instructions on "spl-token" programs.
      if (instruction.program === 'spl-token' && instruction.parsed.type === 'initializeMint') {
        yield instruction;
      }
    }
  }
}

export async function getAccountInfo(id: string) {
  const account = await client.invoke('getAccountInfo', [id, GET_ACCOUNT_INFO_OPTIONS]);

  return _.get(account, 'value.data.parsed');
}

export async function* getAccountBatch(ids: string[], batchSize: number = 100) {
  const idsClone = ids.slice(0);

  while (idsClone.length) {
    const idsToProcess = idsClone.splice(0, batchSize);
    const batchOfAccounts = await Promise.all(idsToProcess.map(async (id) => {
      return getAccountInfo(id);
    }));

    for (const account of batchOfAccounts) {
      if (_.isEmpty(account))
        continue;
      yield account;
    }
  }
}

export async function getAccountBatchAll(ids: string[], batchSize: number = 100) {
  const result: any[] = [];
  for await ( const r of getAccountBatch(ids, batchSize) ) result.push(r);
  return result;
}

export async function getAllTokensCreatedBy(walletAddress: string) {
  const tokenIds = new Set<string>();

  for await (const instruction of getAllTokensCreatedByInstructions(walletAddress))
    tokenIds.add(instruction.parsed.info.mint);

  return Array.from(tokenIds.values());
}
