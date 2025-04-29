"use client";

import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function SignInPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  // If already authenticated and there's a redirect, go there
  useEffect(() => {
    if (isAuthenticated && redirect) {
      window.location.href = redirect;
    }
  }, [isAuthenticated, redirect]);

  const handleLogin = () => {
    login(redirect);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-md m-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back!</h2>
            <p className="text-gray-600 mt-2">
              {redirect ? 'Sign in to continue' : 'Sign in to access your race photos'}
            </p>
          </div>

          <div className="space-y-6">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
                  </svg>
                  Sign in with Auth0
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 