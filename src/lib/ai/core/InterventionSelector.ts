/**
 * Evidence-Based Intervention Selection System
 * Selects appropriate therapeutic interventions based on user context and needs
 */

import { EventEmitter } from 'events';

export interface Intervention {
  id: string;
  type: InterventionType;
  name: string;
  description: string;
  evidenceBase: EvidenceLevel;
  targetSymptoms: string[];
  contraindications: string[];
  duration: number; // minutes
  difficulty: 'easy' | 'moderate' | 'advanced';
  modality: InterventionModality;
  components: InterventionComponent[];
  effectiveness: EffectivenessData;
  implementation: () => Promise<InterventionResult>;
}

export type InterventionType = 
  | 'cbt'
  | 'dbt'
  | 'mindfulness'
  | 'breathing'
  | 'grounding'
  | 'progressive_muscle_relaxation'
  | 'visualization'
  | 'cognitive_restructuring'
  | 'behavioral_activation'
  | 'exposure'
  | 'safety_planning'
  | 'crisis_escalation'
  | 'psychoeducation'
  | 'social_support'
  | 'self_compassion'
  | 'values_clarification'
  | 'problem_solving'
  | 'emotion_regulation'
  | 'distress_tolerance'
  | 'interpersonal_effectiveness';

export type EvidenceLevel = 
  | 'strong' // Multiple RCTs, meta-analyses
  | 'moderate' // Some RCTs, consistent findings
  | 'emerging' // Pilot studies, case reports
  | 'expert_consensus'; // Clinical guidelines

export type InterventionModality = 
  | 'cognitive'
  | 'behavioral'
  | 'somatic'
  | 'mindfulness'
  | 'interpersonal'
  | 'expressive'
  | 'psychoeducational';

export interface InterventionComponent {
  step: number;
  instruction: string;
  duration: number;
  userAction?: string;
  systemResponse?: string;
}

export interface EffectivenessData {
  averageImprovement: number; // percentage
  engagementRate: number; // percentage
  completionRate: number; // percentage
  userSatisfaction: number; // 1-5 scale
}

export interface InterventionResult {
  success: boolean;
  userEngagement: number; // 0-1
  symptomImprovement?: number; // percentage
  nextSteps?: string[];
  escalationNeeded?: boolean;
  feedback?: string;
}

export interface SelectionCriteria {
  userProfile: any;
  currentSymptoms: string[];
  riskLevel: string;
  preferences: InterventionPreferences;
  contraindications: string[];
  previousInterventions: string[];
  culturalFactors: CulturalFactors;
}

export interface InterventionPreferences {
  preferredModalities: InterventionModality[];
  avoidModalities: InterventionModality[];
  timeAvailable: number; // minutes
  difficultyLevel: 'easy' | 'moderate' | 'advanced';
}

export interface CulturalFactors {
  language: string;
  culturalBackground?: string;
  religiousConsiderations?: string[];
  preferredApproach?: string;
}

export class InterventionSelector extends EventEmitter {
  private interventionLibrary: Map<string, Intervention>;
  private selectionHistory: Map<string, InterventionHistory[]>;
  private effectivenessTracker: Map<string, EffectivenessMetrics>;

  constructor() {
    super();
    this.interventionLibrary = new Map();
    this.selectionHistory = new Map();
    this.effectivenessTracker = new Map();
    this.initializeInterventionLibrary();
  }

  private initializeInterventionLibrary(): void {
    // CBT Interventions
    this.addIntervention({
      id: 'cbt_thought_record',
      type: 'cbt',
      name: 'Thought Record',
      description: 'Identify and challenge negative thought patterns',
      evidenceBase: 'strong',
      targetSymptoms: ['anxiety', 'depression', 'negative thinking'],
      contraindications: ['severe psychosis', 'severe cognitive impairment'],
      duration: 15,
      difficulty: 'moderate',
      modality: 'cognitive',
      components: [
        {
          step: 1,
          instruction: 'Identify the situation that triggered your thoughts',
          duration: 2,
          userAction: 'Describe the situation'
        },
        {
          step: 2,
          instruction: 'Notice your automatic thoughts',
          duration: 3,
          userAction: 'Write down your immediate thoughts'
        },
        {
          step: 3,
          instruction: 'Identify the emotions you\'re feeling',
          duration: 2,
          userAction: 'Name and rate your emotions (0-10)'
        },
        {
          step: 4,
          instruction: 'Examine the evidence for and against your thoughts',
          duration: 5,
          userAction: 'List evidence supporting and contradicting your thoughts'
        },
        {
          step: 5,
          instruction: 'Develop a balanced, realistic thought',
          duration: 3,
          userAction: 'Create an alternative, balanced perspective'
        }
      ],
      effectiveness: {
        averageImprovement: 65,
        engagementRate: 78,
        completionRate: 82,
        userSatisfaction: 4.2
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.8,
        symptomImprovement: 25,
        nextSteps: ['Practice thought records daily', 'Review patterns weekly']
      })
    });

