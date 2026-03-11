import { WalletConfig } from '../wallets/types';
import { MyDogeAdapter } from '../wallets/MyDogeAdapter';
import { DojakAdapter } from '../wallets/DojakAdapter';
import { NintondoAdapter } from '../wallets/NintondoAdapter';

/**
 * Wallet configuration - easily enable/disable wallet types
 * Add new wallet configs here to support additional wallets
 */
export const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'mydoge',
    name: 'MyDoge',
    adapter: MyDogeAdapter,
    enabled: true,
    priority: 10, // Highest priority = default
  },
  {
    id: 'dojak',
    name: 'Dojak',
    adapter: DojakAdapter,
    enabled: true,
    priority: 9, // Below MyDoge
  },
  {
    id: 'nintondo',
    name: 'Nintondo',
    adapter: NintondoAdapter,
    enabled: true,
    priority: 8,
  },
  // Future wallets can be added here:
  // {
  //   id: 'phantom',
  //   name: 'Phantom',
  //   adapter: PhantomAdapter,
  //   enabled: true,
  //   priority: 8,
  // },
  // {
  //   id: 'trustwallet',
  //   name: 'Trust Wallet',
  //   adapter: TrustWalletAdapter,
  //   enabled: true,
  //   priority: 6,
  // },
];

/**
 * Get enabled wallet configurations
 */
export const getEnabledWallets = (): WalletConfig[] => {
  return WALLET_CONFIGS.filter(config => config.enabled);
};

/**
 * Get the preferred/default wallet configuration
 */
export const getPreferredWallet = (): WalletConfig | null => {
  const enabled = getEnabledWallets();
  return enabled.length > 0 ? enabled[0] : null;
};
