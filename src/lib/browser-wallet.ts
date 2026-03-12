/**
 * Browser wallet implementation using doge-sdk (browser-compatible Dogecoin library).
 * No crypto polyfills needed - doge-sdk is designed for browser use.
 *
 * Dogecoin BIP-44 default path remains unchanged:
 * m/44'/3'/0'/0/0
 */

import { DogecoinJS } from '@mydogeofficial/dogecoin-js';
import {
  DogeMemoryWallet,
  coinSelectP2PKH,
  createP2PKHTransaction,
  getP2PKHAddressFromPublicKey,
  decodePrivateKeyFromWIF,
} from 'doge-sdk';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';

import { decryptJSON, encryptJSON } from './secureStorage';
import type {
  WalletData,
  NetworkType,
  IntentPayload,
  SignedIntent,
  SeedMaterial,
} from '../types/wallet';

export interface BrowserWalletSaveOptions {
  seedMaterial?: SeedMaterial | null;
}

interface EncryptedWalletRecord {
  encrypted: string;
  network: NetworkType;
}

interface StoredWalletEntry extends Partial<WalletData> {
  address: string;
  network: NetworkType;
  encrypted?: boolean;
}

export interface BrowserWalletSpendableUtxo {
  txid: string;
  vout: number;
  value: number;
  confirmations?: number;
  address?: string;
  scriptPubKey?: string;
  inscriptions?: Array<Record<string, unknown>>;
}

export interface BrowserWalletBuiltTransaction {
  txHex: string;
  fee: number;
  inputCount: number;
  outputCount: number;
  inputTotal: number;
  outputTotal: number;
  change: number;
}

export interface BrowserWalletSendTransactionOptions {
  wallet?: WalletData;
  password?: string;
  address?: string;
  utxos: BrowserWalletSpendableUtxo[];
  broadcastTx?: (txHex: string) => Promise<string>;
  feeRate?: number;
  minConfirmations?: number;
  includeInscribedUtxos?: boolean;
}

const DEFAULT_DOGE_FEE_RATE = 1_000;
const DEFAULT_MIN_CONFIRMATIONS = 1;

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return new Uint8Array(digest);
}

async function doubleSha256(data: Uint8Array): Promise<Uint8Array> {
  const first = await sha256(data);
  return sha256(first);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const output: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      output[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return output;
  }
  return value;
}

function isInscribedUtxo(utxo: BrowserWalletSpendableUtxo): boolean {
  return Array.isArray(utxo.inscriptions) && utxo.inscriptions.length > 0;
}

function normalizeDogeAmountToKoinu(amountDoge: number): number {
  if (!Number.isFinite(amountDoge) || amountDoge <= 0) {
    throw new Error('Amount must be a positive DOGE value');
  }

  const koinu = Math.round(amountDoge * 100_000_000);
  if (koinu <= 0) {
    throw new Error('Amount is too small');
  }

  return koinu;
}

function getNetworkId(network: NetworkType): 'doge' | 'dogeTestnet' {
  return network === 'mainnet' ? 'doge' : 'dogeTestnet';
}

function normalizeSeedMaterial(seedMaterial: SeedMaterial): SeedMaterial {
  return {
    mnemonic: seedMaterial.mnemonic.trim().replace(/\s+/g, ' '),
    passphrase: seedMaterial.passphrase ?? '',
  };
}

function getDogecoinDerivationPath(accountIndex = 0): string {
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error('Account index must be a non-negative integer');
  }
  return `m/44'/3'/${accountIndex}'/0/0`;
}

let dogecoinJsPromise: Promise<DogecoinJS> | null = null;

async function getDogecoinJs(): Promise<DogecoinJS> {
  if (!dogecoinJsPromise) {
    dogecoinJsPromise = DogecoinJS.init();
  }

  return dogecoinJsPromise;
}

async function buildWalletDataFromPrivateKey(
  privateKeyBytes: Uint8Array,
  network: NetworkType,
  metadata?: Partial<WalletData>
): Promise<WalletData> {
  const networkId = getNetworkId(network);
  const wallet = new DogeMemoryWallet(privateKeyBytes, networkId);
  const publicKeyRaw = await wallet.getCompressedPublicKey();
  const publicKey =
    typeof publicKeyRaw === 'string' ? hexToBytes(publicKeyRaw) : publicKeyRaw;
  const address = getP2PKHAddressFromPublicKey(publicKey, networkId);
  const privateKeyWIF = await wallet.getPrivateKeyWIF();

  return {
    address,
    privateKey: privateKeyWIF,
    network,
    publicKey: bytesToHex(publicKey),
    ...metadata,
  };
}

