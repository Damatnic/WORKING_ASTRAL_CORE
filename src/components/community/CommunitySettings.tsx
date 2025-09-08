"use client";

import React from 'react';
import { X } from 'lucide-react';
import { useCommunityPreferences } from '@/hooks/useCommunityPreferences';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommunitySettings({ open, onClose }: Props) {
  const { prefs, update } = useCommunityPreferences();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl border-l animate-in slide-in-from-right p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Community Settings</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="font-medium mb-2">Notifications</h3>
            <label className="flex items-center justify-between py-2">
              <span>Enable in-app notifications</span>
              <input
                type="checkbox"
                checked={prefs.notificationsEnabled}
                onChange={(e) => update({ notificationsEnabled: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span>Email updates</span>
              <input
                type="checkbox"
                checked={prefs.emailUpdates}
                onChange={(e) => update({ emailUpdates: e.target.checked })}
              />
            </label>
          </section>

          <section>
            <h3 className="font-medium mb-2">Content Filters</h3>
            <label className="flex items-center justify-between py-2">
              <span>Show supportive content first</span>
              <input
                type="checkbox"
                checked={prefs.contentFilters.supportiveOnly}
                onChange={(e) => update({ contentFilters: { ...prefs.contentFilters, supportiveOnly: e.target.checked } })}
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span>Hide potentially triggering content</span>
              <input
                type="checkbox"
                checked={prefs.contentFilters.hideTriggeringContent}
                onChange={(e) => update({ contentFilters: { ...prefs.contentFilters, hideTriggeringContent: e.target.checked } })}
              />
            </label>
          </section>

          <section>
            <h3 className="font-medium mb-2">Privacy</h3>
            <label className="flex items-center justify-between py-2">
              <span>Allow mentorship invites</span>
              <input
                type="checkbox"
                checked={prefs.privacy.allowMentorshipInvites}
                onChange={(e) => update({ privacy: { ...prefs.privacy, allowMentorshipInvites: e.target.checked } })}
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span>Show online status</span>
              <input
                type="checkbox"
                checked={prefs.privacy.showOnlineStatus}
                onChange={(e) => update({ privacy: { ...prefs.privacy, showOnlineStatus: e.target.checked } })}
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}

