'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/clerk-auth';
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Routes } from '@/lib/routes';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { isAuthenticated, isLoading, isAdmin, user, isPhotographer, isAthlete } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Home', href: Routes.HOME },
    { name: 'Events', href: Routes.EVENTS },
    { name: 'Search', href: Routes.SEARCH },
  ];

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={Routes.HOME} className="text-blue-600 font-bold text-xl">
                RacePhotoRunner
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isLoading ? (
              <div className="h-5 w-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            ) : isAuthenticated ? (
              <div className="ml-3 relative flex items-center space-x-4">
                {user?.role && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'photographer' ? 'bg-green-100 text-green-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => router.push(Routes.ADMIN_DASHBOARD)}
                    className="px-3 py-2 rounded-md text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                  >
                    Admin
                  </button>
                )}
                {isPhotographer && (
                  <button 
                    onClick={() => router.push(Routes.PHOTOGRAPHER_EVENT_CREATE)}
                    className="px-3 py-2 rounded-md text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Create Event
                  </button>
                )}
                <UserButton afterSignOutUrl={Routes.HOME} />
              </div>
            ) : (
              <div className="flex space-x-4">
                <SignInButton mode="modal">
                  <button className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Sign up
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {isLoading ? (
              <div className="px-4 py-2 flex justify-center">
                <div className="h-5 w-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-1">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-gray-500">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <p className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-blue-800' :
                      user.role === 'photographer' ? 'bg-purple-100 text-blue-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      router.push(Routes.ADMIN_DASHBOARD);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-base font-medium bg-amber-50 text-amber-800"
                  >
                    Admin Dashboard
                  </button>
                )}
                {isPhotographer && (
                  <button 
                    onClick={() => {
                      router.push(Routes.PHOTOGRAPHER_EVENT_CREATE);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-base font-medium bg-green-50 text-green-800"
                  >
                    Create Event
                  </button>
                )}
                <div className="px-4 py-2">
                  <UserButton afterSignOutUrl={Routes.HOME} />
                </div>
              </div>
            ) : (
              <div className="space-y-1 px-4 flex flex-col">
                <SignInButton mode="modal">
                  <button className="py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-left">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-left">
                    Sign up
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
} 