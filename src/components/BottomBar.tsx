import React from 'react';
import {
  BoltIcon,
  WifiIcon,
  EyeIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { Coins } from 'lucide-react';
import { useLiveActivity } from '../contexts/LiveActivityContext';

interface BottomBarProps {
  dogecoinPrice: number | null;
  activeUsers: number;
  theme: 'dark' | 'light' | 'contrast';
  onThemeToggle: () => void;
  userMode: 'collector' | 'builder';
  onUserModeToggle: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  dogecoinPrice,
  activeUsers,
  theme,
  onThemeToggle,
  userMode,
  onUserModeToggle
}) => {
  const { sentinelStatus } = useLiveActivity();
  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-4 h-4" />;
      case 'contrast':
        return <ComputerDesktopIcon className="w-4 h-4" />;
      default:
        return <MoonIcon className="w-4 h-4" />;
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary border-t border-border-primary h-10 flex items-center justify-between px-4 text-sm">
      {/* Left Section */}
      <div className="flex items-center space-x-6">
        {/* Live Indicator */}
        <div
          className="flex items-center space-x-2 group cursor-help"
          title={
            sentinelStatus.isConnected
              ? `Connected to Doginals Sentinel\nLast activity: ${sentinelStatus.lastActivity ? new Date(sentinelStatus.lastActivity).toLocaleTimeString() : 'None'}\nConnection attempts: ${sentinelStatus.connectionAttempts}`
              : `Disconnected from Doginals Sentinel\n${sentinelStatus.errorMessage || 'Service may not be running'}\nConnection attempts: ${sentinelStatus.connectionAttempts}`
          }
        >
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${sentinelStatus.isConnected ? 'bg-green-400 animate-pulse-slow' : 'bg-red-400'}`}></div>
            <span className={`font-medium ${sentinelStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {sentinelStatus.isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-4 bg-border-primary"></div>

        {/* Aggregating */}
        <div className="flex items-center space-x-2 text-text-secondary">
          <BoltIcon className="w-4 h-4" />
          <span>Aggregating</span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-4 bg-border-primary"></div>

        {/* Networks */}
        <div className="flex items-center space-x-2 text-text-secondary">
          <WifiIcon className="w-4 h-4" />
          <span>Networks</span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-4 bg-border-primary hidden sm:block"></div>

        {/* Terms/Privacy - Hidden on small screens */}
        <div className="hidden sm:flex items-center space-x-4 text-text-tertiary text-xs">
          <a href="#" className="hover:text-text-secondary transition-colors duration-200">Terms</a>
          <a href="#" className="hover:text-text-secondary transition-colors duration-200">Privacy</a>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* DOGE Price - only show when available */}
        {dogecoinPrice && (
          <div className="flex items-center space-x-2 font-mono text-text-primary">
            <Coins className="w-4 h-4 text-doge-yellow" />
            <span>${dogecoinPrice.toFixed(4)}</span>
          </div>
        )}

        {/* Active Users */}
        <div className="flex items-center space-x-2 text-text-secondary">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>{activeUsers.toLocaleString()} dogs</span>
        </div>

        {/* GWEI */}
        <div className="hidden md:flex items-center space-x-1 font-mono text-text-secondary">
          <span>0.42</span>
          <span className="text-xs">GWEI</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          className="p-1 rounded-md hover:bg-bg-secondary transition-colors duration-200"
          title={`Switch to ${theme === 'dark' ? 'light' : theme === 'light' ? 'contrast' : 'dark'} mode`}
        >
          {getThemeIcon()}
        </button>

        {/* View Mode Toggle */}
        <div className="hidden lg:flex items-center space-x-1">
          <button
            onClick={onUserModeToggle}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
              userMode === 'collector'
                ? 'text-primary-400 bg-primary-900/50 border border-primary-700/50'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Collector
          </button>
          <button
            onClick={onUserModeToggle}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
              userMode === 'builder'
                ? 'text-primary-400 bg-primary-900/50 border border-primary-700/50'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Builder
          </button>
        </div>

        {/* Currency Toggle */}
        <div className="hidden xl:flex items-center space-x-1">
          <button className="px-2 py-1 text-xs font-medium text-primary-400 bg-primary-900/50 rounded border border-primary-700/50">
            Crypto
          </button>
          <button className="px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors duration-200">
            USD
          </button>
        </div>

        {/* Volume Slider */}
        <button className="p-1 rounded-md hover:bg-bg-secondary transition-colors duration-200">
          <SpeakerWaveIcon className="w-4 h-4 text-text-secondary" />
        </button>

        {/* Settings */}
        <button className="p-1 rounded-md hover:bg-bg-secondary transition-colors duration-200">
          <CogIcon className="w-4 h-4 text-text-secondary" />
        </button>

        {/* More Options */}
        <button className="p-1 rounded-md hover:bg-bg-secondary transition-colors duration-200">
          <EllipsisVerticalIcon className="w-4 h-4 text-text-secondary" />
        </button>
      </div>
    </footer>
  );
};
