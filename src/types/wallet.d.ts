declare global {
  interface Window {
    doge?: {
      isMyDoge: boolean;
      connect: () => Promise<{ approved: boolean; address: string }>;
      disconnect: () => Promise<{ disconnected: boolean }>;
      getConnectionStatus: () => Promise<{ connected: boolean }>;
      getCurrentAddress?: () => Promise<{ address: string }>;
      getBalance: () => Promise<{ balance: string }>;
      requestTransaction: (params: { recipientAddress: string; dogeAmount: number }) => Promise<{ txId: string }>;
      getTransactionStatus: (params: { txId: string }) => Promise<{ status: string; confirmations: number }>;
      requestSignedMessage: (params: { message: string }) => Promise<{ signature: string }>;
      requestPsbt?: (params: { rawTx: string; indexes: number[]; signOnly?: boolean; partial?: boolean }) => Promise<{ signedTx?: string; signedRawTx?: string }>;
      requestInscriptionTransaction: (params: { recipientAddress: string; location: string }) => Promise<{ txId: string }>;
      signPSBT?: (params: { psbtHex: string; indexes: number[] }) => Promise<{ signedRawTx: string }>;
    };
    mydoge?: {
      isMyDoge: boolean;
      connect: () => Promise<{ approved: boolean; address: string }>;
      disconnect: () => Promise<{ disconnected: boolean }>;
      getConnectionStatus: () => Promise<{ connected: boolean }>;
      getCurrentAddress?: () => Promise<{ address: string }>;
      getAddress?: () => Promise<string>;
      getBalance: () => Promise<{ balance: string }>;
      requestTransaction: (params: { recipientAddress: string; dogeAmount: number }) => Promise<{ txId: string }>;
      getTransactionStatus: (params: { txId: string }) => Promise<{ status: string; confirmations: number }>;
      requestSignedMessage: (params: { message: string }) => Promise<{ signature: string }>;
      requestPsbt?: (params: { rawTx: string; indexes: number[]; signOnly?: boolean; partial?: boolean }) => Promise<{ signedTx?: string; signedRawTx?: string }>;
      signPsbt?: (tx: any) => Promise<any>;
      requestInscriptionTransaction: (params: { recipientAddress: string; location: string }) => Promise<{ txId: string }>;
      signPSBT?: (params: { psbtHex: string; indexes: number[] }) => Promise<{ signedRawTx: string }>;
    };
    nintondo?: {
      connect: () => Promise<string>;
      getBalance: () => Promise<string>;
      getAccount: () => Promise<string>;
      getAccountName: () => Promise<string>;
      isConnected: () => Promise<boolean>;
      signPsbt: (psbtBase64: string, options?: any) => Promise<string>;
      signMessage: (text: string) => Promise<string>;
      createTx: (data: any) => Promise<string>;
      getNetwork: () => Promise<'mainnet' | 'testnet'>;
      switchNetwork: (network: 'mainnet' | 'testnet') => Promise<'mainnet' | 'testnet'>;
    };
    dojak?: {
      isDojak: boolean;
      request: (args: { method: string; params?: any }) => Promise<any>;
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      disconnect: () => Promise<void>;
      getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
      signMessage: (text: string, type?: string) => Promise<string>;
      signPsbt: (psbtHex: string, options?: any) => Promise<string>;
      sendBitcoin: (toAddress: string, satoshis: number, options?: any) => Promise<string>;
      sendInscription: (toAddress: string, inscriptionId: string, options?: any) => Promise<string>;
      getInscriptions: (cursor?: number, size?: number) => Promise<any>;
      on: (event: string, callback: (data?: any) => void) => void;
      removeListener: (event: string, callback: (data?: any) => void) => void;
    };
  }
}

export type WalletType = 'browser' | 'mydoge' | 'nintondo' | 'dojak';
export type WalletMode = 'dojak' | 'local_browser_wallet';
export type NetworkType = 'mainnet' | 'testnet';
export interface WalletData {
  address: string;
  privateKey: string;
  network: NetworkType;
  nickname?: string;
  createdAt?: number;
}

export type MarketplaceIntentType =
  | 'listing_buy'
  | 'offer_create'
  | 'offer_cancel'
  | 'bid_place'
  | 'bid_cancel'
  | 'auction_settle';

export interface IntentPayload {
  intentType: MarketplaceIntentType;
  nonce: string;
  expiresAt: string;
  network: NetworkType;
  chainId: string;
  address: string;
  [key: string]: unknown;
}

export interface SignedIntent {
  signature: string;
  signingAddress: string;
  signedAt: string;
  payloadHash: string;
}

export interface MarketplaceSigner {
  mode: WalletMode;
  connect(): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string | null>;
  signMessage(message: string): Promise<string>;
  signPSBT(psbtBase64: string): Promise<string>;
  signIntent<T extends Record<string, unknown>>(intent: T): Promise<string>;
}

export interface UnifiedWalletContextValue {
  walletType: WalletType | null;
  connected: boolean;
  address: string | null;
  balance: number;
  connecting: boolean;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (recipientAddress: string, amount: number) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signPSBT: (psbtHex: string) => Promise<string>;
  signPSBTOnly: (psbtHex: string) => Promise<string>;
  sendInscription: (recipientAddress: string, location: string) => Promise<string>;
  getTransactionStatus: (txId: string) => Promise<{ status: string; confirmations: number }>;
  // Browser wallet specific
  createBrowserWallet: () => Promise<WalletData>;
  importBrowserWallet: (privateKey: string) => Promise<WalletData>;
  importBrowserWalletFromMnemonic: (mnemonic: string, passphrase?: string) => Promise<WalletData>;
  saveBrowserWallet: (wallet: WalletData, password?: string) => Promise<void>;
  loadBrowserWallet: (password?: string) => Promise<WalletData | null>;
  hasBrowserWallet: () => Promise<boolean>;
  removeBrowserWallet: () => Promise<void>;
}

export {};

// Module declarations for packages without types
declare module 'hdkey';
declare module 'bitcore-lib-doge';
