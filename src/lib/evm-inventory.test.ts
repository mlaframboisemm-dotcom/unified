import { describe, expect, it } from 'vitest';
import { isInventorySignerMatch, parseEvmInventoryJson } from './evm-inventory';

const owner = '0x1234567890abcdef1234567890abcdef12345678';
const contract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

describe('EVM inventory import', () => {
  it('imports only public address and token metadata while discarding claimed balances', () => {
    const inventory = parseEvmInventoryJson(JSON.stringify({
      address: owner,
      network: 'Ethereum mainnet',
      nativeBalanceETH: '999999',
      tokens: [{ address: contract, symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '998877665544' }]
    }));

    expect(inventory.ownerAddress.toLowerCase()).toBe(owner);
    expect(inventory.networkId).toBe('ethereum');
    expect(inventory.tokens).toEqual([{ address: contract, symbol: 'USDC', name: 'USD Coin', decimals: 6 }]);
    expect(JSON.stringify(inventory)).not.toContain('998877665544');
  });

  it('requires Ethereum Mainnet metadata and valid token contracts', () => {
    expect(() => parseEvmInventoryJson(JSON.stringify({
      address: owner,
      network: 'Polygon',
      tokens: [{ address: contract, symbol: 'USDC', name: 'USD Coin', decimals: 6 }]
    }))).toThrow('Ethereum Mainnet');
  });

  it('treats an inventory address as a sender only when it exactly matches the explicitly connected wallet', () => {
    expect(isInventorySignerMatch(owner, owner.toUpperCase())).toBe(true);
    expect(isInventorySignerMatch(owner, '0x1234567890abcdef1234567890abcdef12345679')).toBe(false);
    expect(isInventorySignerMatch(owner, '')).toBe(false);
  });
});
