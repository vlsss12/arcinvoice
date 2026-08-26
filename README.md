# arcinvoice.io

![arcinvoice.io cover](assets/arc-invoice-cover.png)

A GitHub-ready web app for simple USDC invoices on **Arc Testnet**. Users connect their own wallet, enter the recipient and amount, and approve the transaction themselves.

> Testnet only. This app never receives or stores a private key, and it does not prefill a recipient address. Check the recipient and amount in your wallet before approving.

## Run locally

No install is required. Serve the folder with any static web server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

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

## Submission checklist

- [x] Deploy an actual testnet payment flow
- [ ] Record a 2–3 minute demo
- [ ] Add screenshots and a live deployment URL
- [ ] Submit this repository only through an official Arc challenge/hackathon form

## What to say in the demo

1. arcinvoice.io makes USDC invoice payments easy to understand.
2. A wallet connects to Arc Testnet, where USDC is also the gas token.
3. The payer sees a simple, transparent amount and payment status.
4. The app links to the submitted payment on ArcScan.

## License

MIT
