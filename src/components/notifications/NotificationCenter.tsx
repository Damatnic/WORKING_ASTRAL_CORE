"use client";

import React from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useCommunityPreferences } from '@/hooks/useCommunityPreferences';

export default function NotificationCenter() {
  const { notifications, unread, markAllRead, remove } = useNotifications();
  const { prefs } = useCommunityPreferences();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Floating bell */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
        className="fixed z-40 bottom-6 right-6 rounded-full bg-white border shadow-lg p-3 hover:bg-neutral-50"
      >
        <div className="relative">
          <Bell className="w-5 h-5 text-neutral-700" />
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl border-l p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <h3 className="font-semibold">Notifications</h3>
                {unread > 0 && <span className="text-xs text-red-600">({unread} new)</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={markAllRead} className="text-xs text-neutral-500 hover:text-neutral-700">Mark all read</button>
                <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-neutral-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!prefs.notificationsEnabled && (
              <div className="mb-2 p-2 text-xs rounded bg-amber-50 border border-amber-200 text-amber-800">
                Notifications are disabled in your preferences. New items will be saved silently.
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <ul className="space-y-3 text-sm">
                {notifications.length === 0 && (
                  <li className="p-3 bg-neutral-50 rounded border text-neutral-500">No notifications yet</li>
                )}
                {notifications.map(n => (
                  <li key={n.id} className={`p-3 rounded border ${n.read ? 'bg-white' : 'bg-neutral-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{n.title}</div>
                        <div className="text-neutral-600">{n.body}</div>
                        <div className="text-[10px] text-neutral-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                      <button onClick={() => remove(n.id)} className="text-xs text-neutral-400 hover:text-neutral-600">Dismiss</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

