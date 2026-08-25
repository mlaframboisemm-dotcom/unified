import * as ethers from 'ethers';

export type MarshallConfigSnapshot = {
  address: string;
  ledgerBalance: number | null;
  baseline: number | null;
  nonCustodial: true;
  serverSigningEnabled: false;
  lastUpdate: string | null;
  status: 'STABLE' | 'UNCONFIGURED';
};

/**
 * Resolves only a configured public address. A private key is never accepted to derive or
 * operate a server wallet; user transactions must be approved in their own browser wallet.
 */
export function deriveMarshallAddress(env: NodeJS.ProcessEnv = process.env): string {
  const customAddress = env.VITE_MARSHALL_ADDRESS || env.MARSHALL_ADDRESS || env.SOVEREIGN_PUBLIC_EVM_ADDRESS;
  return customAddress && ethers.isAddress(customAddress) ? ethers.getAddress(customAddress) : '';
}

export function getMarshallConfigSnapshot(env: NodeJS.ProcessEnv = process.env): MarshallConfigSnapshot {
  const address = deriveMarshallAddress(env);
  return {
    address,
    ledgerBalance: null,
    baseline: null,
    nonCustodial: true,
    serverSigningEnabled: false,
    lastUpdate: address ? new Date().toISOString() : null,
    status: address ? 'STABLE' : 'UNCONFIGURED'
  };
}
