'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { fetchEvent } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
    is_active: true,
    slug: '',
  });
  
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const eventData = await fetchEvent(parseInt(id as string));
        if (eventData) {
          setFormData({
            name: eventData.name,
            date: new Date(eventData.date).toISOString().split('T')[0], // Format date for input
            location: eventData.location,
            description: eventData.description || '',
            is_active: eventData.is_active,
            slug: eventData.slug,
          });
          if (eventData.cover_image_path) {
            setCoverImagePreview(`${API_BASE_URL}${eventData.cover_image_path}`);
          }
        }
      } catch (error) {
        console.error('Error loading event:', error);
        setError('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });
      
      if (coverImage) {
        formDataToSend.append('cover_image', coverImage);
      }

      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`Error updating event: ${response.statusText}`);
      }

      setSuccessMessage('Event updated successfully');
      router.push('/admin/events');
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Edit Event</h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Event Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
              bg-gray-50 dark:bg-gray-700 
              text-gray-900 dark:text-white 
              px-4 py-2
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-blue-300 dark:hover:border-blue-500
              transition-colors duration-200"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Event Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
              bg-gray-50 dark:bg-gray-700 
              text-gray-900 dark:text-white 
              px-4 py-2
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-blue-300 dark:hover:border-blue-500
              transition-colors duration-200"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
              bg-gray-50 dark:bg-gray-700 
              text-gray-900 dark:text-white 
              px-4 py-2
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-blue-300 dark:hover:border-blue-500
              transition-colors duration-200"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
              bg-gray-50 dark:bg-gray-700 
              text-gray-900 dark:text-white 
              px-4 py-2
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-blue-300 dark:hover:border-blue-500
              transition-colors duration-200
              resize-none"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
              bg-gray-50 dark:bg-gray-700 
              text-gray-900 dark:text-white 
              px-4 py-2
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              hover:border-blue-300 dark:hover:border-blue-500
              transition-colors duration-200"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
              Active
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Cover Image
            </label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {coverImagePreview && (
              <div className="mt-4">
                <Image
                  src={coverImagePreview}
                  alt="Cover preview"
                  width={300}
                  height={200}
                  className="rounded-lg object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/events')}
              disabled={isSaving}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 