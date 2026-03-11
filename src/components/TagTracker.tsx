// TagTracker.tsx
// UI component for viewing and searching discovered Dogetags

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  UserIcon,
  HashtagIcon,
  ArrowPathIcon,
  ChartBarIcon,
  EyeIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { dogetagSentinel, DiscoveredDogetag, SentinelStats } from '../utils/dogetagSentinel';
import { useToast } from '../contexts/ToastContext';

export const TagTracker: React.FC = () => {
  const [tags, setTags] = useState<DiscoveredDogetag[]>([]);
  const [filteredTags, setFilteredTags] = useState<DiscoveredDogetag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<SentinelStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'recent' | 'search'>('recent');
  const toast = useToast();

  // Initialize sentinel and load data
  useEffect(() => {
    loadTags();
    updateStats();
    checkScanningStatus();

    // Listen for new tag discoveries
    const handleNewTag = (event: CustomEvent<DiscoveredDogetag>) => {
      console.log('New Dogetag discovered:', event.detail);
      loadTags();
      updateStats();

      // Show toast for new discovery
      toast.success(`New Dogetag discovered: "${event.detail.message.slice(0, 30)}${event.detail.message.length > 30 ? '...' : ''}"`);
    };

    window.addEventListener('dogetagDiscovered', handleNewTag as EventListener);

    return () => {
      window.removeEventListener('dogetagDiscovered', handleNewTag as EventListener);
    };
  }, []);

  // Update search results when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setViewMode('search');
      const results = dogetagSentinel.searchTags(searchQuery);
      setFilteredTags(results);
    } else {
      setViewMode('recent');
      setFilteredTags(tags.slice(0, 20));
    }
  }, [searchQuery, tags]);

  const loadTags = () => {
    const allTags = dogetagSentinel.getDiscoveredTags();
    setTags(allTags);
    if (!searchQuery.trim()) {
      setFilteredTags(allTags.slice(0, 20));
    }
  };

  const updateStats = () => {
    setStats(dogetagSentinel.getStats());
  };

  const checkScanningStatus = () => {
    setIsScanning(dogetagSentinel.isActive());
  };

  const handleStartScanning = async () => {
    setIsLoading(true);
    try {
      await dogetagSentinel.startScanning();
      setIsScanning(true);
      toast.success('Dogetag Sentinel activated - monitoring blockchain for new tags');
    } catch (error) {
      toast.error('Failed to start Dogetag Sentinel');
      console.error('Sentinel start error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopScanning = () => {
    dogetagSentinel.stopScanning();
    setIsScanning(false);
    toast.info('Dogetag Sentinel stopped');
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const truncateMessage = (message: string, maxLength = 100) => {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength) + '...';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <HashtagIcon className="w-8 h-8 text-primary-500 mr-3" />
          <h1 className="text-3xl font-bold text-text-primary">Tag Tracker</h1>
        </div>
        <p className="text-text-secondary">
          Discover and explore Dogetags inscribed on the Dogecoin blockchain
        </p>
      </div>

      {/* Sentinel Controls & Stats */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Dogetag Sentinel</h3>
          <div className="flex items-center gap-3">
            {!isScanning ? (
              <button
                onClick={handleStartScanning}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {isLoading ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
                {isLoading ? 'Starting...' : 'Start Monitoring'}
              </button>
            ) : (
              <button
                onClick={handleStopScanning}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Stop Monitoring
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.tagsDiscovered}</div>
              <div className="text-xs text-text-secondary">Tags Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.blocksScanned}</div>
              <div className="text-xs text-text-secondary">Blocks Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.lastScannedBlock.toLocaleString()}</div>
              <div className="text-xs text-text-secondary">Last Block</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.averageTagsPerBlock.toFixed(2)}</div>
              <div className="text-xs text-text-secondary">Avg Tags/Block</div>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-text-secondary">
          {isScanning ? (
            <span className="flex items-center text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Actively monitoring blockchain for new Dogetags
            </span>
          ) : (
            <span className="flex items-center text-gray-400">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
              Sentinel inactive - click "Start Monitoring" to discover new tags
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags by content, address, or transaction ID..."
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="text-sm text-text-secondary">
            {viewMode === 'search' ? `${filteredTags.length} results` : 'Recent tags'}
          </div>
        </div>
      </div>

      {/* Tags List */}
      <div className="space-y-3">
        {filteredTags.length === 0 ? (
          <div className="text-center py-12">
            <HashtagIcon className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-secondary mb-2">
              {searchQuery ? 'No tags found' : 'No tags discovered yet'}
            </h3>
            <p className="text-text-tertiary">
              {searchQuery
                ? 'Try a different search term'
                : 'Start monitoring to discover Dogetags on the blockchain'
              }
            </p>
          </div>
        ) : (
          filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="bg-bg-secondary rounded-lg p-4 border border-border-primary hover:border-primary-500/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Message */}
                  <div className="text-text-primary mb-2 whitespace-pre-wrap break-words">
                    {truncateMessage(tag.message, 200)}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-4 h-4" />
                      <span className="font-mono text-xs">{truncateAddress(tag.address)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatTime(tag.timestamp)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>{tag.size} bytes</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs">Block #{tag.blockHeight.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <a
                    href={tag.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-text-tertiary hover:text-primary-400 hover:bg-primary-900/20 rounded transition-colors"
                    title="View on DogeChain Explorer"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => navigator.clipboard.writeText(tag.txid)}
                    className="p-2 text-text-tertiary hover:text-primary-400 hover:bg-primary-900/20 rounded transition-colors"
                    title="Copy Transaction ID"
                  >
                    <HashtagIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Transaction ID (expandable) */}
              <details className="mt-3">
                <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
                  Transaction ID
                </summary>
                <div className="mt-2 p-2 bg-bg-primary rounded font-mono text-xs text-text-secondary break-all">
                  {tag.txid}
                </div>
              </details>
            </div>
          ))
        )}
      </div>

      {/* Load More (for recent view) */}
      {viewMode === 'recent' && filteredTags.length >= 20 && tags.length > filteredTags.length && (
        <div className="text-center">
          <button
            onClick={() => setFilteredTags(tags.slice(0, filteredTags.length + 20))}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            Load More Tags
          </button>
        </div>
      )}
    </div>
  );
};

