import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { PawPrint, CheckCircle, Zap, Flame } from 'lucide-react';
import { AssetSelector } from './dogedrops/AssetSelector';
import { RecipientImporter } from './dogedrops/RecipientImporter';
import { ReviewSummary } from './dogedrops/ReviewSummary';
import { WalletRecommendations } from './dogedrops/WalletRecommendations';
import { SafetyAdvisoryModal } from './dogedrops/SafetyAdvisoryModal';
import { BatchSendModal } from './dogedrops/BatchSendModal';
import { SimpleSend } from './SimpleSend';
import {
  SimpleWallet,
  myDogeGetDRC20Balance,
  myDogeGetTransferableDRC20,
  myDogeRequestAvailableDRC20Transaction
} from 'borkstarter';
import { useToast } from '../contexts/ToastContext';
import { feeEstimator } from '../utils/liveFeeEstimator';

interface DogedropsWizardProps {
  wallet: SimpleWallet | null;
  onConnectWallet: () => void;
  userMode: 'collector' | 'builder';
}

export const DogedropsWizard: React.FC<DogedropsWizardProps> = ({ wallet, onConnectWallet, userMode }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [assetType, setAssetType] = useState<'tokens' | 'collectibles'>('tokens');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isSimulateMode, setIsSimulateMode] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [sendMode, setSendMode] = useState<'batch' | 'simple'>('batch');
  const [showSafetyAdvisory, setShowSafetyAdvisory] = useState(false);
  const [hasInscriptions, setHasInscriptions] = useState(false);
  const [preselectedUtxos, setPreselectedUtxos] = useState<any[]>([]);
  const [mintedToken, setMintedToken] = useState<any>(null);
  const [showBatchSendModal, setShowBatchSendModal] = useState(false);

  const toast = useToast();

  // Check for inscriptions and show safety advisory for builders
  useEffect(() => {
    if (userMode === 'builder' && wallet) {
      // Check if user has dismissed the advisory
      const dismissed = localStorage.getItem('dogedrops-safety-advisory-dismissed') === 'true';

      if (!dismissed) {
        // Check if wallet has inscriptions (simplified check - in real implementation,
        // this would query the wallet's inscription data)
        // For now, we'll assume we need to check this
        setShowSafetyAdvisory(true);
      }
    }
  }, [userMode, wallet]);

  // Load preselected UTXOs and minted tokens from localStorage
  useEffect(() => {
    // Load preselected UTXOs
    const storedUtxos = localStorage.getItem('dogedrops-selected-utxos');
    if (storedUtxos) {
      try {
        const utxos = JSON.parse(storedUtxos);
        setPreselectedUtxos(utxos);
        localStorage.removeItem('dogedrops-selected-utxos');
        toast.success(`Loaded ${utxos.length} preselected UTXOs from wallet management!`);
      } catch (error) {
        console.error('Failed to parse preselected UTXOs:', error);
        toast.error('Failed to load preselected UTXOs');
      }
    }

    // Load minted token
    const storedToken = localStorage.getItem('dogedrops-minted-token');
    if (storedToken) {
      try {
        const tokenData = JSON.parse(storedToken);
        setMintedToken(tokenData);
        localStorage.removeItem('dogedrops-minted-token');
        toast.success(`Fresh DRC-20 token "${tokenData.token.name}" ready for airdrop!`);
      } catch (error) {
        console.error('Failed to parse minted token:', error);
        toast.error('Failed to load minted token');
      }
    }
  }, []);

  const handleSafetyAdvisoryClose = () => {
    setShowSafetyAdvisory(false);
  };


  const handleViewUTXOs = () => {
    // Navigate to wallet UTXO tab
    toast.info('UTXO management coming soon!');
  };

  const handleBatchSend = async (recipients: any[], totalAmount: number, fee: number) => {
    try {
      // Use selected UTXOs or fall back to available ones
      const utxosToUse = preselectedUtxos.length > 0 ? preselectedUtxos : []; // In production, get from wallet

      if (utxosToUse.length === 0) {
        toast.error('No UTXOs available for batch send. Please select UTXOs from wallet first.');
        return;
      }

      const { broadcastBatchSend } = await import('../utils/txBroadcaster');

      const txid = await broadcastBatchSend(utxosToUse, recipients, fee);

      toast.success(`Batch airdrop successful! ${totalAmount} DOGE sent to ${recipients.length} recipients. TxID: ${txid.slice(0, 16)}...`);

    } catch (error) {
      toast.error(`Batch send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Re-throw to let modal handle it
    }
  };

  const steps = [
    { id: 1, title: 'Select Type & Asset', description: 'Choose what to distribute' },
    { id: 2, title: 'Import Recipients', description: 'Upload recipient list' },
    { id: 3, title: 'Review & Execute', description: 'Confirm and launch' }
  ];

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return selectedAsset !== null;
      case 3:
        return recipients.length > 0;
      default:
        return true;
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedAsset(null);
    setRecipients([]);
    setIsSimulateMode(false);
    setSimulationResults(null);
    setShowSimulationModal(false);
  };

  const runSimulation = async () => {
    if (recipients.length === 0) {
      toast.error('No recipients to simulate. Please import a CSV first.');
      return;
    }

    if (recipients.length > 500) {
      toast.error('Pack too big—trim to 500 wallets, fren!');
      return;
    }

    try {
      toast.info('Fetching live fees and running simulation...', 2000);

      // Get live fee estimates
      const liveFeeData = await feeEstimator.calculateAirdropCosts(recipients.length);

      // Calculate token distribution (if asset is selected)
      const totalTokensDistributed = selectedAsset && assetType === 'tokens'
        ? recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
        : 0;

      const estTxSize = recipients.length * 250; // Rough bytes estimate

      // Generate "what-if" scenarios with live fees
      const scenarios = [
        {
          name: 'Base Drop',
          wallets: recipients.length,
          dogeCost: liveFeeData.grandTotal,
          tokensOut: totalTokensDistributed,
          txns: liveFeeData.numTxns
        },
        {
          name: 'Half Pack',
          wallets: Math.floor(recipients.length / 2),
          dogeCost: liveFeeData.grandTotal / 2,
          tokensOut: totalTokensDistributed / 2,
          txns: Math.ceil(Math.floor(recipients.length / 2) / 100)
        },
        {
          name: 'Max Blast (500)',
          wallets: 500,
          dogeCost: (await feeEstimator.calculateAirdropCosts(500)).grandTotal,
          tokensOut: selectedAsset && assetType === 'tokens' ? 500 * (totalTokensDistributed / recipients.length || 0) : 0,
          txns: Math.ceil(500 / 100)
        }
      ];

      const results = {
        success: true,
        totalDOGEFees: liveFeeData.grandTotal,
        totalTokensDistributed,
        estTxSize,
        numRecipients: recipients.length,
        scenarios,
        assetType,
        selectedAsset,
        liveFeeData
      };

      setSimulationResults(results);
      setShowSimulationModal(true);
      toast.success('🐕 Simulation complete! Live fees from the chain.');

    } catch (error: any) {
      console.error('Simulation error:', error);
      toast.error(`Simulation snag: ${error.message}`);
    }
  };

  const executeDRC20Airdrop = async (userTicker: string, recipients: any[]) => {
    try {
      const totalAmount = recipients.reduce((sum: number, r: any) => sum + r.amount, 0);

      if (recipients.length > 500) {
        throw new Error('Pack too big—max 500 wallets, fren!');
      }

      // Real blockchain balance check
      const balanceInfo = await myDogeGetDRC20Balance({ ticker: userTicker });
      const transferableInfo = await myDogeGetTransferableDRC20({ ticker: userTicker });

      console.log(`Fetched for ${userTicker}: Total Balance ${balanceInfo.balance}, Transferable ${transferableInfo.amount}`);

      if (transferableInfo.amount < totalAmount) {
        throw new Error(`Insufficient transferable ${userTicker}: Need ${totalAmount}, have ${transferableInfo.amount}`);
      }

      // Live fee calculation
      const liveFees = await feeEstimator.calculateAirdropCosts(recipients.length);

      // User confirmation
      const confirmed = window.confirm(
        `🚀 Blast ${totalAmount} ${userTicker} to ${recipients.length} wallets?\n` +
        `Est. Cost: ~${liveFees.grandTotal.toFixed(4)} DOGE\n` +
        `Batches: ${Math.ceil(recipients.length / 100)}`
      );
      if (!confirmed) return { success: false, reason: 'User noped' };

      // Batch processing (100 recipients per batch)
      const batches = [];
      for (let i = 0; i < recipients.length; i += 100) {
        batches.push(recipients.slice(i, i + 100));
      }

      const txIds: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} for ${userTicker}`);

        const batchTxs = await Promise.all(
          batch.map(async (rec: any) => {
            // MyDoge handles all inscription complexity
            const txResult = await myDogeRequestAvailableDRC20Transaction({
              ticker: userTicker,
              amount: rec.amount
            });
            return txResult.txId || `tx_${Date.now()}_${Math.random()}`;
          })
        );

        txIds.push(...batchTxs);
        toast.success(`Batch ${i + 1} blasted – ${batch.length} ${userTicker} sent!`);
      }

      // Start tracking
      // Note: TxPoller integration would go here

      // Save to analytics
      const dropData = {
        id: Date.now().toString(),
        ticker: userTicker,
        tokens: totalAmount,
        wallets: recipients.length,
        fees: liveFees.grandTotal,
        networkFees: liveFees.networkTotal,
        serviceFees: liveFees.serviceTotal,
        confTime: 'Tracking',
        date: new Date().toISOString().split('T')[0]
      };

      const history = JSON.parse(localStorage.getItem('borkDropsHistory') || '[]');
      history.push(dropData);
      localStorage.setItem('borkDropsHistory', JSON.stringify(history));

      console.log(`Airdrop complete for ${userTicker}: ${txIds.length} txs, ${totalAmount} distributed`);
      toast.success(`🎉 ${totalAmount} ${userTicker} blasted to ${recipients.length} wallets!`);

      return { success: true, txIds, dropData };

    } catch (err: any) {
      console.error(`Airdrop flop for ${userTicker}:`, err);
      toast.error(`Blast failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
            <PawPrint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-text-primary">DogeDrop</h1>
            <p className="text-text-secondary">
              {sendMode === 'batch'
                ? 'Distribute DRC-20 Tokens or Collectibles to Multiple Addresses'
                : 'Send DRC-20 tokens to a single recipient'
              }
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex space-x-1 p-1 bg-bg-secondary rounded-lg border border-border-primary">
          <button
            onClick={() => setSendMode('batch')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              sendMode === 'batch'
                ? 'bg-primary-500 text-bg-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
            }`}
          >
            📄 Batch Airdrop
          </button>
          <button
            onClick={() => setSendMode('simple')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              sendMode === 'simple'
                ? 'bg-primary-500 text-bg-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
            }`}
          >
            ✈️ Simple Send
          </button>
          <button
            onClick={() => setShowBatchSendModal(true)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
            }`}
          >
            👥 Multi-Send
          </button>
        </div>

        {/* Wallet Status */}
        <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-border-primary">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${wallet ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <div>
              <p className="font-medium text-text-primary">
                {wallet ? 'Connected' : 'Not Connected'}
              </p>
              {wallet && (
                <p className="text-sm text-text-secondary font-mono">
                  {wallet.getAddress().slice(0, 8)}...{wallet.getAddress().slice(-6)}
                </p>
              )}
            </div>
          </div>
          {wallet ? (
            <button
              onClick={() => {/* TODO: Add disconnect functionality */}}
              className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors duration-200"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnectWallet}
              className="btn-primary"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

        {/* Preselected UTXOs Notification */}
        {preselectedUtxos.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-blue-400">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-400 mb-1">UTXOs Preselected from Wallet</h4>
                <p className="text-sm text-text-primary">
                  {preselectedUtxos.length} eligible UTXO{preselectedUtxos.length > 1 ? 's' : ''} loaded from wallet management.
                  These will be used as the source for your airdrop.
                </p>
                <div className="mt-2 text-xs text-text-secondary">
                  Total: {preselectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0) / 100000000} DOGE
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Minted Token Notification */}
        {mintedToken && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-green-400">🎉</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-400 mb-1">DRC-20 Token Deployed!</h4>
                <p className="text-sm text-text-primary">
                  Your <strong>${mintedToken.token.ticker}</strong> ({mintedToken.token.name}) is live on-chain!
                  Refresh your token list below once confirmed to see it available for airdrop.
                </p>
                <div className="mt-2 text-xs text-text-secondary">
                  Max Supply: {mintedToken.token.maxSupply.toLocaleString()} •
                  Decimals: {mintedToken.token.decimals} •
                  <a
                    href={`https://dogechain.info/tx/${mintedToken.inscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 underline"
                  >
                    View on Explorer ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Recommendations - Only show if wallet is connected */}
        {wallet && <WalletRecommendations />}

      {sendMode === 'simple' ? (
        <SimpleSend wallet={wallet} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-text-primary' : 'text-text-tertiary'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-text-tertiary">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 ${
                      currentStep > step.id ? 'bg-primary-600' : 'bg-gray-700'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {currentStep === 1 && (
              <AssetSelector
                assetType={assetType}
                selectedAsset={selectedAsset}
                wallet={wallet}
                onAssetTypeChange={(type) => {
                  setAssetType(type);
                  setSelectedAsset(null);
                  toast.info(`Switched to ${type === 'tokens' ? 'DRC-20 Tokens' : 'Doginals Collectibles'} mode`);
                }}
                onAssetSelect={(asset) => {
                  setSelectedAsset(asset);
                  toast.success(`${assetType === 'tokens' ? 'Token' : 'Collectible'} selected successfully!`);
                }}
                onNext={() => {
                  setCurrentStep(2);
                  toast.info('Moving to recipient import...');
                }}
                canProceed={canProceedToStep(2)}
              />
            )}

            {currentStep === 2 && (
              <RecipientImporter
                assetType={assetType}
                selectedAsset={selectedAsset}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                onNext={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
                canProceed={canProceedToStep(3)}
              />
            )}

            {currentStep === 3 && (
              <ReviewSummary
                assetType={assetType}
                selectedAsset={selectedAsset}
                recipients={recipients}
                isSimulateMode={isSimulateMode}
                onSimulateModeChange={setIsSimulateMode}
                onExecute={() => {/* TODO: Implement execution */}}
                onBack={() => setCurrentStep(2)}
                wallet={wallet}
                onExecuteDRC20={executeDRC20Airdrop}
              />
            )}
          </div>
        </div>

        {/* Notices Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Important Notices</h3>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-400 mt-1">⚠️</span>
                  <span>Up to 500 recipient addresses supported per airdrop</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-400 mt-1">💰</span>
                  <span>Use a newly created wallet funded with sufficient DOGE for fees (0.05 DOGE per transaction)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-400 mt-1">🏷️</span>
                  <span>A service fee of 0.025 DOGE is charged per wallet</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-400 mt-1">🪙</span>
                  <span>For Tokens: DRC-20 uses JSON inscriptions for fungible distribution</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-400 mt-1">🎨</span>
                  <span>For Collectibles: Transfers via Ordinals protocol (1:1 ownership)</span>
                </li>
              </ul>
            </div>

            {/* Controls */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => setCurrentStep(Math.min(currentStep + 1, 3))}
                disabled={!canProceedToStep(currentStep + 1)}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 1 ? 'Continue to Recipients' :
                 currentStep === 2 ? 'Review & Execute' :
                 'Execute Airdrop'}
              </button>

              {currentStep === 2 && recipients.length > 0 && (
                <button
                  data-tour="simulate-mode"
                  onClick={runSimulation}
                  className="w-full btn-outline border-doge-yellow text-doge-yellow hover:bg-doge-yellow hover:text-bg-primary"
                >
                  🎭 Simulate Drop
                </button>
              )}

              <button
                onClick={resetWizard}
                className="w-full btn-secondary"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Simulation Modal */}
      {showSimulationModal && simulationResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSimulationModal(false)} />
          <div className="relative bg-bg-primary rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-primary">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-text-primary">🎭 Drop Simulation Results</h3>
                <button
                  onClick={() => setShowSimulationModal(false)}
                  className="p-2 hover:bg-bg-secondary rounded-md transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary-500">{simulationResults.numRecipients}</div>
                  <div className="text-sm text-text-secondary">Wallets</div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-doge-yellow">{simulationResults.totalDOGEFees.toFixed(4)}</div>
                  <div className="text-sm text-text-secondary">DOGE Cost</div>
                  <div className="text-xs text-green-400">🔴 LIVE</div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary-500">{simulationResults.scenarios[0].txns}</div>
                  <div className="text-sm text-text-secondary">Transactions</div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary-500">~{(simulationResults.estTxSize / 1024).toFixed(1)}KB</div>
                  <div className="text-sm text-text-secondary">Est. Size</div>
                </div>
              </div>

              {/* Fee Health Indicator */}
              {simulationResults.liveFeeData && (
                <div className="mt-4 p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-text-secondary">Network Status:</span>
                      <span className={`text-sm font-medium flex items-center space-x-1 ${
                        simulationResults.liveFeeData.liveFee < 0.02 ? 'text-green-400' :
                        simulationResults.liveFeeData.liveFee < 0.08 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {simulationResults.liveFeeData.liveFee < 0.02 ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Low Congestion</span>
                          </>
                        ) : simulationResults.liveFeeData.liveFee < 0.08 ? (
                          <>
                            <Zap className="w-4 h-4" />
                            <span>Normal</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-4 h-4" />
                            <span>High Congestion</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {simulationResults.liveFeeData.liveFee.toFixed(6)} DOGE/tx
                    </div>
                  </div>
                </div>
              )}

              {/* Scenario Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border-primary rounded-lg">
                  <thead>
                    <tr className="bg-bg-secondary">
                      <th className="border border-border-primary p-3 text-left font-semibold text-text-primary">Scenario</th>
                      <th className="border border-border-primary p-3 text-center font-semibold text-text-primary">Wallets</th>
                      <th className="border border-border-primary p-3 text-center font-semibold text-text-primary">DOGE Cost</th>
                      <th className="border border-border-primary p-3 text-center font-semibold text-text-primary">Transactions</th>
                      {simulationResults.assetType === 'tokens' && (
                        <th className="border border-border-primary p-3 text-center font-semibold text-text-primary">Tokens Out</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResults.scenarios.map((scenario: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/50'}>
                        <td className="border border-border-primary p-3 font-medium text-text-primary">{scenario.name}</td>
                        <td className="border border-border-primary p-3 text-center text-text-primary">{scenario.wallets}</td>
                        <td className="border border-border-primary p-3 text-center text-doge-yellow font-medium">{scenario.dogeCost.toFixed(3)}</td>
                        <td className="border border-border-primary p-3 text-center text-text-primary">{scenario.txns}</td>
                        {simulationResults.assetType === 'tokens' && (
                          <td className="border border-border-primary p-3 text-center text-primary-500 font-medium">{scenario.tokensOut.toFixed(2)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowSimulationModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    setShowSimulationModal(false);
                    setCurrentStep(3);
                    toast.success('Looks good? Ready to launch!');
                  }}
                  className="flex-1 btn-primary"
                >
                  <span className="flex items-center space-x-2">
                    <Rocket className="w-4 h-4" />
                    <span>Proceed to Launch</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Advisory Modal - Only for builders */}
      <SafetyAdvisoryModal
        isOpen={showSafetyAdvisory}
        onClose={handleSafetyAdvisoryClose}
        onViewUTXOs={handleViewUTXOs}
        hasInscriptions={hasInscriptions}
      />

      {/* Batch Send Modal */}
      <BatchSendModal
        isOpen={showBatchSendModal}
        onClose={() => setShowBatchSendModal(false)}
        availableUtxos={preselectedUtxos}
        onExecuteBatch={handleBatchSend}
      />
    </div>
  );
};
