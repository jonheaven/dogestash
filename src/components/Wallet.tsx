import React, { useState } from 'react';
import { CubeIcon, BanknotesIcon, ArrowPathIcon, ExclamationTriangleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { MyDogeInscription } from '../utils/api';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import { useDataProvider } from '../providers/DataProvider';
import { InscriptionModal } from './InscriptionModal';
import { UtxoManagement } from './wallet/UtxoManagement';

interface WalletProps {
  userMode?: 'collector' | 'builder';
  onNavigateToSection?: (section: string) => void;
}

export const Wallet: React.FC<WalletProps> = ({ userMode = 'collector', onNavigateToSection }) => {
  const { connected: walletConnected, address: walletAddress } = useUnifiedWallet();
  const {
    drc20Tokens,
    inscriptions,
    isLoadingDrc20Tokens,
    isLoadingInscriptions,
    drc20TokensError,
    inscriptionsError,
    refreshWalletData,
    canRefreshWallet,
    timeUntilWalletRefresh,
  } = useDataProvider();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedInscription, setSelectedInscription] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = isLoadingDrc20Tokens || isLoadingInscriptions;

  // Filter inscriptions to exclude DRC-20 tokens
  const filteredInscriptions = inscriptions?.filter(insc =>
    !drc20Tokens?.some(token => token.inscriptionId === insc.inscriptionId)
  ) || [];

  // Memoize tabs to prevent recreation on every render
  const tabs = React.useMemo(
    () => {
      const allTabs = [
        {
          name: 'Collectibles',
          icon: CubeIcon,
          content: (
        <div className="space-y-4">
          {filteredInscriptions.map((inscription) => (
              <div
                key={inscription.inscriptionId}
                onClick={() => {
                  setSelectedInscription(inscription.inscriptionId);
                  setIsModalOpen(true);
                }}
                className="bg-bg-secondary rounded-lg p-4 border border-border-primary hover:border-primary-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                    {inscription.preview ? (
                      <img
                        src={inscription.preview}
                        alt={inscription.inscriptionId}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <CubeIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {inscription.inscriptionId}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      #{inscription.inscriptionNumber}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(inscription.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Value</p>
                    <p className="text-sm text-text-primary">
                      {parseInt(inscription.outputValue) / 100000000} DOGE
                    </p>
                  </div>
                </div>
              </div>
            ))}
          {filteredInscriptions.length === 0 && !isLoading && !inscriptionsError && (
            <div className="text-center py-8 text-text-secondary">
              <CubeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No collectibles found</p>
              <p className="text-sm mt-1">Your Doginals and NFTs will appear here</p>
            </div>
          )}
          {inscriptionsError && (
            <div className="text-center py-8 text-text-secondary">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <p>{inscriptionsError}</p>
              <p className="text-sm mt-1">Please try refreshing or check your connection</p>
            </div>
          )}
        </div>
      )
    },
    {
      name: 'Tokens',
      icon: BanknotesIcon,
      content: (
        <div className="space-y-4">
          {drc20Tokens && drc20Tokens.length > 0 ? (
            drc20Tokens.map((token) => (
              <div
                key={token.ticker}
                className="bg-bg-secondary rounded-lg p-4 border border-border-primary hover:border-primary-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                      <BanknotesIcon className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">
                        ${token.ticker}
                      </h3>
                      <p className="text-xs text-text-secondary">
                        {token.available} available
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-primary">
                      {parseInt(token.balance).toLocaleString()}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Transferable: {parseInt(token.transferable).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : !isLoading && !drc20TokensError ? (
            <div className="text-center py-8 text-text-secondary">
              <BanknotesIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No DRC-20 tokens found</p>
              <p className="text-sm mt-1">Your tokens will appear here</p>
            </div>
          ) : drc20TokensError ? (
            <div className="text-center py-8 text-text-secondary">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <p>{drc20TokensError}</p>
              <p className="text-sm mt-1">Please try refreshing or check your connection</p>
            </div>
          ) : null}
        </div>
      )
    }
      ];

      // Add UTXO tab for builders only
      if (userMode === 'builder') {
        allTabs.push({
          name: 'UTXOs',
          icon: CubeIcon,
          content: walletAddress ? (
            <UtxoManagement
              walletAddress={walletAddress}
              onSendToDogedrops={(utxos) => {
                // Store UTXOs and navigate to DogeDrops
                localStorage.setItem('dogedrops-selected-utxos', JSON.stringify(utxos));
                onNavigateToSection?.('dogedrops');
              }}
            />
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <CubeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Wallet not connected</p>
              <p className="text-sm mt-1">Please connect your wallet to manage UTXOs</p>
            </div>
          )
        });
      }

      return allTabs;
    },
  [filteredInscriptions, drc20Tokens, isLoading, userMode]
  );

  if (!walletConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Wallet Not Connected</h2>
          <p className="text-text-secondary">Please connect your MyDoge wallet to view your holdings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Wallet</h1>
            <p className="text-text-secondary mt-1">
              Your Dogecoin holdings and collectibles
            </p>
          </div>
          <button
            onClick={refreshWalletData}
            disabled={!canRefreshWallet || isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors disabled:opacity-50"
            title={!canRefreshWallet ? `Please wait ${Math.ceil(timeUntilWalletRefresh / 1000)} seconds` : 'Refresh wallet data'}
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>
              {!canRefreshWallet
                ? `Wait ${Math.ceil(timeUntilWalletRefresh / 1000)}s`
                : 'Refresh'
              }
            </span>
          </button>
        </div>

        {/* Wallet Address */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-text-secondary">Connected Wallet</p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-lg font-mono text-text-primary font-semibold">
                  {walletAddress}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="p-1 hover:bg-bg-primary rounded transition-colors"
                  title="Copy address to clipboard"
                >
                  <ClipboardDocumentIcon className="w-5 h-5 text-text-secondary hover:text-primary-500" />
                </button>
                {copied && (
                  <span className="text-xs text-green-500 font-medium">Copied!</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Total Items</p>
              <p className="text-lg font-semibold text-text-primary">
                {(inscriptions?.length || 0) + (drc20Tokens?.length || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border-primary">
          <div className="flex items-center space-x-3">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-primary-500" />
            <p className="text-text-secondary">Loading wallet holdings...</p>
          </div>
        </div>
      )}

      {/* Custom Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-bg-secondary p-1 border border-border-primary">
          {tabs.map((tab, idx) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(idx)}
              className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 flex items-center justify-center space-x-2 ${
                activeTab === idx
                  ? 'bg-primary-500 text-bg-primary shadow'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6 mt-4">
          {tabs[activeTab].content}
        </div>
      </div>

      {/* Inscription Detail Modal */}
      <InscriptionModal
        inscriptionId={selectedInscription || ''}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInscription(null);
        }}
      />
    </div>
  );
};
