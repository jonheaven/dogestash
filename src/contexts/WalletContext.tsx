import React, { createContext, useContext, ReactNode } from 'react';
import { WalletAdapter } from '../wallets/types';

interface WalletContextType {
  // Current wallet instance
  wallet: WalletAdapter | null;

  // Connection state
  isConnected: boolean;
  address: string | null;

  // Available wallets
  availableWallets: WalletAdapter[];

  // Actions
  connectWallet: (walletId?: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchWallet: (walletId: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
  walletManager: any; // We'll type this properly later
}

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  walletManager
}) => {
  // For now, we'll keep the old interface to avoid breaking changes
  // In the future, this would be updated to use the new wallet system
  const mockContext: WalletContextType = {
    wallet: null,
    isConnected: false,
    address: null,
    availableWallets: [],
    connectWallet: async () => {},
    disconnectWallet: async () => {},
    switchWallet: async () => {},
  };

  return (
    <WalletContext.Provider value={mockContext}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
