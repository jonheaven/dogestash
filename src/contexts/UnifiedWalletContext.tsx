'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useMyDogeWallet } from './MyDogeWalletContext';
import { useNintondoWallet } from './NintondoWalletContext';
import { useBrowserWallet } from './BrowserWalletContext';
import { BrowserWallet } from '../lib/browser-wallet';
import { LedgerWallet } from '../lib/ledger-wallet';
import {
  signDMPIntent as signDMPIntentService,
  warnIfUnexpectedSigningHostname,
} from '../services/dmp';
import { walletDataApi } from '../utils/api';
import type {
  DmpIntentParams,
  DmpIntentType,
  SignedDmpIntent,
  UnifiedWalletContextValue,
  WalletType,
  WalletData,
} from '../types/wallet';

interface DojakState {
  connected: boolean;
  address: string | null;
  balance: number;
  connecting: boolean;
}

interface LedgerState {
  connected: boolean;
  address: string | null;
  balance: number;
  connecting: boolean;
  accountIndex: number | null;
  derivationPath: string | null;
}

const DOJAK_INITIAL_STATE: DojakState = {
  connected: false,
  address: null,
  balance: 0,
  connecting: false,
};

const LEDGER_INITIAL_STATE: LedgerState = {
  connected: false,
  address: null,
  balance: 0,
  connecting: false,
  accountIndex: null,
  derivationPath: null,
};

const UnifiedWalletContext = createContext<UnifiedWalletContextValue | null>(null);

async function fetchBalance(address: string): Promise<number> {
  try {
    return await walletDataApi.fetchBalance(address);
  } catch (error) {
    console.error('[UNIFIED WALLET] Balance fetch error:', error);
    return 0;
  }
}

