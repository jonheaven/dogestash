'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Monitor, PawPrint, QrCode, RefreshCw, Shield, Trash2, Users } from 'lucide-react';
import { useBrowserWallet } from '../contexts/BrowserWalletContext';
import { BrowserWallet } from '../lib/browser-wallet';
import type { SeedMaterial, WalletData } from '../types/wallet';

interface BrowserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode =
  | 'landing'
  | 'import'
  | 'backup'
  | 'password'
  | 'wallet'
  | 'unlock'
  | 'accounts'
  | 'address-qr'
  | 'private-key'
  | 'remove';

interface UnlockAction {
  title: string;
  description: string;
  onUnlock: (password: string) => Promise<void>;
}

export default function BrowserWalletModal({ isOpen, onClose }: BrowserWalletModalProps) {
  const {
    connected,
    address,
    balance,
    wallet,
    connect,
    disconnect,
    createWallet,
    importWallet,
    importWalletFromMnemonic,
    saveWallet,
    loadWallet,
    loadSeedMaterial,
    hasSeedMaterial,
    removeWallet,
    refreshBalance,
    listWallets,
    selectWallet,
    switchAccount,
  } = useBrowserWallet();

  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [savedWallets, setSavedWallets] = useState<WalletData[]>([]);
  const [pendingWallet, setPendingWallet] = useState<WalletData | null>(null);
  const [pendingSeedMaterial, setPendingSeedMaterial] = useState<SeedMaterial | null>(null);
  const [revealedSeedMaterial, setRevealedSeedMaterial] = useState<SeedMaterial | null>(null);
  const [revealedPrivateKey, setRevealedPrivateKey] = useState<string | null>(null);
  const [unlockAction, setUnlockAction] = useState<UnlockAction | null>(null);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [walletEncrypted, setWalletEncrypted] = useState(false);
  const [seedAvailable, setSeedAvailable] = useState(false);

  const currentWallet = pendingWallet || wallet;
  const currentAddress = currentWallet?.address || address;
  const relatedAccounts = useMemo(() => {
    if (!currentWallet?.seedFingerprint) {
      return [];
    }
    return savedWallets
      .filter((entry) => entry.seedFingerprint === currentWallet.seedFingerprint)
      .sort((a, b) => (a.accountIndex ?? 0) - (b.accountIndex ?? 0));
  }, [currentWallet?.seedFingerprint, savedWallets]);

  const refreshSavedWallets = async () => {
    try {
      setSavedWallets(await listWallets());
    } catch (error) {
      console.error('Failed to list saved wallets:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setViewMode('landing');
    setPendingWallet(null);
    setPendingSeedMaterial(null);
    setRevealedSeedMaterial(null);
    setRevealedPrivateKey(null);
    setUnlockAction(null);
  }, [isOpen]);

  useEffect(() => {
    if (pendingWallet) {
      return;
    }

    setRevealedSeedMaterial(null);
    setRevealedPrivateKey(null);
  }, [pendingWallet, wallet?.address]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshSavedWallets();
    if (connected && wallet) {
      setViewMode('wallet');
      void refreshBalance();
    } else {
      setViewMode('landing');
    }
  }, [connected, isOpen, refreshBalance, wallet]);

  useEffect(() => {
    if (!currentAddress) {
      setHasBackedUp(false);
      setWalletEncrypted(false);
      setSeedAvailable(false);
      return;
    }

    void (async () => {
      const storage = new BrowserWallet();
      setWalletEncrypted(await storage.isEncrypted(currentAddress));
      setSeedAvailable(await hasSeedMaterial(currentAddress));
      setHasBackedUp(localStorage.getItem(`wallet_backed_up_${currentAddress}`) === 'true');
    })();
  }, [currentAddress, hasSeedMaterial]);

  if (!isOpen) {
    return null;
  }

  const handleCreate = async () => {
    const created = await createWallet();
    const { mnemonic, ...walletData } = created;
    if (!mnemonic) {
      throw new Error('Failed to generate a recovery phrase');
    }

    localStorage.setItem(`wallet_created_${walletData.address}`, 'true');
    localStorage.removeItem(`wallet_backed_up_${walletData.address}`);
    setPendingWallet(walletData);
    setPendingSeedMaterial({ mnemonic, passphrase: '' });
    setRevealedSeedMaterial({ mnemonic, passphrase: '' });
    setViewMode('backup');
  };

  const openUnlock = (action: UnlockAction) => {
    setUnlockAction(action);
    setViewMode('unlock');
  };

  const handleConnectSavedWallet = async (target: WalletData) => {
    if (!target.address) {
      return;
    }

    const storage = new BrowserWallet();
    const encrypted = await storage.isEncrypted(target.address);
    if (!encrypted) {
      const selected = await selectWallet(target.address);
      if (selected) {
        localStorage.setItem('wallet_type', 'browser');
        await connect(selected);
        setViewMode('wallet');
      }
      return;
    }

    openUnlock({
      title: 'Unlock wallet',
      description: `Enter the password for ${target.nickname || `${target.address.slice(0, 8)}...${target.address.slice(-6)}`}.`,
      onUnlock: async (password) => {
        await storage.selectWallet(target.address);
        const loaded = await storage.loadWallet(password, target.address);
        if (!loaded) {
          throw new Error('Wallet not found');
        }
        localStorage.setItem('wallet_type', 'browser');
        await connect(loaded);
        setViewMode('wallet');
      },
    });
  };

  const handleImport = async (params: {
    input: string;
    passphrase?: string;
    password?: string;
    nickname?: string;
  }) => {
    const input = params.input.trim();
    if (!input) {
      throw new Error('Enter a mnemonic phrase or private key');
    }

    const normalizedMnemonic = input.replace(/\s+/g, ' ');
    const isMnemonic = normalizedMnemonic.split(' ').length > 1;
    const imported = isMnemonic
      ? await importWalletFromMnemonic(normalizedMnemonic, params.passphrase)
      : await importWallet(input);

    const walletToSave: WalletData = {
      ...imported,
      nickname: params.nickname?.trim() || undefined,
    };

    await saveWallet(
      walletToSave,
      params.password || undefined,
      isMnemonic && params.password
        ? { seedMaterial: { mnemonic: normalizedMnemonic, passphrase: params.passphrase } }
        : undefined
    );

    localStorage.setItem(`wallet_backed_up_${walletToSave.address}`, 'true');
    localStorage.removeItem(`wallet_created_${walletToSave.address}`);
    localStorage.setItem('wallet_type', 'browser');
    await connect(walletToSave);
    setViewMode('wallet');
    await refreshSavedWallets();
  };

  const handlePersistPendingWallet = async (password?: string, nickname?: string) => {
    if (!pendingWallet) {
      return;
    }

    const walletToSave: WalletData = {
      ...pendingWallet,
      nickname: nickname?.trim() || undefined,
    };
    await saveWallet(
      walletToSave,
      password,
      password && pendingSeedMaterial ? { seedMaterial: pendingSeedMaterial } : undefined
    );

    localStorage.setItem(`wallet_backed_up_${walletToSave.address}`, 'true');
    localStorage.removeItem(`wallet_created_${walletToSave.address}`);
    localStorage.setItem('wallet_type', 'browser');
    await connect(walletToSave);
    setPendingWallet(null);
    setPendingSeedMaterial(null);
    setRevealedSeedMaterial(null);
    setViewMode('wallet');
    await refreshSavedWallets();
  };

  const handleShowBackup = async () => {
    if (!currentAddress) {
      return;
    }

    if (revealedSeedMaterial) {
      setViewMode('backup');
      return;
    }

    const showSeed = async (password?: string) => {
      const seedMaterial = await loadSeedMaterial(password, currentAddress);
      setRevealedSeedMaterial(seedMaterial);
      setViewMode('backup');
    };

    if (walletEncrypted) {
      openUnlock({
        title: 'Unlock recovery phrase',
        description: 'Enter your wallet password to decrypt the stored recovery phrase.',
        onUnlock: showSeed,
      });
      return;
    }

    await showSeed();
  };

  const handleShowPrivateKey = async () => {
    if (!currentAddress) {
      return;
    }

    const reveal = async (password?: string) => {
      const loaded = await loadWallet(password);
      setRevealedPrivateKey(loaded?.privateKey || null);
      setViewMode('private-key');
    };

    if (walletEncrypted) {
      openUnlock({
        title: 'Unlock private key',
        description: 'Enter your wallet password to reveal the private key.',
        onUnlock: reveal,
      });
      return;
    }

    await reveal();
  };

  const handleShowAccounts = async () => {
    if (!currentWallet) {
      return;
    }

    if (!seedAvailable) {
      setViewMode('accounts');
      return;
    }

    setViewMode('accounts');
  };

  const handleSwitchAccount = async (targetAccountIndex: number) => {
    if (walletEncrypted) {
      openUnlock({
        title: 'Unlock HD accounts',
        description: `Enter your wallet password to switch to account ${targetAccountIndex}.`,
        onUnlock: async (password) => {
          await switchAccount(targetAccountIndex, password);
          setViewMode('wallet');
          await refreshSavedWallets();
        },
      });
      return;
    }

    await switchAccount(targetAccountIndex);
    setViewMode('wallet');
    await refreshSavedWallets();
  };

  const nextAccountIndex = (relatedAccounts.at(-1)?.accountIndex ?? currentWallet?.accountIndex ?? 0) + 1;

  if (viewMode === 'landing') {
    return (
      <WalletFrame title="Local Browser Wallet" onClose={onClose}>
        <p className="text-gray-300 text-sm sansation-regular mb-6">
          Create, import, and manage a Dogecoin wallet stored in this browser. Recovery
          phrases can be exported with QR backup, and HD accounts follow the Dogecoin
          BIP-44 path.
        </p>
        {savedWallets.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="text-sm uppercase tracking-[0.18em] text-gray-400">Saved Wallets</div>
            {savedWallets.map((entry) => (
              <button
                key={entry.address}
                onClick={() => handleConnectSavedWallet(entry)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
              >
                <div className="text-left">
                  <div className="text-white sansation-bold">
                    {entry.nickname || `${entry.address.slice(0, 8)}...${entry.address.slice(-6)}`}
                  </div>
                  <div className="text-xs text-gray-400 sansation-regular">
                    {entry.accountIndex !== undefined ? `Account ${entry.accountIndex}` : 'Single-key wallet'}
                    {entry.encrypted ? ' | Encrypted' : ''}
                  </div>
                </div>
                <span className="text-xs text-gray-300 sansation-bold">Open</span>
              </button>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <PrimaryButton onClick={handleCreate}>Create New Wallet</PrimaryButton>
          <SecondaryButton onClick={() => setViewMode('import')}>Import Wallet</SecondaryButton>
        </div>
      </WalletFrame>
    );
  }

  if (viewMode === 'import') {
    return (
      <ImportWalletView
        onBack={() => setViewMode('landing')}
        onSubmit={handleImport}
      />
    );
  }

  if (viewMode === 'password') {
    return (
      <PasswordSetupView
        wallet={pendingWallet}
        onBack={() => setViewMode('backup')}
        onSkip={() => handlePersistPendingWallet()}
        onSave={(password, nickname) => handlePersistPendingWallet(password, nickname)}
      />
    );
  }

  if (viewMode === 'unlock' && unlockAction) {
    return (
      <PasswordPromptView
        title={unlockAction.title}
        description={unlockAction.description}
        onCancel={() => setViewMode(connected ? 'wallet' : 'landing')}
        onUnlock={async (password) => {
          await unlockAction.onUnlock(password);
          setUnlockAction(null);
        }}
      />
    );
  }

  if (viewMode === 'backup') {
    return (
      <SeedBackupView
        seedMaterial={revealedSeedMaterial}
        pending={!!pendingWallet}
        onBack={() => setViewMode(pendingWallet ? 'landing' : 'wallet')}
        onAcknowledge={() => {
          if (currentAddress) {
            localStorage.setItem(`wallet_backed_up_${currentAddress}`, 'true');
            localStorage.removeItem(`wallet_created_${currentAddress}`);
          }
          setHasBackedUp(true);
          setViewMode(pendingWallet ? 'password' : 'wallet');
        }}
      />
    );
  }

  if (viewMode === 'accounts') {
    return (
      <AccountsView
        currentWallet={currentWallet}
        relatedAccounts={relatedAccounts}
        seedAvailable={seedAvailable}
        onBack={() => setViewMode('wallet')}
        onSwitchAccount={handleSwitchAccount}
        nextAccountIndex={nextAccountIndex}
      />
    );
  }

  if (viewMode === 'address-qr') {
    return (
      <QRCodeView
        title="Receive DOGE"
        subtitle={currentAddress || ''}
        value={currentAddress || ''}
        onBack={() => setViewMode('wallet')}
        warning={null}
        filename="dogestash-address-qr.png"
      />
    );
  }

  if (viewMode === 'private-key') {
    return (
      <QRCodeView
        title="Private Key"
        subtitle={revealedPrivateKey || 'Private key unavailable'}
        value={revealedPrivateKey || ''}
        onBack={() => setViewMode('wallet')}
        warning="Never share this key or QR code. Anyone who has it can spend your funds."
        filename="dogestash-private-key-qr.png"
      />
    );
  }

  if (viewMode === 'remove') {
    return (
      <ConfirmRemoveView
        onCancel={() => setViewMode('wallet')}
        onConfirm={async () => {
          await removeWallet();
          await refreshSavedWallets();
          onClose();
        }}
      />
    );
  }

  return (
    <WalletFrame title={currentWallet?.nickname || 'Browser Wallet'} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-white sansation-bold text-xl">{balance.toFixed(8)} DOGE</div>
          <div className="text-sm text-gray-400 sansation-regular">
            {currentAddress || 'No wallet connected'}
          </div>
        </div>
        <button
          onClick={() => void refreshBalance()}
          className="p-3 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:text-white"
          title="Refresh balance"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ActionButton icon={Shield} label={hasBackedUp ? 'Export Seed' : 'Backup Seed'} onClick={handleShowBackup} />
        <ActionButton icon={Users} label="HD Accounts" onClick={handleShowAccounts} />
        <ActionButton icon={QrCode} label="Address QR" onClick={() => setViewMode('address-qr')} />
        <ActionButton icon={KeyRound} label="Private Key" onClick={handleShowPrivateKey} />
      </div>

      {!hasBackedUp && (
        <div className="bg-orange-950/40 border border-orange-500/40 rounded-lg p-4 mb-4">
          <div className="text-orange-200 sansation-bold mb-1">Backup still required</div>
          <div className="text-sm text-orange-300 sansation-regular">
            Save the recovery phrase before funding this wallet. Password-protected seed export
            enables HD account recovery.
          </div>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-400 sansation-regular mb-2">Active account</div>
        <div className="text-white sansation-bold">
          Account {currentWallet?.accountIndex ?? 0}
        </div>
        <div className="text-xs text-gray-400 break-all">
          {currentWallet?.derivationPath || "m/44'/3'/0'/0/0"}
        </div>
      </div>

      <div className="space-y-3">
        <SecondaryButton onClick={async () => { await disconnect(); setViewMode('landing'); }}>
          Disconnect
        </SecondaryButton>
        <SecondaryButton onClick={() => setViewMode('remove')} destructive>
          Remove Wallet
        </SecondaryButton>
      </div>
    </WalletFrame>
  );
}

function WalletFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Monitor className="w-6 h-6 text-white" />
            <h2 className="text-xl sansation-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="w-full py-3 rounded-lg bg-white text-gray-900 sansation-bold hover:bg-gray-100">{children}</button>;
}

function SecondaryButton({
  onClick,
  children,
  destructive = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 rounded-lg sansation-bold border ${
        destructive
          ? 'bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30'
          : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof PawPrint;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-left hover:bg-gray-700">
      <Icon className="w-5 h-5 text-white mb-2" />
      <div className="text-sm text-white sansation-bold">{label}</div>
    </button>
  );
}

function ImportWalletView({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (params: {
    input: string;
    passphrase?: string;
    password?: string;
    nickname?: string;
  }) => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <WalletFrame title="Import Wallet" onClose={onBack}>
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Enter a 12/24-word recovery phrase or a WIF private key"
        />
        <input
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Optional BIP-39 passphrase"
        />
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Optional nickname"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Optional wallet password for encrypted storage"
        />
        <div className="text-xs text-gray-400 sansation-regular">
          Recovery phrases are only stored for later export when you set a password.
        </div>
        {error && <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg p-3">{error}</div>}
        <div className="flex gap-3">
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
          <PrimaryButton
            onClick={async () => {
              try {
                setSubmitting(true);
                setError(null);
                await onSubmit({
                  input,
                  passphrase: passphrase || undefined,
                  password: password || undefined,
                  nickname: nickname || undefined,
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Import failed');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Importing...' : 'Import Wallet'}
          </PrimaryButton>
        </div>
      </div>
    </WalletFrame>
  );
}

function PasswordSetupView({
  wallet,
  onBack,
  onSkip,
  onSave,
}: {
  wallet: WalletData | null;
  onBack: () => void;
  onSkip: () => Promise<void>;
  onSave: (password: string, nickname?: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState(wallet?.nickname || '');
  const [busy, setBusy] = useState(false);

  return (
    <WalletFrame title="Protect Wallet" onClose={onBack}>
      <div className="space-y-4">
        <p className="text-gray-300 text-sm sansation-regular">
          Add a password to encrypt the wallet and recovery phrase with Web Crypto
          PBKDF2 + AES-GCM.
        </p>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Optional nickname"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="New password"
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Confirm password"
        />
        <div className="flex gap-3">
          <SecondaryButton
            onClick={() => {
              void (async () => {
                setBusy(true);
                await onSkip();
                setBusy(false);
              })();
            }}
          >
            {busy ? 'Saving...' : 'Skip'}
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              if (password && password === confirmPassword) {
                void onSave(password, nickname || undefined);
              }
            }}
          >
            Save Encrypted
          </PrimaryButton>
        </div>
      </div>
    </WalletFrame>
  );
}

function PasswordPromptView({
  title,
  description,
  onCancel,
  onUnlock,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onUnlock: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <WalletFrame title={title} onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-300 sansation-regular">{description}</p>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white sansation-regular"
          placeholder="Wallet password"
        />
        {error && <div className="text-sm text-red-300">{error}</div>}
        <div className="flex gap-3">
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={async () => {
              try {
                setBusy(true);
                setError(null);
                await onUnlock(password);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unlock failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Unlocking...' : 'Unlock'}
          </PrimaryButton>
        </div>
      </div>
    </WalletFrame>
  );
}

function SeedBackupView({
  seedMaterial,
  pending,
  onBack,
  onAcknowledge,
}: {
  seedMaterial: SeedMaterial | null;
  pending: boolean;
  onBack: () => void;
  onAcknowledge: () => void;
}) {
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const backupPayload = !seedMaterial
    ? null
    : seedMaterial.passphrase
      ? JSON.stringify({
          mnemonic: seedMaterial.mnemonic,
          passphrase: seedMaterial.passphrase,
        })
      : seedMaterial.mnemonic;

  useEffect(() => {
    if (!showQr || !backupPayload) {
      setQrDataUrl(null);
      return;
    }
    void (async () => {
      const QR = await import('qrcode');
      setQrDataUrl(await QR.toDataURL(backupPayload));
    })();
  }, [backupPayload, showQr]);

  const words = seedMaterial?.mnemonic.split(/\s+/) || [];

  return (
    <WalletFrame title="Recovery Phrase" onClose={onBack}>
      {words.length === 0 ? (
        <div className="text-sm text-gray-300 sansation-regular">
          No recovery phrase is stored for this wallet. Set a password during create/import to
          keep an encrypted export copy.
        </div>
      ) : (
        <>
          <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 mb-4">
            <div className="text-red-200 sansation-bold mb-2">Critical warning</div>
            <div className="text-sm text-red-300 sansation-regular">
              Anyone with these words can take all funds and inscriptions. Never share the phrase,
              never paste it into websites, and prefer a Ledger for long-term storage.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {words.map((word, index) => (
              <div key={`${word}-${index}`} className="bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400 mr-2">{index + 1}.</span>
                <span className="text-white sansation-bold">{word}</span>
              </div>
            ))}
          </div>
          {seedMaterial?.passphrase && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-4 mb-4">
              <div className="text-amber-200 sansation-bold mb-1">BIP-39 passphrase required</div>
              <div className="text-sm text-amber-300 sansation-regular break-all">
                {seedMaterial.passphrase}
              </div>
              <div className="text-xs text-amber-200/80 sansation-regular mt-2">
                This passphrase is part of the backup. The QR export includes it.
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-4">
            <SecondaryButton onClick={() => navigator.clipboard.writeText(backupPayload!)}>
              <Copy className="w-4 h-4 inline mr-2" />
              {seedMaterial?.passphrase ? 'Copy Backup' : 'Copy Phrase'}
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowQr((value) => !value)}>
              <QrCode className="w-4 h-4 inline mr-2" />
              {showQr ? 'Hide QR' : 'Show QR'}
            </SecondaryButton>
          </div>
          {showQr && qrDataUrl && (
            <div className="bg-white rounded-lg p-4 mb-4 flex justify-center">
              <img src={qrDataUrl} alt="Seed phrase QR code" className="w-56 h-56" />
            </div>
          )}
          <div className="flex gap-3">
            <SecondaryButton onClick={onBack}>{pending ? 'Back' : 'Close'}</SecondaryButton>
            <PrimaryButton onClick={onAcknowledge}>I stored it safely</PrimaryButton>
          </div>
        </>
      )}
    </WalletFrame>
  );
}

function AccountsView({
  currentWallet,
  relatedAccounts,
  seedAvailable,
  onBack,
  onSwitchAccount,
  nextAccountIndex,
}: {
  currentWallet: WalletData | null;
  relatedAccounts: WalletData[];
  seedAvailable: boolean;
  onBack: () => void;
  onSwitchAccount: (accountIndex: number) => Promise<void>;
  nextAccountIndex: number;
}) {
  return (
    <WalletFrame title="HD Accounts" onClose={onBack}>
      {!seedAvailable ? (
        <div className="text-sm text-gray-300 sansation-regular">
          HD account switching needs the recovery phrase. Set a wallet password during create or
          import so the phrase can be stored with Web Crypto encryption.
        </div>
      ) : (
        <div className="space-y-3">
          {relatedAccounts.map((entry) => (
            <button
              key={entry.address}
              onClick={() => void onSwitchAccount(entry.accountIndex ?? 0)}
              className={`w-full rounded-lg border px-4 py-3 text-left ${
                currentWallet?.address === entry.address
                  ? 'border-white bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
              }`}
            >
              <div className="text-white sansation-bold">Account {entry.accountIndex ?? 0}</div>
              <div className="text-xs text-gray-400">{entry.address}</div>
            </button>
          ))}
          <PrimaryButton onClick={() => void onSwitchAccount(nextAccountIndex)}>
            Derive Account {nextAccountIndex}
          </PrimaryButton>
        </div>
      )}
    </WalletFrame>
  );
}

function QRCodeView({
  title,
  subtitle,
  value,
  onBack,
  warning,
  filename,
}: {
  title: string;
  subtitle: string;
  value: string;
  onBack: () => void;
  warning: string | null;
  filename: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setQrDataUrl(null);
      return;
    }
    void (async () => {
      const QR = await import('qrcode');
      setQrDataUrl(await QR.toDataURL(value));
    })();
  }, [value]);

  return (
    <WalletFrame title={title} onClose={onBack}>
      {warning && <div className="text-sm text-red-300 mb-4">{warning}</div>}
      <div className="text-sm text-gray-300 break-all mb-4">{subtitle}</div>
      {qrDataUrl ? (
        <div className="bg-white rounded-lg p-4 flex justify-center mb-4">
          <img src={qrDataUrl} alt={title} className="w-56 h-56" />
        </div>
      ) : (
        <div className="text-gray-400">Generating QR...</div>
      )}
      <div className="flex gap-3">
        <SecondaryButton onClick={onBack}>Close</SecondaryButton>
        <PrimaryButton
          onClick={() => {
            if (!qrDataUrl) {
              return;
            }
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = filename;
            link.click();
          }}
        >
          Download QR
        </PrimaryButton>
      </div>
    </WalletFrame>
  );
}

function ConfirmRemoveView({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <WalletFrame title="Remove Wallet" onClose={onCancel}>
      <div className="space-y-4">
        <div className="text-sm text-gray-300 sansation-regular">
          This removes the wallet, cached balance, recovery export, and account metadata from this
          browser. Make sure the recovery phrase or hardware wallet is safely backed up first.
        </div>
        <div className="flex gap-3">
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
          <SecondaryButton onClick={() => void onConfirm()} destructive>
            <Trash2 className="w-4 h-4 inline mr-2" />
            Remove
          </SecondaryButton>
        </div>
      </div>
    </WalletFrame>
  );
}
