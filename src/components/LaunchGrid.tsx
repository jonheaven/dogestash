import React, { useState } from 'react';
import { LaunchCard } from './LaunchCard';
import { ClaimModal } from './ClaimModal';
import { useUserRole } from '../contexts/UserRoleContext';
import { SimpleWallet } from 'borkstarter';

// Mock data for launches
const mockLaunches = [
  {
    id: '1',
    title: 'DogePunk #420',
    description: 'Rare DogePunk collection with unique traits and community perks',
    progress: 75,
    raised: 42000,
    goal: 50000,
    participants: 1337,
    timeLeft: '2 days',
    status: 'live' as const,
    category: 'Art',
    airdropConfig: {
      enabled: true,
      type: 'tokens',
      totalReward: 10000,
      claimedCount: 234
    },
    creator: 'D8mP3nQx7rT9vY2wX4zA6bC8dE0fG2hI4jK6lM8nO0pQ2rS4tU6vW8xY0z'
  },
  {
    id: '2',
    title: 'Shiba Inu Army',
    description: 'Strategic NFT collection for the ultimate Dogecoin ecosystem',
    progress: 45,
    raised: 22500,
    goal: 50000,
    participants: 892,
    timeLeft: '5 days',
    status: 'live' as const,
    category: 'Gaming',
    airdropConfig: {
      enabled: true,
      type: 'collectibles',
      totalReward: 50,
      claimedCount: 12
    },
    creator: 'D7xK4j2p5mN8vQ3rT6uY1oA9bC2dE4fG6hI8jK0lM3nP5qR7sT9uV1wX3yZ5'
  },
  {
    id: '3',
    title: 'Moon Frog Society',
    description: 'Exclusive frog-themed NFTs with real-world utility',
    progress: 100,
    raised: 75000,
    goal: 75000,
    participants: 2156,
    timeLeft: 'Ended',
    status: 'ended' as const,
    category: 'Collectibles',
    airdropConfig: {
      enabled: false,
      type: 'tokens',
      totalReward: 0,
      claimedCount: 0
    },
    creator: 'DAhE5e5mP3nQx7rT9vY2wX4zA6bC8dE0fG2hI4jK6lM8nO0pQ2rS4tU6vW8xY0z'
  },
  {
    id: '4',
    title: 'Doginals Tools',
    description: 'Essential tools and utilities for the Doginals ecosystem',
    progress: 20,
    raised: 8000,
    goal: 40000,
    participants: 234,
    timeLeft: '12 days',
    status: 'upcoming' as const,
    category: 'Utility',
    airdropConfig: {
      enabled: false,
      type: 'tokens',
      totalReward: 0,
      claimedCount: 0
    },
    creator: 'D9cB7aF5dE3gH1iJ9kL7mN5oP3qR1sT9uV7wX5yZ3A1bC9dE7fG5hI3jK1lM9n'
  },
  {
    id: '5',
    title: 'Crypto Kawaii Dogs',
    description: 'Adorable dog characters in the cutest crypto collection',
    progress: 90,
    raised: 67500,
    goal: 75000,
    participants: 1892,
    timeLeft: '1 day',
    status: 'live' as const,
    category: 'Art',
    airdropConfig: {
      enabled: true,
      type: 'tokens',
      totalReward: 25000,
      claimedCount: 456
    },
    creator: 'D6bA8cE0fG2hI4jK6lM8nO0pQ2rS4tU6vW8xY0zA2bC4dE6fG8hI0jK2lM4n'
  },
  {
    id: '6',
    title: 'Dogecoin DeFi Hub',
    description: 'Decentralized finance tools built on Dogecoin',
    progress: 15,
    raised: 4500,
    goal: 30000,
    participants: 156,
    timeLeft: '18 days',
    status: 'upcoming' as const,
    category: 'DeFi',
    airdropConfig: {
      enabled: false,
      type: 'tokens',
      totalReward: 0,
      claimedCount: 0
    },
    creator: 'D4aC6eG8iK0mO2qS4uW6yA8cE0gI2kM4oQ6sU8wY0aC2eG4iK6mO8qS0uW2y'
  }
];

interface LaunchGridProps {
  activeSection: string;
  wallet: SimpleWallet | null;
}

export const LaunchGrid: React.FC<LaunchGridProps> = ({ activeSection, wallet }) => {
  const { isCreator, isConsumer, isGuest } = useUserRole();
  const [claimModal, setClaimModal] = useState<{
    isOpen: boolean;
    launchId: string;
    launchName: string;
  }>({
    isOpen: false,
    launchId: '',
    launchName: ''
  });
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'discover':
        return 'Trending Launches';
      case 'drops':
        return 'Featured Drops';
      case 'collections':
        return 'Top Collections';
      case 'tokens':
        return 'Token Launches';
      default:
        return 'Launches';
    }
  };

  const getFilteredLaunches = () => {
    switch (activeSection) {
      case 'drops':
        return mockLaunches.filter(launch => launch.status === 'live');
      case 'collections':
        return mockLaunches.filter(launch => launch.category === 'Art' || launch.category === 'Collectibles');
      case 'tokens':
        return mockLaunches.filter(launch => launch.category === 'DeFi' || launch.category === 'Utility');
      default:
        return mockLaunches;
    }
  };

  const launches = getFilteredLaunches();

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{getSectionTitle()}</h1>
          <p className="text-text-secondary mt-2">
            Discover the next big thing in the Doginals ecosystem
          </p>
        </div>

        {/* Filters/Sort - Placeholder for future implementation */}
        <div className="hidden lg:flex items-center space-x-4">
          <select className="input text-sm">
            <option>All Categories</option>
            <option>Art</option>
            <option>Gaming</option>
            <option>Collectibles</option>
            <option>DeFi</option>
            <option>Utility</option>
          </select>
          <select className="input text-sm">
            <option>Most Recent</option>
            <option>Most Funded</option>
            <option>Ending Soon</option>
            <option>Newest</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🚀</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">42</p>
              <p className="text-sm text-text-secondary">Active Launches</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-doge-gold rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🐕</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">$2.4M</p>
              <p className="text-sm text-text-secondary">Total Raised</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">👥</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">12.5K</p>
              <p className="text-sm text-text-secondary">Participants</p>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Cards Grid */}
      <div className="grid-launch-cards">
        {launches.map((launch) => (
          <LaunchCard
            key={launch.id}
            launch={launch}
            wallet={wallet}
            onClaimClick={(launchId, launchName) => {
              if (!wallet) {
                // Handle wallet not connected - could show wallet modal
                return;
              }
              setClaimModal({
                isOpen: true,
                launchId,
                launchName
              });
            }}
          />
        ))}
      </div>

      {/* Load More Button */}
      {launches.length > 0 && (
        <div className="text-center py-8">
          <button className="btn-primary px-8 py-3">
            Load More Launches
          </button>
        </div>
      )}

      {/* Claim Modal */}
      <ClaimModal
        isOpen={claimModal.isOpen}
        onClose={() => setClaimModal({ isOpen: false, launchId: '', launchName: '' })}
        launchId={claimModal.launchId}
        launchName={claimModal.launchName}
        walletAddress={wallet?.getAddress() || ''}
        onClaimSuccess={(reward) => {
          // Handle successful claim - could update local state or refetch data
          console.log(`Claim successful! Received ${reward} tokens`);
        }}
      />
    </div>
  );
};
