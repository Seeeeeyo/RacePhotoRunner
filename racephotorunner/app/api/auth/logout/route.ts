import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Create a response that redirects to the home page
  const response = NextResponse.redirect(new URL('/', request.url));
  
  // Clear all auth cookies
  response.cookies.set('auth0_access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
  
  response.cookies.set('auth0_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
  
  response.cookies.set('auth0_user', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
  
  response.cookies.set('auth0_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
  
  return response;
} 