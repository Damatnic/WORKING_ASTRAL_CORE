'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  Shield, 
  Zap,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  BarChart3,
  Cpu,
  HardDrive
} from 'lucide-react';
import { useApiCache, getCacheStats as getClientCacheStats } from '@/hooks/useCache';
import AITestChat from '@/components/ai/AITestChat';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  initialized: boolean;
  services: {
    database: 'up' | 'down' | 'degraded';
    api: 'up' | 'down' | 'degraded';
    cache: 'up' | 'down' | 'degraded';
    auth: 'up' | 'down' | 'degraded';
  };
  stats: {
    totalUsers: number;
    activeSessions: number;
    apiRequests: number;
    cacheHits: number;
    errorRate: number;
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  lastChecked: string;
  version: string;
  deployment: {
    region: string;
    environment: string;
    buildId: string;
  };
}

interface SystemInfo {
  demoUsers: Array<{
    email: string;
    username: string;
    role: string;
    password?: string;
  }>;
  features: string[];
  apiEndpoints: string[];
  initialized: boolean;
  initializationTime?: string;
  version: string;
  build: string;
  aiServices?: {
    openai: {
      configured: boolean;
      status: string;
    };
    gemini: {
      configured: boolean;
      status: string;
    };
    defaultProvider: string;
  };
}

