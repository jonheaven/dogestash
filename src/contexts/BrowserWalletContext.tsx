'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserWallet, type BrowserWalletSaveOptions } from '../lib/browser-wallet';
import type { SeedMaterial, WalletData } from '../types/wallet';
import { walletDataApi } from '../utils/api';

export interface UseBrowserWalletReturn {
  connected: boolean;
  address: string | null;
  balance: number;
  wallet: WalletData | null;
  connecting: boolean;
  connect: (wallet: WalletData) => Promise<void>;
  disconnect: () => Promise<void>;
  createWallet: () => Promise<WalletData & { mnemonic?: string }>;
  importWallet: (privateKey: string) => Promise<WalletData>;
  importWalletFromMnemonic: (mnemonic: string, passphrase?: string) => Promise<WalletData>;
  saveWallet: (
    wallet: WalletData,
    password?: string,
    options?: BrowserWalletSaveOptions
  ) => Promise<void>;
  loadWallet: (password?: string) => Promise<WalletData | null>;
  loadSeedMaterial: (password?: string, address?: string) => Promise<SeedMaterial | null>;
  hasSeedMaterial: (address?: string) => Promise<boolean>;
  hasWallet: () => Promise<boolean>;
  removeWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  listWallets: () => Promise<WalletData[]>;
  selectWallet: (address: string) => Promise<WalletData | null>;
  switchAccount: (accountIndex: number, password?: string) => Promise<WalletData>;
  updateNickname: (address: string, nickname?: string) => Promise<void>;
}

const BrowserWalletContext = createContext<UseBrowserWalletReturn | null>(null);

interface BrowserWalletProviderProps {
  children: React.ReactNode;
}

async function fetchBalanceForAddress(address: string): Promise<number> {
  try {
    return await walletDataApi.fetchBalance(address);
  } catch (error) {
    console.error('[BROWSER WALLET] Balance fetch error:', error);
    return 0;
  }
}

export function BrowserWalletProvider({ children }: BrowserWalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const restoreWallet = async () => {
      try {
        const storage = new BrowserWallet();
        const current = localStorage.getItem('dogestash_wallet_current');
        if (current && (await storage.isEncrypted(current))) {
          return;
        }

        const loaded = await storage.loadWallet();
        if (!loaded) {
          return;
        }

        setWallet(loaded);
        setAddress(loaded.address);
        setConnected(true);
        setBalance(await fetchBalanceForAddress(loaded.address));
        try {
          localStorage.setItem('wallet_type', 'browser');
        } catch {
          // Ignore localStorage failures during restore.
        }
      } catch (error: any) {
        if (!error?.message?.includes('encrypted')) {
          console.error('[BROWSER WALLET] Restore error:', error);
        }
      }
    };

    void restoreWallet();
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      return;
    }
    setBalance(await fetchBalanceForAddress(address));
  }, [address]);

  const connect = useCallback(async (walletData: WalletData) => {
    setConnecting(true);
    try {
      setWallet(walletData);
      setAddress(walletData.address);
      setConnected(true);
      setBalance(await fetchBalanceForAddress(walletData.address));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setConnected(false);
    setAddress(null);
    setBalance(0);
    setWallet(null);
  }, []);

  const createWallet = useCallback(async () => BrowserWallet.generateWallet('mainnet'), []);

  const importWallet = useCallback(
    async (privateKey: string) => BrowserWallet.importFromPrivateKey(privateKey, 'mainnet'),
    []
  );

  const importWalletFromMnemonic = useCallback(
    async (mnemonic: string, passphrase?: string) =>
      BrowserWallet.importFromMnemonic(mnemonic, passphrase, 'mainnet'),
    []
  );

  const saveWallet = useCallback(
    async (walletData: WalletData, password?: string, options?: BrowserWalletSaveOptions) => {
      const storage = new BrowserWallet();
      await storage.saveWallet(walletData, password, options);
    },
    []
  );

  const loadWallet = useCallback(async (password?: string) => {
    const storage = new BrowserWallet();
    return storage.loadWallet(password);
  }, []);

  const loadSeedMaterial = useCallback(async (password?: string, targetAddress?: string) => {
    const storage = new BrowserWallet();
    return storage.loadSeedMaterial(password, targetAddress);
  }, []);

  const hasSeedMaterial = useCallback(async (targetAddress?: string) => {
    const storage = new BrowserWallet();
    return storage.hasSeedMaterial(targetAddress);
  }, []);

  const hasWallet = useCallback(async () => {
    const storage = new BrowserWallet();
    return storage.hasWallet();
  }, []);

  const removeWallet = useCallback(async () => {
    const storage = new BrowserWallet();
    try {
      await storage.removeWallet(address || undefined);
    } catch {
      await storage.removeWallet();
    }

    if (typeof window !== 'undefined' && localStorage.getItem('wallet_type') === 'browser') {
      localStorage.removeItem('wallet_type');
    }

    await disconnect();
  }, [address, disconnect]);

  const listWallets = useCallback(async () => {
    const storage = new BrowserWallet();
    return storage.listWallets();
  }, []);

  const selectWallet = useCallback(
    async (targetAddress: string) => {
      const storage = new BrowserWallet();
      const selected = await storage.selectWallet(targetAddress);
      if (selected) {
        await connect(selected);
      }
      return selected;
    },
    [connect]
  );

  const switchAccount = useCallback(
    async (accountIndex: number, password?: string) => {
      const storage = new BrowserWallet();
      const switched = await storage.switchAccount(accountIndex, password, address || undefined);
      await connect(switched);
      return switched;
    },
    [address, connect]
  );

  const updateNickname = useCallback(
    async (targetAddress: string, nickname?: string) => {
      const storage = new BrowserWallet();
      await storage.updateNickname(targetAddress, nickname);
      if (wallet?.address === targetAddress) {
        setWallet({ ...wallet, nickname });
      }
    },
    [wallet]
  );

  const value: UseBrowserWalletReturn = {
    connected,
    address,
    balance,
    wallet,
    connecting,
    connect,
    disconnect,
    createWallet,
    importWallet,
    importWalletFromMnemonic,
    saveWallet,
    loadWallet,
    loadSeedMaterial,
    hasSeedMaterial,
    hasWallet,
    removeWallet,
    refreshBalance,
    listWallets,
    selectWallet,
    switchAccount,
    updateNickname,
  };

  return (
    <BrowserWalletContext.Provider value={value}>
      {/* @ts-ignore - Next.js type checking issue with React.ReactNode */}
      {children}
    </BrowserWalletContext.Provider>
  );
}

export function useBrowserWallet(): UseBrowserWalletReturn {
  const ctx = useContext(BrowserWalletContext);
  if (!ctx) {
    throw new Error('useBrowserWallet must be used within a BrowserWalletProvider');
  }
  return ctx;
}
