# Bitcoin ATM Phone Connection Audit

- [ ] Verify whether unified has a production SMS or OTP provider integration.
- [ ] Verify whether a verified phone identity is durably bound to the user and Bitcoin wallet.
- [ ] Verify whether an actual Bennett or ATM-operator API, callback, or webhook is configured.
- [ ] Verify expected Render environment-variable names without exposing secret values.
- [ ] Run only read-only connection and code-path checks; do not broadcast, dispense, or create a withdrawal.
- [ ] Report a precise connected/not-connected status and keep GitHub unchanged unless explicitly approved.
