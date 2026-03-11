import React from 'react';
import { LaunchGrid } from './LaunchGrid';
import { DogedropsWizard } from './DogedropsWizard';
import { OnboardingTeaser } from './OnboardingTeaser';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { DoginalsActivityDashboard } from './DoginalsActivityDashboard';
import { Wallet } from './Wallet';
import { DRC20Manager } from './drc20/DRC20Manager';
import { TransactionMonitor } from './TransactionMonitor';
import { StatusIndicator } from './StatusIndicator';
import { DogetagPage } from './dogetag';
import { TagTracker } from './TagTracker';
import { DoginalsLiveFeed } from './DoginalsLiveFeed';
import { useUserRole } from '../contexts/UserRoleContext';
import { SimpleWallet } from 'borkstarter';

interface MainContentProps {
  activeSection: string;
  wallet: SimpleWallet | null;
  onConnectWallet: () => void;
  userMode: 'collector' | 'builder';
  onNavigateToSection?: (section: string) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeSection,
  wallet,
  onConnectWallet,
  userMode,
  onNavigateToSection
}) => {
  const { isCreator, isConsumer, isGuest } = useUserRole();

  // Show onboarding for guests
  if (isGuest) {
    return <OnboardingTeaser onConnectWallet={onConnectWallet} />;
  }

  // Show creator dashboard for creators (simplified for now)
  if (isCreator && activeSection === 'my-dashboard') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">My Dashboard</h1>
          <p className="text-text-secondary mt-2">
            Manage your launches, view analytics, and create new projects.
          </p>
        </div>

        {/* Creator-specific content would go here */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
            <h3 className="text-lg font-semibold text-text-primary mb-2">My Launches</h3>
            <p className="text-text-secondary">View and manage your active projects</p>
          </div>

          <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Create Launch</h3>
            <p className="text-text-secondary">Start a new project or collection</p>
          </div>

          <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
            <h3 className="text-lg font-semibold text-text-primary mb-2">DogeDrop</h3>
            <p className="text-text-secondary">Manage airdrop campaigns</p>
          </div>
        </div>
      </div>
    );
  }

  // Show consumer claims view
  if (isConsumer && activeSection === 'claims') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">My Claims</h1>
          <p className="text-text-secondary mt-2">
            View your claimed rewards and available airdrops.
          </p>
        </div>

        {/* Consumer claims content would go here */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Available Claims</h3>
          <p className="text-text-secondary">Connect your wallet to view available airdrops</p>
        </div>
      </div>
    );
  }

  // Show analytics dashboard
  if (activeSection === 'analytics') {
    return (
      <div className="space-y-6">
        <AnalyticsDashboard />
        <TransactionMonitor showAnalytics={true} />
        <StatusIndicator />
      </div>
    );
  }

  // Show network activity dashboard
  if (activeSection === 'network-activity') {
    return <DoginalsActivityDashboard />;
  }

  // Show wallet holdings
  if (activeSection === 'wallet') {
    return (
      <div className="space-y-6">
        <Wallet userMode={userMode} onNavigateToSection={onNavigateToSection} />
        {userMode === 'builder' && <TransactionMonitor compact={true} />}
      </div>
    );
  }

  if (activeSection === 'drc20') {
    return (
      <div className="space-y-6">
        <DRC20Manager availableUtxos={[]} userMode={userMode} />
        <TransactionMonitor compact={true} />
      </div>
    );
  }

  // Dogetag section
  if (activeSection === 'dogetag') {
    return <DogetagPage />;
  }

  // Tag Tracker section
  if (activeSection === 'tag-tracker') {
    return <TagTracker />;
  }

  // Doginals Live Feed section
  if (activeSection === 'doginals') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DoginalsLiveFeed />
      </div>
    );
  }

  // Settings section
  if (activeSection === 'settings') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-2">
            Configure your API connections and application preferences.
          </p>
        </div>

        <StatusIndicator />
      </div>
    );
  }

  // Default content based on active section
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {activeSection === 'dogedrops' ? (
        <DogedropsWizard wallet={wallet} onConnectWallet={onConnectWallet} userMode={userMode} />
      ) : (
        <LaunchGrid activeSection={activeSection} wallet={wallet} />
      )}
    </div>
  );
};
