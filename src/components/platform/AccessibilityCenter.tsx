'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  SpeakerWaveIcon,
  CommandLineIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  PaintBrushIcon,
  CursorArrowRippleIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SunIcon,
  MoonIcon,
  SwatchIcon,
  EyeSlashIcon,
  HandRaisedIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BeakerIcon,
  BugAntIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import {
  EyeIcon as EyeIconSolid,
  SpeakerWaveIcon as SpeakerWaveIconSolid,
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';

interface AccessibilitySettings {
  visualSettings: {
    fontSize: number;
    fontFamily: string;
    contrast: 'normal' | 'high' | 'inverted';
    colorScheme: 'light' | 'dark' | 'auto';
    reducedMotion: boolean;
    focusIndicator: 'default' | 'enhanced' | 'high-contrast';
    cursorSize: 'default' | 'large' | 'extra-large';
    linkUnderlines: boolean;
    buttonHighlights: boolean;
  };
  audioSettings: {
    screenReaderSupport: boolean;
    soundEffects: boolean;
    audioDescriptions: boolean;
    captionsEnabled: boolean;
    audioSpeed: number;
    audioVolume: number;
  };
  motorSettings: {
    keyboardNavigation: boolean;
    stickyKeys: boolean;
    slowKeys: boolean;
    clickDelay: number;
    dragDelay: number;
    autoScroll: boolean;
    voiceControl: boolean;
  };
  cognitiveSettings: {
    simplifiedInterface: boolean;
    autoplayMedia: boolean;
    timeoutWarnings: boolean;
    sessionExtension: boolean;
    readingMode: boolean;
    contentSummaries: boolean;
    progressIndicators: boolean;
  };
}

interface AccessibilityTest {
  id: string;
  name: string;
  category: 'visual' | 'audio' | 'motor' | 'cognitive' | 'technical';
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriteria: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'not-tested';
  lastTested: Date;
  issues: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    element?: string;
    recommendation: string;
  }>;
  automated: boolean;
}

interface AccessibilityReport {
  id: string;
  name: string;
  generatedAt: Date;
  pagesTested: number;
  overallScore: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    notTested: number;
  };
  categories: {
    visual: { score: number; tests: number; issues: number };
    audio: { score: number; tests: number; issues: number };
    motor: { score: number; tests: number; issues: number };
    cognitive: { score: number; tests: number; issues: number };
    technical: { score: number; tests: number; issues: number };
  };
  criticalIssues: Array<{
    page: string;
    issue: string;
    impact: string;
    recommendation: string;
  }>;
}

interface AccessibilityContext {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string) => void;
  focusElement: (elementId: string) => void;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  fontSize: number;
}

const AccessibilityContext = createContext<AccessibilityContext | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

const AccessibilityCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'testing' | 'reports' | 'guidelines'>('settings');
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    visualSettings: {
      fontSize: 16,
      fontFamily: 'system',
      contrast: 'normal',
      colorScheme: 'auto',
      reducedMotion: false,
      focusIndicator: 'default',
      cursorSize: 'default',
      linkUnderlines: true,
      buttonHighlights: false
    },
    audioSettings: {
      screenReaderSupport: true,
      soundEffects: true,
      audioDescriptions: false,
      captionsEnabled: true,
      audioSpeed: 1.0,
      audioVolume: 1.0
    },
    motorSettings: {
      keyboardNavigation: true,
      stickyKeys: false,
      slowKeys: false,
      clickDelay: 0,
      dragDelay: 0,
      autoScroll: false,
      voiceControl: false
    },
    cognitiveSettings: {
      simplifiedInterface: false,
      autoplayMedia: false,
      timeoutWarnings: true,
      sessionExtension: true,
      readingMode: false,
      contentSummaries: false,
      progressIndicators: true
    }
  });
  const [tests, setTests] = useState<AccessibilityTest[]>([]);
  const [reports, setReports] = useState<AccessibilityReport[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [selectedTest, setSelectedTest] = useState<AccessibilityTest | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [testsRes, reportsRes, settingsRes] = await Promise.all([
          fetch('/api/platform/accessibility/tests'),
          fetch('/api/platform/accessibility/reports'),
          fetch('/api/platform/accessibility/settings')
        ]);

        if (!testsRes.ok || !reportsRes.ok) {
          throw new Error('Failed to fetch accessibility data');
        }

        const testsData = await testsRes.json();
        const reportsData = await reportsRes.json();

        setTests(testsData.tests || []);
        setReports(reportsData.reports || []);

        // Load settings if available
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            setAccessibilitySettings(settingsData.settings);
          }
        }
      } catch (err) {
        console.error('Error fetching accessibility data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load accessibility data');
        // Set empty arrays as fallback
        setTests([]);
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  const getStatusIcon = (status: AccessibilityTest['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <InformationCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'not-tested':
        return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />;
    }
  };

  const getStatusColor = (status: AccessibilityTest['status']) => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-100';
      case 'fail':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'not-tested':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800 bg-red-100';
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: AccessibilityTest['category']) => {
    switch (category) {
      case 'visual':
        return <EyeIcon className="w-5 h-5" />;
      case 'audio':
        return <SpeakerWaveIcon className="w-5 h-5" />;
      case 'motor':
        return <CursorArrowRippleIcon className="w-5 h-5" />;
      case 'cognitive':
        return <HandRaisedIcon className="w-5 h-5" />;
      case 'technical':
        return <CommandLineIcon className="w-5 h-5" />;
      default:
        return <Cog6ToothIcon className="w-5 h-5" />;
    }
  };

  const runAccessibilityTests = async () => {
    setIsRunningTests(true);
    
    try {
      const response = await fetch('/api/platform/accessibility/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testIds: tests.map(t => t.id)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run tests');
      }

      const result = await response.json();
      
      // Poll for test results
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/platform/accessibility/tests/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setTests(statusData.tests || []);
            
            // Stop polling when all tests are complete
            const allComplete = statusData.tests.every((t: AccessibilityTest) => 
              t.status !== 'running'
            );
            if (allComplete) {
              clearInterval(pollInterval);
              setIsRunningTests(false);
            }
          }
        } catch (err) {
          console.error('Error polling test status:', err);
        }
      }, 2000);

      // Clear interval after 5 minutes to prevent memory leaks
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsRunningTests(false);
      }, 300000);
    } catch (err) {
      console.error('Error running tests:', err);
      alert('Failed to run accessibility tests. Please try again.');
      setIsRunningTests(false);
    }
  };

  const updateSettings = async (category: keyof AccessibilitySettings, settings: any) => {
    const newSettings = {
      ...accessibilitySettings,
      [category]: { ...accessibilitySettings[category], ...settings }
    };
    
    setAccessibilitySettings(newSettings);

    // Save to API
    try {
      await fetch('/api/platform/accessibility/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
    } catch (err) {
      console.error('Error saving accessibility settings:', err);
    }
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
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Accessibility Data</h3>
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
            <EyeIconSolid className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accessibility Center</h1>
              <p className="text-gray-600">WCAG compliance and accessibility management</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              <span>User Settings</span>
            </button>
            
            <button
              onClick={runAccessibilityTests}
              disabled={isRunningTests}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isRunningTests ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              <span>{isRunningTests ? 'Running...' : 'Run Tests'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'settings', label: 'User Settings', icon: AdjustmentsHorizontalIcon },
              { id: 'testing', label: 'Accessibility Testing', icon: BeakerIcon },
              { id: 'reports', label: 'Compliance Reports', icon: DocumentTextIcon },
              { id: 'guidelines', label: 'Guidelines', icon: ShieldCheckIcon }
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

      {/* User Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Visual Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <EyeIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Visual Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size: {accessibilitySettings.visualSettings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={accessibilitySettings.visualSettings.fontSize}
                  onChange={(e) => updateSettings('visualSettings', { fontSize: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <div className="space-y-2">
                  {[
                    { value: 'light', label: 'Light', icon: SunIcon },
                    { value: 'dark', label: 'Dark', icon: MoonIcon },
                    { value: 'auto', label: 'Auto', icon: SwatchIcon }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="colorScheme"
                        value={option.value}
                        checked={accessibilitySettings.visualSettings.colorScheme === option.value}
                        onChange={(e) => updateSettings('visualSettings', { colorScheme: e.target.value })}
                        className="mr-2"
                      />
                      <option.icon className="w-4 h-4 mr-2" />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contrast</label>
                <select
                  value={accessibilitySettings.visualSettings.contrast}
                  onChange={(e) => updateSettings('visualSettings', { contrast: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Contrast</option>
                  <option value="inverted">Inverted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Focus Indicator</label>
                <select
                  value={accessibilitySettings.visualSettings.focusIndicator}
                  onChange={(e) => updateSettings('visualSettings', { focusIndicator: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="default">Default</option>
                  <option value="enhanced">Enhanced</option>
                  <option value="high-contrast">High Contrast</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.visualSettings.reducedMotion}
                  onChange={(e) => updateSettings('visualSettings', { reducedMotion: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Reduce motion and animations</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.visualSettings.linkUnderlines}
                  onChange={(e) => updateSettings('visualSettings', { linkUnderlines: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Always show link underlines</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.visualSettings.buttonHighlights}
                  onChange={(e) => updateSettings('visualSettings', { buttonHighlights: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Enhanced button highlights</span>
              </label>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <SpeakerWaveIcon className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Audio & Screen Reader</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Speed: {accessibilitySettings.audioSettings.audioSpeed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={accessibilitySettings.audioSettings.audioSpeed}
                  onChange={(e) => updateSettings('audioSettings', { audioSpeed: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume: {Math.round(accessibilitySettings.audioSettings.audioVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={accessibilitySettings.audioSettings.audioVolume}
                  onChange={(e) => updateSettings('audioSettings', { audioVolume: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.audioSettings.screenReaderSupport}
                  onChange={(e) => updateSettings('audioSettings', { screenReaderSupport: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Enable screen reader support</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.audioSettings.captionsEnabled}
                  onChange={(e) => updateSettings('audioSettings', { captionsEnabled: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Show captions for video content</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.audioSettings.audioDescriptions}
                  onChange={(e) => updateSettings('audioSettings', { audioDescriptions: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Enable audio descriptions</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.audioSettings.soundEffects}
                  onChange={(e) => updateSettings('audioSettings', { soundEffects: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Play sound effects</span>
              </label>
            </div>
          </div>

          {/* Motor Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CursorArrowRippleIcon className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Motor & Navigation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Click Delay: {accessibilitySettings.motorSettings.clickDelay}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={accessibilitySettings.motorSettings.clickDelay}
                  onChange={(e) => updateSettings('motorSettings', { clickDelay: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drag Delay: {accessibilitySettings.motorSettings.dragDelay}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="100"
                  value={accessibilitySettings.motorSettings.dragDelay}
                  onChange={(e) => updateSettings('motorSettings', { dragDelay: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.motorSettings.keyboardNavigation}
                  onChange={(e) => updateSettings('motorSettings', { keyboardNavigation: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Enhanced keyboard navigation</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.motorSettings.stickyKeys}
                  onChange={(e) => updateSettings('motorSettings', { stickyKeys: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Sticky keys support</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.motorSettings.autoScroll}
                  onChange={(e) => updateSettings('motorSettings', { autoScroll: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Auto-scroll on focus</span>
              </label>
            </div>
          </div>

          {/* Cognitive Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <HandRaisedIcon className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Cognitive Support</h2>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.cognitiveSettings.simplifiedInterface}
                  onChange={(e) => updateSettings('cognitiveSettings', { simplifiedInterface: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Simplified interface mode</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.cognitiveSettings.readingMode}
                  onChange={(e) => updateSettings('cognitiveSettings', { readingMode: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Reading mode for text content</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.cognitiveSettings.contentSummaries}
                  onChange={(e) => updateSettings('cognitiveSettings', { contentSummaries: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Show content summaries</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.cognitiveSettings.progressIndicators}
                  onChange={(e) => updateSettings('cognitiveSettings', { progressIndicators: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Show progress indicators</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilitySettings.cognitiveSettings.timeoutWarnings}
                  onChange={(e) => updateSettings('cognitiveSettings', { timeoutWarnings: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Session timeout warnings</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!accessibilitySettings.cognitiveSettings.autoplayMedia}
                  onChange={(e) => updateSettings('cognitiveSettings', { autoplayMedia: !e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Disable autoplay for media</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Testing Tab */}
      {activeTab === 'testing' && (
        <div className="space-y-6">
          {/* Test Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Passed', count: tests.filter(t => t.status === 'pass').length, color: 'text-green-600 bg-green-100' },
              { label: 'Failed', count: tests.filter(t => t.status === 'fail').length, color: 'text-red-600 bg-red-100' },
              { label: 'Warnings', count: tests.filter(t => t.status === 'warning').length, color: 'text-yellow-600 bg-yellow-100' },
              { label: 'Not Tested', count: tests.filter(t => t.status === 'not-tested').length, color: 'text-gray-600 bg-gray-100' }
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                  </div>
                  <div className={`rounded-full p-2 ${stat.color}`}>
                    <div className="w-4 h-4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tests List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Accessibility Tests</h2>
                <div className="flex space-x-2">
                  <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <BugAntIcon className="w-5 h-5" />
                    <span>Manual Test</span>
                  </button>
                  <button
                    onClick={runAccessibilityTests}
                    disabled={isRunningTests}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {isRunningTests ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <PlayIcon className="w-5 h-5" />
                    )}
                    <span>{isRunningTests ? 'Running...' : 'Run All'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {tests.map((test) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTest(test)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(test.status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{test.name}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getStatusColor(test.status)
                          }`}>
                            {test.status.replace('-', ' ')}
                          </span>
                          <div className="flex items-center space-x-1">
                            {getCategoryIcon(test.category)}
                            <span className="text-sm text-gray-500 capitalize">{test.category}</span>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            WCAG {test.wcagLevel} - {test.wcagCriteria}
                          </span>
                          {test.automated && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Automated
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-3">{test.description}</p>

                        {test.issues.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-900">Issues Found:</h4>
                            {test.issues.slice(0, 2).map((issue) => (
                              <div key={issue.id} className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded p-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                  getSeverityColor(issue.severity)
                                }`}>
                                  {issue.severity}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-red-800">{issue.description}</p>
                                  {issue.element && (
                                    <p className="text-xs text-red-600 mt-1">Element: <code>{issue.element}</code></p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {test.issues.length > 2 && (
                              <p className="text-sm text-gray-600">
                                +{test.issues.length - 2} more issue{test.issues.length - 2 !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="text-sm text-gray-500 mt-3">
                          Last tested: {test.lastTested.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                        <PlayIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <InformationCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{report.name}</h2>
                  <p className="text-sm text-gray-600">
                    Generated {report.generatedAt.toLocaleString()} • {report.pagesTested} pages tested
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{report.overallScore}%</div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.summary.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.summary.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{report.summary.notTested}</div>
                  <div className="text-sm text-gray-600">Not Tested</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.summary.totalTests}</div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Category Scores</h3>
                <div className="space-y-3">
                  {Object.entries(report.categories).map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(category as any)}
                        <span className="font-medium text-gray-900 capitalize">{category}</span>
                        <span className="text-sm text-gray-600">
                          ({data.tests} tests, {data.issues} issues)
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              data.score >= 80 ? 'bg-green-500' : 
                              data.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${data.score}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 w-12">{data.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Issues */}
              {report.criticalIssues.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Critical Issues</h3>
                  <div className="space-y-3">
                    {report.criticalIssues.map((issue, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-red-900">{issue.page}</h4>
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                Critical
                              </span>
                            </div>
                            <p className="text-sm text-red-800 mb-2">{issue.issue}</p>
                            <p className="text-sm text-red-700 mb-2"><strong>Impact:</strong> {issue.impact}</p>
                            <p className="text-sm text-red-700"><strong>Recommendation:</strong> {issue.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guidelines Tab */}
      {activeTab === 'guidelines' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">WCAG 2.1 Guidelines</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <EyeIcon className="w-6 h-6 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Perceivable</h3>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Text alternatives</li>
                  <li>• Time-based media</li>
                  <li>• Adaptable content</li>
                  <li>• Distinguishable content</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <CursorArrowRippleIcon className="w-6 h-6 text-green-600" />
                  <h3 className="font-medium text-gray-900">Operable</h3>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Keyboard accessible</li>
                  <li>• No seizures</li>
                  <li>• Navigable</li>
                  <li>• Input methods</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <HandRaisedIcon className="w-6 h-6 text-purple-600" />
                  <h3 className="font-medium text-gray-900">Understandable</h3>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Readable text</li>
                  <li>• Predictable functionality</li>
                  <li>• Input assistance</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <ShieldCheckIcon className="w-6 h-6 text-orange-600" />
                  <h3 className="font-medium text-gray-900">Robust</h3>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Compatible markup</li>
                  <li>• Assistive technology</li>
                  <li>• Future-proof code</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Reference</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900">Level A (Minimum)</h3>
                <p className="text-sm text-gray-600">Essential accessibility features that provide the most basic level of accessibility.</p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-medium text-gray-900">Level AA (Standard)</h3>
                <p className="text-sm text-gray-600">Recommended level for most websites. Removes significant barriers to accessibility.</p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-medium text-gray-900">Level AAA (Enhanced)</h3>
                <p className="text-sm text-gray-600">Highest level of accessibility. Provides comprehensive accessibility features.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    visualSettings: {
      fontSize: 16,
      fontFamily: 'system',
      contrast: 'normal',
      colorScheme: 'auto',
      reducedMotion: false,
      focusIndicator: 'default',
      cursorSize: 'default',
      linkUnderlines: true,
      buttonHighlights: false
    },
    audioSettings: {
      screenReaderSupport: true,
      soundEffects: true,
      audioDescriptions: false,
      captionsEnabled: true,
      audioSpeed: 1.0,
      audioVolume: 1.0
    },
    motorSettings: {
      keyboardNavigation: true,
      stickyKeys: false,
      slowKeys: false,
      clickDelay: 0,
      dragDelay: 0,
      autoScroll: false,
      voiceControl: false
    },
    cognitiveSettings: {
      simplifiedInterface: false,
      autoplayMedia: false,
      timeoutWarnings: true,
      sessionExtension: true,
      readingMode: false,
      contentSummaries: false,
      progressIndicators: true
    }
  });

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const announceToScreenReader = (message: string) => {
    // Implementation would create a live region announcement
    console.log('Screen reader announcement:', message);
  };

  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings,
      announceToScreenReader,
      focusElement,
      isHighContrast: settings.visualSettings.contrast === 'high',
      isReducedMotion: settings.visualSettings.reducedMotion,
      fontSize: settings.visualSettings.fontSize
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityCenter;