# Arc Mainnet receipt verification — reproducible public-data case study

Date checked: 2026-09-22. This is a read-only test against a **third-party public transaction**, not a payment made by Arc Mainnet Desk or a customer. No wallet was connected and no transaction was sent.

## Inputs

- Live app: `https://arc-mainnet-desk.vercel.app/#intent-lab`
- Official Arc Mainnet RPC: `https://rpc.mainnet.arc.io`
- Public transaction: `0xb147ec455818b74b6511e905abc6f56e15c189432f3c0e98b397108e6916d8e3`
- Independent explorer page: `https://explorer.arc.io/tx/0xb147ec455818b74b6511e905abc6f56e15c189432f3c0e98b397108e6916d8e3`
- Expected recipient used for the test: `0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f`

## Observed checks

1. Without expected recipient or amount, the live verifier returned chain ID `0x13b2` (5042), receipt status `SUCCESS`, block `21,275,358`, and **8** transfer events from Arc's documented native USDC system emitter.
2. With the expected recipient above and `418.000162` USDC, the verifier returned `INTENT MATCHED`. Event 1, log 53, showed that recipient and amount.
3. Keeping the recipient but changing expected amount to `418.000163` USDC returned `AMOUNT MISMATCH`. This checks exact 18-decimal comparison at the 6-decimal display boundary; it does not establish payment purpose.
4. In the merchant reconciliation desk, a local request for `418.000162` USDC to the same recipient returned `RECONCILED` for the same receipt, with one exact-match event, one recipient-match event, and the receipt timestamp `2026-09-17T05:05:48.000Z`. This demonstrates the local request-to-receipt workflow. The local request was made for testing after observing a third-party public transaction; it was **not** a real merchant invoice.
5. Replacing the Mainnet RPC with the official Testnet RPC returned a chain-ID error (`expected 0x13b2`, `received 0x4cef52`) and made no USDC assertion. This checks a wrong-network guardrail.

## Independent specification checks

Arc documents the native USDC emitter as `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` with 18-decimal `Transfer` events. Its separate ERC-20 USDC interface emits 6-decimal events. Counting both as independent transfers would double-count activity. The live verifier used the native emitter only, as intended.

- Arc USDC system events: `https://docs.arc.io/arc/references/usdc-system-events`
- Arc RPC and chain ID: `https://docs.arc.io/arc/references/rpc-endpoints`

## Limits

This case shows that the public site decoded one known Mainnet receipt, distinguished an exact intent from an amount mismatch, and reconciled a browser-local request at the time of observation. It does **not** prove merchant adoption, production reliability, settlement for a particular invoice, ownership of the recipient, or an Arc/Circle endorsement. Repeat against additional successful, failed, and edge-case receipts before making a broader quality claim.
