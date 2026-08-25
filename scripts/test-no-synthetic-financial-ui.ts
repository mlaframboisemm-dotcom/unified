import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeWalletAddress } from '../src/lib/web3-wallet';

const root = path.resolve(import.meta.dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const walletSource = fs.readFileSync(path.join(root, 'src/components/BlockchainWalletComponent.tsx'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');

const forbiddenAppFragments = [
  'Broadcasted & Settled',
  'Coinbase Hot Vault',
  'Instant Internal Settlement Engine',
  'Authorized under FinCEN and FINTRAC regional regulations.',
  '841029 + Math.floor',
  "padEnd(8, 'a')"
];
for (const fragment of forbiddenAppFragments) {
  assert(!appSource.includes(fragment), `App must not render fabricated financial detail: ${fragment}`);
}

const forbiddenWalletFragments = [
  'POPULAR_TOKEN_PRICES',
  'estimatedPrice',
  'Add zero-balance placeholders',
  'Using cached on-chain state',
  "DEFAULT_WEB3_WALLET_ADDRESS = '0x'"
];
for (const fragment of forbiddenWalletFragments) {
  assert(!walletSource.includes(fragment), `Web3 wallet must not display a fixed or placeholder value: ${fragment}`);
}

assert.equal(normalizeWalletAddress(''), '', 'An absent wallet address must remain disconnected.');
assert.equal(normalizeWalletAddress('not-an-address'), '', 'An invalid wallet address must not fall back to another address.');

const forbiddenServerFragments = [
  'fallback reference rates',
  'const fallbacks: Record<string, number>',
  'BTC: { USD: 64200.00 }',
  'ETH: { USD: 3350.00 }'
];
for (const fragment of forbiddenServerFragments) {
  assert(!serverSource.includes(fragment), `Server must not return a fixed market-rate fallback: ${fragment}`);
}

console.log('No-synthetic-financial-UI regression checks passed.');
