# Solana Explorer Example

This project contains example code for interacting with the Solana Explorer using JSON RPC.

The project contains a simple command line tool, `bin/get-tokens-created-by.js`, that will return info on all
SPL tokens created by a Solana accounts.

The tools takes a Solana address as its sole parameter and will return token info as a JSON object seperated by
a newline.

## Run

Run with the syntax below, replacing `WALLET_ID` with ID of the update/freeze authority.

```bash
npm ci
npx --package=./ get-tokens-created-by WALLET_ID
```
