# dogestash

Dogecoin local browser wallet implementation + browser extension support for DOGE dApps.

Provides a self-contained wallet toolkit for building on Dogecoin:
- Local browser wallet core (`BrowserWallet`)
- Wallet adapters and manager (`src/wallets`) — MyDoge, Nintondo, Dojak, MetaMask
- React contexts for wallet state (`src/contexts`)
- Wallet connect/modal UI components (`src/components`)

## What is included
- Dogecoin browser wallet generation/import/storage (mnemonic + WIF flow)
- Password-based encryption for locally stored wallets
- Unified wallet context patterns for browser + extension wallets
- Connect modal and wallet management modal UI

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

## Indexer / Data Provider API

dogestash makes no direct calls to any third-party service. All chain data (balances, UTXOs, inscriptions, DRC-20 tokens) is fetched through a single configurable base URL pointing at your own deployed indexer.

**The workflow:**
1. Deploy [**jonheaven/dog**](https://github.com/jonheaven/dog) or [**jonheaven/kabosu**](https://github.com/jonheaven/kabosu) to a server (e.g. `https://api.yourdomain.com`)
2. Set the env var in your frontend:
   ```env
   VITE_WALLET_DATA_API_BASE_URL=https://api.yourdomain.com/api
   ```
3. dogestash will route all wallet data fetches (balance, UTXOs, inscriptions, DRC-20) through that endpoint — no third-party dependencies, fully under your control.

Defaults to `http://localhost:3001/api` if unset, which works out of the box when running either reference indexer locally during development.

### Required endpoints

All endpoints accept `address` as a query parameter and return JSON.

---

#### `GET /indexer/balance?address=<addr>`

Returns the spendable DOGE balance for an address.

```jsonc
// Expected response (any of these shapes works):
{ "balanceSatoshis": 500000000 }
{ "balance": 500000000 }
{ "availableBalance": 500000000 }
```

Balance is interpreted as **satoshis** and converted to DOGE internally (`÷ 100,000,000`).

---

#### `GET /indexer/utxos?address=<addr>`

Returns unspent outputs needed for transaction construction.

```jsonc
// Expected response — array of UTXOs:
[
  {
    "txid": "abc123...",
    "vout": 0,
    "value": 100000000,
    "scriptPubKey": "76a914..."
  }
]
```

The exact UTXO shape is passed through to the PSBT builder as-is — match whatever your signing flow expects.

---

#### `GET /indexer/inscriptions?address=<addr>`

Returns Doginal (ordinal) inscriptions held by an address.

```jsonc
// Expected response (any of these shapes works):
{ "list": [ { "inscriptionId": "...", "contentType": "image/png", ... } ] }
{ "items": [ ... ] }
{ "data":  [ ... ] }
[ ... ]   // bare array also accepted
```

Each item should include at minimum: `inscriptionId`, `contentType`, `genesisTransaction`, `inscriptionNumber`.

---

#### `GET /indexer/drc20?address=<addr>`

Returns DRC-20 token balances for an address.

```jsonc
// Expected response (any of these shapes works):
{
  "balances": [
    {
      "ticker": "DOGI",
      "availableBalance": "1000",
      "transferableBalance": "500",
      "overallBalance": "1500"
    }
  ]
}
// Also accepted: { "tokens": [...] } or a bare array
```

Fields are normalised internally — `balance`, `available`, `transferable` shorthand keys are also recognised.

---

### Optional endpoints

| Endpoint | Used by |
|---|---|
| `GET /health` | `StatusIndicator` component — shows green/red connection state |
| `GET /claims/active?address=<addr>` | `ClaimModal` component |
| `POST /launches/:id/claim` | Dogedrops claim flow |

### Reference implementations

- [**jonheaven/dog**](https://github.com/jonheaven/dog)
- [**jonheaven/kabosu**](https://github.com/jonheaven/kabosu)

Either implements all required and optional endpoints and is designed to be deployed alongside this library.

### Mapping to other providers

| Provider | Notes |
|---|---|
| [QuickNode Dogecoin](https://www.quicknode.com/) | Proxy `/indexer/*` to their RPC methods |
| [Dogechain.info API](https://dogechain.info/api/v1/) | Thin adapter — field names differ slightly |
| Self-hosted [ord](https://github.com/ordinals/ord) | Inscriptions endpoint maps directly |
| Custom backend | Implement the four endpoints, return any of the accepted shapes |
