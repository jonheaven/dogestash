'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface MyDogeWallet {
  isMyDoge: boolean;
  connect: () => Promise<{ approved: boolean; address: string }>;
  disconnect: () => Promise<{ disconnected: boolean }>;
  getConnectionStatus: () => Promise<{ connected: boolean }>;
  getCurrentAddress?: () => Promise<{ address: string }>;
  getBalance: () => Promise<{ balance: string }>;
  requestTransaction: (params: { recipientAddress: string; dogeAmount: number }) => Promise<{ txId: string }>;
  getTransactionStatus: (params: { txId: string }) => Promise<{ status: string; confirmations: number }>;
  requestSignedMessage: (params: { message: string }) => Promise<{ signature: string }>;
  requestPsbt?: (params: { rawTx: string; indexes: number[]; signOnly?: boolean; partial?: boolean }) => Promise<{ txId?: string; signedRawTx?: string }>;
  requestInscriptionTransaction: (params: { recipientAddress: string; location: string }) => Promise<{ txId: string }>;
  signPSBT?: (params: { psbtHex: string; indexes: number[] }) => Promise<{ signedRawTx: string }>;
}

export interface UseMyDogeWalletReturn {
  myDoge: MyDogeWallet | null;
  connected: boolean;
  address: string | null;
  balance: number;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (recipientAddress: string, amount: number) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signPSBT: (psbtHex: string) => Promise<string>; // Returns raw transaction hex
  signPSBTOnly: (psbtHex: string) => Promise<string>; // Returns signed PSBT only (no broadcast)
  sendInscription: (recipientAddress: string, location: string) => Promise<string>;
  getTransactionStatus: (txId: string) => Promise<{ status: string; confirmations: number }>;
}

const MyDogeWalletContext = createContext<UseMyDogeWalletReturn | null>(null);

const getInjectedMyDoge = (): MyDogeWallet | null => {
  const anyWindow = window as any;
  const candidate = anyWindow.doge ?? anyWindow.mydoge;
  return candidate?.isMyDoge ? (candidate as MyDogeWallet) : null;
};

