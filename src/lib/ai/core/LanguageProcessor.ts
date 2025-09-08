/**
 * Natural Language Processing Module
 * Handles multi-language support, sentiment analysis, and therapeutic conversation processing
 */

import { EventEmitter } from 'events';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt';

export interface ProcessedMessage {
  original: string;
  normalized: string;
  language: SupportedLanguage;
  sentiment: SentimentAnalysis;
  emotions: EmotionAnalysis;
  intent: IntentClassification;
  entities: ExtractedEntity[];
  keywords: string[];
  topics: string[];
  therapeuticElements: TherapeuticElements;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
}

export interface EmotionAnalysis {
  primary: EmotionType;
  secondary: EmotionType[];
  intensity: number; // 0 to 1
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
}

export type EmotionType = 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' 
  | 'disgust' | 'trust' | 'anticipation' | 'shame' 
  | 'guilt' | 'pride' | 'love' | 'anxiety' | 'hope';

export interface IntentClassification {
  primary: IntentType;
  confidence: number;
  secondary?: IntentType[];
}

export type IntentType =
  | 'seeking_help'
  | 'expressing_emotion'
  | 'asking_question'
  | 'sharing_experience'
  | 'requesting_resources'
  | 'crisis_expression'
  | 'feedback'
  | 'social_connection'
  | 'coping_inquiry'
  | 'medication_question'
  | 'therapy_inquiry';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  context?: string;
}

export type EntityType =
  | 'person'
  | 'location'
  | 'time'
  | 'symptom'
  | 'medication'
  | 'therapy_type'
  | 'coping_strategy'
  | 'trigger'
  | 'support_person';

export interface TherapeuticElements {
  copingMechanisms: string[];
  triggers: string[];
  strengths: string[];
  riskFactors: string[];
  protectiveFactors: string[];
  therapeuticThemes: TherapeuticTheme[];
}

export interface TherapeuticTheme {
  theme: string;
  relevance: number;
  suggestedInterventions: string[];
}

interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  stopWords: string[];
  emotionLexicon: Map<string, EmotionType>;
  therapeuticKeywords: Map<string, string>;
}

export class LanguageProcessor extends EventEmitter {
  private languageConfigs: Map<SupportedLanguage, LanguageConfig> = new Map();
  private emotionPatterns: Map<EmotionType, RegExp[]> = new Map();
  private intentPatterns: Map<IntentType, RegExp[]> = new Map();
  private currentLanguage: SupportedLanguage = 'en';

  constructor() {
    super();
    this.initializeLanguageConfigs();
    this.initializePatterns();
  }

