// Service Worker for Astral Core Mental Health Platform
// Provides offline support, background sync, and push notifications

const CACHE_NAME = 'astralcore-v5.0.0';
const STATIC_CACHE = 'astralcore-static-v5.0.0';
const DYNAMIC_CACHE = 'astralcore-dynamic-v5.0.0';
const CRISIS_CACHE = 'astralcore-crisis-v5.0.0';

// Critical resources that must be cached for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/crisis',
  '/wellness',
  '/therapy',
  '/assessment',
  '/offline',
  // Static assets would be added here
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Crisis resources that must be available offline
const CRISIS_ASSETS = [
  '/crisis',
  '/crisis/resources',
  '/crisis/hotlines',
  '/crisis/safety-plan',
  '/api/crisis/resources',
  '/api/emergency-contacts'
];

// API endpoints that support background sync
const SYNC_ENDPOINTS = [
  '/api/assessments',
  '/api/therapy-sessions',
  '/api/progress-notes',
  '/api/mood-tracking',
  '/api/crisis-reports'
];

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache crisis resources (highest priority)
      caches.open(CRISIS_CACHE).then(cache => {
        console.log('[SW] Caching crisis resources');
        return cache.addAll(CRISIS_ASSETS);
      })
    ]).then(() => {
      console.log('[SW] Service worker installed successfully');
      // Force activation
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== CRISIS_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests with appropriate strategies
  if (isCrisisRequest(request)) {
    // Crisis resources: Cache first with network fallback
    event.respondWith(crisisFirstStrategy(request));
  } else if (isStaticAsset(request)) {
    // Static assets: Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else if (isAPIRequest(request)) {
    // API requests: Network first with cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (isNavigationRequest(request)) {
    // Navigation: Network first with offline fallback
    event.respondWith(navigationStrategy(request));
  } else {
    // Default: Network first
    event.respondWith(networkFirstStrategy(request));
  }
});

// Background Sync for offline data submission
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'assessment-sync') {
    event.waitUntil(syncAssessments());
  } else if (event.tag === 'therapy-notes-sync') {
    event.waitUntil(syncTherapyNotes());
  } else if (event.tag === 'crisis-report-sync') {
    event.waitUntil(syncCrisisReports());
  } else if (event.tag === 'mood-tracking-sync') {
    event.waitUntil(syncMoodTracking());
  }
});

// Push notifications for crisis alerts and appointments
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const options = {
    badge: '/icons/badge-72x72.png',
    icon: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    actions: [],
    data: {},
    requireInteraction: false
  };

  let title = 'Astral Core';
  let body = 'You have a new notification';

  if (event.data) {
    const data = event.data.json();
    title = data.title || title;
    body = data.body || body;
    options.data = data;
    
    // Handle different notification types
    if (data.type === 'crisis_alert') {
      options.requireInteraction = true;
      options.actions = [
        {
          action: 'view_resources',
          title: 'View Resources'
        },
        {
          action: 'call_hotline',
          title: 'Call Hotline'
        }
      ];
      options.vibrate = [1000, 500, 1000, 500, 1000];
    } else if (data.type === 'appointment_reminder') {
      options.actions = [
        {
          action: 'confirm',
          title: 'Confirm'
        },
        {
          action: 'reschedule',
          title: 'Reschedule'
        }
      ];
    } else if (data.type === 'therapy_session') {
      options.actions = [
        {
          action: 'join_session',
          title: 'Join Session'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ];
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const { action, data } = event;
  const notificationData = event.notification.data || {};
  
  let url = '/';
  
  // Handle different actions
  switch (action) {
    case 'view_resources':
      url = '/crisis/resources';
      break;
    case 'call_hotline':
      // Trigger phone call
      url = `tel:${notificationData.hotlineNumber || '988'}`;
      break;
    case 'confirm':
      url = `/appointments/${notificationData.appointmentId}`;
      break;
    case 'reschedule':
      url = `/appointments/${notificationData.appointmentId}/reschedule`;
      break;
    case 'join_session':
      url = `/therapy/session/${notificationData.sessionId}`;
      break;
    default:
      if (notificationData.url) {
        url = notificationData.url;
      }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Caching Strategies

// Crisis First: Always prioritize cached crisis resources
function crisisFirstStrategy(request) {
  return caches.open(CRISIS_CACHE)
    .then(cache => cache.match(request))
    .then(response => {
      if (response) {
        console.log('[SW] Serving crisis resource from cache:', request.url);
        return response;
      }
      
      // If not in cache, fetch and cache
      return fetch(request)
        .then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Return offline crisis page if available
          return cache.match('/crisis/offline');
        });
    });
}

// Cache First: For static assets
function cacheFirstStrategy(request) {
  return caches.match(request)
    .then(response => {
      if (response) {
        return response;
      }
      
      return fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        });
    });
}

