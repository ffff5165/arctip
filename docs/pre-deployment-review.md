# ArcTip final pre-deployment review

Source reviewed: `contracts/ArcTip.sol`, SHA-256 `a115fd824f6047858d1bdf9af8a662162835e88e7d1dfe76d1b9b03df9573e7e` (unchanged since the earlier build). Nothing was deployed and nothing was changed onchain. Every check ran locally, on a local copy (fork) of Arc Testnet, or as a read-only call to the live network.

Verdict: no blocking issues found. Remaining risks are listed at the end so you can accept them knowingly.

## How this review was run

- Re-read the full source line by line against each of your eight questions.
- Re-ran the 67 unit tests: all pass (fuzz and invariant tests included).
- Deployed the exact bytecode to a local fork of Arc Testnet and exercised registration and profile logic against the real chain state.
- Made read-only calls to live Arc Testnet to check the USDC token.

## 1. Handle uniqueness, normalization, permanence

- Unique: the handle's keccak256 hash is stored in `handleOwner`; a second registration of the same handle reverts (`HandleTaken`). Confirmed on the fork.
- One handle per wallet: a second registration from the same wallet reverts (`AlreadyRegistered`). Confirmed on the fork.
- Normalization: the contract does not lowercase anything. It does something stricter: only `a-z`, `0-9` and `_` are accepted, 3 to 32 bytes, so uppercase, spaces, punctuation and non-ASCII characters are rejected. Looking up `Alice_Arc` returns "unclaimed" and never reverts. The app lowercases input before it reaches the contract.
- Permanence: there is no function that changes or releases a handle. `updateProfile` cannot touch it. Confirmed on the fork.

## 2. Profile update authorization and validation

- Only a registered wallet can call `updateProfile`, and it only edits its own entry (it uses `msg.sender`). A non-creator reverts (`NotRegistered`). Confirmed on the fork.
- Display name 1 to 48 bytes, bio up to 280 bytes, avatar up to 200 bytes, all measured in bytes. An empty display name reverts. All tested.
- The avatar's `https://` rule is enforced by the app only, not the contract.

## 3. `tip()` and USDC `transferFrom`

- Checks run first: creator registered, amount at least `minTip`, message at most 140 bytes, creator is not the caller.
- Then one call: `usdc.safeTransferFrom(msg.sender, creator, amount)`. It pulls from the supporter (who must have approved the contract) directly to the creator. The contract's own balance is never involved. `SafeERC20` handles tokens that return nothing or `false`.
- Unit tests (mock USDC) confirm exact balance changes and that the contract balance stays zero.
- Not testable before deployment: a plain local copy of Arc cannot execute Arc's USDC transfers. Even a direct `USDC.transfer` reverts there, because Arc's USDC relies on network-level behaviour that the local tool does not emulate. I confirmed on the live network, with a read-only simulation, that a normal USDC transfer succeeds. So the first real `transferFrom` through ArcTip will happen after deployment (see the first risk below).

## 4. Counters and rollback

- `totalReceived` and `tipCount` are increased before the transfer. If the transfer fails for any reason (no allowance, low balance, USDC pause or blocklist), the whole transaction reverts and both counters go back. Unit tests assert this for failed transfers, and a fuzz test checks the counters against a running total.

## 5. Reentrancy and external calls

- `tip` is `nonReentrant`.
- The only external call in the contract is the USDC transfer. Everything else is reads and writes of its own storage. `registerCreator` and `updateProfile` make no external calls.
- Counters are updated before the call, and the event is emitted after it.
- Residual: if Circle upgrades the USDC contract, ArcTip trusts whatever it becomes. See risks.

## 6. Constructor arguments and USDC decimals

- Arguments: `usdc_ = 0x3600000000000000000000000000000000000000`, `minTip_ = 10000`. Both are immutable. Zero values revert.
- The token at that address has code, reports symbol `USDC` and `decimals() = 6` (live call, and on the fork). It is not paused (`paused() = false`). Name: `USDC`, version `2`.

## 7. 10000 means 0.01 USDC

- Yes. USDC has 6 decimals, so 1 USDC is 1,000,000 raw units and 10,000 raw units is 0.01 USDC. The app's own formatting returns `0.01` for `10000`.

## 8. Arc Testnet compatibility

- Chain ID 5042002 confirmed on the live RPC and the fork.
- Compiled for the Cancun EVM with Solidity 0.8.28. The runtime code is 4,767 bytes, far under the 24,576-byte limit.
- Deploys cleanly on a fork of Arc: 1,109,113 gas used, against the earlier estimate of 1,119,083.
- Arc specific: USDC is both the gas token and the ERC-20. A wallet's USDC balance goes down by the gas it pays, so a tip costs the supporter the tip plus a small fee. The contract takes no fee itself.

## Remaining risks

1. First real USDC transfer is untested. The contract logic is fully tested, but the real `transferFrom` through ArcTip will first run after deployment. Mitigation: right after deploying, do one small end-to-end test with a wallet you control (for example a 0.01 USDC tip between two of your wallets). That would need your explicit approval.
2. USDC is upgradeable and can pause or blocklist addresses. If a creator's wallet is blocklisted, tips to them revert and the supporter keeps their money. If Circle changes the token, ArcTip depends on the new behaviour. This is inherent to using Circle USDC.
3. Handles are permanent and first come, first served. Someone can take a name that looks like a brand or another person, and ASCII lookalikes such as `l` and `1` are allowed. There is no moderation or recovery. Acceptable for a testnet.
4. Everything written to the contract is public and permanent, including old profile text (it stays in transaction data after an edit). The app warns about this.
5. The avatar link is any string up to 200 bytes. The app only accepts `https://` in its form, but it does not re-check what the contract returns, and a third-party image host can see who views the image. A small app hardening for later: re-check `https://` when displaying, and stop sending referrer information.
6. USDC sent straight to the contract address, outside `tip`, cannot be recovered. Normal tips never touch the contract balance.
7. Settings are fixed. If `minTip` or the USDC address were wrong, you would need to deploy a new contract. Both were verified above.
8. Deployment uses the shared platform testnet wallet. The contract has no owner, so this gives that wallet no power over it.
9. No third-party audit. The two automated reviews, static analysis and tests are not a substitute for one. Fine for testnet, required before any mainnet use.

## Ready to deploy when you authorize

Constructor arguments: `(0x3600000000000000000000000000000000000000, 10000)`, network Arc Testnet (5042002).
