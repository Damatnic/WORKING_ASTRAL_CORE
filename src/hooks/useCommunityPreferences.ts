import { useCallback, useEffect, useState } from 'react';

export interface CommunityPreferences {
  notificationsEnabled: boolean;
  emailUpdates: boolean;
  contentFilters: {
    supportiveOnly: boolean;
    hideTriggeringContent: boolean;
  };
  privacy: {
    allowMentorshipInvites: boolean;
    showOnlineStatus: boolean;
  };
}

const DEFAULT_PREFS: CommunityPreferences = {
  notificationsEnabled: true,
  emailUpdates: false,
  contentFilters: {
    supportiveOnly: true,
    hideTriggeringContent: false,
  },
  privacy: {
    allowMentorshipInvites: true,
    showOnlineStatus: true,
  },
};

export function useCommunityPreferences() {
  const [prefs, setPrefs] = useState<CommunityPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('community-preferences');
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch (e) {
      // ignore
    }
  }, []);

  const save = useCallback((next: CommunityPreferences) => {
    setPrefs(next);
    try {
      localStorage.setItem('community-preferences', JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }, []);

  const update = useCallback((partial: Partial<CommunityPreferences>) => {
    save({ ...prefs, ...partial });
  }, [prefs, save]);

  return { prefs, setPrefs: save, update };
}

