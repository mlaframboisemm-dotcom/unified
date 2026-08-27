import { describe, expect, it } from 'vitest';
import { mergeNonEmptySynchronizedHoldings } from './holdings-recovery';

describe('mergeNonEmptySynchronizedHoldings', () => {
  const existing = [
    { symbol: 'ETH', amount: 2, avgBuyPrice: 2000 },
    { symbol: 'USDC', amount: 100, avgBuyPrice: 1 }
  ];

  it('retains browser-held inventory when a reconciliation is empty', () => {
    expect(mergeNonEmptySynchronizedHoldings(existing, [])).toEqual(existing);
  });

  it('replaces only matching assets from a non-empty reconciliation', () => {
    expect(
      mergeNonEmptySynchronizedHoldings(existing, [
        { symbol: 'eth', amount: 3 },
        { symbol: 'BTC', amount: 0.5, avgBuyPrice: 60000 }
      ])
    ).toEqual([
      { symbol: 'ETH', amount: 3, avgBuyPrice: 2000 },
      { symbol: 'USDC', amount: 100, avgBuyPrice: 1 },
      { symbol: 'BTC', amount: 0.5, avgBuyPrice: 60000 }
    ]);
  });

  it('retains the existing list reference when matching values are unchanged', () => {
    const result = mergeNonEmptySynchronizedHoldings(existing, [
      { symbol: 'ETH', amount: 2, avgBuyPrice: 2000 },
      { symbol: 'USDC', amount: 100, avgBuyPrice: 1 }
    ]);

    expect(result).toBe(existing);
  });

  it('ignores malformed, zero, and negative incoming holdings', () => {
    expect(
      mergeNonEmptySynchronizedHoldings(existing, [
        { symbol: 'BTC', amount: 0 },
        { symbol: 'SOL', amount: -1 },
        { symbol: '', amount: 2 },
        null
      ])
    ).toEqual(existing);
  });
});