    // Mindfulness Interventions
    this.addIntervention({
      id: 'mindfulness_breathing',
      type: 'mindfulness',
      name: 'Mindful Breathing',
      description: 'Focus on breath to anchor in the present moment',
      evidenceBase: 'strong',
      targetSymptoms: ['anxiety', 'stress', 'panic', 'racing thoughts'],
      contraindications: ['severe respiratory conditions'],
      duration: 5,
      difficulty: 'easy',
      modality: 'mindfulness',
      components: [
        {
          step: 1,
          instruction: 'Find a comfortable seated position',
          duration: 0.5,
          userAction: 'Sit comfortably with back straight'
        },
        {
          step: 2,
          instruction: 'Close your eyes or soften your gaze',
          duration: 0.5,
          userAction: 'Relax your eyes'
        },
        {
          step: 3,
          instruction: 'Notice your natural breath without changing it',
          duration: 1,
          userAction: 'Observe your breathing'
        },
        {
          step: 4,
          instruction: 'Count breaths: Inhale (1), Exhale (2), up to 10, then restart',
          duration: 2,
          userAction: 'Count your breaths'
        },
        {
          step: 5,
          instruction: 'When mind wanders, gently return to counting',
          duration: 1,
          userAction: 'Refocus on breath when distracted'
        }
      ],
      effectiveness: {
        averageImprovement: 55,
        engagementRate: 85,
        completionRate: 92,
        userSatisfaction: 4.4
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.9,
        symptomImprovement: 30,
        nextSteps: ['Practice daily', 'Increase duration gradually']
      })
    });

    // DBT Interventions
    this.addIntervention({
      id: 'dbt_tipp',
      type: 'dbt',
      name: 'TIPP Technique',
      description: 'Temperature, Intense exercise, Paced breathing, Paired muscle relaxation',
      evidenceBase: 'strong',
      targetSymptoms: ['emotional dysregulation', 'crisis', 'intense distress'],
      contraindications: ['cardiac conditions', 'pregnancy'],
      duration: 10,
      difficulty: 'moderate',
      modality: 'somatic',
      components: [
        {
          step: 1,
          instruction: 'Temperature: Splash cold water on face or hold ice',
          duration: 2,
          userAction: 'Apply cold water/ice to face'
        },
        {
          step: 2,
          instruction: 'Intense Exercise: Do jumping jacks or run in place',
          duration: 3,
          userAction: 'Engage in brief intense movement'
        },
        {
          step: 3,
          instruction: 'Paced Breathing: Breathe out longer than in (4-6 pattern)',
          duration: 3,
          userAction: 'Practice slow, paced breathing'
        },
        {
          step: 4,
          instruction: 'Paired Muscle Relaxation: Tense and release muscle groups',
          duration: 2,
          userAction: 'Systematically tense and relax muscles'
        }
      ],
      effectiveness: {
        averageImprovement: 70,
        engagementRate: 75,
        completionRate: 80,
        userSatisfaction: 4.1
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.75,
        symptomImprovement: 40,
        nextSteps: ['Use when distress > 7/10', 'Practice components separately']
      })
    });

    // Grounding Interventions
    this.addIntervention({
      id: 'grounding_54321',
      type: 'grounding',
      name: '5-4-3-2-1 Grounding',
      description: 'Use senses to ground in the present moment',
      evidenceBase: 'moderate',
      targetSymptoms: ['dissociation', 'flashbacks', 'panic', 'anxiety'],
      contraindications: [],
      duration: 5,
      difficulty: 'easy',
      modality: 'somatic',
      components: [
        {
          step: 1,
          instruction: 'Name 5 things you can see',
          duration: 1,
          userAction: 'Identify 5 visual objects'
        },
        {
          step: 2,
          instruction: 'Name 4 things you can touch',
          duration: 1,
          userAction: 'Notice 4 tactile sensations'
        },
        {
          step: 3,
          instruction: 'Name 3 things you can hear',
          duration: 1,
          userAction: 'Listen for 3 sounds'
        },
        {
          step: 4,
          instruction: 'Name 2 things you can smell',
          duration: 1,
          userAction: 'Notice 2 scents'
        },
        {
          step: 5,
          instruction: 'Name 1 thing you can taste',
          duration: 1,
          userAction: 'Notice 1 taste'
        }
      ],
      effectiveness: {
        averageImprovement: 60,
        engagementRate: 88,
        completionRate: 95,
        userSatisfaction: 4.3
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.85,
        symptomImprovement: 35,
        nextSteps: ['Use when feeling disconnected', 'Practice regularly']
      })
    });

    // Behavioral Activation
    this.addIntervention({
      id: 'behavioral_activation_planning',
      type: 'behavioral_activation',
      name: 'Activity Planning',
      description: 'Schedule pleasurable and meaningful activities',
      evidenceBase: 'strong',
      targetSymptoms: ['depression', 'anhedonia', 'isolation', 'low motivation'],
      contraindications: ['severe mania'],
      duration: 20,
      difficulty: 'moderate',
      modality: 'behavioral',
      components: [
        {
          step: 1,
          instruction: 'List activities that used to bring joy or meaning',
          duration: 5,
          userAction: 'Create activity list'
        },
        {
          step: 2,
          instruction: 'Rate each activity: Importance (1-10) and Difficulty (1-10)',
          duration: 3,
          userAction: 'Rate activities'
        },
        {
          step: 3,
          instruction: 'Choose 1-2 high importance, low difficulty activities',
          duration: 2,
          userAction: 'Select activities'
        },
        {
          step: 4,
          instruction: 'Schedule specific times for these activities this week',
          duration: 5,
          userAction: 'Create schedule'
        },
        {
          step: 5,
          instruction: 'Identify potential barriers and solutions',
          duration: 5,
          userAction: 'Problem-solve barriers'
        }
      ],
      effectiveness: {
        averageImprovement: 68,
        engagementRate: 72,
        completionRate: 75,
        userSatisfaction: 4.0
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.7,
        symptomImprovement: 28,
        nextSteps: ['Follow through with scheduled activities', 'Track mood changes']
      })
    });

    // Self-Compassion
    this.addIntervention({
      id: 'self_compassion_break',
      type: 'self_compassion',
      name: 'Self-Compassion Break',
      description: 'Practice kindness toward yourself during difficult moments',
      evidenceBase: 'moderate',
      targetSymptoms: ['self-criticism', 'shame', 'guilt', 'low self-esteem'],
      contraindications: [],
      duration: 5,
      difficulty: 'easy',
      modality: 'cognitive',
      components: [
        {
          step: 1,
          instruction: 'Acknowledge: "This is a moment of suffering"',
          duration: 1,
          userAction: 'Recognize your pain'
        },
        {
          step: 2,
          instruction: 'Remember: "Suffering is part of human experience"',
          duration: 1,
          userAction: 'Connect with common humanity'
        },
        {
          step: 3,
          instruction: 'Offer yourself kindness: "May I be kind to myself"',
          duration: 1,
          userAction: 'Extend self-kindness'
        },
        {
          step: 4,
          instruction: 'Place hand on heart and feel the warmth',
          duration: 1,
          userAction: 'Physical self-soothing'
        },
        {
          step: 5,
          instruction: 'Repeat phrases that resonate with you',
          duration: 1,
          userAction: 'Personalize compassionate phrases'
        }
      ],
      effectiveness: {
        averageImprovement: 58,
        engagementRate: 80,
        completionRate: 90,
        userSatisfaction: 4.5
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.82,
        symptomImprovement: 22,
        nextSteps: ['Practice daily', 'Journal about experience']
      })
    });

    // Crisis Intervention
    this.addIntervention({
      id: 'crisis_safety_planning',
      type: 'safety_planning',
      name: 'Crisis Safety Planning',
      description: 'Create a personalized safety plan for crisis moments',
      evidenceBase: 'strong',
      targetSymptoms: ['suicidal ideation', 'self-harm urges', 'crisis'],
      contraindications: [],
      duration: 30,
      difficulty: 'moderate',
      modality: 'cognitive',
      components: [
        {
          step: 1,
          instruction: 'Identify warning signs of crisis',
          duration: 5,
          userAction: 'List personal warning signs'
        },
        {
          step: 2,
          instruction: 'List internal coping strategies',
          duration: 5,
          userAction: 'Identify self-soothing techniques'
        },
        {
          step: 3,
          instruction: 'Identify people and social settings for distraction',
          duration: 5,
          userAction: 'List supportive contacts'
        },
        {
          step: 4,
          instruction: 'List people to ask for help',
          duration: 5,
          userAction: 'Identify crisis contacts'
        },
        {
          step: 5,
          instruction: 'List professional crisis resources',
          duration: 5,
          userAction: 'Record emergency numbers'
        },
        {
          step: 6,
          instruction: 'Make environment safe',
          duration: 5,
          userAction: 'Remove or secure means of harm'
        }
      ],
      effectiveness: {
        averageImprovement: 75,
        engagementRate: 70,
        completionRate: 68,
        userSatisfaction: 4.1
      },
      implementation: async () => ({
        success: true,
        userEngagement: 0.7,
        symptomImprovement: 45,
        nextSteps: ['Share plan with trusted person', 'Keep accessible', 'Review regularly'],
        escalationNeeded: true
      })
    });
  }

  private addIntervention(intervention: Intervention): void {
    this.interventionLibrary.set(intervention.id, intervention);
  }

  public async select(
    context: any,
    message: any,
    crisisAssessment: any
  ): Promise<Intervention[]> {
    const criteria: SelectionCriteria = this.buildSelectionCriteria(
      context,
      message,
      crisisAssessment
    );

    // Filter interventions based on criteria
    const eligibleInterventions = this.filterInterventions(criteria);

    // Rank interventions by appropriateness
    const rankedInterventions = this.rankInterventions(
      eligibleInterventions,
      criteria
    );

    // Select top interventions
    const selectedInterventions = this.selectTopInterventions(
      rankedInterventions,
      criteria
    );

    // Record selection for learning
    await this.recordSelection(context.userId, selectedInterventions, criteria);

    // Emit selection event
    this.emit('interventions-selected', {
      userId: context.userId,
      interventions: selectedInterventions,
      criteria
    });

    return selectedInterventions;
  }

  private buildSelectionCriteria(
    context: any,
    message: any,
    crisisAssessment: any
  ): SelectionCriteria {
    return {
      userProfile: context.userProfile,
      currentSymptoms: this.extractSymptoms(message, context),
      riskLevel: crisisAssessment.level,
      preferences: this.extractPreferences(context),
      contraindications: this.extractContraindications(context),
      previousInterventions: this.getPreviousInterventions(context.userId),
      culturalFactors: this.extractCulturalFactors(context)
    };
  }

  private extractSymptoms(message: any, context: any): string[] {
    const symptoms: string[] = [];
    
    // Extract from message analysis
    if (message.emotions) {
      if (message.emotions.primary === 'anxiety') symptoms.push('anxiety');
      if (message.emotions.primary === 'sadness') symptoms.push('depression');
      if (message.emotions.intensity > 0.7) symptoms.push('emotional dysregulation');
    }

    // Extract from entities
    if (message.entities) {
      const symptomEntities = message.entities.filter((e: any) => e.type === 'symptom');
      symptoms.push(...symptomEntities.map((e: any) => e.value));
    }

    // Extract from therapeutic elements
    if (message.therapeuticElements?.riskFactors) {
      if (message.therapeuticElements.riskFactors.includes('hopeless')) {
        symptoms.push('depression', 'hopelessness');
      }
    }

    return [...new Set(symptoms)]; // Remove duplicates
  }

  private extractPreferences(context: any): InterventionPreferences {
    const profile = context.userProfile;
    return {
      preferredModalities: profile?.preferences?.interventionTypes?.map(
        (t: string) => this.mapToModality(t)
      ) || ['cognitive', 'mindfulness'],
      avoidModalities: [],
      timeAvailable: 15,
      difficultyLevel: 'moderate'
    };
  }

  private mapToModality(interventionType: string): InterventionModality {
    const modalityMap: Record<string, InterventionModality> = {
      'cbt': 'cognitive',
      'dbt': 'behavioral',
      'mindfulness': 'mindfulness',
      'breathing': 'somatic',
      'grounding': 'somatic'
    };
    return modalityMap[interventionType] || 'cognitive';
  }

  private extractContraindications(context: any): string[] {
    const contraindications: string[] = [];
    const profile = context.userProfile;

    if (profile?.therapyHistory?.medications) {
      contraindications.push('medication_interaction');
    }

    if (profile?.demographics?.age && profile.demographics.age > 65) {
      contraindications.push('intense_exercise');
    }

    return contraindications;
  }

  private getPreviousInterventions(userId: string): string[] {
    const history = this.selectionHistory.get(userId) || [];
    return history.map(h => h.interventionId);
  }

  private extractCulturalFactors(context: any): CulturalFactors {
    const profile = context.userProfile;
    return {
      language: context.language || 'en',
      culturalBackground: profile?.demographics?.culturalBackground,
      religiousConsiderations: profile?.preferences?.religiousConsiderations,
      preferredApproach: profile?.preferences?.therapeuticApproach
    };
  }

  private filterInterventions(criteria: SelectionCriteria): Intervention[] {
    const interventions = Array.from(this.interventionLibrary.values());
    
    return interventions.filter(intervention => {
      // Check if intervention targets current symptoms
      const targetsSymptoms = intervention.targetSymptoms.some(
        symptom => criteria.currentSymptoms.includes(symptom)
      );
      
      // Check contraindications
      const hasContraindication = intervention.contraindications.some(
        contra => criteria.contraindications.includes(contra)
      );
      
      // Check time availability
      const fitsTimeframe = intervention.duration <= criteria.preferences.timeAvailable;
      
      // Check difficulty level
      const appropriateDifficulty = this.isDifficultyAppropriate(
        intervention.difficulty,
        criteria.preferences.difficultyLevel
      );
      
      // Check modality preferences
      const modalityAcceptable = !criteria.preferences.avoidModalities.includes(
        intervention.modality
      );
      
      return targetsSymptoms && 
             !hasContraindication && 
             fitsTimeframe && 
             appropriateDifficulty &&
             modalityAcceptable;
    });
  }

  private isDifficultyAppropriate(
    interventionDifficulty: string,
    userPreference: string
  ): boolean {
    const difficultyLevels = ['easy', 'moderate', 'advanced'];
    const interventionLevel = difficultyLevels.indexOf(interventionDifficulty);
    const userLevel = difficultyLevels.indexOf(userPreference);
    
    // Allow interventions at or below user's preferred difficulty
    return interventionLevel <= userLevel;
  }

  private rankInterventions(
    interventions: Intervention[],
    criteria: SelectionCriteria
  ): Intervention[] {
    const scored = interventions.map(intervention => {
      let score = 0;
      
      // Evidence base score (0-30 points)
      const evidenceScores = { strong: 30, moderate: 20, emerging: 10, expert_consensus: 15 };
      score += evidenceScores[intervention.evidenceBase];
      
      // Effectiveness score (0-20 points)
      score += (intervention.effectiveness.averageImprovement / 100) * 20;
      
      // User engagement score (0-15 points)
      score += (intervention.effectiveness.engagementRate / 100) * 15;
      
      // Symptom match score (0-20 points)
      const symptomMatches = intervention.targetSymptoms.filter(
        s => criteria.currentSymptoms.includes(s)
      ).length;
      score += (symptomMatches / Math.max(intervention.targetSymptoms.length, 1)) * 20;
      
      // Preference match score (0-15 points)
      if (criteria.preferences.preferredModalities.includes(intervention.modality)) {
        score += 15;
      }
      
      // Crisis appropriateness
      if (criteria.riskLevel === 'high' || criteria.riskLevel === 'critical') {
        if (intervention.type === 'safety_planning' || intervention.type === 'crisis_escalation') {
          score += 50; // Heavily prioritize crisis interventions
        }
      }
      
      // Novelty bonus (avoid repetition)
      if (!criteria.previousInterventions.includes(intervention.id)) {
        score += 5;
      }
      
      return { intervention, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored.map(s => s.intervention);
  }

  private selectTopInterventions(
    rankedInterventions: Intervention[],
    criteria: SelectionCriteria
  ): Intervention[] {
    // In crisis, return only crisis intervention
    if (criteria.riskLevel === 'critical') {
      const crisisIntervention = rankedInterventions.find(
        i => i.type === 'safety_planning' || i.type === 'crisis_escalation'
      );
      return crisisIntervention ? [crisisIntervention] : [];
    }
    
    // For high risk, include safety planning plus one other
    if (criteria.riskLevel === 'high') {
      const safetyPlan = rankedInterventions.find(i => i.type === 'safety_planning');
      const other = rankedInterventions.find(i => i.type !== 'safety_planning');
      return [safetyPlan, other].filter((intervention): intervention is Intervention => Boolean(intervention));
    }
    
    // Normal selection: top 2-3 interventions
    const maxInterventions = criteria.preferences.timeAvailable >= 30 ? 3 : 2;
    return rankedInterventions.slice(0, maxInterventions);
  }

  private async recordSelection(
    userId: string,
    interventions: Intervention[],
    criteria: SelectionCriteria
  ): Promise<void> {
    if (!this.selectionHistory.has(userId)) {
      this.selectionHistory.set(userId, []);
    }
    
    const history = this.selectionHistory.get(userId)!;
    for (const intervention of interventions) {
      history.push({
        interventionId: intervention.id,
        timestamp: new Date(),
        criteria,
        outcome: null // To be filled after intervention completion
      });
    }
    
    // Keep only last 50 selections
    if (history.length > 50) {
      this.selectionHistory.set(userId, history.slice(-50));
    }
  }

  public async recordOutcome(
    userId: string,
    interventionId: string,
    outcome: InterventionResult
  ): Promise<void> {
    const history = this.selectionHistory.get(userId);
    if (!history) return;
    
    const record = history.find(h => h.interventionId === interventionId && !h.outcome);
    if (record) {
      record.outcome = outcome;
    }
    
    // Update effectiveness metrics
    await this.updateEffectivenessMetrics(interventionId, outcome);
  }

  private async updateEffectivenessMetrics(
    interventionId: string,
    outcome: InterventionResult
  ): Promise<void> {
    if (!this.effectivenessTracker.has(interventionId)) {
      this.effectivenessTracker.set(interventionId, {
        totalUses: 0,
        successfulUses: 0,
        averageEngagement: 0,
        averageImprovement: 0
      });
    }
    
    const metrics = this.effectivenessTracker.get(interventionId)!;
    metrics.totalUses++;
    if (outcome.success) metrics.successfulUses++;
    
    // Update running averages
    metrics.averageEngagement = 
      (metrics.averageEngagement * (metrics.totalUses - 1) + outcome.userEngagement) / 
      metrics.totalUses;
    
    if (outcome.symptomImprovement) {
      metrics.averageImprovement = 
        (metrics.averageImprovement * (metrics.totalUses - 1) + outcome.symptomImprovement) / 
        metrics.totalUses;
    }
    
    // Emit metrics update
    this.emit('effectiveness-updated', {
      interventionId,
      metrics
    });
  }

  public getIntervention(id: string): Intervention | undefined {
    return this.interventionLibrary.get(id);
  }

  public getAllInterventions(): Intervention[] {
    return Array.from(this.interventionLibrary.values());
  }

  public getEffectivenessMetrics(interventionId: string): EffectivenessMetrics | undefined {
    return this.effectivenessTracker.get(interventionId);
  }
}

interface InterventionHistory {
  interventionId: string;
  timestamp: Date;
  criteria: SelectionCriteria;
  outcome: InterventionResult | null;
}

interface EffectivenessMetrics {
  totalUses: number;
  successfulUses: number;
  averageEngagement: number;
  averageImprovement: number;
}

export default InterventionSelector;