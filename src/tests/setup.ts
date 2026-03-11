import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';

// Ensure Web Crypto API is available in jsdom (Node 18+ provides it natively,
// but jsdom may not wire window.crypto up automatically).
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}

// Provide btoa/atob in case the test environment doesn't have them
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
  globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

// Some environments expose a non-Web-Storage localStorage object.
// Normalize to a standards-like in-memory store for deterministic tests.
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function' ||
  typeof globalThis.localStorage.setItem !== 'function' ||
  typeof globalThis.localStorage.removeItem !== 'function' ||
  typeof globalThis.localStorage.clear !== 'function'
) {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => {
        mem.set(String(k), String(v));
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => {
        mem.clear();
      },
      key: (index: number) => Array.from(mem.keys())[index] ?? null,
      get length() {
        return mem.size;
      },
    },
  });
}
