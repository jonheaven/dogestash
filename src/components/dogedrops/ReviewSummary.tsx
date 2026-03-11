import React, { useState, useEffect } from 'react';
import { ClockIcon, CurrencyDollarIcon, UsersIcon, BoltIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import {
  borkstarterClient,
  DogeDrops,
  InscriptionManager,
  AirdropConfig,
  myDogeSignPsbt
} from 'borkstarter';
import { feeEstimator, FeeEstimate } from '../../utils/liveFeeEstimator';
import { TransactionTracker } from '../TransactionTracker';

interface ReviewSummaryProps {
  assetType: 'tokens' | 'collectibles';
  selectedAsset: any;
  recipients: any[];
  isSimulateMode: boolean;
  onSimulateModeChange: (simulate: boolean) => void;
  onExecute: () => void;
  onBack: () => void;
  wallet: any; // SimpleWallet from borkstarter
  onExecuteDRC20?: (ticker: string, recipients: any[]) => Promise<any>;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  assetType,
  selectedAsset,
  recipients,
  isSimulateMode,
  onSimulateModeChange,
  onExecute,
  onBack,
  wallet,
  onExecuteDRC20
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<{
    transactionIds: string[];
    status: 'completed' | 'failed' | null;
    error?: string;
  } | null>(null);
  const [liveFees, setLiveFees] = useState<FeeEstimate | null>(null);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const toast = useToast();

  const validRecipients = recipients.filter(r => r.status === 'valid');
  const totalRecipients = validRecipients.length;

  // Load live fees on component mount
  useEffect(() => {
    const loadLiveFees = async () => {
      if (totalRecipients > 0) {
        setIsLoadingFees(true);
        try {
          const fees = await feeEstimator.calculateAirdropCosts(totalRecipients);
          setLiveFees(fees);
        } catch (error) {
          console.warn('Failed to load live fees:', error);
          // Use cached fees if available
          const cached = feeEstimator.getCachedFees();
          if (cached) {
            setLiveFees(cached);
          }
        } finally {
          setIsLoadingFees(false);
        }
      }
    };

    loadLiveFees();
  }, [totalRecipients]);

  // Refresh live fees
  const refreshFees = async () => {
    if (totalRecipients === 0) return;

    setIsLoadingFees(true);
    try {
      const fees = await feeEstimator.refreshFees();
      const fullFees = await feeEstimator.calculateAirdropCosts(totalRecipients);
      setLiveFees(fullFees);
      toast.success('🐕 Live fees updated from the chain!');
    } catch (error) {
      toast.error('Failed to refresh fees - using cached values');
      console.warn('Fee refresh failed:', error);
    } finally {
      setIsLoadingFees(false);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (assetType === 'tokens' && selectedAsset) {
      const totalAmount = validRecipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      return `${totalAmount.toLocaleString()} ${selectedAsset.id}`;
    } else if (assetType === 'collectibles') {
      return `${validRecipients.length} Collectibles`;
    }
    return '0';
  };

  // Calculate fees (using live data when available)
  const calculateFees = () => {
    if (liveFees) {
      return {
        txFees: liveFees.networkTotal.toFixed(4),
        serviceFees: liveFees.serviceTotal.toFixed(4),
        totalFees: liveFees.grandTotal.toFixed(4),
        isLive: true,
        lastUpdated: liveFees.lastUpdated
      };
    }

    // Fallback to static calculation
    const txFees = totalRecipients * 0.05; // 0.05 DOGE per transaction
    const serviceFees = totalRecipients * 0.025; // 0.025 DOGE service fee
    const totalFees = txFees + serviceFees;

    return {
      txFees: txFees.toFixed(4),
      serviceFees: serviceFees.toFixed(4),
      totalFees: totalFees.toFixed(4),
      isLive: false,
      lastUpdated: new Date()
    };
  };

  const totals = calculateTotals();
  const fees = calculateFees();

  // Estimate time (rough calculation)
  const estimateTime = () => {
    const baseTime = 2; // 2 minutes base
    const perRecipientTime = 0.5; // 30 seconds per recipient
    const totalTime = baseTime + (totalRecipients * perRecipientTime);
    return `${Math.ceil(totalTime)} minutes`;
  };

  const handleExecute = async () => {
    if (isSimulateMode) {
      // Run simulation (existing logic)
      setIsExecuting(true);
      try {
        toast.info('Starting simulation...', 2000);
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.info('Processing transactions...', 3000);
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.info('Finalizing...', 3000);
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast.success(`Simulation completed! ${validRecipients.length} transactions would be processed.`, 5000);
      } catch (error) {
        toast.error('Simulation failed unexpectedly.');
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    // Real PSBT execution
    setIsExecuting(true);

    try {
      toast.info('Initializing DogeDrop execution...', 2000);

      // Initialize DogeDrops components
      const client = new borkstarterClient({ maxRetries: 3 });
      const inscriptionManager = new InscriptionManager(client);
      const drops = new DogeDrops(client, wallet, inscriptionManager);

      // Prepare airdrop configuration
      const airdropConfig: AirdropConfig = {
        recipients: validRecipients.map(r => ({
          address: r.address,
          amount: assetType === 'tokens' ? parseFloat(r.amount) * 100000000 : parseFloat(r.amount) || 0, // Convert to satoshis for tokens
          drc20Data: assetType === 'tokens' && selectedAsset ? {
            op: 'transfer' as const,
            tick: selectedAsset.id,
            amt: parseFloat(r.amount)
          } : undefined,
          inscriptionId: assetType === 'collectibles' ? r.inscription_id : undefined
        })),
        fee: 100000, // 1 DOGE fee
        dogeDropsFee: 10000, // 0.1 DOGE service fee
        isInscriptionAirdrop: assetType === 'collectibles',
        isDrc20Airdrop: assetType === 'tokens',
        drc20Tick: assetType === 'tokens' ? selectedAsset?.id : undefined,
        drc20Op: assetType === 'tokens' ? 'transfer' : undefined
      };

      toast.info('Preparing PSBT batches...', 3000);

      // Confirmation callback
      const confirmExecution = async () => {
        const confirmed = window.confirm(
          `🚀 Ready to launch ${validRecipients.length} transactions?\n\n` +
          `Total cost: ~${fees.totalFees} DOGE\n` +
          `Recipients: ${validRecipients.length}\n\n` +
          `This will batch into ${Math.ceil(validRecipients.length / 100)} PSBT(s) for MyDoge signing.`
        );
        if (!confirmed) throw new Error('User cancelled execution');
      };

      // External signer for MyDoge
      const externalSigner = async (psbtBase64: string): Promise<string> => {
        toast.info('Please sign the PSBT in your MyDoge wallet...', 5000);
        try {
          const signedPsbt = await myDogeSignPsbt(psbtBase64);
          toast.success('PSBT signed successfully!', 2000);
          return signedPsbt;
        } catch (error) {
          toast.error('PSBT signing failed. Please try again.');
          throw error;
        }
      };

      toast.info('Executing airdrop transactions...', 3000);

      // Execute the airdrop
      const transactionIds = await drops.executeAirdrop(airdropConfig, confirmExecution, externalSigner);

      // Store execution results
      setExecutionResults({
        transactionIds,
        status: 'completed'
      });

      // Save drop to history for analytics
      const dropHistory = {
        id: Date.now().toString(),
        tokens: validRecipients.reduce((sum, r) => sum + parseFloat(r.amount), 0),
        wallets: validRecipients.length,
        fees: parseFloat(fees.totalFees),
        networkFees: parseFloat(fees.txFees),
        serviceFees: parseFloat(fees.serviceFees),
        confTime: estimateTime(),
        date: new Date().toISOString().split('T')[0]
      };

      try {
        const existingHistory = JSON.parse(localStorage.getItem('borkDropsHistory') || '[]');
        existingHistory.push(dropHistory);
        localStorage.setItem('borkDropsHistory', JSON.stringify(existingHistory));
      } catch (error) {
        console.warn('Failed to save drop history:', error);
      }

      toast.success(
        `🎉 Airdrop launched! ${transactionIds.length} transactions submitted to Dogecoin network.`,
        8000
      );

      console.log('Airdrop transaction IDs:', transactionIds);

      // Start live transaction tracking
      toast.info('Starting live confirmation tracking...', 3000);

    } catch (error: any) {
      console.error('PSBT execution failed:', error);

      // Store execution results
      setExecutionResults({
        transactionIds: [],
        status: 'failed',
        error: error.message
      });

      if (error.message?.includes('cancelled')) {
        toast.info('Airdrop cancelled - no transactions submitted.');
      } else if (error.message?.includes('balance')) {
        toast.error('Insufficient DOGE balance. Please fund your wallet and try again.');
      } else if (error.message?.includes('rejected')) {
        toast.error('Transaction signing was rejected. Please try again.');
      } else {
        toast.error(`Airdrop failed: ${error.message || 'Unknown error'}. Please check your setup and try again.`);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Review & Execute</h2>

        {/* Asset Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Asset Summary</h3>
          <div className="p-4 bg-bg-primary rounded-lg border border-border-primary">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                {assetType === 'tokens' ? (
                  <span className="text-white font-bold text-sm">
                    {selectedAsset?.id?.slice(0, 2) || 'TO'}
                  </span>
                ) : (
                  <span className="text-white text-xl">🎨</span>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {assetType === 'tokens'
                    ? `${selectedAsset?.id} (${selectedAsset?.name})`
                    : `${Array.isArray(selectedAsset) ? selectedAsset.length : 1} Collectibles Selected`
                  }
                </p>
                <p className="text-text-secondary">Total Distribution: {totals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recipients Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recipients</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-bg-primary rounded-lg border border-border-primary">
              <div className="flex items-center space-x-3">
                <UsersIcon className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="text-2xl font-bold text-text-primary">{totalRecipients}</p>
                  <p className="text-sm text-text-secondary">Total Recipients</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-bg-primary rounded-lg border border-border-primary">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-text-primary">{totalRecipients}</p>
                  <p className="text-sm text-text-secondary">Valid Addresses</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-bg-primary rounded-lg border border-border-primary">
              <div className="flex items-center space-x-3">
                <ClockIcon className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-text-primary">{estimateTime()}</p>
                  <p className="text-sm text-text-secondary">Est. Time</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div data-tour="live-fees" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Fee Breakdown</h3>
            <div className="flex items-center space-x-2">
              {fees.isLive && (
                <span className="text-xs text-green-400 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                  Live from chain
                </span>
              )}
              <button
                onClick={refreshFees}
                disabled={isLoadingFees}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-bg-secondary hover:bg-bg-primary border border-border-primary rounded-md transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isLoadingFees ? 'animate-spin' : ''}`} />
                <span>{isLoadingFees ? 'Updating...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          <div className="bg-bg-primary rounded-lg border border-border-primary overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-text-secondary font-medium">Description</th>
                  <th className="px-4 py-3 text-right text-text-secondary font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                <tr>
                  <td className="px-4 py-3 text-text-primary">
                    Network Fees ({liveFees?.numTxns || Math.ceil(totalRecipients / 100)} txns × {fees.isLive ? `${liveFees?.liveFee.toFixed(4)}` : '0.0500'} DOGE)
                    {fees.isLive && <span className="text-xs text-green-400 ml-1">🔴 LIVE</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary font-mono">{fees.txFees} DOGE</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-text-primary">Service Fees ({totalRecipients} wallets × 0.0250 DOGE)</td>
                  <td className="px-4 py-3 text-right text-text-primary font-mono">{fees.serviceFees} DOGE</td>
                </tr>
                <tr className="bg-yellow-900/10">
                  <td className="px-4 py-3 text-text-primary font-semibold">Total Estimated Cost</td>
                  <td className="px-4 py-3 text-right text-yellow-400 font-mono font-semibold">{fees.totalFees} DOGE</td>
                </tr>
              </tbody>
            </table>
          </div>

          {fees.lastUpdated && (
            <p className="text-xs text-text-tertiary mt-2">
              Last updated: {fees.lastUpdated.toLocaleTimeString()}
              {!fees.isLive && <span className="text-yellow-400 ml-2">⚠️ Using fallback fees</span>}
            </p>
          )}
        </div>

        {/* Execution Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Execution Options</h3>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isSimulateMode}
                onChange={(e) => onSimulateModeChange(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <div>
                <span className="text-text-primary font-medium">Simulate Mode</span>
                <p className="text-sm text-text-secondary">Run without actual transactions (for testing)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Execution Results */}
        {executionResults && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {executionResults.status === 'completed' ? '🚀 Launch Results' : '❌ Execution Failed'}
            </h3>

            <div className={`p-4 rounded-lg border ${
              executionResults.status === 'completed'
                ? 'bg-green-900/20 border-green-700/50'
                : 'bg-red-900/20 border-red-700/50'
            }`}>
              {executionResults.status === 'completed' ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">
                      {executionResults.transactionIds.length} transactions submitted successfully!
                    </span>
                  </div>

                  <div className="bg-bg-primary rounded p-3 border border-border-primary">
                    <p className="text-sm text-text-secondary mb-2">Transaction IDs (track on Dogecoin explorer):</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {executionResults.transactionIds.map((txId, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-primary-400 break-all">{txId}</span>
                          <button
                            onClick={() => window.open(`https://dogechain.info/tx/${txId}`, '_blank')}
                            className="text-xs text-primary-500 hover:text-primary-400 underline"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary mb-4">
                    ⏱️ Transactions will confirm in 1-5 minutes. Track progress below!
                  </p>

                  {/* Live Transaction Tracker */}
                  <TransactionTracker txIds={executionResults.transactionIds} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <XMarkIcon className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-medium">Execution failed</span>
                  </div>
                  {executionResults.error && (
                    <p className="text-sm text-text-secondary bg-bg-primary p-3 rounded border border-border-primary">
                      {executionResults.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms and Execute */}
        <div className="space-y-4">
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <h4 className="font-medium text-yellow-400 mb-2">⚠️ Important</h4>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Ensure your wallet has sufficient DOGE for fees</li>
              <li>• Double-check recipient addresses</li>
              <li>• Transactions cannot be reversed once executed</li>
              <li>• {isSimulateMode ? 'This is a simulation - no real transactions will occur' : 'Service fees are non-refundable'}</li>
            </ul>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="confirm"
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              required
            />
            <label htmlFor="confirm" className="text-text-primary">
              I confirm the distribution details and accept the fees
            </label>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <button onClick={onBack} className="btn-secondary">
              Back to Recipients
            </button>
            <button
              onClick={async () => {
                if (!selectedAsset) {
                  toast.error('Please select a token first');
                  return;
                }

                if (!onExecuteDRC20) {
                  toast.error('Execution function not available');
                  return;
                }

                setIsExecuting(true);
                try {
                  const result = await onExecuteDRC20(selectedAsset.id, validRecipients);
                  if (result.success) {
                    // Handle success - show transaction tracker
                    console.log('Airdrop executed:', result);
                    // Could navigate to tracker page or show results inline
                  }
                } catch (error) {
                  console.error('Execution failed:', error);
                } finally {
                  setIsExecuting(false);
                }
              }}
              disabled={isExecuting || totalRecipients === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isExecuting ? (
                <>
                  <BoltIcon className="w-4 h-4 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <span>Execute Airdrop</span>
                  <span className="text-xs">({totalRecipients} txs)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
