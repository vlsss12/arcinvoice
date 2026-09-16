# Architecture and data boundaries

## System model

```text
┌────────────────────────────────────────────────────────────┐
│                         Browser                            │
│                                                            │
│  Static UI ──► local checklist / wallet-test matrix        │
│      │                   │                                 │
│      │                   └── localStorage (user browser)   │
│      │                                                     │
│      ├──► supplied HTTPS JSON-RPC endpoint                 │
│      │       eth_chainId · eth_blockNumber                 │
│      │       eth_getBlockByNumber                          │
│      │       eth_getTransactionByHash                      │
│      │       eth_getTransactionReceipt                     │
│      │                                                     │
│      └──► local Markdown / JSON report + SHA-256 digest    │
│                                                            │
│  No wallet provider · no signing · no backend · no upload  │
└────────────────────────────────────────────────────────────┘
```

## What leaves the browser

Only user-supplied public values are sent to a user-supplied HTTPS JSON-RPC endpoint when a read-only check runs:

| Tool | Values sent | JSON-RPC methods |
| --- | --- | --- |
| RPC monitor | none beyond standard request metadata | `eth_chainId`, `eth_blockNumber`, `eth_getBlockByNumber` |
| Network validator | none beyond standard request metadata | `eth_chainId` |
| RPC consistency | none beyond standard request metadata | `eth_chainId`, `eth_blockNumber`, `eth_getBlockByNumber` |
| Receipt witness | public transaction hash | `eth_chainId`, `eth_getTransactionReceipt` |
| Transaction inspector | public transaction hash | `eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_getBlockByNumber` |

The Explorer Link Resolver does not fetch or open its supplied explorer URL. It constructs a conventional route locally.

## What stays local

- readiness checklist state;
- wallet-test outcomes and optional notes;
- generated reports and integrity fingerprint;
- any copied content until the user manually shares it.

The application has no backend API, database, analytics SDK, account system, or automated telemetry.

## Claim boundaries

A successful response is only an observation from the endpoint supplied by the user at that time. It does **not** establish:

- official endpoint ownership or configuration;
- network health, availability, or performance SLA;
- transaction finality or validity;
- wallet compatibility;
- a security audit result or release approval.

Reviewers should independently verify public values and official configuration before acting on a generated report.
