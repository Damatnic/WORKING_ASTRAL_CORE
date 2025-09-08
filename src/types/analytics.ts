// Analytics and Metrics Types

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  CONVERSION = 'conversion',
  ENGAGEMENT = 'engagement'
}

export enum EventCategory {
  AUTH = 'auth',
  WELLNESS = 'wellness',
  THERAPY = 'therapy',
  CRISIS = 'crisis',
  COMMUNITY = 'community',
  NAVIGATION = 'navigation',
  FORM = 'form',
  API = 'api'
}

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp: string;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  timeToFirstByte: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
}

export interface UserEngagementMetrics {
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  bounceRate: number;
  returnRate: number;
  activeTime: number;
  scrollDepth: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

export interface AnalyticsReport {
  id: string;
  type: ReportType;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  metrics: Record<string, any>;
  insights: AnalyticsInsight[];
  generatedAt: string;
}

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export interface ReportPeriod {
  start: string;
  end: string;
  timezone: string;
}

export interface AnalyticsInsight {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  recommendations?: string[];
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  averageSessionDuration: number;
  pageViews: number;
  bounceRate: number;
  conversionRate: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface UserAnalytics {
  userId: string;
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  lastActive: string;
  devices: string[];
  browsers: string[];
  mostVisitedPages: PageVisit[];
  engagementScore: number;
}

export interface PageVisit {
  path: string;
  title: string;
  visits: number;
  averageDuration: number;
  bounceRate: number;
  exitRate: number;
}

export interface ConversionFunnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  conversionRate: number;
  dropoffPoints: DropoffPoint[];
}

export interface FunnelStep {
  name: string;
  url: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  averageTime: number;
}

export interface DropoffPoint {
  fromStep: string;
  toStep: string;
  dropoffRate: number;
  count: number;
  reasons?: string[];
}

export interface HeatmapData {
  pageUrl: string;
  elementSelector: string;
  clicks: number;
  hovers: number;
  scrollDepth: number;
  attentionTime: number;
  coordinates: { x: number; y: number }[];
}

export interface ABTestResult {
  testId: string;
  testName: string;
  variant: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  isSignificant: boolean;
  winner?: string;
}