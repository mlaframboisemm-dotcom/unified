import { describe, it, expect } from 'vitest';
import { normalizeWalletAddress, hasSpendableWallet, DEFAULT_WEB3_WALLET_ADDRESS } from './web3-wallet';

describe('web3 wallet helpers', () => {
  it('normalizes a valid address and falls back to the default wallet', () => {
    expect(normalizeWalletAddress(' 0x1234567890abcdef1234567890abcdef12345678 ')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(normalizeWalletAddress('')).toBe(DEFAULT_WEB3_WALLET_ADDRESS);
    expect(normalizeWalletAddress('not-an-address')).toBe(DEFAULT_WEB3_WALLET_ADDRESS);
  });

  it('treats a wallet as spendable only when it has a signer', () => {
    expect(hasSpendableWallet({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678', browserWalletConnected: false, privateKey: '' })).toBe(false);
    expect(hasSpendableWallet({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678', browserWalletConnected: true, privateKey: '' })).toBe(true);
    expect(hasSpendableWallet({ walletAddress: '0x1234567890abcdef1234567890abcdef12345678', browserWalletConnected: false, privateKey: `0x${'a'.repeat(64)}` })).toBe(true);
  });
});
