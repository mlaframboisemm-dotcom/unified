import { describe, expect, it } from 'vitest';
import { getUserScopedStorageKey, USER_SCOPED_STATE_KEYS } from './user-scoped-storage';

describe('user-scoped storage contract', () => {
  it('normalizes account identifiers when constructing scoped keys', () => {
    expect(getUserScopedStorageKey('  USER@Example.COM ', 'cb_holdings')).toBe('cb_user_user@example.com_cb_holdings');
  });

  it('uses the persisted inbox key as part of the scoped account contract', () => {
    expect(USER_SCOPED_STATE_KEYS).toContain('cb_inbox_emails');
    expect(getUserScopedStorageKey('user@example.com', 'cb_inbox_emails')).toBe('cb_user_user@example.com_cb_inbox_emails');
  });
});
