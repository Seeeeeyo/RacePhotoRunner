'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/clerk-auth';
import { toast } from 'sonner';
import { EventSummary } from '@/lib/api';

// Type definition for activity item
interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  event_id?: number;
  photo_id?: number;
}

export default function PhotographerDashboard() {
  const { isAuthenticated, isLoading, isPhotographer, user, getAuthHeaders } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    // Page for authenticated photographers
    if (!isLoading && !isAuthenticated) {
      router.push('/signin?redirect=/photographer/dashboard');
    } else if (!isLoading && isAuthenticated && !isPhotographer) {
      // If authenticated but not a photographer, redirect to home or a generic dashboard
      // Or show an "Access Denied" message if they somehow landed here without being a photographer
      toast.error("Access Denied: This page is for photographers only.");
      router.push('/'); 
    }
  }, [isLoading, isAuthenticated, isPhotographer, router]);

  useEffect(() => {
    const fetchPhotographerEvents = async () => {
      if (isAuthenticated && isPhotographer) {
        setIsLoadingEvents(true);
        try {
          const headers = await getAuthHeaders();
          if (!headers) {
            toast.error("Authentication error. Please try signing in again.");
            setIsLoadingEvents(false);
            // Optionally redirect to sign-in if headers are missing, though useAuth should handle this
            // router.push('/signin?redirect=/photographer/dashboard');
            return;
          }

          const response = await fetch('/api/photographer/events', { headers });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Failed to fetch events" }));
            throw new Error(errorData.detail || `Error: ${response.status}`);
          }
          const data: EventSummary[] = await response.json();
          setEvents(data);
        } catch (error) {
          console.error("Failed to fetch photographer events:", error);
          toast.error(error instanceof Error ? error.message : "Could not load your events.");
        }
        setIsLoadingEvents(false);
      }
    };

    if (!isLoading) { // Only fetch once auth state is resolved
        fetchPhotographerEvents();
    }
  }, [isAuthenticated, isPhotographer, isLoading, getAuthHeaders, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isPhotographer) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback, prevent rendering the admin content.
    // You might want a more specific loading/error state or redirect here too.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p>Redirecting or checking authentication...</p>
        {/* Optionally, you can add a more user-friendly message or a specific component for non-photographers */}
      </div>
    );
  }

  // Placeholder for Photographer Dashboard Content
  return (
    // <AppLayout title="Photographer Dashboard">
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow py-6 px-4 sm:px-6 lg:px-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Photographer Dashboard</h1>
        {user?.email && <p className="text-gray-600 mt-1">Welcome, {user.email}</p>}
      </header>
      
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Dashboard Quick Actions</h2>
          <p className="text-gray-600 mb-6">
            Manage your events and photos.
          </p>
          <div className="flex flex-wrap space-x-0 sm:space-x-4 space-y-4 sm:space-y-0">
            <Link href="/photographer/events/create" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors w-full sm:w-auto text-center">
              Create New Event
            </Link>
            <Link href="/photographer/upload" className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition-colors w-full sm:w-auto text-center">
              Upload Photos
            </Link>
          </div>
        </div>

        {/* Display Events */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Events</h2>
          {isLoadingEvents ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-500">Loading your events...</p>
              {/* Optional: Add a spinner or shimmer effect here */}
              <div className="mt-4 space-y-3">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          ) : events.length > 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md divide-y divide-gray-200">
              {events.map((event) => (
                <div key={event.id} className="py-4">
                  <h3 className="text-lg font-medium text-blue-600 hover:underline">
                    <Link href={`/photographer/events/${event.id}/edit`}>{event.name}</Link> {/* TODO: Link to event manage/edit page */}
                  </h3>
                  <p className="text-sm text-gray-500">{event.location} - {new Date(event.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500 mt-1">Photos: {event.photo_count}</p>
                  {/* Add more event details or action buttons here e.g. Upload photos to this event, Edit event */}
                  <div className="mt-3">
                     <Link href={`/photographer/events/${event.id}/upload`} className="text-sm text-green-600 hover:text-green-800 font-medium">
                       Upload Photos to Event
                     </Link>
                     <Link href={`/photographer/events/${event.id}/edit`} className="ml-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                       Edit Event
                     </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-500">You haven't created any events yet.</p>
              <Link href="/photographer/events/create" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors">
                Create Your First Event
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    // </AppLayout>
  );
} 