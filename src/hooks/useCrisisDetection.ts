import { useState, useCallback } from 'react';

export type CrisisLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

interface CrisisDetectionHook {
  checkForCrisis: (message: string) => Promise<CrisisLevel>;
  crisisLevel: CrisisLevel;
}

// Crisis keywords for basic detection
const crisisKeywords = {
  critical: ['suicide', 'kill myself', 'end it all', 'want to die', 'better off dead'],
  high: ['hurt myself', 'self-harm', 'cut myself', 'overdose', 'can\'t go on'],
  medium: ['hopeless', 'worthless', 'trapped', 'desperate', 'can\'t take it'],
  low: ['sad', 'depressed', 'anxious', 'stressed', 'overwhelmed']
};

export function useCrisisDetection(): CrisisDetectionHook {
  const [crisisLevel, setCrisisLevel] = useState<CrisisLevel>('none');

  const checkForCrisis = useCallback(async (message: string): Promise<CrisisLevel> => {
    const lowerMessage = message.toLowerCase();
    
    // Check for crisis keywords in order of severity
    for (const [level, keywords] of Object.entries(crisisKeywords)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          const detectedLevel = level as CrisisLevel;
          setCrisisLevel(detectedLevel);
          
          // In a real implementation, this would also:
          // - Log the crisis detection
          // - Trigger appropriate interventions
          // - Alert human moderators for high/critical levels
          
          return detectedLevel;
        }
      }
    }
    
    setCrisisLevel('none');
    return 'none';
  }, []);

  return {
    checkForCrisis,
    crisisLevel
  };
}