// Network First: For API requests
function networkFirstStrategy(request) {
  return fetch(request)
    .then(response => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then(cache => cache.put(request, responseClone));
      }
      return response;
    })
    .catch(() => {
      // Fallback to cache
      return caches.match(request)
        .then(response => {
          if (response) {
            console.log('[SW] Serving from cache (offline):', request.url);
            return response;
          }
          
          // Return offline page for important endpoints
          if (isSyncEndpoint(request)) {
            return new Response(
              JSON.stringify({ 
                error: 'offline', 
                message: 'This request will be synced when online' 
              }),
              { 
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          }
          
          throw new Error('No cache match');
        });
    });
}

// Navigation Strategy: For page navigation
function navigationStrategy(request) {
  return fetch(request)
    .catch(() => {
      return caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          
          // Return offline page
          return caches.match('/offline')
            .then(offlineResponse => offlineResponse || new Response(
              `
              <!DOCTYPE html>
              <html>
              <head>
                <title>Offline - Astral Core</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 600px; 
                    margin: 2rem auto; 
                    padding: 2rem;
                    text-align: center;
                    background: #f8fafc;
                  }
                  .crisis-button {
                    background: #dc2626;
                    color: white;
                    padding: 1rem 2rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 1.1rem;
                    margin: 1rem 0;
                    cursor: pointer;
                    display: block;
                    width: 100%;
                  }
                  .wellness-button {
                    background: #059669;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    margin: 0.5rem 0;
                    cursor: pointer;
                    display: block;
                    width: 100%;
                  }
                </style>
              </head>
              <body>
                <h1>You're Offline</h1>
                <p>Don't worry - crisis resources are still available!</p>
                
                <button class="crisis-button" onclick="location.href='/crisis'">
                  🆘 Crisis Resources (Available Offline)
                </button>
                
                <button class="wellness-button" onclick="location.href='/wellness'">
                  🧘 Wellness Tools (Available Offline)
                </button>
                
                <p>Other features will be available when you reconnect to the internet.</p>
                
                <h3>Emergency Contacts</h3>
                <p>
                  <strong>National Suicide Prevention Lifeline:</strong><br>
                  <a href="tel:988">988</a>
                </p>
                <p>
                  <strong>Crisis Text Line:</strong><br>
                  Text HOME to <a href="sms:741741">741741</a>
                </p>
                <p>
                  <strong>Emergency Services:</strong><br>
                  <a href="tel:911">911</a>
                </p>
              </body>
              </html>
              `,
              { headers: { 'Content-Type': 'text/html' } }
            ));
        });
    });
}

// Background Sync Functions

async function syncAssessments() {
  try {
    console.log('[SW] Syncing assessments...');
    const syncData = await getStoredData('pending-assessments');
    
    for (const assessment of syncData) {
      try {
        const response = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessment)
        });
        
        if (response.ok) {
          await removeStoredData('pending-assessments', assessment.id);
          console.log('[SW] Assessment synced:', assessment.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync assessment:', assessment.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Assessment sync failed:', error);
  }
}

async function syncTherapyNotes() {
  try {
    console.log('[SW] Syncing therapy notes...');
    const syncData = await getStoredData('pending-therapy-notes');
    
    for (const note of syncData) {
      try {
        const response = await fetch('/api/therapy-sessions/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note)
        });
        
        if (response.ok) {
          await removeStoredData('pending-therapy-notes', note.id);
          console.log('[SW] Therapy note synced:', note.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync therapy note:', note.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Therapy notes sync failed:', error);
  }
}

async function syncCrisisReports() {
  try {
    console.log('[SW] Syncing crisis reports...');
    const syncData = await getStoredData('pending-crisis-reports');
    
    for (const report of syncData) {
      try {
        const response = await fetch('/api/crisis/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        
        if (response.ok) {
          await removeStoredData('pending-crisis-reports', report.id);
          console.log('[SW] Crisis report synced:', report.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync crisis report:', report.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Crisis reports sync failed:', error);
  }
}

async function syncMoodTracking() {
  try {
    console.log('[SW] Syncing mood tracking data...');
    const syncData = await getStoredData('pending-mood-tracking');
    
    for (const mood of syncData) {
      try {
        const response = await fetch('/api/mood-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mood)
        });
        
        if (response.ok) {
          await removeStoredData('pending-mood-tracking', mood.id);
          console.log('[SW] Mood tracking synced:', mood.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync mood tracking:', mood.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Mood tracking sync failed:', error);
  }
}

// Utility Functions

function isCrisisRequest(request) {
  return request.url.includes('/crisis') || 
         request.url.includes('/emergency') ||
         CRISIS_ASSETS.some(asset => request.url.includes(asset));
}

function isStaticAsset(request) {
  return request.url.includes('/icons/') ||
         request.url.includes('/images/') ||
         request.url.includes('/fonts/') ||
         request.url.includes('.css') ||
         request.url.includes('.js') ||
         request.url.includes('/manifest.json');
}

function isAPIRequest(request) {
  return request.url.includes('/api/');
}

function isSyncEndpoint(request) {
  return SYNC_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && 
          request.headers.get('accept') && 
          request.headers.get('accept').includes('text/html'));
}

// IndexedDB helpers for storing sync data
async function getStoredData(storeName) {
  return new Promise((resolve, reject) => {
    if (!indexedDB) {
      resolve([]);
      return;
    }

    const request = indexedDB.open('astralcore-sync', 1);
    
    request.onerror = () => resolve([]);
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => resolve([]);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeStoredData(storeName, id) {
  return new Promise((resolve, reject) => {
    if (!indexedDB) {
      resolve();
      return;
    }

    const request = indexedDB.open('astralcore-sync', 1);
    
    request.onerror = () => resolve();
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(storeName)) {
        resolve();
        return;
      }
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
    };
  });
}

console.log('[SW] Service worker script loaded');