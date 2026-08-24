import fs from 'fs';
import path from 'path';

const checks = [
  {
    name: 'dependencies installed',
    ok: fs.existsSync(path.join(process.cwd(), 'node_modules')),
    detail: 'node_modules present',
  },
  {
    name: 'build output directory exists',
    ok: fs.existsSync(path.join(process.cwd(), 'dist')) || fs.existsSync(path.join(process.cwd(), 'dist/server.cjs')),
    detail: 'dist available',
  },
  {
    name: 'service worker present',
    ok: fs.existsSync(path.join(process.cwd(), 'public', 'sw.js')),
    detail: 'public/sw.js present',
  },
  {
    name: 'ledger file available',
    ok: fs.existsSync(path.join(process.cwd(), 'ledger_db.json')) || fs.existsSync(path.join(process.cwd(), 'data_ledger.json')),
    detail: 'ledger state file present',
  },
];

const failed = checks.filter((check) => !check.ok);

console.log('Runtime health check');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} - ${check.name}: ${check.detail}`);
}

if (failed.length > 0) {
  console.error(`Health check failed: ${failed.length} item(s) require attention.`);
  process.exit(1);
}

console.log('All runtime health checks passed.');
