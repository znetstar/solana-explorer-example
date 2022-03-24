#!/usr/bin/env node

const {getAllTokensCreatedBy, getAccountBatch} = require("../lib");
const argv = require('minimist')(process.argv.slice(2));

(async () => {
  const updateAuthority = argv._[0];

  // Lets grab all token ids
  const tokenIds = await getAllTokensCreatedBy(updateAuthority);

  //                                                   v--- Controls how many concurrent calls to the chain we make to get info.
  for await (const result of getAccountBatch(tokenIds, 25)) {
    process.stdout.write(
      JSON.stringify(result.info) + "\n"
    )
  }

  process.exit(0);
})().catch(err => {
  process.stderr.end(err.stack);
  process.exit(1);
});