export default function StatusPage() {
  const [showPasswords, setShowPasswords] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  // Fetch system health
  const { 
    data: health, 
    loading: healthLoading, 
    error: healthError, 
    refetch: refetchHealth 
  } = useApiCache<SystemHealth>('/api/health', { 
    ttl: 30,
    revalidateOnFocus: true 
  });

  // Fetch system info
  const { 
    data: info, 
    loading: infoLoading, 
    error: infoError,
    refetch: refetchInfo
  } = useApiCache<SystemInfo>('/api/info', { 
    ttl: 300,
    revalidateOnFocus: false 
  });

  useEffect(() => {
    // Get client-side cache stats
    if (typeof window !== 'undefined') {
      setCacheStats(getClientCacheStats());
    }
  }, []);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return CheckCircle;
      case 'warning':
      case 'degraded':
        return AlertTriangle;
      case 'error':
      case 'down':
        return XCircle;
      default:
        return Activity;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const refreshAll = async () => {
    await Promise.all([refetchHealth(), refetchInfo()]);
  };

  if (healthError && infoError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-900 mb-2">System Unavailable</h1>
            <p className="text-red-700 mb-4">Unable to connect to system status services.</p>
            <button
              onClick={refreshAll}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status</h1>
              <p className="text-gray-600">Real-time monitoring and system information</p>
            </div>
            <button
              onClick={refreshAll}
              disabled={healthLoading || infoLoading}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(healthLoading || infoLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* System Overview */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${getStatusColor(health.status)}`}>
                  {(() => {
                    const Icon = getStatusIcon(health.status);
                    return <Icon className="w-6 h-6" />;
                  })()}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
                  {health.status.toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">System Health</h3>
              <p className="text-sm text-gray-600">Overall system status</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{formatUptime(health.uptime)}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Uptime</h3>
              <p className="text-sm text-gray-600">System availability</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{health.stats.totalUsers}</span>
              </div>
              <h3 className="font-semibold text-gray-900">Total Users</h3>
              <p className="text-sm text-gray-600">{health.stats.activeSessions} active sessions</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{health.stats.apiRequests}</span>
              </div>
              <h3 className="font-semibold text-gray-900">API Requests</h3>
              <p className="text-sm text-gray-600">{health.stats.cacheHits}% cache hit rate</p>
            </div>
          </div>
        )}

        {/* Services Status */}
        {health && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Services Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(health.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded ${getStatusColor(status)}`}>
                      {service === 'database' && <Database className="w-4 h-4" />}
                      {service === 'api' && <Server className="w-4 h-4" />}
                      {service === 'cache' && <Zap className="w-4 h-4" />}
                      {service === 'auth' && <Shield className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{service}</p>
                      <p className={`text-sm ${getStatusColor(status).split(' ')[0]}`}>
                        {status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {health && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="p-4 bg-blue-50 rounded-lg mb-3">
                  <Activity className="w-8 h-8 text-blue-600 mx-auto" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{health.performance.responseTime}ms</p>
                <p className="text-sm text-gray-600">Average Response Time</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 bg-green-50 rounded-lg mb-3">
                  <Cpu className="w-8 h-8 text-green-600 mx-auto" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{health.performance.cpuUsage}%</p>
                <p className="text-sm text-gray-600">CPU Usage</p>
              </div>
              
              <div className="text-center">
                <div className="p-4 bg-purple-50 rounded-lg mb-3">
                  <HardDrive className="w-8 h-8 text-purple-600 mx-auto" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{health.performance.memoryUsage}MB</p>
                <p className="text-sm text-gray-600">Memory Usage</p>
              </div>
            </div>
          </div>
        )}

        {/* Demo Access */}
        {info && info.demoUsers && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Demo Access</h2>
              <button
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center text-sm text-purple-600 hover:text-purple-700"
              >
                {showPasswords ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showPasswords ? 'Hide' : 'Show'} Passwords
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {info.demoUsers.map((user, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{user.username}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'helper' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-gray-900">{user.email}</span>
                        <button
                          onClick={() => copyToClipboard(user.email, `${user.username}-email`)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copied === `${user.username}-email` ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    {showPasswords && user.password && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Password:</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-gray-900">{user.password}</span>
                          <button
                            onClick={() => copyToClipboard(user.password!, `${user.username}-password`)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {copied === `${user.username}-password` ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Demo Tip:</strong> Use these credentials to test different user roles and permissions in the system.
              </p>
            </div>
          </div>
        )}

        {/* System Information */}
        {info && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-mono text-gray-900">{info.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build:</span>
                  <span className="font-mono text-gray-900">{info.build}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-mono text-gray-900">{health?.deployment.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Region:</span>
                  <span className="font-mono text-gray-900">{health?.deployment.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Initialized:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    info.initialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {info.initialized ? 'YES' : 'NO'}
                  </span>
                </div>
                {info.initializationTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Init Time:</span>
                    <span className="text-gray-900">{new Date(info.initializationTime).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cache Statistics */}
            {cacheStats && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Cache Statistics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memory Cache:</span>
                    <span className="font-mono text-gray-900">{cacheStats.memorySize} entries</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">LocalStorage Cache:</span>
                    <span className="font-mono text-gray-900">{cacheStats.localStorageSize} entries</span>
                  </div>
                  {health && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cache Hit Rate:</span>
                      <span className="font-mono text-gray-900">{health.stats.cacheHits}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error Rate:</span>
                    <span className="font-mono text-gray-900">{health?.stats.errorRate || 0}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features & Endpoints */}
        {info && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Features</h2>
              <div className="grid grid-cols-2 gap-2">
                {info.features.map((feature, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {info.apiEndpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <span className="font-mono text-sm text-gray-700">{endpoint}</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Services Testing */}
        {info && info.aiServices && (info.aiServices.openai.configured || info.aiServices.gemini.configured) && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">AI Services Test</h2>
              <div className="flex items-center space-x-2">
                {info.aiServices.openai.configured && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    OpenAI Ready
                  </span>
                )}
                {info.aiServices.gemini.configured && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Gemini Ready
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AITestChat className="h-96" />
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">AI Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>OpenAI:</span>
                      <span className={info.aiServices.openai.configured ? 'text-green-600' : 'text-red-600'}>
                        {info.aiServices.openai.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gemini:</span>
                      <span className={info.aiServices.gemini.configured ? 'text-green-600' : 'text-red-600'}>
                        {info.aiServices.gemini.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Default:</span>
                      <span className="text-gray-900 font-medium">{info.aiServices.defaultProvider}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Test Features</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Therapy conversation simulation</li>
                    <li>• Crisis detection and response</li>
                    <li>• Risk level assessment</li>
                    <li>• Provider switching (OpenAI/Gemini)</li>
                    <li>• Response confidence scoring</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-900 mb-2">Demo Prompts</h3>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p><strong>Low risk:</strong> &quot;I&apos;m feeling a bit stressed about work&quot;</p>
                    <p><strong>Medium risk:</strong> &quot;I&apos;ve been feeling really anxious lately&quot;</p>
                    <p><strong>High risk:</strong> &quot;I feel completely hopeless&quot;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          Last updated: {health?.lastChecked ? new Date(health.lastChecked).toLocaleString() : 'Loading...'}
        </div>
      </div>
    </div>
  );
}