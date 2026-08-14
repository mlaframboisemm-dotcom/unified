import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, CheckCircle2, Copy, RefreshCw, Smartphone, QrCode, Mail, Wallet, Plus, ShieldCheck, ExternalLink, Check } from 'lucide-react';
import { Coin, Holding } from '../types';
import { getAssetLegitimacyInfo } from '../lib/assetLegitimacy';

interface SendReceiveModalProps {
  coins: Coin[];
  holdings: Holding[];
  isOpen: boolean;
  onClose: () => void;
  initialAction?: 'send' | 'receive';
  onExecuteTransaction: (
    type: 'SEND' | 'RECEIVE',
    symbol: string,
    amount: number,
    fiatAmount: number,
    details: string
  ) => void;
}

export default function SendReceiveModal({
  coins,
  holdings,
  isOpen,
  onClose,
  initialAction = 'send',
  onExecuteTransaction
}: SendReceiveModalProps) {
  const [action, setAction] = useState<'send' | 'receive'>(initialAction);
  
  // Send States
  const [sendSymbol, setSendSymbol] = useState('BTC');
  const [sendAmount, setSendAmount] = useState('100');
  const [recipient, setRecipient] = useState('friend@example.com');
  const [isFiat, setIsFiat] = useState(true);

  // Receive States
  const [receiveSymbol, setReceiveSymbol] = useState('BTC');

  // Transaction Status
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  if (!coins || coins.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl w-full max-w-md flex flex-col items-center justify-center text-center py-12 min-h-[400px]">
            <div className="w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-gray-500 font-semibold">Loading live market rates...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentCoin = coins.find((c) => c.symbol === (action === 'send' ? sendSymbol : receiveSymbol)) || coins[0];
  const currentHolding = holdings.find((h) => h.symbol === sendSymbol) || { symbol: sendSymbol, amount: 0 };

  // Calculate fiat to crypto conversion
  const sendAmountNum = parseFloat(sendAmount) || 0;
  const convertedCryptoAmount = isFiat ? sendAmountNum / currentCoin.price : sendAmountNum;
  const convertedFiatAmount = isFiat ? sendAmountNum : sendAmountNum * currentCoin.price;

  // Render a wallet address based on the selected receive coin
  const getWalletAddress = (symbol: string) => {
    switch (symbol) {
      case 'BTC': return 'bc1q9rny26szrgl26u64mdg0cuhvpt2p77jwh792ka';
      case 'ETH': return '0x71C7656EC7ab88b098defB751B7401B5f6d1476B';
      case 'SOL': return 'FvJDg947zY8f4L6kSghB8b9uUv9T8ZzK1C2xL7N3aU';
      case 'XRP': return 'rEb8TK3gYQCfyAam7C16m6W8ZfS23nVTwk';
      default: return '0x39a1D8B4eC6294D290F571bF8C28b173Fdb920a6';
    }
  };

  const handleSendSubmit = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (sendAmountNum <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (!recipient) {
      setErrorMsg('Please specify a recipient email or address.');
      return;
    }

    if (convertedCryptoAmount > currentHolding.amount) {
      setErrorMsg(`Insufficient ${sendSymbol} holdings. You own ${currentHolding.amount.toFixed(6)} ${sendSymbol} but tried to send ${convertedCryptoAmount.toFixed(6)}.`);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      onExecuteTransaction(
        'SEND',
        sendSymbol,
        convertedCryptoAmount,
        convertedFiatAmount,
        `Sent to ${recipient}`
      );
      setLoading(false);
      setSuccessMsg(`Successfully sent ${convertedCryptoAmount.toFixed(6)} ${sendSymbol} ($${convertedFiatAmount.toFixed(2)}) to ${recipient}.`);
      setSendAmount('100');
    }, 1200);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(getWalletAddress(receiveSymbol));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Record an incoming deposit for the selected asset
  const handleRecordDeposit = (depositAmount: number) => {
    setLoading(true);
    setTimeout(() => {
      const valueUSD = depositAmount * currentCoin.price;
      onExecuteTransaction(
        'RECEIVE',
        receiveSymbol,
        depositAmount,
        valueUSD,
        `Received external blockchain deposit`
      );
      setLoading(false);
      setSuccessMsg(`Successfully deposited ${depositAmount} ${receiveSymbol} ($${valueUSD.toFixed(2)}) into your Coinbase account!`);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="send-receive-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all w-full max-w-md animate-slide-up">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setAction('send');
                  setSuccessMsg(null);
                  setErrorMsg(null);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  action === 'send' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Send
              </button>
              <button
                onClick={() => {
                  setAction('receive');
                  setSuccessMsg(null);
                  setErrorMsg(null);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  action === 'receive' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Receive
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          {successMsg ? (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <div>
                <h4 className="text-base font-bold text-gray-900">Transaction Confirmed</h4>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-xs">{successMsg}</p>
              </div>
              <button
                onClick={() => setSuccessMsg(null)}
                className="px-6 py-2 bg-[#0052FF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg cursor-pointer transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : action === 'send' ? (
            /* SEND CRYPTO PANEL */
            <div className="space-y-4">
              {/* Asset selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block">Pay with</label>
                  {(() => {
                    const leg = getAssetLegitimacyInfo(sendSymbol);
                    return (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {leg.legitimacyBadge}
                      </span>
                    );
                  })()}
                </div>
                <select
                  value={sendSymbol}
                  onChange={(e) => setSendSymbol(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
                >
                  {coins.map((coin) => {
                    const held = holdings.find((h) => h.symbol === coin.symbol) || { amount: 0 };
                    const leg = getAssetLegitimacyInfo(coin.symbol);
                    return (
                      <option key={coin.symbol} value={coin.symbol}>
                        {coin.name} ({coin.symbol}) — {held.amount.toFixed(4)} held • {leg.formattedAddress}
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const leg = getAssetLegitimacyInfo(sendSymbol);
                  return (
                    <div className="p-2 bg-slate-900 text-slate-100 rounded-lg flex items-center justify-between text-[10px] font-mono">
                      <span className="truncate text-blue-300 font-bold mr-1">Addr: {leg.contractAddress}</span>
                      <span className="text-slate-400 text-[9px] shrink-0 font-sans font-bold">{leg.verifierName}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Recipient info */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">To (Email or Address)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter email or 0x address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
                  />
                </div>
              </div>

              {/* Amount input */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Amount</label>
                    <div className="flex items-center">
                      {isFiat && <span className="text-xl font-bold text-gray-500 mr-0.5">$</span>}
                      <input
                        type="number"
                        placeholder="0.00"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="w-full bg-transparent text-2xl font-extrabold text-gray-900 border-none outline-none focus:ring-0 p-0 font-mono"
                      />
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {isFiat
                        ? `≈ ${convertedCryptoAmount.toFixed(6)} ${sendSymbol}`
                        : `≈ $${convertedFiatAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsFiat(!isFiat)}
                    className="p-2 bg-white border border-gray-100 rounded-full text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {errorMsg}
                </p>
              )}

              <button
                onClick={handleSendSubmit}
                disabled={loading}
                className="w-full py-3 bg-[#0052FF] hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors text-center text-sm cursor-pointer"
              >
                {loading ? 'Executing Secure Send...' : `Send ${sendSymbol}`}
              </button>
            </div>
          ) : (
            /* RECEIVE CRYPTO PANEL */
            <div className="space-y-4 flex flex-col items-center text-center">
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block">Select Asset to Receive</label>
                  {(() => {
                    const leg = getAssetLegitimacyInfo(receiveSymbol);
                    return (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {leg.legitimacyBadge}
                      </span>
                    );
                  })()}
                </div>
                <select
                  value={receiveSymbol}
                  onChange={(e) => setReceiveSymbol(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl focus:outline-none cursor-pointer"
                >
                  {coins.map((coin) => {
                    const leg = getAssetLegitimacyInfo(coin.symbol);
                    return (
                      <option key={coin.symbol} value={coin.symbol}>
                        {coin.name} ({coin.symbol}) • {leg.formattedAddress}
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const leg = getAssetLegitimacyInfo(receiveSymbol);
                  return (
                    <div className="p-2 bg-slate-900 text-slate-100 rounded-lg flex items-center justify-between text-[10px] font-mono text-left">
                      <span className="truncate text-blue-300 font-bold mr-1">Token Contract: {leg.contractAddress}</span>
                      <span className="text-slate-400 text-[9px] shrink-0 font-sans font-bold">{leg.verifierName}</span>
                    </div>
                  );
                })()}
              </div>

              {/* QR Code display */}
              <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-xs">
                <div className="w-40 h-40 bg-gray-50 flex items-center justify-center rounded-xl border border-dashed border-gray-200 relative">
                  <QrCode className="h-28 w-28 text-gray-900" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0052FF] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                    C
                  </div>
                </div>
              </div>

              {/* Secure Address Copy section */}
              <div className="w-full">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Your {receiveSymbol} Wallet Address</span>
                <div className="flex bg-gray-50 p-2 rounded-xl border border-gray-200 items-center justify-between">
                  <p className="text-[11px] text-gray-600 font-mono font-semibold truncate flex-1 px-2 text-left">
                    {getWalletAddress(receiveSymbol)}
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 bg-white hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all border border-gray-100 cursor-pointer"
                    title="Copy wallet address"
                  >
                    {copied ? <span className="text-[10px] text-green-600 font-bold px-1">Copied!</span> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Quick deposit helper */}
              <div className="w-full pt-3 border-t border-gray-100 mt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Record Incoming Deposit</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRecordDeposit(receiveSymbol === 'BTC' ? 0.05 : receiveSymbol === 'ETH' ? 0.5 : 5.0)}
                    disabled={loading}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+{receiveSymbol === 'BTC' ? '0.05' : receiveSymbol === 'ETH' ? '0.5' : '5.0'} {receiveSymbol}</span>
                  </button>
                  <button
                    onClick={() => handleRecordDeposit(receiveSymbol === 'BTC' ? 0.2 : receiveSymbol === 'ETH' ? 2.0 : 20.0)}
                    disabled={loading}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+{receiveSymbol === 'BTC' ? '0.2' : receiveSymbol === 'ETH' ? '2.0' : '20.0'} {receiveSymbol}</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
