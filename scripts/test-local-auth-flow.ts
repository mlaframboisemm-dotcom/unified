import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import net from 'net';

const repoRoot = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function getAvailablePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServerReady(proc: ReturnType<typeof spawn>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let startupOutput = '';
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Timed out waiting for server startup.'));
    }, 45000);

    const handleData = (chunk: any) => {
      const text = String(chunk || '');
      startupOutput = `${startupOutput}${text}`.slice(-8000);
      if (text.includes('Server running on port')) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);
    proc.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Server exited before ready (code=${code ?? 'unknown'}): ${startupOutput}`));
    });
  });
}

async function main() {
  const testDirectory = fs.mkdtempSync(path.join(repoRoot, '.auth-test-'));
  const dbPath = path.join(testDirectory, 'database.json');
  const testPort = await getAvailablePort();

  const resetCompatibilityPassword = 'ResetCompatiblePass!42';
  const resetCompatibilitySalt = crypto.randomBytes(16).toString('hex');
  const resetCompatibilityHash = crypto
    .pbkdf2Sync(resetCompatibilityPassword, resetCompatibilitySalt, 310000, 64, 'sha512')
    .toString('hex');

  const seededDb = {
    users: [
      {
        id: 'user_demo',
        name: 'Demo User',
        email: 'demo@example.com',
        passwordHash: resetCompatibilityHash,
        salt: resetCompatibilitySalt,
        twoFactorSecret: '',
        twoFactorEnabled: false,
        kycLevel: 1,
        citizenship: 'US',
        identityLocked: true,
        productionMode: 'live',
        blockchainLinked: true,
        lockedToEmail: 'demo@example.com',
        lockedAt: new Date().toISOString()
      }
    ],
    wallets: [],
    transactions: [],
    auditLogs: []
  };

  fs.writeFileSync(dbPath, JSON.stringify(seededDb, null, 2), 'utf-8');

  const serverProc = spawn('node', ['dist/server.cjs'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(testPort),
      JWT_SECRET: '12345678901234567890123456789012',
      SOVEREIGN_ENCRYPTION_KEY: 'abcdefghijklmnopqrstuvwxyzABCDEF',
      SOVEREIGN_DB_FILE_PATH: dbPath
    }
  });

  try {
    await waitForServerReady(serverProc);

    const loginRes = await fetch(`http://127.0.0.1:${testPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: resetCompatibilityPassword })
    });

    const body = await loginRes.json();
    assert(loginRes.status === 200, `Expected login 200, got ${loginRes.status}: ${JSON.stringify(body)}`);
    assert(Boolean(body?.token), 'Expected token in successful login response.');
    assert(body?.user?.email === 'demo@example.com', 'Expected the reset-compatible account to authenticate through the active password route.');
    console.log('local-auth-flow-test:ok');
  } finally {
    if (serverProc && !serverProc.killed) {
      serverProc.kill();
    }
    fs.rmSync(testDirectory, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
