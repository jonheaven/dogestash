'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface NintondoWallet {
  connect: () => Promise<string>;
  getBalance: () => Promise<string>;
  getAccount: () => Promise<string>;
  getAccountName: () => Promise<string>;
  isConnected: () => Promise<boolean>;
  signPsbt: (psbtBase64: string, options?: any) => Promise<string>;
  signMessage: (text: string) => Promise<string>;
  createTx: (data: any) => Promise<string>;
  getNetwork: () => Promise<'mainnet' | 'testnet'>;
}

export interface UseNintondoWalletReturn {
  nintondo: NintondoWallet | null;
  connected: boolean;
  address: string | null;
  balance: number;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signPSBT: (psbtBase64: string) => Promise<string>;
}

const NintondoWalletContext = createContext<UseNintondoWalletReturn | null>(null);

export function NintondoWalletProvider({ children }: { children: React.ReactNode }) {
  const [nintondo, setNintondo] = useState<NintondoWallet | null>(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    console.log('🚀 [NINTONDO] Initializing Nintondo wallet provider...');

    const checkWallet = () => {
      try {
        const win = window as any;
        console.log('🔍 [NINTONDO] Checking for wallet...', {
          hasNintondo: !!win.nintondo,
          type: typeof win.nintondo,
          nintondo: win.nintondo
        });

        const nintondoWallet = win.nintondo;
        if (nintondoWallet && typeof nintondoWallet === 'object') {
          // Check if it has the expected methods
          const hasMethods = typeof nintondoWallet.connect === 'function' ||
                            typeof nintondoWallet.getAccount === 'function';
          if (hasMethods) {
            console.log('✅ [NINTONDO] Nintondo wallet found with methods:', {
              hasConnect: typeof nintondoWallet.connect === 'function',
              hasGetAccount: typeof nintondoWallet.getAccount === 'function',
              hasGetBalance: typeof nintondoWallet.getBalance === 'function'
            });
            setNintondo(nintondoWallet);
            return true;
          } else {
            console.log('⚠️ [NINTONDO] Found nintondo object but missing methods');
          }
        }
        return false;
      } catch (error) {
        console.warn('⚠️ [NINTONDO] Error checking wallet availability:', error);
        return false;
      }
    };

    const onInit = () => {
      console.log('🎉 [NINTONDO] Nintondo wallet initialized event received');
      // Check immediately when event fires
      setTimeout(() => {
        checkWallet();
      }, 100);
    };

    // Initial check - check immediately
    if (checkWallet()) {
      // Still set up listener in case wallet reinitializes
      window.addEventListener('nintondo#initialized', onInit);
      return () => {
        window.removeEventListener('nintondo#initialized', onInit);
      };
    }

    // Check periodically for wallets that load after page load
    const intervalId = setInterval(() => {
      if (checkWallet()) {
        clearInterval(intervalId);
      }
    }, 1000);

    // Stop checking after 10 seconds
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 10000);

    // Set up event listeners
    window.addEventListener('nintondo#initialized', onInit);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener('nintondo#initialized', onInit);
    };
  }, []);

  useEffect(() => {
    const restoreConnection = async () => {
      if (!nintondo) return;

      try {
        const isConnected = await nintondo.isConnected();
        if (isConnected) {
          const account = await nintondo.getAccount();
          setAddress(account);
          setConnected(true);
          localStorage.setItem('nintondo_address', account);

          try {
            const bal = await nintondo.getBalance();
            const balanceNum = parseFloat(bal) / 100000000; // Convert satoshis to DOGE
            setBalance(balanceNum);
          } catch (balErr) {
            console.error('[NINTONDO] Balance fetch failed:', balErr);
            setBalance(0);
          }
        } else {
          const storedAddr = localStorage.getItem('nintondo_address');
          if (storedAddr) {
            setAddress(storedAddr);
            setConnected(false);
          }
        }
      } catch (err) {
        console.error('[NINTONDO] Restore error:', err);
      }
    };

    restoreConnection();
  }, [nintondo]);

  const connect = useCallback(async () => {
    console.log('🔗 [NINTONDO] ==========================================');
    console.log('🔗 [NINTONDO] CONNECT FUNCTION CALLED');
    console.log('🔗 [NINTONDO] ==========================================');

    if (!nintondo) {
      console.error('❌ [NINTONDO] nintondo object is null/undefined');
      throw new Error('Nintondo wallet not installed! Please install the Nintondo browser extension.');
    }

      console.log('✅ [NINTONDO] nintondo object exists:', {
      type: typeof nintondo,
      hasConnect: typeof nintondo.connect === 'function',
      hasGetAccount: typeof nintondo.getAccount === 'function',
      hasGetBalance: typeof nintondo.getBalance === 'function',
      hasGetAccountName: typeof nintondo.getAccountName === 'function',
      hasIsConnected: typeof nintondo.isConnected === 'function',
      hasSignPsbt: typeof nintondo.signPsbt === 'function',
      hasSignMessage: typeof nintondo.signMessage === 'function',
      hasGetNetwork: typeof nintondo.getNetwork === 'function',
      hasSwitchNetwork: typeof (nintondo as any).switchNetwork === 'function',
      allMethods: Object.keys(nintondo),
      allMethodsDetailed: Object.keys(nintondo).map(key => ({
        key,
        type: typeof (nintondo as any)[key],
        isFunction: typeof (nintondo as any)[key] === 'function'
      })),
    });

    if (connected) {
      console.log('ℹ️ [NINTONDO] Already connected, returning');
      return;
    }

    if (connecting) {
      console.log('⏳ [NINTONDO] Connection already in progress, returning');
      return;
    }

    setConnecting(true);

    try {
      let currentNetwork: string | null = null;
      try {
        currentNetwork = await nintondo.getNetwork();
        console.log('🌐 [NINTONDO] Current network reported by extension:', currentNetwork);
      } catch (networkErr) {
        console.warn('⚠️ [NINTONDO] Unable to read network:', networkErr);
      }

      try {
        const nintondoAny = nintondo as any;
        const targets = currentNetwork
          ? [currentNetwork, 'dogeMainnet', 'dogecoin', 'mainnet']
          : ['dogeMainnet', 'dogecoin', 'mainnet'];
        for (const target of targets) {
          if (typeof nintondoAny.switchNetwork === 'function') {
            try {
              console.log('🔄 [NINTONDO] Attempting switchNetwork(', target, ')');
              await nintondoAny.switchNetwork(target);
              console.log('✅ [NINTONDO] switchNetwork success with', target);
              break;
            } catch (switchErr) {
              console.warn('⚠️ [NINTONDO] switchNetwork failed for', target, switchErr);
            }
          }
        }
      } catch (switchOuterErr) {
        console.warn('⚠️ [NINTONDO] switchNetwork attempts errored:', switchOuterErr);
      }

      try {
        const existingAccount = await nintondo.getAccount();
        console.log('👤 [NINTONDO] getAccount before connect():', existingAccount);
      } catch (accountErr) {
        console.warn('⚠️ [NINTONDO] getAccount before connect() failed:', {
          message: accountErr?.message,
          code: accountErr?.code,
        });
      }

      console.log('⏳ [NINTONDO] Waiting briefly before connect() to allow extension state sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🔍 [NINTONDO] Calling connect()...');

      const connectStartTime = Date.now();

      const connectPromise = nintondo.connect().then((result) => {
        const duration = Date.now() - connectStartTime;
        console.log(`✅ [NINTONDO] connect() promise resolved (took ${duration}ms):`, {
          result,
          resultType: typeof result,
          resultLength: result?.length,
          isEmpty: !result || result === '',
          isString: typeof result === 'string',
        });
        return result;
      }).catch((err) => {
        const duration = Date.now() - connectStartTime;
        console.error(`❌ [NINTONDO] connect() promise rejected (took ${duration}ms):`, {
          error: err,
          message: err?.message,
          code: err?.code,
          name: err?.name,
          stack: err?.stack,
        });
        throw err;
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const duration = Date.now() - connectStartTime;
          console.error(`⏱️ [NINTONDO] Connection timeout after ${duration}ms`);
          reject(new Error('Connection timeout'));
        }, 30000); // 30 second timeout
      });

      console.log('🏁 [NINTONDO] Racing connect() promise against timeout...');
      const address = await Promise.race([connectPromise, timeoutPromise]) as string;
      const connectDuration = Date.now() - connectStartTime;

      console.log(`📋 [NINTONDO] Connect response received (took ${connectDuration}ms):`, {
        address,
        addressType: typeof address,
        addressLength: address?.length,
        isEmpty: !address || address === '',
        isString: typeof address === 'string',
        truthy: !!address,
      });

      if (!address || address === '') {
        throw new Error('No wallet or account selected in Nintondo extension');
      }

      setConnected(true);
      setAddress(address);
      localStorage.setItem('nintondo_address', address);

      try {
        const bal = await nintondo.getBalance();
        const balanceNum = parseFloat(bal) / 100000000;
        setBalance(balanceNum);
        console.log('💰 [NINTONDO] Balance fetched:', balanceNum, 'DOGE');
      } catch (balErr: any) {
        console.warn('⚠️ [NINTONDO] Balance fetch failed (non-critical):', balErr);
        setBalance(0);
      }
    } catch (error: any) {
      // Just pass through the actual error from the extension
      if (error instanceof Error) {
        throw error;
      }
      if (error?.message) {
        throw new Error(error.message);
      }
      if (typeof error === 'string') {
        throw new Error(error);
      }
      throw new Error('Connection failed');
    } finally {
      setConnecting(false);
    }
  }, [nintondo, connected, connecting]);

  const disconnect = useCallback(async () => {
    console.log('🔌 [NINTONDO] Disconnect function called...');

    setConnected(false);
    setAddress(null);
    setBalance(0);
    localStorage.removeItem('nintondo_address');
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!nintondo || !connected) {
      throw new Error('Nintondo wallet not connected!');
    }

    try {
      return await nintondo.signMessage(message);
    } catch (error) {
      console.error('💥 [NINTONDO] Sign message error:', error);
      throw error;
    }
  }, [nintondo, connected]);

  const signPSBT = useCallback(async (psbtBase64: string): Promise<string> => {
    if (!nintondo || !connected) {
      throw new Error('Nintondo wallet not connected!');
    }

    try {
      return await nintondo.signPsbt(psbtBase64);
    } catch (error) {
      console.error('💥 [NINTONDO] Sign PSBT error:', error);
      throw error;
    }
  }, [nintondo, connected]);

  const value: UseNintondoWalletReturn = {
    nintondo,
    connected,
    address,
    balance,
    connecting,
    connect,
    disconnect,
    signMessage,
    signPSBT,
  };

  return (
    <NintondoWalletContext.Provider value={value}>{children}</NintondoWalletContext.Provider>
  );
}

export function useNintondoWallet(): UseNintondoWalletReturn {
  const ctx = useContext(NintondoWalletContext);
  if (!ctx) {
    throw new Error('useNintondoWallet must be used within a NintondoWalletProvider');
  }
  return ctx;
}
