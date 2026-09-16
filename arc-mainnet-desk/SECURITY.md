# Security policy

## Scope

Arc Mainnet Desk is a static, browser-only QA workspace. Its intended security properties are:

- no private keys, recovery phrases, passwords, or credentials are requested;
- no wallet is connected and no signature or transaction is initiated;
- JSON-RPC calls are limited to user-supplied HTTPS endpoints and read-only methods;
- browser-generated reports remain local until the user explicitly copies them.

The tool is not a security audit, custody product, official Arc service, or endpoint attestation system.

## Reporting a vulnerability

Please do not publish a working exploit, sensitive data, or a real user’s private information in a public issue.

Open a minimal GitHub issue only after removing secrets and personal data. Include:

1. affected page or component;
2. reproducible, non-sensitive steps;
3. expected and observed behavior;
4. browser and OS version; and
5. a sanitized screenshot or public test value, if useful.

For a security concern that cannot be safely described publicly, contact the repository owner through GitHub rather than placing sensitive details in an issue or pull request.

## Review expectations for contributions

Changes that add wallet access, signing, transaction submission, server-side storage, analytics, or external scripts require a dedicated security review and a clear user-facing disclosure before merge.

## Safe-use reminder

Never paste a recovery phrase, private key, password, credential, or any other secret into a browser tool, a GitHub issue, or exported QA notes.
