// Wellness & Mental Health Type Definitions

export interface MoodEntry {
  id: string;
  userId: string;
  moodScore: number;
  anxietyLevel?: number | null;
  energyLevel?: number | null;
  sleepQuality?: number | null;
  notes?: string;
  triggers?: string[];
  activities?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface WellnessGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'mental-health' | 'wellness' | 'social' | 'personal' | 'physical' | 'professional';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetValue: number;
  completed: boolean;
  completedAt?: string | null;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title?: string;
  content: string;
  tags?: string[];
  mood?: number;
  isPrivate: boolean;
  sentiment?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WellnessInsight {
  id: string;
  userId: string;
  type: 'positive' | 'warning' | 'suggestion' | 'achievement' | 'trend';
  title: string;
  description: string;
  category: 'mood' | 'sleep' | 'activity' | 'goals' | 'social' | 'general';
  priority: 'low' | 'medium' | 'high';
  actionItems?: ActionItem[];
  data?: any;
  createdAt: string;
  expiresAt?: string | null;
  isRead: boolean;
}

export interface ActionItem {
  label: string;
  action: string;
  link?: string;
  type: 'primary' | 'secondary' | 'info';
}

export interface WellnessRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'exercise' | 'mindfulness' | 'sleep' | 'social' | 'therapy' | 'nutrition' | 'hobby';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  benefits: string[];
  instructions?: string[];
  resources?: Resource[];
  frequency?: 'daily' | 'weekly' | 'monthly' | 'once';
  priority: number;
}

export interface Resource {
  title: string;
  url?: string;
  type: 'article' | 'video' | 'audio' | 'app' | 'book' | 'website';
  description?: string;
}

export interface UserWellnessProfile {
  userId: string;
  wellnessScore?: number | null;
  mentalHealthGoals: string[];
  interestedTopics: string[];
  preferredActivities: string[];
  triggers: string[];
  copingStrategies: string[];
  sleepPattern?: SleepPattern;
  exerciseFrequency?: string;
  socialConnections?: number;
  lastAssessmentAt?: string | null;
  streakDays: number;
  totalMoodEntries: number;
  averageMood?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SleepPattern {
  averageHours: number;
  bedtime?: string;
  wakeTime?: string;
  quality: number;
  consistency: number;
}

export interface DashboardStats {
  therapySessions: number;
  moodEntries: number;
  daysStreak: number;
  wellnessScore: number;
  communityPosts: number;
  supportGiven: number;
  goalsActive: number;
  goalsCompleted: number;
  journalEntries: number;
  lastActivityDate?: string | null;
}

export interface RecentActivity {
  id: string;
  type: 'therapy' | 'mood' | 'journal' | 'goal' | 'community' | 'wellness';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface PersonalWellnessChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number; // in days
  goals: any[];
  rewards: any[];
  dailyTasks: any[];
  startDate: string;
  endDate: string;
  participantCount: number;
  isActive: boolean;
  progress?: number;
  isParticipating?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Request Types
export interface CreateMoodEntryRequest {
  moodScore: number;
  anxietyLevel?: number;
  energyLevel?: number;
  sleepQuality?: number;
  notes?: string;
  triggers?: string[];
  activities?: string[];
}

export interface CreateGoalRequest {
  title: string;
  description: string;
  category: string;
  targetValue: number;
  unit: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  milestones?: Omit<GoalMilestone, 'id' | 'completedAt'>[];
}

export interface CreateJournalEntryRequest {
  title?: string;
  content: string;
  tags?: string[];
  mood?: number;
  isPrivate?: boolean;
}

export interface UpdateGoalProgressRequest {
  currentValue: number;
  note?: string;
}