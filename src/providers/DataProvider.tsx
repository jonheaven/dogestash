import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { walletDataApi, DRC20Token, MyDogeInscription } from '../utils/api';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import { useToast } from '../contexts/ToastContext';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface DataProviderContextType {
  // DRC-20 Tokens
  drc20Tokens: DRC20Token[] | null;
  isLoadingDrc20Tokens: boolean;
  drc20TokensError: string | null;
  lastDrc20TokensUpdate: number | null;
  refreshDrc20Tokens: () => Promise<void>;
  canRefreshDrc20Tokens: boolean;
  timeUntilDrc20TokensRefresh: number;

  // Inscriptions
  inscriptions: MyDogeInscription[] | null;
  isLoadingInscriptions: boolean;
  inscriptionsError: string | null;
  lastInscriptionsUpdate: number | null;
  refreshInscriptions: () => Promise<void>;
  canRefreshInscriptions: boolean;
  timeUntilInscriptionsRefresh: number;

  // Wallet data (both tokens and inscriptions)
  refreshWalletData: () => Promise<void>;
  canRefreshWallet: boolean;
  timeUntilWalletRefresh: number;
}

const DataProviderContext = createContext<DataProviderContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

// Cache configuration
const CACHE_CONFIG = {
  DRC20_TOKENS: {
    ttl: 30 * 60 * 1000, // 30 minutes (tokens don't change often)
    forceRefreshCooldown: 5 * 60 * 1000, // 5 minutes between forced refreshes
  },
  INSCRIPTIONS: {
    ttl: 15 * 60 * 1000, // 15 minutes (inscriptions change more frequently)
    forceRefreshCooldown: 5 * 60 * 1000, // 5 minutes between forced refreshes
  },
  WALLET_DATA: {
    forceRefreshCooldown: 5 * 60 * 1000, // 5 minutes between full wallet refreshes
  }
};

