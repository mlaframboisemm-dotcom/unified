export const DEFAULT_WEB3_WALLET_ADDRESS = '0x742d35cc6634c0532925a3b844bc454e4438f44e';

export function normalizeWalletAddress(address?: string | null): string {
  const candidate = typeof address === 'string' ? address.trim() : '';
  if (!candidate) return DEFAULT_WEB3_WALLET_ADDRESS;

  const normalized = candidate.startsWith('0x') || candidate.startsWith('0X') ? candidate : `0x${candidate}`;
  return /^0x[a-fA-F0-9]{40}$/.test(normalized) ? normalized : DEFAULT_WEB3_WALLET_ADDRESS;
}

export function hasSpendableWallet(params: {
  walletAddress?: string | null;
  browserWalletConnected?: boolean;
  privateKey?: string | null;
}): boolean {
  const address = normalizeWalletAddress(params.walletAddress);
  const hasAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  const hasValidBrowserWallet = !!params.browserWalletConnected && hasAddress;
  const hasPrivateKey = !!params.privateKey && params.privateKey.trim().startsWith('0x') && params.privateKey.trim().length === 66;

  return hasAddress && (hasValidBrowserWallet || hasPrivateKey);
}
