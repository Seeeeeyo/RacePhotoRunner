import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }
  
  try {
    // Exchange code for token
    const tokenResponse = await fetch(`https://dev-in51j4061cl05qgg.us.auth0.com/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: 'qckAtWIcgixqe2Ykb64dOuSFw50BUMJp',
        client_secret: process.env.AUTH0_CLIENT_SECRET || '',
        code,
        redirect_uri: 'http://localhost:3000/api/auth/callback'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(new URL('/?error=token_exchange', request.url));
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get user info
    const userInfoResponse = await fetch('https://dev-in51j4061cl05qgg.us.auth0.com/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!userInfoResponse.ok) {
      return NextResponse.redirect(new URL('/?error=user_info', request.url));
    }
    
    const userData = await userInfoResponse.json();
    
    // Check if there's a stored redirect URL
    const redirectScript = `
      <script>
        try {
          const redirectUrl = sessionStorage.getItem('auth0_redirect_after_login');
          if (redirectUrl) {
            sessionStorage.removeItem('auth0_redirect_after_login');
            window.location.href = redirectUrl;
          } else {
            window.location.href = '/';
          }
        } catch (e) {
          window.location.href = '/';
        }
      </script>
    `;
    
    // Set cookies with tokens
    const response = NextResponse.next();
    
    // Convert response to HTML that will handle the redirect
    const htmlResponse = new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting...</title>
        </head>
        <body>
          <p>Signing you in...</p>
          ${redirectScript}
        </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
    
    // Set secure cookies with tokens and user data
    htmlResponse.cookies.set('auth0_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in,
      path: '/'
    });
    
    if (tokenData.refresh_token) {
      htmlResponse.cookies.set('auth0_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/'
      });
    }
    
    // Create a stripped-down user object with essential information
    const userInfo = {
      sub: userData.sub,
      name: userData.name,
      email: userData.email,
      picture: userData.picture
    };
    
    // Set a user info cookie (non-sensitive data)
    htmlResponse.cookies.set('auth0_user', JSON.stringify(userInfo), {
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in,
      path: '/',
      httpOnly: false // Allow JavaScript access
    });
    
    return htmlResponse;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
} 