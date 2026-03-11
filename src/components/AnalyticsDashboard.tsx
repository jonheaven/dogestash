import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { DocumentTextIcon, ArrowDownTrayIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Coins, Users, DollarSign, TrendingUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DropHistory {
  id: string;
  tokens: number;
  wallets: number;
  fees: number;
  confTime: string;
  date: string;
  networkFees: number;
  serviceFees: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [dropHistory, setDropHistory] = useState<DropHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDropHistory();
  }, []);

  const loadDropHistory = () => {
    try {
      const stored = localStorage.getItem('borkDropsHistory');
      if (stored) {
        const history = JSON.parse(stored) as DropHistory[];
        setDropHistory(history);
      }
    } catch (error) {
      console.error('Failed to load drop history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = () => {
    if (dropHistory.length === 0) return null;

    const totalDrops = dropHistory.length;
    const totalTokens = dropHistory.reduce((sum, drop) => sum + drop.tokens, 0);
    const totalWallets = dropHistory.reduce((sum, drop) => sum + drop.wallets, 0);
    const totalFees = dropHistory.reduce((sum, drop) => sum + drop.fees, 0);
    const avgFees = totalFees / totalDrops;
    const avgTokensPerDrop = totalTokens / totalDrops;
    const avgWalletsPerDrop = totalWallets / totalDrops;

    // Calculate fee savings (assuming live fees save ~25% vs static)
    const estimatedStaticFees = dropHistory.reduce((sum, drop) => sum + (drop.wallets * 0.05 + drop.wallets * 0.025), 0);
    const feeSavings = estimatedStaticFees > 0 ? ((estimatedStaticFees - totalFees) / estimatedStaticFees) * 100 : 0;

    return {
      totalDrops,
      totalTokens,
      totalWallets,
      totalFees,
      avgFees,
      avgTokensPerDrop,
      avgWalletsPerDrop,
      feeSavings: Math.max(0, feeSavings)
    };
  };

  const exportToCSV = () => {
    if (dropHistory.length === 0) return;

    const headers = ['Date', 'Wallets', 'Tokens', 'Total Fees', 'Network Fees', 'Service Fees', 'Conf Time'];
    const csvContent = [
      headers.join(','),
      ...dropHistory.map(drop => [
        drop.date,
        drop.wallets,
        drop.tokens,
        drop.fees.toFixed(4),
        drop.networkFees.toFixed(4),
        drop.serviceFees.toFixed(4),
        drop.confTime
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bork-drops-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const prepareChartData = () => {
    // Sample last 20 drops for performance
    const chartData = dropHistory.length > 20 ? dropHistory.slice(-20) : dropHistory;

    const labels = chartData.map(drop => {
      const date = new Date(drop.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const tokenData = chartData.map(drop => drop.tokens);
    const feeData = chartData.map(drop => drop.fees);

    return { labels, tokenData, feeData };
  };

  const metrics = calculateMetrics();
  const { labels, tokenData, feeData } = prepareChartData();

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Tokens Distributed',
        data: tokenData,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'DOGE Fees',
        data: feeData,
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Drop Performance Over Time',
      },
      legend: {
        display: true,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Tokens',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'DOGE Fees',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const feeBreakdownData = {
    labels: ['Network Fees', 'Service Fees'],
    datasets: [{
      data: dropHistory.length > 0 ? [
        dropHistory.reduce((sum, drop) => sum + drop.networkFees, 0),
        dropHistory.reduce((sum, drop) => sum + drop.serviceFees, 0)
      ] : [0, 0],
      backgroundColor: ['#FF6B6B', '#4ECDC4'],
      borderWidth: 2,
    }]
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ChartBarIcon className="w-12 h-12 text-text-tertiary mx-auto mb-4 animate-pulse" />
          <p className="text-text-secondary">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-text-primary mb-2">No Data Yet</h3>
        <p className="text-text-secondary mb-6">
          Launch your first DogeDrop to start seeing analytics and insights.
        </p>
        <a
          href="/dogedrops"
          className="inline-flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg font-medium transition-colors"
        >
          Launch Your First Drop
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics Dashboard</h1>
        <p className="text-text-secondary">
          Track your DogeDrop performance and optimize your launch strategy.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-8 h-8 text-primary-500" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{metrics.totalDrops}</p>
              <p className="text-sm text-text-secondary">Total Drops</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <div className="flex items-center space-x-2">
            <Coins className="w-6 h-6" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{metrics.totalTokens.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Tokens Distributed</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{metrics.totalWallets}</p>
              <p className="text-sm text-text-secondary">Wallets Reached</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-6 h-6" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{metrics.avgFees.toFixed(3)}</p>
              <p className="text-sm text-text-secondary">Avg Cost (DOGE)</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6" />
            <div>
              <p className="text-2xl font-bold text-green-400">{metrics.feeSavings.toFixed(0)}%</p>
              <p className="text-sm text-text-secondary">Fee Savings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Performance Trends</h3>
          <div className="h-80">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Fee Breakdown</h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut
              data={feeBreakdownData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-bg-secondary rounded-lg border border-border-primary overflow-hidden mb-8">
        <div className="p-6 border-b border-border-primary">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              Drop History
              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                &lt;EXAMPLE&gt;
              </span>
            </h3>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Wallets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Network Fees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Service Fees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Conf Time</th>
              </tr>
            </thead>
            <tbody className="bg-bg-secondary divide-y divide-border-primary">
              {dropHistory.slice().reverse().map((drop) => (
                <tr key={drop.id} className="hover:bg-bg-primary transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {new Date(drop.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {drop.wallets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {drop.tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {drop.networkFees.toFixed(4)} DOGE
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {drop.serviceFees.toFixed(4)} DOGE
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                    {drop.fees.toFixed(4)} DOGE
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {drop.confTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-primary-500/10 to-doge-yellow/10 rounded-lg p-6 border border-primary-500/20">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          🚀 Pro Tips for Success
          <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
            &lt;EXAMPLE&gt;
          </span>
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-text-primary mb-2">💡 Optimize Timing</h4>
            <p className="text-sm text-text-secondary">
              Your drops during low congestion periods save an average of {metrics.feeSavings.toFixed(0)}% on fees.
              Check live fees before launching!
            </p>
          </div>
          <div>
            <h4 className="font-medium text-text-primary mb-2">📊 Scale Smart</h4>
            <p className="text-sm text-text-secondary">
              Your average drop reaches {metrics.avgWalletsPerDrop.toFixed(0)} wallets with
              {metrics.avgTokensPerDrop.toLocaleString()} tokens each. Batch efficiently!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
