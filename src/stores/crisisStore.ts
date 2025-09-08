/**
 * Crisis Store - Zustand state management for crisis detection and intervention
 * Manages crisis state, assessment history, safety plans, and emergency contacts
 */

import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { CrisisAssessment, CrisisSeverity } from '@/services/crisis/CrisisDetectionService';

// Safety plan interfaces
export interface CopingStrategy {
  id: string;
  category: 'distraction' | 'comfort' | 'social' | 'professional' | 'environment';
  title: string;
  description: string;
  effectiveness: number; // 1-5 rating from user feedback
  lastUsed?: Date;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  available247: boolean;
  isProfessional: boolean;
  notes?: string;
}

export interface SafetyPlan {
  id: string;
  userId: string;
  warningSignals: string[];
  copingStrategies: CopingStrategy[];
  emergencyContacts: EmergencyContact[];
  safeEnvironment: string[];
  reasonsToLive: string[];
  professionalContacts: EmergencyContact[];
  createdAt: Date;
  updatedAt: Date;
  lastReviewed: Date;
}

// Crisis chat interfaces
export interface CrisisChatMessage {
  id: string;
  sender: 'user' | 'counselor' | 'ai';
  content: string;
  timestamp: Date;
  isEmergency: boolean;
}

export interface CrisisChatSession {
  id: string;
  userId: string;
  counselorId?: string;
  messages: CrisisChatMessage[];
  severity: CrisisSeverity;
  status: 'active' | 'resolved' | 'escalated';
  startedAt: Date;
  endedAt?: Date;
  outcome?: string;
}

// Risk assessment interfaces
export interface RiskAssessmentQuestion {
  id: string;
  question: string;
  type: 'columbia' | 'phq9' | 'gad7' | 'custom';
  weight: number;
  criticalThreshold?: number;
}

export interface RiskAssessmentResponse {
  questionId: string;
  response: any;
  timestamp: Date;
}

export interface RiskAssessmentResult {
  id: string;
  userId: string;
  assessmentType: string;
  responses: RiskAssessmentResponse[];
  score: number;
  risk: 'low' | 'moderate' | 'high' | 'immediate';
  recommendations: string[];
  timestamp: Date;
}

// Store state interface
interface CrisisState {
  // Crisis detection state
  isInCrisis: boolean;
  currentAssessment: CrisisAssessment | null;
  crisisHistory: CrisisAssessment[];
  lastCheckTime: Date | null;
  
  // Safety plan state
  activeSafetyPlan: SafetyPlan | null;
  safetyPlanHistory: SafetyPlan[];
  
  // Emergency contacts
  emergencyContacts: EmergencyContact[];
  primaryEmergencyContact: EmergencyContact | null;
  
  // Crisis chat state
  activeChatSession: CrisisChatSession | null;
  chatHistory: CrisisChatSession[];
  isConnectedToCounselor: boolean;
  
  // Risk assessment state
  lastRiskAssessment: RiskAssessmentResult | null;
  assessmentHistory: RiskAssessmentResult[];
  isDueForAssessment: boolean;
  
  // User preferences
  preferences: {
    enableAutoDetection: boolean;
    preferredLanguage: string;
    soundAlerts: boolean;
    notificationPermission: boolean;
    shareWithEmergencyContacts: boolean;
    anonymousMode: boolean;
  };
  
  // Statistics
  statistics: {
    totalCrisisEpisodes: number;
    averageSeverity: number;
    lastCrisisDate: Date | null;
    copingStrategiesUsed: number;
    successfulInterventions: number;
  };
  
  // Actions
  setAssessment: (assessment: CrisisAssessment) => void;
  addToHistory: (assessment: CrisisAssessment) => void;
  clearCrisis: () => void;
  
  // Safety plan actions
  setSafetyPlan: (plan: SafetyPlan) => void;
  updateCopingStrategy: (strategyId: string, updates: Partial<CopingStrategy>) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (contactId: string) => void;
  setPrimaryContact: (contact: EmergencyContact) => void;
  
  // Chat actions
  startChatSession: (severity: CrisisSeverity) => void;
  addChatMessage: (message: CrisisChatMessage) => void;
  endChatSession: (outcome: string) => void;
  connectToCounselor: (counselorId: string) => void;
  
