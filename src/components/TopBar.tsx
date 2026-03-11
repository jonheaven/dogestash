import React from 'react';
import { MagnifyingGlassIcon, Bars3Icon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { SimpleWallet } from 'borkstarter';

interface TopBarProps {
  onWalletClick: () => void;
  onMenuClick: () => void;
  wallet: SimpleWallet | null;
  balance?: number;
  balanceVerified?: boolean;
  isSidebarOpen: boolean;
  onHelpClick?: () => void;
  onSwitchAccount?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onWalletClick,
  onMenuClick,
  wallet,
  balance,
  balanceVerified = false,
  isSidebarOpen,
  onHelpClick,
  onSwitchAccount
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary border-b border-border-primary h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left Side - Logo and Mobile Menu */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-bg-secondary transition-colors duration-200"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <img
              src="/bork.png"
              alt="Bork"
              className="w-6 h-6 object-contain filter invert"
              style={{
                filter: 'invert(1) brightness(0) saturate(100%)',
                mixBlendMode: 'difference'
              }}
            />
          </div>
          <span className="text-xl font-bold text-text-primary hidden sm:block">
            Borkstarter
          </span>
        </div>
      </div>

      {/* Center - Search Bar */}
      <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search launches, projects, dogs..."
            className="input w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Right Side - Wallet Button & Help */}
      <div className="flex items-center space-x-3">
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            title="Show onboarding tour"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2">
          {wallet && onSwitchAccount && (
            <button
              onClick={onSwitchAccount}
              className="px-3 py-2 text-xs text-text-secondary hover:text-text-primary border border-border-primary rounded-lg transition-colors"
              title="Switch to different account"
            >
              Switch Account
            </button>
          )}
          <button
            data-tour="connect-wallet"
            onClick={onWalletClick}
            className={`btn-outline px-4 py-2 text-sm font-medium ${
              wallet ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700' : ''
            }`}
          >
            {wallet ? (
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="flex flex-col items-start">
                  <span className="text-xs">{wallet.getAddress().slice(0, 6)}...{wallet.getAddress().slice(-4)}</span>
                  {balance !== undefined && (
                    <span className="text-xs text-yellow-400 font-medium">
                      {balanceVerified ? `${balance.toFixed(4)} DOGE` : '?'}
                    </span>
                  )}
                </div>
              </span>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
