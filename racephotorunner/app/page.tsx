import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            RacePhotoRunner
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Find and share your race day photos with ease. Browse by event, search
            by bib number, or filter by your outfit color.
          </p>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
              <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Browse Events</h2>
              <p className="text-gray-600 mb-4">
                Explore our collection of race events. Find your marathon, 5K, triathlon, or any other race you participated in.
              </p>
              <Link href="/events" className="block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                View Events
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
              <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Find Your Photos</h2>
              <p className="text-gray-600 mb-4">
                Search for your race photos using your bib number, appearance details, or by browsing specific event locations.
              </p>
              <Link href="/search" className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md">
                Search Photos
              </Link>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl mb-4 mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold text-center mb-3">Browse Events</h3>
              <p className="text-gray-600 text-center">
                Find your race from our collection of events. We cover marathons, half-marathons, 10Ks, and more.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl mb-4 mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold text-center mb-3">Search Photos</h3>
              <p className="text-gray-600 text-center">
                Use your bib number or search by your outfit color and location to find photos of you during the race.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl mb-4 mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold text-center mb-3">Share & Download</h3>
              <p className="text-gray-600 text-center">
                View, download, and share your photos with friends and family or on social media with just a few clicks.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to find your race photos?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/events" className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-md font-medium">
              Browse Events
            </Link>
            <Link href="/search" className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-md font-medium">
              Search Photos
            </Link>
            <Link href="/signup" className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-md font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
