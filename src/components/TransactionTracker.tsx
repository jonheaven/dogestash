import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon, ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';
import { TxPoller, TxStatus, createTxPoller } from '../utils/txPoller';

interface TransactionTrackerProps {
  txIds: string[];
  onClose?: () => void;
}

export const TransactionTracker: React.FC<TransactionTrackerProps> = ({ txIds, onClose }) => {
  const [poller, setPoller] = useState<TxPoller | null>(null);
  const [statuses, setStatuses] = useState<TxStatus[]>([]);
  const [progress, setProgress] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (txIds.length === 0) return;

    // Create poller with callbacks
    const txPoller = createTxPoller(txIds, {
      onUpdate: (updatedStatuses) => {
        setStatuses(updatedStatuses);
      },
      onProgress: (progressPercent) => {
        setProgress(progressPercent);
      },
      onComplete: (finalStatuses) => {
        setIsPolling(false);
        console.log('🐕 All transactions confirmed!', finalStatuses);
      }
    });

    setPoller(txPoller);
    setIsPolling(true);
    txPoller.startPolling();

    // Cleanup on unmount
    return () => {
      txPoller.destroy();
    };
  }, [txIds]);

  const handleManualRefresh = async () => {
    if (poller) {
      await poller.forceUpdate();
    }
  };

  const getStatusIcon = (status: TxStatus['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'confirming':
        return <ClockIcon className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TxStatus['status']) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-900/20';
      case 'confirming':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'error':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getOverallStatus = () => {
    const confirmed = statuses.filter(s => s.status === 'confirmed').length;
    const total = statuses.length;

    if (confirmed === total) return 'All Confirmed! 🎉';
    if (confirmed > 0) return `${confirmed}/${total} Confirmed`;
    return 'Waiting for confirmations...';
  };

  if (txIds.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">No transactions to track</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-primary overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
              <span className="text-lg">🔍</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Blast Tracker</h3>
              <p className="text-sm text-text-secondary">Live confirmation hunting on Dogecoin</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleManualRefresh}
              disabled={!poller}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-bg-primary hover:bg-bg-secondary border border-border-primary rounded-md transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-bg-primary rounded-md transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">{getOverallStatus()}</span>
            <span className="text-sm text-text-secondary">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-bg-primary rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-doge-yellow h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="divide-y divide-border-primary">
          {statuses.map((status) => (
            <div key={status.txId} className="p-4 hover:bg-bg-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-primary-400">
                        {status.txId.slice(0, 8)}...{status.txId.slice(-6)}
                      </code>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status.status)}`}>
                        {status.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {status.confirmations}/6 confirmations • {status.lastUpdated.toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <a
                  href={status.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-md transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>View</span>
                </a>
              </div>

              {/* Error display */}
              {status.error && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs text-red-400">
                  Error: {status.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-bg-primary border-t border-border-primary">
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span>Updates every 10 seconds • 6 confirmations required</span>
          {isPolling ? (
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live tracking active</span>
            </span>
          ) : (
            <span className="text-green-400">✅ Tracking complete</span>
          )}
        </div>
      </div>
    </div>
  );
};
