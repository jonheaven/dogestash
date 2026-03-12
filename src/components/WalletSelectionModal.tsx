'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Monitor, ShieldCheck } from 'lucide-react';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import { useMyDogeWallet } from '../contexts/MyDogeWalletContext';
import { useNintondoWallet } from '../contexts/NintondoWalletContext';
import { useBrowserWallet } from '../contexts/BrowserWalletContext';
import { LedgerWallet } from '../lib/ledger-wallet';
import BrowserWalletModal from './BrowserWalletModal';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletSelectionModal({ isOpen, onClose }: WalletSelectionModalProps) {
  const { connect, walletType } = useUnifiedWallet();
  const myDogeContext = useMyDogeWallet();
  const nintondoContext = useNintondoWallet();
  const { hasWallet } = useBrowserWallet();

  const [showBrowserWallet, setShowBrowserWallet] = useState(false);
  const [hasBrowserWallet, setHasBrowserWallet] = useState(false);
  const [ledgerSupported, setLedgerSupported] = useState(false);
  const [connectingType, setConnectingType] = useState<
    'mydoge' | 'nintondo' | 'browser' | 'dojak' | 'ledger' | null
  >(null);

  const myDoge = myDogeContext?.myDoge || null;
  const nintondo = nintondoContext?.nintondo || null;
  const dojak = typeof window !== 'undefined' && window.dojak?.isDojak ? window.dojak : null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void (async () => {
      setHasBrowserWallet(await hasWallet());
      setLedgerSupported(await LedgerWallet.isSupported());
    })();
  }, [hasWallet, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleConnect = async (type: 'mydoge' | 'nintondo' | 'browser' | 'dojak' | 'ledger') => {
    try {
      setConnectingType(type);
      if (type === 'browser') {
        setShowBrowserWallet(true);
        return;
      }
      await connect(type);
      onClose();
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setConnectingType(null);
    }
  };

  const handleBrowserWalletClose = () => {
    setShowBrowserWallet(false);
    if (walletType === 'browser') {
      onClose();
    }
  };

  const connecting = connectingType !== null;
  const ledgerConnecting = connectingType === 'ledger';

  return (
    <>
      {showBrowserWallet && (
        <BrowserWalletModal isOpen={showBrowserWallet} onClose={handleBrowserWalletClose} />
      )}
      {!showBrowserWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl sansation-bold text-white">Connect Wallet</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleConnect('ledger')}
                disabled={!ledgerSupported || connecting}
                className="w-full rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-4 py-4 shadow-lg shadow-emerald-950/30 transition-all hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:border-gray-700 disabled:from-gray-800 disabled:via-gray-800 disabled:to-gray-800 disabled:shadow-none flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-white/10 p-2 ring-1 ring-white/15">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-white sansation-bold">
                      Connect Ledger (Recommended)
                    </div>
                    <div className="text-sm text-emerald-50/90 sansation-regular">
                      Hardware signing over WebUSB with keys kept off-device
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50">
                  {ledgerConnecting ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Connecting
                    </span>
                  ) : ledgerSupported ? (
                    'WebUSB Ready'
                  ) : (
                    'WebUSB Required'
                  )}
                </span>
              </button>

              <button
                onClick={() => handleConnect('browser')}
                disabled={connecting}
                className="w-full p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Monitor className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-white sansation-bold">Local Wallet</div>
                    <div className="text-sm text-gray-300 sansation-regular">
                      {hasBrowserWallet
                        ? 'Open secure backup, import, or HD accounts'
                        : 'Create or import a browser wallet'}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-300">Local</span>
              </button>

              <button
                onClick={() => handleConnect('dojak')}
                disabled={!dojak || connecting}
                className="w-full p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img src="/dojak.png" alt="Dojak Wallet" className="w-8 h-8" />
                  <div className="text-left">
                    <div className="text-white sansation-bold">Dojak</div>
                    <div className="text-sm text-gray-300 sansation-regular">
                      {dojak ? 'Native Dogecoin & Doginals' : 'Not Installed'}
                    </div>
                  </div>
                </div>
                {!dojak && <span className="text-xs text-gray-400">Install</span>}
              </button>

              <button
                onClick={() => handleConnect('mydoge')}
                disabled={!myDoge || connecting}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img src="/mydoge.png" alt="MyDoge Wallet" className="w-8 h-8 rounded" />
                  <div className="text-left">
                    <div className="text-white sansation-bold">MyDoge Wallet</div>
                    <div className="text-sm text-gray-300 sansation-regular">
                      {myDoge ? 'Browser Extension' : 'Not Installed'}
                    </div>
                  </div>
                </div>
                {!myDoge && <span className="text-xs text-gray-400">Install</span>}
              </button>

              <button
                onClick={() => handleConnect('nintondo')}
                disabled={!nintondo || connecting}
                className="w-full p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img src="/nintondo.jpg" alt="Nintondo Wallet" className="w-8 h-8 rounded" />
                  <div className="text-left">
                    <div className="text-white sansation-bold">Nintondo Wallet</div>
                    <div className="text-sm text-gray-300 sansation-regular">
                      {nintondo ? 'Browser Extension' : 'Not Installed'}
                    </div>
                  </div>
                </div>
                {!nintondo && <span className="text-xs text-gray-400">Install</span>}
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-400 sansation-regular text-center">
              Keys stay local. Browser wallets use Web Crypto encryption, and Ledger is the
              recommended hardware path.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
