import { useCallback, useEffect, useState } from 'react';
import type { TherapistProfile } from '@/data/therapists';

const KEY = 'selected-therapist-profile';

export function useTherapist() {
  const [therapist, setTherapist] = useState<TherapistProfile | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setTherapist(JSON.parse(raw));
    } catch {}
  }, []);

  const select = useCallback((profile: TherapistProfile) => {
    setTherapist(profile);
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch {}
  }, []);

  const clear = useCallback(() => {
    setTherapist(null);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  return { therapist, select, clear };
}

