import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageSyncManager } from './sync-to-storage';

type StorageMock = Storage & { setItem: ReturnType<typeof vi.fn> };

function createStorage(initialEntries: Record<string, string> = {}): StorageMock {
  const values = new Map(Object.entries(initialEntries));
  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value))
  };
}

describe('StorageSyncManager', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  });

  it('does not rewrite an unchanged stored value', () => {
    const storage = createStorage({ cb_holdings: '[{"symbol":"ETH"}]' });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { addEventListener: vi.fn(), localStorage: storage, sessionStorage: createStorage() }
    });
    const sync = new StorageSyncManager();

    sync.setItemDebounced('cb_holdings', '[{"symbol":"ETH"}]', 300);
    vi.advanceTimersByTime(300);

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('writes a changed value after the debounce interval', () => {
    const storage = createStorage({ cb_holdings: '[{"symbol":"ETH"}]' });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { addEventListener: vi.fn(), localStorage: storage, sessionStorage: createStorage() }
    });
    const sync = new StorageSyncManager();

    sync.setItemDebounced('cb_holdings', '[{"symbol":"ETH","amount":2}]', 300);
    vi.advanceTimersByTime(300);

    expect(storage.setItem).toHaveBeenCalledWith('cb_holdings', '[{"symbol":"ETH","amount":2}]');
  });
});
