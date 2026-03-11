import { beforeEach, describe, expect, it } from 'vitest';
import { BrowserWallet } from '../lib/browser-wallet';
import { signDMPIntent } from '../services/dmp';

describe('DMP signing service', () => {
  let wallet: BrowserWallet;

  beforeEach(() => {
    localStorage.clear();
    wallet = new BrowserWallet();
  });

  it('signs listing payloads into the kabosu DMP wire format', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    const signed = await signDMPIntent('listing', {
      activeAddress: created.address,
      signMessage: (message) => wallet.signMessage(message, undefined, created.address),
      price_koinu: 4_206_900_000,
      psbt_cid: 'ipfs://QmListingCid',
      expiry_height: 5_000_000,
    });

    expect(signed).toMatchObject({
      protocol: 'DMP',
      version: '1.0',
      op: 'listing',
      seller: created.address,
      price_koinu: 4_206_900_000,
      psbt_cid: 'ipfs://QmListingCid',
      expiry_height: 5_000_000,
    });
    expect(signed.nonce).toBeGreaterThan(0);
    expect(signed.signature).toMatch(/^[0-9a-f]+$/i);
  });

  it('rejects a mismatched requested address', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    await expect(
      signDMPIntent('cancel', {
        activeAddress: created.address,
        address: 'DNotTheConnectedWalletAddress12345',
        signMessage: (message) => wallet.signMessage(message, undefined, created.address),
        listing_id: `${'a'.repeat(64)}i0`,
      })
    ).rejects.toThrow(/active wallet/i);
  });

  it('rejects invalid listing expiry heights', async () => {
    const created = await BrowserWallet.generateWallet('mainnet');
    await wallet.saveWallet(created);

    await expect(
      signDMPIntent('listing', {
        activeAddress: created.address,
        signMessage: (message) => wallet.signMessage(message, undefined, created.address),
        price_koinu: 1,
        psbt_cid: 'ipfs://QmListingCid',
        expiry_height: 0,
      })
    ).rejects.toThrow(/expiry_height/i);
  });
});
