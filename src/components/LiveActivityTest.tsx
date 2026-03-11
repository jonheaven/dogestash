import React from 'react';
import { useLiveActivity } from '../contexts/LiveActivityContext';

export const LiveActivityTest: React.FC = () => {
  const { network, marketplace, mint, transfer } = useLiveActivity();

  const testEvents = [
    {
      name: 'Marketplace Sale',
      action: () => marketplace('🛒 Wizard Dog #86 sold for 252 DOGE!', false, {
        type: 'market-sale',
        price: 252,
        buyer: 'DB1cJZNqFcyxeExwqrXyh6rFCnQBYmx5tT',
        seller: 'DHrqn6H6ocgbRB1Szu7Q1sn1tVTfkpinnc',
        txid: '5851e18531064239bd86c2bc5809d66fde712b45cb9254f36df5865ea868b24f'
      })
    },
    {
      name: 'Personal Sale',
      action: () => marketplace('🛒 Your Doginal sold for 150 DOGE!', true, {
        type: 'market-sale',
        price: 150,
        buyer: 'DsomeBuyer',
        seller: 'DyourAddress',
        txid: 'abcd1234'
      })
    },
    {
      name: 'Domain Registration',
      action: () => network('🏷️ New Doge Domain Registered: crypto.doge', false, {
        type: 'doge-domain',
        domain: 'crypto.doge',
        txid: 'domain123'
      })
    },
    {
      name: 'Dogemap Creation',
      action: () => network('🗺️ New Dogemap Created: 550000.dogemap', false, {
        type: 'dogemap',
        dogemap: '550000.dogemap',
        block: 550000,
        txid: 'map123'
      })
    },
    {
      name: 'Inscription Mint',
      action: () => mint('🪙 New inscription minted on Dogecoin!', false, {
        type: 'inscription-mint',
        inscriptionId: 'mint123',
        txid: 'minttx123'
      })
    },
    {
      name: 'Transfer',
      action: () => transfer('📦 Inscription transferred between wallets', false, {
        type: 'inscription-transfer',
        inscriptionId: 'transfer123',
        from: 'Dsender',
        to: 'Dreceiver',
        txid: 'transfer123'
      })
    }
  ];

  return (
    <div className="p-4 bg-bg-secondary rounded-lg max-w-md">
      <h3 className="text-lg font-semibold text-text-primary mb-3">Live Activity Test</h3>
      <div className="grid grid-cols-1 gap-2">
        {testEvents.map((event, index) => (
          <button
            key={index}
            onClick={event.action}
            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm transition-colors duration-200"
          >
            {event.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-secondary mt-3">
        Click buttons to test live activity toasts with drawer functionality.
        Personal events will have emerald highlighting.
      </p>
    </div>
  );
};
