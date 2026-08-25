import * as bitcoin from 'bitcoinjs-lib';

type BitcoinNetworkName = 'mainnet' | 'testnet';

export interface BitcoinTransactionStatus {
  confirmed: boolean;
  blockHeight?: number;
  blockHash?: string;
  blockTime?: number;
}

export interface BitcoinAddressTransaction {
  txid: string;
  confirmed: boolean;
  blockHeight?: number;
  blockHash?: string;
  blockTime?: number;
  feeSats?: number;
}

export interface BitcoinAddressSnapshot {
  address: string;
  network: BitcoinNetworkName;
  confirmedSats: number;
  unconfirmedSats: number;
  confirmedTransactionCount: number;
  unconfirmedTransactionCount: number;
  transactions: BitcoinAddressTransaction[];
  provider: 'esplora';
  explorerUrl: string;
}

interface EsploraAddressStats {
  funded_txo_sum?: number;
  spent_txo_sum?: number;
  tx_count?: number;
}

interface EsploraTransaction {
  txid?: string;
  fee?: number;
  status?: {
    confirmed?: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

function getNetwork(): bitcoin.Network {
  return process.env.BTC_NETWORK === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
}

function getNetworkName(): BitcoinNetworkName {
  return process.env.BTC_NETWORK === 'testnet' ? 'testnet' : 'mainnet';
}

function getEsploraBaseUrl(): string {
  const configured = String(process.env.BTC_ESPLORA_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  return getNetworkName() === 'testnet' ? 'https://mempool.space/testnet/api' : 'https://mempool.space/api';
}

function getExplorerUrl(): string {
  return getNetworkName() === 'testnet' ? 'https://mempool.space/testnet' : 'https://mempool.space';
}

function validateBitcoinAddress(address: string): string {
  const normalized = String(address || '').trim();
  if (!normalized) throw new Error('Bitcoin address is required.');
  try {
    bitcoin.address.toOutputScript(normalized, getNetwork());
  } catch {
    throw new Error(`Invalid Bitcoin ${getNetworkName()} address.`);
  }
  return normalized;
}

function asNonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function calculateBalance(stats: EsploraAddressStats | undefined): number {
  return asNonNegativeInteger(stats?.funded_txo_sum) - asNonNegativeInteger(stats?.spent_txo_sum);
}

/**
 * Reads a transaction's public confirmation state from an Esplora-compatible provider.
 * No signing key, seed phrase, password, or recovery material is accepted or used.
 */
export async function getBitcoinTransactionStatus(txid: string): Promise<BitcoinTransactionStatus> {
  const normalizedTxid = String(txid || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedTxid)) throw new Error('Invalid Bitcoin transaction ID.');

  const response = await fetch(`${getEsploraBaseUrl()}/tx/${normalizedTxid}/status`);
  if (!response.ok) throw new Error(`Bitcoin status provider failed (HTTP ${response.status}).`);
  const status = await response.json() as EsploraTransaction['status'];
  return {
    confirmed: status?.confirmed === true,
    ...(typeof status?.block_height === 'number' ? { blockHeight: status.block_height } : {}),
    ...(typeof status?.block_hash === 'string' ? { blockHash: status.block_hash } : {}),
    ...(typeof status?.block_time === 'number' ? { blockTime: status.block_time } : {})
  };
}

/**
 * Reads confirmed and mempool balances plus recent transaction status for a public Bitcoin address.
 * The source is an Esplora-compatible endpoint and all amounts are returned in satoshis.
 */
export async function getBitcoinAddressSnapshot(address: string): Promise<BitcoinAddressSnapshot> {
  const normalizedAddress = validateBitcoinAddress(address);
  const baseUrl = getEsploraBaseUrl();
  const [addressResponse, transactionsResponse] = await Promise.all([
    fetch(`${baseUrl}/address/${normalizedAddress}`),
    fetch(`${baseUrl}/address/${normalizedAddress}/txs`)
  ]);
  if (!addressResponse.ok) throw new Error(`Bitcoin address provider failed (HTTP ${addressResponse.status}).`);
  if (!transactionsResponse.ok) throw new Error(`Bitcoin transaction-history provider failed (HTTP ${transactionsResponse.status}).`);

  const addressPayload = await addressResponse.json() as {
    chain_stats?: EsploraAddressStats;
    mempool_stats?: EsploraAddressStats;
  };
  const transactionsPayload = await transactionsResponse.json() as EsploraTransaction[];
  const transactions = Array.isArray(transactionsPayload)
    ? transactionsPayload
      .filter((transaction): transaction is EsploraTransaction & { txid: string } => typeof transaction?.txid === 'string' && /^[a-fA-F0-9]{64}$/.test(transaction.txid))
      .map((transaction) => ({
        txid: transaction.txid.toLowerCase(),
        confirmed: transaction.status?.confirmed === true,
        ...(typeof transaction.status?.block_height === 'number' ? { blockHeight: transaction.status.block_height } : {}),
        ...(typeof transaction.status?.block_hash === 'string' ? { blockHash: transaction.status.block_hash } : {}),
        ...(typeof transaction.status?.block_time === 'number' ? { blockTime: transaction.status.block_time } : {}),
        ...(Number.isSafeInteger(Number(transaction.fee)) && Number(transaction.fee) >= 0 ? { feeSats: Number(transaction.fee) } : {})
      }))
    : [];

  return {
    address: normalizedAddress,
    network: getNetworkName(),
    confirmedSats: calculateBalance(addressPayload.chain_stats),
    unconfirmedSats: calculateBalance(addressPayload.mempool_stats),
    confirmedTransactionCount: asNonNegativeInteger(addressPayload.chain_stats?.tx_count),
    unconfirmedTransactionCount: asNonNegativeInteger(addressPayload.mempool_stats?.tx_count),
    transactions,
    provider: 'esplora',
    explorerUrl: `${getExplorerUrl()}/address/${normalizedAddress}`
  };
}

/**
 * Server-side Bitcoin signing is intentionally unavailable. Bitcoin writes require an independent,
 * user-owned signing provider that exposes the exact PSBT and recipient to the user for approval.
 */
export async function sendBitcoinNative(): Promise<never> {
  throw new Error('NON_CUSTODIAL_BITCOIN_SIGNING_REQUIRED: Server-side Bitcoin signing and broadcasting are disabled.');
}
