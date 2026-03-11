import { WalletAdapter, WalletConnection, DRC20Token, WalletInscription } from './types';
import { walletDataApi } from '../utils/api';

type InjectedNintondoProvider = {
  connect: () => Promise<string>;
  getBalance: () => Promise<string>;
  getAccount: () => Promise<string>;
  getAccountName?: () => Promise<string>;
  isConnected: () => Promise<boolean>;
  signPsbt: (psbtBase64: string, options?: any) => Promise<string>;
  signMessage: (text: string) => Promise<string>;
  createTx?: (data: any) => Promise<string>;
  getNetwork?: () => Promise<'mainnet' | 'testnet'>;
  switchNetwork?: (network: string) => Promise<string>;
};

const getInjectedNintondo = (): InjectedNintondoProvider | null => {
  const candidate = (window as any).nintondo;
  return candidate && typeof candidate === 'object' ? candidate : null;
};

export class NintondoAdapter implements WalletAdapter {
  readonly id = 'nintondo';
  readonly name = 'Nintondo';
  readonly icon = 'N';
  readonly supportedChains = ['DOGE'];

  private eventHandlers: { [event: string]: ((data?: any) => void)[] } = {};
  private currentAddress: string | null = null;

  async connect(): Promise<WalletConnection> {
    const provider = getInjectedNintondo();
    if (!provider) {
      throw new Error('Nintondo wallet extension not found. Please install it first.');
    }

    if (provider.getNetwork && provider.switchNetwork) {
      try {
        const network = await provider.getNetwork();
        if (network !== 'mainnet') {
          await provider.switchNetwork('mainnet');
        }
      } catch (error) {
        console.warn('Nintondo network check failed:', error);
      }
    }

    const connectedAddress = await provider.connect();
    const address = connectedAddress || await provider.getAccount();
    if (!address) {
      throw new Error('Failed to connect to Nintondo wallet');
    }

    this.currentAddress = address;
    localStorage.setItem('nintondo_address', address);
    this.emit('connect', { address });

    return {
      address,
      connected: true,
    };
  }

  async disconnect(): Promise<void> {
    this.currentAddress = null;
    localStorage.removeItem('nintondo_address');
    this.emit('disconnect');
  }

  async isConnected(): Promise<boolean> {
    const provider = getInjectedNintondo();
    if (!provider) {
      return false;
    }

    try {
      return await provider.isConnected();
    } catch (error) {
      console.error('Nintondo connection check failed:', error);
      return false;
    }
  }

  async signMessage(message: string): Promise<string> {
    const provider = getInjectedNintondo();
    if (!provider) {
      throw new Error('Nintondo wallet extension not found');
    }
    return provider.signMessage(message);
  }

  async signTransaction(tx: any): Promise<string> {
    const provider = getInjectedNintondo();
    if (!provider) {
      throw new Error('Nintondo wallet extension not found');
    }
    return provider.signPsbt(tx);
  }

  async getAddress(): Promise<string> {
    if (this.currentAddress) {
      return this.currentAddress;
    }

    const provider = getInjectedNintondo();
    if (!provider) {
      throw new Error('Nintondo wallet extension not found');
    }

    const address = await provider.getAccount();
    if (!address) {
      throw new Error('Unable to resolve Nintondo address');
    }

    this.currentAddress = address;
    return address;
  }

  async getBalance(): Promise<string> {
    try {
      const address = await this.getAddress();
      return String(await walletDataApi.fetchBalance(address));
    } catch (error) {
      console.error('Nintondo get balance failed:', error);
      return '0';
    }
  }

  async getDRC20Tokens(): Promise<DRC20Token[]> {
    try {
      const address = await this.getAddress();
      return await walletDataApi.fetchDRC20Tokens(address);
    } catch (error) {
      console.error('Nintondo get DRC-20 tokens failed:', error);
      throw error;
    }
  }

  async getInscriptions(): Promise<WalletInscription[]> {
    try {
      const address = await this.getAddress();
      return await walletDataApi.fetchInscriptions(address);
    } catch (error) {
      console.error('Nintondo get inscriptions failed:', error);
      throw error;
    }
  }

  on(event: 'connect' | 'disconnect' | 'accountChanged', handler: (data?: any) => void): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event: 'connect' | 'disconnect' | 'accountChanged', handler: (data?: any) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter((entry) => entry !== handler);
    }
  }

  private emit(event: 'connect' | 'disconnect' | 'accountChanged', data?: any): void {
    if (!this.eventHandlers[event]) {
      return;
    }
    for (const handler of this.eventHandlers[event]) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in Nintondo ${event} handler:`, error);
      }
    }
  }
}
