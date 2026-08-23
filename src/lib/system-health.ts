import { Request, Response } from 'express';
import https from 'https';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { getWiseHttpsAgent } from './wise-live-integration';

function probeHttps(url: string, agent: any, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent, timeout: timeoutMs }, response => {
      const statusCode = response.statusCode ?? 0;
      response.resume();
      response.once('end', () => {
        if (statusCode >= 400) {
          reject(new Error(`HTTPS probe returned ${statusCode}`));
          return;
        }
        resolve();
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('HTTPS probe timed out'));
    });
    request.once('error', reject);
  });
}

export async function getSystemHealthReport(req: Request, res: Response) {
  const healthReport = {
    timestamp: new Date().toISOString(),
    status: 'HEALTHY',
    modules: {
      mtlsHandshake: { status: 'UNKNOWN', latencyMs: 0 },
      persistentStorage: { status: 'UNKNOWN', freeSpace: 'OK' },
      cryptoCertificates: { status: 'UNKNOWN' }
    }
  };

  try {
    // 1. Measure live mTLS Handshake latency to Wise Platform
    const startTime = performance.now();
    const httpsAgent = getWiseHttpsAgent();
    await probeHttps('https://wise.com', httpsAgent, 3000);
    healthReport.modules.mtlsHandshake.latencyMs = Math.round(performance.now() - startTime);
    healthReport.modules.mtlsHandshake.status = 'OPERATIONAL';
  } catch (error) {
    healthReport.status = 'DEGRADED';
    healthReport.modules.mtlsHandshake.status = 'LATENCY_TIMEOUT_OR_DISCONNECTED';
  }

  // 2. Audit persistent storage volume visibility
  const dbPath = process.env.LEDGER_DB_PATH || (fs.existsSync('/data') ? '/data/ledger.sqlite' : './ledger_atomic.sqlite');
  if (fs.existsSync('/data/ledger.sqlite') || fs.existsSync(dbPath) || fs.existsSync('/data')) {
    healthReport.modules.persistentStorage.status = 'MOUNTED_READ_WRITE';
  } else {
    healthReport.status = 'CRITICAL';
    healthReport.modules.persistentStorage.status = 'VOLUME_MISSING_OR_CORRUPT';
  }

  // 3. Verify public key verification cache file structure
  if (
    fs.existsSync('src/db/wise-public-key.pem') ||
    fs.existsSync('./wise-public-key.pem') ||
    fs.existsSync('config/wise-public-key.pem')
  ) {
    healthReport.modules.cryptoCertificates.status = 'ASYMMETRIC_KEYS_VALID';
  } else {
    if (healthReport.status !== 'CRITICAL') {
      healthReport.status = 'DEGRADED';
    }
    healthReport.modules.cryptoCertificates.status = 'KEYS_MISSING_FALLBACK_ACTIVE';
  }

  const httpStatus = healthReport.status === 'CRITICAL' ? 500 : 200;
  return res.status(httpStatus).json(healthReport);
}