  // Risk assessment actions
  setRiskAssessment: (result: RiskAssessmentResult) => void;
  markAssessmentDue: () => void;
  
  // Preference actions
  updatePreferences: (preferences: Partial<CrisisState['preferences']>) => void;
  
  // Statistics actions
  updateStatistics: (stats: Partial<CrisisState['statistics']>) => void;
  incrementCrisisCount: () => void;
  recordSuccessfulIntervention: () => void;
}

/**
 * Crisis store with persistence and devtools
 */
const crisisStoreCreator: StateCreator<CrisisState> = (set, get) => ({
        // Initial state
        isInCrisis: false,
        currentAssessment: null as CrisisAssessment | null,
        crisisHistory: [],
        lastCheckTime: null,
        
        activeSafetyPlan: null as SafetyPlan | null,
        safetyPlanHistory: [],
        
        emergencyContacts: [],
        primaryEmergencyContact: null as EmergencyContact | null,
        
        activeChatSession: null as CrisisChatSession | null,
        chatHistory: [],
        isConnectedToCounselor: false,
        
        lastRiskAssessment: null as RiskAssessmentResult | null,
        assessmentHistory: [],
        isDueForAssessment: false,
        
        preferences: {
          enableAutoDetection: true,
          preferredLanguage: 'en',
          soundAlerts: true,
          notificationPermission: false,
          shareWithEmergencyContacts: false,
          anonymousMode: false
        },
        
        statistics: {
          totalCrisisEpisodes: 0,
          averageSeverity: 0,
          lastCrisisDate: null,
          copingStrategiesUsed: 0,
          successfulInterventions: 0
        },
        
        // Actions
        setAssessment: (assessment: CrisisAssessment) => set((state: CrisisState) => {
          const isInCrisis = assessment.isInCrisis;
          const baseUpdate = {
            currentAssessment: assessment,
            isInCrisis,
            lastCheckTime: new Date()
          };
          
          // Update statistics if crisis detected
          if (isInCrisis) {
            const totalEpisodes = state.statistics.totalCrisisEpisodes + 1;
            const totalSeverity = (state.statistics.averageSeverity * state.statistics.totalCrisisEpisodes) + assessment.severity;
            
            return {
              ...baseUpdate,
              statistics: {
                ...state.statistics,
                totalCrisisEpisodes: totalEpisodes,
                averageSeverity: totalSeverity / totalEpisodes,
                lastCrisisDate: new Date()
              }
            };
          }
          
          return baseUpdate;
        }),
        
        addToHistory: (assessment: CrisisAssessment) => set((state: CrisisState) => ({
          crisisHistory: [...state.crisisHistory, assessment].slice(-100) // Keep last 100
        })),
        
        clearCrisis: () => set({
          isInCrisis: false,
          currentAssessment: null
        }),
        
        // Safety plan actions
        setSafetyPlan: (plan: SafetyPlan) => set((state: CrisisState) => ({
          activeSafetyPlan: plan,
          safetyPlanHistory: [...state.safetyPlanHistory, plan].slice(-10) // Keep last 10
        })),
        
        updateCopingStrategy: (strategyId: string, updates: Partial<CopingStrategy>) => set((state: CrisisState) => {
          if (!state.activeSafetyPlan) return state;
          
          const updatedStrategies = state.activeSafetyPlan.copingStrategies.map((strategy: CopingStrategy) =>
            strategy.id === strategyId ? { ...strategy, ...updates, lastUsed: new Date() } : strategy
          );
          
          return {
            activeSafetyPlan: {
              ...state.activeSafetyPlan,
              copingStrategies: updatedStrategies,
              updatedAt: new Date()
            },
            statistics: {
              ...state.statistics,
              copingStrategiesUsed: state.statistics.copingStrategiesUsed + 1
            }
          };
        }),
        
        addEmergencyContact: (contact: EmergencyContact) => set((state: CrisisState) => ({
          emergencyContacts: [...state.emergencyContacts, contact]
        })),
        
        removeEmergencyContact: (contactId: string) => set((state: CrisisState) => ({
          emergencyContacts: state.emergencyContacts.filter((c: EmergencyContact) => c.id !== contactId),
          primaryEmergencyContact: state.primaryEmergencyContact?.id === contactId 
            ? null 
            : state.primaryEmergencyContact
        })),
        
        setPrimaryContact: (contact: EmergencyContact) => set({
          primaryEmergencyContact: contact
        }),
        
        // Chat actions
        startChatSession: (severity: CrisisSeverity) => set((state: CrisisState) => {
          const session: CrisisChatSession = {
            id: `session_${Date.now()}`,
            userId: 'current_user', // Would be actual user ID
            messages: [],
            severity,
            status: 'active',
            startedAt: new Date()
          };
          
          return {
            activeChatSession: session,
            chatHistory: [...state.chatHistory, session]
          };
        }),
        
        addChatMessage: (message: CrisisChatMessage) => set((state: CrisisState) => {
          if (!state.activeChatSession) return state;
          
          const updatedSession = {
            ...state.activeChatSession,
            messages: [...state.activeChatSession.messages, message]
          };
          
          return {
            activeChatSession: updatedSession,
            chatHistory: state.chatHistory.map((session: CrisisChatSession) =>
              session.id === updatedSession.id ? updatedSession : session
            )
          };
        }),
        
        endChatSession: (outcome: string) => set((state: CrisisState) => {
          if (!state.activeChatSession) return state;
          
          const endedSession = {
            ...state.activeChatSession,
            status: 'resolved' as const,
            endedAt: new Date(),
            outcome
          };
          
          return {
            activeChatSession: null,
            chatHistory: state.chatHistory.map((session: CrisisChatSession) =>
              session.id === endedSession.id ? endedSession : session
            ),
            isConnectedToCounselor: false,
            statistics: {
              ...state.statistics,
              successfulInterventions: state.statistics.successfulInterventions + 1
            }
          };
        }),
        
        connectToCounselor: (counselorId: string) => set((state: CrisisState) => {
          if (!state.activeChatSession) return state;
          
          return {
            activeChatSession: {
              ...state.activeChatSession,
              counselorId
            },
            isConnectedToCounselor: true
          };
        }),
        
        // Risk assessment actions
        setRiskAssessment: (result: RiskAssessmentResult) => set((state: CrisisState) => ({
          lastRiskAssessment: result,
          assessmentHistory: [...state.assessmentHistory, result].slice(-50), // Keep last 50
          isDueForAssessment: false
        })),
        
        markAssessmentDue: () => set({
          isDueForAssessment: true
        }),
        
        // Preference actions
        updatePreferences: (preferences: Partial<CrisisState['preferences']>) => set((state: CrisisState) => ({
          preferences: { ...state.preferences, ...preferences }
        })),
        
        // Statistics actions
        updateStatistics: (stats: Partial<CrisisState['statistics']>) => set((state: CrisisState) => ({
          statistics: { ...state.statistics, ...stats }
        })),
        
        incrementCrisisCount: () => set((state: CrisisState) => ({
          statistics: {
            ...state.statistics,
            totalCrisisEpisodes: state.statistics.totalCrisisEpisodes + 1
          }
        })),
        
        recordSuccessfulIntervention: () => set((state: CrisisState) => ({
          statistics: {
            ...state.statistics,
            successfulInterventions: state.statistics.successfulInterventions + 1
          }
        }))
});

export const useCrisisStore = create<CrisisState>()(
  devtools(
    persist(
      crisisStoreCreator,
      {
        name: 'crisis-storage',
        // Only persist non-sensitive data
        partialize: (state: CrisisState) => ({
          safetyPlanHistory: state.safetyPlanHistory,
          emergencyContacts: state.emergencyContacts,
          primaryEmergencyContact: state.primaryEmergencyContact,
          preferences: state.preferences,
          statistics: state.statistics,
          assessmentHistory: state.assessmentHistory.slice(-10) // Only keep recent 10
        })
      }
    ),
    {
      name: 'CrisisStore'
    }
  )
);

// Selector hooks for common use cases
export const useIsInCrisis = () => useCrisisStore().isInCrisis;
export const useCurrentAssessment = () => useCrisisStore().currentAssessment;
export const useSafetyPlan = () => useCrisisStore().activeSafetyPlan;
export const useEmergencyContacts = () => useCrisisStore().emergencyContacts;
export const useCrisisPreferences = () => useCrisisStore().preferences;
export const useCrisisStatistics = () => useCrisisStore().statistics;
