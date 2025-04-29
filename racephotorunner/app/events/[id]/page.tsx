"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchEvent, fetchEventPhotos, Event, Photo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { showAlert, showConfirm, showToast } from '@/lib/popup';

// Get the API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Function to build API URL
function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/api/${normalizedPath}`;
}

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
  const { isAdmin, getAuthHeaders } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterParams, setFilterParams] = useState({
    bibNumber: "",
  });
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Function to handle photo navigation
  const handlePhotoNavigation = (direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;
    
    const newIndex = direction === 'next' 
      ? (selectedPhotoIndex + 1) % filteredPhotos.length
      : (selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    
    setSelectedPhotoIndex(newIndex);
  };

  // Function to handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isViewerOpen) return;
      
      if (e.key === 'ArrowRight') handlePhotoNavigation('next');
      if (e.key === 'ArrowLeft') handlePhotoNavigation('prev');
      if (e.key === 'Escape') setIsViewerOpen(false);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isViewerOpen, selectedPhotoIndex, filteredPhotos.length]);

  // Effect to handle body scroll lock
  useEffect(() => {
    if (isViewerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to reset overflow when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isViewerOpen]);

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

  // Function to handle untagging request
  const handleUntag = async (photoId: number, bibNumber: string) => {
    try {
      // If admin, directly update the database
      if (isAdmin) {
        // NOTE: Auth temporarily disabled on the server, so we don't need to send auth headers
        const authHeaders = getAuthHeaders() || {};
        
        // Use the dedicated untag endpoint
        const response = await fetch(buildApiUrl(`photos/${photoId}/untag`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Auth temporarily disabled on server
            // ...authHeaders
          },
          body: JSON.stringify({ bib_number: bibNumber })
        });
        
        if (!response.ok) {
          throw new Error(`Error untagging: ${response.status} - ${await response.text()}`);
        }
        
        // Update UI: remove the bib number from the photo
        setPhotos(prev => 
          prev.map(photo => 
            photo.id === photoId 
              ? { 
                  ...photo, 
                  bib_numbers: photo.bib_numbers ? photo.bib_numbers.filter(bib => bib !== bibNumber) : null 
                } 
              : photo
          )
        );
        
        setFilteredPhotos(prev => 
          prev.map(photo => 
            photo.id === photoId 
              ? { 
                  ...photo, 
                  bib_numbers: photo.bib_numbers ? photo.bib_numbers.filter(bib => bib !== bibNumber) : null 
                } 
              : photo
          )
        );
        
        showToast(`Removed Bib #${bibNumber} tag from photo.`, 'success');
      } else {
        // For regular users, send an untag report
        console.log(`Request to untag Photo ID: ${photoId} from Bib: ${bibNumber}`);
        
        const response = await fetch(buildApiUrl(`photos/reports/untag`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            photo_id: photoId, 
            bib_number: bibNumber,
            reason: "User reported incorrect tag"
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error reporting untag: ${response.status} - ${await response.text()}`);
        }
        
        showToast(`Untag request sent for Bib #${bibNumber}. This will be reviewed by an admin.`, 'info');
      }
    } catch (error) {
      console.error("Failed to untag/report:", error);
      showAlert("Error", "Failed to process your request. Please try again.", 'error');
    }
  };

  // Function to handle photo deletion (admin only)
  const handleDeletePhoto = async (photoId: number) => {
    if (!isAdmin) {
      showAlert("Access Denied", "Only admins can delete photos.", 'error');
      return;
    }
    
    showConfirm(
      "Delete Photo",
      `Are you sure you want to delete photo ID: ${photoId}? This cannot be undone.`,
      async () => {
        try {
          const authHeaders = getAuthHeaders() || {};
          
          const response = await fetch(buildApiUrl(`photos/${photoId}`), {
            method: 'DELETE',
            headers: {
              // Auth temporarily disabled on server
              // ...authHeaders
            }
          });
          
          if (!response.ok) {
            throw new Error(`Error deleting photo: ${response.status} - ${await response.text()}`);
          }
          
          // Update UI state upon successful deletion
          setPhotos(prev => prev.filter(p => p.id !== photoId));
          setFilteredPhotos(prev => prev.filter(p => p.id !== photoId));
          
          // If deleting from viewer, close it or navigate
          if (isViewerOpen && selectedPhotoIndex !== null) {
            if (filteredPhotos.length <= 1) {
              // No more photos to view, close the viewer
              setIsViewerOpen(false);
            } else if (photoId === filteredPhotos[selectedPhotoIndex].id) {
              // Deleted the current photo, navigate to the next one or previous if last
              const newIndex = selectedPhotoIndex === filteredPhotos.length - 1 
                ? selectedPhotoIndex - 1 
                : selectedPhotoIndex;
              setSelectedPhotoIndex(newIndex);
            }
          }
          
          showToast("Photo deleted successfully.", 'success');
        } catch (error) {
          console.error("Failed to delete photo:", error);
          showAlert("Error", "Failed to delete photo. Please try again.", 'error');
        }
      }
    );
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
            {filteredPhotos.map((photo, index) => (
              <div 
                key={photo.id}
                className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 h-[340px] flex flex-col transform hover:-translate-y-1 cursor-pointer"
                onClick={() => {
                  setSelectedPhotoIndex(index);
                  setIsViewerOpen(true);
                }}
              >
                <div className="relative w-full h-[200px] flex-shrink-0">
                  <Watermark>
                    <img 
                      src={getFullImageUrl(photo.thumbnail_path)} 
                      alt={`Photo ${photo.id}`} 
                      className="w-full h-[200px] object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ objectPosition: 'center center' }}
                    />
                  </Watermark>
                  <div className="absolute top-2 left-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-black/50 text-white rounded backdrop-blur-sm">
                      Photographer #1
                    </span>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    {photo.bib_numbers && photo.bib_numbers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1 items-center">
                        {photo.bib_numbers.map((bib, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded"
                          >
                            Bib #{bib}
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleUntag(photo.id, bib); 
                              }}
                              className="ml-1 p-0.5 rounded-full text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              aria-label={`Report incorrect tag for bib ${bib}`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {photo.timestamp && (
                      <div className="text-xs text-gray-600">
                        {new Date(photo.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(photo.id, `race-photo-${photo.id}.jpg`);
                      }}
                      className="flex-1 text-center text-sm font-medium text-green-600 hover:text-green-800 py-1 border border-green-200 rounded-md hover:bg-green-50 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add to cart functionality will be implemented later
                      }}
                      className="flex-1 text-center text-sm font-medium text-blue-600 hover:text-blue-800 py-1 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Add to Cart
                    </button>
                    {/* Admin Delete Button - Card */}
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleDeletePhoto(photo.id);
                        }}
                        className="flex-none text-center text-sm font-medium text-red-600 hover:text-red-800 py-1 px-2 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                        aria-label={`Delete photo ${photo.id}`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Viewer Modal */}
        {isViewerOpen && selectedPhotoIndex !== null && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Close if the click is directly on the backdrop
              if (e.target === e.currentTarget) {
                setIsViewerOpen(false);
              }
            }}
          >
            {/* Modal Content container - prevents clicks inside from closing */}
            <div 
              className="relative w-full h-full flex flex-col max-w-screen-xl max-h-screen-90vh bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={() => setIsViewerOpen(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Counter */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
                {selectedPhotoIndex + 1} / {filteredPhotos.length}
              </div>

              {/* Main image and navigation container */}
              <div className="flex-1 flex items-center justify-center p-4 relative">
                {/* Navigation button: Previous */}
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePhotoNavigation('prev'); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
                  aria-label="Previous photo"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Image */}
                <img 
                  src={getWatermarkedPhotoUrl(filteredPhotos[selectedPhotoIndex].id)}
                  alt={`Photo ${filteredPhotos[selectedPhotoIndex].id}`}
                  className="max-h-[80vh] max-w-[80vw] object-contain block"
                />

                {/* Navigation button: Next */}
                <button 
                  onClick={(e) => { /* No stopPropagation needed here */ handlePhotoNavigation('next'); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
                  aria-label="Next photo"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Bottom toolbar */}
              <div className="bg-black/70 backdrop-blur-sm p-3 flex items-center justify-between z-10">
                {/* Photo details */}
                <div className="text-white text-sm space-y-1">
                  <p>Photographer: Photographer #1</p>
                  {filteredPhotos[selectedPhotoIndex].bib_numbers && filteredPhotos[selectedPhotoIndex].bib_numbers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>Bib Numbers:</span>
                      {filteredPhotos[selectedPhotoIndex].bib_numbers.map((bib, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded"
                        >
                          Bib #{bib}
                          <button 
                            onClick={() => handleUntag(filteredPhotos[selectedPhotoIndex].id, bib)}
                            className="ml-1 p-0.5 rounded-full text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label={`Report incorrect tag for bib ${bib}`}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={() => downloadImage(filteredPhotos[selectedPhotoIndex].id, `race-photo-${filteredPhotos[selectedPhotoIndex].id}.jpg`)}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Download
                  </button>
                  <button 
                    onClick={() => {
                      // Add to cart functionality will be implemented later
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add to Cart
                  </button>
                  {/* Admin Delete Button - Modal */}
                  {isAdmin && (
                     <button 
                       onClick={() => handleDeletePhoto(filteredPhotos[selectedPhotoIndex].id)}
                       className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                       aria-label={`Delete photo ${filteredPhotos[selectedPhotoIndex].id}`}
                     >
                       <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                       </svg>
                     </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 