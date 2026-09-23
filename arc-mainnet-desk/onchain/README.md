# Evidence Anchor

A deliberately minimal Solidity contract for making a reviewed Arc Mainnet Desk evidence-pack digest independently verifiable onchain.

## What it does

`anchor(bytes32 evidenceDigest)` records a non-zero 32-byte SHA-256 digest once. The contract stores the submitter and block timestamp and emits an indexed `EvidenceAnchored` event.

Anyone can later use `getAnchor` or `isAnchored` to verify whether the same digest was anchored by this exact deployment.

## What it does not do

- does not create, transfer, trade, or custody a token;
- does not have an owner, admin, roles, pause switch, upgrade mechanism, or withdrawal function;
- does not accept native value;
- does not store a report, URL, note, wallet secret, personal data, or token metadata;
- does not attest that evidence is accurate, official, complete, final, or approved by Arc/Circle.

An onchain digest is permanent. Only anchor the SHA-256 output of a report that has already passed a public-safety review.

## Project layout

```text
onchain/
├── src/EvidenceAnchor.sol
├── test/EvidenceAnchor.t.sol
├── script/DeployEvidenceAnchor.s.sol
└── foundry.toml
```

## Local review

The project uses [Foundry](https://book.getfoundry.sh/). Install Foundry independently, then run:

```bash
cd arc-mainnet-desk/onchain
forge install foundry-rs/forge-std --no-commit
forge fmt --check
forge test
forge build
```

The tests cover successful anchoring, duplicate rejection, zero-digest rejection, accidental value transfer rejection, and unknown function-call rejection.

## Verification status (2026-09-22)

- `forge fmt --check`: passes after formatting.
- Foundry compilation with the official Solidity 0.8.30 binary: passes with optimization enabled.
- `forge test`: all 5 tests pass (0 failures), including the corrected low-level-call revert assertions.
- A separate local EVM smoke test passed for deployment, first anchor, readback, duplicate/zero-digest rejection, unknown-call rejection, and value rejection. It used Ganache locally and did not connect to Arc or spend funds.
- Local EVM deployment used 209,024 gas. At one observed Arc Mainnet `eth_gasPrice` of 23,668,922,853 wei (2026-09-22), the arithmetic product is about 0.004947 USDC. This is **not** a transaction quote or a safe funding target: actual gas, network price, and total cost can change. Re-estimate immediately before any proposed deployment and add a prudent margin.
- Deployed on Arc Mainnet on 2026-09-23 at [`0xC32a4B49c39856c3ecf6005EE44351e9E727d03d`](https://explorer.arc.io/address/0xC32a4B49c39856c3ecf6005EE44351e9E727d03d). The [deployment transaction](https://explorer.arc.io/tx/0x5ba1583d2f367ff5d09df0d5f392b0111c6eafaecd0f836b3baf9b75a4011af0) succeeded with zero value and a 0.004389504 USDC network fee. The onchain runtime's executable portion matches the local Foundry build; compiler metadata differs between Remix and Foundry. The live verifier pins the exact deployed runtime hash. No evidence digest had been anchored at the time of this review. Tests are not a security audit, and deployment alone is not a complete user-facing product flow.

## Deployment discipline

Do **not** broadcast because of a points or airdrop theory. Before any deployment:

1. obtain the current Mainnet RPC URL and Chain ID from official Arc sources;
2. review the exact compiled bytecode and run the complete test suite;
3. use a separate, minimally funded deployer wallet;
4. keep secrets outside this repository and never place a private key in `.env` committed to GitHub;
5. explicitly approve the final deployment transaction after reviewing the network and gas cost;
6. publish the contract address, verified source link, deployment transaction, and release digest only if they are public-safe.

`script/DeployEvidenceAnchor.s.sol` is intentionally included for reproducible deployment review. It is not authorization to broadcast on any network.

## Security boundaries

This contract is intentionally small but has not been audited. Read the parent [security policy](../SECURITY.md) and [data-boundaries document](../docs/architecture.md) before using it.
The [limited EvidenceAnchor security review](../docs/evidence-anchor-security-review.md) records specific residual risks and verification limits; it is not an audit.
