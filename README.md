# arcinvoice.io

![arcinvoice.io cover](assets/arc-invoice-cover.png)

A GitHub-ready web app for simple USDC invoices on **Arc Testnet**. Users connect their own wallet, enter the recipient and amount, and approve the transaction themselves.

> Testnet only. This app never receives or stores a private key, and it does not prefill a recipient address. Check the recipient and amount in your wallet before approving.

Website: [arcinvoice-ashen.vercel.app](https://arcinvoice-ashen.vercel.app)

## What it includes

- **Direct USDC invoice payment:** The payer enters a recipient and amount, then approves the payment in their own Arc Testnet wallet.
- **Shareable invoice links:** Recipient, amount, and optional memo are encoded in a URL for convenient sharing. The link cannot sign or submit a payment.
- **Read-only payment verifier:** Paste an Arc Testnet transaction hash to view status, amount, sender, recipient, block, time, and an ArcScan link. No wallet connection is required.
- **Network status:** Displays the current Arc Testnet block number and public RPC availability.

## Architecture

This is a static, client-side application. It uses the public Arc Testnet JSON-RPC endpoint for read-only data and an injected EVM wallet only when a user explicitly connects or submits a payment.

| Flow | Arc JSON-RPC method |
| --- | --- |
| Latest network block | `eth_blockNumber` |
| Transaction lookup | `eth_getTransactionByHash` |
| Final payment status | `eth_getTransactionReceipt` |
| Transaction timestamp | `eth_getBlockByNumber` |

ArcScan is linked for independent transaction inspection; it is not used as the data source.

## Make a testnet payment

1. Open the site and click **Get test USDC**.
2. On the Circle Faucet, select **Arc Testnet**, paste your wallet address, and request test USDC.
3. Back on the site, enter the recipient wallet and amount.
4. Click **Connect wallet to pay**, then approve the request in your wallet.

The code makes a direct native USDC payment on Arc Testnet, then links the submitted transaction on ArcScan. On Arc, native sends and the USDC ERC-20 interface move the same underlying USDC balance. Never put a private key in this project and never use mainnet funds.

## Arc Testnet

| Setting | Value |
| --- | --- |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Gas token | USDC (6 display decimals; native transaction values use 18 decimals) |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |

The Connect Wallet button asks an injected wallet such as MetaMask to add Arc Testnet. Official network setup: [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc).

## Test cases

| Scenario | Expected result |
| --- | --- |
| Valid Arc Testnet USDC transaction hash | Displays finalized status and transaction details |
| Unknown or wrong-network hash | Shows a clear “not found” message |
| Malformed hash | Validates the input without making an RPC request |
| Shared invoice link | Prefills recipient, amount, and memo; does not connect a wallet |
| Wallet connection cancelled | Shows a clear cancellation message; no payment is sent |
| Payment rejected in wallet | Shows an action-needed message; no payment is sent |

## License

MIT
