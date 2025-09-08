'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  Bars3Icon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  TouchIcon,
  WifiIcon,
  BatteryIcon,
  SignalIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  SpeakerWaveIcon,
  BellIcon,
  CogIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  DevicePhoneMobileIcon as DevicePhoneMobileIconSolid,
  BellIcon as BellIconSolid
} from '@heroicons/react/24/solid';

interface ViewportSettings {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  touchCapable: boolean;
}

interface MobileSettings {
  adaptiveLayout: boolean;
  touchOptimization: boolean;
  gestureNavigation: boolean;
  swipeActions: boolean;
  pullToRefresh: boolean;
  infiniteScroll: boolean;
  reducedAnimations: boolean;
  largerTouchTargets: boolean;
  simplifiedNavigation: boolean;
  offlineIndicator: boolean;
  batteryOptimization: boolean;
  networkOptimization: boolean;
}

interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  hasKeyboard: boolean;
  hasMouse: boolean;
  supportsHover: boolean;
  connectionType: 'wifi' | 'cellular' | 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'unknown';
  batteryLevel?: number;
  isCharging?: boolean;
  memoryStatus: 'low' | 'normal' | 'high';
}

interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

interface MobileOptimizationContext {
  viewport: ViewportSettings;
  settings: MobileSettings;
  capabilities: DeviceCapabilities;
  breakpoints: ResponsiveBreakpoints;
  updateSettings: (settings: Partial<MobileSettings>) => void;
  adaptToDevice: () => void;
  optimizeForNetwork: (connectionType: string) => void;
  enableTouchMode: () => void;
  disableTouchMode: () => void;
}

const MobileOptimizationContext = createContext<MobileOptimizationContext | undefined>(undefined);

export const useMobileOptimization = () => {
  const context = useContext(MobileOptimizationContext);
  if (!context) {
    throw new Error('useMobileOptimization must be used within a MobileOptimizationProvider');
  }
  return context;
};

