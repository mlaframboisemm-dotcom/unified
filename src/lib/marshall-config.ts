import { ethers } from 'ethers';

export type MarshallConfigSnapshot = {
  address: string;
  ledgerBalance: number | null;
  baseline: number | null;
  hasPrivateKey: boolean;
  lastUpdate: string | null;
  status: 'STABLE' | 'UNCONFIGURED';
};

export function deriveMarshallAddress(env: NodeJS.ProcessEnv = process.env): string {
  const customAddr = env.VITE_MARSHALL_ADDRESS || env.MARSHALL_ADDRESS;
  if (customAddr && ethers.isAddress(customAddr)) {
    return customAddr;
  }

  const privateKey = env.MARSHALL_WALLET_PRIVATE_KEY;
  if (privateKey) {
    try {
      return new ethers.Wallet(privateKey).address;
    } catch {
      return '';
    }
  }

  return '';
}

export function getMarshallConfigSnapshot(env: NodeJS.ProcessEnv = process.env): MarshallConfigSnapshot {
  const address = deriveMarshallAddress(env);
  const hasPrivateKey = Boolean(env.MARSHALL_WALLET_PRIVATE_KEY);
  const status = address ? 'STABLE' : 'UNCONFIGURED';

  return {
    address,
    ledgerBalance: address ? null : null,
    baseline: address ? null : null,
    hasPrivateKey,
    lastUpdate: address ? new Date().toISOString() : null,
    status
  };
}
