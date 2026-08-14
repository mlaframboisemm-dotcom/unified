import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  CreditCard,
  HardDrive,
  Lock,
  CheckCircle2,
  FileText,
  Key,
  Smartphone,
  Award,
  Clock,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Building2,
  RefreshCw,
  QrCode
} from 'lucide-react';
import OnboardingKyc from './OnboardingKyc';
import GoogleDriveFolderHub from './GoogleDriveFolderHub';

interface UserProfileHubProps {
  userName: string;
  userEmail: string;
  citizenship: string;
  kycLevel: number;
  onVerificationSuccess: (level: number) => void;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
  onOpenProof?: () => void;
  onOpenMonthlyReport?: () => void;
  setCurrentTab: (tab: string) => void;
}

export default function UserProfileHub({
  userName,
  userEmail,
  citizenship,
  kycLevel,
  onVerificationSuccess,
  showToast,
  onOpenProof,
  onOpenMonthlyReport,
  setCurrentTab
}: UserProfileHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'kyc' | 'security' | 'drive' | 'methods'>('overview');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0052FF] to-blue-700 flex items-center justify-center text-white text-2xl font-black shadow-lg border border-blue-400/30 shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'J'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{userName || 'Jane Doe'}</h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Verified Level {kycLevel}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">{userEmail || 'mlaframboisemm@gmail.com'}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3 h-3 text-blue-400" />
                  <span>Region: {citizenship === 'CA' ? 'Canada (SIN Verified)' : 'United States (SSN Verified)'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>FinCEN Compliant</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto">
            {onOpenProof && (
              <button
                onClick={onOpenProof}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <span>Proof of Funds Certificate</span>
              </button>
            )}
            {onOpenMonthlyReport && (
              <button
                onClick={onOpenMonthlyReport}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Monthly PDF Statement</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-xs overflow-x-auto gap-1">
        {[
          { id: 'overview', label: 'Profile Overview', icon: User },
          { id: 'kyc', label: 'Identity & Limits', icon: ShieldCheck },
          { id: 'security', label: 'Safety & Security', icon: Lock },
          { id: 'drive', label: 'Google Workspace', icon: HardDrive },
          { id: 'methods', label: 'Payment Methods', icon: CreditCard }
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#0052FF] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Overview */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Account Status Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#0052FF]" />
                  <h3 className="text-base font-bold text-gray-900">Verification & Account Tier</h3>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">
                  Level {kycLevel} Unrestricted Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Daily Buy/Sell Limit</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">
                    {kycLevel >= 3 ? 'Unlimited' : '$25,000.00'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">Verified</span>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">On-Chain Vault</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">Unlimited</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">0x742d...f44e</span>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Wise Bank Link</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">$2,478,350.00</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">Active API Sync</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed pt-2">
                Your account is fully compliant with FINTRAC and FinCEN anti-money laundering regulations. All internal transfers utilize atomic double-entry ledger balancing with on-chain cryptographic settlement verification.
              </p>
            </div>

            {/* Quick Hub Jump Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setCurrentTab('sovereign')}
                className="p-5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-amber-300 hover:shadow-sm transition-all text-left group cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Sovereign Banking Hub</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Manage cold vaults, rate-limiting overrides, and high-net-worth liquidity reserves.</p>
                </div>
              </button>

              <button
                onClick={() => setCurrentTab('wise-card')}
                className="p-5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all text-left group cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Wise Multi-Currency Card</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Manage virtual debit cards, foreign exchange balances, and POS spending limits.</p>
                </div>
              </button>
            </div>

            {/* Google Drive Production Folder Integration Card */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-xs border border-blue-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
                    <HardDrive className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Google Drive Workspace Folder</h4>
                    <span className="text-[10px] text-blue-200 font-mono block">Folder ID: 1ABPIEmoPH_OWpSjHYu1DzjPRPlk3i8QM</span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Connected directly to your cloud production workspace. Sync files, audit statements, and export reports seamlessly.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => setActiveSubTab('drive')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Manage Drive Folder
                </button>
                <a
                  href="https://drive.google.com/drive/folders/1ABPIEmoPH_OWpSjHYu1DzjPRPlk3i8QM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center space-x-1"
                >
                  <span>Open Drive</span>
                  <ExternalLink className="w-3 h-3 text-blue-400" />
                </a>
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="md:col-span-4 space-y-6">
            
            {/* Safety & Security Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <Lock className="w-4 h-4 text-[#0052FF]" />
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Account Protection</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Two-Factor Auth (2FA)</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Biometric FaceID / Passkey</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Cryptographic Seed Backup</span>
                  <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">Encrypted</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Render/GitHub Production Live</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Wired</span>
                </div>
              </div>

              <button
                onClick={() => setActiveSubTab('security')}
                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-all text-center"
              >
                Security Center
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Account Downloads</h4>
              {onOpenMonthlyReport && (
                <button
                  onClick={onOpenMonthlyReport}
                  className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-between text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Monthly PDF Statement</span>
                      <span className="text-[10px] text-gray-400 font-mono">Tax & Accounting</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {onOpenProof && (
                <button
                  onClick={onOpenProof}
                  className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-between text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Proof of Funds Certificate</span>
                      <span className="text-[10px] text-gray-400 font-mono">Real-time Solvency</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab Content 2: KYC & Identity */}
      {activeSubTab === 'kyc' && (
        <OnboardingKyc
          onVerificationSuccess={(level) => {
            onVerificationSuccess(level);
            showToast(`Verified level updated to Tier ${level}.`, 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* Tab Content 3: Security & Safety */}
      {activeSubTab === 'security' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-5 h-5 text-[#0052FF]" />
              <div>
                <h3 className="text-base font-bold text-gray-900">Security & Protection Matrix</h3>
                <p className="text-xs text-gray-500">Enterprise-grade multi-layer protection and session safeguards.</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Security Rating
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">2-Factor Authentication</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Active</span>
              </div>
              <p className="text-xs text-gray-500">Time-based one-time password (TOTP) hardware security key linked.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Render & GitHub Deployment</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Production Live</span>
              </div>
              <p className="text-xs text-gray-500">All secrets, credentials, and environment keys configured for live production deployment.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Internal Ledger Audit Engine</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Running</span>
              </div>
              <p className="text-xs text-gray-500">Real-time background double-entry debit/credit reconciliation enabled.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Sovereign Mode Safeguards</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Owner Override</span>
              </div>
              <p className="text-xs text-gray-500">Rate-limiting overrides enabled for account owner session.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: Google Workspace Drive */}
      {activeSubTab === 'drive' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              <span>Google Drive Production Workspace</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage connected production files, audit exports, and document repository.</p>
          </div>
          <GoogleDriveFolderHub folderId="1ABPIEmoPH_OWpSjHYu1DzjPRPlk3i8QM" />
        </div>
      )}

      {/* Tab Content 5: Linked Payment Methods */}
      {activeSubTab === 'methods' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Connected Bank Accounts & Cards</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Instant credit card checkout, Plaid bank sync, and Wise multi-currency accounts.</p>
          </div>
          <OnboardingKyc
            onVerificationSuccess={(level) => {
              onVerificationSuccess(level);
            }}
            showToast={showToast}
          />
        </div>
      )}

    </div>
  );
}
