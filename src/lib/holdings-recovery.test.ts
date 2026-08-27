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
      { symbol: 'USDC', amount: 100, avgBuyPrice: 1 },
      { symbol: 'eth', amount: 3, avgBuyPrice: 2000 },
      { symbol: 'BTC', amount: 0.5, avgBuyPrice: 60000 }
    ]);
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
