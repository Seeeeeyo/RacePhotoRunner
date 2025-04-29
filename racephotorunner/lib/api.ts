// API client for RacePhotoRunner backend
// This file contains functions to interact with the backend API

// Make sure the API base URL is correct
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Helper function to ensure proper URL construction
function buildApiUrl(path: string): string {
  // Remove any leading slash from the path
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // If API_BASE_URL already has /api at the end, just append the path
  if (API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}/${cleanPath}`;
  }
  
  // If API_BASE_URL has /api/ at the end, just append the path
  if (API_BASE_URL.endsWith('/api/')) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  
  // If API_BASE_URL doesn't have /api, add it
  if (!API_BASE_URL.includes('/api')) {
    const baseWithoutTrailingSlash = API_BASE_URL.endsWith('/') 
      ? API_BASE_URL.slice(0, -1) 
      : API_BASE_URL;
    return `${baseWithoutTrailingSlash}/api/${cleanPath}`;
  }
  
  // Default case: just join with a slash
  return `${API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/'}${cleanPath}`;
}

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
    const response = await fetch(buildApiUrl('events'));
    
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
    const response = await fetch(buildApiUrl(`events/${id}`));
    
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
    const response = await fetch(buildApiUrl(`events/${eventId}/photos?skip=${skip}&limit=${limit}`));
    
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
    const response = await fetch(buildApiUrl(`photos/search?bib_number=${encodeURIComponent(bibNumber)}`));
    
    if (!response.ok) {
      throw new Error(`Error searching photos: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error searching photos for bib ${bibNumber}:`, error);
    return [];
  }
}

export async function createEvent(eventData: FormData, authHeaders: Record<string, string>): Promise<Event | null> {
  try {
    const response = await fetch(buildApiUrl('events'), {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: eventData
    });
    
    if (!response.ok) {
      throw new Error(`Error creating event: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

export async function uploadPhoto(photoData: FormData, authHeaders: Record<string, string>): Promise<Photo | null> {
  try {
    const response = await fetch(buildApiUrl('photos/upload'), {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: photoData
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
}): Promise<Event | null> {
  try {
    const response = await fetch(buildApiUrl('events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error creating event: ${response.status}`);
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

    const response = await fetch(buildApiUrl('auth/token'), {
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
    const response = await fetch(buildApiUrl('auth/register'), {
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
    const response = await fetch(buildApiUrl('auth/me'), {
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
    const response = await fetch(buildApiUrl(`events/${eventId}`), {
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