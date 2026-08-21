# Bitcoin Core and Unified System Connectivity Audit

**Repository:** `mlaframboisemm-dotcom/unified`  
**Audit date:** 2026-08-21  
**Scope:** Bitcoin Core RPC, Docker Compose, gateway runtime, health audit wiring, and Localcoin ATM boundary.

## Executive finding

The repository contains a **configured Bitcoin Core integration structure**, but the current execution environment does not have a running Docker daemon, a reachable Bitcoin Core JSON-RPC service, or the production gateway container listening on port 10000. The repository's standalone RPC test therefore reports `connected: false`, while confirming that the fallback/configuration code loads correctly.

The gateway health module currently imports Bitcoin RPC configuration only; it logs the configured RPC target and does not call `getblockchaininfo`. A repository-wide search found no production server route importing `callBitcoinRpc()` or `getLocalBitcoinBlockchainInfo()`. Consequently, the repository is **not proven to be actively connected to a live Bitcoin Core node in the current environment**.

The Localcoin ATM component remains separate from Bitcoin Core. It provides QR parsing and ATM UI, but no authenticated Localcoin provider adapter or live settlement webhook was found. The cash-out voucher and dispense controls are client-side simulation behavior and must not be interpreted as a real cash payout.

## Evidence table

| Area | Evidence checked | Result | Interpretation |
|---|---|---|---|
| Docker runtime | `docker version` and `docker compose config` | `docker: command not found` | Docker is not available in this sandbox; Compose could not be started or verified here. |
| Compose wiring | `docker-compose.yml:4-36` | Configured | `bitcoind` and `unified-gateway` services are defined. The gateway targets `http://bitcoind:8332` inside the Compose network. |
| Bitcoin Core client | `server/bitcoin-rpc-client.ts:13-67` | Configured | Client supports JSON-RPC `getblockchaininfo` with `BITCOIN_RPC_URL`, `BITCOIN_RPC_USER`, and `BITCOIN_RPC_PASSWORD`. |
| Local RPC endpoint | `http://127.0.0.1:8332` `getblockchaininfo` probe | HTTP 000 / connection refused | No reachable RPC server at the default local address. |
| Repository RPC test | `npx tsx scripts/test-bitcoin-rpc.mjs` | `Connected: false` | The repository itself confirms the node is offline in this environment. |
| Bitcoin Core binaries/processes | `bitcoind`, `bitcoin-cli`, process list | Not found/running | No local Bitcoin Core daemon or CLI was detected. |
| Gateway runtime | `http://127.0.0.1:10000` | HTTP 000 / connection refused | The Compose gateway container is not running here. |
| Current port 3000 | `http://127.0.0.1:3000/` | HTTP 200 | This is the active development frontend server, not proof of a Dockerized production gateway or Bitcoin Core connection. |
| Production server RPC usage | repository-wide source search | Not mounted | Only the standalone test and configuration-only health module reference the Bitcoin RPC client. |
| Non-Stripe gateway health | `npx tsx scripts/test-gateways-health.mjs` | 12 rails connected/operational | External gateway health audit passed, but it does not include Localcoin or Bitcoin Core RPC. |
| Production build | `npm run build` | Passed | Vite client, esbuild server bundle, Android SDK ZIP, and APK generation completed. |
| Localcoin ATM | `src/components/BitcoinAtmHub.tsx`, `AtmOrderRecoveryModal.tsx`, `src/lib/external-verification.ts` | Not live-connected | Voucher creation, dispense state, and recovery verification are client-side or pending-only; no Localcoin API adapter was found. |

## Compose configuration notes

The Compose file correctly provides an internal hostname from the gateway to Bitcoin Core: `BITCOIN_RPC_URL=http://bitcoind:8332`. It also keeps RPC ports under `expose` rather than publishing them directly to the host. However, the current command includes `-rpcallowip=0.0.0.0/0`; this should be narrowed to the internal Docker network or removed in favor of the daemon's default secure network policy before production use.

The Compose file requires `BITCOIN_RPC_PASSWORD` from the environment. It does not prove that the secret exists on the user's physical computer, Render, or any other deployment environment. The password value was not read or displayed during this audit.

## What is connected versus not proven

The **code-level wiring** is present: the gateway container is configured to resolve Bitcoin Core at `bitcoind:8332`, and the RPC client can issue authenticated JSON-RPC requests. The **live runtime connection** is not proven because Docker is unavailable, no `bitcoind` process was detected, and the RPC probe failed.

The **development frontend** is running on port 3000. That only proves that the React development server responds. It does not prove that the production gateway, Docker stack, Bitcoin Core node, Localcoin account, phone session, ATM order, or cash dispenser is connected.

## Required verification on the user's machine

To complete a real non-destructive node connectivity test on the machine that owns Bitcoin Core and Docker, Docker Desktop must be running, the environment must provide a non-empty `BITCOIN_RPC_PASSWORD`, and the stack must be started from the repository with `docker compose up -d`. The read-only check should then run `docker compose exec unified-gateway` or the repository's RPC test and verify a JSON-RPC `getblockchaininfo` response showing the expected chain (`main`, `test`, or `regtest`), current blocks, headers, and verification progress. No transaction broadcast is required for this connectivity proof.

A real Localcoin cash-out test is a separate provider transaction and cannot be proven by Bitcoin Core connectivity alone. It requires a provider-issued order/session, a live destination and amount, on-chain transaction evidence, and Localcoin's own cash-ready or dispense confirmation.

## Follow-up hardening completed

The production server now exposes `GET /api/health/bitcoin` as a read-only health surface. It calls Bitcoin Core `getblockchaininfo`, returns chain metadata only when the node responds, returns HTTP 503 when unavailable, and never returns RPC credentials or broadcasts transactions. The unified health audit now reports `status: degraded` when Bitcoin Core is unavailable instead of incorrectly printing an all-systems-nominal result.

The Bitcoin RPC client no longer uses a fallback password. If `BITCOIN_RPC_PASSWORD` is empty, it fails closed with `BITCOIN_RPC_PASSWORD_NOT_CONFIGURED` before making a network request. Docker Compose now requires a non-empty RPC password, places both services on a dedicated internal `172.28.0.0/16` network, and restricts `rpcallowip` to that internal subnet. RPC ports remain un-published to the host.

The compiled server initially failed to start because production-loaded source imported undeclared `node-fetch`. Those imports were removed from the Kiln bridge, JWKS cache, and token store in favor of Node's built-in `fetch`. The system health probe similarly no longer depends on undeclared `axios`; it uses an HTTPS probe with the existing Wise agent.

## Follow-up verification

The complete Vitest suite passed with 8 test files and 16 tests. TypeScript lint passed. The production build passed, including client bundle, server bundle, Android SDK ZIP, and APK generation. A development-mode probe of the compiled server returned `GET /api/health` with HTTP 200 and `GET /api/health/bitcoin` with HTTP 503 plus `status: unavailable`, `rpcConfigured: false`, and `error: BITCOIN_RPC_PASSWORD_NOT_CONFIGURED`. This is the expected truthful result in the current environment.

A production-mode startup probe did not reach the endpoint because required production secrets (`SOVEREIGN_ENCRYPTION_KEY`, `JWT_SECRET`, and `SOVEREIGN_ADMIN_EMAILS`) are absent in this sandbox. The server correctly failed closed instead of running an incompletely configured production instance.

## Revised status

The repository now has a truthful, read-only Bitcoin Core health path and safer Docker configuration. The live node remains unverified until Docker Desktop/Bitcoin Core is running on the user's machine or deployment host with the required RPC secret. Localcoin ATM settlement remains unconnected and is not proven by this work.