const MobileOptimization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'layout' | 'performance' | 'testing'>('overview');
  const [viewport, setViewport] = useState<ViewportSettings>({
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    touchCapable: 'ontouchstart' in window
  });
  const [settings, setSettings] = useState<MobileSettings>({
    adaptiveLayout: true,
    touchOptimization: true,
    gestureNavigation: true,
    swipeActions: true,
    pullToRefresh: true,
    infiniteScroll: true,
    reducedAnimations: false,
    largerTouchTargets: true,
    simplifiedNavigation: true,
    offlineIndicator: true,
    batteryOptimization: true,
    networkOptimization: true
  });
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    isMobile: window.innerWidth <= 768,
    isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024,
    hasTouch: 'ontouchstart' in window,
    hasKeyboard: true,
    hasMouse: window.matchMedia('(pointer: fine)').matches,
    supportsHover: window.matchMedia('(hover: hover)').matches,
    connectionType: 'wifi',
    memoryStatus: 'normal'
  });
  const [simulatedDevice, setSimulatedDevice] = useState<string>('auto');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 2.3,
    interactionDelay: 45,
    renderTime: 16.7,
    memoryUsage: 45.2,
    batteryImpact: 'low'
  });

  const devicePresets = {
    'iphone-se': { width: 375, height: 667, ratio: 2, name: 'iPhone SE' },
    'iphone-12': { width: 390, height: 844, ratio: 3, name: 'iPhone 12' },
    'iphone-14-pro': { width: 393, height: 852, ratio: 3, name: 'iPhone 14 Pro' },
    'pixel-7': { width: 412, height: 915, ratio: 2.625, name: 'Google Pixel 7' },
    'galaxy-s23': { width: 384, height: 854, ratio: 3, name: 'Samsung Galaxy S23' },
    'ipad': { width: 768, height: 1024, ratio: 2, name: 'iPad' },
    'ipad-pro': { width: 834, height: 1194, ratio: 2, name: 'iPad Pro' },
    'desktop': { width: 1920, height: 1080, ratio: 1, name: 'Desktop' }
  };

  const breakpoints: ResponsiveBreakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
    largeDesktop: 1920
  };

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        touchCapable: 'ontouchstart' in window
      });

      setCapabilities(prev => ({
        ...prev,
        isMobile: window.innerWidth <= breakpoints.mobile,
        isTablet: window.innerWidth > breakpoints.mobile && window.innerWidth <= breakpoints.tablet,
        isDesktop: window.innerWidth > breakpoints.tablet,
        hasTouch: 'ontouchstart' in window,
        hasMouse: window.matchMedia('(pointer: fine)').matches,
        supportsHover: window.matchMedia('(hover: hover)').matches
      }));
    };

    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        setCapabilities(prev => ({
          ...prev,
          connectionType: conn.effectiveType || 'unknown'
        }));
      }
    };

    const handleBatteryChange = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setCapabilities(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isCharging: battery.charging
          }));
        } catch (error) {
          console.log('Battery API not supported');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    
    handleConnectionChange();
    handleBatteryChange();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  const simulateDevice = (deviceKey: string) => {
    if (deviceKey === 'auto') {
      setIsPreviewMode(false);
      return;
    }

    const device = devicePresets[deviceKey as keyof typeof devicePresets];
    if (device) {
      setSimulatedDevice(deviceKey);
      setIsPreviewMode(true);
      setViewport({
        width: device.width,
        height: device.height,
        devicePixelRatio: device.ratio,
        orientation: device.width > device.height ? 'landscape' : 'portrait',
        touchCapable: deviceKey !== 'desktop'
      });
    }
  };

  const optimizeForPerformance = () => {
    setSettings(prev => ({
      ...prev,
      reducedAnimations: capabilities.batteryLevel ? capabilities.batteryLevel < 20 : false,
      batteryOptimization: true,
      networkOptimization: capabilities.connectionType === 'slow-2g' || capabilities.connectionType === '2g'
    }));
  };

  const getDeviceTypeIcon = () => {
    if (capabilities.isMobile) return <DevicePhoneMobileIconSolid className="w-6 h-6 text-blue-600" />;
    if (capabilities.isTablet) return <DeviceTabletIcon className="w-6 h-6 text-green-600" />;
    return <ComputerDesktopIcon className="w-6 h-6 text-purple-600" />;
  };

  const getConnectionIcon = () => {
    switch (capabilities.connectionType) {
      case 'wifi':
        return <WifiIcon className="w-5 h-5 text-green-600" />;
      case '5g':
      case '4g':
        return <SignalIcon className="w-5 h-5 text-green-600" />;
      case '3g':
        return <SignalIcon className="w-5 h-5 text-yellow-600" />;
      case '2g':
      case 'slow-2g':
        return <SignalIcon className="w-5 h-5 text-red-600" />;
      default:
        return <SignalIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBatteryColor = () => {
    if (!capabilities.batteryLevel) return 'text-gray-600';
    if (capabilities.batteryLevel > 50) return 'text-green-600';
    if (capabilities.batteryLevel > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <DevicePhoneMobileIconSolid className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mobile Optimization</h1>
              <p className="text-gray-600">Responsive design and mobile experience management</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={simulatedDevice}
              onChange={(e) => simulateDevice(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">Auto Detect</option>
              <optgroup label="Mobile">
                <option value="iphone-se">iPhone SE</option>
                <option value="iphone-12">iPhone 12</option>
                <option value="iphone-14-pro">iPhone 14 Pro</option>
                <option value="pixel-7">Google Pixel 7</option>
                <option value="galaxy-s23">Samsung Galaxy S23</option>
              </optgroup>
              <optgroup label="Tablet">
                <option value="ipad">iPad</option>
                <option value="ipad-pro">iPad Pro</option>
              </optgroup>
              <optgroup label="Desktop">
                <option value="desktop">Desktop</option>
              </optgroup>
            </select>
            
            <button
              onClick={optimizeForPerformance}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              <span>Auto Optimize</span>
            </button>
          </div>
        </div>

        {/* Device Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="flex items-center space-x-2">
              {getDeviceTypeIcon()}
              <div>
                <p className="text-xs font-medium text-gray-700">Device</p>
                <p className="text-sm text-gray-900">
                  {capabilities.isMobile ? 'Mobile' : capabilities.isTablet ? 'Tablet' : 'Desktop'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-medium text-gray-700">Viewport</p>
                <p className="text-sm text-gray-900">{viewport.width}×{viewport.height}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <div>
                <p className="text-xs font-medium text-gray-700">Connection</p>
                <p className="text-sm text-gray-900 capitalize">{capabilities.connectionType}</p>
              </div>
            </div>

            {capabilities.batteryLevel !== undefined && (
              <div className="flex items-center space-x-2">
                <BatteryIcon className={`w-5 h-5 ${getBatteryColor()}`} />
                <div>
                  <p className="text-xs font-medium text-gray-700">Battery</p>
                  <p className="text-sm text-gray-900">{capabilities.batteryLevel}%</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <TouchIcon className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-medium text-gray-700">Input</p>
                <p className="text-sm text-gray-900">
                  {capabilities.hasTouch ? 'Touch' : 'Mouse'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-5 h-5 rounded-full ${viewport.orientation === 'portrait' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              <div>
                <p className="text-xs font-medium text-gray-700">Orientation</p>
                <p className="text-sm text-gray-900 capitalize">{viewport.orientation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: EyeIcon },
              { id: 'layout', label: 'Responsive Layout', icon: DevicePhoneMobileIcon },
              { id: 'performance', label: 'Performance', icon: AdjustmentsHorizontalIcon },
              { id: 'testing', label: 'Testing', icon: CheckCircleIcon }
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Optimization Score */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Mobile Optimization Score</h2>
              <div className="text-3xl font-bold text-green-600">87%</div>
            </div>
            
            <div className="space-y-3">
              {[
                { category: 'Responsive Design', score: 92, color: 'bg-green-500' },
                { category: 'Touch Optimization', score: 88, color: 'bg-green-500' },
                { category: 'Performance', score: 84, color: 'bg-yellow-500' },
                { category: 'Accessibility', score: 91, color: 'bg-green-500' },
                { category: 'Network Efficiency', score: 79, color: 'bg-yellow-500' }
              ].map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.category}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.color} transition-all`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{item.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(settings).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Optimization Recommendations</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Enable Touch Optimization</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Increase touch target sizes for better mobile interaction on therapy and crisis support buttons.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900">Optimize for Slow Connections</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Consider enabling network optimization to improve experience on slower connections.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-900">Battery Optimization Active</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Battery optimization is helping preserve device battery life during extended therapy sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          {/* Breakpoint Testing */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsive Breakpoints</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(breakpoints).map(([name, width]) => (
                <div key={name} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className={`mx-auto mb-2 ${
                    name === 'mobile' ? 'w-6 h-10' :
                    name === 'tablet' ? 'w-8 h-10' :
                    name === 'desktop' ? 'w-12 h-8' :
                    'w-16 h-10'
                  } bg-blue-600 rounded`}></div>
                  <h3 className="font-medium text-gray-900 capitalize">{name}</h3>
                  <p className="text-sm text-gray-600">{width}px+</p>
                  <div className={`mt-2 text-xs px-2 py-1 rounded-full ${
                    viewport.width >= width ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {viewport.width >= width ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Layout Optimization</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Navigation</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.simplifiedNavigation}
                      onChange={(e) => setSettings(prev => ({ ...prev, simplifiedNavigation: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Simplified mobile navigation</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.gestureNavigation}
                      onChange={(e) => setSettings(prev => ({ ...prev, gestureNavigation: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Gesture navigation support</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.swipeActions}
                      onChange={(e) => setSettings(prev => ({ ...prev, swipeActions: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Swipe actions on cards</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Content</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.adaptiveLayout}
                      onChange={(e) => setSettings(prev => ({ ...prev, adaptiveLayout: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Adaptive layout based on screen size</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.infiniteScroll}
                      onChange={(e) => setSettings(prev => ({ ...prev, infiniteScroll: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Infinite scroll for content lists</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.pullToRefresh}
                      onChange={(e) => setSettings(prev => ({ ...prev, pullToRefresh: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Pull-to-refresh functionality</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Touch Optimization</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.touchOptimization}
                      onChange={(e) => setSettings(prev => ({ ...prev, touchOptimization: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Enhanced touch interactions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.largerTouchTargets}
                      onChange={(e) => setSettings(prev => ({ ...prev, largerTouchTargets: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Larger touch targets (44px minimum)</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Performance</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.reducedAnimations}
                      onChange={(e) => setSettings(prev => ({ ...prev, reducedAnimations: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Reduced animations for better performance</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.networkOptimization}
                      onChange={(e) => setSettings(prev => ({ ...prev, networkOptimization: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Network-aware content loading</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.batteryOptimization}
                      onChange={(e) => setSettings(prev => ({ ...prev, batteryOptimization: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Battery-conscious optimizations</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Load Time</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.loadTime}s</p>
                </div>
                <div className={`rounded-full p-2 ${
                  performanceMetrics.loadTime < 3 ? 'bg-green-100' : 
                  performanceMetrics.loadTime < 5 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <div className="w-4 h-4"></div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: &lt; 3s for mobile
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Interaction Delay</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.interactionDelay}ms</p>
                </div>
                <div className={`rounded-full p-2 ${
                  performanceMetrics.interactionDelay < 50 ? 'bg-green-100' : 
                  performanceMetrics.interactionDelay < 100 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <div className="w-4 h-4"></div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: &lt; 50ms
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Frame Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.renderTime}ms</p>
                </div>
                <div className={`rounded-full p-2 ${
                  performanceMetrics.renderTime < 17 ? 'bg-green-100' : 
                  performanceMetrics.renderTime < 33 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <div className="w-4 h-4"></div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: &lt; 16.7ms (60 FPS)
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.memoryUsage}MB</p>
                </div>
                <div className={`rounded-full p-2 ${
                  performanceMetrics.memoryUsage < 50 ? 'bg-green-100' : 
                  performanceMetrics.memoryUsage < 100 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <div className="w-4 h-4"></div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Target: &lt; 50MB
              </div>
            </div>
          </div>

          {/* Performance Optimizations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Optimizations</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Network Optimizations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Image Compression</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Lazy Loading</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">CDN Delivery</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Gzip Compression</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Resource Management</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Code Splitting</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Tree Shaking</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Bundle Optimization</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Caching Strategy</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testing Tab */}
      {activeTab === 'testing' && (
        <div className="space-y-6">
          {/* Device Testing */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Device Testing</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(devicePresets).map(([key, device]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{device.name}</h3>
                    <button
                      onClick={() => simulateDevice(key)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        simulatedDevice === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {simulatedDevice === key ? 'Active' : 'Test'}
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {device.width} × {device.height} ({device.ratio}x)
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      viewport.width === device.width ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      {viewport.width === device.width ? 'Current' : 'Available'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Checklist */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Mobile Optimization Checklist</h2>
            
            <div className="space-y-4">
              {[
                { item: 'Touch targets are at least 44px in size', status: 'pass' },
                { item: 'Text is readable without zooming (16px minimum)', status: 'pass' },
                { item: 'Content fits viewport without horizontal scrolling', status: 'pass' },
                { item: 'Interactive elements are easily tappable', status: 'pass' },
                { item: 'Loading time is under 3 seconds on mobile', status: 'warning' },
                { item: 'Forms are optimized for mobile input', status: 'pass' },
                { item: 'Navigation works with one hand', status: 'pass' },
                { item: 'Crisis buttons are prominent and accessible', status: 'pass' },
                { item: 'Offline functionality available', status: 'fail' },
                { item: 'Battery usage is optimized', status: 'pass' }
              ].map((check, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    check.status === 'pass' ? 'bg-green-100' :
                    check.status === 'warning' ? 'bg-yellow-100' :
                    'bg-red-100'
                  }`}>
                    {check.status === 'pass' && <CheckCircleIcon className="w-3 h-3 text-green-600" />}
                    {check.status === 'warning' && <ExclamationTriangleIcon className="w-3 h-3 text-yellow-600" />}
                    {check.status === 'fail' && <XMarkIcon className="w-3 h-3 text-red-600" />}
                  </div>
                  <span className="text-sm text-gray-700">{check.item}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    check.status === 'pass' ? 'bg-green-100 text-green-800' :
                    check.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MobileOptimizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewport, setViewport] = useState<ViewportSettings>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    orientation: typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    touchCapable: typeof window !== 'undefined' ? 'ontouchstart' in window : false
  });

  const [settings, setSettings] = useState<MobileSettings>({
    adaptiveLayout: true,
    touchOptimization: true,
    gestureNavigation: true,
    swipeActions: true,
    pullToRefresh: true,
    infiniteScroll: true,
    reducedAnimations: false,
    largerTouchTargets: true,
    simplifiedNavigation: true,
    offlineIndicator: true,
    batteryOptimization: true,
    networkOptimization: true
  });

  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    isMobile: typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth > 768 && window.innerWidth <= 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth > 1024 : true,
    hasTouch: typeof window !== 'undefined' ? 'ontouchstart' in window : false,
    hasKeyboard: true,
    hasMouse: typeof window !== 'undefined' ? window.matchMedia('(pointer: fine)').matches : true,
    supportsHover: typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : true,
    connectionType: 'wifi',
    memoryStatus: 'normal'
  });

  const breakpoints: ResponsiveBreakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
    largeDesktop: 1920
  };

  const updateSettings = (newSettings: Partial<MobileSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const adaptToDevice = () => {
    // Automatically adapt settings based on device capabilities
    setSettings(prev => ({
      ...prev,
      touchOptimization: capabilities.hasTouch,
      largerTouchTargets: capabilities.isMobile,
      simplifiedNavigation: capabilities.isMobile,
      gestureNavigation: capabilities.hasTouch && capabilities.isMobile
    }));
  };

  const optimizeForNetwork = (connectionType: string) => {
    setSettings(prev => ({
      ...prev,
      networkOptimization: connectionType === 'slow-2g' || connectionType === '2g',
      reducedAnimations: connectionType === 'slow-2g' || connectionType === '2g'
    }));
  };

  const enableTouchMode = () => {
    setSettings(prev => ({
      ...prev,
      touchOptimization: true,
      largerTouchTargets: true,
      gestureNavigation: true,
      swipeActions: true
    }));
  };

  const disableTouchMode = () => {
    setSettings(prev => ({
      ...prev,
      touchOptimization: false,
      gestureNavigation: false,
      swipeActions: false
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        touchCapable: 'ontouchstart' in window
      });

      setCapabilities(prev => ({
        ...prev,
        isMobile: window.innerWidth <= breakpoints.mobile,
        isTablet: window.innerWidth > breakpoints.mobile && window.innerWidth <= breakpoints.tablet,
        isDesktop: window.innerWidth > breakpoints.tablet
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <MobileOptimizationContext.Provider value={{
      viewport,
      settings,
      capabilities,
      breakpoints,
      updateSettings,
      adaptToDevice,
      optimizeForNetwork,
      enableTouchMode,
      disableTouchMode
    }}>
      {children}
    </MobileOptimizationContext.Provider>
  );
};

export default MobileOptimization;