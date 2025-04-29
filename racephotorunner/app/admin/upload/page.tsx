'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { fetchEvents, uploadPhoto, EventSummary } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

export default function AdminUploadPage() {
  const { isAuthenticated, isLoading, isAdmin, user, getAuthHeaders } = useAuth();
  const router = useRouter();
  
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load events when the component mounts
  useEffect(() => {
    // Only admin users should access this page
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/signin?redirect=/admin/upload');
      return;
    }

    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const eventsData = await fetchEvents();
        setEvents(eventsData);
      } catch (error) {
        console.error('Failed to load events:', error);
        setErrorMessage('Failed to load events. Please refresh the page.');
      } finally {
        setEventsLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      loadEvents();
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will be redirected by useEffect
  }

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
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
      const authHeaders = getAuthHeaders() || {};
      const totalFiles = files.length;
      let uploadedCount = 0;
      
      // Upload each file individually
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('event_id', selectedEvent);
        formData.append('photo', file);
        
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
    } catch (error) {
      console.error('Error during batch upload:', error);
      setErrorMessage('An error occurred during the upload process.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AdminLayout title="Upload Photos">
      <div className="bg-white shadow rounded-lg p-6">
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
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">
              Select Event
            </label>
            <select
              id="event"
              value={selectedEvent}
              onChange={handleEventChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
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
            <label htmlFor="photos" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Photos
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
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
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                {files && files.length > 0 && (
                  <p className="text-sm text-green-600">{files.length} files selected</p>
                )}
              </div>
            </div>
          </div>

          {isUploading && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Progress
              </label>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {progress}% complete
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isUploading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isUploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Upload Photos'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 