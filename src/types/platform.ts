// Platform and System Integration Types

export interface PlatformConfig {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: PlatformFeature[];
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformFeature {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
  dependencies?: string[];
}

export interface SystemInfo {
  platform: string;
  version: string;
  buildNumber: string;
  environment: string;
  uptime: number;
  resources: {
    memory: {
      total: number;
      used: number;
      free: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
  };
}

export interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'service' | 'database';
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  lastSync?: string;
  errorCount?: number;
  lastError?: string;
}

export interface PlatformUser {
  id: string;
  platformId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'user';
  permissions: string[];
  status: 'active' | 'suspended' | 'banned';
  joinedAt: string;
}

export interface PlatformSearchResult {
  id: string;
  type: 'user' | 'content' | 'therapy_session' | 'journal' | 'goal';
  title: string;
  content: string;
  excerpt: string;
  relevanceScore: number;
  author: {
    id: string;
    name: string;
    role: string;
  };
  tags: string[];
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface SearchParams {
  query: string;
  type?: 'all' | 'user' | 'content' | 'therapy_session' | 'journal' | 'goal';
  userId?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}