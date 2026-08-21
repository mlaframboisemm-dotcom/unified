# Bitcoin ATM Phone Connection Audit

- [ ] Verify whether unified has a production SMS or OTP provider integration.
- [ ] Verify whether a verified phone identity is durably bound to the user and Bitcoin wallet.
- [ ] Verify whether an actual Bennett or ATM-operator API, callback, or webhook is configured.
- [ ] Verify expected Render environment-variable names without exposing secret values.
- [ ] Run only read-only connection and code-path checks; do not broadcast, dispense, or create a withdrawal.
- [ ] Report a precise connected/not-connected status and keep GitHub unchanged unless explicitly approved.

- [ ] Verify official Transak and comparable on-ramp/off-ramp provider APIs and account requirements.
- [ ] Map provider webhooks, KYC states, order states, fees, limits, and supported networks into unified.
- [ ] Add documented provider integrations only after official credentials and endpoints are available.
- [ ] Test read-only quote/order/status flows without submitting or broadcasting funds.
- [ ] Do not create regulated provider accounts or accept KYC/terms on the user’s behalf.

- [ ] Configure Stripe test mode dashboard & webhooks
- [ ] Integrate Stripe crypto payout and payment methods in gateway code
- [ ] Verify test-mode transaction flows and crypto routing
- [ ] Prepare live-mode switch upon final confirmation

- [x] Verify Docker and Bitcoin Core daemon availability in the current execution environment.
- [x] Verify Bitcoin Core RPC credentials, endpoint wiring, and live `getblockchaininfo` response.
- [x] Verify whether the production server mounts the Bitcoin Core client and unified health audit.
- [x] Verify gateway build and automated test status after connectivity inspection.
- [x] Document confirmed connections, disconnected services, and required local-machine actions.

- [x] Mount a read-only Bitcoin Core health endpoint into the production server.
- [x] Add tests for Bitcoin Core health success and unavailable-node failure behavior.
- [x] Tighten Docker Bitcoin Core RPC allowlist and document the internal network assumption.
- [x] Re-run build and test suites and update the connectivity audit with the new status.