export class BrowserWallet {
  private static readonly STORAGE_KEY = 'dogestash_wallet';
  private static readonly STORAGE_ENCRYPTED_KEY = 'dogestash_wallet_encrypted';
  private static readonly STORAGE_WALLETS = 'dogestash_wallets';
  private static readonly STORAGE_CURRENT = 'dogestash_wallet_current';
  private static readonly STORAGE_ENCRYPTED_PREFIX = 'dogestash_wallet_encrypted_';
  private static readonly STORAGE_UNENCRYPTED_PREFIX = 'dogestash_wallet_unencrypted_';
  private static readonly STORAGE_SEED_PREFIX = 'dogestash_wallet_seed_';

  private static readonly LEGACY_STORAGE_KEY = 'dogemarket_browser_wallet';
  private static readonly LEGACY_STORAGE_ENCRYPTED_KEY = 'dogemarket_browser_wallet_encrypted';
  private static readonly LEGACY_STORAGE_WALLETS = 'dogemarket_browser_wallets';
  private static readonly LEGACY_STORAGE_CURRENT = 'dogemarket_browser_wallet_current';
  private static readonly LEGACY_STORAGE_ENCRYPTED_PREFIX = 'dogemarket_browser_wallet_encrypted_';
  private static readonly LEGACY_STORAGE_UNENCRYPTED_PREFIX = 'dogemarket_browser_wallet_unencrypted_';

