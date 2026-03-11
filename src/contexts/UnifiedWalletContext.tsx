'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMyDogeWallet } from './MyDogeWalletContext';
import { useNintondoWallet } from './NintondoWalletContext';
import { useBrowserWallet } from './BrowserWalletContext';
import { WalletType } from '../types/wallet';

// Dojak wallet state (managed locally since it doesn't have its own context)
interface DojakState {
  connected: boolean;
  address: string | null;
  balance: number;
  connecting: boolean;
}

export interface UnifiedWalletContextValue {
  walletType: WalletType | null;
  connected: boolean;
  address: string | null;
  balance: number;
  balanceVerified: boolean; // Track if balance has been verified from API
  connecting: boolean;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (recipientAddress: string, amount: number) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signPSBT: (psbtHex: string) => Promise<string>;
  signPSBTOnly: (psbtHex: string) => Promise<string>;
  sendInscription: (recipientAddress: string, location: string) => Promise<string>;
  getTransactionStatus: (txId: string) => Promise<{ status: string; confirmations: number }>;
  // Browser wallet specific
  createBrowserWallet: () => Promise<any>;
  importBrowserWallet: (privateKey: string) => Promise<any>;
  importBrowserWalletFromMnemonic: (mnemonic: string, passphrase?: string) => Promise<any>;
  saveBrowserWallet: (wallet: any, password?: string) => Promise<void>;
  loadBrowserWallet: (password?: string) => Promise<any | null>;
  hasBrowserWallet: () => Promise<boolean>;
  removeBrowserWallet: () => Promise<void>;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextValue | null>(null);

export function UnifiedWalletProvider({ children }: { children: React.ReactNode }) {
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use wallet contexts - they should be available now with correct provider hierarchy
  const myDoge = useMyDogeWallet();
  const nintondo = useNintondoWallet();
  const browser = useBrowserWallet();

  // Dojak wallet state (no separate context, managed here)
  const [dojakState, setDojakState] = useState<DojakState>({
    connected: false,
    address: null,
    balance: 0,
    connecting: false,
  });

  // Balance verification state
  const [balanceVerified, setBalanceVerified] = useState(false);
  const dojakListenersRef = useRef<boolean>(false);

  // Mark as initialized once we have access to contexts
  useEffect(() => {
    if (myDoge && nintondo && browser) {
      setIsInitialized(true);
    }
  }, [myDoge, nintondo, browser]);

  // Setup Dojak event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !window.dojak || dojakListenersRef.current) return;

    dojakListenersRef.current = true;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 [DOJAK] Accounts changed:', accounts);
      if (accounts && accounts.length > 0) {
        setDojakState(prev => ({ ...prev, address: accounts[0], connected: true }));
      } else {
        setDojakState({ connected: false, address: null, balance: 0, connecting: false });
        if (walletType === 'dojak') {
          setWalletType(null);
          localStorage.removeItem('wallet_type');
        }
      }
    };

    window.dojak.on('accountsChanged', handleAccountsChanged);