  private initializeLanguageConfigs(): void {
    this.languageConfigs = new Map();
    
    // English configuration
    this.languageConfigs.set('en', {
      code: 'en',
      name: 'English',
      stopWords: ['the', 'is', 'at', 'which', 'on', 'a', 'an'],
      emotionLexicon: new Map([
        ['happy', 'joy'], ['sad', 'sadness'], ['angry', 'anger'],
        ['scared', 'fear'], ['anxious', 'anxiety'], ['hopeful', 'hope'],
        ['depressed', 'sadness'], ['worried', 'anxiety'], ['lonely', 'sadness']
      ]),
      therapeuticKeywords: new Map([
        ['breathing', 'coping_strategy'], ['meditation', 'coping_strategy'],
        ['exercise', 'coping_strategy'], ['therapy', 'treatment'],
        ['counseling', 'treatment'], ['support', 'resource']
      ])
    });

    // Spanish configuration
    this.languageConfigs.set('es', {
      code: 'es',
      name: 'Español',
      stopWords: ['el', 'la', 'de', 'que', 'y', 'a', 'en'],
      emotionLexicon: new Map([
        ['feliz', 'joy'], ['triste', 'sadness'], ['enojado', 'anger'],
        ['miedo', 'fear'], ['ansioso', 'anxiety'], ['esperanzado', 'hope'],
        ['deprimido', 'sadness'], ['preocupado', 'anxiety'], ['solo', 'sadness']
      ]),
      therapeuticKeywords: new Map([
        ['respiración', 'coping_strategy'], ['meditación', 'coping_strategy'],
        ['ejercicio', 'coping_strategy'], ['terapia', 'treatment'],
        ['consejería', 'treatment'], ['apoyo', 'resource']
      ])
    });

    // French configuration
    this.languageConfigs.set('fr', {
      code: 'fr',
      name: 'Français',
      stopWords: ['le', 'de', 'un', 'être', 'et', 'à', 'il'],
      emotionLexicon: new Map([
        ['heureux', 'joy'], ['triste', 'sadness'], ['en colère', 'anger'],
        ['peur', 'fear'], ['anxieux', 'anxiety'], ['espoir', 'hope'],
        ['déprimé', 'sadness'], ['inquiet', 'anxiety'], ['seul', 'sadness']
      ]),
      therapeuticKeywords: new Map([
        ['respiration', 'coping_strategy'], ['méditation', 'coping_strategy'],
        ['exercice', 'coping_strategy'], ['thérapie', 'treatment'],
        ['conseil', 'treatment'], ['soutien', 'resource']
      ])
    });

    // German configuration
    this.languageConfigs.set('de', {
      code: 'de',
      name: 'Deutsch',
      stopWords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu'],
      emotionLexicon: new Map([
        ['glücklich', 'joy'], ['traurig', 'sadness'], ['wütend', 'anger'],
        ['angst', 'fear'], ['ängstlich', 'anxiety'], ['hoffnungsvoll', 'hope'],
        ['depressiv', 'sadness'], ['besorgt', 'anxiety'], ['einsam', 'sadness']
      ]),
      therapeuticKeywords: new Map([
        ['atmung', 'coping_strategy'], ['meditation', 'coping_strategy'],
        ['übung', 'coping_strategy'], ['therapie', 'treatment'],
        ['beratung', 'treatment'], ['unterstützung', 'resource']
      ])
    });

    // Portuguese configuration
    this.languageConfigs.set('pt', {
      code: 'pt',
      name: 'Português',
      stopWords: ['o', 'a', 'de', 'que', 'e', 'do', 'da'],
      emotionLexicon: new Map([
        ['feliz', 'joy'], ['triste', 'sadness'], ['zangado', 'anger'],
        ['medo', 'fear'], ['ansioso', 'anxiety'], ['esperançoso', 'hope'],
        ['deprimido', 'sadness'], ['preocupado', 'anxiety'], ['sozinho', 'sadness']
      ]),
      therapeuticKeywords: new Map([
        ['respiração', 'coping_strategy'], ['meditação', 'coping_strategy'],
        ['exercício', 'coping_strategy'], ['terapia', 'treatment'],
        ['aconselhamento', 'treatment'], ['apoio', 'resource']
      ])
    });
  }

