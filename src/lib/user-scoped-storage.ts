export const USER_SCOPED_STATE_KEYS = [
  'cb_coins',
  'cb_holdings',
  'cb_usd_balance',
  'cb_transactions',
  'cb_quizzes',
  'cb_watchlist',
  'cb_inbox_emails',
  'cb_kyc_level',
  'cb_citizenship',
  'cb_sov_intel_state',
  'cb_sovereign_tokens',
  'cb_marshall_config'
] as const;

export function getUserScopedStorageKey(email: string, key: string): string {
  return `cb_user_${email.trim().toLowerCase()}_${key}`;
}

/**
 * Distinguishes a missing record from a malformed record so callers can retain
 * already hydrated state when corrupted browser storage cannot be trusted.
 */
export function parseStoredArray<T>(value: string | null): T[] | null | undefined {
  if (value === null) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : null;
  } catch {
    return null;
  }
}