// Helper function to get wallet-specific cache key
const getWalletCacheKey = (baseKey: string, walletAddress: string) => {
  return `bork_${baseKey}_${walletAddress}`;
};

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Add error boundary for this component
  try {
    const { address: walletAddress, connected: walletConnected } = useUnifiedWallet();
    const toast = useToast();
    const prevWalletAddressRef = React.useRef<string | null>(null);

    // Create a compatible wallet object for the existing code
    const wallet = walletConnected ? {
      getAddress: () => walletAddress || '',
      // Add other methods as needed
    } : null;

    // Safely get wallet address
    const getWalletAddress = React.useCallback(() => {
      try {
        return walletAddress || null;
      } catch (error) {
        console.warn('Failed to get wallet address:', error);
        return null;
      }
    }, [walletAddress]);

  // DRC-20 Tokens state
  const [drc20Tokens, setDrc20Tokens] = useState<DRC20Token[] | null>(null);
  const [isLoadingDrc20Tokens, setIsLoadingDrc20Tokens] = useState(false);
  const [drc20TokensError, setDrc20TokensError] = useState<string | null>(null);
  const [lastDrc20TokensUpdate, setLastDrc20TokensUpdate] = useState<number | null>(null);
  const [lastDrc20TokensForceRefresh, setLastDrc20TokensForceRefresh] = useState<number | null>(null);

  // Inscriptions state
  const [inscriptions, setInscriptions] = useState<MyDogeInscription[] | null>(null);
  const [isLoadingInscriptions, setIsLoadingInscriptions] = useState(false);
  const [inscriptionsError, setInscriptionsError] = useState<string | null>(null);
  const [lastInscriptionsUpdate, setLastInscriptionsUpdate] = useState<number | null>(null);
  const [lastInscriptionsForceRefresh, setLastInscriptionsForceRefresh] = useState<number | null>(null);

  // Combined wallet refresh state
  const [lastWalletForceRefresh, setLastWalletForceRefresh] = useState<number | null>(null);

  // Cache utilities
  const getCacheEntry = <T,>(key: string): CacheEntry<T> | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.warn(`Failed to read cache for ${key}:`, error);
      localStorage.removeItem(key);
      return null;
    }
  };

  const setCacheEntry = <T,>(key: string, data: T, ttl: number) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Failed to write cache for ${key}:`, error);
    }
  };

  // Check if wallet is too new to warrant API calls
  const isWalletTooNew = useCallback((address: string) => {
    try {
      const createdAtStr = localStorage.getItem(`wallet_created_${address}`);
      if (!createdAtStr) return false; // Not a browser wallet or no creation time tracked

      const createdAt = parseInt(createdAtStr);
      const now = Date.now();
      const ageInMinutes = (now - createdAt) / (1000 * 60);

      // Consider wallet too new if less than 5 minutes old
      return ageInMinutes < 5;
    } catch (error) {
      console.warn('Error checking wallet age:', error);
      return false;
    }
  }, []);

  // DRC-20 Tokens functions
  const refreshDrc20Tokens = useCallback(async (force = false) => {
    if (!walletConnected || !walletAddress) {
      console.log('No wallet connected for DRC-20 tokens refresh');
      return;
    }

    // Skip API calls for very new wallets (likely empty)
    if (!force && walletAddress && isWalletTooNew(walletAddress)) {
      console.log('Skipping DRC-20 tokens refresh for new wallet');
      setDrc20Tokens([]); // Set empty array instead of null
      setLastDrc20TokensUpdate(Date.now());
      return;
    }

    // Check cooldown for forced refreshes
    if (force) {
      const now = Date.now();
      const lastForce = lastDrc20TokensForceRefresh;
      if (lastForce && now - lastForce < CACHE_CONFIG.DRC20_TOKENS.forceRefreshCooldown) {
        const remaining = Math.ceil((CACHE_CONFIG.DRC20_TOKENS.forceRefreshCooldown - (now - lastForce)) / 1000);
        toast?.error(`Please wait ${remaining} seconds before forcing another refresh`);
        return;
      }
      setLastDrc20TokensForceRefresh(now);
    }

    // Check cache unless forcing refresh
    if (!force) {
      if (walletAddress) {
        const cacheKey = getWalletCacheKey('drc20_tokens', walletAddress);
        const cached = getCacheEntry<DRC20Token[]>(cacheKey);
        if (cached) {
          console.log('Using cached DRC-20 tokens');
          setDrc20Tokens(cached.data);
          setLastDrc20TokensUpdate(cached.timestamp);
          return;
        }
      }
    }

    setIsLoadingDrc20Tokens(true);
    setDrc20TokensError(null); // Clear previous error
    try {
      console.log('Fetching fresh DRC-20 tokens');
      const tokens = await walletDataApi.fetchDRC20Tokens(wallet);

      setDrc20Tokens(tokens);
      setLastDrc20TokensUpdate(Date.now());
      if (walletAddress) {
        const cacheKey = getWalletCacheKey('drc20_tokens', walletAddress);
        setCacheEntry(cacheKey, tokens, CACHE_CONFIG.DRC20_TOKENS.ttl);
      }

      if (force) {
        // Don't show individual success toasts when force refreshing from main refresh function
        // The main refresh function will show a single "Wallet data refreshed" toast
      }
    } catch (error: any) {
      console.error('Failed to refresh DRC-20 tokens:', error);
      setDrc20TokensError('Unable to retrieve DRC-20 tokens');
      toast?.error('Failed to refresh DRC-20 tokens');
    } finally {
      setIsLoadingDrc20Tokens(false);
    }
  }, [lastDrc20TokensForceRefresh, toast]);

  // Inscriptions functions
  const refreshInscriptions = useCallback(async (force = false) => {
    if (!wallet) {
      console.log('No wallet connected for inscriptions refresh');
      return;
    }

    // Skip API calls for very new wallets (likely empty)
    if (!force && walletAddress && isWalletTooNew(walletAddress)) {
      console.log('Skipping inscriptions refresh for new wallet');
      setInscriptions([]); // Set empty array instead of null
      setLastInscriptionsUpdate(Date.now());
      return;
    }

    // Check cooldown for forced refreshes
    if (force) {
      const now = Date.now();
      const lastForce = lastInscriptionsForceRefresh;
      if (lastForce && now - lastForce < CACHE_CONFIG.INSCRIPTIONS.forceRefreshCooldown) {
        const remaining = Math.ceil((CACHE_CONFIG.INSCRIPTIONS.forceRefreshCooldown - (now - lastForce)) / 1000);
        toast?.error(`Please wait ${remaining} seconds before forcing another refresh`);
        return;
      }
      setLastInscriptionsForceRefresh(now);
    }

    // Check cache unless forcing refresh
    if (!force) {
      const walletAddress = getWalletAddress();
      if (walletAddress) {
        const cacheKey = getWalletCacheKey('inscriptions', walletAddress);
        const cached = getCacheEntry<MyDogeInscription[]>(cacheKey);
        if (cached) {
          console.log('Using cached inscriptions');
          setInscriptions(cached.data);
          setLastInscriptionsUpdate(cached.timestamp);
          return;
        }
      }
    }

    setIsLoadingInscriptions(true);
    setInscriptionsError(null); // Clear previous error
    try {
      console.log('Fetching fresh inscriptions');
      const walletInscriptions = await walletDataApi.fetchInscriptions(walletAddress);

      setInscriptions(walletInscriptions);
      setLastInscriptionsUpdate(Date.now());
      if (walletAddress) {
        const cacheKey = getWalletCacheKey('inscriptions', walletAddress);
        setCacheEntry(cacheKey, walletInscriptions, CACHE_CONFIG.INSCRIPTIONS.ttl);
      }

      if (force) {
        // Don't show individual success toasts when force refreshing from main refresh function
        // The main refresh function will show a single "Wallet data refreshed" toast
      }
    } catch (error: any) {
      console.error('Failed to refresh inscriptions:', error);
      setInscriptionsError('Unable to retrieve Inscriptions');
      toast?.error('Failed to refresh inscriptions');
    } finally {
      setIsLoadingInscriptions(false);
    }
  }, [wallet, lastInscriptionsForceRefresh, toast]);

  // Combined wallet data refresh
  const refreshWalletData = useCallback(async (force = false) => {
    if (!wallet) return;

    // Check cooldown for forced refreshes
    if (force) {
      const now = Date.now();
      const lastForce = lastWalletForceRefresh;
      if (lastForce && now - lastForce < CACHE_CONFIG.WALLET_DATA.forceRefreshCooldown) {
        const remaining = Math.ceil((CACHE_CONFIG.WALLET_DATA.forceRefreshCooldown - (now - lastForce)) / 1000);
        toast?.error(`Please wait ${remaining} seconds before forcing another wallet refresh`);
        return;
      }
      setLastWalletForceRefresh(now);
    }

    await Promise.all([
      refreshDrc20Tokens(force),
      refreshInscriptions(force)
    ]);

    if (force) {
      toast?.success('Wallet data refreshed');
    }
  }, [wallet, lastWalletForceRefresh, refreshDrc20Tokens, refreshInscriptions, toast]);

  // Auto-refresh when wallet changes
  React.useEffect(() => {
    const currentAddress = getWalletAddress();

    // Only refresh if the wallet address actually changed
    if (currentAddress !== prevWalletAddressRef.current) {
      prevWalletAddressRef.current = currentAddress;

      if (walletConnected && currentAddress) {
        // Wallet connected/changed - refresh data
        refreshDrc20Tokens(false);
        refreshInscriptions(false);
      } else {
        // Clear data when wallet disconnects
        setDrc20Tokens(null);
        setInscriptions(null);
        setLastDrc20TokensUpdate(null);
        setLastInscriptionsUpdate(null);
      }
    }
  }, [walletConnected, getWalletAddress]);

  // Calculate refresh availability
  const now = Date.now();
  const canRefreshDrc20Tokens = !lastDrc20TokensForceRefresh ||
    now - lastDrc20TokensForceRefresh >= CACHE_CONFIG.DRC20_TOKENS.forceRefreshCooldown;
  const canRefreshInscriptions = !lastInscriptionsForceRefresh ||
    now - lastInscriptionsForceRefresh >= CACHE_CONFIG.INSCRIPTIONS.forceRefreshCooldown;
  const canRefreshWallet = !lastWalletForceRefresh ||
    now - lastWalletForceRefresh >= CACHE_CONFIG.WALLET_DATA.forceRefreshCooldown;

  const timeUntilDrc20TokensRefresh = canRefreshDrc20Tokens ? 0 :
    CACHE_CONFIG.DRC20_TOKENS.forceRefreshCooldown - (now - (lastDrc20TokensForceRefresh || 0));
  const timeUntilInscriptionsRefresh = canRefreshInscriptions ? 0 :
    CACHE_CONFIG.INSCRIPTIONS.forceRefreshCooldown - (now - (lastInscriptionsForceRefresh || 0));
  const timeUntilWalletRefresh = canRefreshWallet ? 0 :
    CACHE_CONFIG.WALLET_DATA.forceRefreshCooldown - (now - (lastWalletForceRefresh || 0));

  const contextValue: DataProviderContextType = {
    // DRC-20 Tokens
    drc20Tokens,
    isLoadingDrc20Tokens,
    drc20TokensError,
    lastDrc20TokensUpdate,
    refreshDrc20Tokens: () => refreshDrc20Tokens(true),
    canRefreshDrc20Tokens,
    timeUntilDrc20TokensRefresh,

    // Inscriptions
    inscriptions,
    isLoadingInscriptions,
    inscriptionsError,
    lastInscriptionsUpdate,
    refreshInscriptions: () => refreshInscriptions(true),
    canRefreshInscriptions,
    timeUntilInscriptionsRefresh,

    // Wallet data
    refreshWalletData: () => refreshWalletData(true),
    canRefreshWallet,
    timeUntilWalletRefresh,
  };

    return (
      <DataProviderContext.Provider value={contextValue}>
        {children}
      </DataProviderContext.Provider>
    );
  } catch (error) {
    console.error('DataProvider error:', error);
    // Return children without provider on error
    return <>{children}</>;
  }
};

export const useDataProvider = () => {
  const context = useContext(DataProviderContext);
  if (!context) {
    throw new Error('useDataProvider must be used within a DataProvider');
  }
  return context;
};
