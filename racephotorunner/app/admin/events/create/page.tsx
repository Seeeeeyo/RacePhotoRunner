'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { createEvent } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

export default function CreateEventPage() {
  const { isAuthenticated, isLoading, isAdmin, user, getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Only admin users should access this page
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/signin?redirect=/admin/events/create');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setCoverPreview(reader.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    // Validate required fields
    if (!formData.name || !formData.date || !formData.location) {
      setErrorMessage('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object to send to API
      const eventFormData = new FormData();
      eventFormData.append('name', formData.name);
      eventFormData.append('date', formData.date);
      eventFormData.append('location', formData.location);
      
      if (formData.description) {
        eventFormData.append('description', formData.description);
      }
      
      eventFormData.append('is_active', formData.is_active.toString());
      
      // Add slug based on event name (convert to lowercase, replace spaces with dashes)
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-');
      eventFormData.append('slug', slug);
      
      // Add cover image if available
      if (coverImage) {
        eventFormData.append('cover_image', coverImage);
      }
      
      // Get auth headers from Auth context
      const authHeaders = getAuthHeaders() || {};
      
      // Submit the event data to the API
      const result = await createEvent(eventFormData, authHeaders);
      
      if (result) {
        router.push('/admin/dashboard');
      } else {
        setErrorMessage('Failed to create event. Please try again.');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setErrorMessage('An error occurred while creating the event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Create New Event">
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
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1">
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black !text-black"
                  placeholder="e.g. Boston Marathon 2024"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Date*
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black !text-black"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location*
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black !text-black"
                  placeholder="e.g. Boston, MA"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Make event public</span>
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Public events are visible to all users on the events page.
                </p>
              </div>
            </div>

            <div className="col-span-1">
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black !text-black"
                  rows={4}
                  placeholder="Enter event details and information"
                ></textarea>
              </div>

              <div className="mb-6">
                <label htmlFor="cover-image" className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  {coverPreview ? (
                    <div className="space-y-2 text-center">
                      <img src={coverPreview} alt="Cover preview" className="mx-auto h-32 w-auto object-cover rounded" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImage(null);
                            setCoverPreview(null);
                          }}
                          className="text-red-600 hover:text-red-500"
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  ) : (
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
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a cover image</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleCoverImageChange}
                            accept="image/*"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Link href="/admin/dashboard">
              <button
                type="button"
                className="mr-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 