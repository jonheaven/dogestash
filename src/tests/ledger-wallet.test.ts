import { beforeEach, describe, expect, it, vi } from 'vitest';

const ledgerMocks = vi.hoisted(() => {
  const transport = {
    close: vi.fn(async () => undefined),
  };

  return {
    transport,
    isSupported: vi.fn(async () => true),
    request: vi.fn(async () => transport),
    openConnected: vi.fn(async () => transport),
    getWalletPublicKey: vi.fn(async () => ({
      publicKey: `02${'11'.repeat(32)}`,
      bitcoinAddress: '',
      chainCode: '00'.repeat(32),
    })),
    signMessage: vi.fn(async () => ({
      v: 27,
      r: '11'.repeat(32),
      s: '22'.repeat(32),
    })),
    getAppAndVersion: vi.fn(async () => ({ name: 'Dogecoin', version: '1.0.0' })),
  };
});

vi.mock('@ledgerhq/hw-transport-webusb', () => ({
  default: {
    isSupported: ledgerMocks.isSupported,
    request: ledgerMocks.request,
    openConnected: ledgerMocks.openConnected,
  },
}));

vi.mock('@ledgerhq/hw-app-btc', () => ({
  default: class MockBtc {
    getWalletPublicKey = ledgerMocks.getWalletPublicKey;
    signMessage = ledgerMocks.signMessage;

    constructor(_options: unknown) {}
  },
}));

vi.mock('@ledgerhq/hw-app-btc/lib/getAppAndVersion.js', () => ({
  getAppAndVersion: ledgerMocks.getAppAndVersion,
}));

import { LedgerWallet } from '../lib/ledger-wallet';

describe('LedgerWallet', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(globalThis.navigator, 'usb', {
      configurable: true,
      value: {},
    });
  });

  it('reports WebUSB support when the browser and transport support it', async () => {
    await expect(LedgerWallet.isSupported()).resolves.toBe(true);
    expect(ledgerMocks.isSupported).toHaveBeenCalledTimes(1);
  });

  it('connects to a Ledger account and persists the selected account index', async () => {
    const ledger = new LedgerWallet();
    const account = await ledger.connect({ accountIndex: 2, verify: false, promptUser: true });

    expect(account.accountIndex).toBe(2);
    expect(account.derivationPath).toBe("m/44'/3'/2'/0/0");
    expect(account.address).toMatch(/^D[1-9A-HJ-NP-Za-km-z]{25,33}$/);
    expect(localStorage.getItem('dogestash_ledger_account_index')).toBe('2');
    expect(ledgerMocks.request).toHaveBeenCalledTimes(1);
    expect(ledgerMocks.getWalletPublicKey).toHaveBeenCalledWith("44'/3'/2'/0/0", {
      verify: false,
      format: 'legacy',
    });
  });

  it('signs messages with the active Ledger account', async () => {
    const ledger = new LedgerWallet();
    await ledger.connect({ accountIndex: 0, verify: false, promptUser: true });
    const signature = await ledger.signMessage('doge-ledger-message');

    expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(ledgerMocks.signMessage).toHaveBeenCalledWith(
      "44'/3'/0'/0/0",
      Buffer.from('doge-ledger-message', 'utf8').toString('hex')
    );
  });

  it('switches accounts without re-requesting USB permission when transport is already open', async () => {
    const ledger = new LedgerWallet();
    await ledger.connect({ accountIndex: 0, verify: false, promptUser: true });
    const account = await ledger.switchAccount(1);

    expect(account.accountIndex).toBe(1);
    expect(account.derivationPath).toBe("m/44'/3'/1'/0/0");
    expect(ledgerMocks.request).toHaveBeenCalledTimes(1);
    expect(ledgerMocks.getWalletPublicKey).toHaveBeenLastCalledWith("44'/3'/1'/0/0", {
      verify: true,
      format: 'legacy',
    });
  });

  it('disconnects and closes the underlying transport', async () => {
    const ledger = new LedgerWallet();
    await ledger.connect({ accountIndex: 0, verify: false, promptUser: true });
    await ledger.disconnect();

    expect(ledger.getAccount()).toBeNull();
    expect(ledgerMocks.transport.close).toHaveBeenCalledTimes(1);
  });
});
