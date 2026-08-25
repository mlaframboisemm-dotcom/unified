export interface SupportedEvmNetwork {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  explorerUrl: string;
  isTestnet?: boolean;
}

/**
 * The application does not create, import, persist, or recover wallet private keys.
 * A wallet is spend-capable only when a browser wallet has explicitly exposed an address.
 */
export const DEFAULT_WEB3_WALLET_ADDRESS = '';

export const SUPPORTED_EVM_NETWORKS: readonly SupportedEvmNetwork[] = [
  {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io'
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    symbol: 'POL',
    explorerUrl: 'https://polygonscan.com'
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://arbiscan.io'
  },
  {
    id: 'optimism',
    name: 'Optimism Mainnet',
    chainId: 10,
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  {
    id: 'base',
    name: 'Base Mainnet',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    explorerUrl: 'https://basescan.org'
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true
  }
] as const;

export function normalizeWalletAddress(address?: string | null): string {
  const candidate = typeof address === 'string' ? address.trim() : '';
  if (!candidate) return '';

  const normalized = candidate.startsWith('0x') || candidate.startsWith('0X') ? candidate : `0x${candidate}`;
  return /^0x[a-fA-F0-9]{40}$/.test(normalized) ? normalized : '';
}

export function parseEip1193ChainId(chainId?: string | number | bigint | null): number | null {
  if (typeof chainId === 'bigint') {
    return chainId >= 0n && chainId <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(chainId) : null;
  }
  if (typeof chainId === 'number') {
    return Number.isSafeInteger(chainId) && chainId >= 0 ? chainId : null;
  }
  if (typeof chainId !== 'string' || !chainId.trim()) return null;

  const trimmed = chainId.trim();
  const parsed = /^0x[0-9a-f]+$/i.test(trimmed)
    ? Number.parseInt(trimmed, 16)
    : Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function getSupportedEvmNetwork(chainId?: string | number | bigint | null): SupportedEvmNetwork | null {
  const parsedChainId = parseEip1193ChainId(chainId);
  return parsedChainId === null
    ? null
    : SUPPORTED_EVM_NETWORKS.find((network) => network.chainId === parsedChainId) ?? null;
}

export function hasSpendableWallet(params: {
  walletAddress?: string | null;
  browserWalletConnected?: boolean;
}): boolean {
  return Boolean(params.browserWalletConnected && normalizeWalletAddress(params.walletAddress));
}

export function getWalletProviderErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { code?: number; rpcCode?: number; message?: string } | null | undefined;
  const code = candidate?.rpcCode ?? candidate?.code;
  if (code === 4001) return 'Wallet request rejected. No account access, signature, or transaction was approved.';
  if (code === -32002) return 'A wallet request is already pending. Complete or reject it in your wallet before trying again.';
  if (code === 4900 || code === 4901) return 'The wallet is disconnected from the required blockchain network.';
  if (code === 4100) return 'The wallet has not authorized this application to access an account.';
  return candidate?.message ? `${fallback}: ${candidate.message}` : fallback;
}

export function isUserRejectedWalletRequest(error: unknown): boolean {
  const candidate = error as { code?: number; rpcCode?: number } | null | undefined;
  return candidate?.rpcCode === 4001 || candidate?.code === 4001;
}
