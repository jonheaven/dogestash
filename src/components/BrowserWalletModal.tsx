'use client';

import { useState, useEffect } from 'react';
import { PawPrint } from 'lucide-react';
import { useBrowserWallet } from '../contexts/BrowserWalletContext';

interface BrowserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'wallet' | 'create' | 'import' | 'secrets' | 'password' | 'nickname' | 'qr' | 'privqr' | 'auth' | 'remove' | 'change-password';

export default function BrowserWalletModal({ isOpen, onClose }: BrowserWalletModalProps) {
  const { connected, address, balance, wallet, disconnect, refreshBalance, removeWallet, hasWallet, saveWallet, connect, updateNickname } = useBrowserWallet();
  const [viewMode, setViewMode] = useState<ViewMode>('wallet');
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'inscriptions' | 'listings'>('inscriptions');
  const [copied, setCopied] = useState(false);
  const [usdValue, setUsdValue] = useState(0);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<any>(null); // Store wallet being created before password step
  const [unlockedWallet, setUnlockedWallet] = useState<any>(null); // Wallet unlocked for sensitive views
  const [pendingTarget, setPendingTarget] = useState<'secrets' | 'privqr' | null>(null);

  useEffect(() => {
    console.log('🟢 [BROWSER WALLET MODAL] Modal state changed:', { isOpen, connected, viewMode });
  }, [isOpen, connected, viewMode]);

  // Check if wallet has been backed up
  useEffect(() => {
    if (wallet) {
      const backedUp = localStorage.getItem(`wallet_backed_up_${wallet.address}`);
      const hasMnemonic = localStorage.getItem(`wallet_mnemonic_${wallet.address}`);
      
      // If wallet was imported from mnemonic, it's already backed up
      // If wallet was created and has mnemonic, check if user confirmed they saved it
      if (hasMnemonic && !backedUp) {
        // Wallet has mnemonic but user hasn't confirmed backup - only show for newly created wallets
        // For imported wallets, we'll assume they're backed up since they provided the mnemonic
        // Check if this is a newly created wallet (created in this session vs imported)
        const wasCreated = localStorage.getItem(`wallet_created_${wallet.address}`);
        setHasBackedUp(!wasCreated); // If not created (imported), mark as backed up
      } else {
        setHasBackedUp(!!backedUp || !!hasMnemonic); // Backed up if confirmed or has mnemonic (imported)
      }
    }
  }, [wallet]);

  // Reset view when modal opens/closes
  useEffect(() => {
    if (isOpen && connected) {
      console.log('🟢 [BROWSER WALLET MODAL] Wallet connected, showing wallet view');
      setViewMode('wallet');
      refreshBalance();
    } else if (isOpen && !connected) {
      console.log('🟢 [BROWSER WALLET MODAL] Wallet not connected, showing create view');
      setViewMode('create');
    }
  }, [isOpen, connected, refreshBalance]);

  useEffect(() => {
    if (isOpen) {
      console.log('🟢 [BROWSER WALLET MODAL] Modal opened, viewMode:', viewMode, 'connected:', connected);
    }
  }, [isOpen, viewMode, connected]);

  if (!isOpen) {
    console.log('🔴 [BROWSER WALLET MODAL] Modal is not open, returning null');
    return null;
  }

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackup = () => {
    setViewMode('secrets');
  };

  const handleShowSecrets = async () => {
    setShowMenu(false);
    // If wallet storage is encrypted or we don't have mnemonic in memory, require password unlock first
    try {
      const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
      const walletAddress = wallet?.address || address;
      const needsUnlock = walletAddress ? await storage.isEncrypted(walletAddress) : false;
      if (needsUnlock || !wallet) {
        setViewMode('auth');
        setPendingTarget('secrets');
        return;
      }
    } catch {
      setViewMode('auth');
      setPendingTarget('secrets');
      return;
    }
    setViewMode('secrets');
  };

  const handleRemoveWallet = () => {
    setViewMode('remove');
    setShowMenu(false);
  };

  const handleConfirmRemove = async () => {
    try {
      await removeWallet();
      setViewMode('create');
      onClose();
    } catch (error) {
      console.error('Failed to remove wallet:', error);
    }
  };

  // Initial view - Create new wallet or Import
  if (viewMode === 'create' && !connected) {
    return (
      <CreateWalletView
        onBack={onClose}
        onImport={() => setViewMode('import')}
        onCreated={(wallet, mnemonic) => {
          // Store wallet temporarily (will be saved after password step)
          setPendingWallet(wallet);

          // If we have a mnemonic (older implementation), store it and show secrets view first.
          if (mnemonic && wallet) {
            localStorage.setItem(`wallet_mnemonic_${wallet.address}`, mnemonic);
            setViewMode('secrets');
            return;
          }

          // No mnemonic available (doge-sdk path) – go straight to password setup.
          if (wallet) {
            setViewMode('password');
          }
        }}
      />
    );
  }

  // Import wallet view
  if (viewMode === 'import') {
    return (
      <ImportWalletView
        onBack={() => setViewMode('create')}
        onSuccess={() => {
          setViewMode('wallet');
          refreshBalance();
        }}
      />
    );
  }

  // Secrets view (show mnemonic) - can be shown after creation or from menu
  if (viewMode === 'secrets') {
    // Get mnemonic from localStorage if available
    const storedMnemonic = wallet ? localStorage.getItem(`wallet_mnemonic_${wallet.address}`) : null;
    const mnemonicForView = storedMnemonic || (pendingWallet ? localStorage.getItem(`wallet_mnemonic_${pendingWallet.address}`) : null);
    
    return (
      <SecretsView
        wallet={wallet || pendingWallet}
        mnemonicProp={mnemonicForView || undefined}
        onBack={() => {
          if (connected) {
            setViewMode('wallet');
          } else {
            setViewMode('create');
            setPendingWallet(null);
          }
        }}
        onSaved={() => {
          const currentWallet = wallet || pendingWallet;
          if (currentWallet) {
            localStorage.setItem(`wallet_backed_up_${currentWallet.address}`, 'true');
            setHasBackedUp(true);
          }
          // After confirming backup, go to password screen (for new wallets) or wallet view (for existing)
          if (pendingWallet) {
            // New wallet creation flow - go to password screen
            setViewMode('password');
          } else if (connected) {
            // Existing wallet - just go back
            setViewMode('wallet');
          }
        }}
      />
    );
  }

  // Password view - shown after seed phrase during wallet creation or from menu
  if (viewMode === 'password') {
    return (
      <SetPasswordView
        wallet={pendingWallet || wallet}
        onBack={() => {
          if (pendingWallet) {
            setViewMode('secrets'); // Go back to seed phrase during creation
          } else {
            setViewMode('wallet'); // Go back to wallet from menu
          }
        }}
        onSkip={async (nickname?: string) => {
          const walletToSave = pendingWallet || wallet;
          if (walletToSave) {
            if (nickname) walletToSave.nickname = nickname;
            await saveWallet(walletToSave); // Save without password
            if (pendingWallet) {
              // New wallet - connect after saving
              localStorage.setItem('wallet_type', 'browser');
              await connect(walletToSave);
              setPendingWallet(null);
            }
            setViewMode('wallet');
          }
        }}
        onSetPassword={async (password: string, nickname?: string) => {
          const walletToSave = pendingWallet || wallet;
          if (walletToSave) {
            if (nickname) walletToSave.nickname = nickname;
            await saveWallet(walletToSave, password); // Save with password
            if (pendingWallet) {
              // New wallet - connect after saving
              localStorage.setItem('wallet_type', 'browser');
              await connect(walletToSave);
              setPendingWallet(null);
            }
            setViewMode('wallet');
          }
        }}
      />
    );
  }

  // Auth view - prompt for password to unlock sensitive actions
  if (viewMode === 'auth') {
    return (
      <PasswordPromptView
        onCancel={() => setViewMode('wallet')}
        onVerify={async (password: string) => {
          try {
            const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
            const walletAddress = wallet?.address || address;
            // Check if wallet is encrypted first
            const isEncrypted = walletAddress ? await storage.isEncrypted(walletAddress) : false;
            if (isEncrypted) {
              // Encrypted wallet - require password
              const loaded = await storage.loadWallet(password, walletAddress || undefined);
              if (loaded && loaded.privateKey) {
                setUnlockedWallet(loaded);
                setViewMode(pendingTarget || 'wallet');
                setPendingTarget(null);
                return true;
              }
            } else {
              // Unencrypted wallet - try loading without password, but still require user confirmation
              // For unencrypted wallets, we accept any password (or empty) as confirmation
              // This is less secure but allows viewing private key for unencrypted wallets
              const loaded = await storage.loadWallet(undefined, walletAddress || undefined);
              if (loaded && loaded.privateKey) {
                setUnlockedWallet(loaded);
                setViewMode(pendingTarget || 'wallet');
                setPendingTarget(null);
                return true;
              }
            }
          } catch {}
          return false;
        }}
      />
    );
  }

  // Change password view - requires current password first, then allows setting new password
  if (viewMode === 'change-password') {
    return (
      <ChangePasswordView
        wallet={wallet}
        onCancel={() => setViewMode('wallet')}
        onCurrentPasswordVerified={async (currentPassword: string) => {
          // Verify current password works, then unlock wallet for password change
          try {
            const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
            const walletAddress = wallet?.address || address;
            const loaded = await storage.loadWallet(currentPassword, walletAddress || undefined);
            if (loaded && loaded.privateKey) {
              // Store verified wallet temporarily for password change
              setUnlockedWallet(loaded);
              return true;
            }
          } catch {}
          return false;
        }}
        onPasswordChanged={async (newPassword: string, nickname?: string) => {
          // Save wallet with new password
          const walletToSave = unlockedWallet || wallet;
          if (walletToSave) {
            if (nickname) walletToSave.nickname = nickname;
            await saveWallet(walletToSave, newPassword);
            setUnlockedWallet(null);
            setViewMode('wallet');
          }
        }}
      />
    );
  }

  // Nickname view - set nickname for current wallet
  if (viewMode === 'nickname') {
    return (
      <SetNicknameView
        wallet={wallet}
        onBack={() => setViewMode('wallet')}
        onSave={async (nickname?: string) => {
          if (wallet) {
            await updateNickname(wallet.address, nickname);
          }
          setViewMode('wallet');
        }}
      />
    );
  }

  // QR view - show address QR code
  if (viewMode === 'qr') {
    return (
      <AddressQRView
        address={address || wallet?.address}
        onBack={() => setViewMode('wallet')}
      />
    );
  }

  // Private key QR view
  if (viewMode === 'privqr') {
    return (
      <PrivateKeyQRView
        privateKey={unlockedWallet?.privateKey}
        onBack={() => setViewMode('wallet')}
      />
    );
  }

  // Remove wallet confirmation
  if (viewMode === 'remove') {
    return (
      <RemoveWalletView
        onCancel={() => setViewMode('wallet')}
        onConfirm={handleConfirmRemove}
      />
    );
  }

  // Main wallet view
  console.log('🟢 [BROWSER WALLET MODAL] Rendering main wallet view, isOpen:', isOpen, 'connected:', connected);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <PawPrint className="w-6 h-6" />
            <div className="flex-1 min-w-0">
              <div className="text-white sansation-bold text-lg truncate">{wallet?.nickname ? wallet.nickname : address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Wallet'}</div>
              {copied && (
                <div className="text-xs text-green-400">Address copied!</div>
              )}
            </div>
            <button
              onClick={handleCopyAddress}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Copy address"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshBalance}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Send"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Menu"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-10">
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      await disconnect();
                      // keep wallet stored, just disconnect UI state
                    }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 rounded-t-lg flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                    </svg>
                    <span>Disconnect wallet</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      // Check if wallet is already encrypted - require current password to change it
                      try {
                        const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
                        const walletAddress = wallet?.address || address;
                        const isEncrypted = walletAddress ? await storage.isEncrypted(walletAddress) : false;
                        if (isEncrypted) {
                          // Require current password before allowing change
                          setPendingTarget(null); // Not unlocking for sensitive view, just for password change
                          setViewMode('change-password');
                        } else {
                          // No password set, can set one directly
                          setViewMode('password');
                        }
                      } catch {
                        // If check fails, allow password set (safer default)
                        setViewMode('password');
                      }
                    }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Set password</span>
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setViewMode('qr'); }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 7v-7h7v7h-7z" />
                    </svg>
                    <span>Show address</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      // Check if wallet is encrypted - if not, we can show private key directly
                      try {
                        const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
                        const walletAddress = wallet?.address || address;
                        const isEncrypted = walletAddress ? await storage.isEncrypted(walletAddress) : false;
                        if (isEncrypted) {
                          // Encrypted wallet - require password
                          setPendingTarget('privqr');
                          setViewMode('auth');
                        } else {
                          // Unencrypted wallet - check if we have private key in memory
                          if (wallet?.privateKey) {
                            // We have it in memory, show directly
                            setUnlockedWallet(wallet);
                            setViewMode('privqr');
                          } else {
                            // Try to load wallet without password to get private key
                            try {
                              const loaded = await storage.loadWallet(undefined, walletAddress || undefined);
                              if (loaded?.privateKey) {
                                setUnlockedWallet(loaded);
                                setViewMode('privqr');
                              } else {
                                // Fallback: require password anyway (defensive)
                                setPendingTarget('privqr');
                                setViewMode('auth');
                              }
                            } catch {
                              // Fallback: require password anyway (defensive)
                              setPendingTarget('privqr');
                              setViewMode('auth');
                            }
                          }
                        }
                      } catch {
                        // Fallback: require password anyway (defensive)
                        setPendingTarget('privqr');
                        setViewMode('auth');
                      }
                    }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 7v-7h7v7h-7z" />
                    </svg>
                    <span>Show private key</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setViewMode('nickname');
                    }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Set nickname</span>
                  </button>
                  <button
                    onClick={handleShowSecrets}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Show secrets</span>
                  </button>
                  <button
                    onClick={handleRemoveWallet}
                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-600 rounded-b-lg flex items-center space-x-2 sansation-regular"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remove wallet</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center space-x-2 mb-4">
          <PawPrint className="w-6 h-6" />
          <div className="text-white sansation-bold text-xl">
            {balance.toFixed(8)} DOGE
          </div>
        </div>


        {/* Backup needed banner */}
        {!hasBackedUp && (
          <div className="bg-orange-900/50 border border-orange-500/50 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-orange-200 sansation-bold mb-1">Backup needed</div>
              <div className="text-orange-300 text-sm sansation-regular">Save your secret phrase to protect wallet.</div>
            </div>
            <button
              onClick={handleBackup}
              className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors sansation-bold text-sm"
            >
              Backup now
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('inscriptions')}
            className={`pb-2 px-1 sansation-bold transition-colors ${
              activeTab === 'inscriptions'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Inscriptions
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-2 px-1 sansation-bold transition-colors ${
              activeTab === 'listings'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Listings
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[200px] flex items-center justify-center">
          {activeTab === 'inscriptions' ? (
            <div className="text-center">
              <PawPrint className="w-16 h-16 mb-4 opacity-50" />
              <div className="text-white sansation-bold text-lg mb-2">No inscriptions found</div>
              <div className="text-gray-400 text-sm sansation-regular">
                Import a wallet with existing inscriptions or purchase from the marketplace.
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-50">📋</div>
              <div className="text-white sansation-bold text-lg mb-2">No listings found</div>
              <div className="text-gray-400 text-sm sansation-regular">
                Create a listing to sell your inscriptions.
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-colors sansation-regular"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Set nickname view
function SetNicknameView({ wallet, onBack, onSave }: { wallet: any; onBack: () => void; onSave: (nickname?: string) => void }) {
  const [nickname, setNickname] = useState<string>(wallet?.nickname || '');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl sansation-bold text-white mb-4">Set nickname</h2>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Optional nickname"
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular mb-4"
        />
        <div className="flex space-x-2">
          <button onClick={onBack} className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular">Cancel</button>
          <button onClick={() => onSave(nickname || undefined)} className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold">Save</button>
        </div>
      </div>
    </div>
  );
}

function AddressQRView({ address, onBack }: { address?: string | null; onBack: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const QR = await import('qrcode');
        const data = await QR.toDataURL(address || '');
        setQrDataUrl(data);
      } catch (e) {
        console.error('QR generation failed:', e);
        setQrDataUrl(null);
      }
    })();
  }, [address]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'wallet-address-qr.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <h2 className="text-xl sansation-bold text-white mb-4">Receive DOGE</h2>
        <p className="text-gray-300 text-sm sansation-regular mb-4 break-all">{address}</p>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Wallet QR" className="mx-auto w-56 h-56 bg-white rounded p-2" />
        ) : (
          <div className="text-gray-400">Generating QR...</div>
        )}
        <div className="flex space-x-2 mt-6">
          <button onClick={onBack} className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular">Close</button>
          <button onClick={handleDownload} disabled={!qrDataUrl} className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold disabled:bg-gray-600 disabled:text-gray-300">Download</button>
        </div>
      </div>
    </div>
  );
}

function PrivateKeyQRView({ privateKey, onBack }: { privateKey?: string | null; onBack: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        if (!privateKey || privateKey.length === 0) {
          setError('Private key unavailable. Unlock wallet first.');
          setQrDataUrl(null);
          return;
        }
        const QR = await import('qrcode');
        const data = await QR.toDataURL(privateKey);
        setQrDataUrl(data);
        setError(null);
      } catch (e) {
        console.error('QR generation failed:', e);
        setQrDataUrl(null);
        setError('Failed to generate QR');
      }
    })();
  }, [privateKey]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'private-key-qr.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <h2 className="text-xl sansation-bold text-white mb-4">Private Key (WIF)</h2>
        <p className="text-red-400 text-sm sansation-regular mb-2">Never share this QR or key. Anyone can spend your funds.</p>
        <p className="text-gray-300 text-sm sansation-regular mb-4 break-all">{privateKey}</p>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Private Key QR" className="mx-auto w-56 h-56 bg-white rounded p-2" />
        ) : (
          <div className="text-gray-400">{error || 'Generating QR...'}</div>
        )}
        <div className="flex space-x-2 mt-6">
          <button onClick={onBack} className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular">Close</button>
          <button onClick={handleDownload} disabled={!qrDataUrl} className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold disabled:bg-gray-600 disabled:text-gray-300">Download</button>
        </div>
      </div>
    </div>
  );
}

// Import wallet component
function ImportWalletView({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { importWallet, saveWallet, connect, disconnect, connected } = useBrowserWallet();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!input.trim()) {
      setError('Please enter a mnemonic phrase or private key');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (connected) {
        await disconnect();
      }

      // Import private key (mnemonic import removed - requires Node.js libraries)
      let wallet;

      wallet = await importWallet(input.trim());
      // For private key imports, mark as backed up (they have the private key)
      if (wallet) {
        localStorage.setItem(`wallet_backed_up_${wallet.address}`, 'true');
        localStorage.removeItem(`wallet_created_${wallet.address}`);
      }

      await saveWallet(wallet);
      // Connect to unified wallet through localStorage (set before connecting)
      localStorage.setItem('wallet_type', 'browser');
      await connect(wallet);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl sansation-bold text-white mb-4">Import wallet</h2>
        <p className="text-gray-300 text-sm sansation-regular mb-4">
          Enter your 12-word phrase or private key:
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular font-mono text-sm mb-4"
          placeholder="word1 word2 word3 ... or cT8kr4WCZuuY2wAQw9oavaCKWm3BSrsTGrzhvaSazfYgEREovZWf"
          rows={4}
        />
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2 text-sm text-red-200 sansation-regular mb-4">
            {error}
          </div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={onBack}
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular"
          >
            Go back
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !input.trim()}
            className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors sansation-bold"
          >
            {loading ? 'Importing...' : 'Import wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Create wallet view
function CreateWalletView({ onBack, onImport, onCreated }: { 
  onBack: () => void; 
  onImport: () => void;
  onCreated: (wallet: any, mnemonic: string) => void;
}) {
  const { createWallet, saveWallet, connect, disconnect, connected, listWallets, selectWallet } = useBrowserWallet();
  const [loading, setLoading] = useState(false);
  const [savedWallets, setSavedWallets] = useState<any[]>([]);
  const [passwordPrompt, setPasswordPrompt] = useState<{ address: string; nickname?: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const wallets = await listWallets();
        setSavedWallets(wallets);
      } catch {}
    })();
  }, [listWallets]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      if (connected) {
        await disconnect();
      }
      const walletWithMnemonic = await createWallet();
      const { mnemonic, ...wallet } = walletWithMnemonic;
      // Don't save yet - wait for password step
      if (wallet) {
        if (mnemonic) {
          // New wallet with mnemonic – mark as created and require backup
          localStorage.setItem(`wallet_created_${wallet.address}`, 'true');
          localStorage.removeItem(`wallet_backed_up_${wallet.address}`);
        } else {
          // No mnemonic available (doge-sdk path) – treat as already backed up like imported wallets
          localStorage.setItem(`wallet_backed_up_${wallet.address}`, 'true');
          localStorage.removeItem(`wallet_created_${wallet.address}`);
        }
      }
      onCreated(wallet, mnemonic as any);
    } catch (error) {
      console.error('Failed to create wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordPrompt) return;
    if (!passwordInput) {
      setPasswordError('Please enter password');
      return;
    }
    setPasswordError(null);
    try {
      const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
      const loaded = await storage.loadWallet(passwordInput, passwordPrompt.address);
      if (loaded && loaded.privateKey) {
        localStorage.setItem('wallet_type', 'browser');
        await connect(loaded);
        setPasswordPrompt(null);
        setPasswordInput('');
      } else {
        setPasswordError('Incorrect password');
        setPasswordInput('');
      }
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to unlock wallet');
      setPasswordInput('');
    }
  };

  return (
    <>
      {passwordPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl sansation-bold text-white mb-4">Unlock Wallet</h2>
            <p className="text-gray-300 text-sm sansation-regular mb-4">
              Enter password for {passwordPrompt.nickname || `${passwordPrompt.address.slice(0, 8)}...${passwordPrompt.address.slice(-6)}`}:
            </p>
            <div className="mb-4">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
                placeholder="Password"
                autoFocus
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular"
              />
            </div>
            {passwordError && (
              <div className="text-red-400 text-sm mb-4 sansation-regular">{passwordError}</div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setPasswordPrompt(null);
                  setPasswordInput('');
                  setPasswordError(null);
                }}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!passwordInput}
                className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold disabled:bg-gray-600 disabled:text-gray-300"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl sansation-bold text-white mb-4">Local Wallet</h2>
          <p className="text-gray-300 sansation-regular mb-6">
            This marketplace includes a built-in wallet that runs entirely in your browser. No browser extension required. Your private keys are stored locally and never sent to our servers.
          </p>
        {savedWallets.length > 0 && (
          <div className="mb-6">
            <div className="text-white sansation-bold mb-2">Saved wallets</div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {savedWallets.map((w) => (
                <div key={w.address} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {w.encrypted && <span className="text-lg">🔒</span>}
                    <div className="text-gray-200 sansation-regular truncate">{w.nickname || `${w.address.slice(0, 8)}...${w.address.slice(-6)}`}</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const storage = new (await import('../lib/browser-wallet')).BrowserWallet();
                        const isEncrypted = await storage.isEncrypted(w.address);
                        if (isEncrypted) {
                          // Encrypted wallet - show password prompt
                          setPasswordPrompt({ address: w.address, nickname: w.nickname });
                          setPasswordInput('');
                          setPasswordError(null);
                        } else {
                          // Unencrypted wallet - connect directly
                          const selected = await selectWallet(w.address);
                          if (selected) {
                            localStorage.setItem('wallet_type', 'browser');
                            await connect(selected);
                          }
                        }
                      } catch (error: any) {
                        alert(error.message || 'Failed to connect wallet');
                      }
                    }}
                    className="px-3 py-1 bg-white text-gray-900 rounded hover:bg-gray-100 sansation-bold text-sm flex-shrink-0"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full p-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors sansation-bold"
          >
            {loading ? 'Creating...' : 'Create new wallet'}
          </button>
          <button
            onClick={onImport}
            className="w-full p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors sansation-bold"
          >
            Import wallet
          </button>
          <button
            onClick={onBack}
            className="w-full p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors sansation-regular border border-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// Secrets view (mnemonic display)
function SecretsView({ 
  wallet, 
  onBack, 
  onSaved,
  mnemonicProp 
}: { 
  wallet: any; 
  onBack: () => void; 
  onSaved: () => void;
  mnemonicProp?: string;
}) {
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // If mnemonic is provided as prop (from wallet creation), use it
    if (mnemonicProp) {
      setMnemonic(mnemonicProp.split(' '));
      return;
    }
    
    // Otherwise, try to get from localStorage
    if (wallet) {
      const storedMnemonic = localStorage.getItem(`wallet_mnemonic_${wallet.address}`);
      if (storedMnemonic) {
        setMnemonic(storedMnemonic.split(' '));
      } else {
        setMnemonic([]);
      }
    }
  }, [wallet, mnemonicProp]);

  const handleCopy = () => {
    if (mnemonic.length > 0) {
      navigator.clipboard.writeText(mnemonic.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (mnemonic.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-xl sansation-bold text-white mb-4">Your secret phrase</h2>
          <p className="text-gray-300 text-sm sansation-regular mb-4">
            This wallet was imported without a mnemonic phrase. Only the private key is stored.
          </p>
          <button
            onClick={onBack}
            className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl sansation-bold text-white mb-4">Your secret phrase:</h2>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {mnemonic.map((word, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-3 flex items-center space-x-2">
              <span className="text-gray-400 text-sm sansation-regular">{index + 1}.</span>
              <span className="text-white sansation-bold">{word}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular mb-4 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{copied ? 'Copied!' : 'Copy to clipboard'}</span>
        </button>

        <p className="text-gray-300 text-sm sansation-regular mb-4">
          Anyone who knows these words can access your funds. Keep this phrase secure and never share it with anyone.
        </p>

        <div className="flex space-x-2">
          <button
            onClick={onBack}
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular"
          >
            Go back
          </button>
          <button
            onClick={onSaved}
            className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold"
          >
            I've saved these words
          </button>
        </div>
      </div>
    </div>
  );
}

// Set password view
function SetPasswordView({
  wallet,
  onBack,
  onSkip,
  onSetPassword,
}: {
  wallet: any;
  onBack: () => void;
  onSkip: (nickname?: string) => void;
  onSetPassword: (password: string, nickname?: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nickname, setNickname] = useState<string>(wallet?.nickname || '');

  const passwordsMatch = password === confirmPassword && password.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl sansation-bold text-white mb-4">Set your wallet password</h2>
        <div className="mb-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Optional nickname"
            name="wallet-nickname"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular"
          />
        </div>
        
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 mb-6">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              name="wallet-new-password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
            </button>
          </div>
          
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              name="wallet-confirm-password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showConfirmPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
            </button>
          </div>
        </form>

        <div className="flex space-x-2">
          <button
            onClick={() => onSkip(nickname || undefined)}
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular border border-gray-600"
          >
            Skip
          </button>
          <button
            onClick={() => onSetPassword(password, nickname || undefined)}
            disabled={!passwordsMatch}
            className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors sansation-bold"
          >
            Set password
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordPromptView({ onCancel, onVerify }: { onCancel: () => void; onVerify: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    const ok = await onVerify(password);
    if (!ok) setError('Incorrect password');
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl sansation-bold text-white mb-4">Unlock wallet</h2>
        <div className="relative mb-3">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            name="wallet-unlock-password"
            autoComplete="current-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showPassword ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              )}
            </svg>
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
        <div className="flex space-x-2">
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular">Cancel</button>
          <button onClick={handleSubmit} disabled={!password || busy} className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold disabled:bg-gray-600 disabled:text-gray-300">Unlock</button>
        </div>
      </div>
    </div>
  );
}

// Remove wallet confirmation
function RemoveWalletView({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h2 className="text-xl sansation-bold text-white">Remove Wallet</h2>
        </div>
        
        <p className="text-gray-300 sansation-regular mb-2">Are you sure you want to remove this wallet?</p>
        <p className="text-red-400 text-sm sansation-regular mb-2">Make sure you have backed up your seed phrase.</p>
        <p className="text-red-400 text-sm sansation-regular mb-6">This action cannot be undone.</p>

        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular border border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors sansation-bold"
          >
            Remove Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

// Change password view - requires current password first, then allows setting new password
function ChangePasswordView({
  wallet,
  onCancel,
  onCurrentPasswordVerified,
  onPasswordChanged,
}: {
  wallet: any;
  onCancel: () => void;
  onCurrentPasswordVerified: (password: string) => Promise<boolean>;
  onPasswordChanged: (newPassword: string, nickname?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<'verify' | 'set-new'>('verify');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }
    setError(null);
    const verified = await onCurrentPasswordVerified(currentPassword);
    if (verified) {
      setStep('set-new');
      setCurrentPassword('');
    } else {
      setError('Incorrect password. Please try again.');
      setCurrentPassword('');
    }
  };

  if (step === 'verify') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-xl sansation-bold text-white mb-4">Change Password</h2>
          <p className="text-gray-300 text-sm sansation-regular mb-4">
            Please enter your current password to continue.
          </p>
          <div className="mb-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleVerifyCurrentPassword();
                }
              }}
              placeholder="Current password"
              name="current-password"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white sansation-regular"
            />
          </div>
          {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors sansation-regular"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyCurrentPassword}
              disabled={!currentPassword}
              className="flex-1 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors sansation-bold disabled:bg-gray-600 disabled:text-gray-300"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Set new password
  return (
    <SetPasswordView
      wallet={wallet}
      onBack={() => setStep('verify')}
      onSkip={() => {
        // Don't allow skip when changing password
        setStep('verify');
      }}
      onSetPassword={async (newPassword: string, nickname?: string) => {
        await onPasswordChanged(newPassword, nickname);
      }}
    />
  );
}

