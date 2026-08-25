import assert from 'assert';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const repoRoot = process.cwd();

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function waitForServerReady(proc: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for server startup: ${output}`)), 45_000);
    const onData = (chunk: Buffer) => {
      output = `${output}${String(chunk)}`.slice(-8_000);
      if (output.includes('Server running on port')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before ready (code=${code ?? 'unknown'}): ${output}`));
    });
  });
}

async function main() {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-route-hardening-'));
  const databasePath = path.join(tempDirectory, 'database.json');
  fs.writeFileSync(databasePath, JSON.stringify({ users: [], wallets: [], transactions: [], auditLogs: [] }), 'utf8');
  const port = await getAvailablePort();
  const serverProc = spawn('node', ['dist/server.cjs'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      JWT_SECRET: '12345678901234567890123456789012',
      SOVEREIGN_ENCRYPTION_KEY: 'abcdefghijklmnopqrstuvwxyzABCDEF',
      SOVEREIGN_DB_FILE_PATH: databasePath
    }
  });

  try {
    await waitForServerReady(serverProc);
    const baseUrl = `http://127.0.0.1:${port}`;
    const restrictedEndpoints = [
      ['GET', '/api/render/status'],
      ['POST', '/api/render/deploy'],
      ['GET', '/api/coinbase/config'],
      ['POST', '/api/coinbase/config'],
      ['GET', '/api/coinbase/health'],
      ['GET', '/api/integrations/credentials'],
      ['POST', '/api/integrations/credentials'],
      ['POST', '/api/integrations/test-wise'],
      ['GET', '/api/wise/health'],
      ['POST', '/api/integrations/test-plaid']
    ] as const;

    for (const [method, pathname] of restrictedEndpoints) {
      const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ privateKey: 'must-not-be-accepted', wiseApiToken: 'must-not-be-accepted' }) : undefined
      });
      assert.equal(response.status, 401, `${method} ${pathname} must require an authenticated session`);
    }

    const bitcoinHealth = await fetch(`${baseUrl}/api/health/bitcoin`);
    const bitcoinPayload = await bitcoinHealth.json();
    assert.ok([200, 503].includes(bitcoinHealth.status), 'Bitcoin health endpoint should return either live health or a fail-closed unavailable state');
    assert.equal('rpcUrl' in bitcoinPayload, false, 'Bitcoin health endpoint must not disclose an RPC URL');
    assert.equal('nodeUrl' in bitcoinPayload, false, 'Bitcoin health endpoint must not disclose a node URL');

    console.log('privileged-route-hardening-test:ok');
  } finally {
    if (!serverProc.killed) serverProc.kill();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
