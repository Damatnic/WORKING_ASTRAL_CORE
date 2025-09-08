'use client';

// App-level error page
// Displays when unhandled errors occur in the app

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('App-level error:', error);
    
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          timestamp: new Date().toISOString(),
          type: 'app_error',
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(console.error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-pink-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-xl shadow-2xl p-8 text-center">
            {/* Error icon */}
            <div className="mb-6">
              <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 text-lg">
                We encountered an unexpected error. Don&apos;t worry, our team has been automatically notified and is working on a fix.
              </p>
            </div>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Development Error Details:</h3>
                <p className="text-sm text-red-700 font-mono break-all mb-2">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600">
                    Error Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Reload Page
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>
              </div>
            </div>

            {/* Support information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-500 mb-3">
                If this problem persists, please contact our support team.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href="/status"
                  className="text-sm text-purple-600 hover:text-purple-700 underline"
                >
                  Check System Status
                </a>
                <span className="hidden sm:inline text-gray-300">•</span>
                <a
                  href="mailto:support@astralcore.app"
                  className="text-sm text-purple-600 hover:text-purple-700 underline"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}