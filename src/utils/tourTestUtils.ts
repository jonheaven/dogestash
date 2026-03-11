// <EXAMPLE> ONBOARDING TOUR TEST UTILITIES </EXAMPLE>
// Run in browser console to test tour functionality

// Reset tour completion flag (allows tour to show again)
export const resetTour = () => {
  localStorage.removeItem('borkstarter-tour-completed');
  console.log('🐕 Tour reset! Refresh the page to see the onboarding tour again.');
  return true;
};

// Check tour status
export const checkTourStatus = () => {
  const completed = localStorage.getItem('borkstarter-tour-completed');
  const hasSession = localStorage.getItem('dogeDropSession');

  console.log('🐕 Tour Status Check:');
  console.log('  - Tour Completed:', completed ? '✅ Yes' : '❌ No');
  console.log('  - User Has Session:', hasSession ? '✅ Yes' : '❌ No');
  console.log('  - Tour Will Show:', (!completed && hasSession) ? '✅ Yes' : '❌ No');

  return { completed: !!completed, hasSession: !!hasSession, willShowTour: !completed && !!hasSession };
};

// Force show tour (for testing)
export const forceShowTour = () => {
  localStorage.removeItem('borkstarter-tour-completed');
  // Create a fake session if none exists
  if (!localStorage.getItem('dogeDropSession')) {
    const fakeSession = btoa(JSON.stringify({
      address: 'DTestAddress123456789',
      signature: 'test-sig',
      expiry: Date.now() + 86400000
    }));
    localStorage.setItem('dogeDropSession', fakeSession);
    console.log('🐕 Created fake session for testing');
  }
  console.log('🐕 Tour forced! Refresh the page to see it.');
  return true;
};

// Clear all tour and session data
export const clearAllTourData = () => {
  localStorage.removeItem('borkstarter-tour-completed');
  localStorage.removeItem('dogeDropSession');
  console.log('🐕 All tour and session data cleared!');
  return true;
};

// Test tour step targeting
export const testTourTargets = () => {
  const targets = [
    '[data-tour="connect-wallet"]',
    '[data-tour="discover-section"]',
    '[data-tour="dogedrop-nav"]',
    '[data-tour="csv-templates"]',
    '[data-tour="simulate-mode"]',
    '[data-tour="analytics-nav"]',
    '[data-tour="live-fees"]'
  ];

  console.log('🐕 Tour Target Check:');
  targets.forEach(target => {
    const element = document.querySelector(target);
    console.log(`  - ${target}: ${element ? '✅ Found' : '❌ Missing'}`);
  });

  return targets.map(target => ({
    selector: target,
    found: !!document.querySelector(target)
  }));
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).resetTour = resetTour;
  (window as any).checkTourStatus = checkTourStatus;
  (window as any).forceShowTour = forceShowTour;
  (window as any).clearAllTourData = clearAllTourData;
  (window as any).testTourTargets = testTourTargets;
}
