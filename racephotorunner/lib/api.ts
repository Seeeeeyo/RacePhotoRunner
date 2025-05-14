// API client for RacePhotoRunner backend
// This file contains functions to interact with the backend API

// Ensure the API base URL *always* includes /api
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api') 
    ? RAW_API_BASE_URL 
    : RAW_API_BASE_URL.endsWith('/') 
        ? `${RAW_API_BASE_URL}api` 
        : `${RAW_API_BASE_URL}/api`;

// Types
export interface EventSummary {
  id: number;
  name: string;
  date: string;
  location: string;
  slug: string;
  photo_count: number;
  cover_image_url?: string;
  cover_image_path?: string;
}

export interface Event extends EventSummary {
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Photo {
  id: number;
  event_id: number;
  path: string;
  thumbnail_path: string;
  bib_numbers: string[] | null;
  timestamp: string | null;
}

export interface PhotoSearchResult {
  id: number;
  event_id: number;
  path: string;
  thumbnail_path: string;
  bib_numbers: string;
  score: number;
}

// API functions
export async function fetchEvents(): Promise<EventSummary[]> {
  try {
    const response = await fetch(API_BASE_URL + '/events');
    
    if (!response.ok) {
      throw new Error(`Error fetching events: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export async function fetchEvent(id: number): Promise<Event | null> {
  try {
    const response = await fetch(API_BASE_URL + `/events/${id}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching event: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching event ${id}:`, error);
    return null;
  }
}

export async function fetchEventPhotos(eventId: number, skip = 0, limit = 50): Promise<Photo[]> {
  try {
    const response = await fetch(API_BASE_URL + `/events/${eventId}/photos?skip=${skip}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching photos: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching photos for event ${eventId}:`, error);
    return [];
  }
}

export async function searchPhotosByBib(bibNumber: string): Promise<PhotoSearchResult[]> {
  try {
    const response = await fetch(API_BASE_URL + `/photos/search?bib_number=${encodeURIComponent(bibNumber)}`);
    
    if (!response.ok) {
      throw new Error(`Error searching photos: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error searching photos for bib ${bibNumber}:`, error);
    return [];
  }
}

export const createEvent = async (eventData: Record<string, any>, headers: HeadersInit) => {
  // Construct URL relative to the guaranteed API base URL
  const url = `${API_BASE_URL}/events/`; 
  console.log("POSTing Event Data to URL:", url);
  console.log("Event Data:", JSON.stringify(eventData)); // Log data being sent
  try {
    const response = await fetch(url, { // Use the explicitly constructed URL
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      let errorDetail = 'Failed to create event';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) { /* Ignore if response is not JSON */ }
      console.error(`Error creating event: ${response.status} ${errorDetail}`);
      throw new Error(`Error creating event: ${response.status}`);
    }

    const responseBody = await response.text();
    if (!responseBody) {
        return null;
    }
    return JSON.parse(responseBody);

  } catch (error) {
    console.error('Error in createEvent:', error);
    throw error;
  }
}

export async function uploadPhoto(photoData: FormData, authHeaders: HeadersInit | undefined): Promise<Photo | null> {
  try {
    // Get the Clerk user ID from auth headers and append to form data if available
    const userId = authHeaders && 'x-clerk-user-id' in authHeaders ? authHeaders['x-clerk-user-id'] : null;
    if (userId && !photoData.has('clerk_user_id')) {
      photoData.append('clerk_user_id', userId.toString());
    }
    
    const response = await fetch(API_BASE_URL + '/photos/upload', {
      method: 'POST',
      headers: authHeaders || {},
      body: photoData,
      credentials: 'include', // Include cookies for CORS
    });
    
    if (!response.ok) {
      throw new Error(`Error uploading photo: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
}

export async function createEventJson(eventData: {
  name: string;
  date: string;
  location: string;
  description: string;
  is_active: boolean;
  slug: string;
}, headers: HeadersInit): Promise<Event | null> {
  try {
    const response = await fetch(API_BASE_URL + '/events/', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      let errorDetail = `Error creating event: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
            if (Array.isArray(errorData.detail)) {
                errorDetail = errorData.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
            } else if (typeof errorData.detail === 'string') {
                errorDetail = errorData.detail;
            }
        } else {
             errorDetail = `Error creating event: ${response.status} - ${await response.text()}`;
        }
      } catch (e) { 
        errorDetail = `Error creating event: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

// Authentication functions
export async function login(username: string, password: string): Promise<{ access_token: string, token_type: string } | null> {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(API_BASE_URL + '/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Error logging in: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error logging in:', error);
    return null;
  }
}

export async function register(userData: { username: string, email: string, password: string }): Promise<any | null> {
  try {
    const response = await fetch(API_BASE_URL + '/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`Error registering: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error registering:', error);
    return null;
  }
}

export async function getCurrentUser(authHeaders: Record<string, string>): Promise<any | null> {
  try {
    const response = await fetch(API_BASE_URL + '/auth/me', {
      headers: {
        ...authHeaders
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching user: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function updateEvent(eventId: number, eventData: FormData): Promise<Event | null> {
  try {
    const response = await fetch(API_BASE_URL + `/events/${eventId}`, {
      method: 'PUT',
      body: eventData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error updating event: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// Helper function to get full image URL
export function getFullImageUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder.jpg';
  
  // If the path already starts with http, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Make sure path starts with / for proper joining
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Join API base URL with path
  return `${baseUrl}${normalizedPath}`;
}

// Function to upload event cover image
export const uploadEventCoverImage = async (eventId: number, formData: FormData, headers: HeadersInit) => {
  // Construct URL relative to the guaranteed API base URL
  const url = `${API_BASE_URL}/events/${eventId}/cover-image`;
  console.log("POSTing Cover Image to URL:", url);
  try {
    const response = await fetch(url, { // Use the explicitly constructed URL
      method: 'POST',
      headers: {
        ...headers, // Pass existing auth headers, Content-Type will be set by browser for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      let errorDetail = 'Failed to upload cover image';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) { /* Ignore if response is not JSON */ }
      console.error(`Error uploading cover image: ${response.status} ${errorDetail}`);
      throw new Error(`Error uploading cover image: ${response.status}`);
    }

    return await response.json(); // Assuming the endpoint returns the updated event
  } catch (error) {
    console.error('Error in uploadEventCoverImage:', error);
    throw error; // Re-throw the error for the calling component to handle
  }
}; 