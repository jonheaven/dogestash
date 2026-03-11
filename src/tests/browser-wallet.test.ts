/**
 * Integration tests for BrowserWallet — the core of dogestash.
 *
 * Each test group clears localStorage so tests are isolated.
 * We exercise the full CRUD lifecycle, encryption round-trips,
 * and multi-wallet operations without mocking crypto.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Transaction } from 'doge-sdk';
import { BrowserWallet } from '../lib/browser-wallet';
import type { WalletData } from '../types/wallet';

// ─── helpers ────────────────────────────────────────────────────────────────

let KNOWN_WIF = '';

/** Regex for Dogecoin mainnet P2PKH address (starts with D, 26-34 alphanumeric) */
const DOGE_ADDR_RE = /^D[1-9A-HJ-NP-Za-km-z]{25,33}$/;

/** Regex for Dogecoin compressed WIF private key (starts with Q or 6) */
const WIF_RE = /^[Q6][1-9A-HJ-NP-Za-km-z]{51}$/;

// ─── wallet generation ───────────────────────────────────────────────────────

describe('BrowserWallet.generateWallet()', () => {
  it('returns a valid Dogecoin mainnet address', async () => {
    const wallet = await BrowserWallet.generateWallet('mainnet');
    expect(wallet.address).toMatch(DOGE_ADDR_RE);
  });

  it('returns a 12-word BIP-39 mnemonic', async () => {
    const wallet = await BrowserWallet.generateWallet('mainnet');
    expect(typeof wallet.mnemonic).toBe('string');
    expect(wallet.mnemonic!.trim().split(/\s+/)).toHaveLength(12);
  });

  it('returns a valid WIF private key', async () => {
    const wallet = await BrowserWallet.generateWallet('mainnet');
    expect(wallet.privateKey).toMatch(WIF_RE);
  });

  it('always produces unique addresses', async () => {
    const [a, b] = await Promise.all([
      BrowserWallet.generateWallet('mainnet'),
      BrowserWallet.generateWallet('mainnet'),
    ]);
    expect(a.address).not.toBe(b.address);
    expect(a.mnemonic).not.toBe(b.mnemonic);
  });

  it('sets createdAt close to Date.now()', async () => {
    const before = Date.now();
    const wallet = await BrowserWallet.generateWallet('mainnet');
    const after = Date.now();
    expect(wallet.createdAt).toBeGreaterThanOrEqual(before);
    expect(wallet.createdAt).toBeLessThanOrEqual(after);
  });

  it('sets network to mainnet', async () => {
    const wallet = await BrowserWallet.generateWallet('mainnet');
    expect(wallet.network).toBe('mainnet');
  });
});

// ─── WIF import ──────────────────────────────────────────────────────────────

describe('BrowserWallet.importFromPrivateKey()', () => {
  beforeAll(async () => {
    const generated = await BrowserWallet.generateWallet('mainnet');
    KNOWN_WIF = generated.privateKey;
  });

  it('is deterministic — same WIF always yields same address', async () => {
    const [a, b] = await Promise.all([
      BrowserWallet.importFromPrivateKey(KNOWN_WIF, 'mainnet'),
      BrowserWallet.importFromPrivateKey(KNOWN_WIF, 'mainnet'),
    ]);
    expect(a.address).toBe(b.address);
  });

  it('returns a valid Dogecoin mainnet address', async () => {
    const wallet = await BrowserWallet.importFromPrivateKey(KNOWN_WIF, 'mainnet');
    expect(wallet.address).toMatch(DOGE_ADDR_RE);
  });

  it('preserves the provided WIF as privateKey', async () => {
    const wallet = await BrowserWallet.importFromPrivateKey(KNOWN_WIF, 'mainnet');
    expect(wallet.privateKey).toBe(KNOWN_WIF);
  });

  it('throws on an invalid WIF string', async () => {
    await expect(
      BrowserWallet.importFromPrivateKey('not-a-wif')
    ).rejects.toThrow();
  });
});

// ─── save / load round-trips ─────────────────────────────────────────────────

