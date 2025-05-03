'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { Role } from './types';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  user: {
    id?: string;
    name?: string;
    email?: string;
    imageUrl?: string;
    role?: Role;
  } | null;
  hasRole: (role: Role) => boolean;
  isPhotographer: boolean;
  isAthlete: boolean;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  user: null,
  hasRole: () => false,
  isPhotographer: false,
  isAthlete: false,
});

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  
  // Combined loading state from Clerk hooks
  const isLoading = !isLoaded || !isUserLoaded;
  
  // User data from Clerk, including role from metadata
  const userData = isSignedIn && clerkUser ? {
    id: clerkUser.id,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
    email: clerkUser.primaryEmailAddress?.emailAddress,
    imageUrl: clerkUser.imageUrl,
    role: (clerkUser.publicMetadata?.role as Role) || undefined,
  } : null;
  
  // Check if user has admin role
  const isAdmin = userData?.role === 'admin';
  
  // Function to check if user has a specific role
  const hasRole = (role: Role): boolean => {
    return userData?.role === role;
  };
  
  // Convenience properties for common role checks
  const isPhotographer = hasRole('photographer');
  const isAthlete = hasRole('athlete');
  
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!isSignedIn,
        isLoading,
        isAdmin,
        user: userData,
        hasRole,
        isPhotographer,
        isAthlete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use authentication
export const useAuth = () => useContext(AuthContext); 