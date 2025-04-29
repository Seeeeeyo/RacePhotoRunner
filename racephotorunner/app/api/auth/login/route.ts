import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Generate a random state parameter to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store the state in a cookie to verify when the user comes back
  const response = NextResponse.redirect(
    `https://dev-in51j4061cl05qgg.us.auth0.com/authorize?` +
    `response_type=code&` +
    `client_id=qckAtWIcgixqe2Ykb64dOuSFw50BUMJp&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/callback')}&` +
    `scope=openid profile email&` +
    `state=${state}`
  );
  
  // Set the state as a cookie
  response.cookies.set('auth0_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  });
  
  return response;
} 