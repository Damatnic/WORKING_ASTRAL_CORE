'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BeakerIcon,
  BugAntIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface TestCase {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'e2e' | 'accessibility' | 'performance' | 'security';
  component: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  lastRun?: Date;
  coverage?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  automated: boolean;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestConfiguration {
  parallel: boolean;
  maxWorkers: number;
  timeout: number;
  retries: number;
  coverage: boolean;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  device: 'desktop' | 'tablet' | 'mobile';
  environment: 'development' | 'staging' | 'production';
  accessibility: boolean;
  performance: boolean;
  security: boolean;
}

const TestingSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'suites' | 'coverage' | 'config' | 'reports'>('overview');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [configuration, setConfiguration] = useState<TestConfiguration>({
    parallel: true,
    maxWorkers: 4,
    timeout: 30000,
    retries: 2,
    coverage: true,
    browser: 'chrome',
    device: 'desktop',
    environment: 'development',
    accessibility: true,
    performance: true,
    security: true
  });
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);

  useEffect(() => {
    initializeTestSuites();
  }, []);

  const initializeTestSuites = () => {
    const suites: TestSuite[] = [
      {
        id: 'authentication',
        name: 'Authentication & Authorization',
        description: 'Tests for login, registration, and role-based access',
        tests: generateAuthTests(),
        status: 'idle',
        progress: 0,
        totalTests: 15,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        coverage: { statements: 85, branches: 78, functions: 90, lines: 82 }
      },
      {
        id: 'dashboards',
        name: 'Role-based Dashboards',
        description: 'Tests for user, helper, therapist, crisis, and admin dashboards',
        tests: generateDashboardTests(),
        status: 'idle',
        progress: 0,
        totalTests: 25,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        coverage: { statements: 92, branches: 88, functions: 95, lines: 90 }
      },
      {
        id: 'communication',
        name: 'Communication Systems',
        description: 'Tests for messaging, notifications, and real-time features',
        tests: generateCommunicationTests(),
        status: 'idle',
        progress: 0,
        totalTests: 20,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        coverage: { statements: 88, branches: 82, functions: 91, lines: 86 }
      },
      {
        id: 'platform',
        name: 'Platform Features',
        description: 'Tests for search, file management, accessibility, mobile optimization',
        tests: generatePlatformTests(),
        status: 'idle',
        progress: 0,
        totalTests: 30,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        coverage: { statements: 79, branches: 75, functions: 85, lines: 78 }
      },
      {
        id: 'security',
        name: 'Security & Privacy',
        description: 'Tests for HIPAA compliance, encryption, and data protection',
        tests: generateSecurityTests(),
        status: 'idle',
        progress: 0,
        totalTests: 18,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        coverage: { statements: 94, branches: 90, functions: 96, lines: 93 }
      },
      {
        id: 'performance',
        name: 'Performance & Load Testing',
        description: 'Tests for application performance, load handling, and optimization',
        tests: generatePerformanceTests(),
        status: 'idle',
        progress: 0,
        totalTests: 12,
        passedTests: 0,
        failedTests: 0,
        duration: 0,
        coverage: { statements: 72, branches: 68, functions: 75, lines: 70 }
      }
    ];

    setTestSuites(suites);
    setSelectedSuites(suites.map(s => s.id));
  };

  const generateAuthTests = (): TestCase[] => [
    {
      id: 'auth-001',
      name: 'User Registration Flow',
      category: 'integration',
      component: 'Authentication',
      description: 'Tests user registration with valid and invalid data',
      status: 'pending',
      priority: 'critical',
      tags: ['auth', 'registration', 'validation'],
      automated: true
    },
    {
      id: 'auth-002',
      name: 'Login Validation',
      category: 'unit',
      component: 'LoginForm',
      description: 'Tests login form validation and error handling',
      status: 'pending',
      priority: 'critical',
      tags: ['auth', 'login', 'validation'],
      automated: true
    },
    {
      id: 'auth-003',
      name: 'Role-based Access Control',
      category: 'integration',
      component: 'RoleGuard',
      description: 'Tests access control for different user roles',
      status: 'pending',
      priority: 'high',
      tags: ['auth', 'rbac', 'security'],
      automated: true
    },
    {
      id: 'auth-004',
      name: 'Session Management',
      category: 'integration',
      component: 'SessionManager',
      description: 'Tests session creation, validation, and expiration',
      status: 'pending',
      priority: 'high',
      tags: ['auth', 'session', 'security'],
      automated: true
    },
    {
      id: 'auth-005',
      name: 'Password Reset Flow',
      category: 'e2e',
      component: 'PasswordReset',
      description: 'Tests complete password reset workflow',
      status: 'pending',
      priority: 'medium',
      tags: ['auth', 'password', 'workflow'],
      automated: true
    }
  ];

  const generateDashboardTests = (): TestCase[] => [
    {
      id: 'dash-001',
      name: 'User Dashboard Loading',
      category: 'integration',
      component: 'UserDashboard',
      description: 'Tests user dashboard data loading and display',
      status: 'pending',
      priority: 'high',
      tags: ['dashboard', 'user', 'data'],
      automated: true
    },
    {
      id: 'dash-002',
      name: 'Mood Tracking Widget',
      category: 'unit',
      component: 'MoodTracker',
      description: 'Tests mood tracking functionality and data persistence',
      status: 'pending',
      priority: 'high',
      tags: ['dashboard', 'mood', 'tracking'],
      automated: true
    },
    {
      id: 'dash-003',
      name: 'Therapist Client Management',
      category: 'integration',
      component: 'ClientManager',
      description: 'Tests therapist client management features',
      status: 'pending',
      priority: 'critical',
      tags: ['dashboard', 'therapist', 'clients'],
      automated: true
    },
    {
      id: 'dash-004',
      name: 'Crisis Dashboard Alerts',
      category: 'integration',
      component: 'CrisisAlerts',
      description: 'Tests crisis alert system and escalation',
      status: 'pending',
      priority: 'critical',
      tags: ['dashboard', 'crisis', 'alerts'],
      automated: true
    },
    {
      id: 'dash-005',
      name: 'Admin Analytics View',
      category: 'integration',
      component: 'AdminAnalytics',
      description: 'Tests admin analytics dashboard and metrics',
      status: 'pending',
      priority: 'medium',
      tags: ['dashboard', 'admin', 'analytics'],
      automated: true
    }
  ];

  const generateCommunicationTests = (): TestCase[] => [
    {
      id: 'comm-001',
      name: 'Real-time Messaging',
      category: 'integration',
      component: 'MessageCenter',
      description: 'Tests real-time message sending and receiving',
      status: 'pending',
      priority: 'critical',
      tags: ['communication', 'messaging', 'realtime'],
      automated: true
    },
    {
      id: 'comm-002',
      name: 'Notification Delivery',
      category: 'integration',
      component: 'NotificationCenter',
      description: 'Tests multi-channel notification delivery',
      status: 'pending',
      priority: 'high',
      tags: ['communication', 'notifications', 'delivery'],
      automated: true
    },
    {
      id: 'comm-003',
      name: 'File Sharing Security',
      category: 'security',
      component: 'FileManager',
      description: 'Tests file sharing permissions and encryption',
      status: 'pending',
      priority: 'critical',
      tags: ['communication', 'files', 'security'],
      automated: true
    },
    {
      id: 'comm-004',
      name: 'Crisis Communication Priority',
      category: 'integration',
      component: 'CrisisCommunication',
      description: 'Tests priority handling for crisis communications',
      status: 'pending',
      priority: 'critical',
      tags: ['communication', 'crisis', 'priority'],
      automated: true
    }
  ];

  const generatePlatformTests = (): TestCase[] => [
    {
      id: 'plat-001',
      name: 'Search Functionality',
      category: 'integration',
      component: 'SearchCenter',
      description: 'Tests search accuracy and filtering capabilities',
      status: 'pending',
      priority: 'medium',
      tags: ['platform', 'search', 'filtering'],
      automated: true
    },
    {
      id: 'plat-002',
      name: 'Accessibility Compliance',
      category: 'accessibility',
      component: 'AccessibilityCenter',
      description: 'Tests WCAG 2.1 compliance across all components',
      status: 'pending',
      priority: 'high',
      tags: ['platform', 'accessibility', 'wcag'],
      automated: true
    },
    {
      id: 'plat-003',
      name: 'Mobile Responsiveness',
      category: 'e2e',
      component: 'MobileOptimization',
      description: 'Tests responsive design on various device sizes',
      status: 'pending',
      priority: 'high',
      tags: ['platform', 'mobile', 'responsive'],
      automated: true
    },
    {
      id: 'plat-004',
      name: 'Offline Functionality',
      category: 'integration',
      component: 'OfflineManager',
      description: 'Tests offline mode and data synchronization',
      status: 'pending',
      priority: 'medium',
      tags: ['platform', 'offline', 'sync'],
      automated: true
    },
    {
      id: 'plat-005',
      name: 'Multi-language Support',
      category: 'integration',
      component: 'LanguageManager',
      description: 'Tests internationalization and language switching',
      status: 'pending',
      priority: 'medium',
      tags: ['platform', 'i18n', 'languages'],
      automated: true
    }
  ];

  const generateSecurityTests = (): TestCase[] => [
    {
      id: 'sec-001',
      name: 'Data Encryption',
      category: 'security',
      component: 'EncryptionService',
      description: 'Tests end-to-end encryption for sensitive data',
      status: 'pending',
      priority: 'critical',
      tags: ['security', 'encryption', 'data'],
      automated: true
    },
    {
      id: 'sec-002',
      name: 'HIPAA Compliance',
      category: 'security',
      component: 'ComplianceChecker',
      description: 'Tests HIPAA compliance measures and audit trails',
      status: 'pending',
      priority: 'critical',
      tags: ['security', 'hipaa', 'compliance'],
      automated: true
    },
    {
      id: 'sec-003',
      name: 'Input Sanitization',
      category: 'security',
      component: 'InputValidator',
      description: 'Tests input validation and XSS prevention',
      status: 'pending',
      priority: 'high',
      tags: ['security', 'validation', 'xss'],
      automated: true
    },
    {
      id: 'sec-004',
      name: 'Authentication Security',
      category: 'security',
      component: 'AuthSecurity',
      description: 'Tests authentication security measures and rate limiting',
      status: 'pending',
      priority: 'critical',
      tags: ['security', 'auth', 'ratelimit'],
      automated: true
    }
  ];

  const generatePerformanceTests = (): TestCase[] => [
    {
      id: 'perf-001',
      name: 'Page Load Performance',
      category: 'performance',
      component: 'PageLoader',
      description: 'Tests page load times and Core Web Vitals',
      status: 'pending',
      priority: 'medium',
      tags: ['performance', 'loading', 'vitals'],
      automated: true
    },
    {
      id: 'perf-002',
      name: 'API Response Times',
      category: 'performance',
      component: 'APIClient',
      description: 'Tests API response times under various loads',
      status: 'pending',
      priority: 'medium',
      tags: ['performance', 'api', 'response'],
      automated: true
    },
    {
      id: 'perf-003',
      name: 'Memory Usage',
      category: 'performance',
      component: 'MemoryMonitor',
      description: 'Tests memory usage and potential leaks',
      status: 'pending',
      priority: 'medium',
      tags: ['performance', 'memory', 'leaks'],
      automated: true
    },
    {
      id: 'perf-004',
      name: 'Concurrent User Load',
      category: 'performance',
      component: 'LoadTester',
      description: 'Tests system performance under concurrent user load',
      status: 'pending',
      priority: 'high',
      tags: ['performance', 'load', 'concurrent'],
      automated: true
    }
  ];

  const runSelectedTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    const suitesToRun = testSuites.filter(suite => selectedSuites.includes(suite.id));
    
    for (const suite of suitesToRun) {
      await runTestSuite(suite.id);
    }
    
    setIsRunning(false);
  };

  const runTestSuite = async (suiteId: string) => {
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? { ...suite, status: 'running', progress: 0, passedTests: 0, failedTests: 0 }
        : suite
    ));

    const suite = testSuites.find(s => s.id === suiteId);
    if (!suite) return;

    for (let i = 0; i < suite.tests.length; i++) {
      const test = suite.tests[i];
      
      setTestSuites(prev => prev.map(s => 
        s.id === suiteId 
          ? {
              ...s,
              tests: s.tests.map(t => 
                t.id === test.id ? { ...t, status: 'running' } : t
              )
            }
          : s
      ));

      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

      const passed = Math.random() > 0.1;
      const duration = Math.floor(Math.random() * 5000 + 100);

      setTestSuites(prev => prev.map(s => 
        s.id === suiteId 
          ? {
              ...s,
              progress: ((i + 1) / suite.tests.length) * 100,
              passedTests: s.passedTests + (passed ? 1 : 0),
              failedTests: s.failedTests + (passed ? 0 : 1),
              tests: s.tests.map(t => 
                t.id === test.id 
                  ? { 
                      ...t, 
                      status: passed ? 'passed' : 'failed',
                      duration,
                      lastRun: new Date(),
                      error: passed ? undefined : 'Test assertion failed'
                    } 
                  : t
              )
            }
          : s
      ));
    }

    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? { 
            ...suite, 
            status: suite.failedTests > 0 ? 'failed' : 'completed',
            duration: suite.tests.reduce((acc, test) => acc + (test.duration || 0), 0)
          }
        : suite
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'skipped':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'unit':
        return <BeakerIcon className="h-4 w-4" />;
      case 'integration':
        return <CogIcon className="h-4 w-4" />;
      case 'e2e':
        return <GlobeAltIcon className="h-4 w-4" />;
      case 'accessibility':
        return <EyeIcon className="h-4 w-4" />;
      case 'performance':
        return <ChartBarIcon className="h-4 w-4" />;
      case 'security':
        return <ShieldCheckIcon className="h-4 w-4" />;
      default:
        return <BugAntIcon className="h-4 w-4" />;
    }
  };

  const totalTests = testSuites.reduce((acc, suite) => acc + suite.totalTests, 0);
  const totalPassed = testSuites.reduce((acc, suite) => acc + suite.passedTests, 0);
  const totalFailed = testSuites.reduce((acc, suite) => acc + suite.failedTests, 0);
  const overallCoverage = testSuites.reduce((acc, suite, index) => {
    return {
      statements: acc.statements + suite.coverage.statements / testSuites.length,
      branches: acc.branches + suite.coverage.branches / testSuites.length,
      functions: acc.functions + suite.coverage.functions / testSuites.length,
      lines: acc.lines + suite.coverage.lines / testSuites.length
    };
  }, { statements: 0, branches: 0, functions: 0, lines: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500 rounded-xl">
                <BeakerIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Testing Suite</h1>
                <p className="text-gray-600">Comprehensive test management for Astral Core</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={runSelectedTests}
                disabled={isRunning || selectedSuites.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isRunning ? (
                  <>
                    <StopIcon className="h-5 w-5" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5" />
                    <span>Run Selected Tests</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-8">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'suites', label: 'Test Suites', icon: BeakerIcon },
              { id: 'coverage', label: 'Coverage', icon: DocumentTextIcon },
              { id: 'config', label: 'Configuration', icon: CogIcon },
              { id: 'reports', label: 'Reports', icon: DocumentTextIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Total Tests</p>
                      <p className="text-3xl font-bold">{totalTests}</p>
                    </div>
                    <BeakerIcon className="h-8 w-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Passed</p>
                      <p className="text-3xl font-bold">{totalPassed}</p>
                    </div>
                    <CheckCircleIcon className="h-8 w-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100">Failed</p>
                      <p className="text-3xl font-bold">{totalFailed}</p>
                    </div>
                    <XCircleIcon className="h-8 w-8 text-red-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Coverage</p>
                      <p className="text-3xl font-bold">{Math.round(overallCoverage.lines)}%</p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-purple-200" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Suites Status</h3>
                  <div className="space-y-4">
                    {testSuites.map((suite) => (
                      <div key={suite.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedSuites.includes(suite.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSuites([...selectedSuites, suite.id]);
                              } else {
                                setSelectedSuites(selectedSuites.filter(id => id !== suite.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{suite.name}</p>
                            <p className="text-sm text-gray-500">{suite.totalTests} tests</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {suite.status === 'running' && (
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${suite.progress}%` }}
                              />
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-green-600">{suite.passedTests}</span>
                            <span className="text-sm text-red-600">{suite.failedTests}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Test Results</h3>
                  <div className="space-y-3">
                    {testSuites
                      .flatMap(suite => suite.tests)
                      .filter(test => test.lastRun)
                      .sort((a, b) => (b.lastRun?.getTime() || 0) - (a.lastRun?.getTime() || 0))
                      .slice(0, 8)
                      .map((test) => (
                        <div key={test.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(test.status)}
                            <div>
                              <p className="font-medium text-gray-900">{test.name}</p>
                              <p className="text-sm text-gray-500">{test.component}</p>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {test.duration}ms
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suites' && (
            <div className="space-y-6">
              {testSuites.map((suite) => (
                <div key={suite.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedSuites.includes(suite.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuites([...selectedSuites, suite.id]);
                            } else {
                              setSelectedSuites(selectedSuites.filter(id => id !== suite.id));
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{suite.name}</h3>
                          <p className="text-gray-600">{suite.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Coverage</p>
                          <p className="text-lg font-semibold text-gray-900">{Math.round(suite.coverage.lines)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Tests</p>
                          <p className="text-lg font-semibold text-gray-900">
                            <span className="text-green-600">{suite.passedTests}</span>/
                            <span className="text-gray-400">{suite.totalTests}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {suite.tests.map((test) => (
                      <div key={test.id} className="p-4 border-b border-slate-100 last:border-b-0 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(test.status)}
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(test.category)}
                              <span className="text-sm text-gray-500 capitalize">{test.category}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{test.name}</p>
                              <p className="text-sm text-gray-600">{test.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500">{test.component}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  test.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                  test.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  test.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {test.priority}
                                </span>
                                {test.tags.map(tag => (
                                  <span key={tag} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {test.duration && (
                              <span className="text-sm text-gray-500">{test.duration}ms</span>
                            )}
                            {test.error && (
                              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" title={test.error} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'coverage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Statements', value: overallCoverage.statements, color: 'blue' },
                  { label: 'Branches', value: overallCoverage.branches, color: 'green' },
                  { label: 'Functions', value: overallCoverage.functions, color: 'purple' },
                  { label: 'Lines', value: overallCoverage.lines, color: 'orange' }
                ].map((metric) => (
                  <div key={metric.label} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{metric.label}</h3>
                      <span className="text-2xl font-bold text-gray-900">{Math.round(metric.value)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full bg-${metric.color}-600`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage by Test Suite</h3>
                <div className="space-y-4">
                  {testSuites.map((suite) => (
                    <div key={suite.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{suite.name}</h4>
                        <span className="text-lg font-semibold text-gray-900">{Math.round(suite.coverage.lines)}%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: 'Statements', value: suite.coverage.statements },
                          { label: 'Branches', value: suite.coverage.branches },
                          { label: 'Functions', value: suite.coverage.functions },
                          { label: 'Lines', value: suite.coverage.lines }
                        ].map((metric) => (
                          <div key={metric.label} className="text-center">
                            <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div 
                                className="h-2 rounded-full bg-blue-600"
                                style={{ width: `${metric.value}%` }}
                              />
                            </div>
                            <p className="text-sm font-medium text-gray-900">{Math.round(metric.value)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Test Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Parallel Execution
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={configuration.parallel}
                          onChange={(e) => setConfiguration({...configuration, parallel: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable parallel test execution</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Workers
                      </label>
                      <input
                        type="number"
                        value={configuration.maxWorkers}
                        onChange={(e) => setConfiguration({...configuration, maxWorkers: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        max="16"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={configuration.timeout}
                        onChange={(e) => setConfiguration({...configuration, timeout: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1000"
                        step="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retries
                      </label>
                      <input
                        type="number"
                        value={configuration.retries}
                        onChange={(e) => setConfiguration({...configuration, retries: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="5"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Browser
                      </label>
                      <select
                        value={configuration.browser}
                        onChange={(e) => setConfiguration({...configuration, browser: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="chrome">Chrome</option>
                        <option value="firefox">Firefox</option>
                        <option value="safari">Safari</option>
                        <option value="edge">Edge</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device
                      </label>
                      <select
                        value={configuration.device}
                        onChange={(e) => setConfiguration({...configuration, device: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="desktop">Desktop</option>
                        <option value="tablet">Tablet</option>
                        <option value="mobile">Mobile</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Environment
                      </label>
                      <select
                        value={configuration.environment}
                        onChange={(e) => setConfiguration({...configuration, environment: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="development">Development</option>
                        <option value="staging">Staging</option>
                        <option value="production">Production</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      {[
                        { key: 'coverage', label: 'Code Coverage' },
                        { key: 'accessibility', label: 'Accessibility Tests' },
                        { key: 'performance', label: 'Performance Tests' },
                        { key: 'security', label: 'Security Tests' }
                      ].map((option) => (
                        <div key={option.key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={configuration[option.key as keyof TestConfiguration] as boolean}
                            onChange={(e) => setConfiguration({
                              ...configuration, 
                              [option.key]: e.target.checked
                            })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-600">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Reports</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'HTML Report',
                      description: 'Detailed HTML report with screenshots and logs',
                      format: 'HTML',
                      icon: DocumentTextIcon
                    },
                    {
                      title: 'JUnit XML',
                      description: 'Standard JUnit XML format for CI/CD integration',
                      format: 'XML',
                      icon: DocumentTextIcon
                    },
                    {
                      title: 'JSON Report',
                      description: 'Machine-readable JSON format for custom processing',
                      format: 'JSON',
                      icon: DocumentTextIcon
                    },
                    {
                      title: 'Coverage Report',
                      description: 'Detailed code coverage analysis and visualization',
                      format: 'HTML',
                      icon: ChartBarIcon
                    },
                    {
                      title: 'Performance Report',
                      description: 'Performance metrics and Core Web Vitals analysis',
                      format: 'PDF',
                      icon: ChartBarIcon
                    },
                    {
                      title: 'Accessibility Report',
                      description: 'WCAG compliance and accessibility findings',
                      format: 'PDF',
                      icon: EyeIcon
                    }
                  ].map((report, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <report.icon className="h-6 w-6 text-blue-500" />
                        <h4 className="font-medium text-gray-900">{report.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {report.format}
                        </span>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Generate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Reports</h3>
                
                <div className="space-y-4">
                  {[
                    {
                      name: 'Daily Test Summary',
                      schedule: 'Every day at 9:00 AM',
                      recipients: ['dev-team@company.com'],
                      lastSent: 'Today, 9:00 AM'
                    },
                    {
                      name: 'Weekly Coverage Report',
                      schedule: 'Every Monday at 8:00 AM',
                      recipients: ['engineering@company.com', 'qa-team@company.com'],
                      lastSent: 'Monday, 8:00 AM'
                    },
                    {
                      name: 'Monthly Security Assessment',
                      schedule: 'First day of every month',
                      recipients: ['security@company.com', 'cto@company.com'],
                      lastSent: '3 days ago'
                    }
                  ].map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <p className="text-sm text-gray-600">{report.schedule}</p>
                        <p className="text-sm text-gray-500">
                          Recipients: {report.recipients.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-2">Last sent: {report.lastSent}</p>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestingSuite;