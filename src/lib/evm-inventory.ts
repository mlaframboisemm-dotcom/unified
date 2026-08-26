import * as ethers from 'ethers';

export interface EvmInventoryToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export interface ImportedEvmInventory {
  ownerAddress: string;
  networkId: 'ethereum';
  tokens: EvmInventoryToken[];
}

const MAX_INVENTORY_BYTES = 5 * 1024 * 1024;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isEthereumMainnetInventory(payload: Record<string, unknown>): boolean {
  const chainId = payload.chainId;
  if (chainId === 1 || chainId === '1' || chainId === '0x1') return true;
  const network = asNonEmptyString(payload.network).toLowerCase();
  return network.includes('ethereum') && network.includes('mainnet');
}

/**
 * Reads only public address and ERC-20 contract metadata. The supplied balance,
 * valuation, reputation, and transaction fields are deliberately discarded.
 */
export function parseEvmInventoryJson(raw: string): ImportedEvmInventory {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_INVENTORY_BYTES) {
    throw new Error('Choose a JSON inventory smaller than 5 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const payload = asRecord(parsed);
  if (!payload) throw new Error('The inventory must contain a JSON object.');

  const rawAddress = asNonEmptyString(payload.address);
  if (!ethers.isAddress(rawAddress)) throw new Error('The inventory does not contain a valid EVM address.');
  if (!isEthereumMainnetInventory(payload)) throw new Error('This wallet view can import only Ethereum Mainnet inventory metadata.');
  if (!Array.isArray(payload.tokens)) throw new Error('The inventory does not contain a token list.');

  const tokensByAddress = new Map<string, EvmInventoryToken>();
  for (const candidate of payload.tokens) {
    const token = asRecord(candidate);
    if (!token) continue;

    const rawContract = asNonEmptyString(token.address);
    if (!ethers.isAddress(rawContract)) continue;

    const decimals = Number(token.decimals);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) continue;

    const address = ethers.getAddress(rawContract);
    tokensByAddress.set(address.toLowerCase(), {
      address,
      decimals,
      symbol: asNonEmptyString(token.symbol) || 'UNKNOWN',
      name: asNonEmptyString(token.name) || 'Unknown token'
    });
  }

  if (tokensByAddress.size === 0) throw new Error('No valid ERC-20 contract metadata was found in this inventory.');

  return {
    ownerAddress: ethers.getAddress(rawAddress),
    networkId: 'ethereum',
    tokens: [...tokensByAddress.values()]
  };
}

/** A public inventory never grants authority; only the exact connected wallet can be a sender. */
export function isInventorySignerMatch(inventoryAddress: string, connectedAddress: string): boolean {
  const normalize = (address: string) => address.startsWith('0X') ? `0x${address.slice(2)}` : address;
  const inventory = normalize(inventoryAddress);
  const connected = normalize(connectedAddress);
  return ethers.isAddress(inventory)
    && ethers.isAddress(connected)
    && inventory.toLowerCase() === connected.toLowerCase();
}
