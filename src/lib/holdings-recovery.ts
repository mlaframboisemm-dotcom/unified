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
    const nextHolding: Holding = {
      symbol: previous?.symbol ?? symbol,
      amount,
      avgBuyPrice: Number.isFinite(incomingAverage) ? incomingAverage : previous?.avgBuyPrice ?? 0
    };
    synchronized.set(
      normalizedSymbol,
      previous &&
        previous.symbol === nextHolding.symbol &&
        previous.amount === nextHolding.amount &&
        previous.avgBuyPrice === nextHolding.avgBuyPrice
        ? previous
        : nextHolding
    );
  }

  if (synchronized.size === 0) return existingHoldings;

  const merged = existingHoldings.map(
    (holding) => synchronized.get(holding.symbol.trim().toUpperCase()) ?? holding
  );
  const appended = Array.from(synchronized.entries())
    .filter(([symbol]) => !existingBySymbol.has(symbol))
    .map(([, holding]) => holding);
  const result = [...merged, ...appended];
  return result.every((holding, index) => holding === existingHoldings[index]) && result.length === existingHoldings.length
    ? existingHoldings
    : result;
}

/**
 * Determines whether legacy browser inventory can safely replace a missing,
 * empty, or malformed account-scoped record during one-time account hydration.
 * It never treats malformed or empty legacy data as a recovery source.
 */
export function shouldRestoreLegacyInventory(
  scopedValue: string | null,
  legacyValue: string | null
): boolean {
  const isNonEmptyArray = (value: string | null): boolean => {
    if (!value) return false;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  };

  return !isNonEmptyArray(scopedValue) && isNonEmptyArray(legacyValue);
}
