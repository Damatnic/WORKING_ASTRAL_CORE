"use client";

import React, { useState, useEffect, useRef, Suspense, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Heart, 
  Users, 
  Shield,
  Activity,
  MessageCircle,
  BarChart3,
  Calendar,
  Settings,
  Bell,
  Star,
  ArrowRight,
  Plus,
  Eye,
  Target,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/hooks/useNotifications';
import { DashboardStats, RecentActivity } from '@/types/wellness';
import { 
  AccessibleButton, 
  AccessibleAlert,
  AccessibleLoading,
  AccessibleSkipLink,
  AccessibleBreadcrumb
} from '@/components/accessibility/AccessibleComponents';
import { AccessibilityService } from '@/lib/accessibility';
import { CriticalBoundary, DashboardSkeleton } from '@/components/loading';
import { createLazyComponent, CriticalPath } from '@/lib/performance/dynamic-imports';

// Dynamic imports with performance optimization
const WellnessOverview = createLazyComponent(
  () => import('@/components/dashboard/WellnessOverview'),
  {
    fallback: <DashboardSkeleton />,
    priority: 'medium',
    preload: true,
    timeout: 8000,
  }
);

const GoalsProgress = createLazyComponent(
  () => import('@/components/dashboard/GoalsProgress'),
  {
    fallback: <DashboardSkeleton />,
    priority: 'low',
    delay: 500,
    timeout: 10000,
  }
);

const DashboardPage = memo(function DashboardPage() {
  const session = useSession();
  const { unread } = useNotifications();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'therapy' | 'wellness' | 'community'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);

  // Memoized fetch function
  const fetchDashboardData = useCallback(async () => {
    if (!(session as any)?.user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch stats and activities in parallel
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/activities?limit=5')
      ]);

      if (!statsResponse.ok || !activitiesResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsResponse.json();
      const activitiesData = await activitiesResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      }
      
      if (activitiesData.success) {
        setRecentActivities(activitiesData.data);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      const errorMessage = 'Failed to load dashboard data. Please try again.';
      setError(errorMessage);
      AccessibilityService.announce(`Error: ${errorMessage}`, 'assertive');
      // Set default values for offline mode
      setStats({
        therapySessions: 0,
        moodEntries: 0,
        daysStreak: 0,
        wellnessScore: 0,
        communityPosts: 0,
        supportGiven: 0,
        goalsActive: 0,
        goalsCompleted: 0,
        journalEntries: 0,
        lastActivityDate: null
      });
    } finally {
      setIsLoading(false);
    }
  }, [(session as any)?.user]);

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Announce loading states to screen readers
  useEffect(() => {
    if (isLoading) {
      AccessibilityService.announce('Loading dashboard data', 'polite');
    } else if (error) {
      AccessibilityService.announce(`Error: ${error}`, 'assertive');
    } else if (stats) {
      AccessibilityService.announce('Dashboard data loaded successfully', 'polite');
    }
  }, [isLoading, error, stats]);


  // Memoized quick actions configuration
  const quickActions = useMemo(() => [
    {
      icon: MessageCircle,
      title: "Start AI Therapy",
      description: "Begin an anonymous therapy session",
      color: "bg-primary-500",
      link: "/therapy"
    },
    {
      icon: Heart,
      title: "Log Mood",
      description: "Track how you're feeling today",
      color: "bg-wellness-mindful",
      link: "/wellness?action=mood"
    },
    {
      icon: Users,
      title: "Community",
      description: "Connect with peer support",
      color: "bg-green-500",
      link: "/community"
    },
    {
      icon: Shield,
      title: "Crisis Support",
      description: "Get immediate help if needed",
      color: "bg-crisis-primary",
      link: "/crisis"
    }
  ], []);

  // Memoized timestamp formatter
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <AccessibleSkipLink targetId="main-content" />
      
      <AccessibleBreadcrumb 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard', current: true }
        ]}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div 
            ref={announcementRef}
            role="status"
            aria-live="polite"
            className="sr-only"
          ></div>
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          >
            <div>
              <h1 
                id="dashboard-title"
                className="text-3xl font-bold text-neutral-800 mb-2"
                tabIndex={-1}
              >
                Welcome to your Dashboard
              </h1>
              <p className="text-neutral-600" aria-describedby="dashboard-title">
                Your personal mental health and wellness hub
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <Link 
                href="/community" 
                className="flex items-center px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={`Notifications${unread > 0 ? ` (${unread > 99 ? '99+' : unread} unread)` : ''}`}
              >
                <div className="relative mr-2">
                  <Bell className="w-5 h-5 text-neutral-600" aria-hidden="true" />
                  {unread > 0 && (
                    <span 
                      className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      aria-hidden="true"
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
                <span className="text-neutral-700">Notifications</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
                aria-label="User Settings"
              >
                <Settings className="w-5 h-5 mr-2" aria-hidden="true" />
                <span>Settings</span>
              </Link>
            </div>
          </motion.header>

          {/* Loading State */}
          {isLoading && (
            <AccessibleLoading 
              message="Loading your dashboard data..."
              size="large"
              className="py-12"
            />
          )}

          {/* Error State */}
          {error && (
            <AccessibleAlert
              type="error"
              title="Dashboard Error"
              message={error}
              actions={[
                {
                  label: 'Try Again',
                  onClick: fetchDashboardData,
                  variant: 'secondary'
                }
              ]}
              className="mb-6"
            />
          )}

          {/* Stats Cards */}
          {!isLoading && stats && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
              aria-labelledby="stats-heading"
            >
              <h2 id="stats-heading" className="sr-only">Dashboard Statistics</h2>
              {[
                { label: "Therapy Sessions", value: stats.therapySessions, icon: Brain, color: "text-primary-600" },
                { label: "Mood Entries", value: stats.moodEntries, icon: Heart, color: "text-wellness-mindful" },
                { label: "Days Streak", value: stats.daysStreak, icon: Calendar, color: "text-wellness-growth" },
                { label: "Wellness Score", value: stats.wellnessScore, icon: Star, color: "text-wellness-balanced" },
                { label: "Community Posts", value: stats.communityPosts, icon: Users, color: "text-green-600" },
                { label: "Support Given", value: stats.supportGiven, icon: Shield, color: "text-blue-600" }
              ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4 text-center"
                role="article"
                aria-labelledby={`stat-${index}-label`}
              >
                <stat.icon 
                  className={`w-6 h-6 ${stat.color} mx-auto mb-2`} 
                  aria-hidden="true"
                />
                <div className="text-2xl font-bold text-neutral-800" aria-describedby={`stat-${index}-label`}>
                  {typeof stat.value === 'number' && stat.value % 1 !== 0 ? stat.value.toFixed(1) : stat.value}
                </div>
                <div id={`stat-${index}-label`} className="text-xs text-neutral-600">{stat.label}</div>
              </motion.div>
            ))}
            </motion.section>
          )}

          <main id="main-content" ref={mainContentRef} tabIndex={-1}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2"
                aria-labelledby="quick-actions-heading"
              >
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
                  <h2 id="quick-actions-heading" className="text-xl font-bold text-neutral-800 mb-6">
                    Quick Actions
                  </h2>
                
                  <div className="grid md:grid-cols-2 gap-4" role="list">
                    {quickActions.map((action, index) => (
                      <div key={action.title} role="listitem">
                        <Link
                          href={action.link}
                          className="block focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-xl"
                          aria-describedby={`action-${index}-desc`}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            className="p-4 rounded-xl border-2 border-neutral-100 hover:border-primary-200 hover:shadow-md transition-all duration-300 group cursor-pointer"
                          >
                            <div className="flex items-center mb-3">
                              <div className={`${action.color} rounded-lg p-2 mr-3`} aria-hidden="true">
                                <action.icon className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="font-semibold text-neutral-800">
                                {action.title}
                              </h3>
                            </div>
                            <p id={`action-${index}-desc`} className="text-neutral-600 text-sm mb-2">
                              {action.description}
                            </p>
                            <div className="flex items-center text-primary-600 font-medium group-hover:text-primary-700 transition-colors">
                              <span>Get Started</span>
                              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                            </div>
                          </motion.div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>

              {/* Recent Activity */}
              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-1"
                aria-labelledby="recent-activity-heading"
              >
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
                  <h2 id="recent-activity-heading" className="text-xl font-bold text-neutral-800 mb-6">
                    Recent Activity
                  </h2>
                
                  <div className="space-y-4" role="list">
                    {recentActivities.length > 0 ? (
                      recentActivities.slice(0, 3).map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="flex items-start p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                          role="listitem"
                        >
                          <div 
                            className={`w-3 h-3 rounded-full mt-2 mr-3 ${
                              activity.type === 'therapy' ? 'bg-primary-500' :
                              activity.type === 'mood' ? 'bg-wellness-mindful' :
                              activity.type === 'journal' ? 'bg-purple-500' :
                              activity.type === 'goal' ? 'bg-yellow-500' :
                              activity.type === 'wellness' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            aria-hidden="true"
                          ></div>
                          <div className="flex-1">
                            <h4 className="font-medium text-neutral-800 text-sm">
                              {activity.title}
                            </h4>
                            <p className="text-neutral-600 text-xs mb-1">
                              {activity.description}
                            </p>
                            <p className="text-neutral-500 text-xs">
                              <time dateTime={activity.timestamp}>
                                {formatTimestamp(activity.timestamp)}
                              </time>
                            </p>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-neutral-500 text-sm">No recent activity</p>
                        <Link 
                          href="/wellness/mood-tracker" 
                          className="text-primary-600 text-sm mt-2 inline-block hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          Start tracking your mood →
                        </Link>
                      </div>
                    )}
                  </div>
                
                  <AccessibleButton 
                    variant="ghost"
                    className="w-full mt-4 text-primary-600 font-medium hover:text-primary-700 transition-colors text-sm"
                    onClick={() => window.location.href = '/dashboard/activity'}
                  >
                    View All Activity →
                  </AccessibleButton>
                </div>
              </motion.section>
            </div>

            {/* Dashboard Widgets */}
            {!isLoading && (
              <section className="grid lg:grid-cols-2 gap-8 mt-8" aria-labelledby="widgets-heading">
                <h2 id="widgets-heading" className="sr-only">Dashboard Widgets</h2>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <CriticalBoundary componentName="WellnessOverview">
                    <Suspense fallback={<DashboardSkeleton />}>
                      <WellnessOverview />
                    </Suspense>
                  </CriticalBoundary>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <CriticalBoundary componentName="GoalsProgress">
                    <Suspense fallback={<DashboardSkeleton />}>
                      <GoalsProgress />
                    </Suspense>
                  </CriticalBoundary>
                </motion.div>
              </section>
            )}

            {/* Weekly Progress */}
            {!isLoading && stats && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="mt-8"
                aria-labelledby="weekly-progress-heading"
              >
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 id="weekly-progress-heading" className="text-xl font-bold text-neutral-800">
                      This Week&apos;s Progress
                    </h2>
                    <Link
                      href="/wellness"
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      View Details
                    </Link>
                  </div>
                
                  <div className="grid md:grid-cols-7 gap-4" role="list" aria-label="Weekly progress tracker">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                      // Calculate which days have been tracked based on streak
                      const today = new Date().getDay();
                      const dayIndex = index === 6 ? 0 : index + 1; // Convert to JS day format (0=Sun)
                      const daysAgo = today >= dayIndex ? today - dayIndex : 7 - (dayIndex - today);
                      const hasTracked = stats.daysStreak > daysAgo;
                      
                      return (
                        <div key={day} className="text-center" role="listitem">
                          <div className="text-xs text-neutral-600 mb-2">{day}</div>
                          <div 
                            className={`w-12 h-12 rounded-lg mx-auto flex items-center justify-center ${
                              hasTracked ? 'bg-wellness-growth text-white' :
                              'bg-neutral-200 text-neutral-400'
                            }`}
                            role="img"
                            aria-label={`${day}: ${hasTracked ? 'Completed' : 'Not completed'}`}
                          >
                            {hasTracked ? 
                              <CheckCircle className="w-6 h-6" aria-hidden="true" /> : 
                              <Plus className="w-6 h-6" aria-hidden="true" />
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                
                  {stats.daysStreak > 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-wellness-growth font-medium" aria-live="polite">
                        {stats.daysStreak} day streak! Keep it going!
                      </p>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* Navigation */}
            <nav className="flex justify-center mt-8" aria-label="Page navigation">
              <Link 
                href="/"
                className="text-primary-600 hover:text-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                ← Back to Home
              </Link>
            </nav>
          </main>
        </div>
      </div>
    </div>
  );
});

export default DashboardPage;
