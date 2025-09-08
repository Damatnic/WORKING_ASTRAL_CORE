// 404 Not Found page
// Displays when a page cannot be found

import { Search, Home, ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
            404
          </div>
          <div className="relative">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto animate-bounce" />
          </div>
        </div>

        {/* Error message */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            We couldn&apos;t find the page you&apos;re looking for.
          </p>
          <p className="text-gray-500">
            The page might have been moved, deleted, or you might have typed the wrong URL.
          </p>
        </div>

        {/* Navigation options */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Popular Pages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/therapy"
              className="flex items-center p-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              AI Therapy Assistant
            </Link>
            <Link
              href="/community"
              className="flex items-center p-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
              Community Support
            </Link>
            <Link
              href="/crisis"
              className="flex items-center p-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
              Crisis Resources
            </Link>
            <Link
              href="/wellness"
              className="flex items-center p-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Wellness Tools
            </Link>
          </div>
        </div>

        {/* Search suggestion */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
          <div className="flex items-center justify-center text-gray-700">
            <Search className="w-5 h-5 mr-2" />
            <span className="text-sm">
              Can&apos;t find what you&apos;re looking for? Try our{' '}
              <Link href="/search" className="text-purple-600 hover:text-purple-700 underline font-medium">
                search feature
              </Link>
            </span>
          </div>
        </div>

        {/* Support information */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Need help? Check our{' '}
            <Link href="/status" className="text-purple-600 hover:text-purple-700 underline">
              system status
            </Link>
            {' '}or{' '}
            <a href="mailto:support@astralcore.app" className="text-purple-600 hover:text-purple-700 underline">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}