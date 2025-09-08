// Neon PostgreSQL Database Service
// Direct SQL integration using Neon serverless driver for optimal performance

import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon for optimal performance
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;

// Database connection
const getDatabase = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!databaseUrl) {
    throw new Error('Database URL not configured. Please set DATABASE_URL environment variable.');
  }
  return neon(databaseUrl);
};

// Database service class
export class NeonDatabaseService {
  private sql = getDatabase();

  /**
   * Initialize database with comprehensive mental health schema
   */
  async initializeDatabase(): Promise<void> {
    console.log('🗄️ Initializing Neon database schema...');
    
    try {
      // Create extensions if they don't exist
      await this.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      await this.sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
      
      // Users table - core user management
      await this.sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          display_name VARCHAR(150) NOT NULL,
          password_hash TEXT,
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'helper', 'admin', 'counselor')),
          avatar_url TEXT,
          bio TEXT,
          is_verified BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          preferences JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          last_login TIMESTAMP,
          timezone VARCHAR(50) DEFAULT 'UTC'
        )
      `;

      // AI Chat sessions - track AI therapy conversations
      await this.sql`
        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          session_title VARCHAR(200),
          ai_provider VARCHAR(20) DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'gemini', 'claude')),
          session_type VARCHAR(30) DEFAULT 'therapy' CHECK (session_type IN ('therapy', 'crisis', 'general', 'assessment')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
          risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
          crisis_detected BOOLEAN DEFAULT false,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          ended_at TIMESTAMP
        )
      `;

      // AI Chat messages - individual messages with AI analytics
      await this.sql`
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
          role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          ai_model VARCHAR(50),
          confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
          risk_assessment VARCHAR(20) CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
          sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
          tokens_used INTEGER,
          processing_time_ms INTEGER,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Crisis events - critical mental health situations requiring intervention
      await this.sql`
        CREATE TABLE IF NOT EXISTS crisis_events (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,
          risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('medium', 'high', 'critical')),
          trigger_content TEXT,
          ai_assessment JSONB,
          intervention_type VARCHAR(30) CHECK (intervention_type IN ('automated', 'escalated', 'counselor_requested')),
          intervention_data JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
          resolved_at TIMESTAMP,
          resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Mental health resources - articles, exercises, crisis hotlines
      await this.sql`
        CREATE TABLE IF NOT EXISTS mental_health_resources (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          content TEXT,
          resource_type VARCHAR(30) CHECK (resource_type IN ('article', 'video', 'audio', 'exercise', 'tool', 'crisis_hotline')),
          category VARCHAR(50),
          tags TEXT[],
          difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
          estimated_time_minutes INTEGER,
          url TEXT,
          is_crisis_resource BOOLEAN DEFAULT false,
          is_featured BOOLEAN DEFAULT false,
          view_count INTEGER DEFAULT 0,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // System audit log - track all system actions for security and compliance
      await this.sql`
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50),
          resource_id UUID,
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create performance indexes
      await this.createIndexes();

      console.log('✅ Neon database schema initialized successfully');
    } catch (error) {
      console.error('❌ Neon database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create optimized indexes for query performance
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      // User indexes for authentication and lookups
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      
      // AI Chat indexes for session management
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_status ON ai_chat_sessions(status)',
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_risk_level ON ai_chat_sessions(risk_level)',
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at)',
      
      // Message indexes for conversation retrieval
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_risk_assessment ON ai_chat_messages(risk_assessment)',
      
      // Crisis event indexes for monitoring
      'CREATE INDEX IF NOT EXISTS idx_crisis_events_user_id ON crisis_events(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_crisis_events_risk_level ON crisis_events(risk_level)',
      'CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status)',
      'CREATE INDEX IF NOT EXISTS idx_crisis_events_created_at ON crisis_events(created_at)',
      
      // Resource indexes for content discovery
      'CREATE INDEX IF NOT EXISTS idx_resources_type ON mental_health_resources(resource_type)',
      'CREATE INDEX IF NOT EXISTS idx_resources_category ON mental_health_resources(category)',
      'CREATE INDEX IF NOT EXISTS idx_resources_crisis ON mental_health_resources(is_crisis_resource)',
      'CREATE INDEX IF NOT EXISTS idx_resources_featured ON mental_health_resources(is_featured)',
      'CREATE INDEX IF NOT EXISTS idx_resources_tags ON mental_health_resources USING GIN(tags)',
      
      // Audit log indexes for security monitoring
      'CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)',
    ];

    for (const indexSql of indexes) {
      try {
        // Need to use dynamic SQL for DDL statements
        const result = await this.sql.unsafe(indexSql);
      } catch (error) {
        console.warn(`Index creation warning: ${indexSql}`, error);
      }
    }
  }

  /**
   * Create demo users and essential sample data
   */
  async createSampleData(): Promise<void> {
    console.log('🎭 Creating demo users and sample data...');

    // Demo users with different roles for testing
    const demoUsers = [
      {
        email: 'demo@astralcore.app',
        username: 'demo_user',
        display_name: 'Demo User',
        password_hash: '$2b$10$demo.hash.for.demo123.password',
        role: 'user',
        is_verified: true,
        bio: 'Demo user account for testing the mental health platform',
        preferences: { theme: 'light', notifications: true, language: 'en' },
      },
      {
        email: 'helper@astralcore.app',
        username: 'demo_helper',
        display_name: 'Demo Helper',
        password_hash: '$2b$10$demo.hash.for.demo123.password',
        role: 'helper',
        is_verified: true,
        bio: 'Demo peer support helper with community moderation abilities',
        preferences: { theme: 'auto', notifications: true, language: 'en' },
      },
      {
        email: 'admin@astralcore.app',
        username: 'demo_admin',
        display_name: 'Demo Admin',
        password_hash: '$2b$10$demo.hash.for.demo123.password',
        role: 'admin',
        is_verified: true,
        bio: 'Demo administrator with full platform access and management capabilities',
        preferences: { theme: 'dark', notifications: true, language: 'en' },
      },
    ];

    for (const user of demoUsers) {
      try {
        await this.sql`
          INSERT INTO users (email, username, display_name, password_hash, role, is_verified, bio, preferences)
          VALUES (${user.email}, ${user.username}, ${user.display_name}, ${user.password_hash}, ${user.role}, ${user.is_verified}, ${user.bio}, ${JSON.stringify(user.preferences)})
          ON CONFLICT (email) DO UPDATE SET
            updated_at = NOW()
        `;
        console.log(`✅ Demo user created: ${user.email} (${user.role})`);
      } catch (error) {
        console.warn(`Demo user creation warning for ${user.email}:`, error);
      }
    }

    // Essential mental health resources including crisis support
    const resources = [
      {
        title: 'Crisis Text Line - Immediate Support',
        description: 'Free, 24/7 support for people in crisis situations',
        content: 'Text HOME to 741741 to reach a trained crisis counselor. Available 24/7, confidential, and completely free.',
        resource_type: 'crisis_hotline',
        category: 'Crisis Support',
        is_crisis_resource: true,
        is_featured: true,
        url: 'https://www.crisistextline.org/',
        tags: ['crisis', 'text', '24/7', 'immediate'],
      },
      {
        title: '988 Suicide & Crisis Lifeline',
        description: '24/7, free and confidential support for people in distress',
        content: 'Call or text 988 to reach the Suicide & Crisis Lifeline. Trained counselors provide support for people in suicidal crisis or emotional distress.',
        resource_type: 'crisis_hotline',
        category: 'Crisis Support',
        is_crisis_resource: true,
        is_featured: true,
        url: 'https://suicidepreventionlifeline.org/',
        tags: ['crisis', 'suicide', 'phone', '24/7'],
      },
      {
        title: 'Emergency Services',
        description: 'Immediate emergency assistance for life-threatening situations',
        content: 'Call 911 if you or someone else is in immediate physical danger or having a medical emergency.',
        resource_type: 'crisis_hotline',
        category: 'Crisis Support',
        is_crisis_resource: true,
        is_featured: true,
        tags: ['emergency', 'police', 'medical', 'immediate'],
      },
      {
        title: '4-7-8 Breathing Technique',
        description: 'Evidence-based breathing exercise to reduce anxiety and promote calm',
        content: 'Inhale for 4 counts, hold for 7 counts, exhale for 8 counts. Repeat 3-4 times. This technique activates the parasympathetic nervous system.',
        resource_type: 'exercise',
        category: 'Anxiety Management',
        difficulty_level: 'beginner',
        estimated_time_minutes: 5,
        tags: ['breathing', 'anxiety', 'calm', 'quick'],
      },
      {
        title: 'Progressive Muscle Relaxation',
        description: 'Full-body relaxation technique for stress and tension relief',
        content: 'Systematically tense and then relax each muscle group in your body, starting from your toes and working up to your head.',
        resource_type: 'exercise',
        category: 'Stress Management',
        difficulty_level: 'intermediate',
        estimated_time_minutes: 15,
        tags: ['relaxation', 'muscle', 'stress', 'body'],
      },
      {
        title: 'Daily Gratitude Journal',
        description: 'Build resilience and positive thinking through gratitude practice',
        content: 'Each day, write down 3 things you are grateful for. Research shows this simple practice can improve mood and overall wellbeing.',
        resource_type: 'tool',
        category: 'Mental Wellness',
        difficulty_level: 'beginner',
        estimated_time_minutes: 10,
        is_featured: true,
        tags: ['gratitude', 'journal', 'daily', 'positive'],
      },
    ];

    for (const resource of resources) {
      try {
        await this.sql`
          INSERT INTO mental_health_resources (
            title, description, content, resource_type, category, 
            is_crisis_resource, is_featured, url, difficulty_level, 
            estimated_time_minutes, tags
          )
          VALUES (
            ${resource.title}, ${resource.description}, ${resource.content}, 
            ${resource.resource_type}, ${resource.category}, 
            ${resource.is_crisis_resource || false}, ${resource.is_featured || false}, 
            ${resource.url || null}, ${resource.difficulty_level || null}, 
            ${resource.estimated_time_minutes || null}, ${resource.tags}
          )
          ON CONFLICT DO NOTHING
        `;
        console.log(`✅ Resource created: ${resource.title}`);
      } catch (error) {
        console.warn(`Resource creation warning for ${resource.title}:`, error);
      }
    }
  }

  /**
   * Get comprehensive database health and statistics
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    tablesCount: number;
    usersCount: number;
    activeSessions: number;
    crisisEventsToday: number;
    totalResources: number;
    lastUpdated: Date;
    databaseSize?: string;
  }> {
    try {
      // Get table count
      const [tables] = await this.sql`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      // Get user statistics
      const [users] = await this.sql`SELECT COUNT(*) as count FROM users`;
      
      // Get active AI sessions (last 24 hours)
      const [sessions] = await this.sql`
        SELECT COUNT(*) as count FROM ai_chat_sessions 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;
      
      // Get crisis events today
      const [crisisEvents] = await this.sql`
        SELECT COUNT(*) as count FROM crisis_events 
        WHERE created_at > CURRENT_DATE
      `;
      
      // Get total resources
      const [resources] = await this.sql`
        SELECT COUNT(*) as count FROM mental_health_resources
      `;

      // Try to get database size (may fail on some hosted services)
      let databaseSize = undefined;
      try {
        const [size] = await this.sql`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
        databaseSize = size?.size;
      } catch (error) {
        console.warn('Could not retrieve database size:', error);
      }
      
      return {
        connected: true,
        tablesCount: parseInt(tables?.count || '0'),
        usersCount: parseInt(users?.count || '0'),
        activeSessions: parseInt(sessions?.count || '0'),
        crisisEventsToday: parseInt(crisisEvents?.count || '0'),
        totalResources: parseInt(resources?.count || '0'),
        lastUpdated: new Date(),
        databaseSize,
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        connected: false,
        tablesCount: 0,
        usersCount: 0,
        activeSessions: 0,
        crisisEventsToday: 0,
        totalResources: 0,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Save AI chat message with full analytics data
   */
  async saveAIChatMessage(messageData: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    aiModel?: string;
    confidenceScore?: number;
    riskAssessment?: string;
    sentimentScore?: number;
    tokensUsed?: number;
    processingTime?: number;
    metadata?: any;
  }) {
    try {
      const [message] = await this.sql`
        INSERT INTO ai_chat_messages (
          session_id, role, content, ai_model, confidence_score, 
          risk_assessment, sentiment_score, tokens_used, processing_time_ms, metadata
        )
        VALUES (
          ${messageData.sessionId}, ${messageData.role}, ${messageData.content}, 
          ${messageData.aiModel || null}, ${messageData.confidenceScore || null}, 
          ${messageData.riskAssessment || null}, ${messageData.sentimentScore || null}, 
          ${messageData.tokensUsed || null}, ${messageData.processingTime || null},
          ${JSON.stringify(messageData.metadata || {})}
        )
        RETURNING id, created_at
      `;
      return message;
    } catch (error) {
      console.error('Failed to save AI chat message:', error);
      throw error;
    }
  }

  /**
   * Create or update AI chat session with risk tracking
   */
  async upsertChatSession(sessionData: {
    sessionId: string;
    userId?: string;
    aiProvider?: string;
    sessionType?: string;
    riskLevel?: string;
    crisisDetected?: boolean;
    metadata?: any;
  }) {
    try {
      const [session] = await this.sql`
        INSERT INTO ai_chat_sessions (
          id, user_id, ai_provider, session_type, risk_level, crisis_detected, metadata, updated_at
        )
        VALUES (
          ${sessionData.sessionId}, ${sessionData.userId || null}, 
          ${sessionData.aiProvider || 'openai'}, ${sessionData.sessionType || 'therapy'},
          ${sessionData.riskLevel || 'low'}, ${sessionData.crisisDetected || false}, 
          ${JSON.stringify(sessionData.metadata || {})}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          risk_level = CASE 
            WHEN EXCLUDED.risk_level = 'critical' THEN 'critical'
            WHEN ai_chat_sessions.risk_level = 'critical' THEN 'critical'
            WHEN EXCLUDED.risk_level = 'high' THEN 'high'
            WHEN ai_chat_sessions.risk_level = 'high' THEN 'high'
            WHEN EXCLUDED.risk_level = 'medium' THEN 'medium'
            WHEN ai_chat_sessions.risk_level = 'medium' THEN 'medium'
            ELSE 'low'
          END,
          crisis_detected = ai_chat_sessions.crisis_detected OR EXCLUDED.crisis_detected,
          metadata = COALESCE(EXCLUDED.metadata, ai_chat_sessions.metadata),
          updated_at = NOW()
        RETURNING id, created_at, updated_at
      `;
      return session;
    } catch (error) {
      console.error('Failed to upsert chat session:', error);
      throw error;
    }
  }

  /**
   * Log critical crisis events for immediate attention
   */
  async logCrisisEvent(eventData: {
    userId?: string;
    sessionId?: string;
    riskLevel: 'medium' | 'high' | 'critical';
    triggerContent?: string;
    aiAssessment?: any;
    interventionType?: string;
    interventionData?: any;
  }) {
    try {
      const [event] = await this.sql`
        INSERT INTO crisis_events (
          user_id, session_id, risk_level, trigger_content, 
          ai_assessment, intervention_type, intervention_data
        )
        VALUES (
          ${eventData.userId || null}, ${eventData.sessionId || null}, 
          ${eventData.riskLevel}, ${eventData.triggerContent || null}, 
          ${JSON.stringify(eventData.aiAssessment || {})}, 
          ${eventData.interventionType || 'automated'},
          ${JSON.stringify(eventData.interventionData || {})}
        )
        RETURNING id, created_at
      `;
      console.log(`🚨 Crisis event logged: ${event?.id} (${eventData.riskLevel} risk)`);
      
      // Log audit entry for crisis event
      await this.logAuditEvent({
        userId: eventData.userId,
        action: 'crisis_detected',
        resourceType: 'crisis_event',
        resourceId: event?.id,
        details: { riskLevel: eventData.riskLevel, interventionType: eventData.interventionType },
      });
      
      return event;
    } catch (error) {
      console.error('Failed to log crisis event:', error);
      throw error;
    }
  }

  /**
   * Log system audit events for security and compliance
   */
  async logAuditEvent(auditData: {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.sql`
        INSERT INTO audit_log (
          user_id, action, resource_type, resource_id, details, ip_address, user_agent
        )
        VALUES (
          ${auditData.userId || null}, ${auditData.action}, 
          ${auditData.resourceType || null}, ${auditData.resourceId || null}, 
          ${JSON.stringify(auditData.details || {})}, 
          ${auditData.ipAddress || null}, ${auditData.userAgent || null}
        )
      `;
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get crisis resources for immediate intervention
   */
  async getCrisisResources() {
    try {
      const resources = await this.sql`
        SELECT id, title, description, content, resource_type, url, tags
        FROM mental_health_resources 
        WHERE is_crisis_resource = true 
        ORDER BY is_featured DESC, title ASC
      `;
      return resources;
    } catch (error) {
      console.error('Failed to get crisis resources:', error);
      return [];
    }
  }

  /**
   * Database maintenance and cleanup
   */
  async performMaintenance(): Promise<void> {
    console.log('🧹 Performing database maintenance...');
    
    try {
      // Archive old completed AI sessions (older than 6 months)
      const [archivedSessions] = await this.sql`
        UPDATE ai_chat_sessions 
        SET status = 'archived'
        WHERE created_at < NOW() - INTERVAL '6 months' 
        AND status = 'completed'
        RETURNING COUNT(*)
      `;

      // Mark resolved crisis events as archived (older than 1 year)
      const [archivedCrisis] = await this.sql`
        UPDATE crisis_events 
        SET status = 'archived' 
        WHERE created_at < NOW() - INTERVAL '1 year' 
        AND status = 'resolved'
        RETURNING COUNT(*)
      `;

      // Clean old audit logs (older than 2 years, keep security-critical ones)
      const [cleanedAudit] = await this.sql`
        DELETE FROM audit_log 
        WHERE created_at < NOW() - INTERVAL '2 years'
        AND action NOT IN ('crisis_detected', 'login_failed', 'admin_action')
        RETURNING COUNT(*)
      `;

      console.log(`✅ Maintenance completed: ${archivedSessions?.count || 0} sessions archived, ${archivedCrisis?.count || 0} crisis events archived, ${cleanedAudit?.count || 0} audit logs cleaned`);
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  /**
   * Check database health and connection status
   */
  async checkDatabaseHealth(): Promise<{
    connected: boolean;
    status: string;
    tableCount: number;
    userCount: number;
    lastMaintenance: string | null;
  }> {
    try {
      // Test basic connection
      const [result] = await this.sql`SELECT NOW() as timestamp`;
      
      // Count tables
      const [tables] = await this.sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      // Count users
      const [users] = await this.sql`SELECT COUNT(*) as count FROM users`;
      
      return {
        connected: true,
        status: 'healthy',
        tableCount: parseInt(tables?.count || '0'),
        userCount: parseInt(users?.count || '0'),
        lastMaintenance: null // TODO: Track maintenance timestamps
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        connected: false,
        status: 'unhealthy',
        tableCount: 0,
        userCount: 0,
        lastMaintenance: null
      };
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<any | null> {
    try {
      const [user] = await this.sql`
        SELECT * FROM users 
        WHERE email = ${email} 
        AND is_active = true
        LIMIT 1
      `;
      return user || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: {
    email: string;
    username: string;
    displayName: string;
    passwordHash: string;
    isVerified: boolean;
    role: 'user' | 'admin' | 'helper';
    isHelper?: boolean;
    isAdmin?: boolean;
    profile?: {
      firstName: string;
      lastName: string;
      bio: string;
      preferences: any;
    };
  }): Promise<any> {
    try {
      const [user] = await this.sql`
        INSERT INTO users (
          email, username, display_name, password_hash, 
          role, is_verified, preferences
        ) 
        VALUES (
          ${userData.email}, 
          ${userData.username}, 
          ${userData.displayName}, 
          ${userData.passwordHash},
          ${userData.role},
          ${userData.isVerified},
          ${JSON.stringify(userData.profile?.preferences || {})}
        )
        RETURNING *
      `;
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find mental health resource by ID
   */
  async findMentalHealthResourceById(id: string): Promise<any | null> {
    try {
      const [resource] = await this.sql`
        SELECT * FROM mental_health_resources 
        WHERE id = ${id}
        LIMIT 1
      `;
      return resource || null;
    } catch (error) {
      console.error('Error finding mental health resource:', error);
      return null;
    }
  }

  /**
   * Create mental health resource
   */
  async createMentalHealthResource(resourceData: {
    id: string;
    type: string;
    name: string;
    description: string;
    contact: string;
    available247: boolean;
    languages: string[];
    countries: string[];
    specializations: string[];
    verified: boolean;
    metadata: any;
  }): Promise<any> {
    try {
      const [resource] = await this.sql`
        INSERT INTO mental_health_resources (
          id, type, name, description, contact,
          available_24_7, languages, countries, specializations,
          verified, metadata
        )
        VALUES (
          ${resourceData.id},
          ${resourceData.type},
          ${resourceData.name},
          ${resourceData.description},
          ${resourceData.contact},
          ${resourceData.available247},
          ${JSON.stringify(resourceData.languages)},
          ${JSON.stringify(resourceData.countries)},
          ${JSON.stringify(resourceData.specializations)},
          ${resourceData.verified},
          ${JSON.stringify(resourceData.metadata)}
        )
        RETURNING *
      `;
      return resource;
    } catch (error) {
      console.error('Error creating mental health resource:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const neonDatabase = new NeonDatabaseService();