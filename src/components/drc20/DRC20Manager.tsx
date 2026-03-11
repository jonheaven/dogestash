import React, { useState } from 'react';
import {
  CubeIcon,
  PlusIcon,
  BanknotesIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { TokenCreator } from './TokenCreator';
import { TokenMinter } from './TokenMinter';
import { TokenDashboard } from './TokenDashboard';

interface DRC20ManagerProps {
  availableUtxos: any[];
  userMode: 'collector' | 'builder';
}

export const DRC20Manager: React.FC<DRC20ManagerProps> = ({
  availableUtxos,
  userMode
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'mint' | 'manage'>('create');

  if (userMode !== 'builder') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <CubeIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">DRC-20 Tools</h2>
          <p className="text-text-secondary">
            Token creation and management tools are available for builders only.
            Switch to builder mode to access DRC-20 features.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      key: 'create',
      label: 'Create Token',
      icon: PlusIcon,
      description: 'Deploy new DRC-20 tokens'
    },
    {
      key: 'mint',
      label: 'Mint Tokens',
      icon: BanknotesIcon,
      description: 'Mint additional supply'
    },
    {
      key: 'manage',
      label: 'Token Dashboard',
      icon: ChartBarIcon,
      description: 'Monitor and manage your tokens'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
            <BanknotesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">DRC-20 Manager</h1>
            <p className="text-text-secondary mt-1">
              Create, mint, and manage Dogecoin tokens via inscriptions
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
              <span className="text-xs font-bold text-orange-400">i</span>
            </div>
            <div>
              <h4 className="font-medium text-orange-400 mb-1">DRC-20 Token Standard</h4>
              <p className="text-sm text-text-primary">
                DRC-20 tokens are created via Dogecoin inscriptions, similar to Ordinals.
                Each token requires an inscription UTXO and follows the DRC-20 protocol for
                decentralized token creation and management.
              </p>
              <div className="mt-2 text-xs text-text-secondary">
                • Create tokens with custom supply and decimals<br/>
                • Mint additional tokens to increase supply<br/>
                • Transfer tokens via inscriptions<br/>
                • View analytics and holder data
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-bg-secondary p-1 border border-border-primary">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 rounded-md py-3 px-4 text-sm font-medium leading-5 transition-colors duration-200 flex items-center justify-center space-x-2 ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-bg-primary shadow'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <div className="text-center">
                <div>{tab.label}</div>
                <div className="text-xs opacity-75">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
        {activeTab === 'create' && (
          <TokenCreator
            availableUtxos={availableUtxos}
            onTokenCreated={(token, inscriptionId) => {
              console.log('Token created:', token, inscriptionId);
              // Could auto-switch to manage tab or show success
            }}
          />
        )}

        {activeTab === 'mint' && (
          <TokenMinter availableUtxos={availableUtxos} />
        )}

        {activeTab === 'manage' && (
          <TokenDashboard />
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-text-secondary">
        <p>
          DRC-20 tokens are experimental and use Dogecoin inscriptions.
          Always backup your inscription IDs and private keys.
        </p>
      </div>
    </div>
  );
};
