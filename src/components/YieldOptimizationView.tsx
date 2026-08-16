import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Sparkles,
  Zap,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Percent,
  Sliders,
  ChevronRight,
  Lock,
  Unlock,
  Info,
  Calendar,
  Layers,
  Award,
  Wallet,
  Check,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Coin, Holding, StakedAssetPosition, Transaction } from '../types';
import StakedYieldD3Chart from './StakedYieldD3Chart';

export interface YieldOptimizationViewProps {
  coins: Coin[];
  holdings: Holding[];
  usdBalance: number;
  onUpdateHoldings?: (newHoldings: Holding[]) => void;
  onAddTransaction?: (tx: Transaction) => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenTradeModal?: (symbol: string) => void;
}

const DEFAULT_STAKED_POSITIONS: StakedAssetPosition[] = [
  {
    id: 'stake_eth_1',
    symbol: 'ETH',
    name: 'Ethereum (cbETH / stETH)',
    stakedAmount: 4.25,
    unclaimedRewards: 0.0482,
    apy: 3.85,
    lockupDays: 0,
    validator: 'Coinbase Cloud Validator 0x48a',
    slashingProtected: true,
    autoCompound: true,
    liquidityType: 'Liquid',
    lastCompoundedAt: Date.now() - 3600000 * 24 * 3
  },
  {
    id: 'stake_sol_1',
    symbol: 'SOL',
    name: 'Solana (Native Stake)',
    stakedAmount: 65.0,
    unclaimedRewards: 1.142,
    apy: 7.45,
    lockupDays: 3,
    validator: 'Sovereign Solana Node Prime',
    slashingProtected: true,
    autoCompound: true,
    liquidityType: 'Epoch-Bound',
    lastCompoundedAt: Date.now() - 3600000 * 24 * 2
  },
  {
    id: 'stake_usdc_1',
    symbol: 'USDC',
    name: 'USD Coin (Maker Prime Yield)',
    stakedAmount: 5000.0,
    unclaimedRewards: 28.50,
    apy: 5.10,
    lockupDays: 0,
    validator: 'MakerDAO Treasury / Coinbase Prime',
    slashingProtected: true,
    autoCompound: true,
    liquidityType: 'Flexible',
    lastCompoundedAt: Date.now() - 3600000 * 24 * 7
  },
  {
    id: 'stake_pol_1',
    symbol: 'POL',
    name: 'Polygon PoS Stake',
    stakedAmount: 2400.0,
    unclaimedRewards: 32.15,
    apy: 5.30,
    lockupDays: 2,
    validator: 'Polygon Foundation Node 12',
    slashingProtected: true,
    autoCompound: false,
    liquidityType: 'Epoch-Bound',
    lastCompoundedAt: Date.now() - 3600000 * 24 * 5
  },
  {
    id: 'stake_ada_1',
    symbol: 'ADA',
    name: 'Cardano (Ouroboros Pool)',
    stakedAmount: 1800.0,
    unclaimedRewards: 14.20,
    apy: 4.15,
    lockupDays: 0,
    validator: 'Cardano Community Pool [CB01]',
    slashingProtected: true,
    autoCompound: false,
    liquidityType: 'Liquid',
    lastCompoundedAt: Date.now() - 3600000 * 24 * 4
  },
  {
    id: 'stake_link_1',
    symbol: 'LINK',
    name: 'Chainlink v0.2 Community Vault',
    stakedAmount: 85.0,
    unclaimedRewards: 0.94,
    apy: 4.80,
    lockupDays: 14,
    validator: 'Chainlink DON Node Operator',
    slashingProtected: true,
    autoCompound: true,
    liquidityType: 'Fixed',
    lastCompoundedAt: Date.now() - 3600000 * 24 * 6
  }
];

