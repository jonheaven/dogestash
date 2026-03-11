import React, { useState, useEffect } from 'react';
import { transactionTracker, TransactionAnalytics, PendingTransaction } from '../utils/transactionTracker';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface TransactionMonitorProps {
  showAnalytics?: boolean;
  compact?: boolean;
}

export const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  showAnalytics = false,
  compact = false
}) => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [analytics, setAnalytics] = useState<TransactionAnalytics | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Initial load
    updateTransactions();

    // Listen for transaction events
    const handleTransactionConfirmed = (event: CustomEvent<PendingTransaction>) => {
      console.log('Transaction confirmed:', event.detail.txid);
      updateTransactions();
    };

    const handleTransactionFailed = (event: CustomEvent<PendingTransaction>) => {
      console.log('Transaction failed:', event.detail.txid);
      updateTransactions();
    };

    window.addEventListener('transactionConfirmed', handleTransactionConfirmed as EventListener);
    window.addEventListener('transactionFailed', handleTransactionFailed as EventListener);

    // Update every 30 seconds
    const interval = setInterval(updateTransactions, 30000);

    return () => {
      window.removeEventListener('transactionConfirmed', handleTransactionConfirmed as EventListener);
      window.removeEventListener('transactionFailed', handleTransactionFailed as EventListener);
      clearInterval(interval);
    };
  }, []);

  const updateTransactions = () => {
    setPendingTransactions(transactionTracker.getAllTransactions());
    if (showAnalytics) {
      setAnalytics(transactionTracker.getAnalytics());
    }
  };

  const handleRetry = async (txId: string) => {
    const success = await transactionTracker.retryTransaction(txId);
    if (success) {
      updateTransactions();
    }
  };

  if (pendingTransactions.length === 0 && !showAnalytics) {
    return null;
  }

  const pendingCount = pendingTransactions.filter(tx => tx.status === 'pending').length;
  const failedCount = pendingTransactions.filter(tx => tx.status === 'failed').length;

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        {pendingCount > 0 && (
          <div className="flex items-center text-yellow-400">
            <ClockIcon className="w-4 h-4 mr-1" />
            <span>{pendingCount} pending</span>
          </div>
        )}
        {failedCount > 0 && (
          <div className="flex items-center text-red-400">
            <XCircleIcon className="w-4 h-4 mr-1" />
            <span>{failedCount} failed</span>
          </div>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-text-tertiary hover:text-text-secondary"
        >
          <ChartBarIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Transaction Monitor</h3>
        <div className="flex items-center space-x-4 text-sm">
          {pendingCount > 0 && (
            <div className="flex items-center text-yellow-400">
              <ClockIcon className="w-4 h-4 mr-1" />
              <span>{pendingCount} pending</span>
            </div>
          )}
          {failedCount > 0 && (
            <div className="flex items-center text-red-400">
              <XCircleIcon className="w-4 h-4 mr-1" />
              <span>{failedCount} failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-bg-primary rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">{analytics.totalTransactions}</div>
            <div className="text-xs text-text-secondary">Total TXs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{analytics.successfulTransactions}</div>
            <div className="text-xs text-text-secondary">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{analytics.failedTransactions}</div>
            <div className="text-xs text-text-secondary">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{analytics.successRate.toFixed(1)}%</div>
            <div className="text-xs text-text-secondary">Success Rate</div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-text-secondary">Recent Transactions</h4>
        {pendingTransactions.slice(0, 5).map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-2 bg-bg-primary rounded border">
            <div className="flex items-center space-x-3">
              {tx.status === 'confirmed' && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
              {tx.status === 'failed' && <XCircleIcon className="w-4 h-4 text-red-400" />}
              {tx.status === 'pending' && <ClockIcon className="w-4 h-4 text-yellow-400 animate-pulse" />}

              <div>
                <div className="text-sm font-medium text-text-primary">
                  {tx.type.replace('_', ' ').toUpperCase()}
                </div>
                <div className="text-xs text-text-tertiary">
                  {tx.txid.slice(0, 8)}...{tx.txid.slice(-8)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {tx.confirmations > 0 && (
                <span className="text-xs text-green-400">
                  {tx.confirmations} conf
                </span>
              )}
              {tx.status === 'failed' && (
                <button
                  onClick={() => handleRetry(tx.id)}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded"
                >
                  Retry
                </button>
              )}
              <a
                href={`https://dogechain.info/tx/${tx.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View
              </a>
            </div>
          </div>
        ))}

        {pendingTransactions.length === 0 && (
          <div className="text-center py-4 text-text-secondary">
            <p>No recent transactions</p>
          </div>
        )}
      </div>
    </div>
  );
};

