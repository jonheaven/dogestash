import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

interface UserRoleContextType {
  role: 'creator' | 'consumer' | 'guest';
  isCreator: boolean;
  isConsumer: boolean;
  isGuest: boolean;
  launchCount: number;
  refetchRole: () => Promise<void>;
  setRole: (role: 'creator' | 'consumer' | 'guest') => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

interface UserRoleProviderProps {
  children: React.ReactNode;
  walletAddress?: string | null;
}

export const UserRoleProvider: React.FC<UserRoleProviderProps> = ({
  children,
  walletAddress
}) => {
  const [role, setRole] = useState<'creator' | 'consumer' | 'guest'>('guest');
  const [launchCount, setLaunchCount] = useState(0);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const toast = useToast();

  const refetchRole = async () => {
    if (!walletAddress) {
      setRole('guest');
      setLaunchCount(0);
      return;
    }

    // Pure frontend role detection using localStorage
    const storedRole = localStorage.getItem(`userRole_${walletAddress}`);
    const storedLaunchCount = parseInt(localStorage.getItem(`launchCount_${walletAddress}`) || '0');

    if (storedRole === 'creator' || storedLaunchCount > 0) {
      setRole('creator');
      setLaunchCount(storedLaunchCount);
      if (!hasShownWelcome) {
        toast.success(`🎨 Welcome back, Creator! You have ${storedLaunchCount} launch${storedLaunchCount > 1 ? 'es' : ''}.`, 5000);
        setHasShownWelcome(true);
      }
    } else {
      setRole('consumer');
      setLaunchCount(0);
      if (!hasShownWelcome) {
        toast.success(`🎯 Welcome ${walletAddress.slice(0, 8)}...! Discover amazing drops and claim free rewards.`, 5000);
        setHasShownWelcome(true);
      }
    }
  };

  // Update role and persist to localStorage
  const updateRole = (newRole: 'creator' | 'consumer' | 'guest') => {
    setRole(newRole);
    if (walletAddress && newRole !== 'guest') {
      localStorage.setItem(`userRole_${walletAddress}`, newRole);
    }
  };

  // Promote to creator (called when first launch is created)
  const promoteToCreator = () => {
    updateRole('creator');
    const newCount = launchCount + 1;
    setLaunchCount(newCount);
    if (walletAddress) {
      localStorage.setItem(`launchCount_${walletAddress}`, newCount.toString());
    }
    toast.success('🎉 Congratulations! You are now a Creator. Welcome to the building side!', 6000);
  };

  useEffect(() => {
    // Reset welcome flag when wallet changes
    setHasShownWelcome(false);
    refetchRole();
  }, [walletAddress]);

  const value: UserRoleContextType = {
    role,
    isCreator: role === 'creator',
    isConsumer: role === 'consumer',
    isGuest: role === 'guest',
    launchCount,
    refetchRole,
    setRole: updateRole,
  };

  // Expose promoteToCreator globally for when launches are created
  (window as any).promoteToCreator = promoteToCreator;

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};
