import React, { useState, useEffect } from 'react';
import { PlayIcon, CpuChipIcon, BoltIcon, ArrowRightIcon, CheckCircleIcon, CommandLineIcon, SparklesIcon, KeyIcon, CursorArrowRaysIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface OnboardingTeaserProps {
  onConnectWallet: () => void;
}

// Simple View Component - Crypto Bro Style
const SimpleView: React.FC<{ onConnectWallet: () => void; onToggleView: () => void }> = ({ onConnectWallet, onToggleView }) => {
  return (
  <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-primary to-primary-500/5">
    {/* View Toggle */}
    <div className="flex justify-center pt-8 pb-4">
      <div className="bg-bg-secondary border border-border-primary rounded-lg p-1 flex shadow-lg">
        <button
          onClick={() => {}}
          className="px-4 py-2 rounded-md text-sm font-medium bg-primary-500 text-bg-primary shadow-md"
        >
          Simple
        </button>
        <button
          onClick={onToggleView}
          className="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary transition-all"
        >
          Pro
        </button>
      </div>
    </div>

    {/* Hero Section with Visual Appeal */}
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-doge-yellow/10"></div>
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          {/* Logo and Title */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-primary-500/20 rounded-2xl mb-8 shadow-2xl">
            <img
              src="/bork.png"
              alt="Borkstarter"
              className="w-16 h-16 object-contain"
              style={{
                filter: 'invert(1) brightness(0) saturate(100%)',
                mixBlendMode: 'difference'
              }}
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary-500 to-doge-yellow bg-clip-text text-transparent mb-4">
            DOGEDROP
          </h1>
          <p className="text-xl text-text-secondary mb-8">The easiest way to airdrop on Dogecoin</p>

          <button
            onClick={onConnectWallet}
            className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-400 hover:to-primary-300 text-bg-primary text-xl font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-3xl mb-12"
          >
            <SparklesIcon className="w-7 h-7 mr-3" />
            Launch Your Airdrop
            <ArrowRightIcon className="w-7 h-7 ml-3" />
          </button>
        </div>

        {/* Visual Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="group">
            <div className="bg-bg-secondary/80 backdrop-blur-sm border border-border-primary rounded-2xl p-8 hover:border-primary-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary-500/30 transition-colors">
                <KeyIcon className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4 text-center">Connect Your Wallet</h3>
              <p className="text-text-secondary text-center leading-relaxed">
                Link your MyDoge, Dojak, or create a secure local wallet.
                Your tokens, your control.
              </p>
            </div>
          </div>

          <div className="group">
            <div className="bg-bg-secondary/80 backdrop-blur-sm border border-border-primary rounded-2xl p-8 hover:border-primary-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary-500/30 transition-colors">
                <CursorArrowRaysIcon className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4 text-center">Pick Your Assets</h3>
              <p className="text-text-secondary text-center leading-relaxed">
                Choose from your DRC-20 tokens and Doginal NFTs.
                Mix and match for the perfect drop.
              </p>
            </div>
          </div>

          <div className="group">
            <div className="bg-bg-secondary/80 backdrop-blur-sm border border-border-primary rounded-2xl p-8 hover:border-primary-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary-500/30 transition-colors">
                <BoltIcon className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4 text-center">Drop & Done</h3>
              <p className="text-text-secondary text-center leading-relaxed">
                Upload your recipient list, hit launch.
                Your community gets paid instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-bg-secondary/60 backdrop-blur-sm border border-border-primary rounded-3xl p-12 mb-16">
          <h2 className="text-4xl font-bold text-center text-text-primary mb-12">Why DogeDrop?</h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-text-primary mb-2">Test First, Drop Second</h4>
                  <p className="text-text-secondary">Simulate your entire airdrop before spending a single DOGE. Know exactly what happens.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BoltIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-text-primary mb-2">Lightning Fast</h4>
                  <p className="text-text-secondary">Batch up to 500 recipients per transaction. Your drops land faster than you can refresh.</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-text-primary mb-2">CSV Import Magic</h4>
                  <p className="text-text-secondary">Got a spreadsheet of addresses? Drag, drop, done. We handle the complexity.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MagnifyingGlassIcon className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-text-primary mb-2">Track Everything</h4>
                  <p className="text-text-secondary">Real-time status updates, transaction links, success rates. Stay in the loop.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">$0.025</div>
            <div className="text-text-secondary">per recipient</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">500+</div>
            <div className="text-text-secondary">max per drop</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">FREE</div>
            <div className="text-text-secondary">to test</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500 mb-2">DOGE</div>
            <div className="text-text-secondary">native</div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary-500/20 to-doge-yellow/20 border border-primary-500/30 rounded-3xl p-12">
            <h3 className="text-3xl font-bold text-text-primary mb-4">Ready to Drop?</h3>
            <p className="text-xl text-text-secondary mb-8">Join the Dogecoin revolution. Start airdropping like a pro.</p>
            <button
              onClick={onConnectWallet}
              className="inline-flex items-center px-12 py-6 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-400 hover:to-primary-300 text-bg-primary text-2xl font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              <BoltIcon className="w-8 h-8 mr-4" />
              Start Your First Drop
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

// Pro View Component - Terminal Style
const ProView: React.FC<{ onConnectWallet: () => void; onToggleView: () => void }> = ({ onConnectWallet, onToggleView }) => {
  const [currentCommand, setCurrentCommand] = useState(0);

  const commands = [
    { cmd: 'dogedrop --init', desc: 'Initialize your distribution engine' },
    { cmd: 'dogedrop --wallet connect', desc: 'Link MyDoge, Dojak, or local wallet' },
    { cmd: 'dogedrop --tokens select', desc: 'Choose DRC-20 tokens & Doginals' },
    { cmd: 'dogedrop --recipients load', desc: 'Import address list from CSV' },
    { cmd: 'dogedrop --simulate', desc: 'Test distribution (gas-free)' },
    { cmd: 'dogedrop --launch', desc: 'Execute the drop' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCommand((prev) => (prev + 1) % commands.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* View Toggle */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg p-1 flex shadow-lg">
          <button
            onClick={onToggleView}
            className="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary transition-all"
          >
            Simple
          </button>
          <button
            onClick={() => {}}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary-500 text-bg-primary shadow-md"
          >
            Pro
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border-primary bg-bg-secondary/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <CommandLineIcon className="w-6 h-6 text-bg-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-500">DogeDrop Terminal</h1>
                <p className="text-sm text-text-secondary">Distribution Engine v2.0.1</p>
              </div>
            </div>
            <button
              onClick={onConnectWallet}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-400 text-bg-primary font-semibold rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <span>Connect Wallet</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Terminal Interface */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Terminal Simulation */}
          <div className="space-y-6">
            <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden">
              {/* Terminal Header */}
              <div className="bg-bg-primary border-b border-border-primary px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-text-secondary ml-4 font-mono">dogedrop-cli</span>
                </div>
                <span className="text-xs text-text-tertiary">bash</span>
              </div>

              {/* Terminal Content */}
              <div className="p-6 font-mono text-sm space-y-3">
                <div className="text-green-400">
                  <span className="text-primary-500">➜</span> dogedrop --help
                </div>
                <div className="text-text-secondary pl-4">
                  DogeDrop Distribution Engine v2.0.1
                </div>
                <div className="text-text-secondary pl-4">
                  Mass distribution tools for Dogecoin ecosystem
                </div>

                <div className="mt-6 space-y-2">
                  <div className="text-yellow-400">
                    <span className="text-primary-500">$</span> {commands[currentCommand].cmd}
                  </div>
                  <div className="text-text-secondary pl-4 text-xs">
                    {commands[currentCommand].desc}
                  </div>
                </div>

                {/* Animated cursor */}
                <div className="text-primary-500 animate-pulse">▊</div>
              </div>
            </div>

            {/* Quick Commands */}
            <div className="grid grid-cols-2 gap-4">
              {commands.slice(0, 4).map((cmd, idx) => (
                <div key={idx} className="bg-bg-secondary border border-border-primary rounded-lg p-4 hover:border-primary-500 transition-colors">
                  <div className="text-primary-500 font-mono text-sm mb-1">{cmd.cmd}</div>
                  <div className="text-xs text-text-secondary">{cmd.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Feature Breakdown */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4">Engineered for Scale</h2>
              <p className="text-lg text-text-secondary mb-6">
                Professional-grade distribution tools built specifically for the Dogecoin ecosystem.
                Handle thousands of recipients with surgical precision.
              </p>
            </div>

            {/* Core Features */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CpuChipIcon className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Smart Contract Integration</h3>
                  <p className="text-text-secondary">
                    Native DRC-20 and Doginals support. Automatic inscription handling,
                    UTXO management, and fee optimization.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BoltIcon className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Batch Processing Engine</h3>
                  <p className="text-text-secondary">
                    Process 500+ recipients per transaction. Intelligent grouping,
                    gas estimation, and parallel execution.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Zero-Risk Testing</h3>
                  <p className="text-text-secondary">
                    Full simulation mode. Validate distributions before committing capital.
                    Test with mock data, no network costs.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Specs */}
            <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Technical Specifications</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Max Recipients/Transaction</span>
                  <span className="text-primary-500 font-mono">500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Supported Assets</span>
                  <span className="text-primary-500">DRC-20 + Doginals</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Network Fee</span>
                  <span className="text-primary-500 font-mono">~0.05 DOGE/tx</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Service Fee</span>
                  <span className="text-primary-500 font-mono">0.025 DOGE/recipient</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">API Rate Limit</span>
                  <span className="text-primary-500">∞ (self-hosted)</span>
                </div>
              </div>
            </div>

            {/* Developer Call-to-Action */}
            <div className="bg-gradient-to-r from-primary-500/5 to-doge-yellow/5 border border-primary-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3">Ready to Deploy?</h3>
              <p className="text-text-secondary mb-4">
                Connect your wallet and start distributing tokens at scale.
                Built for builders, by builders.
              </p>
              <button
                onClick={onConnectWallet}
                className="w-full bg-primary-500 hover:bg-primary-400 text-bg-primary font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Initialize Distribution Engine</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-16 pt-8 border-t border-border-primary">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-500">∞</div>
              <div className="text-sm text-text-secondary">Distributions Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-500">500+</div>
              <div className="text-sm text-text-secondary">Recipients/Max Batch</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-500">0.025</div>
              <div className="text-sm text-text-secondary">DOGE Fee/Recipient</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-500">2.0</div>
              <div className="text-sm text-text-secondary">Engine Version</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component with View Toggle
export const OnboardingTeaser: React.FC<OnboardingTeaserProps> = ({ onConnectWallet }) => {
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');

  return (
    <div className="min-h-screen">
      {/* Render Selected View */}
      {viewMode === 'simple' ? (
        <SimpleView onConnectWallet={onConnectWallet} onToggleView={() => setViewMode('pro')} />
      ) : (
        <ProView onConnectWallet={onConnectWallet} onToggleView={() => setViewMode('simple')} />
      )}
    </div>
  );
};