export function MyDogeWalletProvider({ children }: { children: React.ReactNode }) {
  const [myDoge, setMyDoge] = useState<MyDogeWallet | null>(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🚀 [WALLET] Initializing MyDoge wallet provider...');

    // Enhanced wallet availability check with error handling
    const checkWallet = () => {
      try {
        const injected = getInjectedMyDoge();
        if (injected?.isMyDoge === true) {
          console.log('✅ [WALLET] MyDoge wallet found');
          setMyDoge(injected);
          return true;
        }
        return false;
      } catch (error) {
        console.warn('⚠️ [WALLET] Error checking wallet availability:', error);
        return false;
      }
    };

    // Enhanced event listener for wallet initialization
    const onInit = () => {
      console.log('🎉 [WALLET] MyDoge wallet initialized event received');
      // Check immediately when event fires
      setTimeout(() => {
        checkWallet();
      }, 100);
    };

    // Add error handling for connection issues
    const onError = (event: any) => {
      // Silently handle "not connected" errors - these are expected
      if (event?.message?.includes('not connected') ||
          event?.message?.includes('MyDoge is not connected')) {
        console.log('[WALLET] MyDoge not connected - this is expected');
        return;
      }
      console.warn('⚠️ [WALLET] MyDoge connection error:', event);
    };

    // Check if page is already loaded
    const handleLoad = () => {
      setTimeout(() => {
        checkWallet();
      }, 200);
    };

    // Initial check - check immediately
    if (checkWallet()) {
      // Still set up listener in case wallet reinitializes
      window.addEventListener('doge#initialized', onInit);
      window.addEventListener('doge#error', onError);
      return () => {
        window.removeEventListener('doge#initialized', onInit);
        window.removeEventListener('doge#error', onError);
      };
    }

    // MyDoge wallet sets window.doge in a 'load' event listener
    // So we need to check after load event or if it already fired
    if (document.readyState === 'complete') {
      // Page already loaded, check immediately
      handleLoad();
    } else {
      // Page still loading, wait for load event
      window.addEventListener('load', handleLoad);
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
    window.addEventListener('doge#initialized', onInit);
    window.addEventListener('doge#error', onError);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('doge#initialized', onInit);
      window.removeEventListener('doge#error', onError);
    };
  }, []);

  useEffect(() => {
    const restoreConnection = async () => {
      console.log('[WALLET] Starting connection restore...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for extension init
      const provider = getInjectedMyDoge();
      if (!provider) {
        console.log('[WALLET] MyDoge extension not detected');
        return;
      }
      try {
        console.log('[WALLET] Checking connection status...');
        let status;
        try {
          status = await provider.getConnectionStatus();
        } catch (statusErr: any) {
          // Handle "not connected" error from getConnectionStatus
          if (statusErr?.message?.includes('not connected') ||
              statusErr?.message?.includes('MyDoge is not connected')) {
            console.log('[WALLET] Not connected to website - this is expected');
            return;
          }
          throw statusErr;
        }
        console.log('[WALLET] Status:', status);
        if (status.connected) {
          console.log('[WALLET] Extension connected, fetching address...');
          if (provider.getCurrentAddress) {
            console.log('[WALLET] getCurrentAddress available, fetching...');
            try {
              const addrRes = await provider.getCurrentAddress();
              setAddress(addrRes.address);
              setConnected(true);
              localStorage.setItem('mydoge_address', addrRes.address);
              // Balance fetch...
            } catch (addrErr: any) {
              // Handle "not connected" error gracefully
              if (addrErr?.message?.includes('not connected') ||
                  addrErr?.message?.includes('MyDoge is not connected')) {
                console.log('[WALLET] Not connected yet, will connect on user action');
                return;
              }
              throw addrErr;
            }
          } else {
            console.log('[WALLET] getCurrentAddress not available, falling back to stored');
            const storedAddr = localStorage.getItem('mydoge_address');
            if (storedAddr) {
              setAddress(storedAddr);
              setConnected(true);
              // Optional: Try to fetch balance anyway if possible
              try {
                const bal = await provider.getBalance();
                console.log('📊 [WALLET] Raw balance response (restore):', bal);

                let balanceNum = 0;
                try {
                  const rawBalance = parseFloat(bal.balance);
                  console.log('🔢 [WALLET] Raw balance number (restore):', rawBalance);

                  // Always convert satoshis to DOGE (1 DOGE = 100,000,000 satoshis)
                  balanceNum = rawBalance / 100000000;
                  console.log('💱 [WALLET] Converted satoshis to DOGE (restore):', balanceNum);

                } catch (parseError) {
                  console.error('❌ [WALLET] Balance parsing error (restore):', parseError);
                  balanceNum = 0;
                }

                setBalance(balanceNum);
                console.log('[WALLET] Balance fetched (restore):', balanceNum);
              } catch (balErr: any) {
                // Handle "not connected" error gracefully
                if (balErr?.message?.includes('not connected') ||
                    balErr?.message?.includes('MyDoge is not connected')) {
                  console.log('[WALLET] Not connected, balance fetch skipped');
                  setBalance(0);
                } else {
                  console.error('[WALLET] Balance fetch failed:', balErr);
                  setBalance(0);
                }
              }
            } else {
              console.log('[WALLET] No stored address, prompting reconnect');
              // Optional: set a state to show reconnect button or auto-call connect()
            }
          }
        } else {
          console.log('[WALLET] Not connected, checking localStorage...');
          const storedAddr = localStorage.getItem('mydoge_address');
          if (storedAddr) {
            console.log('[WALLET] Found stored address, but not connected. User needs to reconnect.');
            // Don't auto-connect - let user click "Connect Wallet"
          }
        }
      } catch (err: any) {
        // Handle "not connected" errors gracefully
        if (err?.message?.includes('not connected') ||
            err?.message?.includes('MyDoge is not connected')) {
          console.log('[WALLET] Not connected to website - this is expected until user connects');
          return;
        }
        console.error('[WALLET] Restore error:', err);
        // Optional: setError('Failed to restore connection - please reconnect manually');
      }
    };
    restoreConnection();
  }, []);

  // Remove the problematic connection checking effect
  // useEffect(() => {
  //   if (!myDoge) return;
  //   ... REMOVED
  // }, [myDoge, connectionInProgress, connected]);

  const connect = useCallback(async () => {
    console.log('🔗 [WALLET] Connect function called...');

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed! Please install the MyDoge browser extension.');
    }

    if (connected) {
      console.log('ℹ️ [WALLET] Already connected, skipping connection');
      return;
    }

    if (connecting) {
      console.log('⏳ [WALLET] Connection already in progress, skipping...');
      return;
    }

    console.log('🔄 [WALLET] Starting connection process...');
    setConnecting(true);

    try {
      console.log('📞 [WALLET] Calling wallet.connect()...');
      const connectRes = await myDoge.connect();
      console.log('📋 [WALLET] Connect response received:', connectRes);

      // Check for installHook errors that might occur after connection
      if (connectRes && typeof connectRes === 'object') {
        // The connection succeeded, but let's check if there were any extension hook errors
        setTimeout(() => {
          // Check if installHook.js errors occurred after connection
          const recentErrors = (console as any)._errors || [];
          const hookErrors = recentErrors.filter((err: any) =>
            err?.message?.includes('installHook') ||
            err?.stack?.includes('installHook')
          );
          if (hookErrors.length > 0) {
            console.warn('⚠️ [WALLET] MyDoge extension hook errors detected after connection');
            console.warn('💡 [WALLET] These errors may not affect functionality but indicate extension issues');
          }
        }, 1000);
      }

      if (connectRes.approved) {
        console.log('✅ [WALLET] Connection approved by user!');
        setConnected(true);
        setAddress(connectRes.address);
        console.log('📍 [WALLET] Address set:', connectRes.address);
        localStorage.setItem('mydoge_address', connectRes.address);

        console.log('💰 [WALLET] Fetching balance...');
        const balanceRes = await myDoge.getBalance();
        console.log('📊 [WALLET] Raw balance response:', balanceRes);

        // Parse balance with better error handling
        let balanceInDoge = 0;
        try {
          const rawBalance = parseFloat(balanceRes.balance);
          console.log('🔢 [WALLET] Raw balance number:', rawBalance);

          // Always convert satoshis to DOGE (1 DOGE = 100,000,000 satoshis)
          balanceInDoge = rawBalance / 100000000;
          console.log('💱 [WALLET] Converted satoshis to DOGE:', balanceInDoge);

        } catch (parseError) {
          console.error('❌ [WALLET] Balance parsing error:', parseError);
          balanceInDoge = 0;
        }

        console.log('💎 [WALLET] Final balance set:', balanceInDoge, 'DOGE');
        setBalance(balanceInDoge);
      } else {
        console.log('❌ [WALLET] Connection rejected by user');
        throw new Error('Connection was rejected by user');
      }
    } catch (error) {
      console.error('💥 [WALLET] Connection error:', error);
      throw error;
    } finally {
      console.log('🏁 [WALLET] Connection process completed');
      setConnecting(false);
    }
  }, [connected, myDoge, connecting]);

  const disconnect = useCallback(async () => {
    console.log('🔌 [WALLET] Disconnect function called...');

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    try {
      console.log('📞 [WALLET] Calling wallet.disconnect()...');
      const disconnectRes = await myDoge.disconnect();
      console.log('📋 [WALLET] Disconnect response:', disconnectRes);

      if (disconnectRes.disconnected) {
        console.log('✅ [WALLET] Successfully disconnected');
        setConnected(false);
        setAddress(null);
        setBalance(0);
        localStorage.removeItem('mydoge_address');
      }
    } catch (error) {
      console.error('💥 [WALLET] Disconnect error:', error);
      throw error;
    }
  }, [myDoge]);

  const sendTransaction = useCallback(async (recipientAddress: string, amount: number): Promise<string> => {
    console.log('💸 [WALLET] Send transaction called...');
    console.log('📍 [WALLET] Recipient:', recipientAddress);
    console.log('💰 [WALLET] Amount:', amount, 'DOGE');

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    if (!connected) {
      console.log('❌ [WALLET] Wallet not connected!');
      throw new Error('MyDoge wallet not connected!');
    }

    try {
      console.log('📞 [WALLET] Requesting transaction from wallet...');
      const txReqRes = await myDoge.requestTransaction({
        recipientAddress,
        dogeAmount: amount,
      });
      console.log('✅ [WALLET] Transaction successful! TXID:', txReqRes.txId);
      return txReqRes.txId;
    } catch (error) {
      console.error('💥 [WALLET] Transaction error:', error);
      throw error;
    }
  }, [connected, myDoge]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    console.log('✍️ [WALLET] Sign message called...');
    console.log('📝 [WALLET] Message:', message);

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    if (!connected) {
      console.log('❌ [WALLET] Wallet not connected!');
      throw new Error('MyDoge wallet not connected!');
    }

    try {
      console.log('📞 [WALLET] Requesting message signature...');
      const signMsgRes = await myDoge.requestSignedMessage({
        message,
      });
      console.log('✅ [WALLET] Message signed successfully!');
      return signMsgRes.signature;
    } catch (error) {
      console.error('💥 [WALLET] Message signing error:', error);
      throw error;
    }
  }, [connected, myDoge]);

  const signPSBT = useCallback(async (psbtHex: string): Promise<string> => {
    console.log('🔧 [WALLET] Sign PSBT called...');
    console.log('📄 [WALLET] Input hex size:', psbtHex.length, 'characters');

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    if (!connected) {
      console.log('❌ [WALLET] Wallet not connected!');
      throw new Error('MyDoge wallet not connected!');
    }

    // Check if the wallet supports PSBT signing
    if (!myDoge.requestPsbt) {
      console.log('⚠️ [WALLET] PSBT signing not supported by this wallet version');
      throw new Error('PSBT signing not supported by MyDoge wallet');
    }

    try {
      console.log('📞 [WALLET] Requesting signature from wallet...');

      // Detect if this is PSBT format (starts with magic bytes) or raw transaction
      const isPSBT = psbtHex.startsWith('70736274'); // PSBT magic bytes
      console.log('📄 [WALLET] Input format:', isPSBT ? 'PSBT' : 'Raw Transaction');
      console.log('📄 [WALLET] Input hex preview:', psbtHex.substring(0, 50) + '...');

      if (isPSBT) {
        // Use signPSBT for actual PSBT format
        if (myDoge.signPSBT) {
          console.log('🔧 [WALLET] Using signPSBT method for PSBT hex...');
          const signPsbtRes = await myDoge.signPSBT({
            psbtHex: psbtHex, // Use psbtHex parameter for signPSBT
            indexes: [0, 1], // Sign both inputs (buyer's payment inputs)
            signOnly: true, // Only sign, don't broadcast
            partial: true, // Keep as PSBT for backend combination
            feeOnly: false // Not fee-only - include the full transaction
          });

          console.log('✅ [WALLET] PSBT signed successfully with signPSBT!');
          console.log('📄 [WALLET] MyDoge response:', signPsbtRes);

          if (signPsbtRes?.signedRawTx) {
            return signPsbtRes.signedRawTx;
          } else {
            throw new Error('MyDoge signPSBT returned no signedRawTx');
          }
        } else {
          throw new Error('MyDoge signPSBT method not available');
        }
      } else {
        // Use requestPsbt for raw transaction hex
        console.log('🔧 [WALLET] Using requestPsbt method for raw transaction...');
        const signPsbtRes = await myDoge.requestPsbt({
          rawTx: psbtHex, // Pass raw transaction hex
          indexes: [0, 1], // Sign both inputs
          signOnly: true, // Only sign, don't broadcast
          partial: true, // Keep as PSBT for backend combination
          feeOnly: false // Not fee-only - include the full transaction
        });

        console.log('✅ [WALLET] Raw transaction signed successfully with requestPsbt!');
        console.log('📄 [WALLET] MyDoge response:', signPsbtRes);

        if (signPsbtRes?.signedRawTx) {
          return signPsbtRes.signedRawTx;
        } else {
          throw new Error('MyDoge requestPsbt returned no signedRawTx');
        }
      }
    } catch (error) {
      console.error('💥 [WALLET] PSBT signing error:', error);
      throw error;
    }
  }, [connected, myDoge]);

  const signPSBTOnly = useCallback(async (psbtHex: string): Promise<string> => {
    console.log('🔧 [WALLET] Sign PSBT Only called...');
    console.log('📄 [WALLET] Input hex size:', psbtHex.length, 'characters');

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    if (!connected) {
      console.log('❌ [WALLET] Wallet not connected!');
      throw new Error('MyDoge wallet not connected!');
    }

    // Check if the wallet supports PSBT signing
    if (!myDoge.requestPsbt) {
      console.log('⚠️ [WALLET] PSBT signing not supported by this wallet version');
      throw new Error('PSBT signing not supported by MyDoge wallet');
    }

    try {
      console.log('📞 [WALLET] Requesting PSBT signature from wallet...');

      // Detect if this is PSBT format (starts with magic bytes) or raw transaction
      const isPSBT = psbtHex.startsWith('70736274'); // PSBT magic bytes
      console.log('📄 [WALLET] Input format:', isPSBT ? 'PSBT' : 'Raw Transaction');
      console.log('📄 [WALLET] Input hex preview:', psbtHex.substring(0, 50) + '...');

      if (isPSBT) {
        // Use signPSBT for actual PSBT format
        if (myDoge.signPSBT) {
          console.log('🔧 [WALLET] Using signPSBT method for PSBT hex (sign only)...');
          const signPsbtRes = await myDoge.signPSBT({
            psbtHex: psbtHex, // Use psbtHex parameter for signPSBT
            indexes: [0, 1], // Sign both inputs (buyer's payment inputs)
            signOnly: true, // Only sign, don't broadcast
            partial: true, // Keep as PSBT for backend combination
            feeOnly: false // Not fee-only - include the full transaction
          });

          console.log('✅ [WALLET] PSBT signed successfully with signPSBT (sign only)!');
          console.log('📄 [WALLET] MyDoge response:', signPsbtRes);

          if (signPsbtRes?.signedPsbt) {
            return signPsbtRes.signedPsbt;
          } else {
            throw new Error('MyDoge signPSBT returned no signedPsbt');
          }
        } else {
          throw new Error('MyDoge signPSBT method not available');
        }
      } else {
        // Use requestPsbt for raw transaction hex
        console.log('🔧 [WALLET] Using requestPsbt method for raw transaction (sign only)...');
        const signPsbtRes = await myDoge.requestPsbt({
          rawTx: psbtHex, // Pass raw transaction hex
          indexes: [0, 1], // Sign both inputs
          signOnly: true, // Only sign, don't broadcast
          partial: true, // Keep as PSBT for backend combination
          feeOnly: false // Not fee-only - include the full transaction
        });

        console.log('✅ [WALLET] Raw transaction signed successfully with requestPsbt (sign only)!');
        console.log('📄 [WALLET] MyDoge response:', signPsbtRes);

        if (signPsbtRes?.signedPsbt) {
          return signPsbtRes.signedPsbt;
        } else {
          throw new Error('MyDoge requestPsbt returned no signedPsbt');
        }
      }
    } catch (error) {
      console.error('💥 [WALLET] PSBT signing error:', error);
      throw error;
    }
  }, [connected, myDoge]);

  const sendInscription = useCallback(async (recipientAddress: string, location: string): Promise<string> => {
    console.log('📤 [WALLET] Send inscription called...');
    console.log('📍 [WALLET] Recipient address:', recipientAddress);
    console.log('🎯 [WALLET] Inscription location:', location);

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    if (!connected) {
      console.log('❌ [WALLET] Wallet not connected!');
      throw new Error('MyDoge wallet not connected!');
    }

    try {
      console.log('📞 [WALLET] Requesting inscription transfer from wallet...');
      const transferRes = await myDoge.requestInscriptionTransaction({
        recipientAddress,
        location,
      });
      console.log('✅ [WALLET] Inscription transfer successful! TXID:', transferRes.txId);
      return transferRes.txId;
    } catch (error) {
      console.error('💥 [WALLET] Inscription transfer error:', error);
      throw error;
    }
  }, [connected, myDoge]);

  const getTransactionStatus = useCallback(async (txId: string) => {
    console.log('🔍 [WALLET] Get transaction status called...');
    console.log('🆔 [WALLET] TXID:', txId);

    if (!myDoge?.isMyDoge) {
      console.log('❌ [WALLET] MyDoge wallet not installed!');
      throw new Error('MyDoge wallet not installed!');
    }

    try {
      console.log('📞 [WALLET] Requesting transaction status...');
      const txStatusRes = await myDoge.getTransactionStatus({ txId });
      console.log('📊 [WALLET] Transaction status:', txStatusRes);
      return txStatusRes;
    } catch (error) {
      console.error('💥 [WALLET] Get transaction status error:', error);
      throw error;
    }
  }, [myDoge]);

  const value: UseMyDogeWalletReturn = {
    myDoge,
    connected,
    address,
    balance,
    connecting,
    connect,
    disconnect,
    sendTransaction,
    signMessage,
    signPSBT,
    signPSBTOnly,
    sendInscription,
    getTransactionStatus,
  };

  return (
    <MyDogeWalletContext.Provider value={value}>{children}</MyDogeWalletContext.Provider>
  );
}

export function useMyDogeWallet(): UseMyDogeWalletReturn {
  const ctx = useContext(MyDogeWalletContext);
  if (!ctx) {
    throw new Error('useMyDogeWallet must be used within a MyDogeWalletProvider');
  }
  return ctx;
}
