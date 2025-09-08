'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiIcon,
  WifiSlashIcon,
  CloudIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  DatabaseIcon,
  DocumentIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  UserIcon,
  CogIcon,
  InformationCircleIcon,
  SignalIcon,
  SignalSlashIcon,
  BoltIcon,
  PauseIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import {
  WifiIcon as WifiIconSolid,
  CloudIcon as CloudIconSolid,
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format } from 'date-fns';

interface OfflineData {
  id: string;
  type: 'messages' | 'documents' | 'appointments' | 'notes' | 'assessments' | 'crisis_plans';
  data: any;
  lastModified: Date;
  size: number;
  syncStatus: 'synced' | 'pending' | 'failed' | 'conflict';
  priority: 'high' | 'medium' | 'low';
  expiresAt?: Date;
}

interface SyncQueue {
  id: string;
  operation: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId: string;
  data: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  error?: string;
}

interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '2g' | '3g' | '4g' | '5g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface OfflineSettings {
  enableOfflineMode: boolean;
  autoSync: boolean;
  syncOnWifiOnly: boolean;
  maxOfflineStorage: number; // MB
  offlineRetentionDays: number;
  prioritizeEmergencyData: boolean;
  backgroundSync: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
  cacheImages: boolean;
  cacheDocuments: boolean;
  preloadCriticalData: boolean;
}

interface OfflineContext {
  isOnline: boolean;
  networkStatus: NetworkStatus;
  offlineData: OfflineData[];
  syncQueue: SyncQueue[];
  settings: OfflineSettings;
  storageUsed: number;
  lastSyncTime?: Date;
  updateSettings: (settings: Partial<OfflineSettings>) => void;
  syncNow: () => Promise<void>;
  clearOfflineData: () => void;
  saveForOffline: (data: any, type: string) => void;
  getOfflineData: (type: string) => OfflineData[];
  isDataAvailableOffline: (type: string, id: string) => boolean;
}

const OfflineContext = createContext<OfflineContext | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

const OfflineManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'data' | 'sync' | 'settings'>('status');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  });
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueue[]>([]);
  const [settings, setSettings] = useState<OfflineSettings>({
    enableOfflineMode: true,
    autoSync: true,
    syncOnWifiOnly: false,
    maxOfflineStorage: 500,
    offlineRetentionDays: 30,
    prioritizeEmergencyData: true,
    backgroundSync: true,
    conflictResolution: 'manual',
    cacheImages: true,
    cacheDocuments: true,
    preloadCriticalData: true
  });
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [dataRes, queueRes, settingsRes] = await Promise.all([
          fetch('/api/platform/offline/data'),
          fetch('/api/platform/offline/sync-queue'),
          fetch('/api/platform/offline/settings')
        ]);

        if (!dataRes.ok || !queueRes.ok) {
          throw new Error('Failed to fetch offline data');
        }

        const dataData = await dataRes.json();
        const queueData = await queueRes.json();

        setOfflineData(dataData.data || []);
        setSyncQueue(queueData.queue || []);
        
        // Calculate storage used
        const totalSize = (dataData.data || []).reduce(
          (total: number, item: OfflineData) => total + item.size, 
          0
        );
        setStorageUsed(totalSize);
        
        // Set last sync time if available
        if (dataData.lastSyncTime) {
          setLastSyncTime(new Date(dataData.lastSyncTime));
        }

        // Load settings if available
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            setSettings(settingsData.settings);
          }
        }
      } catch (err) {
        console.error('Error fetching offline data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load offline data');
        // Set empty arrays as fallback
        setOfflineData([]);
        setSyncQueue([]);
        setStorageUsed(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  // Network status monitoring
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      setNetworkStatus(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        setNetworkStatus(prev => ({
          ...prev,
          connectionType: conn.type || 'unknown',
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 0,
          rtt: conn.rtt || 0,
          saveData: conn.saveData || false
        }));
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateConnectionInfo);
    }

    updateConnectionInfo();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  // Auto sync when coming back online
  useEffect(() => {
    if (isOnline && settings.autoSync && syncQueue.length > 0) {
      syncNow();
    }
  }, [isOnline]);

  const syncNow = async () => {
    if (!isOnline) {
      console.log('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      const response = await fetch('/api/platform/offline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queueIds: syncQueue
            .filter(item => item.status === 'pending' || item.status === 'failed')
            .map(item => item.id)
        })
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();

      // Poll for sync progress
      const pollInterval = setInterval(async () => {
        try {
          const progressRes = await fetch('/api/platform/offline/sync/progress');
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setSyncProgress(progressData.progress || 0);
            setSyncQueue(progressData.queue || []);
            setOfflineData(progressData.data || []);

            if (progressData.completed) {
              clearInterval(pollInterval);
              setLastSyncTime(new Date());
              setIsSyncing(false);
              setTimeout(() => setSyncProgress(0), 3000);
            }
          }
        } catch (err) {
          console.error('Error polling sync progress:', err);
        }
      }, 1000);

      // Clear interval after 5 minutes to prevent memory leaks
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsSyncing(false);
        setSyncProgress(0);
      }, 300000);

    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync data. Please try again.');
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const clearOfflineData = async () => {
    try {
      const response = await fetch('/api/platform/offline/clear', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to clear offline data');
      }

      setOfflineData([]);
      setStorageUsed(0);
      setSyncQueue([]);
    } catch (err) {
      console.error('Error clearing offline data:', err);
      alert('Failed to clear offline data. Please try again.');
    }
  };

  const saveSettings = async (newSettings: OfflineSettings) => {
    try {
      await fetch('/api/platform/offline/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
    } catch (err) {
      console.error('Error saving offline settings:', err);
    }
  };

  const getStatusIcon = (status: OfflineData['syncStatus']) => {
    switch (status) {
      case 'synced':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'conflict':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: OfflineData['syncStatus']) => {
    switch (status) {
      case 'synced':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'conflict':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: OfflineData['type']) => {
    switch (type) {
      case 'messages':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-600" />;
      case 'documents':
        return <DocumentIcon className="w-5 h-5 text-red-600" />;
      case 'appointments':
        return <CalendarIcon className="w-5 h-5 text-green-600" />;
      case 'notes':
        return <DocumentIcon className="w-5 h-5 text-purple-600" />;
      case 'assessments':
        return <DocumentIcon className="w-5 h-5 text-orange-600" />;
      case 'crisis_plans':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Offline Data</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {isOnline ? (
              <WifiIconSolid className="w-8 h-8 text-green-600" />
            ) : (
              <WifiSlashIcon className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Offline Mode & Sync</h1>
              <p className="text-gray-600">
                {isOnline ? 'Connected' : 'Offline'} • Data synchronization management
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isOnline ? (
                <SignalIcon className="w-4 h-4" />
              ) : (
                <SignalSlashIcon className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <button
              onClick={syncNow}
              disabled={!isOnline || isSyncing}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isSyncing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <ArrowPathIcon className="w-5 h-5" />
              )}
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Synchronizing data</span>
              <span className="text-sm text-gray-500">{Math.round(syncProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Network Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <WifiIcon className="w-5 h-5 text-green-600" />
              ) : (
                <WifiSlashIcon className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="text-xs font-medium text-gray-700">Connection</p>
                <p className="text-sm text-gray-900">
                  {isOnline ? networkStatus.connectionType : 'Offline'}
                </p>
              </div>
            </div>

            {isOnline && (
              <>
                <div className="flex items-center space-x-2">
                  <BoltIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Speed</p>
                    <p className="text-sm text-gray-900">{networkStatus.effectiveType}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <CloudArrowDownIcon className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Downlink</p>
                    <p className="text-sm text-gray-900">{networkStatus.downlink} Mbps</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Latency</p>
                    <p className="text-sm text-gray-900">{networkStatus.rtt} ms</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <DatabaseIcon className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-medium text-gray-700">Storage</p>
                <p className="text-sm text-gray-900">{formatBytes(storageUsed * 1024)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ArrowPathIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs font-medium text-gray-700">Last Sync</p>
                <p className="text-sm text-gray-900">
                  {lastSyncTime ? formatDistance(lastSyncTime, new Date(), { addSuffix: true }) : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'status', label: 'Status Overview', icon: InformationCircleIcon },
              { id: 'data', label: 'Offline Data', icon: DatabaseIcon },
              { id: 'sync', label: 'Sync Queue', icon: ArrowPathIcon },
              { id: 'settings', label: 'Settings', icon: CogIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Storage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold text-gray-900">{formatBytes(storageUsed * 1024)}</p>
                </div>
                <div className="rounded-full p-2 bg-blue-100">
                  <DatabaseIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(storageUsed / settings.maxOfflineStorage) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((storageUsed / settings.maxOfflineStorage) * 100)}% of {settings.maxOfflineStorage}MB limit
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Offline Items</p>
                  <p className="text-2xl font-bold text-gray-900">{offlineData.length}</p>
                </div>
                <div className="rounded-full p-2 bg-green-100">
                  <CloudArrowDownIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex space-x-4 text-sm text-gray-600">
                  <span>{offlineData.filter(d => d.syncStatus === 'synced').length} synced</span>
                  <span>{offlineData.filter(d => d.syncStatus === 'pending').length} pending</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sync Queue</p>
                  <p className="text-2xl font-bold text-gray-900">{syncQueue.length}</p>
                </div>
                <div className="rounded-full p-2 bg-purple-100">
                  <ArrowPathIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex space-x-4 text-sm text-gray-600">
                  <span>{syncQueue.filter(s => s.status === 'pending').length} pending</span>
                  <span>{syncQueue.filter(s => s.status === 'failed').length} failed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Offline Capabilities */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Offline Capabilities</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Available Offline</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm">View crisis safety plans</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm">Read therapy session notes</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm">Access emergency contacts</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm">View cached documents</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm">Create offline journal entries</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Requires Connection</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-sm">Real-time messaging</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-sm">Video therapy sessions</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-sm">Crisis hotline calls</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-sm">Live community discussions</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-sm">Real-time notifications</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Offline Data</h2>
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {offlineData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <DatabaseIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No offline data</h3>
                <p>Data will appear here when available offline</p>
              </div>
            ) : (
              offlineData.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getTypeIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {item.data.title || item.data.name || `${item.type} ${item.data.id}`}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getStatusColor(item.syncStatus)
                          }`}>
                            {item.syncStatus}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.priority}
                          </span>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-2">
                          <div className="flex items-center space-x-1">
                            <span>Type:</span>
                            <span className="capitalize">{item.type.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Size:</span>
                            <span>{formatBytes(item.size * 1024)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Modified:</span>
                            <span>{formatDistance(item.lastModified, new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>

                        {item.expiresAt && (
                          <div className="text-sm text-orange-600">
                            Expires {formatDistance(item.expiresAt, new Date(), { addSuffix: true })}
                          </div>
                        )}

                        {item.syncStatus === 'conflict' && (
                          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-orange-800">Sync Conflict</p>
                                <p className="text-sm text-orange-700 mt-1">
                                  This item has been modified both locally and on the server. Choose how to resolve:
                                </p>
                                <div className="flex space-x-2 mt-2">
                                  <button className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                                    Keep Local
                                  </button>
                                  <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                    Use Server
                                  </button>
                                  <button className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                                    Review Changes
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusIcon(item.syncStatus)}
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <DocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Sync Queue</h2>
              <div className="text-sm text-gray-600">
                {syncQueue.filter(s => s.status === 'pending').length} pending operations
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {syncQueue.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <ArrowPathIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sync queue is empty</h3>
                <p>Operations will appear here when data needs to be synchronized</p>
              </div>
            ) : (
              syncQueue.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {item.status === 'syncing' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        ) : item.status === 'completed' ? (
                          <CheckCircleIconSolid className="w-5 h-5 text-green-600" />
                        ) : item.status === 'failed' ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 capitalize">
                            {item.operation} {item.resourceType.replace('_', ' ')}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' :
                            item.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-2">
                          <div className="flex items-center space-x-1">
                            <span>Resource ID:</span>
                            <span>{item.resourceId}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Attempts:</span>
                            <span>{item.attempts}/{item.maxAttempts}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Created:</span>
                            <span>{formatDistance(item.timestamp, new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>

                        {item.error && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            Error: {item.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {item.status === 'failed' && item.attempts < item.maxAttempts && (
                        <button className="p-2 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50">
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50">
                        <StopIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Offline & Sync Settings</h2>
            
            <div className="space-y-6">
              {/* General Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">General</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Enable offline mode</span>
                    <input
                      type="checkbox"
                      checked={settings.enableOfflineMode}
                      onChange={(e) => {
                        const newSettings = { ...settings, enableOfflineMode: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Automatic synchronization</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSync}
                      onChange={(e) => {
                        const newSettings = { ...settings, autoSync: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Sync only on Wi-Fi</span>
                    <input
                      type="checkbox"
                      checked={settings.syncOnWifiOnly}
                      onChange={(e) => {
                        const newSettings = { ...settings, syncOnWifiOnly: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Background synchronization</span>
                    <input
                      type="checkbox"
                      checked={settings.backgroundSync}
                      onChange={(e) => {
                        const newSettings = { ...settings, backgroundSync: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>
                </div>
              </div>

              {/* Storage Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Storage</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum offline storage: {settings.maxOfflineStorage}MB
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      value={settings.maxOfflineStorage}
                      onChange={(e) => {
                        const newSettings = { ...settings, maxOfflineStorage: parseInt(e.target.value) };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Offline data retention: {settings.offlineRetentionDays} days
                    </label>
                    <input
                      type="range"
                      min="7"
                      max="90"
                      value={settings.offlineRetentionDays}
                      onChange={(e) => {
                        const newSettings = { ...settings, offlineRetentionDays: parseInt(e.target.value) };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Content Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Content</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Cache images for offline viewing</span>
                    <input
                      type="checkbox"
                      checked={settings.cacheImages}
                      onChange={(e) => {
                        const newSettings = { ...settings, cacheImages: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Cache documents for offline access</span>
                    <input
                      type="checkbox"
                      checked={settings.cacheDocuments}
                      onChange={(e) => {
                        const newSettings = { ...settings, cacheDocuments: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Preload critical data (crisis plans, emergency contacts)</span>
                    <input
                      type="checkbox"
                      checked={settings.preloadCriticalData}
                      onChange={(e) => {
                        const newSettings = { ...settings, preloadCriticalData: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Prioritize emergency data for sync</span>
                    <input
                      type="checkbox"
                      checked={settings.prioritizeEmergencyData}
                      onChange={(e) => {
                        const newSettings = { ...settings, prioritizeEmergencyData: e.target.checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="rounded border-gray-300"
                    />
                  </label>
                </div>
              </div>

              {/* Conflict Resolution */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conflict Resolution</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="conflictResolution"
                      value="local"
                      checked={settings.conflictResolution === 'local'}
                      onChange={(e) => {
                        const newSettings = { ...settings, conflictResolution: e.target.value as any };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Always keep local changes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="conflictResolution"
                      value="remote"
                      checked={settings.conflictResolution === 'remote'}
                      onChange={(e) => {
                        const newSettings = { ...settings, conflictResolution: e.target.value as any };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Always use server version</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="conflictResolution"
                      value="manual"
                      checked={settings.conflictResolution === 'manual'}
                      onChange={(e) => {
                        const newSettings = { ...settings, conflictResolution: e.target.value as any };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Ask me each time (recommended)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    connectionType: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  });
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueue[]>([]);
  const [settings, setSettings] = useState<OfflineSettings>({
    enableOfflineMode: true,
    autoSync: true,
    syncOnWifiOnly: false,
    maxOfflineStorage: 500,
    offlineRetentionDays: 30,
    prioritizeEmergencyData: true,
    backgroundSync: true,
    conflictResolution: 'manual',
    cacheImages: true,
    cacheDocuments: true,
    preloadCriticalData: true
  });
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>();

  const updateSettings = (newSettings: Partial<OfflineSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const syncNow = async () => {
    if (!isOnline) return;
    
    // Implementation would handle actual synchronization
    console.log('Syncing data...');
    setLastSyncTime(new Date());
  };

  const clearOfflineData = () => {
    setOfflineData([]);
    setSyncQueue([]);
    setStorageUsed(0);
  };

  const saveForOffline = (data: any, type: string) => {
    const offlineItem: OfflineData = {
      id: `offline_${Date.now()}_${Math.random()}`,
      type: type as any,
      data,
      lastModified: new Date(),
      size: JSON.stringify(data).length / 1024, // Approximate size in KB
      syncStatus: 'pending',
      priority: type.includes('crisis') ? 'high' : 'medium'
    };

    setOfflineData(prev => [...prev, offlineItem]);
    setStorageUsed(prev => prev + offlineItem.size);
  };

  const getOfflineData = (type: string) => {
    return offlineData.filter(item => item.type === type);
  };

  const isDataAvailableOffline = (type: string, id: string) => {
    return offlineData.some(item => item.type === type && item.data.id === id);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{
      isOnline,
      networkStatus,
      offlineData,
      syncQueue,
      settings,
      storageUsed,
      lastSyncTime,
      updateSettings,
      syncNow,
      clearOfflineData,
      saveForOffline,
      getOfflineData,
      isDataAvailableOffline
    }}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineManager;