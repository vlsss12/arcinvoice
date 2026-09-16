# Arc Mainnet Desk — Readiness Workspace

A static, client-side workspace for recording reproducible, public-safe QA evidence around EVM wallet journeys, JSON-RPC observations, and transaction receipts.

> **Independent tooling.** Arc Mainnet Desk is not affiliated with or endorsed by Circle or Arc. It does not represent live network status, official endpoint ownership, wallet compatibility, or transaction finality.

## Purpose

Mainnet releases need reviewable evidence rather than optimistic status labels. This workspace keeps the scope deliberately narrow:

- client-side and read-only by default;
- no wallet connection, signature, or transaction submission;
- no token listings, market data, prices, staking, or trading features;
- no server, database, analytics SDK, account system, or remote persistence;
- local reports are explicitly labelled as point-in-time observations.

## Included capabilities

- **Readiness checklist** — local pre-flight tasks for trusted sources, wallet recovery, payment disclosure, reproducible issue reports, and safety language.
- **Wallet Compatibility Matrix** — user-recorded outcomes for connect, network switching, disconnect, and approval flows. Entries start untested and are stored only in the browser.
- **Read-only RPC Monitor** — observes `eth_chainId`, `eth_blockNumber`, and `eth_getBlockByNumber` on a supplied HTTPS JSON-RPC endpoint.
- **Network Configuration Validator** — checks a proposed RPC endpoint, chain ID format, and explorer URL without contacting a wallet.
- **RPC Consistency Comparison** — compares two endpoints' chain IDs, latest blocks, block age, and browser-observed latency. Its threshold is a local review aid, not an SLA.
- **Transaction Evidence Inspector** — reads public data with `eth_getTransactionByHash`, `eth_getTransactionReceipt`, and `eth_getBlockByNumber`.
- **Cross-RPC Receipt Witness** — compares a public transaction receipt from two supplied endpoints and distinguishes observed agreement, review-needed, and mismatch states.
- **Explorer Link Resolver** — creates an explorer route locally; it never automatically opens destinations.
- **QA Session Bundle and Release Evidence Pack** — exports a reviewable Markdown or JSON handoff with a local SHA-256 fingerprint.
- **Structured Issue Draft** — creates a public-safe Markdown report with reproduction steps and evidence fields.
- **Local Release Gate** — summarizes which locally recorded checks are still missing. It is not an official release approval.

## Privacy boundaries

The workspace does not request or accept recovery phrases, private keys, passwords, credentials, or wallet signatures. Reports are created in the browser. Before exporting, the Evidence Pack pauses if common sensitive phrases appear in saved notes.

Public blockchain values such as a transaction hash are only queried after the user supplies both an HTTPS endpoint and a valid transaction hash. Always verify endpoint ownership and results using official Arc sources before relying on them.

## Run locally

This is dependency-free static HTML, CSS, and JavaScript.

```bash
cd arc-mainnet-desk
python3 -m http.server 8080
```

Open `http://localhost:8080` in a browser. A static host can serve the same files without a build step.

## Security review checklist

- Confirm no `.env`, local configuration, deployment metadata, private demo material, or personal files are staged.
- Keep the tool read-only; do not add wallet-signing or transaction-sending logic without a separate security review.
- Use only trusted HTTPS RPC endpoints, and treat all responses as observations—not official attestations.
- Review exported notes before sharing; public transaction data can still reveal more context than intended.

## Repository layout

```text
arc-mainnet-desk/
├── index.html              # static UI and accessibility structure
├── app.js                  # browser-only behavior and JSON-RPC reads
├── styles.css              # responsive shared layout
└── *.css                   # scoped feature styles
```

## License

MIT. See the repository-level [LICENSE](../LICENSE).
