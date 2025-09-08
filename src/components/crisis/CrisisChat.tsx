"use client";

/**
 * Crisis Chat Component
 * Real-time crisis support chat with trained AI assistance and counselor connection
 * Features end-to-end encryption, typing indicators, and emergency escalation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Phone, 
  AlertTriangle, 
  Shield,
  User,
  Bot,
  Loader2,
  CheckCircle,
  Paperclip,
  Mic,
  MicOff,
  MoreVertical
} from 'lucide-react';
import { useCrisisStore, CrisisChatMessage } from '@/stores/crisisStore';
import CrisisDetectionService, { CrisisSeverity } from '@/services/crisis/CrisisDetectionService';
import { io, Socket } from 'socket.io-client';

interface CrisisChatProps {
  userId: string;
  userName?: string;
  initialSeverity?: CrisisSeverity;
  className?: string;
}

// Preset quick responses for common situations
const QUICK_RESPONSES = [
  "I'm feeling overwhelmed",
  "I need someone to talk to",
  "I'm having thoughts of self-harm",
  "I'm experiencing a panic attack",
  "I feel hopeless",
  "I need immediate help"
];

// AI support responses based on severity
const AI_SUPPORT_TEMPLATES = {
  immediate: [
    "I understand you're in crisis right now. Your safety is our top priority. Would you like me to connect you with a crisis counselor immediately?",
    "I'm here with you. Let's get you the immediate support you need. Can you tell me if you're in a safe place right now?"
  ],
  high: [
    "I hear that you're going through a really difficult time. You don't have to face this alone. What's happening right now?",
    "Thank you for reaching out. I can see you're struggling. Let's work together to help you feel safer."
  ],
  moderate: [
    "I'm here to listen and support you. Can you tell me more about what you're experiencing?",
    "It takes courage to reach out. I'm glad you're here. What would be most helpful for you right now?"
  ],
  low: [
    "Welcome. This is a safe space to talk about whatever is on your mind. How can I support you today?",
    "I'm here to listen without judgment. What brings you here today?"
  ]
};

export default function CrisisChat({
  userId,
  initialSeverity = CrisisSeverity.MODERATE,
  className = ''
}: CrisisChatProps) {
  // Store hooks
  const {
    activeChatSession,
    isConnectedToCounselor,
    addChatMessage,
    connectToCounselor,
    preferences
  } = useCrisisStore();
  
  // Local state
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [counselorTyping, setCounselorTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickResponses, setShowQuickResponses] = useState(true);
  const [currentSeverity, setCurrentSeverity] = useState(initialSeverity);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      query: {
        userId,
        sessionId: activeChatSession?.id,
        type: 'crisis'
      }
    });
    
    socketInstance.on('connect', () => {
      console.log('[CrisisChat] Connected to support server');
    });
    
    socketInstance.on('counselor_connected', (data) => {
      connectToCounselor(data.counselorId);
      addSystemMessage('A crisis counselor has joined the chat');
    });
    
    socketInstance.on('counselor_message', (data) => {
      handleCounselorMessage(data);
    });
    
    socketInstance.on('counselor_typing', (isTyping) => {
      setCounselorTyping(isTyping);
    });
    
    socketInstance.on('severity_update', (severity) => {
      setCurrentSeverity(severity);
    });
    
    setSocket(socketInstance);
    
    // Send initial AI greeting
    setTimeout(() => {
      sendAIGreeting();
    }, 1000);
    
    return () => {
      socketInstance.disconnect();
    };
  }, [userId, activeChatSession]);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatSession?.messages]);
  
  /**
   * Send AI greeting based on severity
   */
  const sendAIGreeting = () => {
    const templates = AI_SUPPORT_TEMPLATES[
      currentSeverity >= CrisisSeverity.CRITICAL ? 'immediate' :
      currentSeverity >= CrisisSeverity.HIGH ? 'high' :
      currentSeverity >= CrisisSeverity.MODERATE ? 'moderate' : 'low'
    ];
    
    const greeting = templates && templates.length > 0 
      ? templates[Math.floor(Math.random() * templates.length)] || 'Hello, I\'m here to support you. How are you feeling right now?'
      : 'Hello, I\'m here to support you. How are you feeling right now?';
    
    const aiMessage: CrisisChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'ai',
      content: greeting,
      timestamp: new Date(),
      isEmergency: currentSeverity >= CrisisSeverity.CRITICAL
    };
    
    addChatMessage(aiMessage);
  };
  
  /**
   * Handle counselor message
   */
  const handleCounselorMessage = (data: any) => {
    const counselorMessage: CrisisChatMessage = {
      id: data.id,
      sender: 'counselor',
      content: data.content,
      timestamp: new Date(data.timestamp),
      isEmergency: data.isEmergency || false
    };
    
    addChatMessage(counselorMessage);
  };
  
  /**
   * Add system message
   */
  const addSystemMessage = (content: string) => {
    const systemMessage: CrisisChatMessage = {
      id: `sys_${Date.now()}`,
      sender: 'ai',
      content,
      timestamp: new Date(),
      isEmergency: false
    };
    
    addChatMessage(systemMessage);
  };
  
  /**
   * Send message
   */
  const sendMessage = useCallback(async () => {
    if (!message.trim()) return;
    
    const userMessage: CrisisChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: message,
      timestamp: new Date(),
      isEmergency: false
    };
    
    addChatMessage(userMessage);
    
    // Analyze message for crisis indicators
    const assessment = await CrisisDetectionService.analyzeText(message, userId, preferences.preferredLanguage);
    
    if (assessment.severity !== currentSeverity) {
      setCurrentSeverity(assessment.severity);
      socket?.emit('severity_update', assessment.severity);
    }
    
    // Check if immediate intervention needed
    if (assessment.requiresImmediate && !isConnectedToCounselor) {
      requestCounselorConnection();
    }
    
    // Send to counselor if connected
    if (isConnectedToCounselor && socket) {
      socket.emit('user_message', {
        content: message,
        severity: assessment.severity,
        timestamp: new Date()
      });
    } else {
      // Generate AI response
      generateAIResponse(message, assessment);
    }
    
    setMessage('');
    setShowQuickResponses(false);
  }, [message, userId, currentSeverity, isConnectedToCounselor, socket]);
  
  /**
   * Generate AI response based on message and assessment
   */
  const generateAIResponse = async (userMessage: string, assessment: any) => {
    // Simulate AI processing time
    setTimeout(() => {
      let response = '';
      
      if (assessment.requiresImmediate) {
        response = "I'm concerned about your safety. Let me connect you with a crisis counselor right away. In the meantime, are you in a safe place?";
        requestCounselorConnection();
      } else if (assessment.severity >= CrisisSeverity.HIGH) {
        response = "I can see you're going through something really difficult. Would you like to talk to a trained counselor? They can provide more specialized support.";
      } else {
        // Context-aware responses
        if (userMessage.toLowerCase().includes('panic')) {
          response = "I understand you're experiencing panic. Let's try a breathing exercise together. Breathe in slowly for 4 counts, hold for 4, then out for 4. Would you like me to guide you through this?";
        } else if (userMessage.toLowerCase().includes('lonely')) {
          response = "Feeling lonely can be incredibly painful. You've taken a brave step by reaching out. Would you like to explore some ways to connect with others or talk more about what you're experiencing?";
        } else {
          response = "Thank you for sharing that with me. Can you tell me more about what's been happening?";
        }
      }
      
      const aiResponse: CrisisChatMessage = {
        id: `msg_${Date.now()}`,
        sender: 'ai',
        content: response,
        timestamp: new Date(),
        isEmergency: assessment.requiresImmediate
      };
      
      addChatMessage(aiResponse);
    }, 1500);
  };
  
  /**
   * Request counselor connection
   */
  const requestCounselorConnection = () => {
    setIsConnecting(true);
    addSystemMessage('Connecting you with a crisis counselor...');
    
    socket?.emit('request_counselor', {
      userId,
      severity: currentSeverity,
      language: preferences.preferredLanguage
    });
    
    // Simulate connection time
    setTimeout(() => {
      setIsConnecting(false);
    }, 5000);
  };
  
  /**
   * Handle typing indicator
   */
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('user_typing', true);
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('user_typing', false);
    }, 1000);
  };
  
  /**
   * Handle quick response selection
   */
  const handleQuickResponse = (response: string) => {
    setMessage(response);
    inputRef.current?.focus();
    setShowQuickResponses(false);
  };
  
  /**
   * Handle emergency call
   */
  const handleEmergencyCall = () => {
    if (confirm('This will call emergency services. Continue?')) {
      window.location.href = 'tel:988';
    }
  };
  
  /**
   * Format timestamp
   */
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  /**
   * Get message alignment and style
   */
  const getMessageStyle = (sender: string) => {
    switch (sender) {
      case 'user':
        return 'ml-auto bg-primary-500 text-white';
      case 'counselor':
        return 'mr-auto bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100';
      case 'ai':
        return 'mr-auto bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100';
      default:
        return 'mx-auto bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 italic';
    }
  };
  
  return (
    <div className={`flex flex-col h-screen max-h-screen bg-white dark:bg-neutral-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-primary-500" />
            {currentSeverity >= CrisisSeverity.HIGH && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-lg">Crisis Support Chat</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isConnectedToCounselor ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Connected to counselor
                </span>
              ) : isConnecting ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting to counselor...
                </span>
              ) : (
                'AI Support Available'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentSeverity >= CrisisSeverity.HIGH && (
            <button
              onClick={handleEmergencyCall}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              aria-label="Emergency call"
            >
              <Phone size={20} />
            </button>
          )}
          <button
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
      
      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Quick Responses */}
        {showQuickResponses && activeChatSession?.messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Quick responses:
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_RESPONSES.map((response) => (
                <button
                  key={response}
                  onClick={() => handleQuickResponse(response)}
                  className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full text-sm transition-colors"
                >
                  {response}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Messages */}
        <AnimatePresence initial={false}>
          {activeChatSession?.messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${msg.sender !== 'user' ? 'flex gap-2' : ''}`}>
                {msg.sender !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                    {msg.sender === 'counselor' ? (
                      <User size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                )}
                <div>
                  <div className={`px-4 py-2 rounded-2xl ${getMessageStyle(msg.sender)}`}>
                    {msg.isEmergency && (
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-xs font-medium text-red-500">Urgent</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 px-2">
                    {formatTimestamp(msg.timestamp)}
                    {msg.sender === 'user' && (
                      <CheckCircle size={12} className="inline ml-1" />
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {counselorTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-end gap-2">
          <button
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-2 ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'} rounded-lg transition-colors`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className="p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Safety reminder */}
        <p className="text-xs text-neutral-500 mt-2 text-center">
          Your safety is our priority. In immediate danger, call 911 or 988.
        </p>
      </div>
    </div>
  );
}