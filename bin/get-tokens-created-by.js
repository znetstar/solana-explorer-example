#!/usr/bin/env node

const {getAllTokensCreatedBy, getAccountBatch, getTokenMetadata} = require("../lib");
const argv = require('minimist')(process.argv.slice(2));
process.stdin.resume();
(async () => {
  const updateAuthority = argv._[0];

  // Lets grab all token ids
  const tokenIds = await getAllTokensCreatedBy(updateAuthority);
  const results = [];
  //                                                    v--- Controls how many concurrent calls to the chain we make to get info.
  for await (const result of getAccountBatch(tokenIds, 25)) {
    try {
      result.meta = [];
      const metas = new Set();
      for await (const meta of getTokenMetadata(result.id)) {
        metas.add(JSON.stringify(meta));
      }

      // This is to remove duplicate meta objects
      result.meta = Array.from(metas.values()).map((s) => JSON.parse(s));

      process.stdout.write(
        JSON.stringify(result) + "\n"
      );
    } catch (err) {
      console.error(err.stack);
    }
  }

  process.exit(0);
})().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
