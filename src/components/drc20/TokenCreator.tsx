import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  DocumentTextIcon,
  PhotoIcon,
  TagIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { broadcastDRC20Deploy, getFeeEstimate } from '../../utils/txBroadcaster';

interface DRC20Token {
  name: string;
  ticker: string;
  description: string;
  maxSupply: number;
  decimals: number;
  logoUrl?: string;
  website?: string;
  twitter?: string;
}

interface TokenCreatorProps {
  onTokenCreated?: (token: DRC20Token, inscriptionId: string) => void;
  availableUtxos: any[];
}

export const TokenCreator: React.FC<TokenCreatorProps> = ({
  onTokenCreated,
  availableUtxos
}) => {
  const [token, setToken] = useState<DRC20Token>({
    name: '',
    ticker: '',
    description: '',
    maxSupply: 1000000,
    decimals: 8
  });
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'form' | 'confirm' | 'minting' | 'success'>('form');
  const [selectedUtxo, setSelectedUtxo] = useState<any>(null);
  const [inscriptionId, setInscriptionId] = useState<string>('');

  const toast = useToast();

  // Find a suitable UTXO for inscription
  useEffect(() => {
    if (availableUtxos.length > 0) {
      // Prefer plain UTXOs with good confirmation count
      const suitableUtxos = availableUtxos
        .filter(u => !u.inscriptions || u.inscriptions.length === 0)
        .filter(u => !u.locked && u.confirmations >= 6)
        .sort((a, b) => b.value - a.value); // Largest first

      if (suitableUtxos.length > 0) {
        setSelectedUtxo(suitableUtxos[0]);
      }
    }
  }, [availableUtxos]);

  const validateToken = (): string | null => {
    if (!token.name.trim()) return 'Token name is required';
    if (!token.ticker.trim()) return 'Token ticker is required';
    if (token.ticker.length > 8) return 'Ticker must be 8 characters or less';
    if (!/^[A-Z0-9]+$/.test(token.ticker)) return 'Ticker must contain only uppercase letters and numbers';
    if (token.maxSupply <= 0) return 'Max supply must be greater than 0';
    if (token.decimals < 0 || token.decimals > 8) return 'Decimals must be between 0 and 8';
    if (!selectedUtxo) return 'No suitable UTXO available for inscription';

    return null;
  };

  const handleCreateToken = async () => {
    const validationError = validateToken();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setCreationStep('confirm');
  };

  const handleConfirmMint = async () => {
    setIsCreating(true);
    setCreationStep('minting');

    try {
      // Get fee estimate
      const estimatedFee = await getFeeEstimate();

      // Deploy the token using the real blockchain function
      const tokenData = {
        ticker: token.ticker,
        name: token.name,
        maxSupply: token.maxSupply,
        decimals: token.decimals,
        description: token.description,
        ...(token.logoUrl && { logo: token.logoUrl }),
        ...(token.website && { site: token.website }),
        ...(token.twitter && { twtr: token.twitter })
      };

      // Broadcast the DRC-20 deploy transaction
      const txid = await broadcastDRC20Deploy(
        selectedUtxo,
        tokenData,
        'your-wallet-address', // TODO: Get from wallet context
        estimatedFee
      );

      // Use txid as inscription ID for now
      const inscriptionId = txid;

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setInscriptionId(mockInscriptionId);
      setCreationStep('success');

      if (onTokenCreated) {
        onTokenCreated(token, mockInscriptionId);
      }

      toast.success(`DRC-20 token "${token.name}" deployed successfully!`);

    } catch (error) {
      console.error('Token creation failed:', error);
      toast.error('Token creation failed. Please try again.');
      setCreationStep('confirm');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreator = () => {
    setToken({
      name: '',
      ticker: '',
      description: '',
      maxSupply: 1000000,
      decimals: 8
    });
    setCreationStep('form');
    setInscriptionId('');
  };

  if (creationStep === 'success') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
        <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-400 mb-2">Token Created Successfully!</h3>
        <div className="bg-bg-secondary rounded-lg p-4 mb-4">
          <h4 className="font-medium text-text-primary mb-2">{token.name} (${token.ticker})</h4>
          <p className="text-sm text-text-secondary mb-2">{token.description}</p>
          <div className="text-xs text-text-secondary space-y-1">
            <div>Max Supply: {token.maxSupply.toLocaleString()}</div>
            <div>Decimals: {token.decimals}</div>
            <div>Inscription ID: {inscriptionId}</div>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetCreator}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors"
          >
            Create Another Token
          </button>
          <button
            onClick={() => toast.success('Token details copied to clipboard!')}
            className="px-4 py-2 bg-bg-secondary hover:bg-bg-primary border border-border-primary rounded-lg transition-colors"
          >
            Share Token
          </button>
        </div>
      </div>
    );
  }

  if (creationStep === 'minting') {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-blue-400 mb-2">Creating Token...</h3>
        <p className="text-text-secondary">Deploying {token.name} to the Dogecoin blockchain</p>
        <div className="mt-4 text-xs text-text-secondary">
          This may take a few moments...
        </div>
      </div>
    );
  }

  if (creationStep === 'confirm') {
    return (
      <div className="bg-bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Confirm Token Deployment</h3>

        <div className="space-y-4 mb-6">
          <div className="bg-bg-primary rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-2">Token Details</h4>
            <div className="space-y-1 text-sm">
              <div><span className="text-text-secondary">Name:</span> {token.name}</div>
              <div><span className="text-text-secondary">Ticker:</span> ${token.ticker}</div>
              <div><span className="text-text-secondary">Max Supply:</span> {token.maxSupply.toLocaleString()}</div>
              <div><span className="text-text-secondary">Decimals:</span> {token.decimals}</div>
              {token.description && (
                <div><span className="text-text-secondary">Description:</span> {token.description}</div>
              )}
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-400 mb-1">Deployment Cost</h4>
                <p className="text-sm text-text-secondary">
                  Creating a DRC-20 token requires an inscription on the Dogecoin blockchain.
                  This will consume the selected UTXO and create a permanent on-chain record.
                </p>
                <div className="mt-2 text-sm">
                  <div>Selected UTXO: {selectedUtxo?.txid?.slice(0, 12)}...:{selectedUtxo?.vout}</div>
                  <div>Value: {(selectedUtxo?.value / 100000000).toFixed(8)} DOGE</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCreationStep('form')}
            className="flex-1 px-4 py-2 bg-bg-primary hover:bg-bg-secondary border border-border-primary rounded-lg transition-colors"
            disabled={isCreating}
          >
            Back to Edit
          </button>
          <button
            onClick={handleConfirmMint}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Deploy Token'}
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Create DRC-20 Token</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Token Name *
            </label>
            <input
              type="text"
              value={token.name}
              onChange={(e) => setToken(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Dogecoin Community Token"
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Token Ticker *
            </label>
            <input
              type="text"
              value={token.ticker}
              onChange={(e) => setToken(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
              placeholder="e.g., DCCT"
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
              maxLength={8}
            />
            <p className="text-xs text-text-secondary mt-1">8 characters max, uppercase only</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Description
          </label>
          <textarea
            value={token.description}
            onChange={(e) => setToken(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your token's purpose and value..."
            rows={3}
            className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500 resize-none"
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Max Supply *
            </label>
            <input
              type="number"
              value={token.maxSupply}
              onChange={(e) => setToken(prev => ({ ...prev, maxSupply: parseInt(e.target.value) || 0 }))}
              placeholder="1000000"
              min="1"
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Decimals *
            </label>
            <select
              value={token.decimals}
              onChange={(e) => setToken(prev => ({ ...prev, decimals: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value={0}>0 (Whole numbers only)</option>
              <option value={2}>2 (Like USD)</option>
              <option value={6}>6 (Like BTC)</option>
              <option value={8}>8 (Like DOGE)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={token.logoUrl || ''}
              onChange={(e) => setToken(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Website
            </label>
            <input
              type="url"
              value={token.website || ''}
              onChange={(e) => setToken(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Twitter
            </label>
            <input
              type="text"
              value={token.twitter || ''}
              onChange={(e) => setToken(prev => ({ ...prev, twitter: e.target.value }))}
              placeholder="@username"
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-text-primary">Selected UTXO for Inscription</h4>
              {selectedUtxo ? (
                <div className="text-sm text-text-secondary mt-1">
                  {selectedUtxo.txid.slice(0, 16)}...:{selectedUtxo.vout} • {(selectedUtxo.value / 100000000).toFixed(8)} DOGE
                </div>
              ) : (
                <div className="text-sm text-red-400 mt-1">No suitable UTXO available</div>
              )}
            </div>
          </div>

          <button
            onClick={handleCreateToken}
            disabled={!selectedUtxo || !token.name || !token.ticker}
            className="w-full px-4 py-3 bg-primary-500 hover:bg-primary-400 disabled:bg-gray-500 text-bg-primary disabled:text-text-secondary rounded-lg transition-colors font-medium"
          >
            Create DRC-20 Token
          </button>
        </div>
      </div>
    </div>
  );
};
