import type { Holding } from '../types';

type HoldingInput = Partial<Holding> & { symbol?: unknown; amount?: unknown; avgBuyPrice?: unknown };

/**
 * Retains existing browser-held holdings when the server has no positive holdings
 * to contribute. When a server holding is present, it replaces only the matching
 * asset amount while retaining non-server assets and local cost-basis metadata.
 */
export function mergeNonEmptySynchronizedHoldings(
  existingHoldings: Holding[],
  incomingHoldings: unknown
): Holding[] {
  if (!Array.isArray(incomingHoldings)) return existingHoldings;

  const existingBySymbol = new Map(
    existingHoldings.map((holding) => [holding.symbol.trim().toUpperCase(), holding])
  );
  const synchronized = new Map<string, Holding>();

  for (const candidate of incomingHoldings as HoldingInput[]) {
    const symbol = typeof candidate?.symbol === 'string' ? candidate.symbol.trim() : '';
    const amount = Number(candidate?.amount);
    if (!symbol || !Number.isFinite(amount) || amount <= 0) continue;

    const normalizedSymbol = symbol.toUpperCase();
    const previous = existingBySymbol.get(normalizedSymbol);
    const incomingAverage = Number(candidate?.avgBuyPrice);
    synchronized.set(normalizedSymbol, {
      symbol,
      amount,
      avgBuyPrice: Number.isFinite(incomingAverage) ? incomingAverage : previous?.avgBuyPrice ?? 0
    });
  }

  if (synchronized.size === 0) return existingHoldings;

  const retained = existingHoldings.filter(
    (holding) => !synchronized.has(holding.symbol.trim().toUpperCase())
  );
  return [...retained, ...synchronized.values()];
}
