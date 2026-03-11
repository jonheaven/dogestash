import React, { useState } from 'react';
import {
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { broadcastDRC20Mint, getFeeEstimate } from '../../utils/txBroadcaster';

interface TokenMinterProps {
  availableUtxos: any[];
}

export const TokenMinter: React.FC<TokenMinterProps> = ({ availableUtxos }) => {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [mintAmount, setMintAmount] = useState<string>('');
  const [isMinting, setIsMinting] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState<string>('');

  const toast = useToast();

  // Mock token list - in production this would come from an API
  const availableTokens = [
    { id: 'DCCT', name: 'Dogecoin Community Token', maxSupply: 1000000, currentSupply: 500000 },
    { id: 'SHIB', name: 'Shiba Inu Token', maxSupply: 10000000, currentSupply: 2500000 },
    { id: 'DOGE', name: 'Pure Dogecoin', maxSupply: 21000000, currentSupply: 14200000 }
  ];

  const selectedTokenData = availableTokens.find(t => t.id === selectedToken);

  const handleMint = async () => {
    if (!selectedToken || !mintAmount || parseFloat(mintAmount) <= 0) {
      toast.error('Please select a token and enter a valid mint amount');
      return;
    }

    if (!recipientAddress) {
      toast.error('Please enter a recipient address');
      return;
    }

    if (!selectedTokenData) {
      toast.error('Invalid token selected');
      return;
    }

    const requestedAmount = parseFloat(mintAmount);
    const availableSupply = selectedTokenData.maxSupply - selectedTokenData.currentSupply;

    if (requestedAmount > availableSupply) {
      toast.error(`Cannot mint ${requestedAmount} tokens. Only ${availableSupply} available in supply.`);
      return;
    }

    setIsMinting(true);

    try {
      // Find a suitable UTXO for minting (need at least one plain UTXO)
      const availableUtxo = availableUtxos.find((utxo: any) =>
        utxo.value >= 100000 && // At least 0.001 DOGE
        utxo.confirmations > 0
      );

      if (!availableUtxo) {
        toast.error('No suitable UTXO available for minting. Please ensure you have confirmed UTXOs.');
        return;
      }

      // Get fee estimate
      const estimatedFee = await getFeeEstimate();

      // Broadcast the DRC-20 mint transaction
      const txid = await broadcastDRC20Mint(
        availableUtxo,
        selectedToken,
        requestedAmount,
        recipientAddress,
        estimatedFee
      );

      toast.success(`Successfully minted ${requestedAmount} ${selectedToken} tokens! TX: ${txid.slice(0, 8)}...`);

      // Reset form
      setMintAmount('');
      setRecipientAddress('');

    } catch (error) {
      console.error('Minting failed:', error);
      toast.error(`Minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Mint DRC-20 Tokens</h3>

        <div className="space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Select Token to Mint
            </label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Choose a token...</option>
              {availableTokens.map(token => (
                <option key={token.id} value={token.id}>
                  {token.name} (${token.id}) - {token.currentSupply.toLocaleString()}/{token.maxSupply.toLocaleString()} minted
                </option>
              ))}
            </select>
          </div>

          {/* Mint Amount */}
          {selectedTokenData && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Mint Amount
              </label>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder={`Max: ${(selectedTokenData.maxSupply - selectedTokenData.currentSupply).toLocaleString()}`}
                min="0"
                max={selectedTokenData.maxSupply - selectedTokenData.currentSupply}
                className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-text-secondary mt-1">
                Available to mint: {(selectedTokenData.maxSupply - selectedTokenData.currentSupply).toLocaleString()} {selectedToken}
              </p>
            </div>
          )}

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="D..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-text-secondary mt-1">
              The address that will receive the newly minted tokens
            </p>
          </div>

          {/* Mint Button */}
          <div className="pt-4 border-t border-border-primary">
            <button
              onClick={handleMint}
              disabled={isMinting || !selectedToken || !mintAmount || !recipientAddress}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 text-white disabled:text-text-secondary rounded-lg transition-colors font-medium"
            >
              {isMinting ? 'Minting Tokens...' : 'Mint DRC-20 Tokens'}
            </button>
          </div>
        </div>
      </div>

      {/* Minting Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-400 mb-1">About DRC-20 Minting</h4>
            <p className="text-sm text-text-primary mb-2">
              Minting DRC-20 tokens creates new supply via blockchain inscriptions.
              Each mint operation requires a UTXO and creates an on-chain record.
            </p>
            <div className="text-xs text-text-secondary space-y-1">
              <div>• Minting increases the circulating supply of your token</div>
              <div>• Recipients receive tokens via inscription transfer</div>
              <div>• All mint operations are permanently recorded on-chain</div>
              <div>• You can only mint up to your token's maximum supply limit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Mints */}
      <div className="bg-bg-secondary rounded-lg p-4">
        <h4 className="font-medium text-text-primary mb-3">Recent Mint Operations</h4>
        <div className="space-y-3">
          {/* Mock recent mints - in production this would come from an API */}
          <div className="flex items-center justify-between py-2 border-b border-border-primary last:border-b-0">
            <div>
              <div className="font-medium text-text-primary">1,000 DCCT</div>
              <div className="text-sm text-text-secondary">To: D9WqZGJAsksJCkH8nJq7ZKxJ8jJ7ZKxJ8</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-400">Confirmed</div>
              <div className="text-xs text-text-secondary">2 mins ago</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border-primary last:border-b-0">
            <div>
              <div className="font-medium text-text-primary">500 SHIB</div>
              <div className="text-sm text-text-secondary">To: D8WqZGJAsksJCkH8nJq7ZKxJ8jJ7ZKxJ8</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-yellow-400">Pending</div>
              <div className="text-xs text-text-secondary">5 mins ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
