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
