# ArcTip

A USDC tipping platform on Arc Testnet. Creators claim a handle and get a personal tipping page; supporters send USDC tips; every tip is a public onchain record.

Built with [Arc Studio](https://studio.arc.io)

Status: the app interface and the ArcTip smart contract (`contracts/ArcTip.sol`, design in `docs/contract-design.md`) are written, tested and deployed to Arc Testnet. Profiles, tips and history are read from and written to the contract. If `VITE_ARCTIP_ADDRESS` is empty, pages fall back to a labeled demo state.

## Tech stack

React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit, Solidity with Foundry. Arc Testnet and test USDC only.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Other commands: `bun run check` (lint and typecheck), `bun run contracts:build`, `bun run contracts:test`.

### Environment variables

- `VITE_ARCTIP_ADDRESS`: address of the deployed ArcTip contract on Arc Testnet. Leave empty until deployed.
- `VITE_ARCTIP_DEPLOY_BLOCK`: block the contract was deployed at, so tip history scans from the right place.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: provisioned by Arc Studio, optional outside it.

## Pages

- `/` landing page
- `/dashboard` your profile, tipping link, totals, supporters and recent transactions
- `/create-profile` create or edit your display name, username, avatar and bio
- `/c/<username>` public tipping page where supporters send USDC
- `/history` tips you received and tips you sent, with hash, address, amount, date and status

Without a configured contract address, pages are labeled "Demo UI", profiles can only be saved as a draft in your browser, and no tips can be sent.
