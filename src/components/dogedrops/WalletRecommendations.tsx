import React from 'react';
import { ShieldCheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { PawPrint } from 'lucide-react';

export const WalletRecommendations: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <ShieldCheckIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">
            🛡️ Security Recommendation for Airdrops
          </h3>
          <p className="text-text-primary mb-4">
            For optimal security in DogeDrops airdrops, use a <strong>fresh wallet</strong> with no prior transactions or inscriptions.
            This prevents accidentally spending valuable assets as fees.
          </p>

          <div className="bg-bg-secondary/50 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <PawPrint className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-text-primary mb-1">Fresh wallets reduce risks:</h4>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• Minimize UTXO fragmentation and inscription risks</li>
                  <li>• Keep valuable assets (DRC-20 tokens, Doginals) safe</li>
                  <li>• Ideal for clean airdrop sourcing</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-primary-400 mb-1">Create a Fresh Wallet</h4>
                <p className="text-sm text-text-secondary">
                  Use the Wallet section to create a new secure wallet for your airdrops
                </p>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
