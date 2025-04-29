import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import React from 'react';
import Header from '@/components/Header';
import { Auth0Provider } from '@/lib/auth';
import { PopupProvider } from '@/lib/popup';
import PopupInitializer from '@/lib/popup-initializer';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RacePhotoRunner - Find Your Race Photos',
  description: 'Find, share, and download your race photos with ease.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <Auth0Provider>
          <PopupProvider>
            <Toaster 
              position="top-right" 
              toastOptions={{
                style: {
                  background: '#323232',
                  color: 'white',
                  border: '1px solid #444',
                  fontSize: '14px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                success: {
                  style: {
                    background: '#155e75',
                    border: '1px solid #0e7490',
                  },
                },
                error: {
                  style: {
                    background: '#991b1b',
                    border: '1px solid #b91c1c',
                  },
                },
              }}
            />
            <PopupInitializer />
            <Header />
            <main>{children}</main>
            <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
              <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <p className="text-gray-600">&copy; {new Date().getFullYear()} RacePhotoRunner. All rights reserved.</p>
                  </div>
                  <div className="flex space-x-4">
                    <a href="#" className="text-gray-600 hover:text-blue-600">
                      <span className="material-icons-outlined">help</span>
                      <span className="sr-only">Help</span>
                    </a>
                    <a href="#" className="text-gray-600 hover:text-blue-600">
                      <span className="material-icons-outlined">privacy_tip</span>
                      <span className="sr-only">Privacy</span>
                    </a>
                    <a href="#" className="text-gray-600 hover:text-blue-600">
                      <span className="material-icons-outlined">policy</span>
                      <span className="sr-only">Terms</span>
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </PopupProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
