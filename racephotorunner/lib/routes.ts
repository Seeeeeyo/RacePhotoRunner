export const Routes = {
  HOME: '/',
  EVENTS: '/events',
  EVENT_DETAIL: (id: string) => `/events/${id}`,
  SEARCH: '/search',
  SIGN_IN: '/signin',
  SIGN_UP: '/signup',
  SELECT_ROLE: '/select-role',
  
  // Admin Routes
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_EVENTS: '/admin/events',
  ADMIN_EVENT_EDIT: (id: string) => `/admin/events/${id}/edit`,
  ADMIN_UPLOAD: '/admin/upload',

  // Photographer Routes
  PHOTOGRAPHER_DASHBOARD: '/photographer/dashboard',
  PHOTOGRAPHER_EVENT_CREATE: '/photographer/events/create',
  PHOTOGRAPHER_UPLOAD: '/photographer/upload',

  // Add other routes as needed
}; 