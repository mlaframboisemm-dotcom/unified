import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Lock, Mail, User, Landmark, Sparkles, RefreshCw, 
  ArrowRight, ShieldAlert, Check, HelpCircle, Eye, EyeOff 
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (userData: { name: string; email: string; region: 'US' | 'CA'; isNewUser: boolean; kycLevel?: number }) => void;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
  onTriggerEmail: (subject: string, sender: string, senderEmail: string, bodyHtml: string, actionType?: string, actionPayload?: any) => void;
}

const configuredApiBase = String(
  (import.meta as any).env?.VITE_API_BASE ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  ''
).trim();

function buildApiUrl(path: string): string {
  const safePath = typeof path === 'string' && path.trim().length > 0 ? path.trim() : '/';
  const normalized = safePath.startsWith('/') ? safePath : `/${safePath}`;
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:') {
      return `http://localhost:3000${normalized}`;
    }
    if (window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin}${normalized}`;
    }
  }
  if (configuredApiBase) {
    return new URL(normalized, configuredApiBase).toString();
  }
  return normalized;
}

let isGoogleInitialized = false;

export default function AuthScreen({
  onLoginSuccess,
  showToast,
  onTriggerEmail
}: AuthScreenProps) {
  const client_id = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleEnabled = client_id && !client_id.includes('placeholder') && client_id.trim() !== '';

  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('mlaframboisemm@gmail.com');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [region, setRegion] = useState<'US' | 'CA'>('US');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const handleGoogleLoginCallback = async (response: any) => {
    setIsLoading(true);
    setLoadingStep('Verifying Google Identity credentials with secure gateway...');
    try {
      const res = await fetch(buildApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
        credentials: 'include'
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.message || result.error || 'Google Sign-In verification failed.', 'error');
        return;
      }
      
      // Save session credentials
      if (result.token) {
        sessionStorage.setItem('cb_auth_jwt_token', result.token);
        localStorage.setItem('cb_auth_jwt_token', result.token);
        localStorage.setItem('cb_auth_authenticated', 'true');
        localStorage.removeItem('cb_explicit_logout');
      }
      
      onLoginSuccess({
        name: result.user.name,
        email: result.user.email,
        region: result.user.region,
        isNewUser: false,
        kycLevel: result.user.kycLevel
      });
      showToast(`Welcome back, ${result.user.name}! Authenticated via Google.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Google Sign-In connection failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isGoogleEnabled) return;
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
    const loadGoogleButton = () => {
      if ((window as any).google?.accounts?.id) {
        // @ts-ignore
        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || '825946-googleoauthplaceholder.apps.googleusercontent.com';
        if (!isGoogleInitialized) {
          (window as any).google.accounts.id.initialize({
            client_id,
            callback: handleGoogleLoginCallback
          });
          isGoogleInitialized = true;
        }
        const container = document.getElementById('google-signin-btn');
        if (container) {
          (window as any).google.accounts.id.renderButton(
            container,
            { theme: 'outline', size: 'large', width: '380', text: 'signin_with' }
          );
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = loadGoogleButton;
    } else {
      const timer = setTimeout(loadGoogleButton, 100);
      return () => clearTimeout(timer);
    }
  }, [isResetPassword]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.pathname !== '/reset-password') return;
    const params = new URLSearchParams(window.location.search);
    const resetEmail = params.get('email')?.trim().toLowerCase();
    const token = params.get('token')?.trim();
    if (!resetEmail || !token) return;
    setEmail(resetEmail);
    setResetToken(token);
    setIsResetPassword(true);
    setResetRequested(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!isResetPassword && !password)) {
      showToast('Please fill out all credentials.', 'error');
      return;
    }

    if (isResetPassword) {
      if (!resetRequested) {
        setIsLoading(true);
        setLoadingStep('Sending a one-time password reset link...');
        try {
          const response = await fetch(buildApiUrl('/api/auth/request-password-reset'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
          });
          const result = await response.json();
          if (!response.ok) {
            showToast(result?.message || 'Password reset request failed.', 'error');
            return;
          }
          setResetRequested(true);
          showToast('If that account exists, a reset link was sent. Enter the token from the link below.', 'info');
        } catch (err: any) {
          showToast(err?.message || 'Password reset request failed.', 'error');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (!resetToken.trim() || !password) {
        showToast('Enter the reset token and a new password.', 'error');
        return;
      }

      setIsLoading(true);
      setLoadingStep('Validating the one-time reset token...');
      try {
        const response = await fetch(buildApiUrl('/api/auth/reset-password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, token: resetToken.trim(), password, mfaCode })
        });

        const result = await response.json();
        if (!response.ok) {
          showToast(result?.message || result?.error || 'Password reset failed.', 'error');
          return;
        }

        showToast('Password successfully reset and account lockout has been cleared! You can now sign in.', 'success');
        setIsResetPassword(false);
        setResetRequested(false);
        setResetToken('');
        setPassword('');
      } catch (err: any) {
        showToast(err?.message || 'Password reset failed.', 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim()) {
        showToast('Please enter your legal first and last name.', 'error');
        return;
      }
      if (!agreedToTerms) {
        showToast('Please accept the agreement to continue.', 'error');
        return;
      }
    }

    setIsLoading(true);
    setLoadingStep(isSignUp ? 'Provisioning your secure account...' : 'Verifying credentials and security factors...');

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const payload = isSignUp
        ? {
            email,
            password,
            firstName,
            lastName,
            citizenship: region
          }
        : {
            email,
            password,
            mfaCode
          };

      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        if (isSignUp && result?.error === 'EMAIL_ALREADY_EXISTS') {
          setIsSignUp(false);
          showToast('That email already has an account. Please sign in instead.', 'info');
          return;
        }
        if (!isSignUp && result?.error === 'EMAIL_NOT_VERIFIED') {
          try {
            await fetch(buildApiUrl('/api/auth/resend-verification'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ email })
            });
          } catch {
            // Keep original error handling if resend fails.
          }
          showToast('Please verify your email first. A new verification email was sent.', 'info');
          return;
        }
        showToast(result?.message || result?.error || 'Login failed.', 'error');
        return;
      }

      if (isSignUp) {
        showToast('Account created. Your identity is now protected in live production mode and your email was notified.', 'success');
        setIsSignUp(false);
        setPassword('');
        setMfaCode('');
        return;
      }

      if (result?.token) {
        sessionStorage.setItem('cb_auth_jwt_token', result.token);
        localStorage.setItem('cb_auth_jwt_token', result.token);
        localStorage.setItem('cb_auth_authenticated', 'true');
        localStorage.removeItem('cb_explicit_logout');
      }

      const name = result?.user?.name || (email.split('@')[0] || email).trim();
      const effectiveRegion: 'US' | 'CA' = result?.user?.citizenship === 'CA' ? 'CA' : region;
      onLoginSuccess({
        name,
        email,
        region: effectiveRegion,
        isNewUser: isSignUp,
        kycLevel: result?.user?.kycLevel
      });
      showToast(`Welcome back, ${name}! Your account remains locked to your identity in live production mode.`, 'success');
    } catch (err: any) {
      showToast(err?.message || (isSignUp ? 'Sign up failed.' : 'Login failed.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FF] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Visual background details */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Auth Box Container */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 z-10 relative">
        
        {/* Coinbase Brand Mark */}
        <div className="flex flex-col items-center text-center space-y-2.5 mb-8">
          <div className="w-12 h-12 bg-[#0052FF] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <svg
              className="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-[#0052FF] tracking-tight">coinbase</h2>
          <p className="text-xs text-gray-500 font-medium max-w-xs">
            {isResetPassword
              ? 'Reset your secure password and clear any active login lockout restrictions'
              : isSignUp 
                ? 'Create your ultra-secure Coinbase financial vault and isolate your portfolio assets' 
                : 'Sign in to access your on-chain assets, developer connect credentials, and bank pipelines'}
          </p>
        </div>

        {/* LOADING OVERLAY */}
        {isLoading ? (
          <div className="py-16 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-[#0052FF] animate-spin mx-auto" />
            <div>
              <span className="text-sm font-bold text-gray-800">Securing Session Tunnel</span>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">{loadingStep}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">First Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Last Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              {isResetPassword && resetRequested && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">One-Time Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value.trim())}
                    placeholder="Paste the token from your reset link"
                    className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all font-mono"
                  />
                </div>
              )}

              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                {isResetPassword ? 'New Secure Password' : 'Secure Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isResetPassword || resetRequested}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm pl-9 pr-10 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && !isResetPassword && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">MFA Code (If Enabled)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all font-mono"
                />
              </div>
            )}

            {isResetPassword && resetRequested && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">MFA Code (If Enabled)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-[#0052FF] text-xs sm:text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF] transition-all font-mono"
                />
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Compliance Jurisdiction</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRegion('US')}
                    className={`py-2 px-3.5 border rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      region === 'US' 
                        ? 'bg-blue-50/50 border-[#0052FF] text-[#0052FF] ring-1 ring-[#0052FF]/20' 
                        : 'bg-transparent border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    <span>United States (SSN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegion('CA')}
                    className={`py-2 px-3.5 border rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      region === 'CA' 
                        ? 'bg-blue-50/50 border-[#0052FF] text-[#0052FF] ring-1 ring-[#0052FF]/20' 
                        : 'bg-transparent border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    <span>Canada (SIN/EFT)</span>
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed">
                  *Selecting Canada isolates payment routes to Interac e-Transfers and EFT clearing. Selecting United States routes to ACH network clearing.
                </p>
              </div>
            )}

            {isSignUp && (
              <label className="flex items-start space-x-2.5 py-1 text-[11px] text-gray-500 font-medium select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 border-gray-300 rounded text-[#0052FF] focus:ring-[#0052FF]"
                />
                <span>
                  I agree to the Coinbase Customer Agreement, Privacy Policy, and anti-money laundering isolation disclosures.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={isSignUp && !agreedToTerms}
              className="w-full py-3.5 bg-[#0052FF] hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-1"
            >
              <span>{isResetPassword ? (resetRequested ? 'Reset Password & Unlock Account' : 'Email Reset Link') : isSignUp ? 'Verify & Create Coinbase Vault' : 'Secure Account Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {!isResetPassword && isGoogleEnabled && (
              <div className="flex flex-col items-center mt-4">
                <div className="flex items-center w-full my-3">
                  <div className="flex-1 border-t border-gray-100"></div>
                  <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 border-t border-gray-100"></div>
                </div>
                <div id="google-signin-btn" className="w-full flex justify-center h-[40px]"></div>
              </div>
            )}
          </form>
        )}

        {/* Auth Mode Toggle */}
        <div className="mt-6 border-t border-gray-100 pt-4 flex flex-col space-y-3.5 text-center">
          {isResetPassword ? (
            <button
              onClick={() => {
                setIsResetPassword(false);
                setLocalStateAndErrors();
              }}
              className="text-xs font-bold text-[#0052FF] hover:underline cursor-pointer"
            >
              Remember your password? Sign In
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setLocalStateAndErrors();
                }}
                className="text-xs font-bold text-[#0052FF] hover:underline cursor-pointer"
              >
                {isSignUp ? 'Already have a secure vault? Sign In' : 'Need an isolated financial account? Sign Up'}
              </button>

              {!isSignUp && (
                <button
                  onClick={() => {
                    setIsResetPassword(true);
                    setResetRequested(false);
                    setResetToken('');
                    setPassword('');
                    setLocalStateAndErrors();
                  }}
                  className="text-xs font-medium text-gray-500 hover:text-[#0052FF] hover:underline cursor-pointer"
                >
                  Forgot Password or Account Locked? Reset & Unlock
                </button>
              )}
            </>
          )}
        </div>

      </div>

      {/* Trust & Compliance assurances */}
      <div className="mt-8 text-center space-y-2 z-10 text-[11px] text-gray-400 font-medium">
        <div className="flex items-center justify-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>Fidelity Bank Custody Isolation Block</span>
        </div>
        <p className="max-w-md mx-auto leading-relaxed">
          Coinbase is a registered MSB under FinCEN and FINTRAC. Cryptographic assets are isolated from proprietary company operating expenses.
        </p>
      </div>

    </div>
  );

  function setLocalStateAndErrors() {
    // Helper to reset forms on toggles
    setFirstName('');
    setLastName('');
  }
}
