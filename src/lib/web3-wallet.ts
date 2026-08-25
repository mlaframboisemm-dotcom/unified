export const DEFAULT_WEB3_WALLET_ADDRESS = '';

export function normalizeWalletAddress(address?: string | null): string {
  const candidate = typeof address === 'string' ? address.trim() : '';
  if (!candidate) return '';

  const normalized = candidate.startsWith('0x') || candidate.startsWith('0X') ? candidate : `0x${candidate}`;
  return /^0x[a-fA-F0-9]{40}$/.test(normalized) ? normalized : '';
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
