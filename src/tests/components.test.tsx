import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DogestashProvider } from '../providers/DogestashProvider';
import { ConnectWalletButton } from '../components/ConnectWalletButton';

const unifiedWalletMockState = vi.hoisted(() => ({
  connected: false,
  address: null as string | null,
  connecting: false,
  disconnect: vi.fn().mockResolvedValue(undefined),
  signDMPIntent: vi.fn(),
}));

vi.mock('../contexts/UnifiedWalletContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/UnifiedWalletContext')>();
  return {
    ...actual,
    useUnifiedWallet: () => ({
      walletType: null,
      connected: unifiedWalletMockState.connected,
      address: unifiedWalletMockState.address,
      balance: 0,
      connecting: unifiedWalletMockState.connecting,
      connect: vi.fn(),
      disconnect: unifiedWalletMockState.disconnect,
      sendTransaction: vi.fn(),
      signMessage: vi.fn(),
      signPSBT: vi.fn(),
      signPSBTOnly: vi.fn(),
      signDMPIntent: unifiedWalletMockState.signDMPIntent,
      sendInscription: vi.fn(),
      getTransactionStatus: vi.fn(),
      createBrowserWallet: vi.fn(),
      importBrowserWallet: vi.fn(),
      importBrowserWalletFromMnemonic: vi.fn(),
      saveBrowserWallet: vi.fn(),
      loadBrowserWallet: vi.fn(),
      hasBrowserWallet: vi.fn(),
      removeBrowserWallet: vi.fn(),
    }),
  };
});

vi.mock('../components/WalletSelectionModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="wallet-modal">Modal Open</div> : null,
}));

describe('DogestashProvider', () => {
  beforeEach(() => {
    unifiedWalletMockState.connected = false;
    unifiedWalletMockState.address = null;
    unifiedWalletMockState.connecting = false;
  });

  it('renders children without crashing', () => {
    render(
      <DogestashProvider>
        <span data-testid="child">hello dogestash</span>
      </DogestashProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('ConnectWalletButton', () => {
  beforeEach(() => {
    unifiedWalletMockState.connected = false;
    unifiedWalletMockState.address = null;
    unifiedWalletMockState.connecting = false;
    unifiedWalletMockState.disconnect.mockClear();
    unifiedWalletMockState.signDMPIntent.mockClear();
  });

  it('renders connect label when disconnected', () => {
    render(<ConnectWalletButton />);
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('opens modal on connect click', async () => {
    render(<ConnectWalletButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    expect(screen.getByTestId('wallet-modal')).toBeInTheDocument();
  });

  it('shows short address and disconnect when connected', () => {
    unifiedWalletMockState.connected = true;
    unifiedWalletMockState.address = 'DRY5W9KFzR3asTvdaTG4LTqaRKqhHT1DFR';

    render(<ConnectWalletButton />);
    expect(screen.getByRole('button', { name: /DRY5W9\.\.\.1DFR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('shows connecting state', () => {
    unifiedWalletMockState.connecting = true;
    render(<ConnectWalletButton />);
    const btn = screen.getByRole('button', { name: /connecting\.\.\./i });
    expect(btn).toBeDisabled();
  });

  it('exposes signDMPIntent through onWalletReady', () => {
    unifiedWalletMockState.connected = true;
    unifiedWalletMockState.address = 'DRY5W9KFzR3asTvdaTG4LTqaRKqhHT1DFR';
    const onWalletReady = vi.fn();

    render(<ConnectWalletButton onWalletReady={onWalletReady} />);

    expect(onWalletReady).toHaveBeenCalledWith({
      address: 'DRY5W9KFzR3asTvdaTG4LTqaRKqhHT1DFR',
      signDMPIntent: unifiedWalletMockState.signDMPIntent,
    });
  });
});
