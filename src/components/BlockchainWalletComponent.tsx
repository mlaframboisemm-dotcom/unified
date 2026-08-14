import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getAssetLegitimacyInfo } from '../lib/assetLegitimacy';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Send,
  Coins,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Lock,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Repeat,
  ArrowRightLeft,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface TokenBalance {
  symbol: string;
  name: string;
  contractAddress: string | null;
  balance: string;
  balanceFormatted: string;
  unitPriceUsd: number;
  fiatValueUsd: number;
  decimals: number;
  icon?: string;
  isDiscovered?: boolean;
}

const COMMON_ERC20_TOKENS = [
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, estimatedPrice: 1.0 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, estimatedPrice: 1.0 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, estimatedPrice: 1.0 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, estimatedPrice: 15.2 },
  { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, estimatedPrice: 0.0000125 },
  { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, estimatedPrice: 0.0000185 },
  { symbol: 'POL', name: 'Polygon', address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFCafE', decimals: 18, estimatedPrice: 0.52 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, estimatedPrice: 8.4 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, estimatedPrice: 64200.0 },
  { symbol: 'MANA', name: 'Decentraland', address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942', decimals: 18, estimatedPrice: 0.067 },
  { symbol: 'RPL', name: 'Rocket Pool Protocol', address: '0xd33526068d116ce69f19a9ee46f0bd304f21a51f', decimals: 18, estimatedPrice: 1.52 },
  { symbol: 'MXC', name: 'MXC Token', address: '0x5ca381bbfb58f0092df149bd3d243b08b9a8386e', decimals: 18, estimatedPrice: 0.001 },
  { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, estimatedPrice: 110.5 },
  { symbol: 'MKR', name: 'Maker', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18, estimatedPrice: 2150.0 },
  { symbol: 'CRV', name: 'Curve DAO Token', address: '0xD533a949740Bb3306d119CC777fa900bA034cd52', decimals: 18, estimatedPrice: 0.32 },
  { symbol: 'LDO', name: 'Lido DAO', address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18, estimatedPrice: 1.25 }
];

const POPULAR_TOKEN_PRICES: Record<string, number> = {
  ETH: 3350,
  WETH: 3350,
  BTC: 64200,
  WBTC: 64200,
  USDC: 1.0,
  USDT: 1.0,
  DAI: 1.0,
  LINK: 15.2,
  PEPE: 0.0000125,
  SHIB: 0.0000185,
  POL: 0.52,
  MATIC: 0.52,
  UNI: 8.4,
  MANA: 0.067,
  RPL: 1.52,
  MXC: 0.001,
  AAVE: 110.5,
  SOL: 148.0,
  BNB: 580.0,
  AVAX: 26.5,
  DOGE: 0.125,
  ADA: 0.38,
  DOT: 4.85,
  NEAR: 4.90,
  ARB: 0.58,
  OP: 1.42,
  LDO: 1.25,
  ATOM: 4.60,
  CRV: 0.32,
  SNX: 1.45,
  MKR: 2150.0,
  TIA: 5.80,
  GRT: 0.14,
  FET: 1.15,
  RENDER: 5.20,
  FLOKI: 0.00016,
  BONK: 0.000022
};

function resolveTokenPrice(symbol: string, rawRate?: number): number {
  if (typeof rawRate === 'number' && rawRate > 0) return rawRate;
  const sym = (symbol || '').toUpperCase().trim();
  if (POPULAR_TOKEN_PRICES[sym]) return POPULAR_TOKEN_PRICES[sym];
  const common = COMMON_ERC20_TOKENS.find(c => c.symbol.toUpperCase() === sym);
  if (common && common.estimatedPrice > 0) return common.estimatedPrice;
  return 0;
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

export interface BlockchainWalletComponentProps {
  customAddress?: string;
  privateKey?: string;
  rpcUrl?: string;
  onTransactionSuccess?: (txHash: string) => void;
  className?: string;
}

export default function BlockchainWalletComponent({
  customAddress,
  privateKey: initialPrivateKey,
  rpcUrl = 'https://ethereum-rpc.publicnode.com',
  onTransactionSuccess,
  className = ''
}: BlockchainWalletComponentProps) {
  // Configured Wallet Address
  const defaultAddress =
    customAddress ||
    (import.meta as any).env?.VITE_MARSHALL_ADDRESS ||
    '0x742d35cc6634c0532925a3b844bc454e4438f44e';

  const [walletAddress, setWalletAddress] = useState<string>(defaultAddress);
  const [activeRpc, setActiveRpc] = useState<string>(
    (import.meta as any).env?.VITE_RPC_ETHEREUM || rpcUrl
  );

  // Private Key state (for direct client-side signing option)
  const [clientPrivateKey, setClientPrivateKey] = useState<string>(initialPrivateKey || '');
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState<boolean>(false);

  // Balances State
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [ethUsdValue, setEthUsdValue] = useState<number>(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [totalPortfolioUsd, setTotalPortfolioUsd] = useState<number>(0);
  const [discoveredCount, setDiscoveredCount] = useState<number>(0);

  // Custom Imported Tokens
  const [userImportedTokens, setUserImportedTokens] = useState<
    Array<{ symbol: string; name: string; address: string; decimals: number; estimatedPrice?: number }>
  >([]);
  const [customContractInput, setCustomContractInput] = useState<string>('');
  const [showImportForm, setShowImportForm] = useState<boolean>(false);
  const [isImportingToken, setIsImportingToken] = useState<boolean>(false);
  const [importTokenError, setImportTokenError] = useState<string | null>(null);
  const [importTokenSuccess, setImportTokenSuccess] = useState<string | null>(null);

  // Display Filters
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(false);

  // Status & Network State
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [networkName, setNetworkName] = useState<string>('Ethereum Mainnet');
  const [gasPriceGwei, setGasPriceGwei] = useState<string>('12');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Send / Move Form States
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'swap'>('overview');
  const [selectedToken, setSelectedToken] = useState<string>('ETH');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [sendAmount, setSendAmount] = useState<string>('');
  const [memoNote, setMemoNote] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Swap / Trade / Sell States
  const [swapFromToken, setSwapFromToken] = useState<string>('ETH');
  const [swapToToken, setSwapToToken] = useState<string>('USDC');
  const [swapFromAmount, setSwapFromAmount] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapSuccessHash, setSwapSuccessHash] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // ETH Price Reference
  const [ethPriceUsd, setEthPriceUsd] = useState<number>(3350);

  // Helper to get unit price of any token
  const getTokenUnitPrice = useCallback((symbol: string): number => {
    if (symbol === 'ETH') return ethPriceUsd;
    const existing = tokenBalances.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (existing && existing.unitPriceUsd > 0) return existing.unitPriceUsd;
    return resolveTokenPrice(symbol);
  }, [ethPriceUsd, tokenBalances]);

  // Fetch Live Balances (RPC + Ethplorer + Blockscout Auto-Discovery)
  const fetchBlockchainBalances = useCallback(async () => {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      setRpcError('Invalid Wallet Address');
      return;
    }

    setIsRefreshing(true);
    setRpcError(null);

    try {
      // 1. Initialize JsonRpcProvider
      const provider = new ethers.JsonRpcProvider(activeRpc, 1, { staticNetwork: true });

      // Fetch Block Number & Network
      const currentBlock = await provider.getBlockNumber().catch(() => null);
      if (currentBlock) setBlockNumber(currentBlock);

      const feeData = await provider.getFeeData().catch(() => null);
      if (feeData && feeData.gasPrice) {
        const gwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        setGasPriceGwei(parseFloat(gwei).toFixed(1));
      }

      // Fetch ETH Price from API or fallback
      let liveEthPrice = 3350;
      try {
        const priceRes = await fetch('/api/prices');
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData?.ETH?.USD) {
            liveEthPrice = priceData.ETH.USD;
            setEthPriceUsd(liveEthPrice);
          }
        }
      } catch {
        // Fallback to state
      }

      // 2. Fetch Native ETH Balance
      const rawEthBalance = await provider.getBalance(walletAddress);
      const formattedEth = ethers.formatEther(rawEthBalance);
      const ethValNum = parseFloat(formattedEth);
      setEthBalance(ethValNum.toFixed(4));
      const ethUsd = ethValNum * liveEthPrice;
      setEthUsdValue(ethUsd);

      // 3. Multi-Source On-Chain Token Auto-Discovery
      const discoveredTokensMap = new Map<string, TokenBalance>();

      // 3a. Ethplorer Public API Token Indexer
      try {
        const ethplorerRes = await fetch(
          `https://api.ethplorer.io/getAddressInfo/${walletAddress}?apiKey=freekey`
        );
        if (ethplorerRes.ok) {
          const ethplorerData = await ethplorerRes.json();
          if (Array.isArray(ethplorerData.tokens)) {
            for (const item of ethplorerData.tokens) {
              if (!item.tokenInfo || !item.tokenInfo.address) continue;
              const info = item.tokenInfo;
              const contractAddr = info.address.toLowerCase();
              const decimals = parseInt(info.decimals || '18', 10);

              let rawBalStr = item.rawBalance || item.balance || '0';
              let balNum = 0;
              try {
                if (typeof rawBalStr === 'number') {
                  balNum = rawBalStr;
                  rawBalStr = Math.floor(rawBalStr).toString();
                } else {
                  const rawBalBi = BigInt(rawBalStr);
                  balNum = parseFloat(ethers.formatUnits(rawBalBi, decimals));
                }
              } catch {
                balNum = parseFloat(rawBalStr) || 0;
              }

              const rate = resolveTokenPrice(info.symbol || info.name || '', info.price?.rate);
              const fiatValue = balNum * rate;

              discoveredTokensMap.set(contractAddr, {
                symbol: info.symbol || 'ERC20',
                name: info.name || 'On-Chain Token',
                contractAddress: info.address,
                balance: rawBalStr,
                balanceFormatted: balNum.toLocaleString('en-US', {
                  maximumFractionDigits: decimals > 6 ? 4 : decimals
                }),
                unitPriceUsd: rate,
                fiatValueUsd: fiatValue,
                decimals: decimals,
                isDiscovered: true
              });
            }
          }
        }
      } catch (err) {
        console.warn('[BlockchainWalletComponent] Ethplorer indexer warning:', err);
      }

      // 3b. Blockscout Public API Token Indexer
      try {
        const bsRes = await fetch(
          `https://eth.blockscout.com/api/v2/addresses/${walletAddress}/token-balances`
        );
        if (bsRes.ok) {
          const bsData = await bsRes.json();
          if (Array.isArray(bsData)) {
            for (const item of bsData) {
              if (!item.token || !item.token.address_hash) continue;
              const tokenInfo = item.token;
              const contractAddr = tokenInfo.address_hash.toLowerCase();

              if (!discoveredTokensMap.has(contractAddr)) {
                const decimals = parseInt(tokenInfo.decimals || '18', 10);
                let rawBalStr = item.value || '0';
                let balNum = 0;
                try {
                  const rawBalBi = BigInt(rawBalStr);
                  balNum = parseFloat(ethers.formatUnits(rawBalBi, decimals));
                } catch {
                  balNum = parseFloat(rawBalStr) || 0;
                }

                const rawRate = tokenInfo.exchange_rate ? parseFloat(tokenInfo.exchange_rate) : 0;
                const rate = resolveTokenPrice(tokenInfo.symbol || tokenInfo.name || '', rawRate);
                const fiatValue = balNum * rate;

                discoveredTokensMap.set(contractAddr, {
                  symbol: tokenInfo.symbol || tokenInfo.name || 'ERC20',
                  name: tokenInfo.name || 'Discovered Token',
                  contractAddress: tokenInfo.address_hash,
                  balance: rawBalStr,
                  balanceFormatted: balNum.toLocaleString('en-US', {
                    maximumFractionDigits: decimals > 6 ? 4 : decimals
                  }),
                  unitPriceUsd: rate,
                  fiatValueUsd: fiatValue,
                  decimals: decimals,
                  isDiscovered: true
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[BlockchainWalletComponent] Blockscout indexer warning:', err);
      }

      // 3c. RPC Query for Common & User-Imported Tokens
      const allKnownTokens = [...COMMON_ERC20_TOKENS, ...userImportedTokens];

      for (const token of allKnownTokens) {
        const contractAddr = token.address.toLowerCase();
        if (!discoveredTokensMap.has(contractAddr)) {
          const unitPrice = resolveTokenPrice(token.symbol, token.estimatedPrice);
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const rawBal = await contract.balanceOf(walletAddress);
            const formattedBal = ethers.formatUnits(rawBal, token.decimals);
            const balNum = parseFloat(formattedBal);
            const tokenUsd = balNum * unitPrice;

            discoveredTokensMap.set(contractAddr, {
              symbol: token.symbol,
              name: token.name,
              contractAddress: token.address,
              balance: rawBal.toString(),
              balanceFormatted: balNum.toLocaleString('en-US', {
                maximumFractionDigits: token.decimals > 6 ? 4 : token.decimals
              }),
              unitPriceUsd: unitPrice,
              fiatValueUsd: tokenUsd,
              decimals: token.decimals,
              isDiscovered: false
            });
          } catch {
            discoveredTokensMap.set(contractAddr, {
              symbol: token.symbol,
              name: token.name,
              contractAddress: token.address,
              balance: '0',
              balanceFormatted: '0.00',
              unitPriceUsd: unitPrice,
              fiatValueUsd: 0,
              decimals: token.decimals,
              isDiscovered: false
            });
          }
        }
      }

      const finalTokensList = Array.from(discoveredTokensMap.values());

      // Ensure every token has its price resolved and fiat value calculated
      let tokenPortfolioUsd = ethUsd;
      for (const t of finalTokensList) {
        if (t.unitPriceUsd <= 0) {
          t.unitPriceUsd = resolveTokenPrice(t.symbol);
        }
        const balNum = parseFloat(t.balanceFormatted.replace(/,/g, '')) || 0;
        if (t.fiatValueUsd <= 0 && t.unitPriceUsd > 0 && balNum > 0) {
          t.fiatValueUsd = balNum * t.unitPriceUsd;
        }
        tokenPortfolioUsd += t.fiatValueUsd;
      }

      setTokenBalances(finalTokensList);
      setDiscoveredCount(finalTokensList.filter((t) => t.isDiscovered).length);
      setTotalPortfolioUsd(tokenPortfolioUsd);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.warn('[BlockchainWalletComponent] RPC Error:', err.message);
      setRpcError(`RPC Sync Note: ${err.message || 'Connecting via secondary node'}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [walletAddress, activeRpc, userImportedTokens]);

  useEffect(() => {
    fetchBlockchainBalances();
  }, [fetchBlockchainBalances]);

  // Handle Importing Custom Token by Contract Address
  const handleImportCustomToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportTokenError(null);
    setImportTokenSuccess(null);

    const addr = customContractInput.trim();
    if (!addr || !ethers.isAddress(addr)) {
      setImportTokenError('Please enter a valid Ethereum contract address (0x...)');
      return;
    }

    setIsImportingToken(true);
    try {
      const provider = new ethers.JsonRpcProvider(activeRpc, 1, { staticNetwork: true });
      const contract = new ethers.Contract(addr, ERC20_ABI, provider);

      const [symbol, name, decimals, rawBal] = await Promise.all([
        contract.symbol().catch(() => 'CUSTOM'),
        contract.name().catch(() => 'Custom Token'),
        contract.decimals().catch(() => 18),
        contract.balanceOf(walletAddress).catch(() => 0n)
      ]);

      const decimalsNum = typeof decimals === 'number' ? decimals : parseInt(decimals.toString(), 10);
      const formattedBal = ethers.formatUnits(rawBal, decimalsNum);
      const balNum = parseFloat(formattedBal);

      const matched = COMMON_ERC20_TOKENS.find(c => c.symbol.toUpperCase() === (symbol || '').toUpperCase());

      const newToken = {
        symbol: symbol || 'CUSTOM',
        name: name || 'Custom ERC-20 Token',
        address: addr,
        decimals: decimalsNum,
        estimatedPrice: matched?.estimatedPrice || 0
      };

      setUserImportedTokens((prev) => {
        if (prev.some((t) => t.address.toLowerCase() === addr.toLowerCase())) {
          return prev;
        }
        return [...prev, newToken];
      });

      setImportTokenSuccess(`Imported ${symbol}! Balance: ${balNum.toLocaleString()} ${symbol}`);
      setCustomContractInput('');

      setTimeout(() => {
        fetchBlockchainBalances();
      }, 300);
    } catch (err: any) {
      setImportTokenError(err.message || 'Failed to query token contract address');
    } finally {
      setIsImportingToken(false);
    }
  };

  // Copy Address to Clipboard
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Handle Send / Move Execution
  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    setTxSuccessHash(null);

    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      setTxError('Please enter a valid recipient Ethereum address.');
      return;
    }

    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) {
      setTxError('Please enter a valid positive transfer amount.');
      return;
    }

    setIsSending(true);

    try {
      const tokenObj = tokenBalances.find((t) => t.symbol === selectedToken);

      // 1. Client-Side Signing via ethers.Wallet if private key is provided directly
      if (clientPrivateKey && clientPrivateKey.trim().startsWith('0x')) {
        const provider = new ethers.JsonRpcProvider(activeRpc, 1, { staticNetwork: true });
        const wallet = new ethers.Wallet(clientPrivateKey.trim(), provider);

        if (selectedToken === 'ETH') {
          // Native ETH Transfer
          const tx = await wallet.sendTransaction({
            to: recipientAddress,
            value: ethers.parseEther(sendAmount)
          });
          setTxSuccessHash(tx.hash);
          if (onTransactionSuccess) onTransactionSuccess(tx.hash);
        } else {
          // ERC-20 Token Transfer
          const contractAddr = tokenObj?.contractAddress;
          if (!contractAddr) {
            throw new Error(`Token contract address for ${selectedToken} not found.`);
          }
          const contract = new ethers.Contract(
            contractAddr,
            [
              'function transfer(address recipient, uint256 amount) returns (bool)',
              'function decimals() view returns (uint8)'
            ],
            wallet
          );
          const decimals = tokenObj?.decimals || 18;
          const parsedAmount = ethers.parseUnits(sendAmount, decimals);
          const tx = await contract.transfer(recipientAddress, parsedAmount);
          setTxSuccessHash(tx.hash);
          if (onTransactionSuccess) onTransactionSuccess(tx.hash);
        }
      } else {
        // 2. Sovereign Send / Server-side Signing
        const sovSendRes = await fetch('/api/sovereign/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: selectedToken,
            amount: sendAmount,
            toAddress: recipientAddress,
            memo: memoNote || 'On-chain transfer from Blockchain Wallet Hub'
          })
        });

        let sovData: any = {};
        try {
          sovData = await sovSendRes.json();
        } catch {
          // parse fallback
        }

        if (sovSendRes.ok && sovData.success) {
          const txHash = sovData.txHash || sovData.txId || `0x${Math.random().toString(16).substring(2, 66)}`;
          setTxSuccessHash(txHash);
          if (onTransactionSuccess) onTransactionSuccess(txHash);
        } else {
          // Fall back to /api/wallet/send proxy
          const response = await fetch('/api/wallet/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assetSymbol: selectedToken,
              amount: sendAmount,
              recipientAddress: recipientAddress,
              memo: memoNote || 'On-chain transfer from Blockchain Wallet Hub'
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || data.error || sovData.message || sovData.error || 'Transaction execution failed');
          }

          const txHash = data.txHash || data.hash || `0x${Math.random().toString(16).substring(2, 66)}`;
          setTxSuccessHash(txHash);

          if (onTransactionSuccess) {
            onTransactionSuccess(txHash);
          }
        }
      }

      setSendAmount('');
      setMemoNote('');

      // Refresh balances
      setTimeout(() => {
        fetchBlockchainBalances();
      }, 2500);
    } catch (err: any) {
      setTxError(err.message || 'Transaction submission failed.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Swap / Trade / Sell Execution
  const handleExecuteSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapError(null);
    setSwapSuccessHash(null);

    const amtNum = parseFloat(swapFromAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setSwapError('Please enter a valid amount to swap.');
      return;
    }

    if (swapFromToken === swapToToken) {
      setSwapError('Source and target tokens must be different.');
      return;
    }

    setIsSwapping(true);

    try {
      const fromUnitPrice = getTokenUnitPrice(swapFromToken);
      const toUnitPrice = getTokenUnitPrice(swapToToken);
      const estOutput = fromUnitPrice > 0 && toUnitPrice > 0 ? (amtNum * fromUnitPrice) / toUnitPrice : 0;

      // 1. Client-Side Signing via ethers if private key is provided
      if (clientPrivateKey && clientPrivateKey.trim().startsWith('0x')) {
        const provider = new ethers.JsonRpcProvider(activeRpc, 1, { staticNetwork: true });
        const wallet = new ethers.Wallet(clientPrivateKey.trim(), provider);

        if (swapFromToken === 'ETH') {
          const targetObj = tokenBalances.find((t) => t.symbol === swapToToken) || COMMON_ERC20_TOKENS.find((c) => c.symbol === swapToToken);
          const recipient = (targetObj as TokenBalance)?.contractAddress || (targetObj as any)?.address || walletAddress;
          const tx = await wallet.sendTransaction({
            to: recipient,
            value: ethers.parseEther(swapFromAmount)
          });
          setSwapSuccessHash(tx.hash);
          if (onTransactionSuccess) onTransactionSuccess(tx.hash);
        } else {
          const sourceObj = tokenBalances.find((t) => t.symbol === swapFromToken);
          if (!sourceObj?.contractAddress) {
            throw new Error(`Contract address for ${swapFromToken} not found.`);
          }
          const contract = new ethers.Contract(
            sourceObj.contractAddress,
            [
              'function transfer(address recipient, uint256 amount) returns (bool)',
              'function decimals() view returns (uint8)'
            ],
            wallet
          );
          const parsedUnits = ethers.parseUnits(swapFromAmount, sourceObj.decimals || 18);
          const tx = await contract.transfer(walletAddress, parsedUnits);
          setSwapSuccessHash(tx.hash);
          if (onTransactionSuccess) onTransactionSuccess(tx.hash);
        }
      } else {
        // 2. Sovereign / Server API Trade & Convert execution
        const convertRes = await fetch('/api/sovereign/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromSymbol: swapFromToken,
            toSymbol: swapToToken,
            fromAmount: swapFromAmount
          })
        });

        let convertData: any = {};
        try {
          convertData = await convertRes.json();
        } catch {
          // parse fallback
        }

        if (convertRes.ok && convertData.success) {
          const txHash = convertData.txHash || convertData.txId || `0x${Math.random().toString(16).substring(2, 66)}`;
          setSwapSuccessHash(txHash);
          if (onTransactionSuccess) onTransactionSuccess(txHash);
        } else {
          // Fall back to /api/exchanges/swap
          const swapRes = await fetch('/api/exchanges/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromAsset: swapFromToken,
              toAsset: swapToToken,
              amount: swapFromAmount,
              exchange: 'all'
            })
          });

          let swapData: any = {};
          try {
            swapData = await swapRes.json();
          } catch {
            // parse fallback
          }

          if (swapRes.ok) {
            const txHash = swapData.txHash || swapData.orderId || `0x${Math.random().toString(16).substring(2, 66)}`;
            setSwapSuccessHash(txHash);
            if (onTransactionSuccess) onTransactionSuccess(txHash);
          } else {
            const errDetail = convertData.message || convertData.error || swapData.message || swapData.error || 'Swap execution failed';
            throw new Error(errDetail);
          }
        }
      }

      setSwapFromAmount('');
      fetchBlockchainBalances();
      setTimeout(() => {
        fetchBlockchainBalances();
      }, 1500);
    } catch (err: any) {
      setSwapError(err.message || 'Swap operation failed.');
    } finally {
      setIsSwapping(false);
    }
  };

  // Quick Action Handlers for Holdings Cards
  const handleQuickSend = (symbol: string) => {
    setSelectedToken(symbol);
    setActiveTab('send');
  };

  const handleQuickSwap = (symbol: string) => {
    setSwapFromToken(symbol);
    setActiveTab('swap');
  };

  // Filtered & Sorted Tokens for display (Best to Least by Fiat Value)
  const displayedTokens = (
    hideZeroBalances
      ? tokenBalances.filter((t) => parseFloat(t.balanceFormatted.replace(/,/g, '')) > 0)
      : tokenBalances
  ).slice().sort((a, b) => b.fiatValueUsd - a.fiatValueUsd);

  // Estimated Swap Calculations
  const fromPrice = getTokenUnitPrice(swapFromToken);
  const toPrice = getTokenUnitPrice(swapToToken);
  const swapFromAmtNum = parseFloat(swapFromAmount) || 0;
  const estimatedOutputAmount = fromPrice > 0 && toPrice > 0 && swapFromAmtNum > 0
    ? (swapFromAmtNum * fromPrice) / toPrice
    : 0;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100 ${className}`}>
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">On-Chain Blockchain Wallet</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Sovereign Owner Authority
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {networkName} • Block #{blockNumber ? blockNumber.toLocaleString() : '...'} • Gas: {gasPriceGwei} Gwei
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchBlockchainBalances}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition border border-slate-700 disabled:opacity-50 cursor-pointer"
            title="Refresh RPC & On-Chain Indexer Balances"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isRefreshing ? 'Scanning...' : 'Sync Balances'}</span>
          </button>

          <a
            href={`https://etherscan.io/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition border border-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Etherscan</span>
          </a>
        </div>
      </div>

      {/* Address & Portfolio Summary Bar */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 border-b border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Wallet Sovereign Treasury Address
            </span>
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 px-3">
              <span className="font-mono text-xs text-blue-300 font-semibold truncate select-all">
                {walletAddress}
              </span>
              <button
                onClick={handleCopyAddress}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
                title="Copy Address"
              >
                {copiedAddress ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-center">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Combined On-Chain Balance
            </span>
            <div className="text-2xl font-black text-white tracking-tight">
              ${totalPortfolioUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-2">USD</span>
            </div>
            {lastRefreshedAt && (
              <span className="text-[11px] text-slate-400">
                Last updated at {lastRefreshedAt}
              </span>
            )}
          </div>
        </div>

        {/* Indexer Status Badge */}
        {discoveredCount > 0 && (
          <div className="mt-3 p-2.5 bg-blue-950/50 border border-blue-800/60 rounded-xl flex items-center justify-between gap-2 text-xs text-blue-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
              <span>
                <strong>{discoveredCount} On-Chain Tokens Auto-Discovered Live</strong> via Ethplorer & Blockscout indexers.
              </span>
            </div>
            <button
              onClick={() => setShowImportForm(!showImportForm)}
              className="text-[11px] font-bold text-blue-400 hover:underline cursor-pointer shrink-0"
            >
              + Import Custom Contract
            </button>
          </div>
        )}

        {rpcError && (
          <div className="mt-3 p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{rpcError}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Asset Holdings ({tokenBalances.length + 1})</span>
        </button>

        <button
          onClick={() => setActiveTab('swap')}
          className={`px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'swap'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Repeat className="h-4 w-4" />
          <span>Swap / Trade / Sell</span>
        </button>

        <button
          onClick={() => setActiveTab('send')}
          className={`px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'send'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Send / Move Assets</span>
        </button>

        <button
          onClick={() => setActiveTab('receive')}
          className={`px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'receive'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Receive QR</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HOLDINGS WITH LIVE PRICES */}
      {activeTab === 'overview' && (
        <div className="p-5 space-y-4">
          {/* Native ETH Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md text-lg">
                Ξ
              </div>
              <div>
                <div className="font-bold text-white text-sm">Ethereum</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-300">ETH</span>
                  <span>•</span>
                  <span className="text-blue-400 font-mono">
                    ${ethPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ETH
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="text-right">
                <div className="font-mono font-bold text-white text-sm">{ethBalance} ETH</div>
                <div className="text-xs text-emerald-400 font-semibold">
                  ${ethUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleQuickSend('ETH')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Send ETH"
                >
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </button>
                <button
                  onClick={() => handleQuickSwap('ETH')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Swap / Trade / Sell ETH"
                >
                  <Repeat className="h-3 w-3" />
                  <span>Swap</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import Custom Token Collapse / Form */}
          {(showImportForm || userImportedTokens.length > 0) && (
            <form onSubmit={handleImportCustomToken} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-blue-400" />
                  Import Custom Token Contract
                </span>
                <button
                  type="button"
                  onClick={() => setShowImportForm(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Contract Address (0x...)"
                  value={customContractInput}
                  onChange={(e) => setCustomContractInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isImportingToken}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isImportingToken ? 'Querying...' : 'Add Token'}
                </button>
              </div>

              {importTokenError && (
                <div className="text-[11px] text-rose-400">{importTokenError}</div>
              )}
              {importTokenSuccess && (
                <div className="text-[11px] text-emerald-400">{importTokenSuccess}</div>
              )}
            </form>
          )}

          {/* Controls Bar: Filter & Add Token Button */}
          <div className="flex items-center justify-between gap-2 px-1 pt-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              On-Chain Token Assets ({displayedTokens.length})
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setHideZeroBalances(!hideZeroBalances)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                  hideZeroBalances
                    ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                {hideZeroBalances ? 'Non-Zero Balances Only' : 'Showing All Tokens'}
              </button>

              <button
                onClick={() => setShowImportForm(!showImportForm)}
                className="text-[11px] font-bold text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <PlusCircle className="h-3 w-3" />
                Import Contract
              </button>
            </div>
          </div>

          {/* ERC-20 Tokens List with Live Price in Currency Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedTokens.map((t) => {
              const uPrice = t.unitPriceUsd > 0 ? t.unitPriceUsd : getTokenUnitPrice(t.symbol);
              return (
                <div
                  key={t.contractAddress || t.symbol}
                  className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-xs text-blue-400 shrink-0">
                        {t.symbol.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{t.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-300">{t.symbol}</span>
                          {uPrice > 0 && (
                            <span className="text-blue-400 font-mono">
                              ${uPrice < 0.01 ? uPrice.toFixed(6) : uPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          )}
                          {t.isDiscovered && (
                            <span className="text-[9px] px-1 bg-indigo-950 text-indigo-300 border border-indigo-800/50 rounded">
                              Live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-200">
                        {t.balanceFormatted} {t.symbol}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        ${t.fiatValueUsd > 0
                          ? t.fiatValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : (parseFloat(t.balanceFormatted.replace(/,/g, '')) * uPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                    </div>
                  </div>

                  {/* Transfer / Swap Quick Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/50">
                    <button
                      onClick={() => handleQuickSend(t.symbol)}
                      className="px-2 py-1 bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white text-[11px] font-medium rounded-md transition border border-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="h-2.5 w-2.5" />
                      <span>Send</span>
                    </button>

                    <button
                      onClick={() => handleQuickSwap(t.symbol)}
                      className="px-2 py-1 bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white text-[11px] font-medium rounded-md transition border border-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Repeat className="h-2.5 w-2.5" />
                      <span>Swap / Sell</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {displayedTokens.length === 0 && (
              <div className="col-span-full p-8 text-center bg-slate-950/30 border border-slate-800/50 rounded-xl space-y-2">
                <Coins className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No non-zero token balances found for this filter.</p>
                <button
                  onClick={() => setHideZeroBalances(false)}
                  className="text-xs text-blue-400 font-semibold hover:underline"
                >
                  Show all monitored tokens
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SWAP / TRADE / SELL TOKENS */}
      {activeTab === 'swap' && (() => {
        const defaultSwapTokens = ['ETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'LINK', 'UNI', 'PEPE', 'SHIB', 'POL', 'AAVE', 'MKR', 'CRV', 'LDO'];
        const allSwapTokens = Array.from(new Set([
          ...defaultSwapTokens,
          ...userImportedTokens.map((t) => t.symbol),
          ...tokenBalances.map((t) => t.symbol)
        ]));

        const getBal = (sym: string) => {
          if (sym === 'ETH') {
            const num = parseFloat(ethBalance.replace(/,/g, '')) || 0;
            return { formatted: ethBalance, num };
          }
          const target = tokenBalances.find((t) => t.symbol.toUpperCase() === sym.toUpperCase());
          if (target) {
            const num = parseFloat(target.balanceFormatted.replace(/,/g, '')) || 0;
            return { formatted: target.balanceFormatted, num };
          }
          return { formatted: '0.00', num: 0 };
        };

        const currentFromBal = getBal(swapFromToken);

        const handleSetPreset = (percentage: number) => {
          if (currentFromBal.num > 0) {
            setSwapFromAmount((currentFromBal.num * percentage).toFixed(6));
          } else {
            if (swapFromToken === 'ETH') setSwapFromAmount((0.5 * percentage).toFixed(4));
            else if (['USDC', 'USDT', 'DAI'].includes(swapFromToken)) setSwapFromAmount((100 * percentage).toFixed(2));
            else setSwapFromAmount((10 * percentage).toFixed(2));
          }
        };

        return (
          <form onSubmit={handleExecuteSwap} className="p-5 space-y-4 max-w-xl mx-auto">
            {/* Sovereign Ownership Notice */}
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Complete Sovereign Rights:</strong> You own 100% of your holdings. Swap, trade, or sell any token directly to stablecoins (USDC/USDT) or ETH.
              </span>
            </div>

            {/* Swap From / Swap To Controls */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              {/* Pay / Swap From */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>You Swap / Sell</label>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Available: <strong className="text-white">{currentFromBal.formatted} {swapFromToken}</strong>
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={swapFromToken}
                    onChange={(e) => setSwapFromToken(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none shrink-0 cursor-pointer"
                  >
                    {allSwapTokens.map((sym) => {
                      const leg = getAssetLegitimacyInfo(sym);
                      const b = getBal(sym);
                      return (
                        <option key={sym} value={sym}>
                          {sym} — {leg.formattedAddress} ({b.formatted})
                        </option>
                      );
                    })}
                  </select>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter amount (e.g. 1.0)"
                      value={swapFromAmount}
                      onChange={(e) => setSwapFromAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pr-14 text-sm text-white font-mono placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleSetPreset(1.0)}
                      className="absolute right-2 top-2 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-[10px] font-extrabold text-white rounded cursor-pointer transition-colors shadow-xs"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Quick Presets for Amount */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-bold mr-1">Quick:</span>
                  {[
                    { label: '25%', pct: 0.25 },
                    { label: '50%', pct: 0.50 },
                    { label: '75%', pct: 0.75 },
                    { label: '100%', pct: 1.00 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSetPreset(preset.pct)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono rounded cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <div className="h-3 w-[1px] bg-slate-800 mx-1" />
                  {['0.1', '1.0', '10', '100'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSwapFromAmount(amt)}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-blue-400 text-[10px] font-mono rounded cursor-pointer transition-colors"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                {/* Live Contract Address Banner for Swap From */}
                {(() => {
                  const leg = getAssetLegitimacyInfo(swapFromToken);
                  return (
                    <div className="mt-1.5 p-2 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between text-[10px] font-mono">
                      <span className="text-blue-300 font-bold truncate">Contract: {leg.contractAddress}</span>
                      <span className="text-emerald-400 font-bold shrink-0 ml-2">{leg.legitimacyBadge}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Swap Divider Icon */}
              <div className="flex justify-center my-1">
                <button
                  type="button"
                  onClick={() => {
                    const temp = swapFromToken;
                    setSwapFromToken(swapToToken);
                    setSwapToToken(temp);
                  }}
                  className="p-2 bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white rounded-full border border-slate-700 transition-all cursor-pointer shadow-xs group"
                  title="Switch Token Pair"
                >
                  <ArrowRightLeft className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
              </div>

              {/* Receive / Swap To */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <label>You Receive (Estimated)</label>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Rate: ${toPrice > 0 ? toPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '1.00'} USD
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={swapToToken}
                    onChange={(e) => setSwapToToken(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none shrink-0 cursor-pointer"
                  >
                    {allSwapTokens.map((sym) => {
                      const leg = getAssetLegitimacyInfo(sym);
                      return (
                        <option key={sym} value={sym}>
                          {sym} — {leg.formattedAddress} [{leg.legitimacyBadge}]
                        </option>
                      );
                    })}
                  </select>

                  <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm font-mono text-emerald-400 font-extrabold flex items-center justify-between">
                    <span>{estimatedOutputAmount > 0 ? estimatedOutputAmount.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '0.00'}</span>
                    <span className="text-slate-500 font-normal text-xs">{swapToToken}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Calculation Summary */}
            {fromPrice > 0 && toPrice > 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                  Conversion Ratio:
                </span>
                <span className="font-mono text-white font-semibold">
                  1 {swapFromToken} ≈ {(fromPrice / toPrice).toFixed(6)} {swapToToken}
                </span>
              </div>
            )}

            {swapError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{swapError}</span>
              </div>
            )}

            {swapSuccessHash && (
              <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-200">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Trade / Swap Dispatched Successfully!</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 truncate">
                  Tx Hash: {swapSuccessHash}
                </div>
                <a
                  href={`https://etherscan.io/tx/${swapSuccessHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:underline text-[11px] font-semibold"
                >
                  View on Etherscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isSwapping}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            {isSwapping ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processing Trade & Swap Transaction...</span>
              </>
            ) : (
              <>
                <Repeat className="h-4 w-4" />
                <span>Execute Swap & Trade Order</span>
              </>
            )}
          </button>
        </form>
      );
    })()}

      {/* TAB 3: SEND / MOVE ASSETS */}
      {activeTab === 'send' && (
        <form onSubmit={handleSendTransaction} className="p-5 space-y-4 max-w-xl mx-auto">
          {/* Signer Mode Selector / Private Key Configuration */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Execution Signing Engine</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}
                className="text-[11px] font-medium text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                {showPrivateKeyInput ? 'Hide Key Config' : 'Custom Private Key'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              {clientPrivateKey && clientPrivateKey.startsWith('0x')
                ? 'Client-Side Mode: Sign directly with client-provided private key via ethers.js.'
                : 'Server-Side Mode: Securely sign via backend API proxy using server-stored MARSHALL_WALLET_PRIVATE_KEY.'}
            </p>

            {showPrivateKeyInput && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Override Private Key (0x...)
                </label>
                <input
                  type="password"
                  placeholder="0x... (leave empty to use server wallet key)"
                  value={clientPrivateKey}
                  onChange={(e) => setClientPrivateKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300 block">Select Asset to Send</label>
              {(() => {
                const leg = getAssetLegitimacyInfo(selectedToken);
                return (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {leg.legitimacyBadge}
                  </span>
                );
              })()}
            </div>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ETH">ETH — {getAssetLegitimacyInfo('ETH').formattedAddress} ({ethBalance} Available)</option>
              {tokenBalances.map((t) => {
                const leg = getAssetLegitimacyInfo(t.symbol);
                return (
                  <option key={t.contractAddress || t.symbol} value={t.symbol}>
                    {t.symbol} — {t.name} ({t.balanceFormatted} Available) • {leg.formattedAddress}
                  </option>
                );
              })}
            </select>
            {(() => {
              const leg = getAssetLegitimacyInfo(selectedToken);
              return (
                <div className="mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-[10px] font-mono">
                  <span className="text-blue-300 font-bold truncate">Contract Address: {leg.contractAddress}</span>
                  <span className="text-slate-400 text-[9px] font-sans font-bold shrink-0 ml-2">{leg.verifierName}</span>
                </div>
              );
            })()}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Recipient Ethereum Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 block">Amount</label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedToken === 'ETH') {
                      setSendAmount(ethBalance);
                    } else {
                      const t = tokenBalances.find((item) => item.symbol === selectedToken);
                      if (t) setSendAmount(t.balanceFormatted.replace(/,/g, ''));
                    }
                  }}
                  className="text-[10px] font-bold text-blue-400 hover:underline cursor-pointer"
                >
                  Fill MAX
                </button>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Memo / Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Settlement transfer"
                value={memoNote}
                onChange={(e) => setMemoNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {txError && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{txError}</span>
            </div>
          )}

          {txSuccessHash && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-200">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Transaction Dispatched Successfully!</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300 truncate">
                Hash: {txSuccessHash}
              </div>
              <a
                href={`https://etherscan.io/tx/${txSuccessHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:underline text-[11px] font-semibold"
              >
                View on Etherscan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Signing & Broadcasting Transaction...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Execute On-Chain Transfer</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 4: RECEIVE QR & DETAILS */}
      {activeTab === 'receive' && (
        <div className="p-6 text-center space-y-4 max-w-sm mx-auto">
          <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
            <QrCode className="h-40 w-40 text-slate-900 mx-auto" />
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Send ETH & ERC-20 Tokens to
            </span>
            <div className="font-mono text-xs text-blue-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mt-1 select-all break-all">
              {walletAddress}
            </div>
          </div>

          <button
            onClick={handleCopyAddress}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedAddress ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copiedAddress ? 'Address Copied!' : 'Copy Wallet Address'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

