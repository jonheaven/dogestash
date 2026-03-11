import React, { useState, useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { BottomBar } from "./components/BottomBar";
import WalletSelectionModal from "./components/WalletSelectionModal";
import { MainContent } from "./components/MainContent";
import { useToast } from "./contexts/ToastContext";
import { useUnifiedWallet } from "./contexts/UnifiedWalletContext";
import { UserRoleProvider } from "./contexts/UserRoleContext";
import { ConfigProvider } from "./utils/providers/ConfigProvider";
import { OnboardingTour, useOnboardingTour } from "./components/OnboardingTour";
import { SentinelConnector } from "./components/SentinelConnector";
import DoginalDrawer from "./components/DoginalDrawer";
import { createRandomWallet, SimpleWallet } from "./lib/simple-wallet";

const App: React.FC = () => {
  // Add error boundary for debugging
  try {
    const { connected: walletConnected, address: walletAddress, balance: walletBalance, balanceVerified: walletBalanceVerified, connect: connectWallet, disconnect: disconnectWallet } = useUnifiedWallet();

    // Create a compatible wallet object for components that still expect the old SimpleWallet interface
    const wallet = walletConnected && walletAddress ? {
      getAddress: () => walletAddress,
      // Add other methods as needed
    } : null;
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Determine initial section based on user mode
  const getInitialSection = () => {
    const savedMode = localStorage.getItem('borkstarter-user-mode');
    if (savedMode === 'builder') {
      return "dogedrops";
    }
    // Fallback to onboarding choice for backwards compatibility
    const onboardingChoice = localStorage.getItem('borkstarter-onboarding-choice');
    if (onboardingChoice === 'builder') {
      return "dogedrops";
    }
    return "discover"; // Default for collectors
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());
  const [theme, setTheme] = useState<"dark" | "light" | "contrast">("dark");
  const [dogecoinPrice, setDogecoinPrice] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState(1247);
  const [userMode, setUserMode] = useState<'collector' | 'builder'>(() => {
    // Load user mode from localStorage, default to 'collector' if not set
    const savedMode = localStorage.getItem('borkstarter-user-mode');
    return (savedMode === 'builder' || savedMode === 'collector') ? savedMode : 'collector';
  });

  const { isTourActive, completeTour, startTour, resetTour } = useOnboardingTour();

  // Toggle between collector and builder modes
  const toggleUserMode = () => {
    setUserMode(prev => {
      const newMode = prev === 'collector' ? 'builder' : 'collector';
      localStorage.setItem('borkstarter-user-mode', newMode);

      // Sync active section with user mode
      if (newMode === 'builder') {
        setActiveSection('dogedrops');
      } else {
        setActiveSection('discover');
      }

      return newMode;
    });
  };

  // Check if tour is available (not permanently dismissed)
  const isTourAvailable = () => {
    const tourDismissed = localStorage.getItem('borkstarter-tour-dismissed');
    return tourDismissed !== 'true';
  };

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const sessionToken = localStorage.getItem('dogeDropSession');
        if (sessionToken) {
          const sessionData = JSON.parse(atob(sessionToken));

          // Check if session is still valid
          if (sessionData.expiry && sessionData.expiry > Date.now()) {
            // Session is valid - unified wallet context will handle wallet restoration
            console.log('Valid DogeDrop session found, wallet restoration handled by unified context');
          } else {
            // Session expired, clean it up
            localStorage.removeItem('dogeDropSession');
          }
        }
      } catch (error) {
        // Invalid session data, clean it up
        localStorage.removeItem('dogeDropSession');
      }
    };

    checkExistingSession();
  }, []);

  const toast = useToast();

  // Fetch Dogecoin price
  useEffect(() => {
    let hasShownPriceUnavailable = false;

    const fetchPrice = async () => {
      try {
        // Try multiple APIs in case of CORS issues
        let response;
        let data;

        // First try CoinGecko via proxy (works in development)
        try {
          response = await fetch('/coingecko/api/v3/simple/price?ids=dogecoin&vs_currencies=usd');
          if (response.ok) {
            data = await response.json();
          }
        } catch {
          // If CoinGecko fails, try alternative API via proxy
          try {
            response = await fetch('/coinpaprika/v1/tickers/doge-dogecoin');
            if (response.ok) {
              const coinData = await response.json();
              data = { dogecoin: { usd: coinData.quotes?.USD?.price } };
            }
          } catch {
            // No fallback price - we never show fake data in crypto dApps
            console.warn('All price APIs unavailable - price will not be displayed');
            // Only show toast if we've had price data before (avoid spamming on initial load)
            if (hasShownPriceUnavailable) {
              toast.warning('DOGE price temporarily unavailable', 3000);
            }
            data = null;
          }
        }

        const newPrice = data?.dogecoin?.usd || null;
        setDogecoinPrice(newPrice);

        // Mark that we've attempted to load price data
        if (newPrice === null && !hasShownPriceUnavailable) {
          hasShownPriceUnavailable = true;
        }

      } catch (error) {
        console.error('Failed to fetch DOGE price:', error);
        // Never show fake prices - set to null so nothing displays
        setDogecoinPrice(null);
        // Only show error toast if we've successfully loaded price before
        if (hasShownPriceUnavailable) {
          toast.warning('Unable to load DOGE price data', 3000);
        }
        hasShownPriceUnavailable = true;
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts for tour debugging
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T to manually trigger tour
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        console.log('Tour: Manually triggering tour via keyboard shortcut');
        startTour();
      }

      // Ctrl/Cmd + Shift + R to reset tour state
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        console.log('Tour: Resetting tour state via keyboard shortcut');
        resetTour();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [startTour, resetTour]);

  // Simulate active users count
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 10) - 5);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle account switching
  const handleSwitchAccount = () => {
    // Clear current session and disconnect wallet
    disconnectWallet();
    setActiveSection('welcome');

    toast.info('Switched to account selection. Please connect with your desired account.');
  };

  // Wallet functions are now handled in main.tsx

  const toggleTheme = () => {
    const themes = ["dark", "light", "contrast"] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
    document.documentElement.className = themes[nextIndex];
  };

  return (
    <ConfigProvider>
      <UserRoleProvider walletAddress={walletAddress}>
      <div className="min-h-screen bg-bg-primary text-text-primary">
        {/* Top Bar */}
        <TopBar
          onWalletClick={() => setIsWalletModalOpen(true)}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          wallet={wallet}
          balance={walletBalance}
          balanceVerified={walletBalanceVerified}
          isSidebarOpen={isSidebarOpen}
          onHelpClick={isTourAvailable() ? startTour : undefined}
          onSwitchAccount={handleSwitchAccount}
        />

          <div className="flex">
            {/* Sidebar */}
            <Sidebar
              isOpen={isSidebarOpen}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onClose={() => setIsSidebarOpen(false)}
              userMode={userMode}
            />

            {/* Main Content */}
            <main className="flex-1 pt-16 pb-10">
              <MainContent
                activeSection={activeSection}
                wallet={wallet}
                onConnectWallet={() => setIsWalletModalOpen(true)}
                userMode={userMode}
                onNavigateToSection={setActiveSection}
              />
            </main>
          </div>

          {/* Bottom Bar */}
          <BottomBar
            dogecoinPrice={dogecoinPrice}
            activeUsers={activeUsers}
            theme={theme}
            onThemeToggle={toggleTheme}
            userMode={userMode}
            onUserModeToggle={toggleUserMode}
          />

          {/* Wallet Modal */}
          <WalletSelectionModal
            isOpen={isWalletModalOpen}
            onClose={() => setIsWalletModalOpen(false)}
          />

          {/* Live Network Activity Connector */}
          <SentinelConnector enabled={getEnv('VITE_ENABLE_LIVE_ACTIVITY', 'false') === 'true'} />

          {/* Onboarding Tour */}
          <OnboardingTour
            isActive={isTourActive}
            onComplete={completeTour}
            wallet={wallet}
          />

          {/* Doginal Drawer */}
          <DoginalDrawer />
        </div>
      </UserRoleProvider>
    </ConfigProvider>
    );
  } catch (error) {
    console.error('App error:', error);
    // Return a fallback UI
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">App Error</h1>
          <p className="text-text-secondary">Something went wrong loading the app.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-md"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
};

export default App;
