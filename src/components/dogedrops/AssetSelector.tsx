import React from 'react';
import { ChevronDownIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { myDogeGetDRC20Balance, myDogeGetTransferableDRC20 } from 'borkstarter';
import { useToast } from '../../contexts/ToastContext';
import { useDataProvider } from '../../providers/DataProvider';

// DRC-20 token interface
interface DRC20Token {
  id: string;
  name: string;
  balance: string;
  color?: string;
}


interface AssetSelectorProps {
  assetType: 'tokens' | 'collectibles';
  selectedAsset: any;
  wallet: any;
  onAssetTypeChange: (type: 'tokens' | 'collectibles') => void;
  onAssetSelect: (asset: any) => void;
  onNext: () => void;
  canProceed: boolean;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  assetType,
  selectedAsset,
  wallet,
  onAssetTypeChange,
  onAssetSelect,
  onNext,
  canProceed
}) => {
  const { drc20Tokens, isLoadingDrc20Tokens, refreshDrc20Tokens, canRefreshDrc20Tokens, timeUntilDrc20TokensRefresh } = useDataProvider();
  const toast = useToast();
  const [selectedCollectibles, setSelectedCollectibles] = React.useState<string[]>([]);

  // Use data from provider
  const tokens = drc20Tokens || [];
  const isLoadingTokens = isLoadingDrc20Tokens;

  // Fetch DRC-20 tokens from wallet
  // Using data provider instead of local API calls

  const handleRefresh = async () => {
    await refreshDrc20Tokens();
  };

  const handleCollectibleSelect = (id: string) => {
    setSelectedCollectibles(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleNext = () => {
    if (assetType === 'tokens' && selectedAsset) {
      onNext();
    } else if (assetType === 'collectibles' && selectedCollectibles.length > 0) {
      onAssetSelect(selectedCollectibles);
      onNext();
    }
  };

  // Calculate total assets and fees
  const getAssetSummary = () => {
    if (assetType === 'tokens' && selectedAsset) {
      const totalAmount = parseFloat(selectedAsset.balance);
      const estFees = Math.min(500, 1) * 0.05; // Max 500 recipients, 0.05 DOGE per tx
      const serviceFee = Math.min(500, 1) * 0.025; // Service fee
      return {
        total: `${totalAmount.toLocaleString()} ${selectedAsset.id}`,
        fees: `${(estFees + serviceFee).toFixed(3)} DOGE`
      };
    } else if (assetType === 'collectibles' && selectedCollectibles.length > 0) {
      const estFees = selectedCollectibles.length * 0.05;
      const serviceFee = selectedCollectibles.length * 0.025;
      return {
        total: `${selectedCollectibles.length} Collectibles`,
        fees: `${(estFees + serviceFee).toFixed(3)} DOGE`
      };
    }
    return null;
  };

  const summary = getAssetSummary();

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Select Asset Type</h2>

        {/* Asset Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Asset Type
          </label>
          <div className="relative">
            <select
              value={assetType}
              onChange={(e) => {
                onAssetTypeChange(e.target.value as 'tokens' | 'collectibles');
                onAssetSelect(null);
                setSelectedCollectibles([]);
              }}
              className="input appearance-none pr-10"
            >
              <option value="tokens">Tokens (DRC-20)</option>
              <option value="collectibles">Collectibles (Doginals)</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Asset Selection */}
        {assetType === 'tokens' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">
                Your DRC-20 Tokens
              </h3>
              <button
                onClick={handleRefresh}
                disabled={!canRefreshDrc20Tokens || isLoadingTokens}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-primary rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canRefreshDrc20Tokens ? `Please wait ${Math.ceil(timeUntilDrc20TokensRefresh / 1000)} seconds` : 'Refresh DRC-20 tokens'}
              >
                <ArrowPathIcon className={`w-4 h-4 ${isLoadingTokens ? 'animate-spin' : ''}`} />
                <span>
                  {!canRefreshDrc20Tokens
                    ? `Wait ${Math.ceil(timeUntilDrc20TokensRefresh / 1000)}s`
                    : 'Refresh'
                  }
                </span>
              </button>
            </div>

            {/* Wallet Connection Warning */}
            {!wallet && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                  <p className="text-yellow-400 font-medium">Connect your wallet to view your DRC-20 tokens</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {wallet && isLoadingTokens && (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-text-secondary" />
                <span className="ml-2 text-text-secondary">Loading tokens...</span>
              </div>
            )}


            {/* Token List */}
            {wallet && !isLoadingTokens && (
              <div className="grid gap-3">
                {tokens.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary">
                    <p>No DRC-20 tokens found in your wallet</p>
                    <p className="text-sm mt-1">Make sure you have tokens in your connected wallet</p>
                  </div>
                ) : (
                  tokens.map((token) => (
                    <div
                      key={token.id}
                      onClick={() => onAssetSelect(token)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedAsset?.id === token.id
                          ? 'border-primary-500 bg-primary-900/20'
                          : 'border-border-primary hover:border-gray-600 hover:bg-bg-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: token.color || '#6b7280' }}
                          >
                            {token.id.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{token.id} ({token.name})</p>
                            <p className="text-sm text-text-secondary">Balance: {parseFloat(token.balance).toLocaleString()}</p>
                          </div>
                        </div>
                        {selectedAsset?.id === token.id && (
                          <CheckCircleIcon className="w-6 h-6 text-primary-500" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Your Collectibles</h3>

            {/* Wallet Connection Warning */}
            {!wallet && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                  <p className="text-yellow-400 font-medium">Connect your wallet to view your Doginals collectibles</p>
                </div>
              </div>
            )}

            {wallet && (
              <div className="text-center py-8 text-text-secondary">
                <p>Collectibles integration coming soon</p>
                <p className="text-sm mt-1">Doginals support will be available in a future update</p>
              </div>
            )}
          </div>
        )}

        {/* Asset Summary */}
        {summary && (
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <h4 className="font-medium text-yellow-400 mb-2">Asset Summary</h4>
            <div className="space-y-1 text-sm text-text-secondary">
              <p>Total Assets: <span className="text-text-primary">{summary.total}</span></p>
              <p>Est. Fees: <span className="text-text-primary">{summary.fees}</span></p>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Recipients
          </button>
        </div>
      </div>
    </div>
  );
};
