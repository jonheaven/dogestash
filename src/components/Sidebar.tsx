import React from 'react';
import {
  HomeIcon,
  CubeIcon,
  SwatchIcon,
  ArrowPathIcon,
  GiftIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  XMarkIcon,
  SparklesIcon,
  TicketIcon,
  WalletIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  RadioIcon
} from '@heroicons/react/24/outline';
import { useUserRole } from '../contexts/UserRoleContext';

interface SidebarProps {
  isOpen: boolean;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onClose: () => void;
  userMode: 'collector' | 'builder';
}

// Common navigation items for all users
const commonItems = [
  { id: 'discover', label: 'Discover', icon: HomeIcon },
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'collections', label: 'Collections', icon: CubeIcon },
  { id: 'tokens', label: 'Tokens', icon: SwatchIcon },
  { id: 'swap', label: 'Swap', icon: ArrowPathIcon },
  { id: 'network-activity', label: 'Network Activity', icon: RadioIcon },
  { id: 'activity', label: 'Activity', icon: ChartBarIcon },
  { id: 'resources', label: 'Resources', icon: QuestionMarkCircleIcon },
  { id: 'support', label: 'Support', icon: QuestionMarkCircleIcon },
];

// Creator-specific navigation items
const creatorItems = [
  { id: 'create-launch', label: 'Create Launch', icon: SparklesIcon },
  { id: 'my-dashboard', label: 'My Dashboard', icon: ChartBarIcon },
  { id: 'dogedrops', label: 'DogeDrop', icon: PaperAirplaneIcon },
  { id: 'dogetag', label: 'Dogetag', icon: TagIcon },
  { id: 'tag-tracker', label: 'Tag Tracker', icon: MagnifyingGlassIcon },
  { id: 'drc20', label: 'DRC-20', icon: BanknotesIcon },
  { id: 'doginals', label: 'Doginals Live', icon: EyeIcon },
  { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  { id: 'settings', label: 'Settings', icon: WrenchScrewdriverIcon },
];

// Consumer-specific navigation items
const consumerItems = [
  { id: 'claims', label: 'My Claims', icon: TicketIcon },
  { id: 'rewards', label: 'Rewards', icon: ShieldCheckIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeSection,
  onSectionChange,
  onClose,
  userMode
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const { isCreator, isConsumer, isGuest } = useUserRole();

  // Generate navigation items based on user role and mode
  const getNavigationItems = () => {
    // Collector mode: simplified navigation for all users
    if (userMode === 'collector') {
      return [...commonItems, ...consumerItems];
    }

    // Builder mode: show all items including creator tools
    if (isGuest) {
      return [...commonItems, ...creatorItems]; // Even guests can see builder tools in builder mode
    } else if (isCreator) {
      return [...commonItems, ...creatorItems];
    } else if (isConsumer) {
      return [...commonItems, ...consumerItems, ...creatorItems]; // Consumers can access builder tools in builder mode
    }
    return [...commonItems, ...creatorItems];
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-16 bottom-10 z-10 bg-bg-primary border-r border-border-primary transition-all duration-200 ease-out ${
          isHovered ? 'sidebar-expanded' : 'sidebar-collapsed'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <nav className="w-full py-4">
          <ul className="space-y-1 px-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    data-tour={
                      item.id === 'discover' ? 'discover-section' :
                      item.id === 'dogedrops' ? 'dogedrop-nav' :
                      item.id === 'analytics' ? 'analytics-nav' : undefined
                    }
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md transition-all duration-200 group ${
                      isActive
                        ? 'bg-primary-900/50 text-primary-400 border-l-2 border-primary-400'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span
                      className={`transition-opacity duration-200 ${
                        isHovered ? 'opacity-100' : 'opacity-0 lg:hidden'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-bg-primary border-r border-border-primary">
            <div className="flex items-center justify-between p-4 border-b border-border-primary">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="text-xl font-bold text-text-primary">Borkstarter</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-bg-secondary transition-colors duration-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <nav className="py-4">
              <ul className="space-y-1 px-3">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          onSectionChange(item.id);
                          onClose();
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-900/50 text-primary-400 border-l-2 border-primary-400'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
};
