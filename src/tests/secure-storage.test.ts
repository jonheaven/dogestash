import { beforeEach, describe, expect, it } from 'vitest';

import {
  decryptJSON,
  decryptText,
  encryptJSON,
  encryptText,
  looksLikeSecureStorageEnvelope,
} from '../lib/secureStorage';

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

async function createLegacyPayload(value: string, password: string): Promise<string> {
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
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);

  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);

  return bytesToBase64(combined);
}

describe('secureStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('encrypts text into a versioned Web Crypto envelope', async () => {
    const encrypted = await encryptText('dogestash-secret', 'test-pass');

    expect(looksLikeSecureStorageEnvelope(encrypted)).toBe(true);

    const decrypted = await decryptText(encrypted, 'test-pass');
    expect(decrypted.value).toBe('dogestash-secret');
    expect(decrypted.migrated).toBe(false);
    expect(decrypted.version).toBe(2);
  });

  it('encrypts and decrypts JSON payloads', async () => {
    const encrypted = await encryptJSON(
      { wallet: 'browser', accountIndex: 2, ledgerRecommended: true },
      'json-pass'
    );
    const decrypted = await decryptJSON<{
      wallet: string;
      accountIndex: number;
      ledgerRecommended: boolean;
    }>(encrypted, 'json-pass');

    expect(decrypted.value).toEqual({
      wallet: 'browser',
      accountIndex: 2,
      ledgerRecommended: true,
    });
    expect(decrypted.migrated).toBe(false);
  });

  it('decrypts the legacy combined payload format and marks it for migration', async () => {
    const legacy = await createLegacyPayload(
      JSON.stringify({ phrase: 'much seed very backup' }),
      'legacy-pass'
    );
    const decrypted = await decryptText(legacy, 'legacy-pass');

    expect(JSON.parse(decrypted.value)).toEqual({ phrase: 'much seed very backup' });
    expect(decrypted.migrated).toBe(true);
    expect(decrypted.version).toBe(1);
  });
});
