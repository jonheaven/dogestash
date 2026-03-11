/**
 * Browser wallet implementation using doge-sdk (browser-compatible Dogecoin library).
 * No crypto polyfills needed - doge-sdk is designed for browser use.
 *
 * ─── Dogecoin Chain Parameters ───────────────────────────────────────────────
 * Source: dogecoin/dogecoin src/chainparams.cpp
 *
 * MAINNET
 *   pubKeyHash   (PUBKEY_ADDRESS)  30  / 0x1E   → P2PKH addresses start with 'D'
 *   scriptHash   (SCRIPT_ADDRESS)  22  / 0x16   → P2SH  addresses start with 'A'
 *   WIF prefix   (SECRET_KEY)     158  / 0x9E   → compressed WIF starts with 'Q'
 *                                                 uncompressed WIF starts with '6'
 *   BIP32 public (EXT_PUBLIC_KEY)  0x02 0xFA 0xCA 0xFD  → base58 prefix "dgub"
 *   BIP32 private(EXT_SECRET_KEY)  0x02 0xFA 0xC3 0x98  → base58 prefix "dgpv"
 *   BIP44 coin type: 3   derivation: m/44'/3'/0'/0/0
 *
 * TESTNET
 *   pubKeyHash   (PUBKEY_ADDRESS) 113  / 0x71   → addresses start with 'n'
 *   scriptHash   (SCRIPT_ADDRESS) 196  / 0xC4   → addresses start with '2'
 *   WIF prefix   (SECRET_KEY)    241  / 0xF1    → compressed WIF starts with 'c'
 *   BIP32 public (EXT_PUBLIC_KEY)  0x04 0x35 0x87 0xCF  → base58 prefix "tpub"
 *   BIP32 private(EXT_SECRET_KEY)  0x04 0x35 0x83 0x94  → base58 prefix "tprv"
 *
 * REGTEST (local dev)
 *   pubKeyHash   111 / 0x6F  |  scriptHash 196 / 0xC4  |  WIF prefix 239 / 0xEF
 *   BIP32 public/private: same 4-byte prefixes as testnet (tpub / tprv)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DogecoinJS } from '@mydogeofficial/dogecoin-js';
import {
  DogeMemoryWallet,
  coinSelectP2PKH,
  createP2PKHTransaction,
  getP2PKHAddressFromPublicKey,
  decodePrivateKeyFromWIF,
} from 'doge-sdk';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';

import type { WalletData, NetworkType, IntentPayload, SignedIntent } from '../types/wallet';

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
  const digest = await crypto.subtle.digest('SHA-256', data);
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

let dogecoinJsPromise: Promise<DogecoinJS> | null = null;

async function getDogecoinJs(): Promise<DogecoinJS> {
  if (!dogecoinJsPromise) {
    dogecoinJsPromise = DogecoinJS.init();
  }

  return dogecoinJsPromise;
}

export class BrowserWallet {
  private static readonly STORAGE_KEY = 'dogestash_wallet';
  private static readonly STORAGE_ENCRYPTED_KEY = 'dogestash_wallet_encrypted';
  private static readonly STORAGE_WALLETS = 'dogestash_wallets';
  private static readonly STORAGE_CURRENT = 'dogestash_wallet_current';
  private static readonly STORAGE_ENCRYPTED_PREFIX = 'dogestash_wallet_encrypted_';
  private static readonly STORAGE_UNENCRYPTED_PREFIX = 'dogestash_wallet_unencrypted_';

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
    migratePair(BrowserWallet.LEGACY_STORAGE_ENCRYPTED_KEY, BrowserWallet.STORAGE_ENCRYPTED_KEY);
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
        .replace(BrowserWallet.LEGACY_STORAGE_ENCRYPTED_PREFIX, BrowserWallet.STORAGE_ENCRYPTED_PREFIX)
        .replace(BrowserWallet.LEGACY_STORAGE_UNENCRYPTED_PREFIX, BrowserWallet.STORAGE_UNENCRYPTED_PREFIX);
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

  // Generate a new wallet (with optional mnemonic support)
  static async generateWallet(network: NetworkType = 'mainnet'): Promise<WalletData & { mnemonic?: string }> {
    BrowserWallet.ensureStorageMigrated();
    const networkId = network === 'mainnet' ? 'doge' : 'dogeTestnet';

    // Generate a BIP-39 mnemonic and derive a Dogecoin private key using BIP-32.
    // This uses browser-safe @scure libs and does not rely on Node polyfills.
    const mnemonic = generateMnemonic(englishWordlist, 128); // 12 words
    const seed = mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive("m/44'/3'/0'/0/0"); // Dogecoin path
    if (!child.privateKey) {
      throw new Error('Failed to derive private key from mnemonic');
    }

    const wallet = new DogeMemoryWallet(child.privateKey, networkId);
    const publicKeyRaw = await wallet.getCompressedPublicKey();
    const publicKey =
      typeof publicKeyRaw === 'string' ? hexToBytes(publicKeyRaw) : publicKeyRaw;
    const address = getP2PKHAddressFromPublicKey(publicKey, networkId);
    const privateKeyWIF = await wallet.getPrivateKeyWIF();

    // Track wallet creation time
    const createdAt = Date.now();
    localStorage.setItem(`wallet_created_${address}`, createdAt.toString());

    return {
      address,
      privateKey: privateKeyWIF,
      network,
      mnemonic,
      createdAt,
    };
  }

  static async importFromPrivateKey(privateKeyWIF: string, network: NetworkType = 'mainnet'): Promise<WalletData> {
    BrowserWallet.ensureStorageMigrated();
    // Use doge-sdk to decode WIF and get address
    const networkId = network === 'mainnet' ? 'doge' : 'dogeTestnet';
    const privateKey = decodePrivateKeyFromWIF(privateKeyWIF);

    // Create a temporary wallet to get the public key and address
    const wallet = new DogeMemoryWallet(privateKey, networkId);
    const publicKeyRaw = await wallet.getCompressedPublicKey();
    const publicKey =
      typeof publicKeyRaw === 'string' ? hexToBytes(publicKeyRaw) : publicKeyRaw;
    const address = getP2PKHAddressFromPublicKey(publicKey, networkId);

    // Track wallet creation time (for imported wallets, use current time)
    const createdAt = Date.now();
    localStorage.setItem(`wallet_created_${address}`, createdAt.toString());

    return { address, privateKey: privateKeyWIF, network, createdAt };
  }

  static async importFromMnemonic(
    mnemonic: string,
    passphrase?: string,
    network: NetworkType = 'mainnet'
  ): Promise<WalletData> {
    BrowserWallet.ensureStorageMigrated();

    const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
    const entropy = mnemonicToSeedSync(normalizedMnemonic, passphrase ?? '');
    const root = HDKey.fromMasterSeed(entropy);
    const child = root.derive("m/44'/3'/0'/0/0");

    if (!child.privateKey) {
      throw new Error('Failed to derive private key from mnemonic');
    }

    const networkId = network === 'mainnet' ? 'doge' : 'dogeTestnet';
    const wallet = new DogeMemoryWallet(child.privateKey, networkId);
    const publicKeyRaw = await wallet.getCompressedPublicKey();
    const publicKey =
      typeof publicKeyRaw === 'string' ? hexToBytes(publicKeyRaw) : publicKeyRaw;
    const address = getP2PKHAddressFromPublicKey(publicKey, networkId);
    const privateKeyWIF = await wallet.getPrivateKeyWIF();
    const createdAt = Date.now();

    localStorage.setItem(`wallet_created_${address}`, createdAt.toString());

    return {
      address,
      privateKey: privateKeyWIF,
      network,
      createdAt,
    };
  }

  async saveWallet(wallet: WalletData, password?: string): Promise<void> {
    BrowserWallet.ensureStorageMigrated();
    try {
      // Store encrypted data per wallet address (supports multiple wallets with different passwords)
      const encryptedKey = BrowserWallet.encryptedKey(wallet.address);
      const unencryptedKey = BrowserWallet.unencryptedKey(wallet.address);

      if (password) {
        const encrypted = await this.encryptWallet(wallet, password);
        localStorage.setItem(encryptedKey, JSON.stringify({ encrypted, network: wallet.network }));
        localStorage.removeItem(unencryptedKey);
        // Remove legacy global encrypted key if it exists
        localStorage.removeItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
      } else {
        localStorage.setItem(unencryptedKey, JSON.stringify(wallet));
        localStorage.removeItem(encryptedKey);
        // Also save to legacy key for backward compatibility
        localStorage.setItem(BrowserWallet.STORAGE_KEY, JSON.stringify(wallet));
      }

      // Multi-wallet support: add/update in wallets array and set current
      const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
      const list: any[] = listRaw ? JSON.parse(listRaw) as any[] : [];
      const idx = list.findIndex((w: any) => w.address === wallet.address);
      const listEntry: any = password
        ? { address: wallet.address, network: wallet.network, nickname: wallet.nickname, encrypted: true }
        : { ...wallet, encrypted: false };
      if (idx >= 0) list[idx] = listEntry; else list.push(listEntry);
      localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(list));
      localStorage.setItem(BrowserWallet.STORAGE_CURRENT, wallet.address);
    } catch (error: any) {
      throw new Error(`Failed to save wallet: ${error.message}`);
    }
  }

  async loadWallet(password?: string, address?: string): Promise<WalletData | null> {
    BrowserWallet.ensureStorageMigrated();
    try {
      // Determine which wallet to load (use provided address or current selection)
      const targetAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
      if (!targetAddress) {
        // Fallback to legacy storage
        const encryptedData = localStorage.getItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
        if (encryptedData) {
          if (!password) throw new Error('Wallet is encrypted. Password required.');
          const { encrypted, network } = JSON.parse(encryptedData);
          const wallet = await this.decryptWallet(encrypted, password);
          return { ...wallet, network } as WalletData;
        }
        const walletData = localStorage.getItem(BrowserWallet.STORAGE_KEY);
        return walletData ? (JSON.parse(walletData) as WalletData) : null;
      }

      // Check per-wallet encrypted storage
      const encryptedKey = BrowserWallet.encryptedKey(targetAddress);
      const encryptedData = localStorage.getItem(encryptedKey);
      if (encryptedData) {
        if (!password) throw new Error('Wallet is encrypted. Password required.');
        const { encrypted, network } = JSON.parse(encryptedData);
        const wallet = await this.decryptWallet(encrypted, password);
        return { ...wallet, network } as WalletData;
      }

      // Check per-wallet unencrypted storage
      const unencryptedKey = BrowserWallet.unencryptedKey(targetAddress);
      const walletData = localStorage.getItem(unencryptedKey);
      if (walletData) {
        return JSON.parse(walletData) as WalletData;
      }

      // Fallback to multi-wallet list (only for non-encrypted wallets)
      const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
      if (listRaw) {
        const list: any[] = JSON.parse(listRaw);
        const found = list.find((w: any) => w.address === targetAddress);
        // Only return from list if it's not encrypted (has privateKey in the entry)
        if (found && found.privateKey && !found.encrypted) {
          return found as WalletData;
        }
      }

      // Final fallback to legacy storage
      const legacyData = localStorage.getItem(BrowserWallet.STORAGE_KEY);
      return legacyData ? (JSON.parse(legacyData) as WalletData) : null;
    } catch (error: any) {
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  async hasWallet(): Promise<boolean> {
    BrowserWallet.ensureStorageMigrated();
    const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
    if (listRaw) {
      try {
        const list: WalletData[] = JSON.parse(listRaw);
        return list.length > 0;
      } catch {}
    }
    return (
      localStorage.getItem(BrowserWallet.STORAGE_KEY) !== null ||
      localStorage.getItem(BrowserWallet.STORAGE_ENCRYPTED_KEY) !== null
    );
  }

  async isEncrypted(address?: string): Promise<boolean> {
    BrowserWallet.ensureStorageMigrated();
    const targetAddress = address || localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (targetAddress) {
      // Check per-wallet encrypted storage
      const encryptedKey = BrowserWallet.encryptedKey(targetAddress);
      if (localStorage.getItem(encryptedKey)) return true;
    }
    // Check legacy global encrypted key
    if (localStorage.getItem(BrowserWallet.STORAGE_ENCRYPTED_KEY)) return true;
    // Check list flag for current wallet
    const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
    if (current && listRaw) {
      try {
        const list: any[] = JSON.parse(listRaw);
        const entry = list.find((w: any) => w.address === (address || current));
        return !!entry?.encrypted;
      } catch {}
    }
    return false;
  }

  async removeWallet(address?: string): Promise<void> {
    BrowserWallet.ensureStorageMigrated();
    let walletAddress: string | null = address || null;
    if (!walletAddress) {
      // Try current selection first
      walletAddress = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    }
    if (!walletAddress) {
      try {
        const loaded = await this.loadWallet();
        if (loaded) walletAddress = loaded.address;
      } catch {}
    }
    
    if (walletAddress) {
      // Remove per-wallet encrypted and unencrypted storage
      localStorage.removeItem(BrowserWallet.encryptedKey(walletAddress));
      localStorage.removeItem(BrowserWallet.unencryptedKey(walletAddress));
      localStorage.removeItem(`wallet_mnemonic_${walletAddress}`);
      localStorage.removeItem(`wallet_backed_up_${walletAddress}`);
      localStorage.removeItem(`wallet_created_${walletAddress}`);
    }
    
    // Remove legacy global keys
    localStorage.removeItem(BrowserWallet.STORAGE_KEY);
    localStorage.removeItem(BrowserWallet.STORAGE_ENCRYPTED_KEY);
    
    // Remove from multi-wallet list
    const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
    if (listRaw) {
      try {
        const list: WalletData[] = JSON.parse(listRaw);
        const filtered = walletAddress ? list.filter(w => w.address !== walletAddress) : list;
        localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(filtered));
        const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
        if (current && walletAddress && current === walletAddress) {
          localStorage.removeItem(BrowserWallet.STORAGE_CURRENT);
          if (filtered.length > 0) {
            localStorage.setItem(BrowserWallet.STORAGE_CURRENT, filtered[0].address);
          }
        }
      } catch {}
    }
  }

  // List stored wallets
  async listWallets(): Promise<WalletData[]> {
    BrowserWallet.ensureStorageMigrated();
    const listRaw = localStorage.getItem(BrowserWallet.STORAGE_WALLETS);
    if (!listRaw) return [];
    try { return JSON.parse(listRaw) as WalletData[]; } catch { return []; }
  }

  // Select active wallet by address
  async selectWallet(address: string): Promise<WalletData | null> {
    BrowserWallet.ensureStorageMigrated();
    const list = await this.listWallets();
    const found = list.find(w => w.address === address) || null;
    if (found) localStorage.setItem(BrowserWallet.STORAGE_CURRENT, found.address);
    return found;
  }

  // Clear all stored browser wallets and selections
  async clearAllWallets(): Promise<void> {
    BrowserWallet.ensureStorageMigrated();

    // Remove per-wallet and metadata keys that may outlive list/current keys.
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (
        key.startsWith(BrowserWallet.STORAGE_ENCRYPTED_PREFIX) ||
        key.startsWith(BrowserWallet.STORAGE_UNENCRYPTED_PREFIX) ||
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

  // Update (or set) nickname for a wallet
  async updateNickname(address: string, nickname?: string): Promise<void> {
    BrowserWallet.ensureStorageMigrated();
    const list = await this.listWallets();
    const idx = list.findIndex(w => w.address === address);
    if (idx >= 0) {
      list[idx] = { ...list[idx], nickname } as WalletData;
      localStorage.setItem(BrowserWallet.STORAGE_WALLETS, JSON.stringify(list));
    }
    const current = localStorage.getItem(BrowserWallet.STORAGE_CURRENT);
    if (current === address) {
      // Update non-encrypted current cache if present
      const raw = localStorage.getItem(BrowserWallet.STORAGE_KEY);
      if (raw) {
        try {
          const obj = JSON.parse(raw) as WalletData;
          obj.nickname = nickname;
          localStorage.setItem(BrowserWallet.STORAGE_KEY, JSON.stringify(obj));
        } catch {}
      }
    }
  }

  private async encryptWallet(wallet: WalletData, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(wallet));
    const keyMaterial = await window.crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  private async decryptWallet(encryptedData: string, password: string): Promise<WalletData> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    const keyMaterial = await window.crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    const key = await window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return JSON.parse(decoder.decode(decrypted)) as WalletData;
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
    const minConfirmations = Math.max(0, Math.floor(options.minConfirmations ?? DEFAULT_MIN_CONFIRMATIONS));
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
    if (!message) throw new Error('Message is required');
    const wallet = await this.loadWallet(password, address);
    if (!wallet) throw new Error('No browser wallet is available for signing');
    const dogecoinJs = await getDogecoinJs();
    return dogecoinJs.signMessage(wallet.privateKey, message);
  }

  async signPSBT(psbt: string, _inputIndexes?: number[], _password?: string, _address?: string): Promise<string> {
    BrowserWallet.ensureStorageMigrated();
    if (!psbt || !psbt.trim()) {
      throw new Error('PSBT is required');
    }
    throw new Error('PSBT signing is not implemented for local browser wallet yet');
  }

  async signIntent(payload: IntentPayload, password?: string, address?: string): Promise<SignedIntent> {
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

// Export static methods separately for compatibility
export const generateWallet = BrowserWallet.generateWallet;
export const importFromPrivateKey = BrowserWallet.importFromPrivateKey;
export const importFromMnemonic = BrowserWallet.importFromMnemonic;
