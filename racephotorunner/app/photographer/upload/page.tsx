'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/clerk-auth';
import { fetchEvents, fetchEvent, uploadPhoto, EventSummary } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

export default function PhotographerUploadPage() {
  const { isAuthenticated, isLoading, isPhotographer, user, getAuthHeaders } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [urlEventId, setUrlEventId] = useState<string | null>(null);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  // Load events when the component mounts
  useEffect(() => {
    console.log("Primary useEffect running", { isLoading, isAuthenticated, isPhotographer });
    
    // Only photographer users should access this page
    if (!isLoading && (!isAuthenticated || !isPhotographer)) {
      console.log("Redirecting to signin - not authenticated or not photographer");
      router.push('/signin?redirect=/photographer/upload');
      return;
    }

    const loadEvents = async () => {
      console.log("loadEvents function started");
      try {
        setEventsLoading(true);
        console.log("Fetching events...");
        const eventsData = await fetchEvents();
        console.log("Events fetched:", eventsData.length);
        setEvents(eventsData);
        
        // Check for eventId param after loading events
        const eventIdFromUrl = searchParams.get('eventId');
        console.log("Event ID from URL:", eventIdFromUrl);
        
        if (eventIdFromUrl && !eventsData.find(e => e.id.toString() === eventIdFromUrl)) {
          console.log("Need to fetch specific event");
          // If the eventId from URL is not in the loaded events, fetch it specifically
          try {
            console.log("Fetching specific event:", eventIdFromUrl);
            const eventData = await fetchEvent(parseInt(eventIdFromUrl));
            console.log("Specific event fetched:", eventData);
            
            if (eventData) {
              // Create an EventSummary from the fetched event data
              const eventSummary: EventSummary = {
                id: eventData.id,
                name: eventData.name,
                date: eventData.date,
                location: eventData.location,
                slug: eventData.slug,
                photo_count: eventData.photo_count || 0,
                cover_image_url: eventData.cover_image_url
              };
              
              // Add this event to the events list
              console.log("Adding specific event to list");
              setEvents(prevEvents => [eventSummary, ...prevEvents]);
              setSelectedEvent(eventIdFromUrl);
            } else {
              console.warn(`Event ID ${eventIdFromUrl} could not be found.`);
            }
          } catch (error) {
            console.error(`Error fetching event ID ${eventIdFromUrl}:`, error);
          }
        } else if (eventIdFromUrl) {
          console.log("Event found in list, selecting it");
          // If the event is in the list, select it
          setSelectedEvent(eventIdFromUrl);
        }
        
      } catch (error) {
        console.error('Failed to load events:', error);
        setErrorMessage('Failed to load events. Please refresh the page.');
      } finally {
        console.log("Setting eventsLoading to false");
        setEventsLoading(false);
      }
    };

    // Only run loadEvents if authenticated and photographer, and not loading
    if (!isLoading && isAuthenticated && isPhotographer) {
      console.log("Calling loadEvents");
      loadEvents();
    }
  }, [isLoading, isAuthenticated, isPhotographer, router, searchParams]);

  // Simpler effect for URL parameter
  useEffect(() => {
    console.log("URL param effect running");
    const eventIdFromUrl = searchParams.get('eventId');
    if (eventIdFromUrl) {
      console.log("Setting URL event ID:", eventIdFromUrl);
      setUrlEventId(eventIdFromUrl);
    }
  }, [searchParams]);

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      
      // Create previews for selected files
      const newPreviews = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      // Clean up old previews
      previews.forEach(preview => URL.revokeObjectURL(preview));
      setPreviews(newPreviews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (!selectedEvent) {
      setErrorMessage('Please select an event');
      return;
    }
    
    if (!files || files.length === 0) {
      setErrorMessage('Please select at least one photo to upload');
      return;
    }
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      const authHeaders = await getAuthHeaders() || {};
      // Ensure we have the user ID in the headers
      if (user?.id && !('x-clerk-user-id' in authHeaders)) {
        authHeaders['x-clerk-user-id'] = user.id;
      }
      
      const totalFiles = files.length;
      let uploadedCount = 0;
      
      // Upload each file individually
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('event_id', selectedEvent);
        formData.append('photo', file);
        // Add the clerk user ID to the form data
        if (user?.id) {
          formData.append('clerk_user_id', user.id);
        }
        
        try {
          await uploadPhoto(formData, authHeaders);
          uploadedCount++;
          // Update progress
          setProgress(Math.round(((i + 1) / totalFiles) * 100));
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
        }
      }
      
      // Show success message
      const selectedEventName = events.find(e => e.id.toString() === selectedEvent)?.name || 'the event';
      setSuccessMessage(`Successfully uploaded ${uploadedCount} of ${totalFiles} photos to ${selectedEventName}`);
      
      // Reset form
      setFiles(null);
      setPreviews([]);
    } catch (error) {
      console.error('Error during batch upload:', error);
      setErrorMessage('An error occurred during the upload process.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <div className="ml-3">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !isPhotographer) {
    return null; // Will be redirected by useEffect
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Upload Photos (Photographer)</h1>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {errorMessage && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex items-center justify-between">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
                <Link 
                  href={`/events/${selectedEvent}`}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Photos
                </Link>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="event" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Select Event
              </label>
              <select
                id="event"
                value={selectedEvent}
                onChange={handleEventChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
                bg-gray-50 dark:bg-gray-700 
                text-gray-900 dark:text-white 
                px-4 py-2
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                hover:border-blue-300 dark:hover:border-blue-500
                transition-colors duration-200"
              >
                <option value="">-- Select an event --</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="photos" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Upload Photos
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload multiple photos</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB each</p>
                  {files && files.length > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400">{files.length} files selected</p>
                  )}
                  
                  {/* Preview section */}
                  {previews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative h-24 w-full">
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="rounded object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm text-center mt-2 text-gray-600 dark:text-gray-400">
                  Uploading {progress}% complete
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => router.push('/photographer/events')}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
} 