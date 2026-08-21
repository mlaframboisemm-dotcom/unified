import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBitcoinRpcConfig, getLocalBitcoinBlockchainInfo } from './bitcoin-rpc-client.js';

describe('Bitcoin Core RPC client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns a safe unavailable result when the RPC password is not configured', async () => {
    vi.stubEnv('BITCOIN_RPC_URL', 'http://127.0.0.1:8332');
    vi.stubEnv('BITCOIN_RPC_USER', 'bitcoinrpc');
    vi.stubEnv('BITCOIN_RPC_PASSWORD', '');

    const result = await getLocalBitcoinBlockchainInfo();

    expect(result.connected).toBe(false);
    expect(result.error).toBe('BITCOIN_RPC_PASSWORD_NOT_CONFIGURED');
  });

  it('returns authoritative blockchain metadata when Bitcoin Core responds', async () => {
    vi.stubEnv('BITCOIN_RPC_URL', 'http://bitcoind:8332');
    vi.stubEnv('BITCOIN_RPC_USER', 'bitcoinrpc');
    vi.stubEnv('BITCOIN_RPC_PASSWORD', 'test-only-rpc-secret');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      result: {
        chain: 'main',
        blocks: 900000,
        headers: 900001,
        verificationprogress: 0.999,
        pruned: false
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getLocalBitcoinBlockchainInfo();

    expect(result).toEqual({
      connected: true,
      chain: 'main',
      blocks: 900000,
      headers: 900001,
      verificationprogress: 0.999,
      pruned: false
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://bitcoind:8332');
  });

  it('does not expose the RPC password through configuration metadata', () => {
    vi.stubEnv('BITCOIN_RPC_PASSWORD', 'secret-that-must-not-be-returned');
    const config = getBitcoinRpcConfig();

    expect(config.rpcPassword).toBe('secret-that-must-not-be-returned');
    expect(JSON.stringify({ rpcUrl: config.url, rpcUser: config.rpcUser })).not.toContain(config.rpcPassword);
  });
});
