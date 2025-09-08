'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { Toaster } from 'react-hot-toast';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        {children}
        
        {/* Toast notifications with accessibility support */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 6000, // Longer duration for accessibility
            style: {
              background: '#363636',
              color: '#fff',
              fontSize: '16px',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
            // Accessibility improvements
            ariaProps: {
              role: 'alert',
              'aria-live': 'assertive',
            },
          }}
          containerStyle={{
            zIndex: 9999,
          }}
        />
      </AuthProvider>
    </AccessibilityProvider>
  );
}