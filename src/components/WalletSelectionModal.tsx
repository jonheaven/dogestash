'use client';

import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import { useMyDogeWallet } from '../contexts/MyDogeWalletContext';
import { useNintondoWallet } from '../contexts/NintondoWalletContext';
import { useBrowserWallet } from '../contexts/BrowserWalletContext';
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
  const [connecting, setConnecting] = useState(false);

  // Safely access wallet objects with null checks
  const myDoge = myDogeContext?.myDoge || null;
  const nintondo = nintondoContext?.nintondo || null;
  const dojak = typeof window !== 'undefined' && window.dojak?.isDojak ? window.dojak : null;

  useEffect(() => {
    const checkBrowserWallet = async () => {
      const exists = await hasWallet();
      setHasBrowserWallet(exists);
    };
    if (isOpen) {
      checkBrowserWallet();
      // Force a re-check of wallet availability when modal opens
      // This helps catch wallets that might have loaded after initial detection
      const checkInterval = setInterval(() => {
        // The contexts will update their state, which will trigger re-renders
        // We just need to ensure the modal re-renders when wallets are detected
      }, 500);

      // Stop checking after 5 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, hasWallet, myDogeContext?.myDoge, nintondoContext?.nintondo]);

  if (!isOpen) return null;

  const handleConnect = async (type: 'mydoge' | 'nintondo' | 'browser' | 'dojak') => {
    try {
      setConnecting(true);
      if (type === 'browser') {
        // Open browser wallet modal
        console.log('🔵 [WALLET SELECTION] Opening browser wallet modal...');
        setShowBrowserWallet(true);
        return;
      }
      await connect(type);
      onClose();
    } catch (error: any) {
      console.error('Connection error:', error);
      // Note: Toast error handling is done in the unified wallet context
    } finally {
      setConnecting(false);
    }
  };

  const handleBrowserWalletClose = () => {
    setShowBrowserWallet(false);
    // If wallet was created/connected, close the selection modal too
    if (walletType === 'browser') {
      onClose();
    }
  };

  console.log('🔵 [WALLET SELECTION] Rendering, showBrowserWallet:', showBrowserWallet);

  return (
    <>
      {showBrowserWallet && (
        <BrowserWalletModal
          isOpen={showBrowserWallet}
          onClose={handleBrowserWalletClose}
        />
      )}
      {!showBrowserWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl sansation-bold text-white">Connect Wallet</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

                   <div className="space-y-3">
                     {/* Local Wallet */}
                     <button
                       onClick={() => {
                         console.log('🟢 [WALLET SELECTION] Local Wallet button clicked');
                         handleConnect('browser');
                       }}
                       disabled={connecting}
                       className="w-full p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
                     >
                       <div className="flex items-center space-x-3">
                         <Monitor className="w-6 h-6" />
                         <div className="text-left">
                           <div className="text-white sansation-bold">Local Wallet</div>
                           <div className="text-sm text-gray-300 sansation-regular">
                             {hasBrowserWallet ? 'Create/Import Wallet' : 'Create/Import Wallet'}
                           </div>
                         </div>
                       </div>
                       <span className="text-xs text-gray-300">Local</span>
                     </button>

                     {/* Dojak Wallet */}
                     <button
                       onClick={() => handleConnect('dojak')}
                       disabled={!dojak || connecting}
                       className="w-full p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
                     >
                       <div className="flex items-center space-x-3">
                         <img
                           src="/dojak.png"
                           alt="Dojak Wallet"
                           className="w-8 h-8"
                         />
                         <div className="text-left">
                           <div className="text-white sansation-bold">Dojak</div>
                           <div className="text-sm text-gray-300 sansation-regular">
                             {dojak ? 'Native Dogecoin & Doginals' : 'Not Installed'}
                           </div>
                         </div>
                       </div>
                       {!dojak && (
                         <span className="text-xs text-gray-400">Install</span>
                       )}
                     </button>

                     {/* MyDoge Wallet */}
                     <button
                       onClick={() => handleConnect('mydoge')}
                       disabled={!myDoge || connecting}
                       className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
                     >
                       <div className="flex items-center space-x-3">
                         <img
                           src="/mydoge.png"
                           alt="MyDoge Wallet"
                           className="w-8 h-8 rounded"
                         />
                         <div className="text-left">
                           <div className="text-white sansation-bold">MyDoge Wallet</div>
                           <div className="text-sm text-gray-300 sansation-regular">
                             {myDoge ? 'Browser Extension' : 'Not Installed'}
                           </div>
                         </div>
                       </div>
                       {!myDoge && (
                         <span className="text-xs text-gray-400">Install</span>
                       )}
                     </button>

                     {/* Nintondo Wallet */}
                     <button
                       onClick={() => handleConnect('nintondo')}
                       disabled={!nintondo || connecting}
                       className="w-full p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-between"
                     >
                       <div className="flex items-center space-x-3">
                         <img
                           src="/nintondo.jpg"
                           alt="Nintondo Wallet"
                           className="w-8 h-8 rounded"
                         />
                         <div className="text-left">
                           <div className="text-white sansation-bold">Nintondo Wallet</div>
                           <div className="text-sm text-gray-300 sansation-regular">
                             {nintondo ? 'Browser Extension' : 'Not Installed'}
                           </div>
                         </div>
                       </div>
                       {!nintondo && (
                         <span className="text-xs text-gray-400">Install</span>
                       )}
                     </button>
                   </div>

          <div className="mt-6 text-xs text-gray-400 sansation-regular text-center">
            Your wallet connection is stored locally and never shared with our servers.
          </div>
          </div>
        </div>
      )}
    </>
  );
}
