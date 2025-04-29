'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

// Type definition for activity item
interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  event_id?: number;
  photo_id?: number;
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, isAdmin, user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPhotos: 0,
    searchesToday: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  useEffect(() => {
    // Only admin users should access this page
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/signin?redirect=/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    // Fetch stats from API
    if (isAuthenticated && isAdmin) {
      const fetchStats = async () => {
        try {
          setIsLoadingStats(true);
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/stats`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Temporarily disable auth for development
              // 'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setStats({
              totalEvents: data.total_events || 0,
              totalPhotos: data.total_photos || 0,
              searchesToday: data.searches_today || 0,
            });
          } else {
            console.error('Failed to fetch statistics');
          }
        } catch (error) {
          console.error('Error fetching statistics:', error);
        } finally {
          setIsLoadingStats(false);
        }
      };
      
      const fetchActivity = async () => {
        try {
          setIsLoadingActivities(true);
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/recent-activity`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Temporarily disable auth for development
              // 'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setActivities(data);
          } else {
            console.error('Failed to fetch activity');
          }
        } catch (error) {
          console.error('Error fetching activity:', error);
        } finally {
          setIsLoadingActivities(false);
        }
      };
      
      fetchStats();
      fetchActivity();
    }
  }, [isAuthenticated, isAdmin]);

  // Helper function to format timestamps
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with title */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Event Management Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Manage Events</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Create, edit, and manage race events
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    href="/admin/events/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Manage Events
                  </Link>
                </div>
              </div>
            </div>

            {/* Photo Upload Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Upload Photos</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Upload and manage race photos
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    href="/admin/upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Upload Photos
                  </Link>
                </div>
              </div>
            </div>

            {/* Analytics Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Analytics</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      View user and photo statistics
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    href="/admin/analytics"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    View Analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Overview</h3>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {isLoadingStats ? (
                      <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      stats.totalEvents
                    )}
                  </dd>
                </div>
                <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Photos</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {isLoadingStats ? (
                      <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      stats.totalPhotos
                    )}
                  </dd>
                </div>
                <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Searches Today</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {isLoadingStats ? (
                      <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      stats.searchesToday
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              <div className="mt-5">
                {isLoadingActivities ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {activities.map((activity, index) => (
                      <li key={index} className="py-4">
                        <div className="flex space-x-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium">
                                {activity.type === 'photo_upload' ? 'Photos uploaded' : 
                                 activity.type === 'event_created' ? 'New event created' :
                                 'Activity'}
                              </h3>
                              <p className="text-sm text-gray-500">{formatTime(activity.timestamp)}</p>
                            </div>
                            <p className="text-sm text-gray-500">{activity.description}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 py-4">No recent activity to display</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 