    return () => {
      if (window.dojak) {
        window.dojak.removeListener('accountsChanged', handleAccountsChanged);
      }
      dojakListenersRef.current = false;
    };
  }, [walletType]);

  // Always provide values, but use defaults when not initialized
  const connected = walletType === 'mydoge' ? (myDoge?.connected ?? false) :
                     walletType === 'nintondo' ? (nintondo?.connected ?? false) :
                     walletType === 'browser' ? (browser?.connected ?? false) :
                     walletType === 'dojak' ? dojakState.connected : false;

  const address = walletType === 'mydoge' ? (myDoge?.address ?? null) :
                  walletType === 'nintondo' ? (nintondo?.address ?? null) :
                  walletType === 'browser' ? (browser?.address ?? null) :
                  walletType === 'dojak' ? dojakState.address : null;

  const balance = walletType === 'mydoge' ? (myDoge?.balance ?? 0) :
                  walletType === 'nintondo' ? (nintondo?.balance ?? 0) :
                  walletType === 'browser' ? (browser?.balance ?? 0) :
                  walletType === 'dojak' ? dojakState.balance : 0;

  // Balance is considered verified if we have a connected wallet and have received balance data
  const isBalanceVerified = connected && (
    (walletType === 'mydoge' && myDoge?.balance !== undefined) ||
    (walletType === 'nintondo' && nintondo?.balance !== undefined) ||
    (walletType === 'browser' && browser?.balance !== undefined) ||
    (walletType === 'dojak' && dojakState.connected) // Dojak balance is set when connected
  );

  const connecting = walletType === 'mydoge' ? (myDoge?.connecting ?? false) :
                     walletType === 'nintondo' ? (nintondo?.connecting ?? false) :
                     walletType === 'browser' ? (browser?.connecting ?? false) :
                     walletType === 'dojak' ? dojakState.connecting : false;


  // Restore wallet type from localStorage and auto-reconnect on mount
  useEffect(() => {
    const stored = localStorage.getItem('wallet_type') as WalletType | null;
    if (stored && (stored === 'mydoge' || stored === 'nintondo' || stored === 'browser' || stored === 'dojak')) {
      console.log(`🔄 [UNIFIED WALLET] Restoring wallet type: ${stored}`);
      setWalletType(stored);

      // Auto-reconnect the stored wallet type only if the wallet is available
      if (isInitialized) {
        setTimeout(async () => {
          try {
            // Check if the wallet type is actually available before trying to connect
            const isAvailable = stored === 'mydoge' ? (myDoge && (window.doge?.isMyDoge || (window as any).mydoge?.isMyDoge)) :
                               stored === 'nintondo' ? (nintondo && window.nintondo) :
                               stored === 'dojak' ? (window.dojak?.isDojak) :
                               stored === 'browser' ? !!browser : false;

            if (isAvailable) {
              await connect(stored);
            } else {
              console.log(`⚠️ [UNIFIED WALLET] ${stored} wallet not available, skipping auto-reconnect`);
              // Clear the stored wallet type since it's not available
              localStorage.removeItem('wallet_type');
              setWalletType(null);
            }
          } catch (error) {
            console.warn(`⚠️ [UNIFIED WALLET] Failed to auto-reconnect ${stored} wallet:`, error);
            // Clear the stored wallet type on connection failure
            localStorage.removeItem('wallet_type');
            setWalletType(null);
          }
        }, 100); // Small delay to ensure contexts are ready
      }
    }
  }, [isInitialized, myDoge, nintondo, browser]); // Re-run when contexts become available

  // Sync walletType when browser wallet is connected/disconnected
  useEffect(() => {
    if (isInitialized && browser.connected && walletType !== 'browser') {
      setWalletType('browser');
      try { localStorage.setItem('wallet_type', 'browser'); } catch {}
    }
  }, [isInitialized, browser.connected, walletType]);

  const connect = useCallback(async (type: WalletType) => {
    if (!isInitialized) {
      throw new Error('Wallet system not initialized yet');
    }

    try {
      // If connecting to an extension wallet, disconnect browser wallet first
      if (type === 'mydoge' || type === 'nintondo' || type === 'dojak') {
        if (walletType === 'browser' && browser.connected) {
          console.log('🔄 [UNIFIED WALLET] Disconnecting browser wallet before connecting extension wallet...');
          await browser.disconnect();
        }
        // Also disconnect other extension wallets
        if (walletType === 'dojak' && type !== 'dojak' && dojakState.connected) {
          console.log('🔄 [UNIFIED WALLET] Disconnecting Dojak before connecting other wallet...');
          try { await window.dojak?.disconnect(); } catch {}
          setDojakState({ connected: false, address: null, balance: 0, connecting: false });
        }
      }

      // If connecting to browser wallet, disconnect extension wallets first
      if (type === 'browser' && (walletType === 'mydoge' || walletType === 'nintondo' || walletType === 'dojak')) {
        console.log('🔄 [UNIFIED WALLET] Disconnecting extension wallet before connecting browser wallet...');
        if (walletType === 'mydoge' && myDoge.connected) {
          await myDoge.disconnect();
        } else if (walletType === 'nintondo' && nintondo.connected) {
          await nintondo.disconnect();
        } else if (walletType === 'dojak' && dojakState.connected) {
          try { await window.dojak?.disconnect(); } catch {}
          setDojakState({ connected: false, address: null, balance: 0, connecting: false });
        }
      }

      setWalletType(type);
      localStorage.setItem('wallet_type', type);

      if (type === 'mydoge') {
        try {
          await myDoge.connect();
        } catch (error: any) {
          // Check if this is the installHook.js error from MyDoge extension
          if (error?.message?.includes('installHook') ||
              error?.stack?.includes('installHook') ||
              error?.toString()?.includes('installHook')) {
            console.warn('⚠️ [UNIFIED WALLET] MyDoge extension hook installation failed. This may be due to extension compatibility issues.');
            console.warn('💡 [UNIFIED WALLET] Try: 1) Refreshing the page, 2) Restarting browser, 3) Updating MyDoge extension');
            throw new Error('MyDoge extension initialization failed. Please refresh the page and try again.');
          }
          throw error;
        }
      } else if (type === 'nintondo') {
        await nintondo.connect();
      } else if (type === 'dojak') {
        // Connect to Dojak wallet
        if (!window.dojak?.isDojak) {
          throw new Error('Dojak wallet not found');
        }

        setDojakState(prev => ({ ...prev, connecting: true }));

        try {
          console.log('🔄 [DOJAK] Requesting accounts...');
          const accounts = await window.dojak.requestAccounts();
          console.log('✅ [DOJAK] Got accounts:', accounts);

          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned from Dojak');
          }

          const addr = accounts[0];

          // Try to get balance
          let bal = 0;
          try {
            const balanceResult = await window.dojak.getBalance();
            bal = (balanceResult?.total || balanceResult?.confirmed || 0) / 100000000; // Convert satoshis to DOGE
          } catch (e) {
            console.warn('[DOJAK] Could not get balance:', e);
          }

          setDojakState({
            connected: true,
            address: addr,
            balance: bal,
            connecting: false,
          });

          console.log('✅ [DOJAK] Connected successfully:', addr);
        } catch (error) {
          setDojakState({ connected: false, address: null, balance: 0, connecting: false });
          throw error;
        }
      } else if (type === 'browser') {
        // Browser wallet needs to be loaded/created first
        const hasWallet = await browser.hasWallet();
        if (hasWallet) {
          try {
            const loaded = await browser.loadWallet();
            if (loaded) {
              await browser.connect(loaded);
            }
          } catch (error: any) {
            // If wallet is encrypted, skip auto-connect and let user handle it manually
            if (error.message.includes('encrypted') || error.message.includes('Password required')) {
              console.log('[UNIFIED WALLET] Skipping encrypted browser wallet auto-connect - user needs to provide password');
              return; // Don't throw, just skip auto-connect
            }
            throw error; // Re-throw other errors
          }
        }
        // If no wallet exists, user needs to create/import one first
        // This will be handled by the UI
      }
    } catch (error: any) {
      console.error('[UNIFIED WALLET] Error in connect:', error);

      // Handle specific MyDoge extension errors
      if (error?.message?.includes('installHook') ||
          error?.stack?.includes('installHook') ||
          error?.toString()?.includes('installHook')) {
        console.warn('🚨 [UNIFIED WALLET] MyDoge extension hook installation failed');
        console.warn('🔧 [UNIFIED WALLET] This is usually caused by:');
        console.warn('   • Browser extension conflicts');
        console.warn('   • Outdated MyDoge extension');
        console.warn('   • Browser security settings');
        console.warn('   • Extension permission issues');
        console.warn('💡 [UNIFIED WALLET] Try:');
        console.warn('   1. Refresh the page');
        console.warn('   2. Restart your browser');
        console.warn('   3. Update MyDoge extension');
        console.warn('   4. Check extension permissions');
        throw new Error('MyDoge extension failed to initialize properly. Please try refreshing the page or updating your MyDoge extension.');
      }

      // Handle generic connection errors with better messaging
      if (error?.message?.includes('MyDoge wallet extension not found')) {
        throw new Error('MyDoge wallet extension not detected. Please install the MyDoge browser extension and refresh this page.');
      }

      throw error;
    }
  }, [isInitialized, myDoge, nintondo, browser, walletType, dojakState.connected]);

  const disconnect = useCallback(async () => {
    if (!isInitialized) {
      setWalletType(null);
      localStorage.removeItem('wallet_type');
      return;
    }

    try {
      if (walletType === 'mydoge') {
        await myDoge.disconnect();
      } else if (walletType === 'nintondo') {
        await nintondo.disconnect();
      } else if (walletType === 'dojak') {
        try { await window.dojak?.disconnect(); } catch {}
        setDojakState({ connected: false, address: null, balance: 0, connecting: false });
      } else if (walletType === 'browser') {
        await browser.disconnect();
      }
      setWalletType(null);
      localStorage.removeItem('wallet_type');
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in disconnect:', error);
      // Still clear the wallet type even if disconnect fails
      setWalletType(null);
      localStorage.removeItem('wallet_type');
      setDojakState({ connected: false, address: null, balance: 0, connecting: false });
    }
  }, [isInitialized, walletType, myDoge, nintondo, browser]);

  const sendTransaction = useCallback(async (recipientAddress: string, amount: number): Promise<string> => {
    if (!isInitialized) throw new Error('Wallet system not initialized');

    try {
      if (walletType === 'mydoge') {
        return await myDoge.sendTransaction(recipientAddress, amount);
      } else if (walletType === 'nintondo') {
        // Nintondo uses createTx instead
        const tx = await nintondo.nintondo!.createTx({
          recipientAddress,
          amount: amount * 100000000, // Convert to satoshis
        });
        return tx;
      } else if (walletType === 'dojak') {
        if (!window.dojak) throw new Error('Dojak wallet not available');
        const satoshis = Math.round(amount * 100000000);
        return await window.dojak.sendBitcoin(recipientAddress, satoshis);
      } else {
        throw new Error('Transaction sending not supported for browser wallet');
      }
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in sendTransaction:', error);
      throw error;
    }
  }, [isInitialized, walletType, myDoge, nintondo]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!isInitialized) throw new Error('Wallet system not initialized');

    try {
      if (walletType === 'mydoge') {
        return await myDoge.signMessage(message);
      } else if (walletType === 'nintondo') {
        return await nintondo.signMessage(message);
      } else if (walletType === 'dojak') {
        if (!window.dojak) throw new Error('Dojak wallet not available');
        return await window.dojak.signMessage(message, 'ecdsa');
      } else {
        throw new Error('Message signing not supported for browser wallet');
      }
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in signMessage:', error);
      throw error;
    }
  }, [isInitialized, walletType, myDoge, nintondo]);

  const signPSBT = useCallback(async (psbtHex: string): Promise<string> => {
    try {
      if (walletType === 'mydoge') {
        return await myDoge.signPSBT(psbtHex);
      } else if (walletType === 'nintondo') {
        // Nintondo expects base64 PSBT
        // Convert hex to base64 using browser-compatible method
        const hexPairs = psbtHex.match(/.{1,2}/g) || [];
        const hexBytes = Uint8Array.from(hexPairs.map(byte => parseInt(byte, 16)));
        const psbtBase64 = btoa(String.fromCharCode(...hexBytes));
        return await nintondo.signPSBT(psbtBase64);
      } else if (walletType === 'dojak') {
        if (!window.dojak) throw new Error('Dojak wallet not available');
        return await window.dojak.signPsbt(psbtHex);
      } else {
        throw new Error('PSBT signing not supported for browser wallet');
      }
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in signPSBT:', error);
      throw error;
    }
  }, [walletType, myDoge, nintondo]);

  const signPSBTOnly = useCallback(async (psbtHex: string): Promise<string> => {
    try {
      if (walletType === 'mydoge') {
        return await myDoge.signPSBTOnly(psbtHex);
      } else if (walletType === 'nintondo') {
        // Nintondo expects base64 PSBT
        // Convert hex to base64 using browser-compatible method
        const hexPairs = psbtHex.match(/.{1,2}/g) || [];
        const hexBytes = Uint8Array.from(hexPairs.map(byte => parseInt(byte, 16)));
        const psbtBase64 = btoa(String.fromCharCode(...hexBytes));
        return await nintondo.signPSBT(psbtBase64);
      } else if (walletType === 'dojak') {
        if (!window.dojak) throw new Error('Dojak wallet not available');
        // Sign only, don't broadcast
        return await window.dojak.signPsbt(psbtHex, { autoFinalized: false });
      } else {
        throw new Error('PSBT signing not supported for browser wallet');
      }
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in signPSBTOnly:', error);
      throw error;
    }
  }, [walletType, myDoge, nintondo]);

  const sendInscription = useCallback(async (recipientAddress: string, location: string): Promise<string> => {
    try {
      if (walletType === 'mydoge') {
        return await myDoge.sendInscription(recipientAddress, location);
      } else if (walletType === 'dojak') {
        if (!window.dojak) throw new Error('Dojak wallet not available');
        return await window.dojak.sendInscription(recipientAddress, location);
      } else {
        throw new Error('Inscription sending not supported for this wallet type');
      }
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in sendInscription:', error);
      throw error;
    }
  }, [walletType, myDoge]);

  const getTransactionStatus = useCallback(async (txId: string) => {
    try {
      if (walletType === 'mydoge') {
        return await myDoge.getTransactionStatus(txId);
      } else {
        throw new Error('Transaction status not supported for this wallet type');
      }
    } catch (error) {
      console.error('[UNIFIED WALLET] Error in getTransactionStatus:', error);
      throw error;
    }
  }, [walletType, myDoge]);

  const value: UnifiedWalletContextValue = {
    walletType,
    connected,
    address,
    balance,
    balanceVerified: isBalanceVerified,
    connecting,
    connect,
    disconnect,
    sendTransaction,
    signMessage,
    signPSBT,
    signPSBTOnly,
    sendInscription,
    getTransactionStatus,
    createBrowserWallet: async () => {
      if (!isInitialized) throw new Error('Wallet system not initialized');

      try {
        return await browser.createWallet();
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in createBrowserWallet:', error);
        throw error;
      }
    },
    importBrowserWallet: async (privateKey: string) => {
      if (!isInitialized) throw new Error('Wallet system not initialized');

      try {
        return await browser.importWallet(privateKey);
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in importBrowserWallet:', error);
        throw error;
      }
    },
    importBrowserWalletFromMnemonic: async (mnemonic: string, passphrase?: string) => {
      if (!isInitialized) throw new Error('Wallet system not initialized');

      try {
        return await browser.importWalletFromMnemonic(mnemonic, passphrase);
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in importBrowserWalletFromMnemonic:', error);
        throw error;
      }
    },
    saveBrowserWallet: async (wallet: any, password?: string) => {
      if (!isInitialized) throw new Error('Wallet system not initialized');

      try {
        await browser.saveWallet(wallet, password);
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in saveBrowserWallet:', error);
        throw error;
      }
    },
    loadBrowserWallet: async (password?: string) => {
      if (!isInitialized) return null;

      try {
        return await browser.loadWallet(password);
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in loadBrowserWallet:', error);
        throw error;
      }
    },
    hasBrowserWallet: async () => {
      if (!isInitialized) return false;

      try {
        return await browser.hasWallet();
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in hasBrowserWallet:', error);
        return false;
      }
    },
    removeBrowserWallet: async () => {
      if (!isInitialized) return;

      try {
        await browser.removeWallet();
      } catch (error) {
        console.error('[UNIFIED WALLET] Error in removeBrowserWallet:', error);
        throw error;
      }
    },
  };

  return (
    <UnifiedWalletContext.Provider value={value}>{children}</UnifiedWalletContext.Provider>
  );
}

export function useUnifiedWallet(): UnifiedWalletContextValue {
  const ctx = useContext(UnifiedWalletContext);
  if (!ctx) {
    throw new Error('useUnifiedWallet must be used within a UnifiedWalletProvider');
  }
  return ctx;
}
