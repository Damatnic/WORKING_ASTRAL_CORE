'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useCache } from './useCache';

interface DemoUser {
  email: string;
  username: string;
  displayName: string;
  role: 'user' | 'helper' | 'admin';
  password?: string;
}

interface DemoModeContextType {
  isDemoMode: boolean;
  currentDemoUser: DemoUser | null;
  availableDemoUsers: DemoUser[];
  switchToDemoUser: (userEmail: string) => void;
  exitDemoMode: () => void;
  enterDemoMode: () => void;
  isLoading: boolean;
  error: string | null;
}

const DemoModeContext = createContext<DemoModeContextType | null>(null);

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentDemoUser, setCurrentDemoUser] = useState<DemoUser | null>(null);
  
  // Fetch available demo users from the API
  const { data: systemInfo, loading: isLoading, error } = useCache<any>(
    '/api/info',
    () => fetch('/api/info').then(res => res.json()),
    { ttl: 300 }
  );

  const availableDemoUsers: DemoUser[] = systemInfo?.demoUsers || [];

  // Check for demo mode in localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDemoMode = localStorage.getItem('astral-demo-mode');
      const savedDemoUser = localStorage.getItem('astral-demo-user');
      
      if (savedDemoMode === 'true') {
        setIsDemoMode(true);
        if (savedDemoUser) {
          try {
            const user = JSON.parse(savedDemoUser);
            setCurrentDemoUser(user);
          } catch (err) {
            console.warn('Failed to parse saved demo user:', err);
            localStorage.removeItem('astral-demo-user');
          }
        }
      }
    }
  }, []);

  const switchToDemoUser = (userEmail: string) => {
    const user = availableDemoUsers.find(u => u.email === userEmail);
    if (user) {
      setCurrentDemoUser(user);
      setIsDemoMode(true);
      
      // Save to localStorage
      localStorage.setItem('astral-demo-mode', 'true');
      localStorage.setItem('astral-demo-user', JSON.stringify(user));
      
      // Show notification
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-0 transition-transform duration-300';
        notification.textContent = `Demo mode: ${user.displayName} (${user.role})`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
      }
    }
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    setCurrentDemoUser(null);
    
    // Clear localStorage
    localStorage.removeItem('astral-demo-mode');
    localStorage.removeItem('astral-demo-user');
    
    // Show notification
    if (typeof window !== 'undefined') {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-0 transition-transform duration-300';
      notification.textContent = 'Exited demo mode';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(notification), 300);
      }, 2000);
    }
  };

  const enterDemoMode = () => {
    if (availableDemoUsers.length > 0 && availableDemoUsers[0]?.email) {
      // Default to the first user (usually the regular user)
      switchToDemoUser(availableDemoUsers[0].email);
    }
  };

  const value: DemoModeContextType = {
    isDemoMode,
    currentDemoUser,
    availableDemoUsers,
    switchToDemoUser,
    exitDemoMode,
    enterDemoMode,
    isLoading,
    error: error?.message || null,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

// Standalone hook for components that don't need the provider
export function useDemoModeStandalone() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentDemoUser, setCurrentDemoUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDemoMode = localStorage.getItem('astral-demo-mode');
      const savedDemoUser = localStorage.getItem('astral-demo-user');
      
      if (savedDemoMode === 'true') {
        setIsDemoMode(true);
        if (savedDemoUser) {
          try {
            setCurrentDemoUser(JSON.parse(savedDemoUser));
          } catch (err) {
            console.warn('Failed to parse saved demo user:', err);
          }
        }
      }
    }
  }, []);

  return {
    isDemoMode,
    currentDemoUser,
  };
}