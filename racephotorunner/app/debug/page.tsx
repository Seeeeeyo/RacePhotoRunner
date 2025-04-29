'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function DebugPage() {
  const { isAuthenticated, isLoading, isAdmin, user, login, logout } = useAuth();
  const [localStorageItems, setLocalStorageItems] = useState<Record<string, string>>({});
  const [sessionStorageItems, setSessionStorageItems] = useState<Record<string, string>>({});
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const [decodedCookies, setDecodedCookies] = useState<Record<string, any>>({});
  
  useEffect(() => {
    refreshData();
  }, [isAuthenticated]);
  
  const refreshData = () => {
    // Get localStorage items
    const localItems: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localItems[key] = localStorage.getItem(key) || '';
      }
    }
    setLocalStorageItems(localItems);
    
    // Get sessionStorage items
    const sessionItems: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionItems[key] = sessionStorage.getItem(key) || '';
      }
    }
    setSessionStorageItems(sessionItems);
    
    // Get cookies
    const cookieItems: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key) cookieItems[key] = value || '';
    });
    setCookies(cookieItems);
  };
  
  const decodeCookies = () => {
    const decoded: Record<string, any> = {};
    Object.entries(cookies).forEach(([key, value]) => {
      try {
        const decodedValue = decodeURIComponent(value);
        try {
          // Attempt to parse as JSON
          decoded[key] = JSON.parse(decodedValue);
        } catch {
          // Store as string if not valid JSON
          decoded[key] = decodedValue;
        }
      } catch {
        decoded[key] = value;
      }
    });
    setDecodedCookies(decoded);
  };
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
          <h1 className="text-2xl font-bold mb-4">Auth0 Debug Page</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Authentication State</h2>
            <div className="bg-gray-100 p-4 rounded-md">
              <p><strong>isLoading:</strong> {isLoading.toString()}</p>
              <p><strong>isAuthenticated:</strong> {isAuthenticated.toString()}</p>
              <p><strong>isAdmin:</strong> {isAdmin.toString()} {isAdmin && '✅'}</p>
              <div className="mt-2">
                <strong>User:</strong>
                <pre className="mt-1 bg-gray-200 p-2 rounded overflow-auto">
                  {user ? JSON.stringify(user, null, 2) : 'Not logged in'}
                </pre>
              </div>
            </div>
            
            <div className="mt-4 space-x-4">
              <button 
                onClick={() => login()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Login with Auth0
              </button>
              <button 
                onClick={() => logout()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
              <button 
                onClick={refreshData}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Refresh Data
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Cookies</h2>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre>{JSON.stringify(cookies, null, 2)}</pre>
              <button 
                onClick={decodeCookies}
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Decode Cookies
              </button>
              {Object.keys(decodedCookies).length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold">Decoded Cookies:</h3>
                  <pre className="mt-2">{JSON.stringify(decodedCookies, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Local Storage</h2>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre>{JSON.stringify(localStorageItems, null, 2)}</pre>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Session Storage</h2>
            <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              <pre>{JSON.stringify(sessionStorageItems, null, 2)}</pre>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">URL Information</h2>
            <div className="bg-gray-100 p-4 rounded-md">
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : ''}</p>
              <p><strong>Pathname:</strong> {typeof window !== 'undefined' ? window.location.pathname : ''}</p>
              <p><strong>Search Params:</strong> {typeof window !== 'undefined' ? window.location.search : ''}</p>
              <p><strong>Hash:</strong> {typeof window !== 'undefined' ? window.location.hash : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 