describe('saveWallet / loadWallet — unencrypted', () => {
  let bw: BrowserWallet;
  let testWallet: WalletData;

  beforeEach(async () => {
    localStorage.clear();
    bw = new BrowserWallet();
    testWallet = await BrowserWallet.generateWallet('mainnet');
  });

  it('persists and retrieves address and privateKey', async () => {
    await bw.saveWallet(testWallet);
    const loaded = await bw.loadWallet();
    expect(loaded).not.toBeNull();
    expect(loaded!.address).toBe(testWallet.address);
    expect(loaded!.privateKey).toBe(testWallet.privateKey);
  });

  it('persists network field', async () => {
    await bw.saveWallet(testWallet);
    const loaded = await bw.loadWallet();
    expect(loaded!.network).toBe('mainnet');
  });

  it('persists nickname when provided', async () => {
    await bw.saveWallet({ ...testWallet, nickname: 'Hot Wallet' });
    const loaded = await bw.loadWallet();
    expect(loaded!.nickname).toBe('Hot Wallet');
  });
});

describe('saveWallet / loadWallet — encrypted', () => {
  let bw: BrowserWallet;
  let testWallet: WalletData;
  const PASSWORD = 'S3cur3P@ssw0rd!';
  const WRONG_PASSWORD = 'wrong-password';

  beforeEach(async () => {
    localStorage.clear();
    bw = new BrowserWallet();
    testWallet = await BrowserWallet.generateWallet('mainnet');
  });

  it('round-trip: encrypts then decrypts and returns original address', async () => {
    await bw.saveWallet(testWallet, PASSWORD);
    const loaded = await bw.loadWallet(PASSWORD);
    expect(loaded).not.toBeNull();
    expect(loaded!.address).toBe(testWallet.address);
  });

  it('round-trip: decrypted privateKey matches original', async () => {
    await bw.saveWallet(testWallet, PASSWORD);
    const loaded = await bw.loadWallet(PASSWORD);
    expect(loaded!.privateKey).toBe(testWallet.privateKey);
  });

  it('throws when loading encrypted wallet without a password', async () => {
    await bw.saveWallet(testWallet, PASSWORD);
    await expect(bw.loadWallet()).rejects.toThrow(/password/i);
  });

  it('throws when loading encrypted wallet with wrong password', async () => {
    await bw.saveWallet(testWallet, PASSWORD);
    await expect(bw.loadWallet(WRONG_PASSWORD)).rejects.toThrow();
  });

  it('does not store plaintext privateKey under the encrypted key', async () => {
    await bw.saveWallet(testWallet, PASSWORD);
    const raw = localStorage.getItem(
      `dogestash_wallet_encrypted_${testWallet.address}`
    );
    expect(raw).not.toBeNull();
    // The raw stored value is JSON-wrapped base64 ciphertext — not the WIF
    expect(raw).not.toContain(testWallet.privateKey);
  });
});

// ─── hasWallet ───────────────────────────────────────────────────────────────

describe('hasWallet()', () => {
  let bw: BrowserWallet;

  beforeEach(() => {
    localStorage.clear();
    bw = new BrowserWallet();
  });

  it('returns false when no wallet is stored', async () => {
    expect(await bw.hasWallet()).toBe(false);
  });

  it('returns true after saving a wallet', async () => {
    const w = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(w);
    expect(await bw.hasWallet()).toBe(true);
  });
});

// ─── isEncrypted ─────────────────────────────────────────────────────────────

describe('isEncrypted()', () => {
  let bw: BrowserWallet;

  beforeEach(() => {
    localStorage.clear();
    bw = new BrowserWallet();
  });

  it('returns false for a plaintext wallet', async () => {
    const w = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(w);
    expect(await bw.isEncrypted(w.address)).toBe(false);
  });

  it('returns true for an encrypted wallet', async () => {
    const w = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(w, 'secret');
    expect(await bw.isEncrypted(w.address)).toBe(true);
  });
});

// ─── removeWallet ────────────────────────────────────────────────────────────

