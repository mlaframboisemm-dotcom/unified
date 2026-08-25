import assert from 'node:assert/strict';
import { validateLiveOperationConfig } from '../src/lib/production-config.js';
import { buildRuntimeReadinessReport } from '../src/lib/runtime-readiness.js';

async function main() {
  const env = {
    NODE_ENV: 'production',
    SOVEREIGN_ENCRYPTION_KEY: 'e'.repeat(32),
    JWT_SECRET: 'j'.repeat(32),
    SOVEREIGN_ADMIN_EMAILS: 'admin@example.com',
    RESEND_API_KEY: 're_test_placeholder_only',
    RESEND_FROM_EMAIL: 'Unified Support <support@example.com>',
  } as NodeJS.ProcessEnv;

  const emailValidation = validateLiveOperationConfig(env, 'email');
  assert.equal(emailValidation.ok, true, `Expected Resend email validation to pass: ${emailValidation.errors.join('; ')}`);

  const readiness = await buildRuntimeReadinessReport(env);
  assert.equal(
    readiness.missingConfig.some((entry) => entry.includes('RESEND_API_KEY') || entry.includes('MAILERSEND_API_KEY')),
    false,
    `Expected Resend to satisfy email readiness: ${readiness.missingConfig.join('; ')}`,
  );

  const emailCheck = readiness.checks.find((check) => check.name === 'Email credentials');
  assert.equal(emailCheck?.status, 'configured', 'Expected email credentials to be reported as configured.');

  console.log('PASS: Resend email readiness is recognized without reading or emitting credential values.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
