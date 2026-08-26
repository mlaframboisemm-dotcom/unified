import assert from 'node:assert/strict';
import InputValidator from '../src/lib/input-validator.ts';
import { AuthRegisterSchema } from '../src/lib/validation-schemas.ts';

const payload = {
  email: 'demo2@local.test',
  password: 'Password123!',
  firstName: 'Demo',
  lastName: 'User',
  citizenship: 'CA'
};

const result = InputValidator.validate(payload, AuthRegisterSchema);
assert.equal(result.valid, true, JSON.stringify(result.errors));

const minimalPayload = {
  email: 'new-account@local.test',
  password: 'Password123!'
};

const minimalResult = InputValidator.validate(minimalPayload, AuthRegisterSchema);
assert.equal(minimalResult.valid, true, JSON.stringify(minimalResult.errors));

console.log('auth register validation regression check passed');
