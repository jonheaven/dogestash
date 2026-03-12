import { beforeEach, describe, expect, it } from 'vitest';
import { Transaction } from 'doge-sdk';

import { BrowserWallet } from '../lib/browser-wallet';
import { looksLikeSecureStorageEnvelope } from '../lib/secureStorage';
import type { SeedMaterial, WalletData } from '../types/wallet';

const DOGE_ADDR_RE = /^D[1-9A-HJ-NP-Za-km-z]{25,33}$/;
const WIF_RE = /^[Q6][1-9A-HJ-NP-Za-km-z]{51}$/;
const LEGACY_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

async function createLegacyEncryptedPayload(value: unknown, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: LEGACY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);

  return bytesToBase64(combined);
}

describe('BrowserWallet wallet generation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns a valid Dogecoin mainnet address and 12-word mnemonic', async () => {
    const wallet = await BrowserWallet.generateWallet('mainnet');

    expect(wallet.address).toMatch(DOGE_ADDR_RE);
    expect(wallet.privateKey).toMatch(WIF_RE);
    expect(wallet.network).toBe('mainnet');
    expect(wallet.mnemonic?.trim().split(/\s+/)).toHaveLength(12);
    expect(wallet.accountIndex).toBe(0);
    expect(wallet.derivationPath).toBe("m/44'/3'/0'/0/0");
    expect(wallet.walletSource).toBe('generated');
  });

  it('derives deterministically from the same mnemonic and account index', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    const restored = await BrowserWallet.importFromMnemonic(created.mnemonic!, '', 'mainnet', 0);

    expect(restored.address).toBe(created.address);
    expect(restored.privateKey).toBe(created.privateKey);
  });

  it('imports a WIF without changing the signing key', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    const restored = await BrowserWallet.importFromPrivateKey(created.privateKey, 'mainnet');

    expect(restored.address).toBe(created.address);
    expect(restored.privateKey).toBe(created.privateKey);
    expect(restored.walletSource).toBe('privateKey');
  });
});

describe('BrowserWallet storage compatibility', () => {
  const password = 'S3cur3P@ssw0rd!';

  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips plaintext wallet storage', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');

    await storage.saveWallet(created);
    const loaded = await storage.loadWallet();

    expect(loaded?.address).toBe(created.address);
    expect(loaded?.privateKey).toBe(created.privateKey);
    expect(await storage.isEncrypted(created.address)).toBe(false);
  });

  it('round-trips encrypted wallet storage with Web Crypto envelopes', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');

    await storage.saveWallet(created, password);
    const loaded = await storage.loadWallet(password);
    const rawRecord = localStorage.getItem(`dogestash_wallet_encrypted_${created.address}`);
    const parsedRecord = JSON.parse(rawRecord || '{}') as { encrypted?: string };

    expect(loaded?.address).toBe(created.address);
    expect(loaded?.privateKey).toBe(created.privateKey);
    expect(rawRecord).not.toContain(created.privateKey);
    expect(looksLikeSecureStorageEnvelope(parsedRecord.encrypted || '')).toBe(true);
  });

  it('decrypts legacy encrypted storage and re-encrypts it with the new envelope on first load', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    const walletData: WalletData = {
      address: created.address,
      privateKey: created.privateKey,
      network: created.network,
      createdAt: created.createdAt,
    };
    const legacyPayload = await createLegacyEncryptedPayload(walletData, password);

    localStorage.setItem(
      `dogemarket_browser_wallet_encrypted_${created.address}`,
      JSON.stringify({
        encrypted: legacyPayload,
        network: created.network,
      })
    );
    localStorage.setItem(
      'dogemarket_browser_wallets',
      JSON.stringify([{ address: created.address, network: created.network, encrypted: true }])
    );
    localStorage.setItem('dogemarket_browser_wallet_current', created.address);
    localStorage.setItem(`wallet_mnemonic_${created.address}`, created.mnemonic!);

    const loaded = await storage.loadWallet(password, created.address);
    const migratedRecord = JSON.parse(
      localStorage.getItem(`dogestash_wallet_encrypted_${created.address}`) || '{}'
    ) as { encrypted?: string };
    const fingerprint = await BrowserWallet.computeSeedFingerprint({
      mnemonic: created.mnemonic!,
      passphrase: '',
    });

    expect(loaded?.address).toBe(created.address);
    expect(loaded?.privateKey).toBe(created.privateKey);
    expect(localStorage.getItem('dogestash_wallet_current')).toBe(created.address);
    expect(looksLikeSecureStorageEnvelope(migratedRecord.encrypted || '')).toBe(true);
    expect(looksLikeSecureStorageEnvelope(localStorage.getItem(`dogestash_wallet_seed_${fingerprint}`) || '')).toBe(true);
    expect(localStorage.getItem(`wallet_mnemonic_${created.address}`)).toBeNull();
  });

  it('keeps legacy encrypted wallets locked without a password', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    const legacyPayload = await createLegacyEncryptedPayload(
      {
        address: created.address,
        privateKey: created.privateKey,
        network: created.network,
      },
      password
    );

    localStorage.setItem(
      `dogestash_wallet_encrypted_${created.address}`,
      JSON.stringify({ encrypted: legacyPayload, network: created.network })
    );
    localStorage.setItem('dogestash_wallet_current', created.address);

    await expect(storage.loadWallet(undefined, created.address)).rejects.toThrow(/password/i);
  });
});

