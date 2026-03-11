import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PawPrint } from 'lucide-react';
import { SimpleWallet } from 'borkstarter';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  wallet: SimpleWallet | null;
}

const walletOptions = [
  {
    id: 'mydoge',
    name: 'MyDoge',
    description: 'Connect your MyDoge wallet',
    icon: '🐕',
    available: true
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Connect your MetaMask wallet',
    icon: '🦊',
    available: false // Placeholder for future implementation
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Connect with WalletConnect',
    icon: '🔗',
    available: false // Placeholder for future implementation
  }
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  wallet
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary rounded-lg border border-border-primary max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <h2 className="text-xl font-semibold text-text-primary">
            {wallet ? 'Wallet Connected' : 'Connect Wallet'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-bg-primary transition-colors duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {wallet ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-primary-900/20 rounded-lg border border-primary-700/30">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🐕</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">MyDoge Wallet</p>
                  <p className="text-sm text-text-secondary font-mono">
                    {wallet.getAddress().slice(0, 8)}...{wallet.getAddress().slice(-6)}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onDisconnect}
                  className="flex-1 btn-secondary"
                >
                  Disconnect
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Wallet Selection */
            <div className="space-y-4">
              <p className="text-text-secondary text-center">
                Choose a wallet to connect to Borkstarter
              </p>

              <div className="space-y-3">
                {walletOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={option.available ? onConnect : undefined}
                    disabled={!option.available}
                    className={`w-full flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 ${
                      option.available
                        ? 'border-border-primary hover:border-primary-500 hover:bg-primary-900/20'
                        : 'border-border-primary opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-12 h-12 bg-bg-primary rounded-lg flex items-center justify-center text-2xl">
                      {option.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-text-primary">{option.name}</p>
                      <p className="text-sm text-text-secondary">{option.description}</p>
                    </div>
                    {!option.available && (
                      <span className="text-xs text-text-tertiary bg-bg-primary px-2 py-1 rounded">
                        Coming Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center text-xs text-text-tertiary pt-4 border-t border-border-primary">
                By connecting your wallet, you agree to our Terms of Service and Privacy Policy
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
