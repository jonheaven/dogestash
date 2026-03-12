import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const walletUiState = vi.hoisted(() => ({
  connect: vi.fn(async () => undefined),
  browserConnect: vi.fn(async () => undefined),
  browserDisconnect: vi.fn(async () => undefined),
  createWallet: vi.fn(async () => ({
    address: 'D8qKnd5Sj65GsP7T4rJd8n6wp4s6xW7s2k',
    privateKey: 'QWrtu5TShfQ9tA9zQwZotYwV8vGpFEKskL8oR6gw8U4hTnKe5B4W',
    network: 'mainnet' as const,
    mnemonic:
      'abandon ability able about above absent absorb abstract absurd abuse access accident',
    accountIndex: 0,
    derivationPath: "m/44'/3'/0'/0/0",
    seedFingerprint: 'seed-fingerprint-0',
    walletSource: 'generated' as const,
    createdAt: Date.now(),
  })),
  importWallet: vi.fn(),
  importWalletFromMnemonic: vi.fn(),
  saveWallet: vi.fn(async () => undefined),
  loadWallet: vi.fn(async () => null),
  loadSeedMaterial: vi.fn(async () => null),
  hasSeedMaterial: vi.fn(async () => false),
  removeWallet: vi.fn(async () => undefined),
  refreshBalance: vi.fn(async () => undefined),
  listWallets: vi.fn(async () => []),
  selectWallet: vi.fn(async () => null),
  switchAccount: vi.fn(async () => undefined),
  hasWallet: vi.fn(async () => false),
}));

vi.mock('../contexts/UnifiedWalletContext', () => ({
  useUnifiedWallet: () => ({
    walletType: null,
    connected: false,
    address: null,
    balance: 0,
    balanceVerified: false,
    connecting: false,
    accountIndex: null,
    derivationPath: null,
    connect: walletUiState.connect,
    switchAccount: vi.fn(),
    disconnect: vi.fn(),
    sendTransaction: vi.fn(),
    signMessage: vi.fn(),
    signPSBT: vi.fn(),
    signPSBTOnly: vi.fn(),
    signDMPIntent: vi.fn(),
    sendInscription: vi.fn(),
    getTransactionStatus: vi.fn(),
    createBrowserWallet: vi.fn(),
    importBrowserWallet: vi.fn(),
    importBrowserWalletFromMnemonic: vi.fn(),
    saveBrowserWallet: vi.fn(),
    loadBrowserWallet: vi.fn(),
    loadBrowserSeedMaterial: vi.fn(),
    hasBrowserWallet: vi.fn(),
    removeBrowserWallet: vi.fn(),
  }),
}));

vi.mock('../contexts/MyDogeWalletContext', () => ({
  useMyDogeWallet: () => ({ myDoge: null }),
}));

vi.mock('../contexts/NintondoWalletContext', () => ({
  useNintondoWallet: () => ({ nintondo: null }),
}));

vi.mock('../contexts/BrowserWalletContext', () => ({
  useBrowserWallet: () => ({
    connected: false,
    address: null,
    balance: 0,
    wallet: null,
    connecting: false,
    connect: walletUiState.browserConnect,
    disconnect: walletUiState.browserDisconnect,
    createWallet: walletUiState.createWallet,
    importWallet: walletUiState.importWallet,
    importWalletFromMnemonic: walletUiState.importWalletFromMnemonic,
    saveWallet: walletUiState.saveWallet,
    loadWallet: walletUiState.loadWallet,
    loadSeedMaterial: walletUiState.loadSeedMaterial,
    hasSeedMaterial: walletUiState.hasSeedMaterial,
    hasWallet: walletUiState.hasWallet,
    removeWallet: walletUiState.removeWallet,
    refreshBalance: walletUiState.refreshBalance,
    listWallets: walletUiState.listWallets,
    selectWallet: walletUiState.selectWallet,
    switchAccount: walletUiState.switchAccount,
    updateNickname: vi.fn(),
  }),
}));

vi.mock('../lib/ledger-wallet', () => ({
  LedgerWallet: class MockLedgerWallet {
    static isSupported = vi.fn(async () => true);
  },
}));

vi.mock('../lib/browser-wallet', () => ({
  BrowserWallet: class MockBrowserWallet {
    async isEncrypted() {
      return false;
    }

    async loadWallet() {
      return null;
    }

    async selectWallet() {
      return null;
    }
  },
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(async () => 'data:image/png;base64,seed-qr'),
}));

import BrowserWalletModal from '../components/BrowserWalletModal';
import WalletSelectionModal from '../components/WalletSelectionModal';

describe('wallet UI hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it('shows Ledger as the recommended primary wallet option', async () => {
    const onClose = vi.fn();
    render(<WalletSelectionModal isOpen onClose={onClose} />);

    const ledgerButton = (await screen.findByText('Ledger Hardware Wallet')).closest('button');
    const browserButton = screen.getByText('Local Wallet').closest('button');

    expect(ledgerButton).not.toBeNull();
    expect(browserButton).not.toBeNull();
    expect(screen.getByText(/^Recommended$/i)).toBeInTheDocument();
    expect(
      ledgerButton!.compareDocumentPosition(browserButton!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(ledgerButton!);

    await waitFor(() => {
      expect(walletUiState.connect).toHaveBeenCalledWith('ledger');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the seed backup warnings and QR export during wallet creation', async () => {
    render(<BrowserWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create new wallet/i }));

    expect(await screen.findByText(/critical warning/i)).toBeInTheDocument();
    expect(
      screen.getByText(/never paste it into websites, and prefer a ledger for long-term storage/i)
    ).toBeInTheDocument();
    expect(screen.getByText('abandon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show qr/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show qr/i }));

    expect(await screen.findByAltText(/seed phrase qr code/i)).toBeInTheDocument();
  });
});
