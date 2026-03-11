import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, WrenchScrewdriverIcon, ShoppingBagIcon, RocketLaunchIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';
import { Tooltip } from './index';

interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: (dismissPermanently?: boolean) => void;
  wallet?: any; // SimpleWallet from borkstarter
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isActive, onComplete, wallet }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissPermanently, setDismissPermanently] = useState(false);
  const [userType, setUserType] = useState<'builder' | 'collector' | null>(null);

  // Base steps for both user types
  const baseSteps: TourStep[] = [
    {
      id: 'user-type-selection',
      target: 'body', // Center on screen
      title: 'Welcome to Borkstarter!',
      content: 'Are you here to build and launch token distributions, or to discover and participate in airdrops?',
      position: 'top',
      action: 'Choose your path below'
    },
    {
      id: 'connect-wallet',
      target: '[data-tour="connect-wallet"]',
      title: wallet ? 'Wallet Connected ✓' : 'Link Your Wallet',
      content: wallet
        ? 'Great! Your MyDoge wallet is already connected. You have secure access to all Borkstarter features with proof-of-ownership authentication.'
        : 'Start by connecting your MyDoge wallet. This gives you secure access to all Borkstarter features with proof-of-ownership authentication.',
      position: 'bottom',
      action: wallet ? 'Already connected!' : 'Click "Link Up Your Wallet"'
    }
  ];

  // Builder-specific steps
  const builderSteps: TourStep[] = [
    {
      id: 'dogedrop-access',
      target: '[data-tour="dogedrop-nav"]',
      title: 'Launch with DogeDrops',
      content: 'Create powerful token distribution campaigns with live network fees, batch processing, and Doginals inscription support.',
      position: 'right',
      action: 'Start building your airdrop'
    },
    {
      id: 'csv-templates',
      target: '[data-tour="csv-templates"]',
      title: 'CSV Templates',
      content: 'Don\'t start from scratch! Download pre-formatted CSV templates in various sizes to quickly build your recipient lists.',
      position: 'bottom',
      action: 'Pick a template size'
    },
    {
      id: 'simulate-mode',
      target: '[data-tour="simulate-mode"]',
      title: 'Test with Simulation',
      content: 'Always simulate first! Preview your airdrop costs with live network fees before spending any DOGE. See exactly what you\'ll pay.',
      position: 'top',
      action: 'Try "Simulate Drop" first'
    },
    {
      id: 'analytics-dashboard',
      target: '[data-tour="analytics-nav"]',
      title: 'Track Performance',
      content: 'Monitor your drop performance with detailed analytics. See fee savings, success rates, and export data for further analysis.',
      position: 'right'
    },
    {
      id: 'live-fees',
      target: '[data-tour="live-fees"]',
      title: 'Live Fee Estimation',
      content: 'Our platform fetches real-time Dogecoin network fees. Launch during low congestion periods to save up to 30% on transaction costs!',
      position: 'top'
    }
  ];

  // Collector-specific steps
  const collectorSteps: TourStep[] = [
    {
      id: 'discover-section',
      target: '[data-tour="discover-section"]',
      title: 'Discover Launches',
      content: 'Browse trending token launches and discover amazing Doginals projects. Find new opportunities to participate in airdrops and giveaways.',
      position: 'right',
      action: 'Explore available launches'
    },
    {
      id: 'participate-guide',
      target: 'body', // Center on screen
      title: 'How to Participate',
      content: 'Connect your wallet, browse active launches, and claim free tokens. Borkstarter makes it easy to participate in the Dogecoin ecosystem.',
      position: 'top',
      action: 'Ready to claim some tokens?'
    },
    {
      id: 'community-features',
      target: 'body', // Center on screen
      title: 'Community Features',
      content: 'Stay updated with trending projects, track your claims, and be part of the growing Dogecoin community on Borkstarter.',
      position: 'top'
    }
  ];

  // Combine steps based on user type selection
  const getSteps = () => {
    if (!userType) {
      return baseSteps; // Show user type selection first
    }

    const typeSpecificSteps = userType === 'builder' ? builderSteps : collectorSteps;
    return [...baseSteps.slice(1), ...typeSpecificSteps]; // Skip user-type-selection step
  };

  const steps = getSteps();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
      setUserType(null); // Reset user type for new tour
      setIsVisible(true);
      document.body.style.overflow = 'hidden'; // Prevent scrolling during tour
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isActive]);

  const handleNext = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete(dismissPermanently);
  };

  const handleSkip = () => {
    setIsVisible(false);
    onComplete(false); // Skip doesn't dismiss permanently
  };

  const handleUserTypeSelect = (type: 'builder' | 'collector') => {
    setUserType(type);
    // Store the choice for app initialization
    localStorage.setItem('borkstarter-onboarding-choice', type);
    setCurrentStep(1); // Move to wallet step
  };

  const handleChangePath = () => {
    setUserType(null);
    setCurrentStep(0); // Reset to first step to show path selection
  };

  // Filter steps based on device type and user type
  const filteredSteps = steps.filter(step => {
    // Skip sidebar navigation steps on mobile (only applies to builder steps)
    if (isMobile && userType === 'builder' && (step.target.includes('dogedrop-nav') || step.target.includes('analytics-nav'))) {
      return false;
    }
    return true;
  });

  // Scroll to target element and highlight it - tooltip is always centered
  useEffect(() => {
    if (isActive && isVisible && currentStep < filteredSteps.length) {
      const currentStepData = filteredSteps[currentStep];
      const targetElement = document.querySelector(currentStepData.target) as HTMLElement;
      if (targetElement) {
        // Scroll to make target element visible
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [currentStep, isActive, isVisible, filteredSteps]);

  if (!isActive || !isVisible) return null;

  const currentStepData = filteredSteps[currentStep];
  const targetElement = document.querySelector(currentStepData?.target) as HTMLElement;

  // Handle case where step was filtered out
  if (!currentStepData) {
    handleComplete();
    return null;
  }

  // Always center tooltip in viewport for consistent UX
  const getTooltipPosition = () => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Center the tooltip in the viewport
    return {
      top: `${viewportHeight / 2}px`,
      left: `${viewportWidth / 2}px`,
      transform: 'translate(-50%, -50%)'
    };
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40 pointer-events-none" />

      {/* Highlight target element */}
      {targetElement && (
        <div
          className="fixed z-45 pointer-events-none"
          style={{
            top: `${targetElement.getBoundingClientRect().top - 4}px`,
            left: `${targetElement.getBoundingClientRect().left - 4}px`,
            width: `${targetElement.getBoundingClientRect().width + 8}px`,
            height: `${targetElement.getBoundingClientRect().height + 8}px`,
            border: '3px solid #FFD700',
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(255, 215, 0, 0.3)',
            animation: 'pulse 2s infinite',
            // Extra emphasis for sidebar elements
            ...(currentStepData.target.includes('nav') || currentStepData.target.includes('sidebar')
              ? {
                  borderWidth: '4px',
                  boxShadow: '0 0 0 6px rgba(255, 215, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.2)'
                }
              : {})
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-50 max-w-sm md:max-w-lg lg:max-w-xl"
        style={{
          ...tooltipPosition,
          zIndex: 50
        }}
      >
        <div className="bg-bg-primary border-2 border-primary-500 rounded-lg shadow-xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-text-primary">{currentStepData.title}</h3>
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <p className="text-text-secondary mb-4 leading-relaxed">{currentStepData.content}</p>

          {/* Action hint */}
          {currentStepData.action && (
            <div className="bg-primary-900/20 border border-primary-500/30 rounded p-3 mb-4">
              <p className="text-primary-400 text-sm font-medium">💡 {currentStepData.action}</p>
            </div>
          )}

          {/* Progress indicator - only show after user type selection */}
          {userType && (
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm text-text-secondary">
                {currentStep + 1} of {filteredSteps.length}
              </span>
              <div className="flex-1 bg-bg-secondary rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="space-y-4">
            {/* Special navigation for user type selection */}
            {currentStep === 0 && !userType && (
              <div className="flex flex-col space-y-4">
                <div className="flex space-x-8 justify-center">
                  <Tooltip
                    content={
                      <div className="space-y-2">
                        <div className="font-semibold text-primary-400 flex items-center gap-2">
                          <RocketLaunchIcon className="w-4 h-4" />
                          Builder Path
                        </div>
                        <div className="text-sm space-y-1">
                          <div>• Launch token distributions & airdrops</div>
                          <div>• Create Doginals inscription campaigns</div>
                          <div>• Use CSV templates for recipient lists</div>
                          <div>• Test with simulation mode (no DOGE spent)</div>
                          <div>• Track performance with analytics</div>
                          <div>• Live fee estimation to save costs</div>
                        </div>
                      </div>
                    }
                    position="top"
                  >
                    <button
                      onClick={() => handleUserTypeSelect('builder')}
                      className="flex flex-col items-center space-y-2 p-6 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 hover:border-primary-500/60 rounded-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <WrenchScrewdriverIcon className="w-12 h-12 text-primary-500" />
                      <div className="text-center">
                        <div className="font-semibold text-text-primary">Builder</div>
                        <div className="text-xs text-text-secondary">Create & Launch</div>
                      </div>
                    </button>
                  </Tooltip>

                  <Tooltip
                    content={
                      <div className="space-y-2">
                        <div className="font-semibold text-secondary-400 flex items-center gap-2">
                          <CursorArrowRaysIcon className="w-4 h-4" />
                          Collector Path
                        </div>
                        <div className="text-sm space-y-1">
                          <div>• Discover trending token launches</div>
                          <div>• Browse Doginals airdrop opportunities</div>
                          <div>• Claim free tokens & NFTs</div>
                          <div>• Connect MyDoge wallet securely</div>
                          <div>• Track your claims & participation</div>
                          <div>• Join the Dogecoin community</div>
                        </div>
                      </div>
                    }
                    position="top"
                  >
                    <button
                      onClick={() => handleUserTypeSelect('collector')}
                      className="flex flex-col items-center space-y-2 p-6 bg-secondary-500/10 hover:bg-secondary-500/20 border border-secondary-500/30 hover:border-secondary-500/60 rounded-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <ShoppingBagIcon className="w-12 h-12 text-secondary-500" />
                      <div className="text-center">
                        <div className="font-semibold text-text-primary">Collector</div>
                        <div className="text-xs text-text-secondary">Discover & Claim</div>
                      </div>
                    </button>
                  </Tooltip>
                </div>
                <div className="text-center">
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Skip Tour
                  </button>
                </div>
              </div>
            )}

            {/* Main navigation buttons (for all other steps) */}
            {!(currentStep === 0 && !userType) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* Restart Tour button - only show when user type is selected */}
                    {userType && (
                      <button
                        onClick={handleChangePath}
                        className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                        title="Start the tour over and choose a different path"
                      >
                        Restart Tour
                      </button>
                    )}

                    <button
                      onClick={handleSkip}
                      className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Skip Tour
                    </button>

                    <button
                      onClick={handleNext}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors"
                    >
                      <span>{currentStep === filteredSteps.length - 1 ? 'Finish Tour' : 'Next'}</span>
                      {currentStep === filteredSteps.length - 1 ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Permanent dismissal checkbox - separate row at bottom */}
            {currentStep === filteredSteps.length - 1 && (
              <div className="flex justify-center pt-2 border-t border-border-primary">
                <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dismissPermanently}
                    onChange={(e) => setDismissPermanently(e.target.checked)}
                    className="rounded border-border-primary bg-bg-primary text-primary-500 focus:ring-primary-500"
                  />
                  <span>Don't show this tour again</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step indicators - only show after user type selection */}
      {userType && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex space-x-2">
            {filteredSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary-500'
                    : index < currentStep
                    ? 'bg-primary-300'
                    : 'bg-text-tertiary'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Hook for managing tour state
export const useOnboardingTour = () => {
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    // Check if user has permanently dismissed the tour
    const tourDismissed = localStorage.getItem('borkstarter-tour-dismissed');
    if (tourDismissed === 'true') {
      console.log('Tour: Permanently dismissed, not showing');
      return; // Don't show tour if permanently dismissed
    }

    // Check if user has completed tour (but not permanently dismissed)
    const tourCompleted = localStorage.getItem('borkstarter-tour-completed');
    const userHasLoggedIn = localStorage.getItem('dogeDropSession'); // Check if they've used the app

    console.log('Tour: dismissed=', tourDismissed, 'completed=', tourCompleted, 'loggedIn=', !!userHasLoggedIn);

    if (!tourCompleted && userHasLoggedIn) {
      // Show tour for returning users who haven't completed it
      console.log('Tour: Activating tour for user');
      setIsTourActive(true);
    } else {
      console.log('Tour: Not activating - completed or no session');
    }
  }, []);

  const completeTour = (dismissPermanently = false) => {
    setIsTourActive(false);
    if (dismissPermanently) {
      localStorage.setItem('borkstarter-tour-dismissed', 'true');
      localStorage.removeItem('borkstarter-tour-completed'); // Remove completion flag
    } else {
      localStorage.setItem('borkstarter-tour-completed', 'true');
      localStorage.removeItem('borkstarter-tour-dismissed'); // Remove dismissal flag
    }
  };

  const startTour = () => {
    setIsTourActive(true);
  };

  const resetTour = () => {
    localStorage.removeItem('borkstarter-tour-completed');
    localStorage.removeItem('borkstarter-tour-dismissed');
    setIsTourActive(true);
  };

  return {
    isTourActive,
    completeTour,
    startTour,
    resetTour
  };
};
