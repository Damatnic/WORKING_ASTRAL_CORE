'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  PhoneIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ClockIcon,
  UserIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BookmarkIcon,
  ShareIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  HandRaisedIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface SessionToolsProps {
  className?: string;
  clientId?: string;
  sessionType?: 'chat' | 'video' | 'phone';
  onEndSession?: () => void;
}

interface SessionMessage {
  id: string;
  content: string;
  sender: 'helper' | 'client' | 'system';
  timestamp: Date;
  type: 'message' | 'emotion' | 'resource' | 'note';
  metadata?: {
    moodRating?: number;
    resourceUrl?: string;
    isPrivate?: boolean;
  };
}

interface SessionState {
  status: 'waiting' | 'active' | 'paused' | 'ended';
  startTime?: Date;
  duration: number; // seconds
  clientMood: {
    before?: number; // 1-10
    current?: number;
    after?: number;
  };
  topics: string[];
  crisisLevel: 'none' | 'low' | 'medium' | 'high' | 'emergency';
  notes: string;
}

const moodEmojis = {
  1: { emoji: '😢', label: 'Very Sad', color: 'text-red-600' },
  2: { emoji: '😔', label: 'Sad', color: 'text-red-500' },
  3: { emoji: '😕', label: 'Down', color: 'text-orange-500' },
  4: { emoji: '😐', label: 'Low', color: 'text-orange-400' },
  5: { emoji: '😑', label: 'Neutral', color: 'text-gray-500' },
  6: { emoji: '🙂', label: 'Okay', color: 'text-yellow-500' },
  7: { emoji: '😊', label: 'Good', color: 'text-green-400' },
  8: { emoji: '😄', label: 'Happy', color: 'text-green-500' },
  9: { emoji: '😁', label: 'Great', color: 'text-green-600' },
  10: { emoji: '🤩', label: 'Amazing', color: 'text-green-700' }
};

const crisisResources = [
  {
    title: '988 Suicide & Crisis Lifeline',
    phone: '988',
    description: '24/7 free and confidential support',
    type: 'emergency'
  },
  {
    title: 'Crisis Text Line',
    phone: '741741',
    description: 'Text HOME for immediate support',
    type: 'emergency'
  },
  {
    title: 'Breathing Exercise',
    description: '4-7-8 breathing technique for anxiety',
    type: 'coping'
  },
  {
    title: 'Grounding Exercise',
    description: '5-4-3-2-1 sensory grounding technique',
    type: 'coping'
  }
];

const sessionTopics = [
  'Anxiety Management', 'Depression Support', 'Stress Relief', 'Relationship Issues',
  'Work/School Pressure', 'Family Problems', 'Self-Esteem', 'Grief/Loss',
  'Addiction Recovery', 'Trauma Processing', 'Sleep Issues', 'Eating Concerns',
  'Social Anxiety', 'Panic Attacks', 'Mood Swings', 'Life Transitions'
];

