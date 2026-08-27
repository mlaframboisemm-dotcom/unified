import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import net from 'net';
import { generateTotpCode } from '../src/lib/auth-security.ts';

const repoRoot = process.cwd();
const dbPath = path.join(repoRoot, 'src', 'db', 'database.json');
const lockPath = path.join(repoRoot, 'src', 'db', 'bootstrap.lock');
const serverPath = path.join(repoRoot, 'server.ts');
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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function readFileIfExists(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

function writeFileOrDelete(filePath: string, content: string | null) {
  if (content === null) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

function parseCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0] || '';
}

async function waitForServerReady(proc: ReturnType<typeof spawn>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const startupLogs: string[] = [];
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Timed out waiting for server startup. Logs:\n${startupLogs.join('')}`));
    }, 45000);

    const handleData = (chunk: any) => {
      const text = String(chunk || '');
      startupLogs.push(text);
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
      reject(new Error(`Server exited before ready (code=${code ?? 'unknown'}). Logs:\n${startupLogs.join('')}`));
    });
  });
}

async function main() {
  console.log('Running auth API security integration tests...');

  const serverSource = fs.readFileSync(serverPath, 'utf-8');
  assert(serverSource.includes("x-forwarded-host"), 'Expected proxy-aware host handling for session origin checks.');
  assert(
    /app\.get\('\/api\/coinbase\/config',\s*requireAuth,\s*async/.test(serverSource),
    'Expected the read-only Coinbase configuration endpoint to require a session but not MFA.'
  );
  assert(
    !/app\.get\('\/api\/coinbase\/config',\s*requireAuth,\s*requireMfa/.test(serverSource),
    'Read-only Coinbase configuration must not be MFA-blocked during session initialization.'
  );
  assert(
    serverSource.indexOf('const authHeader = req.headers.authorization;') < serverSource.indexOf("const cookieToken = getCookieValue(req, 'cb_session');"),
    'Expected explicit Authorization Bearer tokens to be evaluated before cookies.'
  );
  assert(
    serverSource.includes("error: 'PROVIDER_NOT_CONFIGURED'"),
    'Expected unconfigured integrations to fail closed rather than returning simulated connection records.'
  );

  const originalDb = readFileIfExists(dbPath);
  const originalLock = readFileIfExists(lockPath);
  const testDbDirectory = fs.mkdtempSync(path.join(repoRoot, '.auth-api-security-'));
  const isolatedDbPath = path.join(testDbDirectory, 'database.json');
  const testPassword = 'CorrectHorseBatteryStaple!42';
  const testSalt = crypto.randomBytes(16).toString('hex');
  const testPasswordHash = crypto.pbkdf2Sync(testPassword, testSalt, 100000, 64, 'sha512').toString('hex');

  let serverProc: ReturnType<typeof spawn> | null = null;

  try {
    const testPort = await getAvailablePort();

    fs.writeFileSync(
      dbPath,
      JSON.stringify({ users: [], wallets: [], transactions: [], auditLogs: [] }, null, 2),
      'utf-8'
    );
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
    fs.writeFileSync(
      isolatedDbPath,
      JSON.stringify({
        users: [{
          id: 'user_auth_api_test',
          name: 'Auth API Test User',
          email: 'admin@secure.local',
          passwordHash: testPasswordHash,
          salt: testSalt,
          twoFactorSecret: '',
          twoFactorEnabled: false,
          kycLevel: 2,
          citizenship: 'US',
          identityLocked: true,
          productionMode: 'live',
          blockchainLinked: true,
          lockedToEmail: 'admin@secure.local',
          lockedAt: new Date().toISOString()
        }],
        wallets: [],
        transactions: [],
        auditLogs: []
      }, null, 2),
      'utf-8'
    );

    serverProc = spawn('node', ['dist/server.cjs'], {
      cwd: repoRoot,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(testPort),
        APP_URL: `https://unified-wz8i.onrender.com`,
        SOVEREIGN_DB_FILE_PATH: isolatedDbPath,
        JWT_SECRET: '12345678901234567890123456789012',
        SOVEREIGN_ENCRYPTION_KEY: 'abcdefghijklmnopqrstuvwxyzABCDEF',
        BOOTSTRAP_ADMIN_EMAIL: '',
        BOOTSTRAP_ADMIN_PASSWORD: '',
        BOOTSTRAP_ADMIN_TOTP_SECRET: '',
        COINBASE_API_KEY_ID: 'unit-test-key',
        COINBASE_API_SECRET_RAW: 'not-a-valid-pem'
      }
    });

    await waitForServerReady(serverProc);

    const base = `http://localhost:${testPort}`;
    const sameOriginRequestHeaders = {
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'unified-wz8i.onrender.com',
      'sec-fetch-site': 'same-origin'
    };
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@secure.local', password: testPassword })
    });
    const loginBody = await loginRes.json();
    const cookie = parseCookie(loginRes.headers.get('set-cookie'));

    if (loginRes.status !== 200) {
      console.log('Login failed body:', loginBody);
    }
    assert(loginRes.status === 200, `Expected login 200, got ${loginRes.status}`);
    assert(loginBody?.success === true, 'Expected login success body.');
    assert(Boolean(cookie), 'Expected cb_session cookie on login.');

    const logoutRes = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie, ...sameOriginRequestHeaders }
    });
    const logoutBody = await logoutRes.json();
    assert(logoutRes.status === 200 && logoutBody?.success === true, 'Expected successful logout.');

    const protectedAfterLogoutRes = await fetch(`${base}/api/coinbase/config`, {
      headers: { cookie, ...sameOriginRequestHeaders }
    });
    const protectedAfterLogoutBody = await protectedAfterLogoutRes.json();
    assert(protectedAfterLogoutRes.status === 401, `Expected 401 after logout, got ${protectedAfterLogoutRes.status}`);
    assert(
      ['SESSION_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED_ACCESS'].includes(String(protectedAfterLogoutBody?.error || '')),
      'Expected session invalidation error after logout.'
    );

    const loginAgainRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@secure.local', password: testPassword })
    });
    const loginAgainBody = await loginAgainRes.json();
    const cookie2 = parseCookie(loginAgainRes.headers.get('set-cookie'));
    assert(loginAgainRes.status === 200 && Boolean(cookie2) && Boolean(loginAgainBody?.token), 'Expected second login success with cookie and token.');

    const bearerPriorityRes = await fetch(`${base}/api/coinbase/config`, {
      headers: {
        cookie: 'cb_session=stale-session-token',
        Authorization: `Bearer ${loginAgainBody.token}`,
        ...sameOriginRequestHeaders
      }
    });
    assert(bearerPriorityRes.status === 200, `Expected valid Bearer token to take precedence over stale cookie, got ${bearerPriorityRes.status}`);

    const unconfiguredProviderRes = await fetch(`${base}/api/integrations/initiate-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginAgainBody.token}`,
        ...sameOriginRequestHeaders
      },
      body: JSON.stringify({ appId: 'app-moonpay-ramps' })
    });
    const unconfiguredProviderBody = await unconfiguredProviderRes.json();
    assert(unconfiguredProviderRes.status === 503, `Expected unconfigured provider connection to return 503, got ${unconfiguredProviderRes.status}`);
    assert(unconfiguredProviderBody?.error === 'PROVIDER_NOT_CONFIGURED', 'Expected unconfigured provider error code.');

    const crossSiteBearerRes = await fetch(`${base}/api/coinbase/config`, {
      headers: {
        Authorization: `Bearer ${loginAgainBody.token}`,
        origin: 'https://attacker.example',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'unified-wz8i.onrender.com',
        'sec-fetch-site': 'cross-site'
      }
    });
    assert(crossSiteBearerRes.status === 401, `Expected cross-site Bearer request to remain rejected, got ${crossSiteBearerRes.status}`);

    const idempotencyKey = `idem-${Date.now()}-security-test`;
    const tradePayload = {
      side: 'BUY',
      symbol: 'BTC',
      amount: 0.001,
      fiatAmount: 100
    };

    const tradeAttempt1 = await fetch(`${base}/api/coinbase/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookie2,
        'x-idempotency-key': idempotencyKey,
        ...sameOriginRequestHeaders
      },
      body: JSON.stringify(tradePayload)
    });
    const tradeBody1 = await tradeAttempt1.json();

    const tradeAttempt2 = await fetch(`${base}/api/coinbase/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookie2,
        'x-idempotency-key': idempotencyKey,
        ...sameOriginRequestHeaders
      },
      body: JSON.stringify(tradePayload)
    });
    const tradeBody2 = await tradeAttempt2.json();

    assert(tradeAttempt1.status === 400, `Expected first trade attempt 400, got ${tradeAttempt1.status}`);
    assert(tradeAttempt2.status === 400, `Expected idempotent replay 400, got ${tradeAttempt2.status}`);
    assert(JSON.stringify(tradeBody1) === JSON.stringify(tradeBody2), 'Expected replayed idempotency response body to match original cached response.');

    console.log('Auth API security integration tests passed.');
  } finally {
    if (serverProc && !serverProc.killed) {
      serverProc.kill();
    }

    writeFileOrDelete(dbPath, originalDb);
    writeFileOrDelete(lockPath, originalLock);
    fs.rmSync(testDbDirectory, { recursive: true, force: true });
  }
}

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
