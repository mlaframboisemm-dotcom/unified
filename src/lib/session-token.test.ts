import { describe, expect, it } from 'vitest';
import { isSessionTokenExpired } from './session-token';

function encodeBase64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function tokenWithExp(exp: number): string {
  return `${encodeBase64url({ alg: 'HS256', typ: 'JWT' })}.${encodeBase64url({ exp })}.signature`;
}

describe('session token expiry parsing', () => {
  it('accepts an unpadded base64url JWT payload with a future expiry', () => {
    const now = 1_700_000_000_000;
    expect(isSessionTokenExpired(tokenWithExp((now / 1000) + 3600), now)).toBe(false);
  });

  it('rejects an expired or malformed JWT payload', () => {
    const now = 1_700_000_000_000;
    expect(isSessionTokenExpired(tokenWithExp((now / 1000) - 1), now)).toBe(true);
    expect(isSessionTokenExpired('not.a.jwt', now)).toBe(true);
  });
});
