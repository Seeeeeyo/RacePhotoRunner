"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchEvent, fetchEventPhotos, Event, Photo } from "@/lib/api";

// Get the API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Function to create a full URL for image paths
function getFullImageUrl(path: string): string {
  if (!path) return '/placeholder.jpg';
  
  // If the path already starts with http, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Make sure path starts with / for proper joining
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Join API base URL with path
  return `${API_BASE_URL}${normalizedPath}`;
}

// Function to get watermarked image URL by photo ID
function getWatermarkedPhotoUrl(photoId: number): string {
  return `${API_BASE_URL}/api/photos/watermarked/${photoId}`;
}

// Function to apply watermark
function Watermark({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="text-white text-opacity-50 font-bold text-lg transform -rotate-30 select-none" 
           style={{ transform: 'rotate(-30deg)', textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
          RacePhotoRunner
        </p>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterParams, setFilterParams] = useState({
    bibNumber: "",
  });
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    const loadEventData = async () => {
      if (!id || typeof id !== 'string') return;
      
      setIsLoading(true);
      
      try {
        // Convert id to number
        const eventId = parseInt(id);
        if (isNaN(eventId)) {
          console.error("Invalid event ID");
          return;
        }
        
        // Fetch event details from API
        const eventData = await fetchEvent(eventId);
        if (eventData) {
          setEvent(eventData);
          
          // Fetch photos for this event
          const photosData = await fetchEventPhotos(eventId);
          setPhotos(photosData);
          setFilteredPhotos(photosData);
        }
      } catch (error) {
        console.error("Error loading event data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEventData();
  }, [id]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilterParams(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let filtered = [...photos];
    
    // Filter by bib number if provided
    if (filterParams.bibNumber) {
      filtered = filtered.filter(photo => 
        photo.bib_numbers && 
        photo.bib_numbers.some(bib => bib.includes(filterParams.bibNumber))
      );
    }
    
    setFilteredPhotos(filtered);
  };

  const resetFilters = () => {
    setFilterParams({
      bibNumber: "",
    });
    setFilteredPhotos(photos);
  };

  // Helper function to download image with watermark
  const downloadImage = (photoId: number, filename: string) => {
    const watermarkedUrl = getWatermarkedPhotoUrl(photoId);
    
    fetch(watermarkedUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename || 'photo.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => console.error('Error downloading image:', error));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Event Not Found</h1>
          <p className="text-gray-700 mb-6">
            Sorry, we couldn't find the event you're looking for.
          </p>
          <Link href="/events">
            <Button variant="default">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-b from-blue-700 to-blue-900 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Link href="/events" className="text-blue-200 hover:text-white mb-2 inline-flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Events
              </Link>
              <h1 className="text-4xl font-bold">{event.name}</h1>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <div className="flex items-center text-blue-100 mb-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-blue-100">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location}</span>
              </div>
            </div>
            <div>
              {event.description && (
                <p className="text-blue-100">{event.description}</p>
              )}
              <div className="mt-2 text-blue-100">
                <span className="font-medium">{photos.length} photos available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-black">Filter Photos</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="bibNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Bib Number
              </label>
              <input
                type="text"
                id="bibNumber"
                name="bibNumber"
                value={filterParams.bibNumber}
                onChange={handleFilterChange}
                placeholder="Enter bib number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-6 text-black">Photos ({filteredPhotos.length})</h2>
        
        {filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No photos found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              No photos match your filter criteria. Try adjusting your filters or click "Reset" to show all photos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPhotos.map((photo) => (
              <div 
                key={photo.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[4/3]">
                  <Watermark>
                    <img 
                      src={getFullImageUrl(photo.thumbnail_path)} 
                      alt={`Photo ${photo.id}`} 
                      className="w-full h-full object-cover"
                    />
                  </Watermark>
                </div>
                <div className="p-4">
                  {photo.bib_numbers && photo.bib_numbers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {photo.bib_numbers.map((bib, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded"
                        >
                          Bib #{bib}
                        </span>
                      ))}
                    </div>
                  )}
                  {photo.timestamp && (
                    <div className="text-sm text-gray-600 mb-3">
                      {new Date(photo.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                  <div className="flex flex-col space-y-2">
                    <a 
                      href={getWatermarkedPhotoUrl(photo.id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-center text-sm font-medium text-blue-600 hover:text-blue-800 py-1 border border-blue-200 rounded-md hover:bg-blue-50"
                    >
                      View Full Size
                    </a>
                    <button 
                      onClick={() => downloadImage(photo.id, `race-photo-${photo.id}.jpg`)}
                      className="block text-center text-sm font-medium text-green-600 hover:text-green-800 py-1 border border-green-200 rounded-md hover:bg-green-50"
                    >
                      Download
                    </button>
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