// <EXAMPLE> SAMPLE DATA GENERATION UTILITIES </EXAMPLE>

// Generate a fake Dogecoin address (starts with 'D', valid base58 format)
export function generateDogecoinAddress(): string {
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = 'D'; // Dogecoin addresses start with 'D'

  // Generate 33 random base58 characters (standard Dogecoin address length is 34 chars including 'D')
  for (let i = 0; i < 33; i++) {
    address += base58Chars[Math.floor(Math.random() * base58Chars.length)];
  }

  return address;
}

// Generate sample CSV content
export function generateSampleCSV(type: 'tokens' | 'collectibles'): string {
  const addresses = Array.from({ length: 15 }, () => generateDogecoinAddress());

  if (type === 'tokens') {
    let csv = 'address,amount\n';
    addresses.forEach((address, index) => {
      const amount = Math.floor(Math.random() * 1000) + 1; // Random amount 1-1000
      csv += `${address},${amount}\n`;
    });
    return csv;
  } else {
    let csv = 'address,inscription_id\n';
    addresses.forEach((address, index) => {
      const inscriptionId = `insc_doge_${String(index + 1).padStart(3, '0')}`;
      csv += `${address},${inscriptionId}\n`;
    });
    return csv;
  }
}

// Generate sample JSON content
export function generateSampleJSON(type: 'tokens' | 'collectibles'): string {
  const addresses = Array.from({ length: 15 }, () => generateDogecoinAddress());

  if (type === 'tokens') {
    const recipients = addresses.map((address, index) => ({
      address,
      amount: (Math.floor(Math.random() * 1000) + 1).toString()
    }));

    return JSON.stringify(recipients, null, 2);
  } else {
    const recipients = addresses.map((address, index) => ({
      address,
      inscription_id: `insc_doge_${String(index + 1).padStart(3, '0')}`
    }));

    return JSON.stringify(recipients, null, 2);
  }
}

// Mock API responses for balances (would normally come from blockchain)
export const mockBalances = {
  tokens: [
    {
      id: 'JA',
      name: 'JAWN',
      balance: '77777777.00000000',
      color: '#ff6b6b'
    },
    {
      id: 'FO',
      name: 'FORG',
      balance: '5000000000000000000',
      color: '#4ecdc4'
    },
    {
      id: 'CR',
      name: 'CRGE',
      balance: '350000000000000000',
      color: '#45b7d1'
    }
  ],
  collectibles: [
    {
      id: 'insc_doge_001',
      name: 'DogePunk #420',
      image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZmJmYmY0Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZjU5ZTBiIiBmb250LXNpemU9IjI0IiBmb250LWZhbWlseT0iQXJpYWwiPkRPR0U8L3RleHQ+Cjwvc3ZnPg==',
      metadata: 'Ultra Rare Doge Punk'
    },
    {
      id: 'insc_doge_002',
      name: 'Cyber Doge #1337',
      image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNGVjZGM0Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZmZmZmZmIiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0iQXJpYWwiPkNZQkVSIEQ8L3RleHQ+Cjwvc3ZnPg==',
      metadata: 'Neon Cyber Doge'
    },
    {
      id: 'insc_doge_003',
      name: 'Moon Doge #888',
      image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNDU3ZDdiIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iNDAiIGZpbGw9IiNmZmJmNGIiLz4KPHRleHQgeD0iMTAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmJmNGIiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCI+TU9PTiBET0dFPC90ZXh0Pgo8L3N2Zz4=',
      metadata: 'Lunar Doge Warrior'
    }
  ]
};

// Mock transaction history
export const mockTransactionHistory = [
  {
    id: 'tx_001',
    type: 'tokens',
    asset: 'JA (JAWN)',
    recipients: 25,
    totalAmount: '2500 JA',
    fees: '1.875 DOGE',
    status: 'completed',
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    txHashes: ['abc123def456', 'def789ghi012']
  },
  {
    id: 'tx_002',
    type: 'collectibles',
    asset: '3 Collectibles',
    recipients: 3,
    totalAmount: '3 NFTs',
    fees: '0.225 DOGE',
    status: 'completed',
    timestamp: new Date(Date.now() - 172800000), // 2 days ago
    txHashes: ['xyz789abc123']
  }
];
