import { useState, useCallback } from 'react';

interface AIMetrics {
  responseTime: number;
  confidence: number;
  sentiment: number;
}

interface SendOptions {
  conversationHistory?: { role: 'user'|'assistant'|'system'; content: string }[];
  provider?: 'openai'|'gemini';
  systemPrompt?: string;
  therapistId?: string;
  therapistName?: string;
}

interface AITherapyHook {
  sendMessage: (content: string, options?: SendOptions) => Promise<{ response: string } | null>;
  isProcessing: boolean;
  sessionId: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  aiMetrics: AIMetrics;
}

export function useAITherapy(): AITherapyHook {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [connectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [aiMetrics] = useState<AIMetrics>({
    responseTime: 0,
    confidence: 0.85,
    sentiment: 0
  });

  const sendMessage = useCallback(async (content: string, options?: SendOptions) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
          conversationHistory: options?.conversationHistory || [],
          provider: options?.provider || 'openai',
          systemPrompt: options?.systemPrompt,
          therapistId: options?.therapistId,
          therapistName: options?.therapistName,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const text = data?.data?.response as string | undefined;
      return text ? { response: text } : null;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId]);

  return {
    sendMessage,
    isProcessing,
    sessionId,
    connectionStatus,
    aiMetrics
  };
}
