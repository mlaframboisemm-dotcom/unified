import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  ShieldCheck,
  FolderGit2,
  QrCode,
  Sparkles,
  Terminal,
  ExternalLink,
  Layers,
  HardDrive,
  PackageCheck,
  FileArchive,
  Info,
  Check,
  Copy
} from 'lucide-react';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'sdk'>('pwa');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    // Listen for browser PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('Sovereign Wealth PWA installed successfully!', 'success');
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      showToast(
        'To install: Tap your browser menu (⋮ in Chrome, or Share in Safari) and tap "Install app" or "Add to Home Screen".',
        'info'
      );
    }
  };

  const handleDownloadApk = () => {
    const link = document.createElement('a');
    link.href = '/api/download/apk';
    link.download = 'sovereign-wealth-portal.apk';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Android APK download started!', 'success');
  };

  const handleDownloadSdk = () => {
    const link = document.createElement('a');
    link.href = '/api/download/android-sdk';
    link.download = 'sovereign-android-sdk.zip';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Complete Android SDK (.zip) download started!', 'success');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    showToast(`Copied ${label} to clipboard`, 'info');
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-gray-100 space-y-5 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-[#0052FF] rounded-2xl border border-blue-100 shrink-0">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-gray-900">Mobile & Android Hub</h2>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                  Android & iOS
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Install as a standalone Web App (PWA), download the Android APK, or grab the complete Android SDK.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 p-1 rounded-2xl space-x-1">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'pwa'
                ? 'bg-white text-[#0052FF] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>PWA (1-Tap)</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'apk'
                ? 'bg-white text-[#0052FF] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Android APK</span>
          </button>
          <button
            onClick={() => setActiveTab('sdk')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'sdk'
                ? 'bg-white text-[#0052FF] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileArchive className="h-3.5 w-3.5" />
            <span>Complete SDK (.zip)</span>
          </button>
        </div>

        {/* TAB 1: Progressive Web App (PWA) */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    Instant Mobile & Desktop Install
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  {isPwaInstalled ? 'App Active' : 'Offline Ready'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Install Sovereign Wealth directly on Android, iOS, Windows, or Mac. Runs in a full-screen, native standalone container with instant launch and biometric integration.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Full Screen (No Browser Bar)</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Home Screen App Icon</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Offline Asset Caching</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Instant Hardware Acceleration</span>
                </div>
              </div>
            </div>

            {/* Install Action Card */}
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-gray-900">
                  {isPwaInstalled ? 'Application Installed' : 'Ready to Install on Phone'}
                </h4>
                <p className="text-[11px] text-gray-600">
                  {isPwaInstalled
                    ? 'Running as standalone application.'
                    : 'Tap below to trigger prompt or add to your home screen.'}
                </p>
              </div>

              <button
                onClick={handleInstallPwa}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0052FF] hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>{deferredPrompt ? 'Install App' : 'Add to Home Screen'}</span>
              </button>
            </div>

            {/* Quick Mobile Browser Guide */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-[11px] text-gray-600 space-y-2">
              <span className="font-extrabold text-gray-800 flex items-center space-x-1.5">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                <span>How to Install Manually on Mobile Browsers:</span>
              </span>
              <ul className="space-y-1 pl-4 list-disc text-gray-600">
                <li><strong>Chrome / Brave on Android:</strong> Tap the <strong>⋮ (3 dots menu)</strong> at top right &gt; tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li><strong>Samsung Internet:</strong> Tap the <strong>≡ (bottom right menu)</strong> &gt; tap <strong>"+ Add page to"</strong> &gt; <strong>"Home screen"</strong>.</li>
                <li><strong>Safari on iPhone:</strong> Tap the <strong>Share button (square with arrow)</strong> &gt; scroll down &gt; tap <strong>"Add to Home Screen"</strong>.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: Android APK Package */}
        {activeTab === 'apk' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-1 text-emerald-400" />
                  Android Package Archive (.apk)
                </span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-mono border border-indigo-400/30">
                  Target API 34 (Android 14)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Download the standalone Android package for direct sideloading or testing on Android devices and emulators.
              </p>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                <div>Package: <span className="text-emerald-400 font-bold">com.sovereign.wealth</span></div>
                <div>File: <span className="text-blue-300">sovereign-wealth-portal.apk (553 KB)</span></div>
                <div>Min SDK: <span className="text-slate-400">Android 7.0+ (API 24)</span></div>
              </div>

              <button
                onClick={handleDownloadApk}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <Download className="h-4 w-4" />
                <span>Download sovereign-wealth-portal.apk</span>
              </button>
            </div>

            {/* Android Install Instructions */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-2">
              <span className="font-extrabold text-gray-900 block text-[11px] uppercase tracking-wider">
                How to Install APK on Android:
              </span>
              <ol className="space-y-1.5 list-decimal pl-4 text-[11px] text-gray-600">
                <li>Tap <strong>Download sovereign-wealth-portal.apk</strong> above.</li>
                <li>Open your Android <strong>Files</strong> or <strong>Downloads</strong> app and tap the downloaded file.</li>
                <li>If prompted by Android Security, tap <strong>Settings</strong> &gt; enable <strong>Allow from this source</strong>.</li>
                <li>Tap <strong>Install</strong> to complete installation.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: Complete Android Studio SDK Project (.zip) */}
        {activeTab === 'sdk' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center">
                  <FolderGit2 className="h-4 w-4 mr-1 text-blue-400" />
                  Full Android Studio SDK & Gradle Source (.zip)
                </span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-mono border border-blue-400/30">
                  Gradle 8.2 + JDK 17
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                The complete native Android project source archive containing <code className="bg-slate-800 text-blue-300 px-1 py-0.5 rounded font-mono text-[10px]">/android</code>, Gradle wrapper (<code className="text-blue-300">gradlew</code>), native Java activities, biometrics security, and Capacitor runtime.
              </p>

              <button
                onClick={handleDownloadSdk}
                className="w-full py-3 bg-[#0052FF] hover:bg-blue-600 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-blue-900/30"
              >
                <Download className="h-4 w-4" />
                <span>Download sovereign-android-sdk.zip (282 KB)</span>
              </button>
            </div>

            {/* Build Terminal Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center text-slate-300">
                  <Terminal className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                  CLI & Android Studio Build Commands
                </span>
                <span className="text-gray-500">Gradle Wrapper</span>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-emerald-400 select-all">cd android && ./gradlew assembleDebug</span>
                  <button
                    onClick={() => copyToClipboard('cd android && ./gradlew assembleDebug', 'Build Command')}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copiedCmd === 'Build Command' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-emerald-400 select-all">cd android && ./gradlew assembleRelease</span>
                  <button
                    onClick={() => copyToClipboard('cd android && ./gradlew assembleRelease', 'Release Command')}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copiedCmd === 'Release Command' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Close */}
        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadModal;