export default function SessionTools({ 
  className = "", 
  clientId = "ANON-A2F4",
  sessionType = "chat",
  onEndSession 
}: SessionToolsProps) {
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'waiting',
    duration: 0,
    clientMood: {},
    topics: [],
    crisisLevel: 'none',
    notes: ''
  });

  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (sessionState.status === 'active') {
      timerRef.current = setInterval(() => {
        setSessionState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionState.status]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = () => {
    setSessionState(prev => ({
      ...prev,
      status: 'active',
      startTime: new Date()
    }));
    
    addSystemMessage('Session started. How are you feeling today?');
    setShowMoodSelector(true);
  };

  const pauseSession = () => {
    setSessionState(prev => ({ ...prev, status: 'paused' }));
    addSystemMessage('Session paused');
  };

  const resumeSession = () => {
    setSessionState(prev => ({ ...prev, status: 'active' }));
    addSystemMessage('Session resumed');
  };

  const endSession = () => {
    setSessionState(prev => ({ ...prev, status: 'ended' }));
    addSystemMessage('Session ended. Thank you for sharing.');
    setShowMoodSelector(true); // Show post-session mood
    onEndSession?.();
  };

  const addSystemMessage = (content: string) => {
    const message: SessionMessage = {
      id: Date.now().toString(),
      content,
      sender: 'system',
      timestamp: new Date(),
      type: 'message'
    };
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || sessionState.status !== 'active') return;

    const message: SessionMessage = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      sender: 'helper',
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate client response after a delay
    setTimeout(() => {
      simulateClientResponse();
    }, 2000 + Math.random() * 3000);
  };

  const simulateClientResponse = () => {
    const responses = [
      "I appreciate you listening to me.",
      "That's really helpful, thank you.",
      "I'm feeling a bit better talking about this.",
      "Can you help me understand this better?",
      "I'm still struggling with this.",
      "That makes sense. I'll try that.",
      "I'm not sure how to handle this situation.",
      "Thank you for being patient with me."
    ];

    const message: SessionMessage = {
      id: Date.now().toString(),
      content: responses[Math.floor(Math.random() * responses.length)],
      sender: 'client',
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => [...prev, message]);
  };

  const recordMood = (rating: number, when: 'before' | 'current' | 'after') => {
    setSessionState(prev => ({
      ...prev,
      clientMood: {
        ...prev.clientMood,
        [when]: rating
      }
    }));

    const mood = moodEmojis[rating as keyof typeof moodEmojis];
    addSystemMessage(`Mood recorded: ${mood.emoji} ${mood.label} (${rating}/10)`);
    setShowMoodSelector(false);
  };

  const addTopic = (topic: string) => {
    if (!selectedTopics.includes(topic)) {
      setSelectedTopics(prev => [...prev, topic]);
      addSystemMessage(`Topic added: ${topic}`);
    }
  };

  const shareResource = (resource: typeof crisisResources[0]) => {
    const message: SessionMessage = {
      id: Date.now().toString(),
      content: `Resource shared: ${resource.title} - ${resource.description}`,
      sender: 'helper',
      timestamp: new Date(),
      type: 'resource',
      metadata: {
        resourceUrl: resource.phone ? `tel:${resource.phone}` : undefined
      }
    };

    setMessages(prev => [...prev, message]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCrisisLevelColor = (level: SessionState['crisisLevel']) => {
    switch (level) {
      case 'none': return 'text-green-600 bg-green-100';
      case 'low': return 'text-yellow-600 bg-yellow-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'emergency': return 'text-red-800 bg-red-200 animate-pulse';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Session Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{clientId}</h3>
                <p className="text-sm text-gray-500 capitalize">{sessionType} session</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-4 h-4" />
                <span>{formatTime(sessionState.duration)}</span>
              </div>
              
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCrisisLevelColor(sessionState.crisisLevel)}`}>
                {sessionState.crisisLevel === 'none' ? 'Safe' : `${sessionState.crisisLevel} risk`}
              </span>

              {Object.values(sessionState.clientMood).length > 0 && (
                <div className="flex items-center space-x-1">
                  <HeartIcon className="w-4 h-4" />
                  <span>Mood tracked</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {sessionState.status === 'waiting' && (
              <button
                onClick={startSession}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                <span>Start Session</span>
              </button>
            )}

            {sessionState.status === 'active' && (
              <>
                <button
                  onClick={pauseSession}
                  className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                >
                  <PauseIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={endSession}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <StopIcon className="w-5 h-5" />
                </button>
              </>
            )}

            {sessionState.status === 'paused' && (
              <button
                onClick={resumeSession}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                <span>Resume</span>
              </button>
            )}

            <button
              onClick={() => setShowResources(!showResources)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <ShieldCheckIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowNotes(!showNotes)}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <DocumentTextIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'helper' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'helper' 
                      ? 'bg-blue-600 text-white' 
                      : message.sender === 'client'
                      ? 'bg-gray-200 text-gray-900'
                      : 'bg-yellow-100 text-yellow-800 text-center text-sm'
                  }`}>
                    {message.type === 'resource' && (
                      <div className="text-xs opacity-75 mb-1">📎 Resource</div>
                    )}
                    <p className="break-words">{message.content}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {format(message.timestamp, 'h:mm a')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {sessionState.status === 'active' && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowMoodSelector(true)}
                  className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                  title="Check mood"
                >
                  <FaceSmileIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Resources & Tools */}
        {(showResources || showNotes) && (
          <div className="w-80 border-l border-gray-200 bg-gray-50">
            <div className="p-4">
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => {
                    setShowResources(true);
                    setShowNotes(false);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    showResources ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Resources
                </button>
                <button
                  onClick={() => {
                    setShowNotes(true);
                    setShowResources(false);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    showNotes ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Notes
                </button>
              </div>

              {showResources && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Crisis Resources</h4>
                    <div className="space-y-2">
                      {crisisResources.filter(r => r.type === 'emergency').map((resource, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-red-900 text-sm">{resource.title}</h5>
                              <p className="text-red-700 text-xs">{resource.description}</p>
                              {resource.phone && (
                                <p className="text-red-800 font-bold">{resource.phone}</p>
                              )}
                            </div>
                            <button
                              onClick={() => shareResource(resource)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <ShareIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Coping Strategies</h4>
                    <div className="space-y-2">
                      {crisisResources.filter(r => r.type === 'coping').map((resource, index) => (
                        <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-blue-900 text-sm">{resource.title}</h5>
                              <p className="text-blue-700 text-xs">{resource.description}</p>
                            </div>
                            <button
                              onClick={() => shareResource(resource)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            >
                              <ShareIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Session Topics</h4>
                    <div className="flex flex-wrap gap-1">
                      {sessionTopics.map(topic => (
                        <button
                          key={topic}
                          onClick={() => addTopic(topic)}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedTopics.includes(topic)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showNotes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Session Notes</h4>
                  <textarea
                    placeholder="Add private notes about this session..."
                    value={sessionState.notes}
                    onChange={(e) => setSessionState(prev => ({ ...prev, notes: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                  />
                  
                  {selectedTopics.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Discussed Topics</h5>
                      <div className="flex flex-wrap gap-1">
                        {selectedTopics.map(topic => (
                          <span key={topic} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(sessionState.clientMood).length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Mood Tracking</h5>
                      <div className="space-y-1 text-sm">
                        {sessionState.clientMood.before && (
                          <div>Pre-session: {moodEmojis[sessionState.clientMood.before as keyof typeof moodEmojis]?.emoji} {sessionState.clientMood.before}/10</div>
                        )}
                        {sessionState.clientMood.current && (
                          <div>Current: {moodEmojis[sessionState.clientMood.current as keyof typeof moodEmojis]?.emoji} {sessionState.clientMood.current}/10</div>
                        )}
                        {sessionState.clientMood.after && (
                          <div>Post-session: {moodEmojis[sessionState.clientMood.after as keyof typeof moodEmojis]?.emoji} {sessionState.clientMood.after}/10</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mood Selector Modal */}
      <AnimatePresence>
        {showMoodSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                How are you feeling right now?
              </h3>
              
              <div className="grid grid-cols-5 gap-3 mb-6">
                {Object.entries(moodEmojis).map(([rating, mood]) => (
                  <button
                    key={rating}
                    onClick={() => recordMood(parseInt(rating), sessionState.status === 'waiting' ? 'before' : sessionState.status === 'ended' ? 'after' : 'current')}
                    className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-2xl mb-1">{mood.emoji}</span>
                    <span className="text-xs text-gray-600">{rating}</span>
                  </button>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowMoodSelector(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}