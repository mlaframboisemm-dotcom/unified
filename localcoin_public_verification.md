# Localcoin Public Verification Findings

Date checked: 2026-08-21

## Official service

Source: https://localcoinatm.com/

The official Localcoin site publicly documents buy and sell services through Localcoin ATMs and online flows. It lists support for Bitcoin, Litecoin, Ethereum, Cardano, Ripple, Dogecoin, USD Coin, and Tether, with more than 950 ATMs across Canada on the page captured during this verification.

## Official sell-for-cash flow

Source: https://localcoinatm.com/faq/

The official FAQ states that a user selects Sell at a supported terminal, enters the desired CAD withdrawal amount, scans the machine QR code with a mobile wallet to send the exact crypto amount, and collects cash after the blockchain receives the required confirmations. It states that cash availability typically ranges from a few minutes to an hour depending on network congestion, and that Localcoin sends an SMS when cash is ready. The FAQ also documents an online pre-sell flow in which the rate is locked, crypto is sent, and an SMS is sent after blockchain confirmation so the user can visit a participating ATM.

## API evidence

The public pages inspected do not expose a public merchant/developer API specification, authenticated transaction endpoint, or webhook registration procedure for consumer ATM cash-out. The repository therefore cannot be considered proven end-to-end for Localcoin settlement solely from UI components, QR parsing, or public status pages.

## Evidence boundary

The official pages prove that Localcoin supports real ATM sell-for-cash workflows. They do not prove that this repository has an authenticated Localcoin transaction API connection, a verified production phone/session binding, or a completed cash payout. A real payout would require provider-authorized credentials/session, a provider-issued order, an exact amount and destination, on-chain transaction evidence, and Localcoin's cash-ready/SMS evidence.

## Repository evidence

The checked-out repository contains Localcoin QR/deep-link recognition and an ATM hub UI. The Localcoin parser only converts QR/deep-link strings into local metadata; no provider authentication or network request is present in that parser.

The ATM hub cash-out flow is explicitly client-side. It generates a locally random voucher ID and PIN, marks the voucher READY_TO_DISPENSE, and exposes a button labeled "Simulate ATM Cash Dispense Test". Pressing it only changes local React state to DISPENSED and displays "Physical Cash Dispense Complete from ATM Vault". Static ATM location cards and hardcoded order presets are also present.

The recovery modal preloads phone/order values, fabricates a fallback transaction hash when no transaction exists, and its "Verify Live" button waits 800 ms before showing a success toast. It does not query Localcoin or a blockchain explorer. The shared `verifyAtmVoucher()` helper returns `status: pending` and `externalSource: ATM Network`, not `verified`.

## Read-only live checks

The repository's non-Stripe production health audit ran successfully through the TypeScript runtime and reported 12 connected/operational rails, but Localcoin is not among those audited rails.

A read-only query to Mempool.space for the user-provided address `bc1qnafm2l32lgmmyetfwad42nn0745kmled2zf48n` returned HTTP 200 with `funded_txo_count: 0`, `funded_txo_sum: 0`, `spent_txo_count: 0`, and `tx_count: 0` at the time checked. This is evidence that the public explorer did not show any on-chain activity for that address at that time; it is not evidence of a Localcoin account state or cash payout.

## Current conclusion

The Localcoin ATM module is not complete or fully working as a real end-to-end provider integration. It is a UI/parser prototype with simulated voucher/dispense behavior and no authenticated Localcoin settlement adapter. A real live test with proof cannot truthfully be claimed from the current codebase.
