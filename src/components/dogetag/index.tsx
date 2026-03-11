// Dogetag page component
// Main page for the Dogetag feature

import React from 'react';
import { DogetagCreator } from '../DogetagCreator';
import { useUnifiedWallet } from '../../contexts/UnifiedWalletContext';
import { useToast } from '../../contexts/ToastContext';

export const DogetagPage: React.FC = () => {
  const { connected, address } = useUnifiedWallet();
  const toast = useToast();

  const handleDogetagCreated = (txid: string, message: string) => {
    console.log('Dogetag created:', { txid, message });

    // Could add to a local history or analytics here
    // For now, just log and show success toast (already done in component)
  };

  if (!connected || !address) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Wallet Not Connected</h2>
          <p className="text-text-secondary mb-6">
            Please connect your wallet to create Dogetags.
          </p>
          <button
            onClick={() => toast.info('Please use the wallet connection button in the top bar')}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-md transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Create a wallet interface that works with our DogetagCreator
  const walletInterface = {
    getAddress: async () => address,
    getUtxos: async () => {
      // This should be implemented to get UTXOs from the current wallet
      // For now, return empty array - the component will handle the error
      return [];
    },
    signPsbt: async (psbtBase64: string) => {
      // This should be implemented to sign PSBT with the current wallet
      // For now, throw an error that will be handled by the component
      throw new Error('PSBT signing not yet implemented for current wallet. Please use a compatible wallet extension.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <DogetagCreator
        wallet={walletInterface}
        onDogetagCreated={handleDogetagCreated}
      />
    </div>
  );
};

