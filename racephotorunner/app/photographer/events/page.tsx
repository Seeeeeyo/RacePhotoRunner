'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Edit, Eye, Upload } from 'lucide-react';
import { fetchEvents, EventSummary } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const data = await fetchEvents();
        setEvents(data);
      } catch (error) {
        console.error('Error loading events:', error);
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout title="Loading Events...">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Photographer Events">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <Button 
            variant="default"
            onClick={() => router.push('/photographer/events/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create New Event
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {events.map((event) => (
              <li key={event.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {event.cover_image_url && (
                        <div className="flex-shrink-0 h-16 w-24 relative">
                          <Image
                            src={`${API_BASE_URL}${event.cover_image_url}`}
                            alt={event.name}
                            fill
                            sizes="(max-width: 96px) 100vw, 96px"
                            className="object-cover rounded"
                            unoptimized
                          />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">{event.name}</h2>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {event.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        variant="secondary"
                        asChild
                      >
                        <Link href={`/photographer/events/${event.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </Link>
                      </Button>
                      <Button
                        variant="default"
                        asChild
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Link href={`/admin/upload?eventId=${event.id}`}>
                          <Upload className="h-4 w-4 mr-2" /> Upload Photos
                        </Link>
                      </Button>
                      <Button
                        variant="secondary"
                        asChild
                      >
                        <Link href={`/events/${event.id}`}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
} 