# dogestash

Extracted wallet toolkit from `borkstarter` frontend, including:
- Local browser wallet core (`BrowserWallet`)
- Wallet adapters and manager (`src/wallets`)
- React contexts for wallet state (`src/contexts`)
- Wallet connect/modals UI (`src/components/*Wallet*.tsx`)

## What is included
- Dogecoin browser wallet generation/import/storage (mnemonic + WIF flow)
- Password-based encryption for locally stored wallets
- Unified wallet context patterns for browser + extension wallets
- Connect modal and wallet management modal UI from `borkstarter`

## Install deps

```bash
npm install
```

## Quick start in a React dApp

```tsx
import {
  DogestashProvider,
  ConnectWalletButton,
} from 'dogestash';

function App() {
  return (
    <DogestashProvider>
      <ConnectWalletButton />
    </DogestashProvider>
  );
}
```

For advanced custom flows, import `useUnifiedWallet` and your own UI while keeping `DogestashProvider` at the app root.

## Public API

Primary exports from `dogestash`:
- `BrowserWallet`
- `BrowserWalletSigner`
- `DogestashProvider`
- `useBrowserWallet`
- `useUnifiedWallet`
- `ConnectWalletButton`
- `WalletSelectionModal`

Recommended subpath imports for maximum tree-shaking:

```ts
import { BrowserWallet } from 'dogestash/lib/browser-wallet';
import { BrowserWalletSigner } from 'dogestash/adapters/BrowserWalletSigner';
import { DogestashProvider } from 'dogestash/providers/DogestashProvider';
```

## Marketplace Signer Quickstart

```ts
import { BrowserWallet, BrowserWalletSigner } from 'dogestash';

const browserWallet = new BrowserWallet();
const created = await BrowserWallet.generateWallet('mainnet');
await browserWallet.saveWallet(created, 'strong-password');

const signer = new BrowserWalletSigner(browserWallet, 'strong-password');
await signer.connect();

const signature = await signer.signIntent({
  intentType: 'listing_buy',
  nonce: crypto.randomUUID(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  network: 'mainnet',
  chainId: 'doge-mainnet',
  address: created.address,
  listingId: 'listing_123',
});

console.log(signature);
```

Notes:
- `signIntent` validates `expiresAt`, `network`, and `address` before signing.
- Storage namespace is `dogestash_wallet_*`; legacy `dogemarket_browser_wallet_*` keys auto-migrate on first use.

## Source
- Extracted from: `C:\Users\jheav\Desktop\doge\borkstarter\frontend\src`
- Initial extraction target: `C:\Users\jheav\Desktop\wallets\dogestash`
