import React, { useState, useEffect } from 'react';
import { XMarkIcon, ShieldCheckIcon, KeyIcon, EyeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { PawPrint, AlertTriangle } from 'lucide-react';

interface SafetyAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewUTXOs: () => void;
  hasInscriptions?: boolean;
}

export const SafetyAdvisoryModal: React.FC<SafetyAdvisoryModalProps> = ({
  isOpen,
  onClose,
  onViewUTXOs,
  hasInscriptions = false
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset checkbox when modal opens
      setDontShowAgain(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('dogedrops-safety-advisory-dismissed', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not modal content
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-primary border border-border-primary rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <div>
              <h2 className="text-xl font-bold text-text-primary">⚠️ Airdrop Safety Tip</h2>
              <p className="text-sm text-text-secondary">Important security information for DogeDrops</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer flex-shrink-0"
            type="button"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6 text-text-secondary hover:text-text-primary" />
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShieldCheckIcon className="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-400 mb-2">Use a dedicated wallet for DogeDrops</h3>
                <p className="text-text-primary text-sm">
                  Use a <strong>fresh wallet</strong> with no valuable inscriptions (DRC-20 tokens or rare Doginals)
                  for DogeDrops. Mixing assets risks burning them as fees.
                </p>
              </div>
            </div>
          </div>

          {hasInscriptions && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-400 mb-2">⚠️ Inscriptions Detected!</h3>
                  <p className="text-text-primary text-sm">
                    Your current wallet contains inscriptions that could be accidentally spent as fees.
                    Consider switching to a fresh wallet for safer airdrops.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-bg-secondary rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-3">Recommended Actions:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary-400">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Generate a fresh wallet</p>
                  <p className="text-xs text-text-secondary">Create a new wallet dedicated to this airdrop session</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary-400">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Check your UTXOs</p>
                  <p className="text-xs text-text-secondary">Review your unspent outputs and lock any with inscriptions</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary-400">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Switch wallets if needed</p>
                  <p className="text-xs text-text-secondary">Connect your fresh wallet before proceeding</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <PawPrint className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-400 mb-1">Why this matters:</h4>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• Inscriptions are like Dogecoin Ordinals—treat them as non-spendable</li>
                  <li>• DogeDrops may select any available UTXO for fee payment</li>
                  <li>• Fresh wallets prevent fragmentation and accidental burns</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-primary">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border-primary bg-bg-secondary text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="dont-show-again" className="text-sm text-text-secondary">
              Don't show this again
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onViewUTXOs}
              className="flex items-center space-x-2 px-4 py-2 bg-bg-secondary hover:bg-bg-primary border border-border-primary rounded-lg transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              <span>View My UTXOs</span>
            </button>
            <button
              onClick={handleClose}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors"
            >
              <KeyIcon className="w-4 h-4" />
              <span>I Understand - Create Wallet Later</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
