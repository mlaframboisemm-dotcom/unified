# Security Policy

## Reporting a Vulnerability

Do **not** open a public issue for a suspected credential exposure, authentication bypass, payment-flow defect, or vulnerability affecting wallet or ledger data. Instead, contact the repository owner privately with the affected commit, endpoint or component, reproduction conditions, and any relevant non-sensitive evidence.

Please do not include private keys, seed phrases, access tokens, account identifiers, recovery codes, or customer data in a report. If a secret may have been exposed, revoke or rotate it immediately; do not wait for triage.

## Supported Security Baseline

The default branch is expected to meet the following baseline before deployment:

| Control | Requirement |
|---|---|
| Secrets | Runtime credentials are stored in the deployment platform's secret manager and are never committed to Git. |
| Authentication | Password reset uses a short-lived, one-time token; production routes do not include auto-login or fallback account behavior. |
| Transaction safety | A failed broadcast is reported as failed. The application must not generate synthetic transaction hashes, balances, or reconciliation results. |
| Dependencies | A fresh `npm ci` succeeds and the dependency advisory check is reviewed before release. |
| Review | Changes to wallet, authentication, provider, deployment, or workflow code require review and passing checks. |

## Key Rotation Procedure

When a credential artifact has been committed, treat it as exposed even if the repository is private. Revoke the old credential at the provider, create a replacement in the deployment platform's secret manager, verify the deployed service uses the replacement, then remove the artifact from current and historical Git references. A history rewrite alone does not revoke copied credentials.

## Scope Limits

This repository must fail closed when a provider is unavailable or an integration has not been verified. Unimplemented provider flows should return a clear error rather than simulate a transfer, a token exchange, a balance, a transaction hash, or a reconciliation result.
