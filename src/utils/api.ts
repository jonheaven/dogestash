// API utilities for wallet-agnostic data providers (indexer / RPC gateway)
import axios from 'axios';

// Inscriptions interfaces
export interface MyDogeInscription {
  address: string;
  content: string;
  contentBody: string;
  contentLength: number;
  contentType: string;
  genesisTransaction: string;
  inscriptionId: string;
  inscriptionNumber: number;
  output: string;
  outputValue: string;
  preview: string;
  timestamp: number;
  height: number;
  location: string;
}

export interface MyDogeInscriptionsResponse {
  list: MyDogeInscription[];
  total: number;
}

const API_BASE_URL = (import.meta.env.VITE_WALLET_DATA_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for auth if needed
api.interceptors.request.use((config) => {
  // Add auth headers here if needed
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log unexpected API errors (not connection refused to localhost)
    if (!error.message?.includes('Network Error') || !error.config?.url?.includes('localhost')) {
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);


// Claims API
export const claimsApi = {
  getActive: (address: string) => api.get('/claims/active', { params: { address } }),
  claim: (launchId: string, data: any) => api.post(`/launches/${launchId}/claim`, data),
};

// Launches API (extend existing if any)
export const launchesApi = {
  create: (launchData: any) => api.post('/launches', launchData),
  getAll: () => api.get('/launches'),
  getById: (id: string) => api.get(`/launches/${id}`),
  update: (id: string, data: any) => api.put(`/launches/${id}`, data),
};

// Check if backend is available (silent check, no error logging)
const isBackendAvailable = async (): Promise<boolean> => {
  try {
    // Use direct fetch instead of axios to avoid error interceptor logging
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    // Silently return false - backend not available
    return false;
  }
};

// DRC-20 token interface
export interface DRC20Token {
  ticker: string;
  balance: string;
  transferable: string;
  available: string;
  inscriptionId?: string;
  content?: any;
}

// DRC-20 API response interface
export interface DRC20ApiResponse {
  balances: Array<{
    ticker: string;
    availableBalance: string;
    transferableBalance: string;
    overallBalance: string;
    protocol: string;
  }>;
  total: number;
  last_updated: {
    block_hash: string;
    block_height: number;
  };
}

const fetchJson = async (url: string): Promise<any> => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${errorText || response.statusText}`);
  }
  return response.json();
};

const resolveAddress = async (walletOrAddress: any): Promise<string> => {
  if (typeof walletOrAddress === 'string' && walletOrAddress.trim()) {
    return walletOrAddress;
  }
  if (walletOrAddress && typeof walletOrAddress.getAddress === 'function') {
    const addr = await Promise.resolve(walletOrAddress.getAddress());
    if (typeof addr === 'string' && addr.trim()) return addr;
  }
  if (walletOrAddress && typeof walletOrAddress.address === 'string' && walletOrAddress.address.trim()) {
    return walletOrAddress.address;
  }
  throw new Error('Wallet address not available');
};

export const walletDataApi = {
  // Fetch inscriptions/NFTs from configured indexer gateway
  fetchInscriptions: async (address: string): Promise<MyDogeInscription[]> => {
    try {
      const data = await fetchJson(`${API_BASE_URL}/indexer/inscriptions?address=${encodeURIComponent(address)}`);
      if (Array.isArray(data)) return data as MyDogeInscription[];
      if (Array.isArray(data?.list)) return data.list as MyDogeInscription[];
      if (Array.isArray(data?.items)) return data.items as MyDogeInscription[];
      if (Array.isArray(data?.data)) return data.data as MyDogeInscription[];
      return [];
    } catch (error) {
      console.error('Failed to fetch inscriptions from provider:', error);
      throw error;
    }
  },

  // Get all DRC-20 tokens for a wallet from configured indexer gateway
  fetchDRC20Tokens: async (walletOrAddress: any): Promise<DRC20Token[]> => {
    try {
      const address = await resolveAddress(walletOrAddress);
      const data = await fetchJson(`${API_BASE_URL}/indexer/drc20?address=${encodeURIComponent(address)}`) as DRC20ApiResponse | any;

      // Convert API response to our DRC20Token format
      const balances = Array.isArray(data?.balances)
        ? data.balances
        : Array.isArray(data?.tokens)
          ? data.tokens
          : Array.isArray(data)
            ? data
            : [];

      return balances.map((balance: any) => ({
        ticker: balance.ticker,
        balance: String(balance.overallBalance ?? balance.balance ?? '0'),
        transferable: String(balance.transferableBalance ?? balance.transferable ?? '0'),
        available: String(balance.availableBalance ?? balance.available ?? '0'),
      }));

    } catch (error) {
      console.error('Failed to fetch DRC-20 tokens from provider:', error);
      throw error;
    }
  },

  // Fetch wallet balance and transaction info from configured indexer gateway
  fetchBalance: async (address: string): Promise<number> => {
    try {
      const data = await fetchJson(`${API_BASE_URL}/indexer/balance?address=${encodeURIComponent(address)}`);

      // Extract balance from the response
      // The API returns balance in satoshis, convert to DOGE
      const balanceSatoshis = data.balanceSatoshis ?? data.balance ?? data.availableBalance ?? 0;
      const balanceDOGE = balanceSatoshis / 100000000; // Convert satoshis to DOGE

      return balanceDOGE;
    } catch (error) {
      console.error('Failed to fetch balance from provider:', error);
      throw error;
    }
  },

  fetchUtxos: async (address: string): Promise<any> => {
    return fetchJson(`${API_BASE_URL}/indexer/utxos?address=${encodeURIComponent(address)}`);
  },

  getAddress: async (wallet?: any): Promise<string> => {
    return resolveAddress(wallet);
  },

  // Get wallet address from SimpleWallet object
  getWalletAddress: (wallet: any): string | null => {
    try {
      return wallet?.getAddress() || null;
    } catch (error) {
      console.error('❌ Failed to get wallet address:', error);
      return null;
    }
  }
};

// Backward-compatible alias for existing imports while keeping implementation wallet-agnostic.
export const myDogeApi = walletDataApi;

export { api, isBackendAvailable };
