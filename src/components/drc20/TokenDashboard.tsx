import React, { useState } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CubeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export const TokenDashboard: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<string>('DCCT');

  // Mock data - in production this would come from APIs
  const tokenStats = {
    DCCT: {
      name: 'Dogecoin Community Token',
      ticker: 'DCCT',
      totalSupply: 1000000,
      circulatingSupply: 650000,
      holders: 1250,
      marketCap: 32500, // DOGE value
      volume24h: 5200,
      price: 0.05, // DOGE per token
      change24h: 12.5,
      created: '2025-01-15',
      inscriptionId: 'i1234567890abcdef',
      description: 'Community token for Dogecoin ecosystem projects'
    },
    SHIB: {
      name: 'Shiba Inu Token',
      ticker: 'SHIB',
      totalSupply: 10000000,
      circulatingSupply: 3200000,
      holders: 890,
      marketCap: 96000,
      volume24h: 18500,
      price: 0.03,
      change24h: -5.2,
      created: '2025-01-10',
      inscriptionId: 'i0987654321fedcba',
      description: 'Meme token inspired by the Shiba Inu dog breed'
    }
  };

  const selectedStats = tokenStats[selectedToken as keyof typeof tokenStats];

  if (!selectedStats) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No token data available</p>
      </div>
    );
  }

  const formatDoge = (amount: number) => amount.toFixed(4);

  return (
    <div className="space-y-6">
      {/* Token Selector */}
      <div className="flex gap-2">
        {Object.values(tokenStats).map((token) => (
          <button
            key={token.ticker}
            onClick={() => setSelectedToken(token.ticker)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              selectedToken === token.ticker
                ? 'bg-primary-500 text-bg-primary border-primary-500'
                : 'bg-bg-secondary text-text-secondary border-border-primary hover:bg-bg-primary'
            }`}
          >
            ${token.ticker}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <BanknotesIcon className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-text-secondary">Circulating Supply</p>
              <p className="text-lg font-semibold text-text-primary">
                {(selectedStats.circulatingSupply / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <UsersIcon className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-text-secondary">Holders</p>
              <p className="text-lg font-semibold text-text-primary">
                {selectedStats.holders.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-sm text-text-secondary">Market Cap</p>
              <p className="text-lg font-semibold text-text-primary">
                {formatDoge(selectedStats.marketCap)} DOGE
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <ArrowTrendingUpIcon className={`w-5 h-5 ${selectedStats.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            <div>
              <p className="text-sm text-text-secondary">24h Change</p>
              <p className={`text-lg font-semibold ${selectedStats.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {selectedStats.change24h >= 0 ? '+' : ''}{selectedStats.change24h.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Token Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Name:</span>
              <span className="text-text-primary font-medium">{selectedStats.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Ticker:</span>
              <span className="text-text-primary font-medium">${selectedStats.ticker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Supply:</span>
              <span className="text-text-primary">{selectedStats.totalSupply.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Created:</span>
              <span className="text-text-primary">{new Date(selectedStats.created).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Inscription ID:</span>
              <span className="text-text-primary font-mono text-sm">{selectedStats.inscriptionId}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border-primary">
            <p className="text-sm text-text-secondary">{selectedStats.description}</p>
          </div>
        </div>

        {/* Price & Volume */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Market Data</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Current Price:</span>
              <div className="text-right">
                <div className="text-lg font-semibold text-text-primary">
                  {formatDoge(selectedStats.price)} DOGE
                </div>
                <div className="text-sm text-text-secondary">
                  ≈ ${(selectedStats.price * 0.05).toFixed(4)} USD
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-text-secondary">24h Volume:</span>
              <span className="text-text-primary font-medium">
                {formatDoge(selectedStats.volume24h)} DOGE
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Market Cap:</span>
              <span className="text-text-primary font-medium">
                {formatDoge(selectedStats.marketCap)} DOGE
              </span>
            </div>

            <div className="pt-4 border-t border-border-primary">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Quick Actions:</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded text-sm transition-colors">
                    Add Liquidity
                  </button>
                  <button className="px-3 py-1 bg-bg-primary hover:bg-bg-secondary border border-border-primary rounded text-sm transition-colors">
                    View Chart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          <button className="p-2 hover:bg-bg-primary rounded-lg transition-colors">
            <ArrowPathIcon className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Mock activity data */}
          <div className="flex items-center justify-between py-3 border-b border-border-primary last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <BanknotesIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="font-medium text-text-primary">500 {selectedStats.ticker} minted</div>
                <div className="text-sm text-text-secondary">To: D9WqZGJAsksJCkH8nJq7ZKxJ8jJ7ZKxJ8</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-400">Confirmed</div>
              <div className="text-xs text-text-secondary">2 hours ago</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border-primary last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <ArrowPathIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-text-primary">1,000 {selectedStats.ticker} transferred</div>
                <div className="text-sm text-text-secondary">From: D8WqZGJAsksJCkH8nJq7ZKxJ8jJ7ZKxJ8</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-yellow-400">6 confirmations</div>
              <div className="text-xs text-text-secondary">4 hours ago</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border-primary last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-text-primary">Token deployment</div>
                <div className="text-sm text-text-secondary">DRC-20 protocol inscription</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-400">Confirmed</div>
              <div className="text-xs text-text-secondary">2 days ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Holders Preview */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Top Holders</h3>
        <div className="space-y-3">
          {/* Mock holder data */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-text-primary">
                    D{i + 1}HqZGJAsksJCkH8nJq7ZKxJ8jJ7ZKxJ8
                  </div>
                  <div className="text-sm text-text-secondary">
                    {Math.floor(Math.random() * 50000 + 10000).toLocaleString()} {selectedStats.ticker}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-primary">
                  {((Math.random() * 10) + 1).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border-primary text-center">
          <button className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors text-sm">
            View All Holders
          </button>
        </div>
      </div>
    </div>
  );
};