describe('BrowserWallet seed backups and HD accounts', () => {
  const password = 'Migrate-And-Switch-123!';

  beforeEach(() => {
    localStorage.clear();
  });

  it('stores encrypted seed material separately when a password is provided', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    const seedMaterial: SeedMaterial = { mnemonic: created.mnemonic!, passphrase: '' };
    const fingerprint = await BrowserWallet.computeSeedFingerprint(seedMaterial);

    await storage.saveWallet(created, password, { seedMaterial });
    const loadedSeed = await storage.loadSeedMaterial(password, created.address);

    expect(loadedSeed).toEqual(seedMaterial);
    expect(looksLikeSecureStorageEnvelope(localStorage.getItem(`dogestash_wallet_seed_${fingerprint}`) || '')).toBe(true);
  });

  it('derives additional BIP-44 accounts without changing account 0 behavior', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    const seedMaterial: SeedMaterial = { mnemonic: created.mnemonic!, passphrase: '' };

    await storage.saveWallet(created, password, { seedMaterial });
    const accountOne = await storage.switchAccount(1, password, created.address);
    const wallets = await storage.listWallets();

    expect(accountOne.address).toMatch(DOGE_ADDR_RE);
    expect(accountOne.address).not.toBe(created.address);
    expect(accountOne.privateKey).not.toBe(created.privateKey);
    expect(accountOne.accountIndex).toBe(1);
    expect(accountOne.derivationPath).toBe("m/44'/3'/1'/0/0");
    expect(accountOne.seedFingerprint).toBe(created.seedFingerprint);
    expect(wallets.map((wallet) => wallet.accountIndex)).toEqual(expect.arrayContaining([0, 1]));
  });
});

describe('BrowserWallet wallet lists and cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists, selects, and updates saved wallets', async () => {
    const storage = new BrowserWallet();
    const [first, second] = await Promise.all([
      BrowserWallet.generateWallet('mainnet'),
      BrowserWallet.generateWallet('mainnet'),
    ]);

    await storage.saveWallet(first);
    await storage.saveWallet({ ...second, nickname: 'Spending Wallet' });
    await storage.updateNickname(first.address, 'Primary');
    await storage.selectWallet(first.address);

    const listed = await storage.listWallets();
    const selected = await storage.loadWallet();

    expect(listed).toHaveLength(2);
    expect(listed.find((wallet) => wallet.address === first.address)?.nickname).toBe('Primary');
    expect(listed.find((wallet) => wallet.address === second.address)?.nickname).toBe('Spending Wallet');
    expect(selected?.address).toBe(first.address);
  });

  it('removes wallet records, metadata, and encrypted seed backups', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    const seedMaterial: SeedMaterial = { mnemonic: created.mnemonic!, passphrase: '' };
    const fingerprint = await BrowserWallet.computeSeedFingerprint(seedMaterial);

    await storage.saveWallet(created, 'cleanup-pass', { seedMaterial });
    await storage.removeWallet(created.address);

    expect(await storage.hasWallet()).toBe(false);
    expect(localStorage.getItem(`dogestash_wallet_encrypted_${created.address}`)).toBeNull();
    expect(localStorage.getItem(`dogestash_wallet_seed_${fingerprint}`)).toBeNull();
    expect(localStorage.getItem(`wallet_backed_up_${created.address}`)).toBeNull();
  });

  it('clears all wallets, seed backups, and compatibility keys', async () => {
    const storage = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    const seedMaterial: SeedMaterial = { mnemonic: created.mnemonic!, passphrase: '' };
    const fingerprint = await BrowserWallet.computeSeedFingerprint(seedMaterial);

    await storage.saveWallet(created, 'clear-pass', { seedMaterial });
    localStorage.setItem('dogemarket_browser_wallet_current', created.address);
    localStorage.setItem(`wallet_mnemonic_${created.address}`, created.mnemonic!);

    await storage.clearAllWallets();

    expect(await storage.hasWallet()).toBe(false);
    expect(await storage.listWallets()).toEqual([]);
    expect(localStorage.getItem(`dogestash_wallet_seed_${fingerprint}`)).toBeNull();
    expect(localStorage.getItem('dogemarket_browser_wallet_current')).toBeNull();
    expect(localStorage.getItem(`wallet_mnemonic_${created.address}`)).toBeNull();
  });
});

describe('BrowserWallet transaction building', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a signed DOGE transaction using plain confirmed UTXOs only', async () => {
    const storage = new BrowserWallet();
    const sender = await BrowserWallet.generateWallet('mainnet');
    const recipient = await BrowserWallet.generateWallet('mainnet');

    const built = await storage.buildTransaction(recipient.address, 1.5, {
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
  });

  it('rejects spends when only inscribed UTXOs are available', async () => {
    const storage = new BrowserWallet();
    const sender = await BrowserWallet.generateWallet('mainnet');
    const recipient = await BrowserWallet.generateWallet('mainnet');

    await expect(
      storage.buildTransaction(recipient.address, 0.5, {
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
});
