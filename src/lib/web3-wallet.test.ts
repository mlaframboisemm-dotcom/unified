import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEB3_WALLET_ADDRESS,
  getSupportedEvmNetwork,
  getWalletProviderErrorMessage,
  hasSpendableWallet,
  normalizeWalletAddress,
  parseEip1193ChainId
} from './web3-wallet';

describe('web3 wallet helpers', () => {
  it('normalizes a valid address and leaves absent or invalid input disconnected', () => {
    expect(normalizeWalletAddress(' 0x1234567890abcdef1234567890abcdef12345678 ')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(normalizeWalletAddress('')).toBe('');
    expect(normalizeWalletAddress('not-an-address')).toBe('');
    expect(DEFAULT_WEB3_WALLET_ADDRESS).toBe('');
  });

  it('treats a wallet as spend-capable only after a browser wallet explicitly exposes an address', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    expect(hasSpendableWallet({ walletAddress: address, browserWalletConnected: false })).toBe(false);
    expect(hasSpendableWallet({ walletAddress: address, browserWalletConnected: true })).toBe(true);
    expect(hasSpendableWallet({ walletAddress: 'invalid', browserWalletConnected: true })).toBe(false);
  });

  it('parses provider chain identifiers and resolves only supported networks', () => {
    expect(parseEip1193ChainId('0x1')).toBe(1);
    expect(parseEip1193ChainId('137')).toBe(137);
    expect(parseEip1193ChainId('invalid')).toBeNull();
    expect(getSupportedEvmNetwork('0x2105')?.id).toBe('base');
    expect(getSupportedEvmNetwork('0x539')).toBeNull();
  });

  it('reports wallet approval and pending-request errors without implying success', () => {
    expect(getWalletProviderErrorMessage({ code: 4001 }, 'Connection failed')).toContain('rejected');
    expect(getWalletProviderErrorMessage({ code: -32002 }, 'Connection failed')).toContain('pending');
  });
});
