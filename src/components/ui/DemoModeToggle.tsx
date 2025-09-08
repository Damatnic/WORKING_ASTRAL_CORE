'use client';

import { useState } from 'react';
import { 
  User, 
  Users, 
  Crown, 
  Play, 
  Square, 
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Info
} from 'lucide-react';
import { useDemoModeStandalone } from '@/hooks/useDemoMode';
import { useApiCache } from '@/hooks/useCache';

interface DemoUser {
  email: string;
  username: string;
  displayName: string;
  role: 'user' | 'helper' | 'admin';
  password?: string;
}

interface DemoModeToggleProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  compact?: boolean;
}

export default function DemoModeToggle({ 
  position = 'top-right', 
  compact = false 
}: DemoModeToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const { isDemoMode, currentDemoUser } = useDemoModeStandalone();
  
  // Fetch available demo users
  const { data: systemInfo, loading, error } = useApiCache<any>(
    '/api/info',
    { ttl: 300 }
  );

  const availableDemoUsers: DemoUser[] = systemInfo?.demoUsers || [];

  if (loading || error || availableDemoUsers.length === 0) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return Crown;
      case 'helper':
        return Users;
      default:
        return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'helper':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  const switchToDemoUser = (userEmail: string) => {
    const user = availableDemoUsers.find(u => u.email === userEmail);
    if (user) {
      localStorage.setItem('astral-demo-mode', 'true');
      localStorage.setItem('astral-demo-user', JSON.stringify(user));
      window.location.reload(); // Simple reload to apply demo mode
    }
  };

  const exitDemoMode = () => {
    localStorage.removeItem('astral-demo-mode');
    localStorage.removeItem('astral-demo-user');
    window.location.reload();
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Compact view when not expanded
  if (compact && !isExpanded) {
    return (
      <div className={`fixed ${getPositionClasses()} z-40`}>
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border transition-all duration-200 hover:scale-105 ${
            isDemoMode 
              ? `${getRoleColor(currentDemoUser?.role || 'user')} border-opacity-20` 
              : 'bg-gray-600 text-white border-gray-700'
          }`}
        >
          {isDemoMode ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {isDemoMode ? 'Demo' : 'Demo Mode'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-40 max-w-sm w-full`}>
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {isDemoMode ? (
              <>
                <Square className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900">Demo Active</span>
                {currentDemoUser && (
                  <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(currentDemoUser.role)}`}>
                    {currentDemoUser.role}
                  </span>
                )}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">Demo Mode</span>
              </>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isExpanded && (
          <div className="p-3">
            {isDemoMode && currentDemoUser ? (
              <div className="space-y-3">
                {/* Current demo user info */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    {(() => {
                      const Icon = getRoleIcon(currentDemoUser.role);
                      return <Icon className="w-4 h-4 text-blue-600" />;
                    })()}
                    <span className="font-medium text-blue-900">
                      {currentDemoUser.displayName}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(currentDemoUser.role)}`}>
                      {currentDemoUser.role}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    {currentDemoUser.email}
                  </p>
                  {showPasswords && currentDemoUser.password && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-600">Password:</span>
                      <div className="flex items-center space-x-1">
                        <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                          {currentDemoUser.password}
                        </code>
                        <button
                          onClick={() => copyToClipboard(currentDemoUser.password!, 'password')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {copied === 'password' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Switch user options */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Switch User:</h4>
                  <div className="space-y-2">
                    {availableDemoUsers
                      .filter(user => user.email !== currentDemoUser.email)
                      .map((user, index) => (
                        <button
                          key={index}
                          onClick={() => switchToDemoUser(user.email)}
                          className="w-full flex items-center justify-between p-2 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const Icon = getRoleIcon(user.role);
                              return <Icon className="w-3 h-3 text-gray-600" />;
                            })()}
                            <span>{user.displayName}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                  >
                    {showPasswords ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    {showPasswords ? 'Hide' : 'Show'} Passwords
                  </button>
                  <button
                    onClick={exitDemoMode}
                    className="bg-red-600 text-white px-3 py-1 text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    <Square className="w-3 h-3 mr-1 inline" />
                    Exit Demo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Demo mode explanation */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-800 mb-1">
                        <strong>Demo Mode</strong>
                      </p>
                      <p className="text-xs text-green-700">
                        Try out the platform with pre-configured demo accounts. 
                        Switch between different user roles to see various features.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Demo user options */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Choose Demo User:</h4>
                  <div className="space-y-2">
                    {availableDemoUsers.map((user, index) => (
                      <button
                        key={index}
                        onClick={() => switchToDemoUser(user.email)}
                        className="w-full flex items-center justify-between p-3 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const Icon = getRoleIcon(user.role);
                            return <Icon className="w-4 h-4 text-gray-600" />;
                          })()}
                          <div className="text-left">
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                          <Play className="w-3 h-3 text-green-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show passwords toggle */}
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                >
                  {showPasswords ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {showPasswords ? 'Hide' : 'Show'} Passwords
                </button>

                {/* Password display */}
                {showPasswords && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-gray-700">Demo Passwords:</h5>
                    {availableDemoUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{user.displayName}:</span>
                        {user.password && (
                          <div className="flex items-center space-x-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">
                              {user.password}
                            </code>
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
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}