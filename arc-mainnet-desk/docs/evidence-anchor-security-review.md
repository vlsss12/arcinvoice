# EvidenceAnchor security review — limited, independent checklist

Date: 2026-09-23. Scope: `onchain/src/EvidenceAnchor.sol`, its Foundry tests, and the browser-side `evidence-anchor.mjs` verifier. This is a source review and test record, **not** an independent audit, formal verification, or production security certification.

## Intended trust boundary

The contract is a public append-only registry of non-zero 32-byte digests. Anyone can submit a digest; its presence means only that a particular address submitted those 32 bytes at a block timestamp. It does not authenticate the author of the underlying report, its accuracy, confidentiality, finality, or any Arc/Circle approval. The browser verifier reads a user-supplied digest through the public Arc Mainnet RPC and does not connect to a wallet or submit a transaction.

## Findings and mitigations

| Area | Observation | Residual risk / action |
| --- | --- | --- |
| Asset custody | No token-transfer, withdrawal, owner, admin, upgrade, or delegated execution path exists. `receive` and `fallback` revert. | The sender still pays the chain fee for `anchor`; review network, value, and fee in the wallet before approving. |
| Registry writes | Zero digests and duplicate digests revert; state stores only submitter and timestamp, and an event is emitted. Anyone can anchor any otherwise unused digest. | A third party can anchor the same digest first. Never interpret `exists` alone as proof that the project submitted it; compare the submitter and transaction independently. |
| Permanence and privacy | No report bytes are stored, but a digest and submitter remain public permanently. | Hash only a reviewed public-safe payload. A digest of a predictable or sensitive document can still enable correlation or guessing. There is no deletion path. |
| Browser verifier | It checks chain ID 5042, takes a fixed block, checks exact deployed runtime SHA-256, then calls `getAnchor` at that block. ABI decoding rejects malformed or inconsistent results. | It trusts the selected RPC for chain history, block, bytecode, and return data. Cross-check with an independent explorer or RPC; this is not cryptographic light-client verification. |
| Availability | Public JSON-RPC and browser Web Crypto are external dependencies. | RPC outage, pruning, rate limits, CORS, or browser limitations can make verification unavailable; an error is not evidence that no anchor exists. |
| Build reproducibility | The live verifier pins the observed deployed runtime, including compiler metadata. The Foundry build's executable portion was compared separately, but its metadata differs from the deployed Remix build. | Preserve deployment source/settings and repeat the comparison before treating the exact runtime pin as long-term provenance. Source similarity alone is not a full independent deployment attestation. |

## Checks performed

- Browser verifier tests: 6 passed, 1 optional local-build comparison skipped in this clean checkout. They cover runtime pinning, input and ABI validation, fixed-block read-only behavior, wrong chain, unrelated/missing code, malformed block number, and a valid missing anchor.
- Solidity tests in source cover first write and event, duplicate and zero-digest rejection, value rejection, and unknown-call rejection. The prior Foundry run reported 5 passed; Foundry is unavailable in this review environment, so they were **not rerun here**.
- No automated test or source review can establish that an RPC returned honest data or that a future report is safe to publish.

## Release decision

Suitable to publish as an **unaudited, read-only verifier and minimal registry demonstration** with the boundaries above. Not sufficient to claim a complete onchain evidence flow until a reviewed public-safe payload is anchored by the wallet owner, its exact digest/submitter/transaction are independently checked, and the live readback is documented. Do not anchor solely to satisfy a funding application.
