'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auditLogger, AuditEventType } from '@/services/security/auditLogger';
import { sessionManager } from '@/services/security/sessionManager';
import { securityMonitor } from '@/services/security/securityMonitor';

export interface AnonymousSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  startTime: Date;
  lastActivity: Date;
  capabilities: Set<string>;
  riskLevel: 'low' | 'medium' | 'high';
  isCrisisAccess: boolean;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

interface AnonymousAuthContextType {
  session: AnonymousSession | null;
  isAuthenticated: boolean;
  isCrisisMode: boolean;
  capabilities: Set<string>;
  
  // Session management
  initializeSession: (options?: { crisisAccess?: boolean }) => Promise<void>;
  updateActivity: () => void;
  endSession: () => Promise<void>;
  
  // Capability checks
  hasCapability: (capability: string) => boolean;
  requestCapability: (capability: string, reason: string) => Promise<boolean>;
  
  // Crisis-specific
  enableCrisisMode: () => Promise<void>;
  getCrisisResources: () => CrisisResource[];
  
  // Privacy controls
  getPrivacyLevel: () => 'minimal' | 'standard' | 'enhanced';
  setPrivacyLevel: (level: 'minimal' | 'standard' | 'enhanced') => void;
}

interface CrisisResource {
  id: string;
  type: 'hotline' | 'chat' | 'text' | 'emergency';
  name: string;
  description: string;
  contact: string;
  availability: string;
  location?: string;
  urgent?: boolean;
}

const AnonymousAuthContext = createContext<AnonymousAuthContextType | undefined>(undefined);

// Default anonymous capabilities
const DEFAULT_CAPABILITIES = new Set([
  'view_public_resources',
  'access_crisis_info',
  'use_wellness_tools',
  'read_educational_content'
]);

// Crisis mode capabilities
const CRISIS_CAPABILITIES = new Set([
  ...DEFAULT_CAPABILITIES,
  'access_crisis_hotlines',
  'use_crisis_chat',
  'emergency_contacts',
  'location_services',
  'priority_support'
]);

// Crisis resources (would typically be loaded from API/database)
const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'nspl',
    type: 'hotline',
    name: 'National Suicide Prevention Lifeline',
    description: '24/7 crisis support and suicide prevention',
    contact: '988',
    availability: '24/7',
    urgent: true
  },
  {
    id: 'crisis-text',
    type: 'text',
    name: 'Crisis Text Line',
    description: 'Free 24/7 crisis support via text',
    contact: 'Text HOME to 741741',
    availability: '24/7'
  },
  {
    id: 'emergency',
    type: 'emergency',
    name: 'Emergency Services',
    description: 'For immediate life-threatening emergencies',
    contact: '911',
    availability: '24/7',
    urgent: true
  },
  {
    id: 'warmline',
    type: 'hotline',
    name: 'SAMHSA National Helpline',
    description: 'Treatment referral and information service',
    contact: '1-800-662-4357',
    availability: '24/7'
  }
];

