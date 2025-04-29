'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // This will be handled by the useEffect redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Your Profile</h1>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-3xl font-bold">
                {user?.name?.charAt(0) || '?'}
              </div>
              
              <div className="flex-1">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{user?.name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{user?.email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                    <p className="mt-1 text-sm text-gray-600">{user?.sub || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <Link 
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Return to Home
              </Link>
              
              <Link 
                href="/events"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 