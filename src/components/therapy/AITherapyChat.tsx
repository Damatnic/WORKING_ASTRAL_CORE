'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MoreVertical,
  RefreshCw,
  Shield,
  Heart,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  Star,
  MessageSquare,
  Smile,
  Phone,
  Video,
  Settings,
  Download,
  Share2,
  Bookmark
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'exercise' | 'assessment' | 'crisis';
  metadata?: {
    mood?: number;
    tags?: string[];
    suggestions?: string[];
    exercises?: Array<{
      title: string;
      duration: string;
      type: string;
    }>;
  };
}

interface AITherapyChatProps {
  className?: string;
  sessionId?: string;
}

export default function AITherapyChat({ className = "", sessionId }: AITherapyChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI therapy companion. I'm here to provide a safe, judgment-free space where you can explore your thoughts and feelings. Everything we discuss is completely confidential and anonymous. How are you feeling today?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sessionMood, setSessionMood] = useState<number | null>(null);
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Quick response suggestions based on common therapy topics
  const quickSuggestions = [
    "I'm feeling anxious today",
    "I'm struggling with motivation", 
    "I had a difficult day at work",
    "I'm feeling overwhelmed",
    "I want to talk about my relationships",
    "I'm having trouble sleeping",
    "I feel sad but don't know why",
    "I need help with stress management"
  ];

  // Therapy techniques and exercises
  const exercises = [
    {
      title: "5-4-3-2-1 Grounding",
      description: "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste",
      duration: "3-5 minutes",
      type: "grounding"
    },
    {
      title: "Deep Breathing",
      description: "Breathe in for 4, hold for 4, out for 6. Repeat 5 times.",
      duration: "2-3 minutes", 
      type: "breathing"
    },
    {
      title: "Thought Recording",
      description: "Write down the situation, your thoughts, emotions, and evidence for/against the thought",
      duration: "10-15 minutes",
      type: "cognitive"
    },
    {
      title: "Progressive Muscle Relaxation",
      description: "Tense and release each muscle group from your toes to your head",
      duration: "15-20 minutes",
      type: "relaxation"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateAIResponse = async (userMessage: string): Promise<Message> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Simple keyword-based responses (in production, this would be a sophisticated AI model)
    let response = "";
    let type: Message['type'] = 'text';
    const metadata: Message['metadata'] = {};
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety')) {
      response = "I hear that you're feeling anxious. Anxiety is a very common experience, and it's completely understandable. Can you tell me more about what's been triggering these anxious feelings? Sometimes just talking about what's on your mind can help provide clarity and relief.";
      metadata.tags = ['anxiety', 'emotions'];
      metadata.suggestions = ['Try the 5-4-3-2-1 grounding technique', 'Practice deep breathing', 'Consider what specific thoughts are creating anxiety'];
    } else if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
      response = "Thank you for sharing how you're feeling. Sadness is a natural human emotion, and it's important that you're acknowledging it rather than pushing it away. Would you like to explore what might be contributing to these feelings? Sometimes there are specific events or thoughts that influence our mood.";
      metadata.tags = ['depression', 'sadness', 'emotions'];
      metadata.suggestions = ['Reflect on recent events or changes', 'Consider your self-talk patterns', 'Think about activities that usually bring you joy'];
    } else if (lowerMessage.includes('work') || lowerMessage.includes('job')) {
      response = "Work-related stress is incredibly common. Many people struggle to find balance between their professional responsibilities and personal well-being. What specifically about work is feeling challenging right now? Is it the workload, relationships with colleagues, or something else?";
      metadata.tags = ['work', 'stress'];
    } else if (lowerMessage.includes('sleep') || lowerMessage.includes('tired')) {
      response = "Sleep issues can significantly impact our mental health and daily functioning. When we don't get quality rest, everything feels more difficult to manage. Have you noticed any patterns in your sleep difficulties? What does your bedtime routine typically look like?";
      metadata.tags = ['sleep', 'wellness'];
      metadata.suggestions = ['Review your bedtime routine', 'Consider screen time before bed', 'Try progressive muscle relaxation'];
    } else if (lowerMessage.includes('relationship') || lowerMessage.includes('family') || lowerMessage.includes('friend')) {
      response = "Relationships are such an important part of our lives, and they can be sources of both joy and stress. It takes courage to examine our connections with others. What's been on your mind about your relationships? Are there specific dynamics or interactions that you'd like to explore?";
      metadata.tags = ['relationships', 'social'];
    } else if (lowerMessage.includes('overwhelmed') || lowerMessage.includes('stress')) {
      response = "Feeling overwhelmed is a signal that there's a lot on your plate right now. It's your mind and body's way of telling you that you need some support or perhaps a different approach to managing everything. Let's break this down - what are the main things that are feeling overwhelming right now?";
      metadata.tags = ['stress', 'overwhelm'];
      metadata.suggestions = ['List your current priorities', 'Identify what you can control vs. cannot control', 'Consider which tasks can be delegated or postponed'];
    } else if (lowerMessage.includes('motivation') || lowerMessage.includes('unmotivated')) {
      response = "Lack of motivation is something many people experience, especially during difficult periods. It's not a personal failing - sometimes our emotional state affects our drive to do things. What activities or goals are you finding it hard to feel motivated about? Understanding this can help us find ways to reconnect with your sense of purpose.";
      metadata.tags = ['motivation', 'goals'];
    } else {
      // General supportive response
      response = "I appreciate you sharing that with me. It sounds like there's a lot on your mind. Can you help me understand more about what you're experiencing? I'm here to listen and support you through whatever you're going through. Your feelings and experiences are valid, and we can work through this together.";
      metadata.tags = ['general', 'support'];
    }

    // Occasionally suggest exercises
    if (Math.random() < 0.3 && !metadata.exercises) {
      const relevantExercises = exercises.filter(ex => 
        (lowerMessage.includes('anxious') && ex.type === 'grounding') ||
        (lowerMessage.includes('stress') && ex.type === 'breathing') ||
        (lowerMessage.includes('sleep') && ex.type === 'relaxation')
      );
      
      if (relevantExercises.length > 0) {
        type = 'exercise';
        metadata.exercises = relevantExercises.slice(0, 2);
        response += `\n\nWould you like to try a brief exercise that might help? I can guide you through ${relevantExercises[0].title.toLowerCase()}.`;
      }
    }

    return {
      id: Date.now().toString(),
      content: response,
      sender: 'ai',
      timestamp: new Date(),
      type,
      metadata
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    try {
      const aiResponse = await simulateAIResponse(inputMessage);
      setMessages(prev => [...prev, aiResponse]);
      
      // Update session metadata
      if (aiResponse.metadata?.tags) {
        setSessionTags(prev => [...new Set([...prev, ...aiResponse.metadata!.tags!])]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const startRecording = () => {
    setIsRecording(true);
    // In production, implement actual voice recording
  };

  const stopRecording = () => {
    setIsRecording(false);
    // In production, process voice input
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEmergency = () => {
    const crisisMessage: Message = {
      id: Date.now().toString(),
      content: "I understand you're going through a really difficult time right now. Your safety and well-being are the top priority. If you're having thoughts of self-harm or suicide, please reach out for immediate help:\n\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741\n• Emergency Services: 911\n\nYou don't have to go through this alone. There are people who want to help you.",
      sender: 'ai',
      timestamp: new Date(),
      type: 'crisis'
    };
    
    setMessages(prev => [...prev, crisisMessage]);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 flex flex-col h-[600px] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-blue-600 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">AI Therapist</h3>
            <p className="text-sm text-green-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Online & Confidential
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled ? 'bg-blue-100 text-blue-600' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleEmergency}
            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            title="Crisis Support"
          >
            <Phone className="w-4 h-4" />
          </button>
          
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Session Info */}
      {sessionTags.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-700">Session topics:</span>
            <div className="flex flex-wrap gap-1">
              {sessionTags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {sessionTags.length > 3 && (
                <span className="text-xs text-blue-600">+{sessionTags.length - 3} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                <div
                  className={`p-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary-500 text-white ml-12'
                      : message.type === 'crisis'
                      ? 'bg-red-50 border-2 border-red-200 text-red-800 mr-12'
                      : 'bg-neutral-100 text-neutral-800 mr-12'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* AI Message Metadata */}
                  {message.sender === 'ai' && message.metadata && (
                    <div className="mt-3 space-y-2">
                      {/* Suggestions */}
                      {message.metadata.suggestions && (
                        <div>
                          <div className="text-sm font-medium mb-2 flex items-center">
                            <Lightbulb className="w-4 h-4 mr-1" />
                            Suggestions:
                          </div>
                          <div className="space-y-1">
                            {message.metadata.suggestions.map((suggestion, idx) => (
                              <div
                                key={idx}
                                className="text-sm p-2 bg-white bg-opacity-70 rounded-lg border border-neutral-200"
                              >
                                • {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Exercises */}
                      {message.metadata.exercises && (
                        <div>
                          <div className="text-sm font-medium mb-2 flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            Recommended Exercises:
                          </div>
                          <div className="space-y-2">
                            {message.metadata.exercises.map((exercise, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white bg-opacity-70 rounded-lg border border-neutral-200"
                              >
                                <div className="font-medium text-sm">{exercise.title}</div>
                                <div className="text-xs text-neutral-600 mt-1">{exercise.duration}</div>
                                <div className="text-sm mt-2">{(exercise as any).description}</div>
                                <button className="mt-2 px-3 py-1 bg-primary-500 text-white rounded-lg text-xs hover:bg-primary-600 transition-colors">
                                  Start Exercise
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={`flex items-center mt-1 space-x-2 text-xs text-neutral-500 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  {message.sender === 'ai' ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  <span>{formatTime(message.timestamp)}</span>
                  {message.type === 'crisis' && (
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-2 p-3 bg-neutral-100 rounded-2xl mr-12">
              <Bot className="w-4 h-4 text-neutral-600" />
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {showSuggestions && messages.length === 1 && (
        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="text-sm font-medium text-neutral-700 mb-2">Quick starts:</div>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.slice(0, 4).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share what's on your mind... I'm here to listen."
              rows={1}
              className="w-full p-3 pr-12 border border-neutral-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-100 text-red-600' 
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className={`p-3 rounded-xl transition-all ${
              inputMessage.trim() && !isTyping
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {isTyping ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
          <div className="flex items-center space-x-2">
            <Shield className="w-3 h-3" />
            <span>End-to-end encrypted • Anonymous • Confidential</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="hover:text-neutral-700 transition-colors">
              <Bookmark className="w-3 h-3" />
            </button>
            <button className="hover:text-neutral-700 transition-colors">
              <Download className="w-3 h-3" />
            </button>
            <button className="hover:text-neutral-700 transition-colors">
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}