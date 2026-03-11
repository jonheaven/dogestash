import React, { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, DollarSign, Clock, Server } from 'lucide-react';

interface BubbleData {
  id: string;
  type: string;
  label: string;
  value: number;
  activity: number;
  x: number;
  y: number;
  radius: number;
  details?: {
    txid: string;
    fromAddress?: string;
    toAddress?: string;
    fee: number;
    size: number;
    inputs: number;
    outputs: number;
  };
}

interface AnalyticsData {
  totalEvents: number;
  totalValue: number;
  trends?: {
    eventChange: number;
  };
}

interface StatsData {
  dogePrice?: number;
  provider?: {
    name: string;
    description: string;
    type: string;
  };
  currentBlockHeight?: number;
}

export const DoginalsActivityDashboard: React.FC = () => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);

      const [bubblesRes, analyticsRes, statsRes] = await Promise.all([
        fetch('/api/bubbles'),
        fetch('/api/analytics'),
        fetch('/api/stats')
      ]);

      if (bubblesRes.ok) {
        const bubblesData = await bubblesRes.json();
        setBubbles(bubblesData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initialize dashboard
  useEffect(() => {
    fetchDashboardData();

    // Update every 10 seconds
    intervalRef.current = setInterval(fetchDashboardData, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate USD values
  const getTotalValueUSD = () => {
    if (!analytics || !stats?.dogePrice) return null;
    return (analytics.totalValue * stats.dogePrice).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get bubble color based on type
  const getBubbleColor = (type: string) => {
    switch (type) {
      case 'transfer': return 'linear-gradient(45deg, #FF6B6B, #FF8E8E)';
      case 'marketplace_sale': return 'linear-gradient(45deg, #4ECDC4, #7DD3C0)';
      case 'drc20_operation': return 'linear-gradient(45deg, #45B7D1, #6DCFF6)';
      case 'mint': return 'linear-gradient(45deg, #9B59B6, #B573D6)';
      case 'large_transfer': return 'linear-gradient(45deg, #F39C12, #F4D03F)';
      case 'small_transfer': return 'linear-gradient(45deg, #BDC3C7, #D5DBDB)';
      case 'regular_transfer': return 'linear-gradient(45deg, #95A5A6, #BDC3C7)';
      default: return 'linear-gradient(45deg, #98D8C8, #B8E6D9)';
    }
  };

  // Get type emoji
  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'transfer': return '🐕';
      case 'marketplace_sale': return '🏪';
      case 'drc20_operation': return '🪙';
      case 'mint': return '🎨';
      case 'large_transfer': return '🚨';
      case 'small_transfer': return '💸';
      default: return '💰';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-pulse" />
          <p className="text-text-secondary">Loading Doginals activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
          🐕 Doginals Activity Monitor
          {isRefreshing && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>}
        </h1>
        <p className="text-text-secondary">
          Real-time visualization of Dogecoin Ordinals ecosystem activity and transactions.
        </p>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-lg font-bold text-text-primary">{analytics?.totalEvents || 0}</p>
              <p className="text-xs text-text-secondary">Total Events</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-lg font-bold text-text-primary">{analytics?.totalValue?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-text-secondary">Total Value (DOGE)</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-lg font-bold text-text-primary">${getTotalValueUSD() || 'Loading...'}</p>
              <p className="text-xs text-text-secondary">Total Value (USD)</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-lg font-bold text-text-primary">Active</p>
              <p className="text-xs text-text-secondary">Status</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.provider?.name || 'Unknown'}</p>
              <p className="text-xs text-text-secondary">{stats?.provider?.description || ''}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.currentBlockHeight?.toLocaleString() || 'Loading...'}</p>
              <p className="text-xs text-text-secondary">Current Block</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bubble Visualization */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Live Activity Visualization</h3>
          <div className="text-xs text-text-secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative h-96 bg-gradient-to-br from-primary-900/20 to-bg-primary rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
          }}
        >
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              className="absolute rounded-full flex items-center justify-center text-white font-bold cursor-pointer transition-all duration-300 hover:scale-110 shadow-lg border-2 border-white/30"
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                width: `${bubble.radius * 2}px`,
                height: `${bubble.radius * 2}px`,
                background: getBubbleColor(bubble.type),
                fontSize: `${Math.max(8, Math.min(14, bubble.radius / 2))}px`,
                opacity: 0.7 + (bubble.activity * 0.3),
                transform: 'translate(-50%, -50%)'
              }}
              title={`${getTypeEmoji(bubble.type)} ${bubble.label} - ${bubble.value} DOGE`}
            >
              <div className="text-center leading-tight px-1">
                {bubble.label}
              </div>
            </div>
          ))}

          {bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity to display</p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(45deg, #FF6B6B, #FF8E8E)' }}></div>
            <span className="text-text-secondary">Transfers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(45deg, #4ECDC4, #7DD3C0)' }}></div>
            <span className="text-text-secondary">Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(45deg, #45B7D1, #6DCFF6)' }}></div>
            <span className="text-text-secondary">DRC-20 Tokens</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(45deg, #9B59B6, #B573D6)' }}></div>
            <span className="text-text-secondary">Mints</span>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-primary-500/10 to-blue-500/10 rounded-lg p-6 border border-primary-500/20">
        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          📊 About This Dashboard
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-text-primary mb-2">🔴 Live Bubbles</h4>
            <p className="text-text-secondary">
              Each bubble represents a recent Doginals transaction. Size indicates value,
              color shows transaction type, and position is randomized for visualization.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-text-primary mb-2">📈 Real-time Data</h4>
            <p className="text-text-secondary">
              Data updates every 10 seconds from the Doginals monitoring sentinel.
              View detailed transaction information by hovering over bubbles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
