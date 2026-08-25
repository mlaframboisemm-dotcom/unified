import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as ethers from 'ethers';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Link,
  PlusCircle,
  RefreshCw,
  Search,
  Wallet
} from 'lucide-react';

export interface TokenBalance {
  symbol: string;
  name: string;
  contractAddress: string | null;
  balance: string;
  balanceFormatted: string;
  unitPriceUsd: number | null;
  fiatValueUsd: number | null;
  decimals: number;
  icon?: string;
  isDiscovered?: boolean;
}

export interface BlockchainWalletSnapshot {
  address: string;
  networkId: string;
  native: {
    symbol: string;
    amount: number;
    fiatValueUsd: number | null;
  };
  tokens: TokenBalance[];
  totalPortfolioUsd: number | null;
}

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  explorerUrl: string;
  isTestnet?: boolean;
}

const SUPPORTED_NETWORKS: NetworkConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io'
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    symbol: 'POL',
    explorerUrl: 'https://polygonscan.com'
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://arbiscan.io'
  },
  {
    id: 'optimism',
    name: 'Optimism Mainnet',
    chainId: 10,
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  {
    id: 'base',
    name: 'Base Mainnet',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    explorerUrl: 'https://basescan.org'
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    symbol: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true
  }
];

const KNOWN_ERC20_TOKENS = [
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
  { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18 },
  { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18 },
  { symbol: 'POL', name: 'Polygon', address: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFCafE', decimals: 18 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { symbol: 'MANA', name: 'Decentraland', address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942', decimals: 18 },
  { symbol: 'RPL', name: 'Rocket Pool Protocol', address: '0xd33526068d116ce69f19a9ee46f0bd304f21a51f', decimals: 18 },
  { symbol: 'MXC', name: 'MXC Token', address: '0x5ca381bbfb58f0092df149bd3d243b08b9a8386e', decimals: 18 },
  { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
  { symbol: 'MKR', name: 'Maker', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18 },
  { symbol: 'CRV', name: 'Curve DAO Token', address: '0xD533a949740Bb3306d119CC777fa900bA034cd52', decimals: 18 },
  { symbol: 'LDO', name: 'Lido DAO', address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18 }
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

interface ImportedToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

interface Eip1193Provider {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
}

export interface BlockchainWalletComponentProps {
  /** Legacy props are intentionally ignored: the application does not accept server, prop, or browser-stored private keys. */
  customAddress?: string;
  privateKey?: string;
  rpcUrl?: string;
  onWalletStateChange?: (address: string, spendable: boolean) => void;
  onBalancesChange?: (snapshot: BlockchainWalletSnapshot | null) => void;
  onTransactionSuccess?: (txHash: string) => void;
  onRecordTransaction?: (tx: unknown) => void;
  onAddTransaction?: (type: 'SEND' | 'RECEIVE' | 'BUY' | 'SELL' | 'CONVERT', symbol: string, amount: number, fiatAmount: number, details: string) => void;
  className?: string;
}

const isPositivePrice = (value: unknown): value is number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const formatAmount = (value: string, maximumFractionDigits = 8): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('en-US', { maximumFractionDigits })
    : value;
};

const clearSnapshot = (onBalancesChange?: (snapshot: BlockchainWalletSnapshot | null) => void) => {
  onBalancesChange?.(null);
};

export default function BlockchainWalletComponent({
  onWalletStateChange,
  onBalancesChange,
  className = ''
}: BlockchainWalletComponentProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig>(SUPPORTED_NETWORKS[0]);
  const [walletAddress, setWalletAddress] = useState('');
  const [isBrowserWalletConnected, setIsBrowserWalletConnected] = useState(false);
  const [isConnectingBrowser, setIsConnectingBrowser] = useState(false);
  const [nativeBalance, setNativeBalance] = useState('');
  const [nativeUsdPrice, setNativeUsdPrice] = useState<number | null>(null);
  const [nativeUsdValue, setNativeUsdValue] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [totalPortfolioUsd, setTotalPortfolioUsd] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [gasPriceGwei, setGasPriceGwei] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [discoverySources, setDiscoverySources] = useState<string[]>([]);
  const [importedTokensByNetwork, setImportedTokensByNetwork] = useState<Record<string, ImportedToken[]>>({});
  const [showImportForm, setShowImportForm] = useState(false);
  const [customContractInput, setCustomContractInput] = useState('');
  const [isImportingToken, setIsImportingToken] = useState(false);
  const [importTokenError, setImportTokenError] = useState<string | null>(null);
  const [importTokenSuccess, setImportTokenSuccess] = useState<string | null>(null);
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const importedTokens = useMemo(
    () => importedTokensByNetwork[selectedNetwork.id] ?? [],
    [importedTokensByNetwork, selectedNetwork.id]
  );
  const displayedTokens = useMemo(
    () => (hideZeroBalances ? tokenBalances.filter((token) => BigInt(token.balance) > 0n) : tokenBalances)
      .slice()
      .sort((left, right) => (right.fiatValueUsd ?? Number.NEGATIVE_INFINITY) - (left.fiatValueUsd ?? Number.NEGATIVE_INFINITY)),
    [hideZeroBalances, tokenBalances]
  );

  const clearDisplayedState = useCallback(() => {
    setNativeBalance('');
    setNativeUsdPrice(null);
    setNativeUsdValue(null);
    setTokenBalances([]);
    setTotalPortfolioUsd(null);
    setBlockNumber(null);
    setGasPriceGwei(null);
    setLastRefreshedAt(null);
    setDiscoverySources([]);
    clearSnapshot(onBalancesChange);
  }, [onBalancesChange]);

  const fetchAuthoritativeUsdPrice = useCallback(async (coinId: string): Promise<number | null> => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`
      );
      if (!response.ok) return null;
      const payload = await response.json();
      return isPositivePrice(payload?.[coinId]?.usd) ? Number(payload[coinId].usd) : null;
    } catch {
      return null;
    }
  }, []);

  const fetchBlockchainBalances = useCallback(async () => {
    const normalizedAddress = walletAddress.trim();
    if (!isBrowserWalletConnected || !ethers.isAddress(normalizedAddress)) {
      clearDisplayedState();
      setRpcError('Connect a browser wallet before synchronizing verified on-chain assets.');
      return;
    }

    setIsRefreshing(true);
    setRpcError(null);
    setDiscoverySources([]);

    try {
      const provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl);
      const rpcNetwork = await provider.getNetwork();
      if (Number(rpcNetwork.chainId) !== selectedNetwork.chainId) {
        throw new Error(`RPC chain ${rpcNetwork.chainId.toString()} does not match the selected chain ${selectedNetwork.chainId}`);
      }

      const coinId = selectedNetwork.id === 'polygon' ? 'matic-network' : 'ethereum';
      const [currentBlock, feeData, rawNative, nativePrice] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
        provider.getBalance(normalizedAddress),
        fetchAuthoritativeUsdPrice(coinId)
      ]);

      const nativeAmount = ethers.formatEther(rawNative);
      const nativeAmountNumber = Number(nativeAmount);
      if (!Number.isFinite(nativeAmountNumber)) throw new Error('The RPC returned an invalid native balance.');

      const nativeValue = nativePrice === null ? null : nativeAmountNumber * nativePrice;
      setNativeBalance(nativeAmount);
      setNativeUsdPrice(nativePrice);
      setNativeUsdValue(nativeValue);
      setBlockNumber(currentBlock);
      setGasPriceGwei(feeData.gasPrice ? (Number(feeData.gasPrice) / 1e9).toFixed(1) : null);

      const activeTokenList = [
        ...(selectedNetwork.chainId === 1 ? KNOWN_ERC20_TOKENS : []),
        ...importedTokens
      ];
      const directRpcResults = await Promise.allSettled(activeTokenList.map(async (token) => {
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const rawBalance = await contract.balanceOf(normalizedAddress);
        if (rawBalance <= 0n) return null;
        const formattedBalance = ethers.formatUnits(rawBalance, token.decimals);
        return {
          symbol: token.symbol,
          name: token.name,
          contractAddress: token.address,
          balance: rawBalance.toString(),
          balanceFormatted: formatAmount(formattedBalance),
          unitPriceUsd: null,
          fiatValueUsd: null,
          decimals: token.decimals,
          isDiscovered: false
        } satisfies TokenBalance;
      }));

      const scannedBalances: TokenBalance[] = directRpcResults.flatMap((result) => (
        result.status === 'fulfilled' && result.value ? [result.value] : []
      ));
      const sources = new Set<string>();
      const addDiscoveredToken = (candidate: {
        address: unknown;
        rawBalance: unknown;
        decimals: unknown;
        symbol: unknown;
        name: unknown;
        price: unknown;
      }) => {
        const address = String(candidate.address || '');
        const rawBalance = String(candidate.rawBalance || '');
        const decimals = Number.parseInt(String(candidate.decimals), 10);
        if (
          !ethers.isAddress(address)
          || !/^\d+$/.test(rawBalance)
          || BigInt(rawBalance) <= 0n
          || !Number.isInteger(decimals)
          || decimals < 0
          || decimals > 255
          || scannedBalances.some((item) => item.contractAddress?.toLowerCase() === address.toLowerCase())
        ) return;

        const formattedBalance = ethers.formatUnits(rawBalance, decimals);
        const price = isPositivePrice(candidate.price) ? Number(candidate.price) : null;
        scannedBalances.push({
          symbol: String(candidate.symbol || 'ERC-20'),
          name: String(candidate.name || candidate.symbol || 'ERC-20 token'),
          contractAddress: address,
          balance: rawBalance,
          balanceFormatted: formatAmount(formattedBalance),
          unitPriceUsd: price,
          fiatValueUsd: price === null ? null : Number(formattedBalance) * price,
          decimals,
          isDiscovered: true
        });
      };

      if (selectedNetwork.chainId === 1) {
        const [ethplorerResult, blockscoutResult] = await Promise.allSettled([
          fetch(`https://api.ethplorer.io/getAddressInfo/${normalizedAddress}?apiKey=freekey`),
          fetch(`https://eth.blockscout.com/api/v2/addresses/${normalizedAddress}/token-balances`)
        ]);

        if (ethplorerResult.status === 'fulfilled' && ethplorerResult.value.ok) {
          try {
            const payload = await ethplorerResult.value.json();
            const tokens = Array.isArray(payload?.tokens) ? payload.tokens : [];
            for (const token of tokens) {
              addDiscoveredToken({
                address: token?.tokenInfo?.address,
                rawBalance: token?.rawBalance,
                decimals: token?.tokenInfo?.decimals,
                symbol: token?.tokenInfo?.symbol,
                name: token?.tokenInfo?.name,
                price: token?.tokenInfo?.price?.rate
              });
            }
            sources.add('Ethplorer');
          } catch {
            // Discovery remains optional; successful direct RPC balances above remain displayed.
          }
        }

        if (blockscoutResult.status === 'fulfilled' && blockscoutResult.value.ok) {
          try {
            const payload = await blockscoutResult.value.json();
            const tokens = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
            for (const item of tokens) {
              addDiscoveredToken({
                address: item?.token?.address,
                rawBalance: item?.value,
                decimals: item?.token?.decimals,
                symbol: item?.token?.symbol,
                name: item?.token?.name,
                price: item?.token?.exchange_rate
              });
            }
            sources.add('Blockscout');
          } catch {
            // Discovery remains optional; successful direct RPC balances above remain displayed.
          }
        }
      }

      setDiscoverySources([...sources]);
      setTokenBalances(scannedBalances);
      const allValues = [nativeValue, ...scannedBalances.map((token) => token.fiatValueUsd)];
      const total = allValues.every((value) => value !== null)
        ? allValues.reduce((sum, value) => sum + Number(value), 0)
        : null;
      setTotalPortfolioUsd(total);
      onBalancesChange?.({
        address: normalizedAddress,
        networkId: selectedNetwork.id,
        native: { symbol: selectedNetwork.symbol, amount: nativeAmountNumber, fiatValueUsd: nativeValue },
        tokens: scannedBalances,
        totalPortfolioUsd: total
      });
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (error: any) {
      clearDisplayedState();
      setRpcError(`Unable to verify on-chain state for ${selectedNetwork.name}: ${error?.message || 'RPC request failed'}. No cached or fallback values are displayed.`);
    } finally {
      setIsRefreshing(false);
    }
  }, [clearDisplayedState, fetchAuthoritativeUsdPrice, importedTokens, isBrowserWalletConnected, onBalancesChange, selectedNetwork, walletAddress]);

  const handleAccountsChanged = useCallback((accounts: unknown) => {
    const nextAccount = Array.isArray(accounts) && typeof accounts[0] === 'string' && ethers.isAddress(accounts[0])
      ? accounts[0]
      : '';
    setWalletAddress(nextAccount);
    setIsBrowserWalletConnected(Boolean(nextAccount));
    onWalletStateChange?.(nextAccount, false);
    if (!nextAccount) {
      clearDisplayedState();
      setRpcError('The browser wallet disconnected. No on-chain assets are displayed.');
    }
  }, [clearDisplayedState, onWalletStateChange]);

  useEffect(() => {
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) return;

    const loadAuthorizedAccount = async () => {
      try {
        handleAccountsChanged(await provider.request({ method: 'eth_accounts' }));
      } catch {
        handleAccountsChanged([]);
      }
    };

    void loadAuthorizedAccount();
    provider.on?.('accountsChanged', handleAccountsChanged);
    return () => provider.removeListener?.('accountsChanged', handleAccountsChanged);
  }, [handleAccountsChanged]);

  useEffect(() => {
    if (isBrowserWalletConnected) void fetchBlockchainBalances();
  }, [fetchBlockchainBalances, isBrowserWalletConnected]);

  const handleConnectBrowserWallet = async () => {
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) {
      setRpcError('No EIP-1193 browser wallet was detected. Install or unlock a compatible wallet, then try again.');
      return;
    }

    setIsConnectingBrowser(true);
    try {
      handleAccountsChanged(await provider.request({ method: 'eth_requestAccounts' }));
    } catch (error: any) {
      setRpcError(`Browser wallet connection was not approved: ${error?.message || 'request failed'}.`);
    } finally {
      setIsConnectingBrowser(false);
    }
  };

  const handleImportCustomContract = async (event: React.FormEvent) => {
    event.preventDefault();
    setImportTokenError(null);
    setImportTokenSuccess(null);

    const contractAddress = customContractInput.trim();
    if (!isBrowserWalletConnected || !ethers.isAddress(walletAddress)) {
      setImportTokenError('Connect a browser wallet before importing a contract for read-only verification.');
      return;
    }
    if (!ethers.isAddress(contractAddress)) {
      setImportTokenError('Enter a valid ERC-20 contract address.');
      return;
    }

    setIsImportingToken(true);
    try {
      const provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl);
      const rpcNetwork = await provider.getNetwork();
      if (Number(rpcNetwork.chainId) !== selectedNetwork.chainId) throw new Error('The selected RPC does not match the selected network.');
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
      const [symbolValue, nameValue, decimalsValue] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals()
      ]);
      const symbol = String(symbolValue).trim();
      const name = String(nameValue).trim();
      const decimals = Number(decimalsValue);
      if (!symbol || !name || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
        throw new Error('The contract did not return verifiable ERC-20 metadata.');
      }

      const importedToken: ImportedToken = { symbol, name, address: contractAddress, decimals };
      setImportedTokensByNetwork((current) => {
        const existing = current[selectedNetwork.id] || [];
        if (existing.some((token) => token.address.toLowerCase() === contractAddress.toLowerCase())) return current;
        return { ...current, [selectedNetwork.id]: [...existing, importedToken] };
      });
      setCustomContractInput('');
      setShowImportForm(false);
      setImportTokenSuccess(`${name} (${symbol}) was added for read-only on-chain verification.`);
    } catch (error: any) {
      setImportTokenError(`Unable to verify this contract: ${error?.message || 'request failed'}.`);
    } finally {
      setIsImportingToken(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      window.setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      setRpcError('The browser did not permit copying the connected wallet address.');
    }
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl ${className}`}>
      <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-500/30 bg-blue-600/20 p-2.5 text-blue-400"><Wallet className="h-6 w-6" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Verified Web3 Asset Synchronization</h2>
              <span className="rounded-full border border-blue-800/60 bg-blue-950/80 px-2.5 py-0.5 text-xs font-semibold text-blue-300">Read-only</span>
            </div>
            <p className="text-xs text-slate-400">
              {selectedNetwork.name} (Chain #{selectedNetwork.chainId}) · Block {blockNumber === null ? 'unavailable' : blockNumber.toLocaleString()} · Gas {gasPriceGwei === null ? 'unavailable' : `${gasPriceGwei} Gwei`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedNetwork.id}
            onChange={(event) => {
              const network = SUPPORTED_NETWORKS.find((candidate) => candidate.id === event.target.value);
              if (network) setSelectedNetwork(network);
            }}
            className="cursor-pointer rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            aria-label="Network for read-only asset synchronization"
          >
            {SUPPORTED_NETWORKS.map((network) => <option key={network.id} value={network.id}>{network.name}{network.isTestnet ? ' (Testnet)' : ''}</option>)}
          </select>
          <button
            type="button"
            onClick={handleConnectBrowserWallet}
            disabled={isConnectingBrowser || isBrowserWalletConnected}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-default disabled:border-emerald-700 disabled:bg-emerald-950 disabled:text-emerald-300"
          >
            <Link className="h-3.5 w-3.5" />
            {isBrowserWalletConnected ? `Connected (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)})` : isConnectingBrowser ? 'Connecting…' : 'Connect MetaMask / Web3'}
          </button>
          <button
            type="button"
            onClick={() => void fetchBlockchainBalances()}
            disabled={!isBrowserWalletConnected || isRefreshing}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            {isRefreshing ? 'Synchronizing…' : 'Sync Balances'}
          </button>
          {walletAddress && (
            <a
              href={`${selectedNetwork.explorerUrl}/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Explorer
            </a>
          )}
        </div>
      </header>

      <div className="border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 p-5">
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Connected Web3 Wallet Address</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-blue-300">{walletAddress || 'No browser wallet connected'}</span>
              <button type="button" onClick={() => void handleCopyAddress()} disabled={!walletAddress} className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="Copy connected wallet address">
                {copiedAddress ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="md:text-right">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Combined On-Chain Value ({selectedNetwork.name})</span>
            <div className="text-2xl font-black tracking-tight text-white">
              {totalPortfolioUsd === null ? 'Live value unavailable' : `$${totalPortfolioUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            {lastRefreshedAt && <span className="text-[11px] text-slate-400">Verified at {lastRefreshedAt}</span>}
          </div>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-blue-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">Browser-wallet ownership boundary</div>
              <div className="text-[10px] text-slate-400">This application reads the connected public address from your browser wallet. It does not import private keys, balances, transaction records, or account state from another repository.</div>
            </div>
          </div>
          <button type="button" onClick={handleConnectBrowserWallet} disabled={isConnectingBrowser || isBrowserWalletConnected} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-default disabled:bg-slate-700 disabled:text-slate-400">
            {isBrowserWalletConnected ? 'Browser Wallet Connected' : isConnectingBrowser ? 'Connecting…' : 'Connect Browser Wallet'}
          </button>
        </div>

        {discoverySources.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-800/60 bg-blue-950/50 p-2.5 text-xs text-blue-300">
            <Search className="h-4 w-4 shrink-0 text-blue-400" />
            <span>Additional token contracts were read from {discoverySources.join(' and ')}. Token quantities come from each provider response; missing prices remain unavailable.</span>
          </div>
        )}
        {rpcError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/40 p-2.5 text-xs text-amber-300"><AlertCircle className="h-4 w-4 shrink-0" /><span>{rpcError}</span></div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-white">Verified Holdings ({displayedTokens.length + (nativeBalance ? 1 : 0)})</h3></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHideZeroBalances((current) => !current)} className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700">{hideZeroBalances ? 'Showing Active Only' : 'Hide Zero Balances'}</button>
            <button type="button" onClick={() => setShowImportForm((current) => !current)} className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-blue-400 transition hover:bg-slate-700"><PlusCircle className="h-3 w-3" /> Import Contract</button>
          </div>
        </div>

        {showImportForm && (
          <form onSubmit={handleImportCustomContract} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-200">Import a Contract for Read-only Verification</span><button type="button" onClick={() => setShowImportForm(false)} className="text-xs text-slate-400 hover:text-slate-200">Close</button></div>
            <label className="block text-[11px] text-slate-400">ERC-20 contract address on {selectedNetwork.name}<input type="text" placeholder="0x…" value={customContractInput} onChange={(event) => setCustomContractInput(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500" /></label>
            {importTokenError && <div className="text-xs text-rose-400">{importTokenError}</div>}
            {importTokenSuccess && <div className="text-xs text-emerald-400">{importTokenSuccess}</div>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowImportForm(false)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">Cancel</button><button type="submit" disabled={isImportingToken} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">{isImportingToken ? 'Verifying…' : 'Verify Contract'}</button></div>
          </form>
        )}

        {nativeBalance && (
          <article className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center">
            <div><div className="font-bold text-white">{selectedNetwork.name} ({selectedNetwork.symbol})</div><div className="mt-1 text-xs text-slate-400">{nativeUsdPrice === null ? 'Live price unavailable' : `$${nativeUsdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${selectedNetwork.symbol}`}</div></div>
            <div className="text-right"><div className="font-mono text-sm font-bold text-white">{formatAmount(nativeBalance)} {selectedNetwork.symbol}</div><div className="text-xs text-slate-400">{nativeUsdValue === null ? 'Live value unavailable' : `≈ $${nativeUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}</div></div>
          </article>
        )}

        {displayedTokens.map((token) => (
          <article key={token.contractAddress || token.symbol} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300">{token.symbol.slice(0, 3)}</div><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-xs font-bold text-white">{token.name}</span><span className="font-mono text-[10px] font-semibold text-slate-400">{token.symbol}</span></div><div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400"><span>{token.unitPriceUsd === null ? 'Live price unavailable' : `$${token.unitPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / unit`}</span>{token.contractAddress && <><span>·</span><a href={`${selectedNetwork.explorerUrl}/token/${token.contractAddress}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-blue-400 hover:underline"><span>{token.contractAddress.slice(0, 6)}…{token.contractAddress.slice(-4)}</span><ExternalLink className="h-2.5 w-2.5" /></a></>}</div></div></div>
            <div className="text-right"><div className="font-mono text-xs font-bold text-white">{token.balanceFormatted} {token.symbol}</div><div className="text-[11px] text-slate-400">{token.fiatValueUsd === null ? 'Live price unavailable' : `≈ $${token.fiatValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}</div></div>
          </article>
        ))}

        {isBrowserWalletConnected && !isRefreshing && !nativeBalance && !rpcError && <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-400">No balance has been verified yet. Select a network and use Sync Balances.</div>}
      </div>
    </section>
  );
}
