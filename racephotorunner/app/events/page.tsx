"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { fetchEvents, EventSummary, getFullImageUrl } from '@/lib/api';
import { Edit, Upload } from 'lucide-react';

// Update the EventSummary type to include cover_image
interface EventWithCover extends EventSummary {
  cover_image_url?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isAdmin, user } = useAuth();
  const canManage = isAuthenticated && (user?.role === 'admin' || user?.role === 'photographer');

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const eventsData = await fetchEvents();
        setEvents(eventsData);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Race Events</h1>
          <div className="flex gap-3">
            {isAdmin && (
              <Link href="/admin/events/create">
                <Button variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                  Add Event
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 mb-8">
          Browse through our collection of running events and find your photos.
        </p>
        
        {events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No events found</h2>
            <p className="text-gray-500 mb-4">Check back later for upcoming races.</p>
            {isAdmin && (
              <Link href="/admin/events/create">
                <Button variant="default">Create First Event</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="h-48 relative">
                  {(event.cover_image_url || event.cover_image_path) ? (
                    <Image 
                      src={getFullImageUrl(event.cover_image_url || event.cover_image_path)}
                      alt={event.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{event.name}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">{event.name}</h2>
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{event.photo_count.toLocaleString()} photos</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Link 
                      href={`/events/${event.id}`}
                      className="flex-1 block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm"
                    >
                      View Photos
                    </Link>
                    {canManage && (
                      <>
                        <Link 
                          href={`/admin/events/${event.id}/edit`} 
                          passHref
                          legacyBehavior
                        >
                          <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-1">
                            <Edit className="h-4 w-4" /> Edit
                          </Button>
                        </Link>
                        <Link 
                          href={`/admin/upload?eventId=${event.id}`} 
                          passHref
                          legacyBehavior
                        >
                          <Button variant="secondary" size="sm" className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white">
                             <Upload className="h-4 w-4" /> Upload
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 