  private initializePatterns(): void {
    // Emotion detection patterns
    this.emotionPatterns = new Map([
      ['joy', [
        /\b(happy|joy|elated|excited|pleased|delighted)\b/i,
        /\b(great|wonderful|amazing|fantastic)\b/i
      ]],
      ['sadness', [
        /\b(sad|depressed|down|blue|unhappy|miserable)\b/i,
        /\b(cry|tears|sobbing|weeping)\b/i
      ]],
      ['anger', [
        /\b(angry|mad|furious|irritated|frustrated|annoyed)\b/i,
        /\b(hate|rage|pissed)\b/i
      ]],
      ['fear', [
        /\b(scared|afraid|frightened|terrified|fearful)\b/i,
        /\b(panic|dread|horror)\b/i
      ]],
      ['anxiety', [
        /\b(anxious|worried|nervous|tense|stressed|overwhelmed)\b/i,
        /\b(panic|restless|uneasy)\b/i
      ]]
    ]);

    // Intent classification patterns
    this.intentPatterns = new Map([
      ['seeking_help', [
        /\b(help|support|assist|guide|advice)\b/i,
        /\b(what (can|should) I do|how do I)\b/i
      ]],
      ['expressing_emotion', [
        /\b(I feel|I'm feeling|I am feeling)\b/i,
        /\b(makes me feel|feeling)\b/i
      ]],
      ['asking_question', [
        /^(what|why|how|when|where|who|is|are|can|could|would|should)\b/i,
        /\?$/
      ]],
      ['sharing_experience', [
        /\b(happened|experienced|went through|dealing with)\b/i,
        /\b(my story|my experience|what I've been through)\b/i
      ]],
      ['crisis_expression', [
        /\b(can't take it|end it all|no point|give up|kill myself)\b/i,
        /\b(emergency|urgent|crisis|desperate)\b/i
      ]]
    ]);
  }

  public async analyze(
    text: string,
    language: SupportedLanguage = 'en'
  ): Promise<ProcessedMessage> {
    this.currentLanguage = language;
    const config = this.languageConfigs.get(language)!;

    // Normalize text
    const normalized = this.normalizeText(text);

    // Detect language if needed
    const detectedLanguage = await this.detectLanguage(text);
    if (detectedLanguage !== language) {
      this.emit('language-mismatch', { expected: language, detected: detectedLanguage });
    }

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalized, config);

    // Analyze emotions
    const emotions = this.analyzeEmotions(normalized, config);

    // Classify intent
    const intent = this.classifyIntent(normalized);

    // Extract entities
    const entities = this.extractEntities(normalized);

    // Extract keywords
    const keywords = this.extractKeywords(normalized, config);

    // Identify topics
    const topics = this.identifyTopics(normalized, keywords);

    // Extract therapeutic elements
    const therapeuticElements = this.extractTherapeuticElements(normalized, config);

    const processed: ProcessedMessage = {
      original: text,
      normalized,
      language: detectedLanguage,
      sentiment,
      emotions,
      intent,
      entities,
      keywords,
      topics,
      therapeuticElements
    };

    // Emit analysis complete event
    this.emit('analysis-complete', processed);

    return processed;
  }

  private normalizeText(text: string): string {
    // Convert to lowercase
    let normalized = text.toLowerCase();
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    // Expand contractions
    normalized = this.expandContractions(normalized);
    
    // Remove special characters but keep punctuation for sentiment
    normalized = normalized.replace(/[^\w\s.!?'-]/g, '');
    
    return normalized;
  }

  private expandContractions(text: string): string {
    const contractions = {
      "can't": "cannot",
      "won't": "will not",
      "n't": " not",
      "'re": " are",
      "'ve": " have",
      "'ll": " will",
      "'d": " would",
      "'m": " am",
      "'s": " is"
    };

    let expanded = text;
    for (const [contraction, expansion] of Object.entries(contractions)) {
      expanded = expanded.replace(new RegExp(contraction, 'gi'), expansion);
    }
    
    return expanded;
  }

  private async detectLanguage(text: string): Promise<SupportedLanguage> {
    // Simple language detection based on common words
    const languageScores = new Map<SupportedLanguage, number>();

    for (const [lang, config] of this.languageConfigs) {
      let score = 0;
      const words = text.toLowerCase().split(/\s+/);
      
      for (const word of words) {
        if (config.stopWords.includes(word)) {
          score += 1;
        }
        if (config.emotionLexicon.has(word)) {
          score += 2;
        }
      }
      
      languageScores.set(lang, score);
    }

    // Return language with highest score
    let maxScore = 0;
    let detectedLang: SupportedLanguage = 'en';
    
    for (const [lang, score] of languageScores) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }

  private analyzeSentiment(
    text: string,
    config: LanguageConfig
  ): SentimentAnalysis {
    let score = 0;
    let magnitude = 0;
    const words = text.split(/\s+/);
    
    // Positive indicators
    const positiveWords = [
      'good', 'great', 'excellent', 'happy', 'wonderful',
      'love', 'hope', 'better', 'improved', 'grateful'
    ];
    
    // Negative indicators
    const negativeWords = [
      'bad', 'terrible', 'awful', 'sad', 'depressed',
      'hate', 'hopeless', 'worse', 'painful', 'difficult'
    ];
    
    // Intensifiers
    const intensifiers = ['very', 'extremely', 'really', 'so', 'quite'];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      let wordScore = 0;
      
      if (positiveWords.includes(word)) {
        wordScore = 0.3;
      } else if (negativeWords.includes(word)) {
        wordScore = -0.3;
      }
      
      // Check for intensifiers
      const previousWord = words[i - 1];
      if (i > 0 && previousWord && intensifiers.includes(previousWord)) {
        wordScore *= 1.5;
      }
      
      // Check for negation
      if (i > 0 && previousWord === 'not') {
        wordScore *= -1;
      }
      
      score += wordScore;
      magnitude += Math.abs(wordScore);
    }
    
    // Normalize score
    score = Math.max(-1, Math.min(1, score / words.length * 5));
    magnitude = Math.min(1, magnitude / words.length * 3);
    
    // Determine label
    let label: SentimentAnalysis['label'];
    if (score <= -0.6) label = 'very_negative';
    else if (score <= -0.2) label = 'negative';
    else if (score <= 0.2) label = 'neutral';
    else if (score <= 0.6) label = 'positive';
    else label = 'very_positive';
    
    return { score, magnitude, label };
  }

  private analyzeEmotions(
    text: string,
    config: LanguageConfig
  ): EmotionAnalysis {
    const detectedEmotions: Map<EmotionType, number> = new Map();
    
    // Check emotion patterns
    for (const [emotion, patterns] of this.emotionPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const current = detectedEmotions.get(emotion) || 0;
          detectedEmotions.set(emotion, current + 1);
        }
      }
    }
    
    // Check emotion lexicon
    const words = text.split(/\s+/);
    for (const word of words) {
      const emotion = config.emotionLexicon.get(word);
      if (emotion) {
        const current = detectedEmotions.get(emotion) || 0;
        detectedEmotions.set(emotion, current + 1);
      }
    }
    
    // Sort emotions by frequency
    const sortedEmotions = Array.from(detectedEmotions.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // Determine primary and secondary emotions
    const primary = sortedEmotions[0]?.[0] || 'neutral' as EmotionType;
    const secondary = sortedEmotions.slice(1, 3).map(e => e[0]);
    
    // Calculate intensity based on frequency
    const totalDetections = Array.from(detectedEmotions.values())
      .reduce((sum, count) => sum + count, 0);
    const intensity = Math.min(1, totalDetections / 10);
    
    // Calculate valence (positive/negative)
    const positiveEmotions = ['joy', 'trust', 'anticipation', 'love', 'hope', 'pride'];
    const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust', 'shame', 'guilt', 'anxiety'];
    
    let valence = 0;
    for (const [emotion, count] of detectedEmotions) {
      if (positiveEmotions.includes(emotion)) {
        valence += count;
      } else if (negativeEmotions.includes(emotion)) {
        valence -= count;
      }
    }
    valence = Math.max(-1, Math.min(1, valence / 5));
    
    // Calculate arousal (activation level)
    const highArousalEmotions = ['anger', 'fear', 'surprise', 'anticipation', 'anxiety', 'joy'];
    let arousal = 0;
    for (const [emotion, count] of detectedEmotions) {
      if (highArousalEmotions.includes(emotion)) {
        arousal += count;
      }
    }
    arousal = Math.min(1, arousal / 5);
    
    return {
      primary,
      secondary,
      intensity,
      valence,
      arousal
    };
  }

  private classifyIntent(text: string): IntentClassification {
    const detectedIntents: Map<IntentType, number> = new Map();
    
    // Check intent patterns
    for (const [intent, patterns] of this.intentPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const current = detectedIntents.get(intent) || 0;
          detectedIntents.set(intent, current + 1);
        }
      }
    }
    
    // Sort intents by frequency
    const sortedIntents = Array.from(detectedIntents.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // Determine primary intent
    const primary = sortedIntents[0]?.[0] || 'expressing_emotion';
    const secondary = sortedIntents.slice(1, 3).map(i => i[0]);
    
    // Calculate confidence
    const totalDetections = Array.from(detectedIntents.values())
      .reduce((sum, count) => sum + count, 0);
    const confidence = totalDetections > 0 
      ? (sortedIntents[0]?.[1] || 0) / totalDetections
      : 0.5;
    
    return {
      primary,
      confidence,
      secondary: secondary.length > 0 ? secondary : undefined
    };
  }

  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // Extract person names (simple pattern)
    const personPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
    let match;
    while ((match = personPattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          type: 'person',
          value: match[1],
          confidence: 0.7,
          context: text.substring(match.index - 20, match.index + 20)
        });
      }
    }
    
    // Extract symptoms
    const symptomKeywords = [
      'headache', 'pain', 'insomnia', 'fatigue', 'nausea',
      'anxiety', 'depression', 'panic', 'trembling'
    ];
    for (const symptom of symptomKeywords) {
      if (text.includes(symptom)) {
        entities.push({
          type: 'symptom',
          value: symptom,
          confidence: 0.8
        });
      }
    }
    
    // Extract time references
    const timePattern = /\b(\d{1,2}:\d{2}|morning|afternoon|evening|night|today|yesterday|tomorrow)\b/gi;
    while ((match = timePattern.exec(text)) !== null) {
      if (match[1]) {
        entities.push({
          type: 'time',
          value: match[1],
          confidence: 0.9
        });
      }
    }
    
    // Extract coping strategies
    const copingKeywords = [
      'breathing', 'meditation', 'exercise', 'walking',
      'journaling', 'music', 'reading', 'yoga'
    ];
    for (const coping of copingKeywords) {
      if (text.includes(coping)) {
        entities.push({
          type: 'coping_strategy',
          value: coping,
          confidence: 0.85
        });
      }
    }
    
    return entities;
  }

  private extractKeywords(text: string, config: LanguageConfig): string[] {
    const words = text.split(/\s+/);
    const keywords: string[] = [];
    
    for (const word of words) {
      // Skip stop words
      if (config.stopWords.includes(word)) continue;
      
      // Skip very short words
      if (word.length < 3) continue;
      
      // Skip common words
      const commonWords = ['just', 'like', 'really', 'very', 'been'];
      if (commonWords.includes(word)) continue;
      
      // Add to keywords if not already present
      if (!keywords.includes(word)) {
        keywords.push(word);
      }
    }
    
    // Sort by relevance (could be improved with TF-IDF)
    return keywords.slice(0, 10);
  }

  private identifyTopics(text: string, keywords: string[]): string[] {
    const topics: string[] = [];
    
    // Mental health topics
    const topicPatterns = {
      'relationships': /\b(relationship|partner|family|friend|spouse|marriage)\b/i,
      'work_stress': /\b(work|job|boss|colleague|career|stress)\b/i,
      'anxiety': /\b(anxiety|anxious|worried|nervous|panic)\b/i,
      'depression': /\b(depression|depressed|sad|hopeless|empty)\b/i,
      'trauma': /\b(trauma|ptsd|abuse|assault|accident)\b/i,
      'self_esteem': /\b(confidence|self-esteem|worthless|inadequate|failure)\b/i,
      'sleep': /\b(sleep|insomnia|tired|fatigue|exhausted)\b/i,
      'substance_use': /\b(alcohol|drug|addiction|substance|drinking)\b/i,
      'grief': /\b(grief|loss|death|mourning|bereaved)\b/i,
      'anger': /\b(anger|angry|rage|frustrated|irritated)\b/i
    };
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  private extractTherapeuticElements(
    text: string,
    config: LanguageConfig
  ): TherapeuticElements {
    const elements: TherapeuticElements = {
      copingMechanisms: [],
      triggers: [],
      strengths: [],
      riskFactors: [],
      protectiveFactors: [],
      therapeuticThemes: []
    };
    
    // Extract coping mechanisms
    const copingPatterns = [
      /\b(helps me|I cope by|I manage by|I deal with it by)\s+(\w+ing)\b/gi,
      /\b(breathing|meditation|exercise|talking|writing)\b/gi
    ];
    for (const pattern of copingPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        elements.copingMechanisms.push(match[0]);
      }
    }
    
    // Extract triggers
    const triggerPatterns = [
      /\b(triggers?|sets? off|causes?|starts?)\s+(?:my|the)\s+(\w+)\b/gi,
      /\bwhen\s+(\w+\s+\w+)\s+happens?\b/gi
    ];
    for (const pattern of triggerPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        elements.triggers.push(match[0]);
      }
    }
    
    // Extract strengths
    const strengthKeywords = [
      'strong', 'resilient', 'capable', 'survived', 'managed',
      'overcame', 'achieved', 'proud', 'successful'
    ];
    for (const keyword of strengthKeywords) {
      if (text.includes(keyword)) {
        elements.strengths.push(keyword);
      }
    }
    
    // Extract risk factors
    const riskKeywords = [
      'alone', 'isolated', 'hopeless', 'worthless', 'burden',
      'give up', 'no support', 'cant cope'
    ];
    for (const keyword of riskKeywords) {
      if (text.includes(keyword)) {
        elements.riskFactors.push(keyword);
      }
    }
    
    // Extract protective factors
    const protectiveKeywords = [
      'family', 'friends', 'support', 'faith', 'hope',
      'goals', 'purpose', 'love', 'care'
    ];
    for (const keyword of protectiveKeywords) {
      if (text.includes(keyword)) {
        elements.protectiveFactors.push(keyword);
      }
    }
    
    // Identify therapeutic themes
    const themes = [
      {
        theme: 'cognitive_distortions',
        keywords: ['always', 'never', 'everyone', 'no one', 'should', 'must'],
        interventions: ['cognitive restructuring', 'thought challenging']
      },
      {
        theme: 'emotional_regulation',
        keywords: ['overwhelmed', 'out of control', 'cant handle', 'too much'],
        interventions: ['emotion regulation skills', 'distress tolerance']
      },
      {
        theme: 'interpersonal_effectiveness',
        keywords: ['relationship', 'communication', 'conflict', 'boundaries'],
        interventions: ['interpersonal skills training', 'assertiveness']
      }
    ];
    
    for (const themeConfig of themes) {
      const relevance = themeConfig.keywords.filter(k => text.includes(k)).length;
      if (relevance > 0) {
        elements.therapeuticThemes.push({
          theme: themeConfig.theme,
          relevance: relevance / themeConfig.keywords.length,
          suggestedInterventions: themeConfig.interventions
        });
      }
    }
    
    return elements;
  }

  public async translate(
    text: string,
    fromLang: SupportedLanguage,
    toLang: SupportedLanguage
  ): Promise<string> {
    // Placeholder for translation functionality
    // In production, this would integrate with a translation API
    return text;
  }

  public getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.languageConfigs.keys());
  }

  public getLanguageConfig(language: SupportedLanguage): LanguageConfig | undefined {
    return this.languageConfigs.get(language);
  }
}

export default LanguageProcessor;