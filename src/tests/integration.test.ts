import { beforeEach, describe, expect, it } from 'vitest';
import { BrowserWallet } from '../lib/browser-wallet';
import { BrowserWalletSigner } from '../adapters/BrowserWalletSigner';
import type { IntentPayload } from '../types/wallet';

describe('Browser wallet integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('supports encrypted and unencrypted wallets in one storage set', async () => {
    const walletApi = new BrowserWallet();
    const encryptedWallet = await BrowserWallet.generateWallet('mainnet');
    const plainWallet = await BrowserWallet.generateWallet('mainnet');

    await walletApi.saveWallet(encryptedWallet, 'secret-pass');
    await walletApi.saveWallet(plainWallet);

    const wallets = await walletApi.listWallets();
    expect(wallets).toHaveLength(2);

    await walletApi.selectWallet(encryptedWallet.address);
    await expect(walletApi.loadWallet(undefined, encryptedWallet.address)).rejects.toThrow(/password required/i);

    const loadedEncrypted = await walletApi.loadWallet('secret-pass', encryptedWallet.address);
    expect(loadedEncrypted?.address).toBe(encryptedWallet.address);

    const encryptedSig = await walletApi.signMessage('integration-message', 'secret-pass', encryptedWallet.address);
    expect(typeof encryptedSig).toBe('string');
    expect(encryptedSig.length).toBeGreaterThan(0);

    await walletApi.selectWallet(plainWallet.address);
    const loadedPlain = await walletApi.loadWallet(undefined, plainWallet.address);
    expect(loadedPlain?.address).toBe(plainWallet.address);

    const plainSig = await walletApi.signMessage('integration-message', undefined, plainWallet.address);
    expect(typeof plainSig).toBe('string');
    expect(plainSig.length).toBeGreaterThan(0);
  });

  it('produces stable canonical intent signatures for equivalent payloads', async () => {
    const walletApi = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    await walletApi.saveWallet(created);

    const expiresAt = new Date(Date.now() + 120_000).toISOString();

    const payloadA: IntentPayload = {
      intentType: 'offer_create',
      nonce: 'same-nonce',
      expiresAt,
      network: 'mainnet',
      chainId: 'doge-mainnet',
      address: created.address,
      offerPriceKoinu: '5000000000',
      listingId: 'listing-xyz',
    };

    const payloadB: IntentPayload = {
      listingId: 'listing-xyz',
      offerPriceKoinu: '5000000000',
      address: created.address,
      chainId: 'doge-mainnet',
      network: 'mainnet',
      expiresAt,
      nonce: 'same-nonce',
      intentType: 'offer_create',
    };

    const signedA = await walletApi.signIntent(payloadA, undefined, created.address);
    const signedB = await walletApi.signIntent(payloadB, undefined, created.address);

    expect(signedA.payloadHash).toBe(signedB.payloadHash);
    expect(signedA.signature).toBe(signedB.signature);
    expect(signedA.signingAddress).toBe(created.address);
    expect(signedB.signingAddress).toBe(created.address);
  });

  it('BrowserWalletSigner reconnects and signs after disconnect', async () => {
    const walletApi = new BrowserWallet();
    const created = await BrowserWallet.generateWallet('mainnet');
    await walletApi.saveWallet(created, 'adapter-pass');

    const signer = new BrowserWalletSigner(walletApi);

    await expect(signer.connect()).rejects.toThrow(/password required/i);

    signer.setPassword('adapter-pass');
    const connected = await signer.connect();
    expect(connected.address).toBe(created.address);

    await signer.disconnect();
    expect(await signer.getAddress()).toBeNull();

    const signedMessage = await signer.signMessage('adapter-integration-message');
    expect(typeof signedMessage).toBe('string');
    expect(signedMessage.length).toBeGreaterThan(0);

    // signPSBT fails closed until browser PSBT signing support is implemented.
    const psbt = 'cHNidP8BAHECAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AQAAAAAA';
    await expect(signer.signPSBT(psbt)).rejects.toThrow(/not implemented/i);

    const signature = await signer.signIntent({
      intentType: 'listing_buy',
      nonce: 'adapter-nonce',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      network: 'mainnet',
      chainId: 'doge-mainnet',
      address: created.address,
      listingId: 'listing-123',
    });

    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });
});
