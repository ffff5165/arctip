# ArcTip contract design (approved, written, deployed to Arc Testnet)

Status: design approved as proposed (no fee, no payout wallet change, avatar as URL). Source is in `contracts/ArcTip.sol`, reviewed and tested (67 Foundry tests passing). Deployed to Arc Testnet at `0xf17110ca1ce1bc1e39d8f3e1626f3b76a4725933`. Target: Arc Testnet only, test USDC only.

## Goals

- Give each creator a unique, human-readable handle and a public profile.
- Let any supporter send USDC to a creator with an optional short message.
- Keep tipping history verifiable onchain, with no backend or database.
- Never custody funds: a tip goes straight from supporter to creator.

## Non-goals (v1)

- No platform fee, no subscriptions, no refunds, no admin withdrawal.
- No upgradeability, no pause switch, no owner role.
- No native-coin tips. On Arc, USDC is also the gas token, so tipping uses the USDC ERC-20 interface (6 decimals) only.

## Actors

| Actor | What they can do |
| --- | --- |
| Creator | Register one handle for their wallet, edit their profile, receive tips |
| Supporter | Tip any registered creator |
| Anyone | Read profiles, totals and tip events |

There is no privileged actor. Nobody can move funds or edit another person's profile.

## Contract: `ArcTip`

Constructor: `ArcTip(IERC20 usdc, uint256 minTip)`. Both are immutable. `usdc` is the Arc Testnet USDC address from the project's onchain facts, `minTip` defaults to 10000 (0.01 USDC).

### State

- `mapping(address => Creator) creators`: handle, displayName, bio, avatarUrl, registeredAt.
- `mapping(bytes32 => address) handleOwner`: keccak256 of the handle to its owner.
- `mapping(address => uint256) totalReceived`: lifetime USDC received, raw 6-decimal units.
- `mapping(address => uint256) tipCount`.

### Functions

| Function | Access | Behavior |
| --- | --- | --- |
| `registerCreator(handle, displayName, bio, avatarUrl)` | any wallet, once | Validates the handle (3-32 chars, `a-z 0-9 _`), checks it is free and the wallet is not registered, stores the profile, emits `CreatorRegistered` |
| `updateProfile(displayName, bio, avatarUrl)` | registered creator | Edits profile fields. The handle can never change, so shared links stay valid |
| `tip(creator, amount, message)` | any wallet | Requires a registered creator, `amount >= minTip`, `bytes(message).length <= 140`, `creator != msg.sender`. Does `usdc.safeTransferFrom(msg.sender, creator, amount)`, updates counters, emits `Tipped` |
| `getCreator`, `creatorOfHandle`, `isRegistered`, `totalReceived`, `tipCount`, `minTip` | view | Reads for the app |

### Events

- `CreatorRegistered(address indexed creator, string handle)`
- `ProfileUpdated(address indexed creator)`
- `Tipped(address indexed creator, address indexed supporter, uint256 amount, string message)`

Tip history is the `Tipped` event log, filtered by `creator` (dashboard, creator page) or `supporter` (a supporter's own history). Totals on the dashboard come from the `totalReceived` and `tipCount` counters, so they stay exact even if the log scan covers only a recent window.

## Payment flow

1. Supporter approves `amount` USDC to the ArcTip contract (skipped if the allowance already covers it).
2. Supporter calls `tip`. The contract pulls USDC from the supporter and sends it to the creator in the same call.

The contract never holds a USDC balance, so there is nothing to drain. The two steps are two wallet confirmations; the app shows each one honestly.

## Security model

| Risk | Mitigation |
| --- | --- |
| Custody or drain | Funds move supporter to creator in one call. No balance, no withdraw function, no owner |
| Reentrancy | USDC is a known token, state is updated before the transfer (checks-effects-interactions), and the function carries a reentrancy guard anyway |
| Unsafe token calls | `SafeERC20` for every transfer |
| Handle squatting | First come, first served, one handle per wallet, handles are permanent. Acceptable for a testnet v1 |
| Handle spoofing and lookalikes | Charset limited to lowercase letters, digits and underscore. No unicode |
| Griefing through message or profile text | Hard length caps. Text is rendered as plain text in the app, never as HTML |
| Creator wallet blocked by USDC | The tip reverts and the supporter keeps their funds |
| Fee-on-transfer or rebasing token | Not applicable: the token is fixed at deploy to Circle's USDC |
| Self-tipping to inflate totals | Rejected. Sybil tipping from other wallets cannot be prevented onchain, so totals are not a trust signal |

Messages and profiles are public and permanent. The app warns creators and supporters not to put personal data in them.

## Testing plan

Foundry unit tests: registration happy path and every revert (bad handle, taken handle, double registration), profile update access, tip happy path with exact balance changes, minimum tip, message length, unregistered creator, self-tip, insufficient allowance, event contents, and fuzzing of amounts. An invariant test checks that the contract's USDC balance is always zero.

## Deployment plan (not started)

Deploy to Arc Testnet from the platform deploy flow with constructor args `(USDC address, 10000)`. Then record the address in `VITE_ARCTIP_ADDRESS` and the deployment block in `VITE_ARCTIP_DEPLOY_BLOCK` so the app can scan history from the right block.

## Decisions

1. Platform fee: none.
2. Payout wallet change: not allowed.
3. Avatars: stored as an image URL, with initials as fallback.
