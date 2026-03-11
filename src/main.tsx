// Buffer polyfill for Node.js compatibility in browser
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Config,
  SimpleWallet,
  createWalletFromWIF,
  createRandomWallet,
  myDogeGetAddress,
  myDogeSignPsbt,
  myDogeConnect,
  myDogeRequestSignedMessage,
  myDogeGetConnectionStatus,
} from "borkstarter";
import App from "./App";
import { ToastProvider } from "./contexts/ToastContext";
import { LiveActivityProvider } from "./contexts/LiveActivityContext";
import { DoginalDrawerProvider } from "./contexts/DoginalDrawerContext";
import { UserRoleProvider } from "./contexts/UserRoleContext";
import { DataProvider } from "./providers/DataProvider";
import { UnifiedWalletProvider } from "./contexts/UnifiedWalletContext";
import { MyDogeWalletProvider } from "./contexts/MyDogeWalletContext";
import { NintondoWalletProvider } from "./contexts/NintondoWalletContext";
import { BrowserWalletProvider } from "./contexts/BrowserWalletContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";
import './index.css';

Config.getInstance().setConfig({ network: "main" });

// Live Feed services are handled by separate server processes
// See scripts/start-live-feed.ts for starting the live feed servers

// Wallet Manager Component
const WalletManager: React.FC = () => {
  const [wallet, setWallet] = useState<SimpleWallet | null>(null);

  // Initialize wallet manager with configured wallets
  useEffect(() => {
    const initWallets = async () => {
      const { walletManager } = await import('./wallets');
      const { getEnabledWallets } = await import('./config/wallets');

      // Register all enabled wallets
      const enabledConfigs = getEnabledWallets();
      enabledConfigs.forEach(config => {
        walletManager.registerWallet(config);
      });

      // Try to restore existing sessions
      await walletManager.restoreSessions();

      // Check if any wallet is already connected
      const connectedWallet = await walletManager.getConnectedWallet();
      if (connectedWallet) {
        walletManager.setCurrentWallet(connectedWallet);
        // Create a compatible wallet object for the existing interface
        const address = await connectedWallet.getAddress();
        const compatibleWallet = createRandomWallet();
        compatibleWallet.getAddress = () => address;
        setWallet(compatibleWallet);
      }
    };

    initWallets();
  }, []);

  const handleConnectWallet = async () => {
    try {
      console.log('🔗 Connecting wallet...');

      // Connect to MyDoge
      const result = await myDogeConnect();
      if (!result.connected) {
        throw new Error('Failed to connect to MyDoge');
      }

      // Get wallet address
      const address = await myDogeGetAddress();
      console.log('📍 Wallet address:', address);

      // Create wallet instance
      const newWallet = createRandomWallet(); // This is just for the interface, we use MyDoge API
      newWallet.getAddress = () => address; // Override to return MyDoge address

      // Store session
      const sessionData = {
        address,
        wif: newWallet.toWIF(), // This won't be used but keeps interface consistent
      };
      localStorage.setItem('dogeDropSession', JSON.stringify(sessionData));

      setWallet(newWallet);
      console.log('✅ Wallet connected successfully');

    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      throw error; // Re-throw to let components handle the error
    }
  };

  const handleDisconnectWallet = () => {
    console.log('🔌 Disconnecting wallet...');
    setWallet(null);
    localStorage.removeItem('dogeDropSession');
  };

  return (
    <ErrorBoundary>
      <MyDogeWalletProvider>
        <NintondoWalletProvider>
          <BrowserWalletProvider>
            <UnifiedWalletProvider>
              <DataProvider>
                <App />
              </DataProvider>
            </UnifiedWalletProvider>
          </BrowserWalletProvider>
        </NintondoWalletProvider>
      </MyDogeWalletProvider>
    </ErrorBoundary>
  );
};

// Service worker registration is now handled by vite-plugin-pwa

// Handle hot module replacement by reusing existing root
let root: ReturnType<typeof createRoot> | null = null;

const container = document.getElementById("root");
if (container) {
  // Check if we already have a root (for HMR)
  if (!root) {
    root = createRoot(container);
  }

  root.render(
    <React.StrictMode>
      <DoginalDrawerProvider>
        <LiveActivityProvider>
          <ToastProvider>
            <WalletManager />
          </ToastProvider>
        </LiveActivityProvider>
      </DoginalDrawerProvider>
    </React.StrictMode>,
  );
}

// Handle hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
