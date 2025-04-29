import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import { Auth0Provider } from '@/lib/auth';

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
        </Auth0Provider>
      </body>
    </html>
  );
}
