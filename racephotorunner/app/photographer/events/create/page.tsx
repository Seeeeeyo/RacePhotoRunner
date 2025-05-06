'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/clerk-auth';
import { createEvent, uploadEventCoverImage } from '@/lib/api';
import { toast } from 'sonner';
import Image from 'next/image';
import { Slider } from '@/components/ui/slider';

export default function CreateEventPage() {
  const { isAuthenticated, isLoading, isPhotographer, user, getAuthHeaders } = useAuth();
  const router = useRouter();
  const [unauthorized, setUnauthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    location: '',
    description: '',
    slug: '',
    price_per_photo: 5.00
  });
  
  // Handle input changes for text fields
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle price slider change
  const handleSliderChange = (value: number[]) => {
    setFormData(prev => ({
      ...prev,
      price_per_photo: value[0]
    }));
  };

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      }
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null); // Clear preview if no file is selected
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.eventName || !formData.eventDate || !formData.slug) {
      toast.error('Event name, date, and slug are required');
      return;
    }
    
    // Validate price (assuming you add a price field to formData)
    // Example: Ensure price is within range $1-$15
    const priceInCents = formData.price_per_photo * 100; // Convert dollars to cents
    if (priceInCents < 100 || priceInCents > 1500) {
      toast.error('Price must be between $1.00 and $15.00');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // --- Create a plain JS object for the JSON payload --- 
      const eventData = {
        name: formData.eventName,
        date: `${formData.eventDate}T00:00:00Z`, // Append time and timezone indicator
        location: formData.location,
        description: formData.description,
        slug: formData.slug,
        is_active: true, // Default or get from form state
        price_per_photo: priceInCents, // Use the validated price in cents
      };

      const headers = await getAuthHeaders();
      // --- Pass the plain object to createEvent --- 
      const result = await createEvent(eventData, headers || {});

      // --- Separate Cover Image Upload --- 
      const fileInput = document.getElementById('coverImage') as HTMLInputElement;
      const coverImageFile = fileInput?.files?.[0];

      if (result && coverImageFile) {
        // If event creation was successful and there's a file, upload it
        const imageFormData = new FormData();
        imageFormData.append('cover_image', coverImageFile);
        try {
          await uploadEventCoverImage(result.id, imageFormData, headers || {});
          toast.info('Cover image uploaded successfully.');
        } catch (uploadError) {
          console.error("Cover image upload failed:", uploadError);
          toast.warning("Event created, but cover image upload failed. You can upload it later.");
        }
      }

      if (result) {
        toast.success('Event created successfully!');
        router.push('/photographer/events');
      } else {
        throw new Error('Failed to create event'); // Should not happen if API returns data
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to create event. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // If authentication has loaded and user is not a photographer, mark as unauthorized
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/signin');
      } else if (!isPhotographer) {
        setUnauthorized(true);
      }
    }
  }, [isLoading, isAuthenticated, isPhotographer, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-gray-600">
              Only photographers can create events. Your current role is {user?.role || 'unknown'}.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h1>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">
                Event Name
              </label>
              <input
                type="text"
                id="eventName"
                name="eventName"
                value={formData.eventName}
                onChange={handleTextChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Boston Marathon 2023"
                required
              />
            </div>
            
            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
                Event Date
              </label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleTextChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleTextChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Boston, MA"
              />
            </div>
            
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Event Slug
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleTextChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., boston-marathon-2023 (unique, lowercase, no spaces)"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Unique identifier for the event URL (lowercase, numbers, hyphens).</p>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleTextChange}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Provide details about the event"
              />
            </div>

            {/* Price Slider Input */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price Per Photo: ${formData.price_per_photo.toFixed(2)}
              </label>
              <Slider
                id="price"
                name="price_per_photo"
                min={0.00} // Minimum price $0.50
                max={15.00} // Maximum price $20.00 (adjust as needed)
                step={0.50} // Increment by $0.50
                value={[formData.price_per_photo]}
                onValueChange={handleSliderChange}
                className="mt-2"
              />
               <p className="mt-1 text-xs text-gray-500">Set the price customers will pay for each photo download.</p>
            </div>
            
            <div>
              <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">
                Cover Image
              </label>
              <input
                type="file"
                id="coverImage"
                name="coverImage"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {/* Image Preview Section */}
              {imagePreviewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Image Preview:</p>
                  <Image 
                    src={imagePreviewUrl} 
                    alt="Cover image preview" 
                    width={200}
                    height={100}
                    className="object-cover rounded-md border border-gray-300"
                  />
                </div>
              )}
            </div>
            
            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 