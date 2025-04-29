'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
// import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
// import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';

// Replace with your Auth0 domain and client ID
const AUTH0_DOMAIN = 'dev-in51j4061cl05qgg.us.auth0.com';
const AUTH0_CLIENT_ID = 'qckAtWIcgixqe2Ykb64dOuSFw50BUMJp';
const AUTH0_REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

// List of admin user IDs
const ADMIN_USER_IDS = [
  'google-oauth2|110062415624457494048' // Selim Gilon
];

type Auth0User = {
  name: string;
  email: string;
  picture: string;
  sub: string;
};

type Auth0ContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  user: Auth0User | null;
  login: (redirect?: string | null) => void;
  logout: () => void;
  getAuthHeaders: () => Record<string, string> | null;
};

const Auth0Context = createContext<Auth0ContextType>({
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  user: null,
  login: () => {},
  logout: () => {},
  getAuthHeaders: () => null,
});

export const Auth0Provider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<Auth0User | null>(null);
  const router = useRouter();

  // Initialize auth on first load
  useEffect(() => {
    checkAuth();
  }, []);

  // Check for authentication status
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if we have user info in cookies
      const userCookie = getCookie('auth0_user');
      
      if (userCookie) {
        try {
          // URL decode the cookie value before parsing as JSON
          const decodedCookie = decodeURIComponent(userCookie);
          const userData = JSON.parse(decodedCookie);
          
          const userObj = {
            name: userData.name || 'User',
            email: userData.email || '',
            picture: userData.picture || '',
            sub: userData.sub || userData.id || ''
          };
          
          setUser(userObj);
          setIsAuthenticated(true);
          
          // Check if user is an admin
          setIsAdmin(ADMIN_USER_IDS.includes(userObj.sub));
        } catch (e) {
          console.error('Error parsing user cookie:', e);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get cookie value
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Start Auth0 login flow
  const login = (redirect?: string | null) => {
    // Store redirect URL in sessionStorage if provided
    if (redirect) {
      sessionStorage.setItem('auth0_redirect_after_login', redirect);
    }
    
    // Redirect to our login API route which will handle Auth0 redirect
    window.location.href = '/api/auth/login';
  };

  // Helper function to generate random string
  const generateRandomString = () => {
    const array = new Uint32Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  };

  // Logout
  const logout = () => {
    // Redirect to our logout API route which will handle clearing cookies
    window.location.href = '/api/auth/logout';
  };

  // Get auth headers for API requests
  const getAuthHeaders = () => {
    const accessToken = getCookie('auth0_access_token');
    if (!accessToken) return null;
    
    return {
      Authorization: `Bearer ${accessToken}`
    };
  };

  return (
    <Auth0Context.Provider
      value={{
        isAuthenticated,
        isLoading,
        isAdmin,
        user,
        login,
        logout,
        getAuthHeaders,
      }}
    >
      {children}
    </Auth0Context.Provider>
  );
};

// Hook to use Auth0 authentication
export const useAuth = () => useContext(Auth0Context); 