export function UnifiedWalletProvider({ children }: { children: React.ReactNode }) {
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dojakState, setDojakState] = useState<DojakState>(DOJAK_INITIAL_STATE);
  const [ledgerState, setLedgerState] = useState<LedgerState>(LEDGER_INITIAL_STATE);

  const myDoge = useMyDogeWallet();
  const nintondo = useNintondoWallet();
  const browser = useBrowserWallet();
  const dojakListenersRef = useRef(false);
  const ledgerWalletRef = useRef(new LedgerWallet());

  useEffect(() => {
    if (myDoge && nintondo && browser) {
      setIsInitialized(true);
    }
  }, [myDoge, nintondo, browser]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.dojak || dojakListenersRef.current) {
      return;
    }

    dojakListenersRef.current = true;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts?.length) {
        setDojakState((prev) => ({ ...prev, connected: true, address: accounts[0] }));
        return;
      }

      setDojakState(DOJAK_INITIAL_STATE);
      if (walletType === 'dojak') {
        setWalletType(null);
        localStorage.removeItem('wallet_type');
      }
    };

    (window.dojak as any)?.on?.('accountsChanged', handleAccountsChanged);
    return () => {
      (window.dojak as any)?.removeListener?.('accountsChanged', handleAccountsChanged);
      dojakListenersRef.current = false;
    };
  }, [walletType]);

  const connected =
    walletType === 'mydoge'
      ? (myDoge?.connected ?? false)
      : walletType === 'nintondo'
        ? (nintondo?.connected ?? false)
        : walletType === 'browser'
          ? (browser?.connected ?? false)
          : walletType === 'dojak'
            ? dojakState.connected
            : walletType === 'ledger'
              ? ledgerState.connected
              : false;

  const address =
    walletType === 'mydoge'
      ? (myDoge?.address ?? null)
      : walletType === 'nintondo'
        ? (nintondo?.address ?? null)
        : walletType === 'browser'
          ? (browser?.address ?? null)
          : walletType === 'dojak'
            ? dojakState.address
            : walletType === 'ledger'
              ? ledgerState.address
              : null;

  const balance =
    walletType === 'mydoge'
      ? (myDoge?.balance ?? 0)
      : walletType === 'nintondo'
        ? (nintondo?.balance ?? 0)
        : walletType === 'browser'
          ? (browser?.balance ?? 0)
          : walletType === 'dojak'
            ? dojakState.balance
            : walletType === 'ledger'
              ? ledgerState.balance
              : 0;

  const accountIndex =
    walletType === 'browser'
      ? (browser.wallet?.accountIndex ?? null)
      : walletType === 'ledger'
        ? ledgerState.accountIndex
        : null;

  const derivationPath =
    walletType === 'browser'
      ? (browser.wallet?.derivationPath ?? null)
      : walletType === 'ledger'
        ? ledgerState.derivationPath
        : null;

  const balanceVerified =
    connected &&
    ((walletType === 'mydoge' && myDoge?.balance !== undefined) ||
      (walletType === 'nintondo' && nintondo?.balance !== undefined) ||
      (walletType === 'browser' && browser?.balance !== undefined) ||
      (walletType === 'dojak' && dojakState.connected) ||
      (walletType === 'ledger' && ledgerState.connected));

  const connecting =
    walletType === 'mydoge'
      ? (myDoge?.connecting ?? false)
      : walletType === 'nintondo'
        ? (nintondo?.connecting ?? false)
        : walletType === 'browser'
          ? (browser?.connecting ?? false)
          : walletType === 'dojak'
            ? dojakState.connecting
            : walletType === 'ledger'
              ? ledgerState.connecting
              : false;

  const disconnectCurrentWallet = useCallback(
    async (except?: WalletType) => {
      if (walletType === 'mydoge' && except !== 'mydoge' && myDoge.connected) {
        await myDoge.disconnect();
      }
      if (walletType === 'nintondo' && except !== 'nintondo' && nintondo.connected) {
        await nintondo.disconnect();
      }
      if (walletType === 'browser' && except !== 'browser' && browser.connected) {
        await browser.disconnect();
      }
      if (walletType === 'dojak' && except !== 'dojak' && dojakState.connected) {
        try {
          await (window.dojak as any)?.disconnect?.();
        } catch {
          // Ignore Dojak disconnect failures.
        }
        setDojakState(DOJAK_INITIAL_STATE);
      }
      if (walletType === 'ledger' && except !== 'ledger' && ledgerState.connected) {
        await ledgerWalletRef.current.disconnect();
        setLedgerState(LEDGER_INITIAL_STATE);
      }
    },
    [browser, dojakState.connected, ledgerState.connected, myDoge, nintondo, walletType]
  );

  const connectWallet = useCallback(
    async (
      type: WalletType,
      options?: {
        ledgerPrompt?: boolean;
        ledgerVerify?: boolean;
      }
    ) => {
      if (!isInitialized) {
        throw new Error('Wallet system not initialized yet');
      }

      await disconnectCurrentWallet(type);
      setWalletType(type);
      localStorage.setItem('wallet_type', type);

      try {
        if (type === 'mydoge') {
          await myDoge.connect();
          return;
        }

        if (type === 'nintondo') {
          await nintondo.connect();
          return;
        }

        if (type === 'dojak') {
          if (!(window.dojak as any)?.isDojak) {
            throw new Error('Dojak wallet not found');
          }

          setDojakState((prev) => ({ ...prev, connecting: true }));
          const accounts = await (window.dojak as any).requestAccounts();
          if (!accounts?.length) {
            throw new Error('No accounts returned from Dojak');
          }

          let bal = 0;
          try {
            const result = await (window.dojak as any).getBalance();
            bal = (result?.total || result?.confirmed || 0) / 100000000;
          } catch {
            // Ignore balance fetch failures for Dojak.
          }

          setDojakState({
            connected: true,
            address: accounts[0],
            balance: bal,
            connecting: false,
          });
          return;
        }

        if (type === 'ledger') {
          setLedgerState((prev) => ({ ...prev, connecting: true }));
          const account = await ledgerWalletRef.current.connect({
            accountIndex: LedgerWallet.getPersistedAccountIndex(),
            promptUser: options?.ledgerPrompt ?? true,
            verify: options?.ledgerVerify ?? true,
          });
          setLedgerState({
            connected: true,
            address: account.address,
            balance: await fetchBalance(account.address),
            connecting: false,
            accountIndex: account.accountIndex,
            derivationPath: account.derivationPath,
          });
          return;
        }

        const hasStoredWallet = await browser.hasWallet();
        if (!hasStoredWallet) {
          return;
        }

        try {
          const loaded = await browser.loadWallet();
          if (loaded) {
            await browser.connect(loaded);
          }
        } catch (error: any) {
          if (
            error?.message?.includes('encrypted') ||
            error?.message?.includes('Password required')
          ) {
            return;
          }
          throw error;
        }
      } catch (error) {
        if (type === 'dojak') {
          setDojakState(DOJAK_INITIAL_STATE);
        }
        if (type === 'ledger') {
          setLedgerState(LEDGER_INITIAL_STATE);
        }
        setWalletType(null);
        localStorage.removeItem('wallet_type');
        throw error;
      }
    },
    [browser, disconnectCurrentWallet, isInitialized, myDoge, nintondo]
  );

  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') {
      return;
    }

    const stored = localStorage.getItem('wallet_type') as WalletType | null;
    if (!stored) {
      return;
    }

    const restore = async () => {
      try {
        const isAvailable =
          stored === 'mydoge'
            ? !!(window.doge?.isMyDoge || (window as any).mydoge?.isMyDoge)
            : stored === 'nintondo'
              ? !!window.nintondo
              : stored === 'dojak'
                ? !!(window.dojak as any)?.isDojak
                : stored === 'ledger'
                  ? await LedgerWallet.isSupported()
                  : !!browser;

        if (!isAvailable) {
          localStorage.removeItem('wallet_type');
          setWalletType(null);
          return;
        }

        await connectWallet(stored, {
          ledgerPrompt: false,
          ledgerVerify: false,
        });
      } catch (error) {
        console.warn('[UNIFIED WALLET] Auto-reconnect failed:', error);
        localStorage.removeItem('wallet_type');
        setWalletType(null);
      }
    };

    const timeout = window.setTimeout(() => {
      void restore();
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [browser, connectWallet, isInitialized]);

  useEffect(() => {
    if (isInitialized && browser.connected && walletType !== 'browser') {
      setWalletType('browser');
      try {
        localStorage.setItem('wallet_type', 'browser');
      } catch {
        // Ignore localStorage sync errors.
      }
    }
  }, [browser.connected, isInitialized, walletType]);

  const connect = useCallback(
    async (type: WalletType) => {
      await connectWallet(type);
    },
    [connectWallet]
  );

  const switchAccount = useCallback(
    async (nextAccountIndex: number, password?: string) => {
      if (!isInitialized) {
        throw new Error('Wallet system not initialized');
      }

      if (walletType === 'browser') {
        await browser.switchAccount(nextAccountIndex, password);
        return;
      }

      if (walletType === 'ledger') {
        setLedgerState((prev) => ({ ...prev, connecting: true }));
        try {
          const account = await ledgerWalletRef.current.switchAccount(nextAccountIndex);
          setLedgerState({
            connected: true,
            address: account.address,
            balance: await fetchBalance(account.address),
            connecting: false,
            accountIndex: account.accountIndex,
            derivationPath: account.derivationPath,
          });
          return;
        } catch (error) {
          setLedgerState((prev) => ({ ...prev, connecting: false }));
          throw error;
        }
      }

      throw new Error('Account switching is only supported for browser and Ledger wallets');
    },
    [browser, isInitialized, walletType]
  );

  const disconnect = useCallback(async () => {
    try {
      await disconnectCurrentWallet();
    } finally {
      setWalletType(null);
      setDojakState(DOJAK_INITIAL_STATE);
      setLedgerState(LEDGER_INITIAL_STATE);
      localStorage.removeItem('wallet_type');
    }
  }, [disconnectCurrentWallet]);

  const sendTransaction = useCallback(
    async (recipientAddress: string, amount: number): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Wallet system not initialized');
      }

      if (walletType === 'mydoge') {
        return myDoge.sendTransaction(recipientAddress, amount);
      }

      if (walletType === 'nintondo') {
        return nintondo.nintondo!.createTx({
          recipientAddress,
          amount: amount * 100000000,
        });
      }

      if (walletType === 'dojak') {
        if (!window.dojak) {
          throw new Error('Dojak wallet not available');
        }
        return (window.dojak as any).sendBitcoin(
          recipientAddress,
          Math.round(amount * 100000000)
        );
      }

      throw new Error('Transaction sending is not supported for the current wallet');
    },
    [isInitialized, myDoge, nintondo, walletType]
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Wallet system not initialized');
      }

      warnIfUnexpectedSigningHostname('Message signing');

      if (walletType === 'mydoge') {
        return myDoge.signMessage(message);
      }
      if (walletType === 'nintondo') {
        return nintondo.signMessage(message);
      }
      if (walletType === 'dojak') {
        if (!window.dojak) {
          throw new Error('Dojak wallet not available');
        }
        return (window.dojak as any).signMessage(message, 'ecdsa');
      }
      if (walletType === 'ledger') {
        return ledgerWalletRef.current.signMessage(message);
      }

      throw new Error('Message signing is not supported for the current wallet');
    },
    [isInitialized, myDoge, nintondo, walletType]
  );

  const signPSBT = useCallback(
    async (psbtHex: string): Promise<string> => {
      if (walletType === 'mydoge') {
        return myDoge.signPSBT(psbtHex);
      }
      if (walletType === 'nintondo') {
        const hexPairs = psbtHex.match(/.{1,2}/g) || [];
        const hexBytes = Uint8Array.from(hexPairs.map((byte) => parseInt(byte, 16)));
        return nintondo.signPSBT(btoa(String.fromCharCode(...hexBytes)));
      }
      if (walletType === 'dojak') {
        if (!window.dojak) {
          throw new Error('Dojak wallet not available');
        }
        return (window.dojak as any).signPsbt(psbtHex);
      }

      throw new Error('PSBT signing is not supported for the current wallet');
    },
    [myDoge, nintondo, walletType]
  );

  const signPSBTOnly = useCallback(
    async (psbtHex: string): Promise<string> => {
      if (walletType === 'mydoge') {
        return myDoge.signPSBTOnly(psbtHex);
      }
      if (walletType === 'nintondo') {
        const hexPairs = psbtHex.match(/.{1,2}/g) || [];
        const hexBytes = Uint8Array.from(hexPairs.map((byte) => parseInt(byte, 16)));
        return nintondo.signPSBT(btoa(String.fromCharCode(...hexBytes)));
      }
      if (walletType === 'dojak') {
        if (!window.dojak) {
          throw new Error('Dojak wallet not available');
        }
        return (window.dojak as any).signPsbt(psbtHex, { autoFinalized: false });
      }

      throw new Error('PSBT signing is not supported for the current wallet');
    },
    [myDoge, nintondo, walletType]
  );

  const signDMPIntent = useCallback(
    async <T extends DmpIntentType>(
      intentType: T,
      params: DmpIntentParams<T>
    ): Promise<SignedDmpIntent<T>> => {
      if (!address) {
        throw new Error('Connect a wallet before signing DMP intents');
      }

      if (walletType === 'browser') {
        const browserWallet = new BrowserWallet();
        return signDMPIntentService(intentType, {
          ...params,
          activeAddress: address,
          signMessage: (message) => browserWallet.signMessage(message, undefined, address),
        });
      }

      if (walletType === 'mydoge') {
        return signDMPIntentService(intentType, {
          ...params,
          activeAddress: address,
          signMessage: (message) => myDoge.signMessage(message),
        });
      }

      if (walletType === 'nintondo') {
        return signDMPIntentService(intentType, {
          ...params,
          activeAddress: address,
          signMessage: (message) => nintondo.signMessage(message),
        });
      }

      if (walletType === 'dojak') {
        if (!window.dojak) {
          throw new Error('Dojak wallet not available');
        }
        return signDMPIntentService(intentType, {
          ...params,
          activeAddress: address,
          signMessage: (message) => (window.dojak as any).signMessage(message, 'ecdsa'),
        });
      }

      if (walletType === 'ledger') {
        return signDMPIntentService(intentType, {
          ...params,
          activeAddress: address,
          signMessage: (message) => ledgerWalletRef.current.signMessage(message),
        });
      }

      throw new Error('DMP signing is not supported for the current wallet');
    },
    [address, myDoge, nintondo, walletType]
  );

  const sendInscription = useCallback(
    async (recipientAddress: string, location: string): Promise<string> => {
      if (walletType === 'mydoge') {
        return myDoge.sendInscription(recipientAddress, location);
      }
      if (walletType === 'dojak') {
        if (!window.dojak) {
          throw new Error('Dojak wallet not available');
        }
        return (window.dojak as any).sendInscription(recipientAddress, location);
      }

      throw new Error('Inscription sending is not supported for this wallet type');
    },
    [myDoge, walletType]
  );

  const getTransactionStatus = useCallback(
    async (txId: string) => {
      if (walletType === 'mydoge') {
        return myDoge.getTransactionStatus(txId);
      }
      throw new Error('Transaction status is not supported for this wallet type');
    },
    [myDoge, walletType]
  );

  const value: UnifiedWalletContextValue = {
    walletType,
    connected,
    address,
    balance,
    balanceVerified,
    connecting,
    accountIndex,
    derivationPath,
    connect,
    switchAccount,
    disconnect,
    sendTransaction,
    signMessage,
    signPSBT,
    signPSBTOnly,
    signDMPIntent,
    sendInscription,
    getTransactionStatus,
    createBrowserWallet: () => browser.createWallet(),
    importBrowserWallet: (privateKey: string) => browser.importWallet(privateKey),
    importBrowserWalletFromMnemonic: (mnemonic: string, passphrase?: string) =>
      browser.importWalletFromMnemonic(mnemonic, passphrase),
    saveBrowserWallet: (
      wallet: WalletData,
      password?: string,
      options?: { seedMaterial?: { mnemonic: string; passphrase?: string } | null }
    ) => browser.saveWallet(wallet, password, options),
    loadBrowserWallet: (password?: string) => browser.loadWallet(password),
    loadBrowserSeedMaterial: (password?: string) => browser.loadSeedMaterial(password),
    hasBrowserWallet: () => browser.hasWallet(),
    removeBrowserWallet: () => browser.removeWallet(),
  };

  return (
    <UnifiedWalletContext.Provider value={value}>
      {/* @ts-ignore - Next.js type checking issue with React.ReactNode */}
      {children}
    </UnifiedWalletContext.Provider>
  );
}

export function useUnifiedWallet(): UnifiedWalletContextValue {
  const ctx = useContext(UnifiedWalletContext);
  if (!ctx) {
    throw new Error('useUnifiedWallet must be used within a UnifiedWalletProvider');
  }
  return ctx;
}
