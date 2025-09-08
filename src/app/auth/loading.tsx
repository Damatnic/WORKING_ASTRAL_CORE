/**
 * Authentication Loading Component
 * Secure loading state for auth pages
 */

import { LoadingPresets } from '@/components/loading';

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Secure Authentication
            </h2>
            <p className="text-gray-600">
              Preparing secure sign-in experience
            </p>
          </div>
          
          <LoadingPresets.Minimal message="Loading authentication..." />
          
          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              Your privacy and security are our top priority
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}