describe('removeWallet()', () => {
  let bw: BrowserWallet;
  let testWallet: WalletData;

  beforeEach(async () => {
    localStorage.clear();
    bw = new BrowserWallet();
    testWallet = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(testWallet);
  });

  it('causes hasWallet() to return false', async () => {
    await bw.removeWallet(testWallet.address);
    expect(await bw.hasWallet()).toBe(false);
  });

  it('removes per-wallet unencrypted key from localStorage', async () => {
    await bw.removeWallet(testWallet.address);
    expect(
      localStorage.getItem(`dogestash_wallet_unencrypted_${testWallet.address}`)
    ).toBeNull();
  });

  it('removes wallet from the wallets list', async () => {
    await bw.removeWallet(testWallet.address);
    const list = await bw.listWallets();
    expect(list.find(w => w.address === testWallet.address)).toBeUndefined();
  });

  it('removes encrypted wallet key when encrypted', async () => {
    const w = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(w, 'pass');
    await bw.removeWallet(w.address);
    expect(
      localStorage.getItem(`dogestash_wallet_encrypted_${w.address}`)
    ).toBeNull();
  });
});

// ─── multi-wallet (listWallets / selectWallet) ───────────────────────────────

describe('listWallets()', () => {
  let bw: BrowserWallet;

  beforeEach(() => {
    localStorage.clear();
    bw = new BrowserWallet();
  });

  it('returns empty array when no wallets stored', async () => {
    expect(await bw.listWallets()).toEqual([]);
  });

  it('lists all saved wallets', async () => {
    const [w1, w2] = await Promise.all([
      BrowserWallet.generateWallet('mainnet'),
      BrowserWallet.generateWallet('mainnet'),
    ]);
    await bw.saveWallet(w1);
    await bw.saveWallet(w2);
    const list = await bw.listWallets();
    const addresses = list.map(w => w.address);
    expect(addresses).toContain(w1.address);
    expect(addresses).toContain(w2.address);
  });

  it('does not duplicate an address on re-save', async () => {
    const w = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(w);
    await bw.saveWallet(w); // save again
    const list = await bw.listWallets();
    const matches = list.filter(x => x.address === w.address);
    expect(matches).toHaveLength(1);
  });
});

describe('selectWallet()', () => {
  let bw: BrowserWallet;

  beforeEach(() => {
    localStorage.clear();
    bw = new BrowserWallet();
  });

  it('returns null when address is unknown', async () => {
    expect(await bw.selectWallet('Dunknown123')).toBeNull();
  });

  it('switches the active wallet', async () => {
    const [w1, w2] = await Promise.all([
      BrowserWallet.generateWallet('mainnet'),
      BrowserWallet.generateWallet('mainnet'),
    ]);
    await bw.saveWallet(w1);
    await bw.saveWallet(w2);
    await bw.selectWallet(w1.address);
    const loaded = await bw.loadWallet();
    // loadWallet uses STORAGE_CURRENT — should return w1
    expect(loaded?.address).toBe(w1.address);
  });
});

// ─── updateNickname ──────────────────────────────────────────────────────────

describe('updateNickname()', () => {
  let bw: BrowserWallet;
  let testWallet: WalletData;

  beforeEach(async () => {
    localStorage.clear();
    bw = new BrowserWallet();
    testWallet = await BrowserWallet.generateWallet('mainnet');
    await bw.saveWallet(testWallet);
  });

  it('persists a new nickname in the wallets list', async () => {
    await bw.updateNickname(testWallet.address, 'Primary');
    const list = await bw.listWallets();
    const entry = list.find(w => w.address === testWallet.address);
    expect(entry?.nickname).toBe('Primary');
  });

  it('replaces an existing nickname', async () => {
    await bw.updateNickname(testWallet.address, 'First');
    await bw.updateNickname(testWallet.address, 'Second');
    const list = await bw.listWallets();
    const entry = list.find(w => w.address === testWallet.address);
    expect(entry?.nickname).toBe('Second');
  });

  it('allows clearing a nickname by passing undefined', async () => {
    await bw.updateNickname(testWallet.address, 'Named');
    await bw.updateNickname(testWallet.address, undefined);
    const list = await bw.listWallets();
    const entry = list.find(w => w.address === testWallet.address);
    expect(entry?.nickname).toBeUndefined();
  });
});

// ─── clearAllWallets ─────────────────────────────────────────────────────────

