"use client";

import React from 'react';
import Link from 'next/link';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useCommunityPreferences } from '@/hooks/useCommunityPreferences';

function useConsentPrefs() {
  const [consent, setConsent] = React.useState<{ analytics: boolean; personalization: boolean }>({ analytics: true, personalization: true });
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('consent-preferences');
      if (raw) setConsent({ ...consent, ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (partial: Partial<typeof consent>) => {
    const next = { ...consent, ...partial };
    setConsent(next);
    try { localStorage.setItem('consent-preferences', JSON.stringify(next)); } catch {}
  };
  return { consent, update };
}

export default function SettingsPage() {
  const {
    fontSize,
    highContrast,
    screenReaderMode,
    voiceEnabled,
    toggleVoice,
    increaseFontSize,
    decreaseFontSize,
    toggleHighContrast,
    toggleScreenReader,
  } = useAccessibility();

  const { prefs, update: updateCommunity } = useCommunityPreferences();
  const { consent, update: updateConsent } = useConsentPrefs();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Link href="/" className="text-primary-600 hover:text-primary-700">Back to Home</Link>
        </div>

        {/* Accessibility */}
        <section className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Accessibility</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>High contrast</span>
              <input type="checkbox" checked={highContrast} onChange={toggleHighContrast} />
            </div>
            <div className="flex items-center justify-between">
              <span>Screen reader mode</span>
              <input type="checkbox" checked={screenReaderMode} onChange={toggleScreenReader} />
            </div>
            <div className="flex items-center justify-between">
              <span>Voice responses</span>
              <input type="checkbox" checked={voiceEnabled} onChange={toggleVoice} />
            </div>
            <div className="flex items-center justify-between">
              <span>Font size</span>
              <div className="flex items-center gap-2">
                <button onClick={decreaseFontSize} className="px-2 py-1 border rounded">A-</button>
                <span className="w-10 text-center">{fontSize}px</span>
                <button onClick={increaseFontSize} className="px-2 py-1 border rounded">A+</button>
              </div>
            </div>
          </div>
        </section>

        {/* Community Preferences */}
        <section className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Community Preferences</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>In-app notifications</span>
              <input type="checkbox" checked={prefs.notificationsEnabled} onChange={(e)=>updateCommunity({ notificationsEnabled: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Email updates</span>
              <input type="checkbox" checked={prefs.emailUpdates} onChange={(e)=>updateCommunity({ emailUpdates: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Show supportive content first</span>
              <input type="checkbox" checked={prefs.contentFilters.supportiveOnly} onChange={(e)=>updateCommunity({ contentFilters: { ...prefs.contentFilters, supportiveOnly: e.target.checked } })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Hide potentially triggering content</span>
              <input type="checkbox" checked={prefs.contentFilters.hideTriggeringContent} onChange={(e)=>updateCommunity({ contentFilters: { ...prefs.contentFilters, hideTriggeringContent: e.target.checked } })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Allow mentorship invites</span>
              <input type="checkbox" checked={prefs.privacy.allowMentorshipInvites} onChange={(e)=>updateCommunity({ privacy: { ...prefs.privacy, allowMentorshipInvites: e.target.checked } })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Show online status</span>
              <input type="checkbox" checked={prefs.privacy.showOnlineStatus} onChange={(e)=>updateCommunity({ privacy: { ...prefs.privacy, showOnlineStatus: e.target.checked } })} />
            </div>
          </div>
        </section>

        {/* Consent & Privacy */}
        <section className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Consent & Privacy</h2>
          <p className="text-sm text-neutral-600 mb-4">Control how we use analytics and personalization to improve your experience. You can change these settings anytime.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Allow anonymous analytics</span>
              <input type="checkbox" checked={consent.analytics} onChange={(e)=>updateConsent({ analytics: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
              <span>Allow content personalization</span>
              <input type="checkbox" checked={consent.personalization} onChange={(e)=>updateConsent({ personalization: e.target.checked })} />
            </div>
          </div>
        </section>

        <div className="text-right">
          <Link href="/therapy/therapists" className="text-sm text-primary-600 hover:text-primary-700">Choose Therapist</Link>
        </div>
      </div>
    </div>
  );
}

