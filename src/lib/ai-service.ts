// AI Service Integration
// Provides OpenAI and Google Gemini AI capabilities for therapy assistance

import { createApiErrorHandler } from './api-error-handler';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface AIResponse {
  content: string;
  model: string;
  tokens?: number;
  reasoning?: string;
  confidence?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIConfig {
  provider: 'openai' | 'gemini';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * OpenAI GPT Integration
 */
export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  async generateResponse(
    messages: AIMessage[],
    config: Partial<AIConfig> = {}
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      model = 'gpt-4',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a compassionate AI therapy assistant focused on mental health support.'
    } = config;

    try {
      const systemMessage: AIMessage = {
        role: 'system',
        content: systemPrompt
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [systemMessage, ...messages],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // Analyze response for mental health risk indicators
      const riskLevel = this.assessMentalHealthRisk(content);

      return {
        content,
        model,
        tokens: data.usage?.total_tokens,
        confidence: this.calculateConfidence(data),
        riskLevel,
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw createApiErrorHandler('AI_SERVICE_ERROR', `Failed to generate AI response: ${error}`);
    }
  }

  /**
   * Assess mental health risk level from AI response
   */
  private assessMentalHealthRisk(content: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'better off dead', 'suicide plan', 'hurt myself'
    ];
    
    const highKeywords = [
      'hopeless', 'worthless', 'can\'t go on', 'severe depression',
      'panic attack', 'self-harm', 'cutting', 'overdose'
    ];
    
    const mediumKeywords = [
      'anxious', 'depressed', 'stressed', 'overwhelmed',
      'panic', 'anxiety', 'sad', 'down', 'worried'
    ];

    const lowerContent = content.toLowerCase();

    if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'critical';
    }
    if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    }
    if (mediumKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  private calculateConfidence(data: any): number {
    // Simple confidence calculation based on response structure
    const hasChoices = data.choices && data.choices.length > 0;
    const hasContent = data.choices[0]?.message?.content;
    const finishReason = data.choices[0]?.finish_reason;
    
    if (!hasChoices || !hasContent) return 0.3;
    if (finishReason === 'stop') return 0.9;
    if (finishReason === 'length') return 0.7;
    
    return 0.6;
  }
}

/**
 * Google Gemini Integration
 */
export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Gemini API key not configured');
    }
  }

  async generateResponse(
    messages: AIMessage[],
    config: Partial<AIConfig> = {}
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const {
      model = 'gemini-pro',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a compassionate AI therapy assistant focused on mental health support.'
    } = config;

    try {
      // Convert messages to Gemini format
      const contents = this.convertMessagesToGeminiFormat(messages, systemPrompt);

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              topP: 0.8,
              topK: 10,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!content) {
        throw new Error('No content generated by Gemini');
      }

      const riskLevel = this.assessMentalHealthRisk(content);

      return {
        content,
        model,
        confidence: this.calculateConfidence(data),
        riskLevel,
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw createApiErrorHandler('AI_SERVICE_ERROR', `Failed to generate AI response: ${error}`);
    }
  }

  private convertMessagesToGeminiFormat(messages: AIMessage[], systemPrompt: string) {
    const contents = [];
    
    // Add system prompt as first user message
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'I understand. I am a compassionate AI therapy assistant focused on providing mental health support.' }]
      });
    }

    // Convert conversation messages
    messages.forEach(message => {
      const role = message.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: message.content }]
      });
    });

    return contents;
  }

  private assessMentalHealthRisk(content: string): 'low' | 'medium' | 'high' | 'critical' {
    // Same risk assessment logic as OpenAI
    const criticalKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'better off dead', 'suicide plan', 'hurt myself'
    ];
    
    const highKeywords = [
      'hopeless', 'worthless', 'can\'t go on', 'severe depression',
      'panic attack', 'self-harm', 'cutting', 'overdose'
    ];
    
    const mediumKeywords = [
      'anxious', 'depressed', 'stressed', 'overwhelmed',
      'panic', 'anxiety', 'sad', 'down', 'worried'
    ];

    const lowerContent = content.toLowerCase();

    if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'critical';
    }
    if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    }
    if (mediumKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  private calculateConfidence(data: any): number {
    const hasCandidate = data.candidates && data.candidates.length > 0;
    const hasContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data.candidates?.[0]?.finishReason;
    
    if (!hasCandidate || !hasContent) return 0.3;
    if (finishReason === 'STOP') return 0.9;
    if (finishReason === 'MAX_TOKENS') return 0.7;
    
    return 0.6;
  }
}

/**
 * Unified AI Service Factory
 */
export class AIService {
  private openaiService: OpenAIService;
  private geminiService: GeminiService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.geminiService = new GeminiService();
  }

  /**
   * Generate AI response using specified provider
   */
  async generateResponse(
    messages: AIMessage[],
    config: AIConfig = { provider: 'openai' }
  ): Promise<AIResponse> {
    try {
      switch (config.provider) {
        case 'gemini':
          return await this.geminiService.generateResponse(messages, config);
        case 'openai':
        default:
          return await this.openaiService.generateResponse(messages, config);
      }
    } catch (error) {
      console.error(`AI Service (${config.provider}) error:`, error);
      
      // Fallback to alternative provider
      if (config.provider === 'openai') {
        console.log('Falling back to Gemini...');
        return await this.geminiService.generateResponse(messages, { ...config, provider: 'gemini' });
      } else {
        console.log('Falling back to OpenAI...');
        return await this.openaiService.generateResponse(messages, { ...config, provider: 'openai' });
      }
    }
  }

  /**
   * Get therapy-focused AI response
   */
  async getTherapyResponse(
    userMessage: string,
    conversationHistory: AIMessage[] = [],
    provider: 'openai' | 'gemini' = 'openai'
  ): Promise<AIResponse> {
    const systemPrompt = `You are a compassionate and professional AI therapy assistant. Your role is to:

1. Provide emotional support and active listening
2. Ask thoughtful, open-ended questions to help users explore their feelings
3. Suggest healthy coping strategies and mental health techniques
4. Recognize crisis situations and gently guide users to appropriate resources
5. Maintain appropriate boundaries as an AI assistant, not a licensed therapist

Important guidelines:
- Always prioritize user safety and well-being
- Be empathetic, non-judgmental, and validating
- If you detect signs of severe distress or self-harm, recommend professional help
- Do not diagnose mental health conditions
- Encourage users to seek professional help when appropriate
- Use person-first language and avoid stigmatizing terms

Respond in a warm, supportive tone that makes the user feel heard and understood.`;

    const messages: AIMessage[] = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      }
    ];

    return this.generateResponse(messages, {
      provider,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 800
    });
  }

  /**
   * Check if AI services are configured
   */
  isConfigured(): { openai: boolean; gemini: boolean } {
    return {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    };
  }
}

// Export singleton instance
export const aiService = new AIService();