  private static ensureStorageMigrated(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const migratePair = (legacy: string, next: string) => {
      if (!localStorage.getItem(next)) {
        const legacyValue = localStorage.getItem(legacy);
        if (legacyValue) {
          localStorage.setItem(next, legacyValue);
        }
      }
    };

    migratePair(BrowserWallet.LEGACY_STORAGE_KEY, BrowserWallet.STORAGE_KEY);
    migratePair(
      BrowserWallet.LEGACY_STORAGE_ENCRYPTED_KEY,
      BrowserWallet.STORAGE_ENCRYPTED_KEY
    );
    migratePair(BrowserWallet.LEGACY_STORAGE_WALLETS, BrowserWallet.STORAGE_WALLETS);
    migratePair(BrowserWallet.LEGACY_STORAGE_CURRENT, BrowserWallet.STORAGE_CURRENT);

    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith(BrowserWallet.LEGACY_STORAGE_ENCRYPTED_PREFIX) ||
        key.startsWith(BrowserWallet.LEGACY_STORAGE_UNENCRYPTED_PREFIX)
      ) {
        keysToMigrate.push(key);
      }
    }

    for (const legacyKey of keysToMigrate) {
      const nextKey = legacyKey
        .replace(
          BrowserWallet.LEGACY_STORAGE_ENCRYPTED_PREFIX,
          BrowserWallet.STORAGE_ENCRYPTED_PREFIX
        )
        .replace(
          BrowserWallet.LEGACY_STORAGE_UNENCRYPTED_PREFIX,
          BrowserWallet.STORAGE_UNENCRYPTED_PREFIX
        );

      if (!localStorage.getItem(nextKey)) {
        const value = localStorage.getItem(legacyKey);
        if (value) {
          localStorage.setItem(nextKey, value);
        }
      }
    }
  }

  private static encryptedKey(address: string): string {
    return `${BrowserWallet.STORAGE_ENCRYPTED_PREFIX}${address}`;
  }

  private static unencryptedKey(address: string): string {
    return `${BrowserWallet.STORAGE_UNENCRYPTED_PREFIX}${address}`;
  }

  private static seedKey(seedFingerprint: string): string {
    return `${BrowserWallet.STORAGE_SEED_PREFIX}${seedFingerprint}`;
  }

  private static legacyMnemonicKey(address: string): string {
    return `wallet_mnemonic_${address}`;
  }

  static getDerivationPath(accountIndex = 0): string {
    return getDogecoinDerivationPath(accountIndex);
  }

  static async computeSeedFingerprint(seedMaterial: SeedMaterial): Promise<string> {
    const normalized = normalizeSeedMaterial(seedMaterial);
    const material = new TextEncoder().encode(
      `${normalized.mnemonic}\u0000${normalized.passphrase ?? ''}`
    );
    return bytesToHex(await sha256(material));
  }

  static async generateWallet(
    network: NetworkType = 'mainnet'
  ): Promise<WalletData & { mnemonic?: string }> {
    BrowserWallet.ensureStorageMigrated();

    const mnemonic = generateMnemonic(englishWordlist, 128);
    const seedMaterial: SeedMaterial = { mnemonic, passphrase: '' };
    const seed = mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive(getDogecoinDerivationPath(0));
    if (!child.privateKey) {
      throw new Error('Failed to derive private key from mnemonic');
    }

    const createdAt = Date.now();
    const wallet = await buildWalletDataFromPrivateKey(child.privateKey, network, {
      createdAt,
      accountIndex: 0,
      derivationPath: getDogecoinDerivationPath(0),
      walletSource: 'generated',
      mnemonicWordCount: 12,
      seedFingerprint: await BrowserWallet.computeSeedFingerprint(seedMaterial),
    });

    localStorage.setItem(`wallet_created_${wallet.address}`, String(createdAt));

    return {
      ...wallet,
      mnemonic,
    };
  }

  static async importFromPrivateKey(
    privateKeyWIF: string,
    network: NetworkType = 'mainnet'
  ): Promise<WalletData> {
    BrowserWallet.ensureStorageMigrated();

    const createdAt = Date.now();
    const wallet = await buildWalletDataFromPrivateKey(
      decodePrivateKeyFromWIF(privateKeyWIF),
      network,
      {
        createdAt,
        privateKey: privateKeyWIF,
        walletSource: 'privateKey',
      }
    );

    localStorage.setItem(`wallet_created_${wallet.address}`, String(createdAt));
    return wallet;
  }

  static async importFromMnemonic(
    mnemonic: string,
    passphrase?: string,
    network: NetworkType = 'mainnet',
    accountIndex = 0
  ): Promise<WalletData> {
    BrowserWallet.ensureStorageMigrated();

    const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
    if (!validateMnemonic(normalizedMnemonic, englishWordlist)) {
      throw new Error('Invalid BIP-39 mnemonic phrase');
    }

    const seedMaterial = normalizeSeedMaterial({
      mnemonic: normalizedMnemonic,
      passphrase,
    });
    const seed = mnemonicToSeedSync(seedMaterial.mnemonic, seedMaterial.passphrase);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive(getDogecoinDerivationPath(accountIndex));
    if (!child.privateKey) {
      throw new Error('Failed to derive private key from mnemonic');
    }

    const createdAt = Date.now();
    const wallet = await buildWalletDataFromPrivateKey(child.privateKey, network, {
      createdAt,
      accountIndex,
      derivationPath: getDogecoinDerivationPath(accountIndex),
      walletSource: 'mnemonic',
      mnemonicWordCount: normalizedMnemonic.split(/\s+/).length,
      seedFingerprint: await BrowserWallet.computeSeedFingerprint(seedMaterial),
    });

    localStorage.setItem(`wallet_created_${wallet.address}`, String(createdAt));
    return wallet;
  }

  async saveWallet(
    wallet: WalletData,
    password?: string,
    options?: BrowserWalletSaveOptions
  ): Promise<void> {
    BrowserWallet.ensureStorageMigrated();

    try {
      const seedMaterial = options?.seedMaterial
        ? normalizeSeedMaterial(options.seedMaterial)
        : null;
      const seedFingerprint =
        seedMaterial
          ? await BrowserWallet.computeSeedFingerprint(seedMaterial)
          : wallet.seedFingerprint;
      const walletToPersist: WalletData = {
        ...wallet,
        seedFingerprint,
      };

      const encryptedKey = BrowserWallet.encryptedKey(wallet.address);
      const unencryptedKey = BrowserWallet.unencryptedKey(wallet.address);

      if (password) {
        const encrypted = await encryptJSON(walletToPersist, password);
        localStorage.setItem(
          encryptedKey,
          JSON.stringify({ encrypted, network: wallet.network } satisfies EncryptedWalletRecord)
        );
        localStorage.removeItem(unencryptedKey);
        localStorage.removeItem(BrowserWallet.STORAGE_KEY);
        localStorage.removeItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
      } else {
        localStorage.setItem(unencryptedKey, JSON.stringify(walletToPersist));
        localStorage.removeItem(encryptedKey);
        localStorage.setItem(BrowserWallet.STORAGE_KEY, JSON.stringify(walletToPersist));
        localStorage.removeItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
      }

      if (seedMaterial && password) {
        await this.saveSeedMaterial(seedMaterial, seedFingerprint!, password);
      }

      const list = await this.readWalletList();
      const idx = list.findIndex((entry) => entry.address === wallet.address);
      const listEntry: StoredWalletEntry = password
        ? {
            address: wallet.address,
            network: wallet.network,
            nickname: walletToPersist.nickname,
            createdAt: walletToPersist.createdAt,
            accountIndex: walletToPersist.accountIndex,
            derivationPath: walletToPersist.derivationPath,
            seedFingerprint: walletToPersist.seedFingerprint,
            mnemonicWordCount: walletToPersist.mnemonicWordCount,
            walletSource: walletToPersist.walletSource,
            publicKey: walletToPersist.publicKey,
            encrypted: true,
          }
        : {
            ...walletToPersist,
            encrypted: false,
          };

      if (idx >= 0) {
        list[idx] = listEntry;
      } else {
        list.push(listEntry);
      }

      localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(list));
      localStorage.setItem(BrowserWallet.STORAGE_CURRENT, wallet.address);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save wallet: ${message}`);
    }
  }

  async loadWallet(password?: string, address?: string): Promise<WalletData | null> {
    BrowserWallet.ensureStorageMigrated();

    try {
      const targetAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
      if (!targetAddress) {
        const encryptedData = localStorage.getItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
        if (encryptedData) {
          if (!password) {
            throw new Error('Wallet is encrypted. Password required.');
          }
          const record = JSON.parse(encryptedData) as EncryptedWalletRecord;
          const decrypted = await decryptJSON<WalletData>(record.encrypted, password);
          const wallet = await this.finalizeLoadedWallet(
            { ...decrypted.value, network: record.network },
            password
          );
          await this.saveWallet(wallet, password);
          return wallet;
        }

        const walletData = localStorage.getItem(BrowserWallet.STORAGE_KEY);
        if (!walletData) {
          return null;
        }

        const parsed = JSON.parse(walletData) as WalletData;
        const wallet = await this.finalizeLoadedWallet(parsed);
        await this.saveWallet(wallet);
        return wallet;
      }

      const encryptedRecord = localStorage.getItem(BrowserWallet.encryptedKey(targetAddress));
      if (encryptedRecord) {
        if (!password) {
          throw new Error('Wallet is encrypted. Password required.');
        }

        const record = JSON.parse(encryptedRecord) as EncryptedWalletRecord;
        const decrypted = await decryptJSON<WalletData>(record.encrypted, password);
        const wallet = await this.finalizeLoadedWallet(
          { ...decrypted.value, network: record.network },
          password,
          targetAddress
        );
        if (decrypted.migrated) {
          await this.saveWallet(wallet, password);
        }
        return this.applyStoredMetadata(wallet, targetAddress);
      }

      const unencryptedRecord = localStorage.getItem(BrowserWallet.unencryptedKey(targetAddress));
      if (unencryptedRecord) {
        const parsed = JSON.parse(unencryptedRecord) as WalletData;
        const wallet = await this.finalizeLoadedWallet(parsed, undefined, targetAddress);
        return this.applyStoredMetadata(wallet, targetAddress);
      }

      const list = await this.readWalletList();
      const found = list.find((entry) => entry.address === targetAddress);
      if (found && found.privateKey && !found.encrypted) {
        return found as WalletData;
      }

      const legacyData = localStorage.getItem(BrowserWallet.STORAGE_KEY);
      if (!legacyData) {
        return null;
      }

      const wallet = await this.finalizeLoadedWallet(
        JSON.parse(legacyData) as WalletData,
        password,
        targetAddress
      );
      await this.saveWallet(wallet, password);
      return wallet;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load wallet: ${message}`);
    }
  }

  async loadSeedMaterial(
    password?: string,
    address?: string
  ): Promise<SeedMaterial | null> {
    BrowserWallet.ensureStorageMigrated();

    const targetAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (!targetAddress) {
      return null;
    }

    const listEntry = await this.getStoredWalletEntry(targetAddress);
    const seedFingerprint = listEntry?.seedFingerprint;
    if (seedFingerprint) {
      const seedRecord = localStorage.getItem(BrowserWallet.seedKey(seedFingerprint));
      if (seedRecord) {
        if (!password) {
          throw new Error('Wallet seed is encrypted. Password required.');
        }

        const decrypted = await decryptJSON<SeedMaterial>(seedRecord, password);
        if (decrypted.migrated) {
          await this.saveSeedMaterial(decrypted.value, seedFingerprint, password);
        }
        return normalizeSeedMaterial(decrypted.value);
      }
    }

    const legacyMnemonic = localStorage.getItem(BrowserWallet.legacyMnemonicKey(targetAddress));
    if (!legacyMnemonic) {
      return null;
    }

    const seedMaterial = normalizeSeedMaterial({
      mnemonic: legacyMnemonic,
      passphrase: '',
    });
    const fingerprint =
      seedFingerprint ?? (await BrowserWallet.computeSeedFingerprint(seedMaterial));
    await this.updateStoredWalletMetadata(targetAddress, {
      seedFingerprint: fingerprint,
      accountIndex: listEntry?.accountIndex ?? 0,
      derivationPath: listEntry?.derivationPath ?? getDogecoinDerivationPath(0),
      mnemonicWordCount: seedMaterial.mnemonic.split(/\s+/).length,
      walletSource: listEntry?.walletSource ?? 'mnemonic',
    });

    if (password) {
      await this.saveSeedMaterial(seedMaterial, fingerprint, password);
      localStorage.removeItem(BrowserWallet.legacyMnemonicKey(targetAddress));
    }

    return seedMaterial;
  }

  async hasSeedMaterial(address?: string): Promise<boolean> {
    BrowserWallet.ensureStorageMigrated();

    const targetAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (!targetAddress) {
      return false;
    }

    const entry = await this.getStoredWalletEntry(targetAddress);
    if (entry?.seedFingerprint && localStorage.getItem(BrowserWallet.seedKey(entry.seedFingerprint))) {
      return true;
    }

    return localStorage.getItem(BrowserWallet.legacyMnemonicKey(targetAddress)) !== null;
  }

  async switchAccount(
    accountIndex: number,
    password?: string,
    address?: string
  ): Promise<WalletData> {
    BrowserWallet.ensureStorageMigrated();

    if (!Number.isInteger(accountIndex) || accountIndex < 0) {
      throw new Error('Account index must be a non-negative integer');
    }

    const currentAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (!currentAddress) {
      throw new Error('No active browser wallet is available');
    }

    const currentWallet = await this.loadWallet(password, currentAddress);
    if (!currentWallet) {
      throw new Error('No active browser wallet is available');
    }

    const seedMaterial = await this.loadSeedMaterial(password, currentAddress);
    if (!seedMaterial) {
      throw new Error('Recovery phrase is unavailable. Set a wallet password to enable HD accounts.');
    }

    const existingAccounts = await this.readWalletList();
    const matchingEntry = existingAccounts.find(
      (entry) =>
        entry.seedFingerprint === currentWallet.seedFingerprint &&
        entry.accountIndex === accountIndex
    );

    const derived = await BrowserWallet.importFromMnemonic(
      seedMaterial.mnemonic,
      seedMaterial.passphrase,
      currentWallet.network,
      accountIndex
    );

    const walletToPersist: WalletData = {
      ...derived,
      nickname: matchingEntry?.nickname,
      walletSource:
        currentWallet.walletSource === 'generated' ? 'generated' : 'mnemonic',
    };

    await this.saveWallet(walletToPersist, password, { seedMaterial });
    await this.selectWallet(walletToPersist.address);
    return walletToPersist;
  }

  async hasWallet(): Promise<boolean> {
    BrowserWallet.ensureStorageMigrated();

    const list = await this.readWalletList();
    if (list.length > 0) {
      return true;
    }

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith(BrowserWallet.STORAGE_ENCRYPTED_PREFIX) ||
        key.startsWith(BrowserWallet.STORAGE_UNENCRYPTED_PREFIX)
      ) {
        return true;
      }
    }

    return (
      localStorage.getItem(BrowserWallet.STORAGE_KEY) !== null ||
      localStorage.getItem(BrowserWallet.STORAGE_ENCRYPTED_KEY) !== null
    );
  }

  async isEncrypted(address?: string): Promise<boolean> {
    BrowserWallet.ensureStorageMigrated();

    const targetAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (targetAddress && localStorage.getItem(BrowserWallet.encryptedKey(targetAddress))) {
      return true;
    }

    if (localStorage.getItem(BrowserWallet.STORAGE_ENCRYPTED_KEY)) {
      return true;
    }

    const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (!current) {
      return false;
    }

    const entry = await this.getStoredWalletEntry(address || current);
    return !!entry?.encrypted;
  }

  async removeWallet(address?: string): Promise<void> {
    BrowserWallet.ensureStorageMigrated();

    let walletAddress = address ?? localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (!walletAddress) {
      try {
        const loaded = await this.loadWallet();
        if (loaded) {
          walletAddress = loaded.address;
        }
      } catch {
        walletAddress = null;
      }
    }

    const list = await this.readWalletList();
    const removedEntry = walletAddress
      ? list.find((entry) => entry.address === walletAddress) ?? null
      : null;

    if (walletAddress) {
      localStorage.removeItem(BrowserWallet.encryptedKey(walletAddress));
      localStorage.removeItem(BrowserWallet.unencryptedKey(walletAddress));
      localStorage.removeItem(BrowserWallet.legacyMnemonicKey(walletAddress));
      localStorage.removeItem(`wallet_backed_up_${walletAddress}`);
      localStorage.removeItem(`wallet_created_${walletAddress}`);
    }

    localStorage.removeItem(BrowserWallet.STORAGE_KEY);
    localStorage.removeItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);

    const filtered = walletAddress
      ? list.filter((entry) => entry.address !== walletAddress)
      : list;
    localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(filtered));

    const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (current && walletAddress && current === walletAddress) {
      localStorage.removeItem(BrowserWallet.STORAGE_CURRENT);
      if (filtered.length > 0) {
        localStorage.setItem(BrowserWallet.STORAGE_CURRENT, filtered[0].address);
      }
    }

    if (
      removedEntry?.seedFingerprint &&
      !filtered.some((entry) => entry.seedFingerprint === removedEntry.seedFingerprint)
    ) {
      localStorage.removeItem(BrowserWallet.seedKey(removedEntry.seedFingerprint));
    }
  }

  async listWallets(): Promise<WalletData[]> {
    BrowserWallet.ensureStorageMigrated();
    return (await this.readWalletList()) as WalletData[];
  }

  async selectWallet(address: string): Promise<WalletData | null> {
    BrowserWallet.ensureStorageMigrated();

    const list = await this.readWalletList();
    const found = list.find((entry) => entry.address === address) || null;
    if (found) {
      localStorage.setItem(BrowserWallet.STORAGE_CURRENT, found.address);
    }
    return found as WalletData | null;
  }

  async clearAllWallets(): Promise<void> {
    BrowserWallet.ensureStorageMigrated();

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith(BrowserWallet.STORAGE_ENCRYPTED_PREFIX) ||
        key.startsWith(BrowserWallet.STORAGE_UNENCRYPTED_PREFIX) ||
        key.startsWith(BrowserWallet.STORAGE_SEED_PREFIX) ||
        key.startsWith(BrowserWallet.LEGACY_STORAGE_ENCRYPTED_PREFIX) ||
        key.startsWith(BrowserWallet.LEGACY_STORAGE_UNENCRYPTED_PREFIX) ||
        key.startsWith('wallet_mnemonic_') ||
        key.startsWith('wallet_backed_up_') ||
        key.startsWith('wallet_created_')
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    localStorage.removeItem(BrowserWallet.STORAGE_WALLETS);
    localStorage.removeItem(BrowserWallet.STORAGE_CURRENT);
    localStorage.removeItem(BrowserWallet.STORAGE_KEY);
    localStorage.removeItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
    localStorage.removeItem(BrowserWallet.LEGACY_STORAGE_WALLETS);
    localStorage.removeItem(BrowserWallet.LEGACY_STORAGE_CURRENT);
    localStorage.removeItem(BrowserWallet.LEGACY_STORAGE_KEY);
    localStorage.removeItem(BrowserWallet.LEGACY_STORAGE_ENCRYPTED_KEY);
  }

  async updateNickname(address: string, nickname?: string): Promise<void> {
    BrowserWallet.ensureStorageMigrated();

    const list = await this.readWalletList();
    const idx = list.findIndex((entry) => entry.address === address);
    if (idx >= 0) {
      list[idx] = { ...list[idx], nickname };
      localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(list));
    }

    const raw = localStorage.getItem(BrowserWallet.unencryptedKey(address));
    if (raw) {
      try {
        const wallet = JSON.parse(raw) as WalletData;
        wallet.nickname = nickname;
        localStorage.setItem(BrowserWallet.unencryptedKey(address), JSON.stringify(wallet));
        const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
        if (current === address) {
          localStorage.setItem(BrowserWallet.STORAGE_KEY, JSON.stringify(wallet));
        }
      } catch {
        // Ignore malformed unencrypted cache entries.
      }
    }
  }

  private async saveSeedMaterial(
    seedMaterial: SeedMaterial,
    seedFingerprint: string,
    password: string
  ): Promise<void> {
    const normalized = normalizeSeedMaterial(seedMaterial);
    const encrypted = await encryptJSON(normalized, password);
    localStorage.setItem(BrowserWallet.seedKey(seedFingerprint), encrypted);
  }

  private async readWalletList(): Promise<StoredWalletEntry[]> {
    const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
    if (!listRaw) {
      return [];
    }

    try {
      return JSON.parse(listRaw) as StoredWalletEntry[];
    } catch {
      return [];
    }
  }

  private async getStoredWalletEntry(address: string): Promise<StoredWalletEntry | null> {
    const list = await this.readWalletList();
    return list.find((entry) => entry.address === address) ?? null;
  }

  private applyStoredMetadata(wallet: WalletData, address: string): WalletData {
    const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
    if (!listRaw) {
      return wallet;
    }

    try {
      const list = JSON.parse(listRaw) as StoredWalletEntry[];
      const entry = list.find((item) => item.address === address);
      if (!entry) {
        return wallet;
      }

      return {
        ...wallet,
        nickname: entry.nickname ?? wallet.nickname,
        createdAt: entry.createdAt ?? wallet.createdAt,
        accountIndex: entry.accountIndex ?? wallet.accountIndex,
        derivationPath: entry.derivationPath ?? wallet.derivationPath,
        seedFingerprint: entry.seedFingerprint ?? wallet.seedFingerprint,
        mnemonicWordCount: entry.mnemonicWordCount ?? wallet.mnemonicWordCount,
        walletSource: entry.walletSource ?? wallet.walletSource,
        publicKey: entry.publicKey ?? wallet.publicKey,
      };
    } catch {
      return wallet;
    }
  }

  private async updateStoredWalletMetadata(
    address: string,
    updates: Partial<WalletData>
  ): Promise<void> {
    const list = await this.readWalletList();
    const idx = list.findIndex((entry) => entry.address === address);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(list));
    }

    const unencryptedRaw = localStorage.getItem(BrowserWallet.unencryptedKey(address));
    if (unencryptedRaw) {
      try {
        const wallet = JSON.parse(unencryptedRaw) as WalletData;
        localStorage.setItem(
          BrowserWallet.unencryptedKey(address),
          JSON.stringify({ ...wallet, ...updates })
        );
      } catch {
        // Ignore malformed cache entry.
      }
    }

    const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (current === address) {
      const currentRaw = localStorage.getItem(BrowserWallet.STORAGE_KEY);
      if (currentRaw) {
        try {
          const wallet = JSON.parse(currentRaw) as WalletData;
          localStorage.setItem(BrowserWallet.STORAGE_KEY, JSON.stringify({ ...wallet, ...updates }));
        } catch {
          // Ignore malformed current cache entry.
        }
      }
    }
  }

  private async finalizeLoadedWallet(
    wallet: WalletData,
    password?: string,
    addressHint?: string
  ): Promise<WalletData> {
    const address = addressHint || wallet.address;
    let hydrated = this.applyStoredMetadata(wallet, address);

    const legacyMnemonic = localStorage.getItem(BrowserWallet.legacyMnemonicKey(address));
    if (!legacyMnemonic) {
      return hydrated;
    }

    const seedMaterial = normalizeSeedMaterial({
      mnemonic: legacyMnemonic,
      passphrase: '',
    });
    const fingerprint = hydrated.seedFingerprint ?? (await BrowserWallet.computeSeedFingerprint(seedMaterial));

    const metadataUpdates: Partial<WalletData> = {
      seedFingerprint: fingerprint,
      accountIndex: hydrated.accountIndex ?? 0,
      derivationPath: hydrated.derivationPath ?? getDogecoinDerivationPath(0),
      mnemonicWordCount: hydrated.mnemonicWordCount ?? seedMaterial.mnemonic.split(/\s+/).length,
      walletSource: hydrated.walletSource ?? 'mnemonic',
    };

    hydrated = { ...hydrated, ...metadataUpdates };
    await this.updateStoredWalletMetadata(address, metadataUpdates);

    if (password) {
      await this.saveSeedMaterial(seedMaterial, fingerprint, password);
      localStorage.removeItem(BrowserWallet.legacyMnemonicKey(address));
    }

    return hydrated;
  }

  private async resolveWalletForSend(options: {
    wallet?: WalletData;
    password?: string;
    address?: string;
  }): Promise<WalletData> {
    if (options.wallet) {
      return options.wallet;
    }

    const loaded = await this.loadWallet(options.password, options.address);
    if (!loaded) {
      throw new Error('No browser wallet is available for sending');
    }

    return loaded;
  }

  async buildTransaction(
    recipientAddress: string,
    amountDoge: number,
    options: BrowserWalletSendTransactionOptions
  ): Promise<BrowserWalletBuiltTransaction> {
    BrowserWallet.ensureStorageMigrated();

    if (!recipientAddress || !recipientAddress.trim()) {
      throw new Error('Recipient address is required');
    }

    if (!Array.isArray(options.utxos) || options.utxos.length === 0) {
      throw new Error('Spendable UTXOs are required');
    }

    const wallet = await this.resolveWalletForSend(options);
    const feeRate = Math.max(1, Math.floor(options.feeRate ?? DEFAULT_DOGE_FEE_RATE));
    const minConfirmations = Math.max(
      0,
      Math.floor(options.minConfirmations ?? DEFAULT_MIN_CONFIRMATIONS)
    );
    const sendValue = normalizeDogeAmountToKoinu(amountDoge);

    const spendableUtxos = options.utxos
      .filter((utxo) => Number.isFinite(utxo.value) && utxo.value > 0)
      .filter((utxo) => (utxo.confirmations ?? 0) >= minConfirmations)
      .filter((utxo) => options.includeInscribedUtxos || !isInscribedUtxo(utxo));

    if (spendableUtxos.length === 0) {
      throw new Error(
        options.includeInscribedUtxos
          ? 'No spendable UTXOs are available'
          : 'No spendable plain DOGE UTXOs are available'
      );
    }

    const selected = coinSelectP2PKH(
      wallet.address,
      feeRate,
      spendableUtxos.map((utxo) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
      })),
      [{ address: recipientAddress.trim(), value: sendValue }]
    );

    const signer = DogeMemoryWallet.fromWIF(wallet.privateKey, getNetworkId(wallet.network));
    const finalizedTx = await createP2PKHTransaction(signer, selected).finalizeAndSign();

    const inputTotal = selected.inputs.reduce((sum, utxo) => sum + utxo.value, 0);
    const outputTotal = selected.outputs.reduce((sum, output) => sum + output.value, 0);
    const change = Math.max(0, outputTotal - sendValue);

    return {
      txHex: finalizedTx.toHex(),
      fee: selected.fee,
      inputCount: selected.inputs.length,
      outputCount: selected.outputs.length,
      inputTotal,
      outputTotal,
      change,
    };
  }

  async sendTransaction(
    recipientAddress: string,
    amountDoge: number,
    options: BrowserWalletSendTransactionOptions
  ): Promise<string> {
    BrowserWallet.ensureStorageMigrated();

    if (typeof options.broadcastTx !== 'function') {
      throw new Error('A broadcastTx callback is required to send a transaction');
    }

    const built = await this.buildTransaction(recipientAddress, amountDoge, options);
    return options.broadcastTx(built.txHex);
  }

  async signMessage(message: string, password?: string, address?: string): Promise<string> {
    BrowserWallet.ensureStorageMigrated();

    if (!message) {
      throw new Error('Message is required');
    }

    const wallet = await this.loadWallet(password, address);
    if (!wallet) {
      throw new Error('No browser wallet is available for signing');
    }

    const dogecoinJs = await getDogecoinJs();
    return dogecoinJs.signMessage(wallet.privateKey, message);
  }

  async signPSBT(
    psbt: string,
    _inputIndexes?: number[],
    _password?: string,
    _address?: string
  ): Promise<string> {
    BrowserWallet.ensureStorageMigrated();

    if (!psbt || !psbt.trim()) {
      throw new Error('PSBT is required');
    }

    throw new Error('PSBT signing is not implemented for local browser wallet yet');
  }

  async signIntent(
    payload: IntentPayload,
    password?: string,
    address?: string
  ): Promise<SignedIntent> {
    BrowserWallet.ensureStorageMigrated();

    if (!payload || typeof payload !== 'object') {
      throw new Error('Intent payload is required');
    }

    const allowedIntents = new Set([
      'listing_buy',
      'offer_create',
      'offer_cancel',
      'bid_place',
      'bid_cancel',
      'auction_settle',
    ]);

    if (!allowedIntents.has(payload.intentType)) {
      throw new Error(`Unsupported intentType: ${payload.intentType}`);
    }

    const expiresAtMs = Date.parse(payload.expiresAt);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw new Error('Intent has expired');
    }

    const wallet = await this.loadWallet(password, address);
    if (!wallet) {
      throw new Error('No browser wallet is available for intent signing');
    }

    if (payload.network !== wallet.network) {
      throw new Error(`Intent network mismatch: expected ${wallet.network}, got ${payload.network}`);
    }

    if (payload.address !== wallet.address) {
      throw new Error('Intent address does not match the active wallet');
    }

    const canonicalPayload = canonicalize(payload) as Record<string, unknown>;
    const canonicalJson = JSON.stringify(canonicalPayload);
    const payloadHash = bytesToHex(await doubleSha256(new TextEncoder().encode(canonicalJson)));
    const signature = await this.signMessage(canonicalJson, password, wallet.address);

    return {
      signature,
      signingAddress: wallet.address,
      signedAt: new Date().toISOString(),
      payloadHash,
    };
  }
}

export const generateWallet = BrowserWallet.generateWallet;
export const importFromPrivateKey = BrowserWallet.importFromPrivateKey;
export const importFromMnemonic = BrowserWallet.importFromMnemonic;