export function AnonymousAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [privacyLevel, setPrivacyLevelState] = useState<'minimal' | 'standard' | 'enhanced'>('standard');

  // Initialize session on mount
  useEffect(() => {
    const initializeDefaultSession = async () => {
      if (!session) {
        await initializeSession();
      }
    };
    
    initializeDefaultSession();
  }, []);

  // Update activity heartbeat
  useEffect(() => {
    if (!session) return;

    const heartbeat = setInterval(() => {
      updateActivity();
    }, 60000); // Update every minute

    return () => clearInterval(heartbeat);
  }, [session]);

  const initializeSession = async (options: { crisisAccess?: boolean } = {}) => {
    try {
      const sessionData = await sessionManager.createAnonymousSession({
        accessLevel: options.crisisAccess ? 'write' : 'read'
      });

      // Get client info
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;
      const location = await getApproximateLocation();

      const newSession: AnonymousSession = {
        id: sessionData.sessionId,
        ipAddress,
        userAgent,
        startTime: new Date(),
        lastActivity: new Date(),
        capabilities: options.crisisAccess ? CRISIS_CAPABILITIES : DEFAULT_CAPABILITIES,
        riskLevel: 'low',
        isCrisisAccess: options.crisisAccess || false,
        location
      };

      // Assess initial risk level
      newSession.riskLevel = await assessRiskLevel(newSession);

      setSession(newSession);

      // Log session creation
      await auditLogger.logEvent(
        AuditEventType.LOGIN_SUCCESS,
        'anonymous_session_created',
        {
          sessionId: newSession.id,
          ipAddress: newSession.ipAddress,
          userAgent: newSession.userAgent,
          details: { 
            privacyLevel, 
            location,
            crisisAccess: options.crisisAccess,
            capabilities: Array.from(newSession.capabilities)
          }
        }
      );

      // Monitor for security threats
      await securityMonitor.trackAnonymousSession(newSession.id, 'session_created', {
        privacyLevel,
        location,
        userAgent: newSession.userAgent
      });

    } catch (error) {
      console.error('Failed to initialize anonymous session:', error);
      await auditLogger.logEvent(
        AuditEventType.LOGIN_FAILURE,
        'anonymous_session_failed',
        {
          outcome: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  };

  const updateActivity = () => {
    if (!session) return;

    const updatedSession = {
      ...session,
      lastActivity: new Date()
    };

    setSession(updatedSession);
    sessionManager.updateActivity(session.id, 'user_activity');
  };

  const endSession = async () => {
    if (!session) return;

    try {
      await sessionManager.invalidateSession(session.id);
      
      // Log session end
      await auditLogger.logEvent(
        AuditEventType.LOGOUT,
        'anonymous_session_ended',
        {
          sessionId: session.id,
          duration: Date.now() - session.startTime.getTime(),
          details: {
            lastActivity: session.lastActivity,
            capabilities: Array.from(session.capabilities)
          }
        }
      );

      setSession(null);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const hasCapability = (capability: string): boolean => {
    return session?.capabilities.has(capability) ?? false;
  };

  const requestCapability = async (capability: string, reason: string): Promise<boolean> => {
    if (!session) return false;

    // Check if capability is allowed for anonymous users
    const allowedCapabilities = [
      'access_crisis_info',
      'use_wellness_tools',
      'read_educational_content',
      'access_crisis_hotlines',
      'use_crisis_chat'
    ];

    if (!allowedCapabilities.includes(capability)) {
      await auditLogger.logEvent(
        AuditEventType.UNAUTHORIZED_ACCESS,
        'capability_denied',
        {
          sessionId: session.id,
          capability,
          reason,
          outcome: 'failure'
        }
      );
      return false;
    }

    // Add capability to session
    const updatedCapabilities = new Set(session.capabilities);
    updatedCapabilities.add(capability);

    const updatedSession = {
      ...session,
      capabilities: updatedCapabilities
    };

    setSession(updatedSession);

    // Log capability grant
    await auditLogger.logEvent(
      AuditEventType.SYSTEM_START,
      'capability_granted',
      {
        sessionId: session.id,
        capability,
        reason,
        details: { newCapabilities: Array.from(updatedCapabilities) }
      }
    );

    return true;
  };

  const enableCrisisMode = async () => {
    if (!session) return;

    try {
      const updatedSession = {
        ...session,
        isCrisisAccess: true,
        capabilities: CRISIS_CAPABILITIES,
        riskLevel: 'high' as const
      };

      setSession(updatedSession);

      // Log crisis mode activation
      await auditLogger.logEvent(
        AuditEventType.CRISIS_INTERVENTION,
        'crisis_mode_enabled',
        {
          sessionId: session.id,
          severity: 'critical' as any,
          details: {
            previousCapabilities: Array.from(session.capabilities),
            newCapabilities: Array.from(CRISIS_CAPABILITIES),
            timestamp: new Date().toISOString()
          }
        }
      );

      // Alert security monitoring
      await securityMonitor.reportSecurityEvent('CRISIS_MODE_ENABLED', {
        severity: 'HIGH',
        sessionId: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        location: session.location
      });

    } catch (error) {
      console.error('Failed to enable crisis mode:', error);
    }
  };

  const getCrisisResources = (): CrisisResource[] => {
    if (!session?.isCrisisAccess) return [];
    return CRISIS_RESOURCES;
  };

  const getPrivacyLevel = () => privacyLevel;

  const setPrivacyLevel = (level: 'minimal' | 'standard' | 'enhanced') => {
    setPrivacyLevelState(level);
    
    // Log privacy level change
    if (session) {
      auditLogger.logEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        'privacy_level_changed',
        {
          sessionId: session.id,
          details: { 
            previousLevel: privacyLevel, 
            newLevel: level 
          }
        }
      );
    }
  };

  const contextValue: AnonymousAuthContextType = {
    session,
    isAuthenticated: !!session,
    isCrisisMode: session?.isCrisisAccess ?? false,
    capabilities: session?.capabilities ?? new Set(),
    
    initializeSession,
    updateActivity,
    endSession,
    
    hasCapability,
    requestCapability,
    
    enableCrisisMode,
    getCrisisResources,
    
    getPrivacyLevel,
    setPrivacyLevel
  };

  return (
    <AnonymousAuthContext.Provider value={contextValue}>
      {children}
    </AnonymousAuthContext.Provider>
  );
}

export function useAnonymousAuth() {
  const context = useContext(AnonymousAuthContext);
  if (context === undefined) {
    throw new Error('useAnonymousAuth must be used within an AnonymousAuthProvider');
  }
  return context;
}

// Utility functions
async function getClientIP(): Promise<string> {
  try {
    // In production, this would get the real client IP
    // For development, return localhost
    if (typeof window !== 'undefined') {
      return 'localhost';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function getApproximateLocation() {
  try {
    // In production, use a privacy-respecting geolocation service
    // This should only get country/region level data for anonymous users
    const response = await fetch('https://ipapi.co/json/').catch(() => null);
    if (response?.ok) {
      const data = await response.json();
      return {
        country: data.country_name,
        region: data.region,
        city: undefined // Don't store city for privacy
      };
    }
  } catch {
    // Silently fail - location is optional
  }
  
  return undefined;
}

async function assessRiskLevel(session: AnonymousSession): Promise<'low' | 'medium' | 'high'> {
  // Simple risk assessment based on session characteristics
  let riskScore = 0;

  // Crisis access increases risk monitoring
  if (session.isCrisisAccess) riskScore += 30;

  // Check for suspicious patterns (would be more sophisticated in production)
  const ua = session.userAgent.toLowerCase();
  if (ua.includes('bot') || ua.includes('crawler')) riskScore += 50;

  // Location-based risk (placeholder)
  if (!session.location) riskScore += 10;

  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
}

// Export types for use in other components
export type { CrisisResource };