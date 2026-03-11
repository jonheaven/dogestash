import { beforeEach, describe, expect, it } from 'vitest';
import { DogecoinJS } from '@mydogeofficial/dogecoin-js';
import { BrowserWallet } from '../lib/browser-wallet';
import { BrowserWalletSigner } from '../adapters/BrowserWalletSigner';
import type { IntentPayload } from '../types/wallet';

describe('BrowserWallet signing', () => {
  let wallet: BrowserWallet;

  beforeEach(() => {
    localStorage.clear();
    wallet = new BrowserWallet();
  });

  it('signMessage is deterministic for same wallet and message', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    const m = 'marketplace-intent-test';
    const sigA = await wallet.signMessage(m, undefined, created.address);
    const sigB = await wallet.signMessage(m, undefined, created.address);
    expect(sigA).toBe(sigB);

    const dogecoinJs = await DogecoinJS.init();
    expect(dogecoinJs.verifyMessage(sigA, m, created.address)).toBe(true);
  });

  it('signIntent returns signature envelope fields', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    const payload: IntentPayload = {
      intentType: 'offer_create',
      nonce: 'n-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      network: 'mainnet',
      chainId: 'doge-mainnet',
      address: created.address,
      offerPriceKoinu: '100000000',
    };

    const signed = await wallet.signIntent(payload, undefined, created.address);
    expect(typeof signed.signature).toBe('string');
    expect(signed.signature.length).toBeGreaterThan(0);
    expect(signed.signingAddress).toBe(created.address);
    expect(signed.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Date.parse(signed.signedAt)).not.toBeNaN();
  });

  it('signIntent rejects expired payload', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    const payload: IntentPayload = {
      intentType: 'bid_place',
      nonce: 'n-2',
      expiresAt: new Date(Date.now() - 5_000).toISOString(),
      network: 'mainnet',
      chainId: 'doge-mainnet',
      address: created.address,
    };

    await expect(wallet.signIntent(payload, undefined, created.address)).rejects.toThrow(/expired/i);
  });

  it('signIntent rejects network mismatch', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    const payload: IntentPayload = {
      intentType: 'bid_cancel',
      nonce: 'n-3',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      network: 'testnet',
      chainId: 'doge-testnet',
      address: created.address,
    };

    await expect(wallet.signIntent(payload, undefined, created.address)).rejects.toThrow(/network mismatch/i);
  });

  it('migrates legacy storage keys to dogestash keys', async () => {
    localStorage.setItem('dogemarket_browser_wallet_current', 'Dlegacy123');
    localStorage.setItem('dogemarket_browser_wallets', JSON.stringify([{ address: 'Dlegacy123', network: 'mainnet' }]));

    await wallet.listWallets();

    expect(localStorage.getItem('dogestash_wallet_current')).toBe('Dlegacy123');
    expect(localStorage.getItem('dogestash_wallets')).not.toBeNull();
  });
});

describe('BrowserWalletSigner adapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('connects and signs intent via BrowserWallet', async () => {
    const browserWallet = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    await browserWallet.saveWallet(created);

    const signer = new BrowserWalletSigner(browserWallet);
    const connected = await signer.connect();
    expect(connected.address).toBe(created.address);

    const sig = await signer.signIntent({
      intentType: 'listing_buy',
      nonce: 'n-10',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      network: 'mainnet',
      chainId: 'doge-mainnet',
      address: created.address,
    });

    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);

    await signer.disconnect();
    expect(await signer.getAddress()).toBeNull();
  });
});
