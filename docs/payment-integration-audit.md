# ArcTip wallet and USDC payment audit

Scope: read-only inspection of the project plus read-only calls to Arc Testnet. Nothing was deployed, no transaction was sent, no private key was used.

## Short version

The app is wired correctly for Arc Testnet and real USDC, but **no tip can be sent yet**. The tip flow needs the ArcTip smart contract, and that contract has not been written or deployed. Until it exists, every page runs in labeled demo mode.

## 1. The seven checks

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Arc Testnet chain ID is 5042002 | Pass | The network's own RPC answered `eth_chainId` with `0x4cef52`, which is 5042002. The app reads the same number from the built-in chain list (`src/onchain-facts.ts`) and the chain definition in viem |
| 2 | USDC address is `0x3600...0000` | Pass | The app takes the address from `src/onchain-facts.ts`, where it matches exactly. The address holds a verified contract on Arc Testnet (a Circle USDC proxy, upgradeable) |
| 3 | USDC has 6 decimals | Pass | A live `decimals()` call to the token returned 6, and `symbol()` returned `USDC`. The app's amount handling uses 6 decimals through `src/onchain-money.ts`, never a typed-in number |
| 4 | Wallet connection works | Implemented, not verified in a browser | See section 2 |
| 5 | Send Tip does a real ERC-20 USDC transfer | Real flow, currently disabled | See section 3 |
| 6 | Hashes and receipts are recorded | Partly | See section 4 |
| 7 | Missing contracts or integrations | Yes | See section 5 |

One more fact worth knowing: on Arc, USDC is both the gas coin and an ERC-20 token. They are the same money seen two ways (18 decimals as gas, 6 decimals as a token). ArcTip only shows the 6-decimal token balance, so nothing is counted twice.

## 2. Wallet connection

Implemented:
- A "Connect wallet" button in the header, and on the dashboard, history, profile and tipping pages. It opens the ConnectKit wallet window.
- The app supports browser wallets only (the `injected` connector, for example MetaMask or Rabby).
- If the wallet is on another network, a bar under the header offers "Switch", and the tip and profile flows switch the network automatically before sending.

Could not verify here: the sandbox has no browser wallet, and no wallet activity has been recorded yet (no trace file exists). The code path is the standard one and no startup errors appear in the console log, but you need to click Connect in the preview with a wallet installed to confirm it.

Limitation: there is no WalletConnect option, so phone users without a wallet browser cannot connect. Adding it needs a free WalletConnect project ID from you.

## 3. Does Send Tip do a real USDC transfer?

The code does a real, two-step ERC-20 payment (`src/hooks/useTip.ts`):

1. Check the supporter's USDC allowance for the ArcTip contract. If it is too low, ask the wallet to approve exactly the tip amount on the real USDC token.
2. Call `tip(creator, amount, message)` on the ArcTip contract. The contract then pulls the USDC from the supporter and sends it to the creator in the same transaction.

So it is not a fake button and not a simulation. Each state (switching network, approving, confirming, tipping) comes from the wallet or a real receipt, never a timer.

But today it cannot run:
- There is no contract address configured (`VITE_ARCTIP_ADDRESS` is unset), so the tipping page shows a "Demo UI" banner and the button reads "Tipping unavailable in demo".
- It is also not a plain `transfer` to the creator. It goes through the contract on purpose, so the tip message and the history are recorded onchain.

## 4. Transaction hashes and receipts

Recorded:
- The app waits for each transaction's receipt and treats anything other than "success" as a failure.
- The hash is shown with an ArcScan link while a tip or profile change confirms.
- The permanent record is the contract's `Tipped` event. The history and dashboard pages read these events straight from the chain (hash, sender, recipient, amount, block time). The status column shows "Confirmed" because only successful transactions emit the event.

Gaps:
- The hash lives in the page's memory only. Close the tab and it is gone from the success screen (it is still in History once the contract exists).
- The approval receipt is awaited but its success status is not checked. If an approval reverted, the next step would fail with a generic message. Small fix: check the approval receipt like the tip receipt.
- Failed or reverted transactions leave no event, so they never appear in History.
- If the deployment block is not configured, history only scans a recent window of blocks, and the "supporters" count covers only that window.

## 5. What is missing

| Missing | Why it matters |
| --- | --- |
| The ArcTip smart contract (`contracts/` has no ArcTip source, no tests, no deployment) | Nothing can be sent or recorded without it |
| `VITE_ARCTIP_ADDRESS` and `VITE_ARCTIP_DEPLOY_BLOCK` settings | Turns the app from demo mode to live mode |
| A compiler-generated ABI | The app's ABI (`src/lib/arctip.ts`) was written by hand from the design doc. It must be replaced or checked against the compiled contract so they cannot drift apart |
| Contract tests and a security review | Required before anything is deployed |
| WalletConnect (optional) | Mobile wallet support |
| Image hosting for avatars (optional) | Avatars are links to images hosted elsewhere |
| An indexer (optional, later) | Fast history and exact supporter counts without scanning blocks in the browser |

Open design choices still waiting for you: platform fee, payout wallet changes, avatar as a link (see `docs/contract-design.md`).

## 6. Next steps, in order

1. Answer the three open design questions (or accept the defaults: no fee, no wallet change, avatar link).
2. Write the ArcTip contract from the design doc, review it and write tests.
3. After you approve, deploy to Arc Testnet and record the address and block in the app settings.
4. Replace the hand-written ABI with the compiled one and fix the approval receipt check.
5. Test end to end with a wallet: connect, create a profile, tip from a second wallet using test USDC from the "Get test USDC" button in the sidebar, then confirm the record in History and on ArcScan.
6. Optionally add WalletConnect for mobile users.
