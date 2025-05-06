'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with title */}
      <header className="bg-white shadow">
        {/* <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <div>
              <Link
                href="/admin/dashboard"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div> */}
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 