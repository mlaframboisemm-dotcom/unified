import * as bitcoin from 'bitcoinjs-lib';
import * as tinysecp from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';

bitcoin.initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);

type BitcoinNetworkName = 'mainnet' | 'testnet';

interface BitcoinRpcUtxo {
  txid: string;
  vout: number;
  amount: number;
  confirmations?: number;
  spendable?: boolean;
}

export interface BitcoinSendRequest {
  amountBtc: number;
  recipientAddress: string;
  requestId: string;
}

export interface BitcoinSendResult {
  txid: string;
  sourceAddress: string;
  recipientAddress: string;
  amountBtc: number;
  feeSats: number;
  network: BitcoinNetworkName;
}

function getNetwork(): bitcoin.Network {
  return process.env.BTC_NETWORK === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
}

function getNetworkName(): BitcoinNetworkName {
  return process.env.BTC_NETWORK === 'testnet' ? 'testnet' : 'mainnet';
}

function getRpcUrl(): string {
  const rpcUrl = String(process.env.BTC_RPC_URL || '').trim();
  if (!rpcUrl) throw new Error('BTC_RPC_URL is not configured.');
  return rpcUrl;
}

function getRpcAuthHeaders(): Record<string, string> {
  const user = process.env.BTC_RPC_USER;
  const password = process.env.BTC_RPC_PASSWORD;
  if (!user || !password) return { 'Content-Type': 'application/json' };
  const encoded = Buffer.from(`${user}:${password}`).toString('base64');
  return { 'Content-Type': 'application/json', Authorization: `Basic ${encoded}` };
}

async function bitcoinRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(getRpcUrl(), {
    method: 'POST',
    headers: getRpcAuthHeaders(),
    body: JSON.stringify({ jsonrpc: '1.0', id: `unified-${Date.now()}`, method, params })
  });
  if (!response.ok) throw new Error(`Bitcoin RPC HTTP ${response.status}.`);
  const payload = await response.json() as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || `Bitcoin RPC ${method} failed.`);
  return payload.result as T;
}

function btcToSats(amountBtc: number): number {
  if (!Number.isFinite(amountBtc) || amountBtc <= 0) throw new Error('BTC amount must be greater than zero.');
  const sats = Math.round(amountBtc * 100_000_000);
  if (sats <= 0) throw new Error('BTC amount is below one satoshi.');
  return sats;
}

function getFeeRateSatsPerVbyte(): number {
  const feeRate = Number(process.env.BTC_FEE_RATE_SAT_VB || 5);
  if (!Number.isFinite(feeRate) || feeRate <= 0 || feeRate > 10_000) {
    throw new Error('BTC_FEE_RATE_SAT_VB must be a positive value no greater than 10000.');
  }
  return feeRate;
}

export async function sendBitcoinNative(request: BitcoinSendRequest): Promise<BitcoinSendResult> {
  if (process.env.BTC_ENABLE_BROADCAST !== 'true') {
    throw new Error('Bitcoin broadcast is disabled. Set BTC_ENABLE_BROADCAST=true only after custody configuration is verified.');
  }

  const wif = String(process.env.BTC_SIGNING_WIF || '').trim();
  const sourceAddress = String(process.env.BTC_SOURCE_ADDRESS || '').trim();
  if (!wif || !sourceAddress) throw new Error('BTC_SIGNING_WIF and BTC_SOURCE_ADDRESS are required.');

  const network = getNetwork();
  const networkName = getNetworkName();
  const keyPair = ECPair.fromWIF(wif, network);
  const derivedPayment = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network });
  if (!derivedPayment.address || derivedPayment.address !== sourceAddress) {
    throw new Error('BTC_SOURCE_ADDRESS does not match the configured BTC_SIGNING_WIF.');
  }

  try {
    const recipientScript = bitcoin.address.toOutputScript(request.recipientAddress, network);
    if (!recipientScript.length) throw new Error('Bitcoin recipient address produced an empty script.');
  } catch {
    throw new Error('Invalid Bitcoin recipient address for the configured network.');
  }

  const targetSats = btcToSats(request.amountBtc);
  const feeRate = getFeeRateSatsPerVbyte();
  const utxos = await bitcoinRpc<BitcoinRpcUtxo[]>('listunspent', [1, 9999999, [sourceAddress]]);
  const spendableUtxos = (utxos || []).filter((utxo) => utxo.spendable !== false && utxo.amount > 0);
  if (spendableUtxos.length === 0) throw new Error('No confirmed spendable BTC UTXOs were found for BTC_SOURCE_ADDRESS.');

  let selected: BitcoinRpcUtxo[] = [];
  let selectedSats = 0;
  let feeSats = 0;
  for (const utxo of spendableUtxos.sort((a, b) => b.amount - a.amount)) {
    selected.push(utxo);
    selectedSats += btcToSats(utxo.amount);
    const outputCount = 2;
    const estimatedVbytes = 10 + selected.length * 68 + outputCount * 31;
    feeSats = Math.ceil(estimatedVbytes * feeRate);
    if (selectedSats >= targetSats + feeSats) break;
  }
  if (selectedSats < targetSats + feeSats) {
    throw new Error(`Insufficient confirmed BTC UTXOs. Required ${targetSats + feeSats} sats, available ${selectedSats} sats.`);
  }

  const psbt = new bitcoin.Psbt({ network });
  for (const utxo of selected) {
    const rawTransaction = await bitcoinRpc<string>('getrawtransaction', [utxo.txid, false]);
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(rawTransaction, 'hex')
    });
  }

  psbt.addOutput({ address: request.recipientAddress, value: BigInt(targetSats) });
  const changeSats = selectedSats - targetSats - feeSats;
  if (changeSats >= 546) {
    psbt.addOutput({ address: sourceAddress, value: BigInt(changeSats) });
  } else {
    feeSats += Math.max(0, changeSats);
  }

  for (let index = 0; index < selected.length; index += 1) {
    psbt.signInput(index, keyPair);
  }
  psbt.finalizeAllInputs();
  const rawTransaction = psbt.extractTransaction().toHex();
  const txid = await bitcoinRpc<string>('sendrawtransaction', [rawTransaction]);

  return {
    txid,
    sourceAddress,
    recipientAddress: request.recipientAddress,
    amountBtc: targetSats / 100_000_000,
    feeSats,
    network: networkName
  };
}
