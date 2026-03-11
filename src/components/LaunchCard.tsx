import React from 'react';
import { ClockIcon, UsersIcon, CurrencyDollarIcon, GiftIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline';
import { SimpleWallet } from 'borkstarter';
import { useUserRole } from '../contexts/UserRoleContext';

interface Launch {
  id: string;
  title: string;
  description: string;
  progress: number;
  raised: number;
  goal: number;
  participants: number;
  timeLeft: string;
  status: 'live' | 'upcoming' | 'ended';
  category: string;
  airdropConfig?: {
    enabled: boolean;
    type: 'tokens' | 'collectibles';
    totalReward: number;
    claimedCount: number;
  };
  creator?: string;
}

interface LaunchCardProps {
  launch: Launch;
  wallet: SimpleWallet | null;
  onClaimClick?: (launchId: string, launchName: string) => void;
}

export const LaunchCard: React.FC<LaunchCardProps> = ({ launch, wallet, onClaimClick }) => {
  const { isCreator, isConsumer, isGuest } = useUserRole();
  const isOwnLaunch = isCreator && launch.creator === wallet?.getAddress();
  const getStatusColor = () => {
    switch (launch.status) {
      case 'live':
        return 'status-live';
      case 'upcoming':
        return 'status-upcoming';
      case 'ended':
        return 'status-ended';
      default:
        return 'status-live';
    }
  };

  const getStatusText = () => {
    switch (launch.status) {
      case 'live':
        return 'Live';
      case 'upcoming':
        return 'Upcoming';
      case 'ended':
        return 'Ended';
      default:
        return 'Live';
    }
  };

  return (
    <div className="card card-hover group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-bg-secondary">
        <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center ${
          launch.category === 'Art' ? 'from-purple-600/20 to-pink-600/20' :
          launch.category === 'Gaming' ? 'from-green-600/20 to-emerald-600/20' :
          launch.category === 'Collectibles' ? 'from-blue-600/20 to-cyan-600/20' :
          launch.category === 'Utility' ? 'from-orange-600/20 to-red-600/20' :
          launch.category === 'DeFi' ? 'from-yellow-600/20 to-amber-600/20' :
          'from-primary-600/20 to-primary-800/20'
        }`}>
          <div className="text-center">
            <div className="text-4xl mb-2">
              {launch.category === 'Art' ? '🎨' :
               launch.category === 'Gaming' ? '🎮' :
               launch.category === 'Collectibles' ? '🐸' :
               launch.category === 'Utility' ? '🛠️' :
               launch.category === 'DeFi' ? '💰' :
               '🐕'}
            </div>
            <div className="text-xs text-text-tertiary font-medium px-2 py-1 bg-bg-primary/50 rounded-full">
              {launch.category}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`absolute top-3 left-3 ${getStatusColor()}`}>
          {getStatusText()}
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 right-3 bg-bg-primary/80 backdrop-blur-sm text-text-secondary text-xs px-2 py-1 rounded-md border border-border-primary">
          {launch.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Title and Description */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary line-clamp-1">
            {launch.title}
          </h3>
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
            {launch.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Progress</span>
            <span className="text-text-primary font-medium">{launch.progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${launch.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-4 h-4 text-text-tertiary" />
            <div>
              <p className="text-text-primary font-medium">
                ${(launch.raised / 1000).toFixed(1)}K
              </p>
              <p className="text-text-tertiary">of ${(launch.goal / 1000).toFixed(1)}K</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <UsersIcon className="w-4 h-4 text-text-tertiary" />
            <div>
              <p className="text-text-primary font-medium">
                {launch.participants.toLocaleString()}
              </p>
              <p className="text-text-tertiary">participants</p>
            </div>
          </div>
        </div>

        {/* Time Left */}
        <div className="flex items-center justify-between pt-2 border-t border-border-primary">
          <div className="flex items-center space-x-2 text-sm">
            <ClockIcon className="w-4 h-4 text-text-tertiary" />
            <span className="text-text-secondary">
              {launch.timeLeft === 'Ended' ? 'Ended' : `${launch.timeLeft} left`}
            </span>
          </div>

          <div className="flex space-x-2">
            {/* Claim button for consumers */}
            {isConsumer && launch.airdropConfig?.enabled && launch.status === 'live' && (
              <button
                onClick={() => onClaimClick?.(launch.id, launch.title)}
                className="px-3 py-2 bg-doge-yellow hover:bg-doge-orange text-bg-primary text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1"
              >
                <GiftIcon className="w-4 h-4" />
                <span>Claim</span>
              </button>
            )}

            {/* Creator buttons */}
            {isOwnLaunch ? (
              <div className="flex space-x-2">
                <button
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>View</span>
                </button>
              </div>
            ) : (
              /* Default button for non-creators */
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  launch.status === 'live'
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : launch.status === 'upcoming'
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={launch.status === 'ended' || !wallet}
              >
                {launch.status === 'live' ? 'View Details' :
                 launch.status === 'upcoming' ? 'Notify Me' :
                 'Ended'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
