// <EXAMPLE> TEST DATA FOR ANALYTICS DASHBOARD </EXAMPLE>
// Run this in browser console to seed test data: import('./utils/analyticsTestData.js').then(m => m.seedTestData())

export const testDropHistory = [
  {
    id: '1',
    tokens: 5000,
    wallets: 50,
    fees: 1.75,
    networkFees: 1.25,
    serviceFees: 0.5,
    confTime: '2min 30s',
    date: '2024-11-20'
  },
  {
    id: '2',
    tokens: 2500,
    wallets: 25,
    fees: 0.9375,
    networkFees: 0.625,
    serviceFees: 0.3125,
    confTime: '1min 45s',
    date: '2024-11-21'
  },
  {
    id: '3',
    tokens: 10000,
    wallets: 100,
    fees: 3.25,
    networkFees: 2.5,
    serviceFees: 0.75,
    confTime: '3min 15s',
    date: '2024-11-22'
  },
  {
    id: '4',
    tokens: 7500,
    wallets: 75,
    fees: 2.4375,
    networkFees: 1.875,
    serviceFees: 0.5625,
    confTime: '2min 45s',
    date: '2024-11-23'
  },
  {
    id: '5',
    tokens: 3000,
    wallets: 30,
    fees: 1.125,
    networkFees: 0.75,
    serviceFees: 0.375,
    confTime: '2min 10s',
    date: '2024-11-24'
  },
  {
    id: '6',
    tokens: 15000,
    wallets: 150,
    fees: 4.875,
    networkFees: 3.75,
    serviceFees: 1.125,
    confTime: '4min 30s',
    date: '2024-11-25'
  },
  {
    id: '7',
    tokens: 6000,
    wallets: 60,
    fees: 2.0,
    networkFees: 1.5,
    serviceFees: 0.5,
    confTime: '2min 55s',
    date: '2024-11-26'
  }
];

export const seedTestData = () => {
  try {
    localStorage.setItem('borkDropsHistory', JSON.stringify(testDropHistory));
    console.log('✅ Test analytics data seeded!');
    console.log('📊 Sample data includes 7 drops with varying sizes and performance');
    console.log('🔄 Refresh the analytics page to see the charts');
    return true;
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    return false;
  }
};

export const clearTestData = () => {
  try {
    localStorage.removeItem('borkDropsHistory');
    console.log('🧹 Test analytics data cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    return false;
  }
};

// Auto-export for console testing
if (typeof window !== 'undefined') {
  (window as any).seedAnalyticsData = seedTestData;
  (window as any).clearAnalyticsData = clearTestData;
}
