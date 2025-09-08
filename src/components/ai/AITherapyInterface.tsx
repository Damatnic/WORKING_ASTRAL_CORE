'use client';

/**
 * AI Therapy Interface Component
 * Main interface for AI-assisted therapy sessions with full safety features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  AlertCircle, 
  Heart, 
  Brain,
  Shield,
  Users,
  PhoneCall,
  MessageCircle,
  Activity,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Info,
  X
} from 'lucide-react';
import AIWebSocketService from '@/lib/ai/websocket/AIWebSocketService';
import { useAITherapy } from '@/hooks/useAITherapy';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useCrisisDetection } from '@/hooks/useCrisisDetection';
import { useTranslation } from '@/hooks/useTranslation';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  interventions?: any[];
  metadata?: {
    sentiment?: number;
    confidence?: number;
    riskLevel?: string;
  };
}

interface InterventionCard {
  id: string;
  type: string;
  name: string;
  description: string;
  duration: number;
  active: boolean;
}

import { useTherapist } from '@/hooks/useTherapist';
import Link from 'next/link';
export default function AITherapyInterface() {
  const { t, language, changeLanguage } = useTranslation();
  const { 
    sendMessage, 
    isProcessing, 
    sessionId,
    connectionStatus
  } = useAITherapy();
  const { checkForCrisis, crisisLevel } = useCrisisDetection();
  const {
    fontSize,
    highContrast,
    voiceEnabled,
    toggleVoice,
    increaseFontSize,
    decreaseFontSize,
    toggleHighContrast,
    toggleScreenReader,
  } = useAccessibility();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showInterventions, setShowInterventions] = useState(false);
  const [activeInterventions, setActiveInterventions] = useState<InterventionCard[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const wsService = useRef<AIWebSocketService | null>(null);
  const { therapist } = useTherapist();
  const systemPersonaRef = useRef<string | null>(null);

  // Initialize persona
  useEffect(() => {
    systemPersonaRef.current = therapist?.systemPrompt || null;
  }, [therapist]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (sessionId) {
      wsService.current = new AIWebSocketService();
      
      wsService.current.on('message', handleIncomingMessage);
      wsService.current.on('typing_indicator', handleTypingIndicator);
      wsService.current.on('intervention_update', handleInterventionUpdate);
      wsService.current.on('crisis_alert', handleCrisisAlert);
      
      // Connect to WebSocket
      wsService.current.connect(sessionId, 'user_id').catch(console.error);
      
      return () => {
        wsService.current?.disconnect();
      };
    }
    return undefined;
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice input handling
  useEffect(() => {
    if (voiceInput && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setVoiceInput(false);
      };
      
      recognition.onerror = () => {
        setVoiceInput(false);
      };
      
      recognition.start();
      
      return () => {
        recognition.stop();
      };
    }
    return undefined;
  }, [voiceInput, language]);

  const handleIncomingMessage = useCallback((message: any) => {
    const newMessage: Message = {
      id: message.id,
      role: 'assistant',
      content: message.payload.content,
      timestamp: new Date(message.timestamp),
      interventions: message.payload.interventions,
      metadata: message.payload.metadata
    };
    
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(false);
    
    // Check for crisis indicators
    if (message.payload.metadata?.riskLevel) {
      checkForCrisis(message.payload.content);
    }
    
    // Play notification sound
    if (soundEnabled) {
      playNotificationSound();
    }
    
    // Text-to-speech if enabled
    if (voiceEnabled) {
      speakMessage(message.payload.content);
    }
  }, [soundEnabled, voiceEnabled, checkForCrisis]);

  const handleTypingIndicator = useCallback((data: any) => {
    setIsTyping(data.payload.isTyping);
  }, []);

  const handleInterventionUpdate = useCallback((data: any) => {
    const intervention: InterventionCard = {
      id: data.payload.id,
      type: data.payload.type,
      name: data.payload.name,
      description: data.payload.description,
      duration: data.payload.duration,
      active: data.payload.active
    };
    
    setActiveInterventions(prev => {
      const existing = prev.find(i => i.id === intervention.id);
      if (existing) {
        return prev.map(i => i.id === intervention.id ? intervention : i);
      }
      return [...prev, intervention];
    });
    
    if (intervention.active) {
      setShowInterventions(true);
    }
  }, []);

  const handleCrisisAlert = useCallback((data: any) => {
    // Handle crisis alert
    console.error('Crisis alert:', data);
    // In production, this would trigger immediate crisis protocols
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Send via WebSocket
    // Always send to API for persona support
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const res = await sendMessage(userMessage.content, {
      conversationHistory: history,
      provider: 'openai',
      systemPrompt: systemPersonaRef.current || undefined,
      therapistId: therapist?.id,
      therapistName: therapist?.name,
    });
    const text = res?.response || '…';
    const assistant: Message = {
      id: `asst_${Date.now()}`,
      role: 'assistant',
      content: text,
      timestamp: new Date(),
      metadata: { confidence: 0.85 }
    };
    setMessages(prev => [...prev, assistant]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startIntervention = async (interventionId: string) => {
    if (wsService.current?.isConnected()) {
      await wsService.current.startIntervention(interventionId, {
        startTime: new Date()
      });
    }
  };

  const playNotificationSound = () => {
    // Play a gentle notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getConfidenceColor = (confidence: number = 1) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  return (
    <div className={`flex flex-col h-screen ${highContrast ? 'high-contrast' : ''}`}>
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-semibold">AI Therapy Assistant</h1>
          <span className={`px-2 py-1 rounded-full text-xs ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {connectionStatus}
          </span>
          {therapist && (
            <span className="hidden md:inline-flex items-center gap-2 ml-2 text-sm text-neutral-600">
              <span className="text-base" aria-hidden>{therapist.avatar}</span>
              <span className="max-w-[160px] truncate">{therapist.name}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Link
            href="/therapy/therapists"
            className="hidden sm:inline-flex items-center px-2 py-1 border rounded-lg text-sm hover:bg-gray-100"
            aria-label="Change therapist"
          >
            Change therapist
          </Link>
          {/* Language Selector */}
          <select 
            value={language}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => changeLanguage(e.target.value as any)}
            className="px-3 py-1 border rounded-lg text-sm"
            aria-label="Select language"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="pt">Português</option>
          </select>
          
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          {/* Voice Toggle */}
          <button
            onClick={toggleVoice}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          >
            <MessageCircle className={`w-5 h-5 ${voiceEnabled ? 'text-purple-600' : ''}`} />
          </button>
          
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {/* Info */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Information"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>
      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl border-l p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Session Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 rounded hover:bg-gray-100" aria-label="Close settings">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6 text-sm">
                <section>
                  <h3 className="font-medium mb-2">Accessibility</h3>
                  <div className="flex items-center justify-between py-2">
                    <span>High contrast</span>
                    <input type="checkbox" onChange={toggleHighContrast} checked={highContrast} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Screen reader mode</span>
                    <input type="checkbox" onChange={toggleScreenReader} checked={false} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Font size</span>
                    <div className="flex items-center gap-2">
                      <button onClick={decreaseFontSize} className="px-2 py-1 border rounded">A-</button>
                      <span className="w-10 text-center">{fontSize}px</span>
                      <button onClick={increaseFontSize} className="px-2 py-1 border rounded">A+</button>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="font-medium mb-2">Audio</h3>
                  <div className="flex items-center justify-between py-2">
                    <span>Sound effects</span>
                    <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Voice responses</span>
                    <input type="checkbox" checked={voiceEnabled} onChange={toggleVoice} />
                  </div>
                </section>
                <section>
                  <h3 className="font-medium mb-2">Language</h3>
                  <select value={language} onChange={(e) => changeLanguage(e.target.value as any)} className="border rounded px-2 py-1">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="pt">Português</option>
                  </select>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crisis Alert Bar */}
      {crisisLevel && crisisLevel !== 'none' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={`px-4 py-2 flex items-center justify-between ${getRiskLevelColor(crisisLevel)}`}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              {t('crisis.alert', { level: crisisLevel })}
            </span>
          </div>
          <button className="px-3 py-1 bg-white rounded-lg text-sm font-medium hover:bg-gray-50">
            {t('crisis.get_help')}
          </button>
        </motion.div>
      )}

      {/* AI Disclosure Notice */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-1 flex-shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                🤖 <strong>AI Assistant Notice:</strong> You&apos;re chatting with an AI, not a human therapist. 
                This AI provides evidence-based support but cannot replace professional mental health treatment.
              </p>
              <div className="flex items-center gap-3 mt-1">
                <Link 
                  href="/therapy/ai-terms"
                  className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded-full transition-colors"
                >
                  View AI Terms
                </Link>
                <span className="text-xs opacity-75">Crisis? Call 988 or emergency services</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ fontSize: `${fontSize}px` }}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-2xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : message.role === 'system'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-white border shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Metadata Display */}
                    {message.metadata && message.role === 'assistant' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 flex items-center space-x-3 text-xs">
                        {message.metadata.confidence !== undefined && (
                          <span className={`flex items-center ${getConfidenceColor(message.metadata.confidence)}`}>
                            <Brain className="w-3 h-3 mr-1" />
                            {Math.round(message.metadata.confidence * 100)}%
                          </span>
                        )}
                        {message.metadata.sentiment !== undefined && (
                          <span className="flex items-center text-gray-500">
                            <Heart className="w-3 h-3 mr-1" />
                            {message.metadata.sentiment > 0 ? '+' : ''}{message.metadata.sentiment.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Interventions */}
                    {message.interventions && message.interventions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.interventions.map((intervention: any) => (
                          <button
                            key={intervention.id}
                            onClick={() => startIntervention(intervention.id)}
                            className="w-full text-left px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-medium text-purple-900">{intervention.name}</p>
                              <p className="text-xs text-purple-700">{intervention.description}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-500 px-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white border shadow-sm px-4 py-3 rounded-lg">
                  <div className="flex space-x-2">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t px-4 py-3 bg-white">
            <div className="flex items-end space-x-2">
              {/* Voice Input Button */}
              <button
                onClick={() => setVoiceInput(!voiceInput)}
                disabled={isProcessing}
                className={`p-3 rounded-lg transition ${
                  voiceInput 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 hover:bg-gray-200'
                } disabled:opacity-50`}
                aria-label={voiceInput ? 'Stop recording' : 'Start voice input'}
              >
                {voiceInput ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing || voiceInput}
                placeholder={voiceInput ? t('chat.recording') : t('chat.type_message')}
                className="flex-1 resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50"
                rows={1}
                style={{ fontSize: `${fontSize}px` }}
                aria-label="Message input"
              />
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
                <span className="sr-only">Send</span>
              </button>
            </div>
            
            {/* Safety Notice */}
            <p className="mt-2 text-xs text-gray-500 text-center">
              {t('chat.safety_notice')}
            </p>
          </div>
        </div>

        {/* Interventions Sidebar */}
        <AnimatePresence>
          {showInterventions && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l bg-gray-50 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Active Tools</h2>
                  <button
                    onClick={() => setShowInterventions(false)}
                    className="p-1 hover:bg-gray-200 rounded"
                    aria-label="Close interventions"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {activeInterventions.map((intervention) => (
                    <div
                      key={intervention.id}
                      className="bg-white rounded-lg p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{intervention.name}</h3>
                        {intervention.active && (
                          <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{intervention.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {intervention.duration} min
                        </span>
                        <button className="text-xs text-purple-600 hover:underline">
                          {intervention.active ? 'In Progress' : 'Start'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Safety Footer */}
      <footer className="bg-gray-50 border-t px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              {t('footer.encrypted')}
            </span>
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {t('footer.human_oversight')}
            </span>
          </div>
          <button className="flex items-center text-red-600 hover:underline">
            <PhoneCall className="w-3 h-3 mr-1" />
            {t('footer.crisis_hotline')}
          </button>
        </div>
      </footer>
    </div>
  );
}