describe('buildTransaction() / sendTransaction()', () => {
  let bw: BrowserWallet;
  let sender: WalletData;
  let recipient: WalletData;

  beforeEach(async () => {
    localStorage.clear();
    bw = new BrowserWallet();
    sender = await BrowserWallet.generateWallet('mainnet');
    recipient = await BrowserWallet.generateWallet('mainnet');
  });

  it('builds a signed DOGE transaction from plain confirmed UTXOs only', async () => {
    const built = await bw.buildTransaction(recipient.address, 1.5, {
      wallet: sender,
      feeRate: 1_000,
      utxos: [
        {
          txid: '11'.repeat(32),
          vout: 0,
          value: 170_000_000,
          confirmations: 12,
        },
        {
          txid: '22'.repeat(32),
          vout: 1,
          value: 200_000_000,
          confirmations: 12,
          inscriptions: [{ inscriptionId: 'doginal-1' }],
        },
      ],
    });

    const tx = Transaction.fromHex(built.txHex);
    const recipientVouts = tx.getVoutsForAddress(recipient.address);

    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(2);
    expect(recipientVouts).toHaveLength(1);
    expect(tx.outputs[recipientVouts[0]].value).toBe(150_000_000);
    expect(built.change).toBeGreaterThan(0);
    expect(built.fee).toBeGreaterThan(0);
    expect(built.outputTotal).toBeGreaterThan(150_000_000);
    expect(built.outputTotal).toBeLessThan(built.inputTotal);
  });

  it('rejects spends when only inscribed UTXOs are available', async () => {
    await expect(
      bw.buildTransaction(recipient.address, 0.5, {
        wallet: sender,
        utxos: [
          {
            txid: '33'.repeat(32),
            vout: 0,
            value: 100_000_000,
            confirmations: 6,
            inscriptions: [{ inscriptionId: 'doginal-2' }],
          },
        ],
      })
    ).rejects.toThrow(/plain DOGE UTXOs/i);
  });

  it('sends via the provided broadcaster and returns the txid', async () => {
    const broadcastTx = vi.fn(async () => 'abc123txid');

    const txid = await bw.sendTransaction(recipient.address, 0.75, {
      wallet: sender,
      utxos: [
        {
          txid: '44'.repeat(32),
          vout: 0,
          value: 100_000_000,
          confirmations: 24,
        },
      ],
      broadcastTx,
    });

    expect(txid).toBe('abc123txid');
    expect(broadcastTx).toHaveBeenCalledTimes(1);
    expect(broadcastTx.mock.calls[0][0]).toMatch(/^[0-9a-f]+$/);
  });
});

describe('clearAllWallets()', () => {
  let bw: BrowserWallet;

  beforeEach(async () => {
    localStorage.clear();
    bw = new BrowserWallet();
    const [w1, w2] = await Promise.all([
      BrowserWallet.generateWallet('mainnet'),
      BrowserWallet.generateWallet('mainnet'),
    ]);
    await bw.saveWallet(w1);
    await bw.saveWallet(w2);
  });

  it('causes hasWallet() to return false', async () => {
    await bw.clearAllWallets();
    expect(await bw.hasWallet()).toBe(false);
  });

  it('empties the wallets list', async () => {
    await bw.clearAllWallets();
    expect(await bw.listWallets()).toEqual([]);
  });

  it('removes per-wallet encrypted/unencrypted and metadata keys', async () => {
    const wallets = await bw.listWallets();
    expect(wallets.length).toBeGreaterThan(0);
    const target = wallets[0];

    localStorage.setItem(`dogestash_wallet_encrypted_${target.address}`, 'encrypted');
    localStorage.setItem(`dogestash_wallet_unencrypted_${target.address}`, 'plain');
    localStorage.setItem(`wallet_created_${target.address}`, String(Date.now()));
    localStorage.setItem(`wallet_mnemonic_${target.address}`, 'sample mnemonic');
    localStorage.setItem(`wallet_backed_up_${target.address}`, 'true');

    await bw.clearAllWallets();

    expect(localStorage.getItem(`dogestash_wallet_encrypted_${target.address}`)).toBeNull();
    expect(localStorage.getItem(`dogestash_wallet_unencrypted_${target.address}`)).toBeNull();
    expect(localStorage.getItem(`wallet_created_${target.address}`)).toBeNull();
    expect(localStorage.getItem(`wallet_mnemonic_${target.address}`)).toBeNull();
    expect(localStorage.getItem(`wallet_backed_up_${target.address}`)).toBeNull();
  });
});
