# Auth0 Integration for RacePhotoRunner

This document explains how to complete the Auth0 integration for the RacePhotoRunner application.

## Setup Instructions

### 1. Create an Auth0 Account and Application

1. Sign up for an Auth0 account at [auth0.com](https://auth0.com/) if you don't have one
2. Create a new application in the Auth0 dashboard
   - Choose "Single Page Application" as the application type
   - Select "React" as the technology

### 2. Configure Auth0 Application Settings

In your Auth0 application settings, configure the following:

- **Allowed Callback URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`
- **Allowed Logout URLs**: `http://localhost:3000`

### 3. Create a `.env.local` File

Create a file named `.env.local` in the root of your Next.js project with the following content:

```
# Auth0 configuration
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000
```

Replace `your-auth0-domain.auth0.com` with your actual Auth0 domain and `your-client-id` with your actual Auth0 client ID.

### 4. Install Auth0 SDK

Run the following command to install the Auth0 React SDK:

```bash
npm install @auth0/auth0-react
```

### 5. Update the Auth Configuration

1. Open the file `lib/auth.tsx` and replace the placeholder values with your actual Auth0 credentials:

```tsx
// Replace with your Auth0 domain and client ID
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const AUTH0_REDIRECT_URI = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI;
```

2. Similarly, update the `lib/auth0-utils.ts` file to use the environment variables.

### 6. Complete the Auth0 Implementation

After setting up the environment variables and installing the SDK, you'll need to replace the mock Auth0 implementation with the actual SDK integration. Here's how to update the `lib/auth.tsx` file:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Auth0Provider as Auth0ReactProvider, useAuth0 } from '@auth0/auth0-react';

// Auth0 context to be used throughout the app
export const Auth0Context = createContext<ReturnType<typeof useAuth0> | null>(null);

// Auth0 provider that wraps the application
export function Auth0Provider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Auth0ReactProvider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || 'http://localhost:3000',
      }}
    >
      <Auth0ContextProvider>{children}</Auth0ContextProvider>
    </Auth0ReactProvider>
  );
}

// Component that exposes the Auth0 context
function Auth0ContextProvider({ children }: { children: ReactNode }) {
  const auth0 = useAuth0();

  return (
    <Auth0Context.Provider value={auth0}>
      {children}
    </Auth0Context.Provider>
  );
}

// Hook to use Auth0 authentication
export function useAuth() {
  const context = useContext(Auth0Context);
  
  if (!context) {
    throw new Error('useAuth must be used within an Auth0Provider');
  }
  
  return context;
}
```

### 7. Start the Application

After completing the integration, start your application with:

```bash
npm run dev
```

## Auth0 Authentication Flow

1. The user clicks "Sign in with Auth0" or "Sign up with Auth0"
2. The user is redirected to Auth0's login/signup page
3. After successful authentication, Auth0 redirects back to your application
4. Your application receives the authentication token and stores it
5. The user is now authenticated and can access protected resources

## Benefits of Auth0

- **Security**: Auth0 handles security best practices for you
- **Social Logins**: Easily enable Google, Facebook, and other social logins
- **Customization**: Customize the login experience to match your brand
- **MFA**: Add multi-factor authentication for extra security
- **User Management**: Built-in user management features 