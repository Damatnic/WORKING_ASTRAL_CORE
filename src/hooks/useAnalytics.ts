import { useCallback } from 'react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

interface UseAnalyticsReturn {
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  page: (name: string, properties?: Record<string, any>) => void;
}

export function useAnalytics(): UseAnalyticsReturn {
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    // In production, this would integrate with analytics services
    console.log('Analytics Track:', { event, properties });
  }, []);

  const identify = useCallback((userId: string, properties?: Record<string, any>) => {
    // In production, this would integrate with analytics services
    console.log('Analytics Identify:', { userId, properties });
  }, []);

  const page = useCallback((name: string, properties?: Record<string, any>) => {
    // In production, this would integrate with analytics services
    console.log('Analytics Page:', { name, properties });
  }, []);

  return { track, identify, page };
}