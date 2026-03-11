'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserWallet } from '../lib/browser-wallet';
import { WalletData } from '../types/wallet';
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
  saveWallet: (wallet: WalletData, password?: string) => Promise<void>;
  loadWallet: (password?: string) => Promise<WalletData | null>;
  hasWallet: () => Promise<boolean>;
  removeWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  listWallets: () => Promise<WalletData[]>;
  selectWallet: (address: string) => Promise<WalletData | null>;
  updateNickname: (address: string, nickname?: string) => Promise<void>;
}

const BrowserWalletContext = createContext<UseBrowserWalletReturn | null>(null);

export function BrowserWalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const restoreWallet = async () => {
      try {
        const storage = new BrowserWallet();
        // Check if wallet is encrypted first
        const current = localStorage.getItem('dogestash_wallet_current');
        if (current) {
          const isEncrypted = await storage.isEncrypted(current);
          if (isEncrypted) {
            // Encrypted wallet - don't auto-restore, user needs to enter password
            console.log('[BROWSER WALLET] Encrypted wallet detected, skipping auto-restore');
            return;
          }
        }
        // Try to load unencrypted wallet
        const loaded = await storage.loadWallet();
        if (loaded) {
          setWallet(loaded);
          setAddress(loaded.address);
          setConnected(true);
          // Ensure unified context can detect browser as active on reload
          try { localStorage.setItem('wallet_type', 'browser'); } catch {}
          await refreshBalance();
        }
      } catch (error: any) {
        // Only log if it's not the "encrypted" error (which we handle above)
        if (!error?.message?.includes('encrypted')) {
          console.error('[BROWSER WALLET] Restore error:', error);
        }
      }
    };

    restoreWallet();
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;

    try {
      console.log('[BROWSER WALLET] Fetching balance using configured provider API');
      const balanceDOGE = await walletDataApi.fetchBalance(address);
      setBalance(balanceDOGE);
      console.log(`[BROWSER WALLET] Balance updated: ${balanceDOGE} DOGE`);
    } catch (error) {
      console.error('[BROWSER WALLET] Balance fetch error:', error);
      setBalance(0); // Fallback to 0 on error
    }
  }, [address]);

  const connect = useCallback(async (walletData: WalletData) => {
    setConnecting(true);
    try {
      setWallet(walletData);
      setAddress(walletData.address);
      setConnected(true);
      await refreshBalance();
    } catch (error) {
      console.error('[BROWSER WALLET] Connect error:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    setConnected(false);
    setAddress(null);
    setBalance(0);
    setWallet(null);
  }, []);

  const createWallet = useCallback(async (): Promise<WalletData & { mnemonic?: string }> => {
    return await BrowserWallet.generateWallet('mainnet');
  }, []);

  const importWallet = useCallback(async (privateKey: string): Promise<WalletData> => {
    return await BrowserWallet.importFromPrivateKey(privateKey, 'mainnet');
  }, []);

  const importWalletFromMnemonic = useCallback(async (mnemonic: string, passphrase?: string): Promise<WalletData> => {
    return await BrowserWallet.importFromMnemonic(mnemonic, passphrase, 'mainnet');
  }, []);


  const saveWallet = useCallback(async (walletData: WalletData, password?: string) => {
    const storage = new BrowserWallet();
    await storage.saveWallet(walletData, password);
  }, []);

  const loadWallet = useCallback(async (password?: string): Promise<WalletData | null> => {
    const storage = new BrowserWallet();
    return await storage.loadWallet(password);
  }, []);

  const hasWallet = useCallback(async (): Promise<boolean> => {
    const storage = new BrowserWallet();
    return await storage.hasWallet();
  }, []);

  const removeWallet = useCallback(async () => {
    // Remove wallet from storage (this will also clear all related localStorage entries)
    const storage = new BrowserWallet();
    try {
      // Prefer explicit address when available
      await storage.removeWallet(address || undefined);
    } catch {
      await storage.removeWallet();
    }

    // Clear wallet_type if it's set to browser
    if (typeof window !== 'undefined') {
      const storedType = localStorage.getItem('wallet_type');
      if (storedType === 'browser') {
        localStorage.removeItem('wallet_type');
      }
    }

    await disconnect();
  }, [disconnect]);

  const listWallets = useCallback(async (): Promise<WalletData[]> => {
    const storage = new BrowserWallet();
    return await storage.listWallets();
  }, [address]);

  const selectWallet = useCallback(async (addr: string): Promise<WalletData | null> => {
    const storage = new BrowserWallet();
    const selected = await storage.selectWallet(addr);
    if (selected) {
      setWallet(selected);
      setAddress(selected.address);
      setConnected(true);
      await refreshBalance();
    }
    return selected;
  }, [refreshBalance]);

  const updateNickname = useCallback(async (addr: string, nickname?: string) => {
    const storage = new BrowserWallet();
    await storage.updateNickname(addr, nickname);
    if (wallet && wallet.address === addr) {
      setWallet({ ...wallet, nickname });
    }
  }, [wallet]);

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
    hasWallet,
    removeWallet,
    refreshBalance,
    listWallets,
    selectWallet,
    updateNickname,
  };

  return (
    <BrowserWalletContext.Provider value={value}>{children}</BrowserWalletContext.Provider>
  );
}

export function useBrowserWallet(): UseBrowserWalletReturn {
  const ctx = useContext(BrowserWalletContext);
  if (!ctx) {
    throw new Error('useBrowserWallet must be used within a BrowserWalletProvider');
  }
  return ctx;
}