export default function YieldOptimizationView({
  coins,
  holdings,
  usdBalance,
  onUpdateHoldings,
  onAddTransaction,
  showToast,
  onOpenTradeModal
}: YieldOptimizationViewProps) {
  // Staked Positions state (persisted to localStorage)
  const [positions, setPositions] = useState<StakedAssetPosition[]>(() => {
    const saved = localStorage.getItem('cb_staked_positions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_STAKED_POSITIONS;
  });

  // UI States
  const [isCompoundingAll, setIsCompoundingAll] = useState(false);
  const [compoundingAssetId, setCompoundingAssetId] = useState<string | null>(null);
  const [compoundSuccessMsg, setCompoundSuccessMsg] = useState<string | null>(null);
  
  // Stake/Unstake Modal State
  const [activeModal, setActiveModal] = useState<{
    type: 'stake' | 'unstake';
    position?: StakedAssetPosition;
    symbol?: string;
  } | null>(null);
  const [modalAmount, setModalAmount] = useState<string>('');
  const [isProcessingModal, setIsProcessingModal] = useState<boolean>(false);

  // Compounding Calculator State
  const [calcPrincipal, setCalcPrincipal] = useState<number>(10000);
  const [calcApy, setCalcApy] = useState<number>(6.5);
  const [calcYears, setCalcYears] = useState<number>(1);
  const [calcFrequency, setCalcFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'annually'>('daily');

  // Real-time ticking reward accrual simulation
  const [liveTick, setLiveTick] = useState<number>(0);

  useEffect(() => {
    // Save to localStorage whenever positions change
    localStorage.setItem('cb_staked_positions', JSON.stringify(positions));
  }, [positions]);

  // Periodic yield accretion simulation (ticking micro-rewards every 3 seconds for active visual feedback)
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
      setPositions((prev) =>
        prev.map((pos) => {
          // Increment rewards based on APY
          const annualReward = (pos.stakedAmount * pos.apy) / 100;
          const deltaReward = (annualReward / (365 * 24 * 3600)) * 3; // 3-second accretion
          return {
            ...pos,
            unclaimedRewards: pos.unclaimedRewards + deltaReward
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get live coin price
  const getCoinPrice = (symbol: string): number => {
    const c = coins.find((coin) => coin.symbol.toUpperCase() === symbol.toUpperCase());
    if (c && c.price > 0) return c.price;
    if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'USD') return 1.0;
    if (symbol === 'ETH') return 3480;
    if (symbol === 'SOL') return 198.5;
    if (symbol === 'POL') return 0.52;
    if (symbol === 'ADA') return 0.85;
    if (symbol === 'LINK') return 18.5;
    if (symbol === 'AVAX') return 38.2;
    return 1.0;
  };

  // Helper to get available liquid wallet balance for an asset
  const getAvailableBalance = (symbol: string): number => {
    const holding = holdings.find((h) => h.symbol.toUpperCase() === symbol.toUpperCase());
    return holding ? holding.amount : 0;
  };

  // Aggregate Metrics Calculations
  const metrics = useMemo(() => {
    let totalStakedUsd = 0;
    let totalUnclaimedRewardsUsd = 0;
    let totalWeightedApySum = 0;

    positions.forEach((pos) => {
      const price = getCoinPrice(pos.symbol);
      const stakedUsd = pos.stakedAmount * price;
      const rewardsUsd = pos.unclaimedRewards * price;

      totalStakedUsd += stakedUsd;
      totalUnclaimedRewardsUsd += rewardsUsd;
      totalWeightedApySum += stakedUsd * pos.apy;
    });

    const averageApy = totalStakedUsd > 0 ? totalWeightedApySum / totalStakedUsd : 0;
    const projectedAnnualYieldUsd = (totalStakedUsd * averageApy) / 100;

    return {
      totalStakedUsd,
      totalUnclaimedRewardsUsd,
      averageApy,
      projectedAnnualYieldUsd
    };
  }, [positions, coins, liveTick]);

  // Single-Click Compound for a specific asset position
  const handleCompoundSingle = async (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    if (!pos || pos.unclaimedRewards <= 0.000001) return;

    setCompoundingAssetId(posId);
    setCompoundSuccessMsg(null);

    try {
      const rewardToCompound = pos.unclaimedRewards;
      const price = getCoinPrice(pos.symbol);
      const rewardValueUsd = rewardToCompound * price;

      // Simulate instantaneous blockchain validation
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPositions((prev) =>
        prev.map((p) => {
          if (p.id === posId) {
            return {
              ...p,
              stakedAmount: p.stakedAmount + rewardToCompound,
              unclaimedRewards: 0,
              lastCompoundedAt: Date.now()
            };
          }
          return p;
        })
      );

      // Record transaction to ledger
      if (onAddTransaction) {
        onAddTransaction({
          id: `tx_compound_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'EARN',
          assetSymbol: pos.symbol,
          amount: rewardToCompound,
          fiatAmount: rewardValueUsd,
          timestamp: Date.now(),
          details: `Compounded ${rewardToCompound.toFixed(4)} ${pos.symbol} Staking Yield into Principal pool (${pos.apy}% APY)`,
          status: 'completed',
          ledgerDebit: `Staked Asset Vault (${pos.symbol})`,
          ledgerCredit: `Yield Reward Accrual (${pos.symbol})`
        });
      }

      const msg = `Successfully compounded +${rewardToCompound.toFixed(4)} ${pos.symbol} ($${rewardValueUsd.toFixed(2)} USD)! Compounded APY Gained: +${pos.apy.toFixed(2)}% APY active on reinvested principal.`;
      setCompoundSuccessMsg(msg);
      if (showToast) showToast(msg, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Compounding error: ${err.message}`, 'error');
    } finally {
      setCompoundingAssetId(null);
    }
  };

  // Single-Click Global "Compound All Rewards"
  const handleCompoundAll = async () => {
    if (metrics.totalUnclaimedRewardsUsd <= 0.01) {
      if (showToast) showToast('No pending rewards to compound at this time.', 'info');
      return;
    }

    setIsCompoundingAll(true);
    setCompoundSuccessMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      let totalCompoundedCount = 0;
      let totalCompoundedUsd = 0;

      const updatedPositions = positions.map((pos) => {
        if (pos.unclaimedRewards > 0.00001) {
          const reward = pos.unclaimedRewards;
          const price = getCoinPrice(pos.symbol);
          const usdVal = reward * price;

          totalCompoundedCount += 1;
          totalCompoundedUsd += usdVal;

          if (onAddTransaction) {
            onAddTransaction({
              id: `tx_compound_all_${Date.now()}_${pos.symbol}`,
              type: 'EARN',
              assetSymbol: pos.symbol,
              amount: reward,
              fiatAmount: usdVal,
              timestamp: Date.now(),
              details: `Batch Compounded ${reward.toFixed(4)} ${pos.symbol} ($${usdVal.toFixed(2)}) Staking Yield (${pos.apy}% APY)`,
              status: 'completed'
            });
          }

          return {
            ...pos,
            stakedAmount: pos.stakedAmount + reward,
            unclaimedRewards: 0,
            lastCompoundedAt: Date.now()
          };
        }
        return pos;
      });

      setPositions(updatedPositions);

      const successNotice = `Batch compounded rewards across ${totalCompoundedCount} staked assets ($${totalCompoundedUsd.toFixed(2)} USD reinvested)! Compounded APY Gained: +${metrics.averageApy.toFixed(2)}% Weighted Portfolio APY.`;
      setCompoundSuccessMsg(successNotice);
      if (showToast) showToast(successNotice, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Batch compounding failed: ${err.message}`, 'error');
    } finally {
      setIsCompoundingAll(false);
    }
  };

  // Toggle Auto-Compound for a specific position
  const handleToggleAutoCompound = (posId: string) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id === posId) {
          const updated = !p.autoCompound;
          if (showToast) {
            showToast(
              `${p.symbol} Auto-Compound is now ${updated ? 'ENABLED (Gasless Daily Auto-Stake)' : 'DISABLED (Manual)'}`,
              'info'
            );
          }
          return { ...p, autoCompound: updated };
        }
        return p;
      })
    );
  };

  // Handle Stake Additional Amount
  const handleExecuteStakeOrUnstake = async () => {
    if (!activeModal) return;
    const amountNum = parseFloat(modalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (showToast) showToast('Please enter a valid positive numeric amount.', 'error');
      return;
    }

    setIsProcessingModal(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (activeModal.type === 'stake') {
        const symbol = activeModal.position?.symbol || activeModal.symbol || 'ETH';
        const avail = getAvailableBalance(symbol);

        if (amountNum > avail && symbol !== 'USDC') {
          throw new Error(`Insufficient wallet balance (${avail.toFixed(4)} ${symbol} available).`);
        }

        // Deduct from holdings
        if (onUpdateHoldings) {
          const updatedHoldings = holdings.map((h) => {
            if (h.symbol.toUpperCase() === symbol.toUpperCase()) {
              return { ...h, amount: Math.max(0, h.amount - amountNum) };
            }
            return h;
          });
          onUpdateHoldings(updatedHoldings);
        }

        // Add or update staked position
        setPositions((prev) => {
          const existing = prev.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
          if (existing) {
            return prev.map((p) =>
              p.symbol.toUpperCase() === symbol.toUpperCase()
                ? { ...p, stakedAmount: p.stakedAmount + amountNum }
                : p
            );
          } else {
            const coin = coins.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
            return [
              ...prev,
              {
                id: `stake_${symbol.toLowerCase()}_${Date.now()}`,
                symbol,
                name: coin?.name || symbol,
                stakedAmount: amountNum,
                unclaimedRewards: 0,
                apy: 5.5,
                lockupDays: 0,
                validator: 'Coinbase Sovereign Validator Node',
                slashingProtected: true,
                autoCompound: true,
                liquidityType: 'Liquid',
                lastCompoundedAt: Date.now()
              }
            ];
          }
        });

        if (onAddTransaction) {
          const price = getCoinPrice(symbol);
          onAddTransaction({
            id: `tx_stake_${Date.now()}`,
            type: 'SEND',
            assetSymbol: symbol,
            amount: amountNum,
            fiatAmount: amountNum * price,
            timestamp: Date.now(),
            details: `Staked ${amountNum.toFixed(4)} ${symbol} into Sovereign Yield Vault`,
            status: 'completed'
          });
        }

        const msg = `Successfully staked ${amountNum.toFixed(4)} ${symbol}! Earning live APY.`;
        if (showToast) showToast(msg, 'success');
      } else if (activeModal.type === 'unstake' && activeModal.position) {
        const pos = activeModal.position;
        if (amountNum > pos.stakedAmount) {
          throw new Error(`Cannot unstake more than currently staked balance (${pos.stakedAmount.toFixed(4)} ${pos.symbol}).`);
        }

        // Update staked positions
        setPositions((prev) =>
          prev
            .map((p) => {
              if (p.id === pos.id) {
                return {
                  ...p,
                  stakedAmount: p.stakedAmount - amountNum
                };
              }
              return p;
            })
            .filter((p) => p.stakedAmount > 0.00001 || p.unclaimedRewards > 0.00001)
        );

        // Add back to liquid holdings
        if (onUpdateHoldings) {
          const existingHolding = holdings.find((h) => h.symbol.toUpperCase() === pos.symbol.toUpperCase());
          if (existingHolding) {
            onUpdateHoldings(
              holdings.map((h) =>
                h.symbol.toUpperCase() === pos.symbol.toUpperCase()
                  ? { ...h, amount: h.amount + amountNum }
                  : h
              )
            );
          } else {
            onUpdateHoldings([
              ...holdings,
              { symbol: pos.symbol, amount: amountNum, avgBuyPrice: getCoinPrice(pos.symbol) }
            ]);
          }
        }

        if (onAddTransaction) {
          const price = getCoinPrice(pos.symbol);
          onAddTransaction({
            id: `tx_unstake_${Date.now()}`,
            type: 'RECEIVE',
            assetSymbol: pos.symbol,
            amount: amountNum,
            fiatAmount: amountNum * price,
            timestamp: Date.now(),
            details: `Unstaked ${amountNum.toFixed(4)} ${pos.symbol} returned to Spot Wallet`,
            status: 'completed'
          });
        }

        const msg = `Successfully unstaked ${amountNum.toFixed(4)} ${pos.symbol} back to your wallet!`;
        if (showToast) showToast(msg, 'success');
      }

      setActiveModal(null);
      setModalAmount('');
    } catch (err: any) {
      if (showToast) showToast(`Operation failed: ${err.message}`, 'error');
    } finally {
      setIsProcessingModal(false);
    }
  };

  // Compound Calculator calculations
  const calculatorResults = useMemo(() => {
    const periodsPerYear =
      calcFrequency === 'daily'
        ? 365
        : calcFrequency === 'weekly'
        ? 52
        : calcFrequency === 'monthly'
        ? 12
        : 1;

    const r = calcApy / 100;
    const n = periodsPerYear;
    const t = calcYears;

    // Compound interest formula: A = P(1 + r/n)^(nt)
    const futureValue = calcPrincipal * Math.pow(1 + r / n, n * t);
    const totalYieldEarned = futureValue - calcPrincipal;
    const simpleInterestYield = calcPrincipal * r * t;
    const compoundBonus = Math.max(0, totalYieldEarned - simpleInterestYield);
    const effectiveApy = (Math.pow(1 + r / n, n) - 1) * 100;

    return {
      futureValue,
      totalYieldEarned,
      simpleInterestYield,
      compoundBonus,
      effectiveApy
    };
  }, [calcPrincipal, calcApy, calcYears, calcFrequency]);

  // List of other eligible coins available to stake
  const eligibleCoinsToStake = useMemo(() => {
    const currentSymbols = new Set(positions.map((p) => p.symbol.toUpperCase()));
    return [
      { symbol: 'AVAX', name: 'Avalanche', apy: 8.1, validator: 'Avalanche Primary Subnet', lockup: '14 Days' },
      { symbol: 'DOT', name: 'Polkadot', apy: 11.8, validator: 'Polkadot Relay Validator', lockup: '28 Days' },
      { symbol: 'ATOM', name: 'Cosmos Hub', apy: 13.5, validator: 'Cosmos Interchain Validator', lockup: '21 Days' },
      { symbol: 'SUI', name: 'Sui Network', apy: 6.2, validator: 'Mysten Labs Foundation Node', lockup: 'Liquid' },
      { symbol: 'NEAR', name: 'NEAR Protocol', apy: 9.4, validator: 'NEAR Validator Collective', lockup: '2 Days' }
    ].filter((c) => !currentSymbols.has(c.symbol));
  }, [positions]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12" id="yield-optimization-view">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-black rounded-full border border-blue-400/30 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Institutional Proof-of-Stake Staking
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Yield Optimization & Auto-Compounding
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Earn maximum passive returns on your digital assets through verified validator staking.
              Reinvest accrued yields with single-click compounding or enable gasless auto-restaking.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Slashing Guarantee
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-Validator Redundancy
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real-time Epoch Accruals
              </span>
            </div>
          </div>

          {/* Master 1-Click Compound All Action Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-stretch justify-between gap-4 shrink-0 min-w-[280px]">
            <div>
              <div className="text-[11px] text-blue-200 font-bold uppercase tracking-wider">
                Unclaimed Staking Rewards
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-0.5 flex items-baseline gap-1">
                <span>+${metrics.totalUnclaimedRewardsUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs text-slate-400 font-sans font-normal">USD</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-300 animate-spin" />
                <span>Live Accrual (Epoch in progress)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompoundAll}
              disabled={isCompoundingAll || metrics.totalUnclaimedRewardsUsd <= 0.01}
              className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              id="compound-all-rewards-btn"
            >
              {isCompoundingAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
              <span>{isCompoundingAll ? 'Compounding All...' : 'Compound All Rewards'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {compoundSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{compoundSuccessMsg}</span>
          </div>
          <button
            onClick={() => setCompoundSuccessMsg(null)}
            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staked */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Value Staked</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 font-mono">
              ${metrics.totalStakedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Across {positions.length} active validator pools</p>
          </div>
        </div>

        {/* Effective Portfolio APY */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weighted APY</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {metrics.averageApy.toFixed(2)}% <span className="text-xs font-sans text-gray-500 font-semibold">APY</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Daily auto-compounded yield rate</p>
          </div>
        </div>

        {/* Projected Annual Earnings */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Est. Annual Return</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-600 font-mono">
              +${metrics.projectedAnnualYieldUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">+${(metrics.projectedAnnualYieldUsd / 12).toFixed(2)} USD / month</p>
          </div>
        </div>

        {/* Validator Health */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Validator Uptime</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 font-mono flex items-center gap-1.5">
              <span>99.98%</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Zero slashing penalties recorded</p>
          </div>
        </div>
      </div>

      {/* D3-Powered Historical Growth vs Benchmark Indices Chart */}
      <StakedYieldD3Chart
        portfolioApy={metrics.averageApy}
        totalStakedUsd={metrics.totalStakedUsd}
      />

      {/* Main Section: Active Staked Positions Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Your Staked Assets & Live APYs</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                {positions.length} Active Positions
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Click &quot;Compound&quot; on any asset to reinvest accumulated rewards back into the staking principal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal({ type: 'stake', symbol: 'ETH' })}
              className="px-4 py-2 bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Stake New Asset</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-wider bg-gray-50/50">
                <th className="px-6 py-4">Staked Asset</th>
                <th className="px-6 py-4 text-right">Staked Balance</th>
                <th className="px-6 py-4 text-right">Current APY</th>
                <th className="px-6 py-4 text-right">Unclaimed Rewards</th>
                <th className="px-6 py-4 text-center">Auto-Compound</th>
                <th className="px-6 py-4 text-center">Unbonding</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {positions.map((pos) => {
                const coinPrice = getCoinPrice(pos.symbol);
                const stakedValueUsd = pos.stakedAmount * coinPrice;
                const rewardsValueUsd = pos.unclaimedRewards * coinPrice;
                const isCompoundingThis = compoundingAssetId === pos.id;

                return (
                  <tr key={pos.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Staked Asset Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs font-mono shadow-xs">
                          {pos.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{pos.name}</div>
                          <div className="text-xs text-gray-400 font-mono flex items-center gap-1">
                            <span>{pos.symbol}</span>
                            <span>•</span>
                            <span className="text-[11px] truncate max-w-[140px]" title={pos.validator}>
                              {pos.validator}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Staked Balance */}
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-gray-900 font-mono">
                        {pos.stakedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {pos.symbol}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        ${stakedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Current APY */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pos.apy.toFixed(2)}% APY
                      </div>
                    </td>

                    {/* Unclaimed Rewards */}
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-emerald-600 font-mono">
                        +{pos.unclaimedRewards.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {pos.symbol}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        +${rewardsValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                    </td>

                    {/* Auto-Compound Toggle */}
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAutoCompound(pos.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                          pos.autoCompound
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Toggle Gasless Auto-Compound"
                      >
                        <RefreshCw className={`w-3 h-3 ${pos.autoCompound ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span>{pos.autoCompound ? 'Auto (Daily)' : 'Manual'}</span>
                      </button>
                    </td>

                    {/* Unbonding Term */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {pos.lockupDays === 0 ? 'Instant' : `${pos.lockupDays} Days`}
                      </span>
                    </td>

                    {/* Actions: Compound 1-Click + Stake/Unstake Menu */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click Compound Button */}
                        <button
                          type="button"
                          onClick={() => handleCompoundSingle(pos.id)}
                          disabled={isCompoundingThis || pos.unclaimedRewards < 0.00001}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          title="Reinvest earned rewards into staking principal"
                        >
                          {isCompoundingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                          <span>Compound</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: 'stake', position: pos, symbol: pos.symbol })}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                          title="Stake more of this asset"
                        >
                          + Stake
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal({ type: 'unstake', position: pos, symbol: pos.symbol })}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                          title="Unstake principal back to spot wallet"
                        >
                          Unstake
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compounding ROI Calculator & Projections Simulator */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Compound Yield Simulator & Projection</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Simulate the exponential growth of auto-compounded validator rewards over time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Frequency:</span>
            {(['daily', 'weekly', 'monthly', 'annually'] as const).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setCalcFrequency(freq)}
                className={`px-3 py-1 text-xs font-bold rounded-xl capitalize transition cursor-pointer ${
                  calcFrequency === freq
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          {/* Controls */}
          <div className="space-y-5 lg:col-span-1">
            {/* Principal Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Principal Amount</span>
                <span className="text-indigo-600 font-mono">${calcPrincipal.toLocaleString()} USD</span>
              </div>
              <input
                type="range"
                min="500"
                max="100000"
                step="500"
                value={calcPrincipal}
                onChange={(e) => setCalcPrincipal(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* APY Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Staking APY</span>
                <span className="text-emerald-600 font-mono">{calcApy.toFixed(1)}% APY</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.5"
                value={calcApy}
                onChange={(e) => setCalcApy(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Timeframe Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Time Horizon</span>
                <span className="text-blue-600 font-mono">{calcYears} {calcYears === 1 ? 'Year' : 'Years'}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={calcYears}
                onChange={(e) => setCalcYears(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Projected Portfolio</span>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                  ${calculatorResults.futureValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Principal + Compounded Yield</p>
              </div>

              <div>
                <span className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Total Staking Yield</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                  +${calculatorResults.totalYieldEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-emerald-300/70 mt-0.5">
                  +{((calculatorResults.totalYieldEarned / calcPrincipal) * 100).toFixed(1)}% total ROI
                </p>
              </div>

              <div>
                <span className="text-xs text-blue-300 uppercase font-bold tracking-wider">Compounding Advantage</span>
                <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono mt-1">
                  +${calculatorResults.compoundBonus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-blue-200/70 mt-0.5">Extra yield vs. Simple APR</p>
              </div>
            </div>

            {/* Visual ratio bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-slate-300">Initial Principal: ${(calcPrincipal).toLocaleString()}</span>
                <span className="text-emerald-400">Total Returns: +${calculatorResults.totalYieldEarned.toFixed(2)}</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${(calcPrincipal / calculatorResults.futureValue) * 100}%`
                  }}
                  className="bg-blue-500 h-full"
                  title="Principal"
                />
                <div
                  style={{
                    width: `${(calculatorResults.totalYieldEarned / calculatorResults.futureValue) * 100}%`
                  }}
                  className="bg-emerald-500 h-full"
                  title="Earned Compound Yield"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Eligible Staking Opportunities */}
      {eligibleCoinsToStake.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Explore Additional Staking Yields</h3>
            <p className="text-xs text-gray-500">Discover vetted proof-of-stake protocols ready for delegation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleCoinsToStake.map((item) => (
              <div
                key={item.symbol}
                className="p-4 border border-gray-100 hover:border-gray-200 rounded-2xl flex items-center justify-between gap-3 bg-gray-50/50 hover:bg-white transition shadow-2xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center font-mono">
                    {item.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-emerald-600 font-bold">{item.apy}% APY • {item.lockup}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal({ type: 'stake', symbol: item.symbol })}
                  className="px-3 py-1.5 bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Stake
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stake / Unstake Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  {activeModal.type === 'stake' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 capitalize">
                    {activeModal.type === 'stake' ? 'Stake' : 'Unstake'} {activeModal.symbol}
                  </h3>
                  <span className="text-xs text-gray-400">Institutional Staking Contract</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setModalAmount('');
                }}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
                  <span>Amount to {activeModal.type}</span>
                  <span>
                    Available:{' '}
                    <strong className="text-gray-900">
                      {activeModal.type === 'stake'
                        ? `${getAvailableBalance(activeModal.symbol || 'ETH').toFixed(4)} ${activeModal.symbol}`
                        : `${(activeModal.position?.stakedAmount || 0).toFixed(4)} ${activeModal.symbol}`}
                    </strong>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const maxVal =
                        activeModal.type === 'stake'
                          ? getAvailableBalance(activeModal.symbol || 'ETH')
                          : activeModal.position?.stakedAmount || 0;
                      setModalAmount(maxVal.toString());
                    }}
                    className="absolute right-3 top-3 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Staking Summary Card */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Current APY Rate</span>
                  <span className="font-bold text-emerald-600">
                    {activeModal.position?.apy || 5.5}% APY
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Slashing Coverage</span>
                  <span className="font-bold text-gray-900">100% Insured</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Reward Distribution</span>
                  <span className="font-bold text-gray-900">Continuous Real-Time</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteStakeOrUnstake}
                disabled={isProcessingModal || !modalAmount || parseFloat(modalAmount) <= 0}
                className="w-full py-3.5 bg-[#0052FF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessingModal ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  {isProcessingModal
                    ? 'Broadcasting to Staking Contract...'
                    : `Confirm ${activeModal.type === 'stake' ? 'Staking' : 'Unstaking'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
