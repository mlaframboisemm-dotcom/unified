import { describe, it, expect } from 'vitest';
import { normalizeWalletAddress, hasSpendableWallet, DEFAULT_WEB3_WALLET_ADDRESS } from './web3-wallet';

describe('web3 wallet helpers', () => {
  it('normalizes a valid address and leaves absent or invalid input disconnected', () => {
    expect(normalizeWalletAddress(' 0x1234567890abcdef1234567890abcdef12345678 ')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(normalizeWalletAddress('')).toBe('');
    expect(normalizeWalletAddress('not-an-address')).toBe('');
    expect(DEFAULT_WEB3_WALLET_ADDRESS).toBe('');
  });

  it('treats a wallet as spendable only when it has a signer', () => {
    expect(hasSpendableWallet({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678', browserWalletConnected: false, privateKey: '' })).toBe(false);
    expect(hasSpendableWallet({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678', browserWalletConnected: true, privateKey: '' })).toBe(true);
    expect(hasSpendableWallet({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678', browserWalletConnected: false, privateKey: `0x${'a'.repeat(64)}` })).toBe(true);
  });
});
