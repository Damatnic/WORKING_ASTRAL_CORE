'use client';

// Client-Side Cache Hook
// Provides client-side caching with localStorage and memory fallback

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  staleTime?: number; // Time before data is considered stale
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  retryCount?: number;
  retryDelay?: number;
  fallbackData?: any;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
  expiry: number;
  staleAt: number;
}

interface UseCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => Promise<void>;
  mutate: (newData: T | ((current: T | null) => T)) => void;
  clear: () => void;
}

// Global in-memory cache for current session
const memoryCache = new Map<string, CacheData<any>>();

/**
 * Advanced client-side caching hook
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseCacheReturn<T> {
  const {
    ttl = 300, // 5 minutes default
    staleTime = 60, // 1 minute default
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    retryCount = 3,
    retryDelay = 1000,
    fallbackData = null,
  } = options;

  const [data, setData] = useState<T | null>(fallbackData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const fetcherRef = useRef(fetcher);
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Update fetcher ref when it changes
  fetcherRef.current = fetcher;

  /**
   * Get cached data from storage
   */
  const getCachedData = useCallback((): CacheData<T> | null => {
    const now = Date.now();
    
    // Try memory cache first (faster)
    const memoryData = memoryCache.get(key);
    if (memoryData && now < memoryData.expiry) {
      return memoryData;
    }
    
    // Try localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const parsed: CacheData<T> = JSON.parse(stored);
        if (now < parsed.expiry) {
          // Update memory cache
          memoryCache.set(key, parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to parse cached data:', error);
    }
    
    return null;
  }, [key]);

  /**
   * Set cached data in storage
   */
  const setCachedData = useCallback((newData: T): void => {
    const now = Date.now();
    const cacheData: CacheData<T> = {
      data: newData,
      timestamp: now,
      expiry: now + (ttl * 1000),
      staleAt: now + (staleTime * 1000),
    };
    
    // Update memory cache
    memoryCache.set(key, cacheData);
    
    // Update localStorage
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data to localStorage:', error);
    }
  }, [key, ttl, staleTime]);

  /**
   * Fetch data with retry logic
   */
  const fetchData = useCallback(async (retryAttempt: number = 0): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcherRef.current();
      
      setData(result);
      setCachedData(result);
      setIsStale(false);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (retryAttempt < retryCount) {
        console.warn(`Fetch failed, retrying in ${retryDelay}ms... (${retryAttempt + 1}/${retryCount})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(retryAttempt + 1);
        }, retryDelay * Math.pow(2, retryAttempt)); // Exponential backoff
      } else {
        setError(error);
        console.error('Fetch failed after all retries:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [fetcherRef, setCachedData, retryCount, retryDelay]);

  /**
   * Load initial data
   */
  const loadInitialData = useCallback((): void => {
    const cached = getCachedData();
    const now = Date.now();
    
    if (cached) {
      setData(cached.data);
      setIsStale(now > cached.staleAt);
      
      // If stale, fetch fresh data in the background
      if (now > cached.staleAt) {
        fetchData();
      }
    } else {
      // No cached data, fetch immediately
      fetchData();
    }
  }, [getCachedData, fetchData]);

  /**
   * Mutate cached data
   */
  const mutate = useCallback((newData: T | ((current: T | null) => T)): void => {
    const updatedData = typeof newData === 'function' ? (newData as (current: T | null) => T)(data) : newData;
    setData(updatedData);
    setCachedData(updatedData);
    setIsStale(false);
    setError(null);
  }, [data, setCachedData]);

  /**
   * Clear cached data
   */
  const clear = useCallback((): void => {
    memoryCache.delete(key);
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to clear cached data from localStorage:', error);
    }
    setData(fallbackData);
    setError(null);
    setIsStale(false);
  }, [key, fallbackData]);

  /**
   * Refetch data
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
    
    // Cleanup retry timeout on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadInitialData]);

  // Revalidate on window focus
  useEffect(() => {
    if (!revalidateOnFocus) return;
    
    const handleFocus = () => {
      if (isStale) {
        fetchData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, isStale, fetchData]);

  // Revalidate on network reconnection
  useEffect(() => {
    if (!revalidateOnReconnect) return;
    
    const handleOnline = () => {
      if (isStale) {
        fetchData();
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, isStale, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    mutate,
    clear,
  };
}

/**
 * Hook for API caching with built-in fetch
 */
export function useApiCache<T>(
  endpoint: string,
  options: CacheOptions & { 
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): UseCacheReturn<T> {
  const { method = 'GET', body, headers = {}, ...cacheOptions } = options;
  
  const fetcher = useCallback(async (): Promise<T> => {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }, [endpoint, method, body, headers]);
  
  const cacheKey = `api_${endpoint}_${method}_${body ? JSON.stringify(body) : ''}`;
  
  return useCache(cacheKey, fetcher, cacheOptions);
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear localStorage cache
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear localStorage cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memorySize: number;
  localStorageSize: number;
  entries: string[];
} {
  const memorySize = memoryCache.size;
  const entries = Array.from(memoryCache.keys());
  
  let localStorageSize = 0;
  try {
    const keys = Object.keys(localStorage);
    localStorageSize = keys.filter(key => key.startsWith('cache_')).length;
  } catch (error) {
    console.warn('Failed to get localStorage stats:', error);
  }
  
  return {
    memorySize,
    localStorageSize,
    entries,
  };
}