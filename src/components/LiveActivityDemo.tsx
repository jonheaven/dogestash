import React from 'react';
import { useLiveActivity } from '../contexts/LiveActivityContext';

export const LiveActivityDemo: React.FC = () => {
  const { network, marketplace, mint, transfer } = useLiveActivity();

  const showDemoActivity = (type: 'network' | 'marketplace' | 'mint' | 'transfer') => {
    const messages = {
      network: [
        "🏷️ New DNS domain registered: crypto.doge",
        "🗺️ Dogemap block 550000 registered",
        "🟢 New DRC-20 token deployed",
        "🐕 Network activity detected"
      ],
      marketplace: [
        "🛒 Wizard Dog #86 sold for 252 DOGE!",
        "🛒 Rare Doginal sold for 150 DOGE",
        "🛒 Doginal collection traded",
        "🛒 Marketplace activity detected"
      ],
      mint: [
        "🪙 New Doginal minted",
        "🪙 Rare trait inscription created",
        "🪙 New artwork inscribed",
        "🪙 Collection item minted"
      ],
      transfer: [
        "📦 Doginal transferred between wallets",
        "📦 DNS domain ownership changed",
        "📦 Dogemap transferred",
        "📦 Inscription moved"
      ]
    };

    const randomMessage = messages[type][Math.floor(Math.random() * messages[type].length)];

    switch (type) {
      case 'network':
        network(randomMessage);
        break;
      case 'marketplace':
        marketplace(randomMessage);
        break;
      case 'mint':
        mint(randomMessage);
        break;
      case 'transfer':
        transfer(randomMessage);
        break;
    }
  };

  return (
    <div className="p-4 bg-bg-secondary rounded-lg">
      <h3 className="text-lg font-semibold text-text-primary mb-3">Live Activity Demo</h3>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => showDemoActivity('network')}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
        >
          Network Activity
        </button>
        <button
          onClick={() => showDemoActivity('marketplace')}
          className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
        >
          Marketplace Sale
        </button>
        <button
          onClick={() => showDemoActivity('mint')}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
        >
          Mint Event
        </button>
        <button
          onClick={() => showDemoActivity('transfer')}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Transfer Event
        </button>
      </div>
      <p className="text-xs text-text-secondary mt-2">
        Click buttons to test live activity toasts (appear from bottom-left)
      </p>
    </div>
  );
};
