import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SimpleWallet } from 'borkstarter';

type SupportedWalletId = 'mydoge' | 'dojak' | 'nintondo';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletId: SupportedWalletId) => void;
  onDisconnect: () => void;
  wallet: SimpleWallet | null;
}

const walletOptions: Array<{
  id: SupportedWalletId;
  name: string;
  description: string;
  iconLabel: string;
}> = [
  {
    id: 'mydoge',
    name: 'MyDoge',
    description: 'Connect your MyDoge wallet',
    iconLabel: 'MD',
  },
  {
    id: 'dojak',
    name: 'Dojak',
    description: 'Connect your Dojak wallet',
    iconLabel: 'DJ',
  },
  {
    id: 'nintondo',
    name: 'Nintondo',
    description: 'Connect your Nintondo wallet',
    iconLabel: 'NI',
  },
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  wallet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-bg-secondary rounded-lg border border-border-primary max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
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

        <div className="p-6">
          {wallet ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-primary-900/20 rounded-lg border border-primary-700/30">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">DOGE</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">Connected Wallet</p>
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
            <div className="space-y-4">
              <p className="text-text-secondary text-center">
                Choose a supported DOGE Layer 1 wallet.
              </p>

              <div className="space-y-3">
                {walletOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onConnect(option.id)}
                    className="w-full flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 border-border-primary hover:border-primary-500 hover:bg-primary-900/20"
                  >
                    <div className="w-12 h-12 bg-bg-primary rounded-lg flex items-center justify-center text-sm font-semibold">
                      {option.iconLabel}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-text-primary">{option.name}</p>
                      <p className="text-sm text-text-secondary">{option.description}</p>
                    </div>
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
