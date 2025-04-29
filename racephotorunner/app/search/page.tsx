'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchEvents, searchPhotosByBib, fetchEventPhotos, EventSummary, Photo as ApiPhoto, PhotoSearchResult } from "@/lib/api";

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

// Unified type for both regular photos and search results
type Photo = {
  id: number;
  event_id: number;
  path: string;
  thumbnail_path: string;
  bib_numbers: string[] | null;
  timestamp?: string | null;
  eventName?: string;
  score?: number;
};

export default function SearchPage() {
  const [searchType, setSearchType] = useState<"bib" | "event">("bib");
  const [searchParams, setSearchParams] = useState({
    bibNumber: "",
    eventId: ""
  });
  const [searchResults, setSearchResults] = useState<Photo[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
    
    loadEvents();
  }, []);

  const handleParamChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage(null);
    setSearchResults([]);

    try {
      if (searchType === "bib" && searchParams.bibNumber) {
        // Search by bib number
        const results = await searchPhotosByBib(searchParams.bibNumber);
        
        // Format results
        const formattedResults: Photo[] = results.map(result => {
          // Find the event name for this photo
          const event = events.find(e => e.id === result.event_id);
          return {
            ...result,
            bib_numbers: result.bib_numbers ? [result.bib_numbers] : null,
            eventName: event?.name || 'Unknown Event',
            timestamp: null // Add timestamp property to match Photo type
          };
        });
        
        setSearchResults(formattedResults);
      } 
      else if (searchType === "event" && searchParams.eventId) {
        // Get photos for specific event
        const eventId = parseInt(searchParams.eventId);
        const results = await fetchEventPhotos(eventId);
        
        // Find the event name
        const event = events.find(e => e.id === eventId);
        
        // Format results
        const formattedResults = results.map(photo => ({
          ...photo,
          eventName: event?.name || 'Unknown Event'
        }));
        
        setSearchResults(formattedResults);
      } else {
        setErrorMessage("Please enter search criteria");
      }
    } catch (error) {
      console.error('Search error:', error);
      setErrorMessage('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Search Photos</h1>
          <Link href="/">
            <Button variant="default">Back to Home</Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
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
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Search by</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={searchType === "bib" ? "default" : "outline"}
                onClick={() => setSearchType("bib")}
                className={`flex-1 sm:flex-none ${searchType === "bib" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-gray-700"}`}
              >
                Bib Number
              </Button>
              <Button
                variant={searchType === "event" ? "default" : "outline"}
                onClick={() => setSearchType("event")}
                className={`flex-1 sm:flex-none ${searchType === "event" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-gray-700"}`}
              >
                Event
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {searchType === "bib" && (
              <div>
                <label htmlFor="bibNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Bib Number
                </label>
                <input
                  type="text"
                  id="bibNumber"
                  name="bibNumber"
                  value={searchParams.bibNumber}
                  onChange={handleParamChange}
                  placeholder="Enter bib number (e.g. 1234)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
            )}

            {searchType === "event" && (
              <div>
                <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-1">
                  Event
                </label>
                <select
                  id="eventId"
                  name="eventId"
                  value={searchParams.eventId}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="">Select an event</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  "Search Photos"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Search Results</h2>
            
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No photos found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  We couldn't find any photos matching your search criteria. Please try a different search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchResults.map((photo) => (
                  <div 
                    key={photo.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      <img 
                        src={getFullImageUrl(photo.thumbnail_path)} 
                        alt={`Photo ${photo.id}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="mb-3 space-y-2">
                        {/* Event Name */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Event:</span>
                          <span className="text-sm font-semibold text-gray-900">{photo.eventName}</span>
                        </div>

                        {/* Bib Numbers */}
                        {photo.bib_numbers && photo.bib_numbers.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Number:</span>
                            <div className="flex flex-wrap justify-end gap-1">
                              {photo.bib_numbers.map((bib, index) => (
                                <span 
                                  key={index}
                                  className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded"
                                >
                                  #{bib}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamp if available */}
                        {photo.timestamp && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Time:</span>
                            <span className="text-sm text-gray-900">
                              {new Date(photo.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <a 
                          href={`/api/photos/watermarked/${photo.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md text-sm"
                        >
                          View
                        </a>
                        <button 
                          onClick={() => {
                            const url = `/api/photos/watermarked/${photo.id}`;
                            fetch(url)
                              .then(response => response.blob())
                              .then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = `race-photo-${photo.id}.jpg`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              })
                              .catch(error => console.error('Error downloading image:', error));
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-md text-sm"
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
        )}
      </div>
    </div>
  );
} 