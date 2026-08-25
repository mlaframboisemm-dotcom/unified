import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink, FileCheck, ShieldCheck, X } from 'lucide-react';
import * as ethers from 'ethers';

interface RealtimeProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  netWorth: number;
  liveCashBalance: number;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Eip1193Provider {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface WalletSignatureProof {
  message: string;
  messageHash: string;
  signature: string;
  signer: string;
  recoveredAddress: string;
  chainId: number | null;
  verifiedAt: string;
}

function parseChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'bigint' && value > 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value.startsWith('0x') ? parseInt(value, 16) : Number(value));
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export const RealtimeProofModal: React.FC<RealtimeProofModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  showToast
}) => {
  const defaultChallenge = useMemo(() => {
    const owner = userName?.trim() || 'the connected wallet holder';
    const contact = userEmail?.trim() ? ` (${userEmail.trim()})` : '';
    return `I, ${owner}${contact}, authorize this wallet-signature proof for Unified on ${new Date().toISOString()}. This proof verifies control of the signing address only; it does not attest to balances, ownership of external accounts, or financial standing.`;
  }, [userEmail, userName]);
  const [challengeText, setChallengeText] = useState(defaultChallenge);
  const [proof, setProof] = useState<WalletSignatureProof | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [manualSignature, setManualSignature] = useState('');
  const [manualResult, setManualResult] = useState<{ recovered: string; matches: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setChallengeText(defaultChallenge);
    setProof(null);
    setManualMessage('');
    setManualSignature('');
    setManualResult(null);
  }, [defaultChallenge, isOpen]);

  if (!isOpen) return null;

  const handleRequestSignature = async () => {
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) {
      showToast('No EIP-1193 browser wallet was detected. Install or unlock a compatible wallet, then retry.', 'error');
      return;
    }
    if (!challengeText.trim()) {
      showToast('Enter a message to sign.', 'error');
      return;
    }

    setIsSigning(true);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const account = Array.isArray(accounts) && typeof accounts[0] === 'string' && ethers.isAddress(accounts[0]) ? ethers.getAddress(accounts[0]) : '';
      if (!account) throw new Error('The wallet did not authorize a usable account.');
      const rawChainId = await provider.request({ method: 'eth_chainId' });
      const chainId = parseChainId(rawChainId);
      const signatureResponse = await provider.request({ method: 'personal_sign', params: [challengeText, account] });
      if (typeof signatureResponse !== 'string' || !ethers.isHexString(signatureResponse)) throw new Error('The wallet did not return a valid signature.');
      const recoveredAddress = ethers.verifyMessage(challengeText, signatureResponse);
      if (recoveredAddress.toLowerCase() !== account.toLowerCase()) throw new Error('The returned signature does not recover to the authorized wallet account.');

      const signedProof: WalletSignatureProof = {
        message: challengeText,
        messageHash: ethers.keccak256(ethers.toUtf8Bytes(challengeText)),
        signature: signatureResponse,
        signer: account,
        recoveredAddress,
        chainId,
        verifiedAt: new Date().toISOString()
      };
      setProof(signedProof);
      setManualMessage(challengeText);
      setManualSignature(signatureResponse);
      setManualResult({ recovered: recoveredAddress, matches: true });
      showToast('Wallet signature verified against the connected address.', 'success');
    } catch (error: any) {
      const message = String(error?.message || 'The wallet did not sign the requested message.');
      showToast(message.includes('rejected') || error?.code === 4001 ? 'Signature request rejected in the wallet.' : message, 'error');
    } finally {
      setIsSigning(false);
    }
  };

  const handleManualVerify = () => {
    try {
      if (!manualMessage.trim() || !manualSignature.trim()) throw new Error('Enter both the signed message and signature.');
      const recovered = ethers.verifyMessage(manualMessage, manualSignature.trim());
      const matches = proof ? recovered.toLowerCase() === proof.signer.toLowerCase() : false;
      setManualResult({ recovered, matches });
      showToast(matches ? 'Signature matches the verified signer.' : proof ? 'Signature does not match the verified signer.' : 'Signature recovered. Connect it to a signed proof to compare a signer.', matches ? 'success' : 'info');
    } catch {
      showToast('The message or signature could not be verified.', 'error');
    }
  };

  const handleCopyProof = async () => {
    if (!proof) return;
    await navigator.clipboard.writeText(JSON.stringify({ type: 'wallet-signature-proof', ...proof }, null, 2));
    showToast('Wallet signature proof copied to clipboard.', 'success');
  };

  const handleDownloadProof = () => {
    if (!proof) return;
    const blob = new Blob([JSON.stringify({ type: 'wallet-signature-proof', ...proof }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `unified-wallet-signature-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast('Wallet signature proof downloaded.', 'success');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-7 w-7 shrink-0 text-emerald-400" /><div><h2 className="text-lg font-black text-white">Wallet Signature Proof</h2><p className="mt-1 text-sm text-slate-400">A user-owned browser wallet signs a message. This verifies the signing address only; it does not attest to assets, balances, providers, custody, or settlement.</p></div></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close proof modal"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-200"><div className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Never sign a message that you do not understand. This action does not create a blockchain transaction, but the wallet will ask for your explicit approval.</span></div></div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Message to sign<textarea value={challengeText} onChange={(event) => setChallengeText(event.target.value)} disabled={isSigning} className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void handleRequestSignature()} disabled={isSigning} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60">{isSigning ? 'Waiting for Wallet…' : 'Request Wallet Signature'}</button>{proof && <><button type="button" onClick={() => void handleCopyProof()} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"><Copy className="h-4 w-4" /> Copy Proof</button><button type="button" onClick={handleDownloadProof} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"><FileCheck className="h-4 w-4" /> Download Proof</button></>}</div>

          {proof && <div className="space-y-3 rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm"><div className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 className="h-5 w-5" /> Signature verified</div><dl className="grid gap-3 text-xs sm:grid-cols-[10rem_1fr]"><dt className="font-semibold text-slate-400">Signing address</dt><dd className="break-all font-mono text-emerald-200">{proof.signer}</dd><dt className="font-semibold text-slate-400">Recovered address</dt><dd className="break-all font-mono text-emerald-200">{proof.recoveredAddress}</dd><dt className="font-semibold text-slate-400">Wallet chain</dt><dd className="text-slate-200">{proof.chainId === null ? 'Unavailable' : `Chain ID ${proof.chainId}`}</dd><dt className="font-semibold text-slate-400">Message hash</dt><dd className="break-all font-mono text-slate-200">{proof.messageHash}</dd></dl></div>}

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><h3 className="text-sm font-bold text-white">Independent Signature Check</h3><p className="mt-1 text-xs text-slate-400">Paste an EIP-191 message and signature to recover its signer locally. Comparison is available only after this modal has verified a wallet signature.</p><textarea value={manualMessage} onChange={(event) => setManualMessage(event.target.value)} placeholder="Signed message" className="mt-3 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white" /><textarea value={manualSignature} onChange={(event) => setManualSignature(event.target.value)} placeholder="0x signature" className="mt-2 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white" /><div className="mt-3 flex items-center gap-3"><button type="button" onClick={handleManualVerify} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700">Verify Signature</button>{manualResult && <span className={manualResult.matches ? 'text-xs text-emerald-300' : 'text-xs text-amber-300'}>{manualResult.matches ? 'Matches verified signer' : `Recovered ${manualResult.recovered}`}</span>}</div></div>
          {proof && <a href={`https://etherscan.io/address/${proof.signer}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline">Open signing address in explorer <ExternalLink className="h-3 w-3" /></a>}
        </div>
      </section>
    </div>
  );
};

export default RealtimeProofModal;
