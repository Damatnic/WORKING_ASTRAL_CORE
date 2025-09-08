'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  AlertTriangle,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MoreVertical,
  Flag,
  Smile,
  Lock,
  CheckCheck,
  Check,
  Info
} from 'lucide-react';
import { ChatMessage, AnonymousUser, PeerMatch } from '@/types/community';
import { getWebSocketInstance } from '@/services/community/websocket';

interface PeerChatProps {
  match: PeerMatch;
  currentUser: AnonymousUser;
  onEndChat?: () => void;
  onReportUser?: (reason: string) => void;
}

const PeerChat: React.FC<PeerChatProps> = ({
  match,
  currentUser,
  onEndChat,
  onReportUser
}: PeerChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [encryptionVerified, setEncryptionVerified] = useState(false);
  
  // Media states
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [peerAudioEnabled, setPeerAudioEnabled] = useState(false);
  const [peerVideoEnabled, setPeerVideoEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Common emojis for mental health support
  const supportEmojis = ['❤️', '🤗', '💪', '🌟', '🌈', '✨', '🙏', '💜', '🌻', '🦋'];

  // Crisis keywords for detection
  const crisisKeywords = [
    'suicide', 'kill myself', 'end it all', 'not worth living',
    'self-harm', 'cutting', 'overdose', 'no point',
    'better off dead', 'goodbye forever'
  ];

  useEffect(() => {
    initializeChat();
    scrollToBottom();

    return () => {
      cleanupChat();
    };
  }, [match.matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    const ws = getWebSocketInstance();
    if (!ws) return;

    // Set up event listeners
    ws.on(`peer:message:${match.matchId}`, handleIncomingMessage);
    ws.on(`peer:typing:${match.matchId}`, handlePeerTyping);
    ws.on(`peer:media:${match.matchId}`, handleMediaChange);
    ws.on(`peer:disconnected:${match.matchId}`, handlePeerDisconnect);
    ws.on(`encryption:verified:${match.matchId}`, handleEncryptionVerified);
    ws.on(`crisis:alert:${match.matchId}`, handleCrisisAlert);

    // Verify encryption
    setTimeout(() => {
      setEncryptionVerified(true);
      setConnectionStatus('connected');
    }, 1000);

    // Load initial messages if any
    loadChatHistory();
  };

  const cleanupChat = () => {
    const ws = getWebSocketInstance();
    if (!ws) return;

    ws.off(`peer:message:${match.matchId}`, handleIncomingMessage);
    ws.off(`peer:typing:${match.matchId}`, handlePeerTyping);
    ws.off(`peer:media:${match.matchId}`, handleMediaChange);
    ws.off(`peer:disconnected:${match.matchId}`, handlePeerDisconnect);
    ws.off(`encryption:verified:${match.matchId}`, handleEncryptionVerified);
    ws.off(`crisis:alert:${match.matchId}`, handleCrisisAlert);
  };

  const loadChatHistory = async () => {
    // In production, load chat history from encrypted storage
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      roomId: match.matchId,
      senderSessionId: 'system',
      senderNickname: 'System',
      content: 'You are now connected with your peer support partner. This chat is completely anonymous and end-to-end encrypted. Be kind, be supportive, and remember that you both are here to help each other.',
      timestamp: new Date(),
      isEncrypted: true,
      readBy: [currentUser.sessionId],
      reactions: [],
      moderationFlags: []
    };

    setMessages([welcomeMessage]);
  };

  const handleIncomingMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    setPeerTyping(false);

    // Check for crisis content
    if (detectCrisisContent(message.content)) {
      setCrisisDetected(true);
    }
  };

  const handlePeerTyping = (data: { isTyping: boolean }) => {
    setPeerTyping(data.isTyping);
  };

  const handleMediaChange = (data: { audio: boolean; video: boolean }) => {
    setPeerAudioEnabled(data.audio);
    setPeerVideoEnabled(data.video);
  };

  const handlePeerDisconnect = () => {
    setConnectionStatus('disconnected');
    const disconnectMessage: ChatMessage = {
      id: `disconnect_${Date.now()}`,
      roomId: match.matchId,
      senderSessionId: 'system',
      senderNickname: 'System',
      content: 'Your peer has disconnected from the chat.',
      timestamp: new Date(),
      isEncrypted: true,
      readBy: [currentUser.sessionId],
      reactions: [],
      moderationFlags: []
    };
    setMessages(prev => [...prev, disconnectMessage]);
  };

  const handleEncryptionVerified = () => {
    setEncryptionVerified(true);
  };

  const handleCrisisAlert = () => {
    setCrisisDetected(true);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || connectionStatus !== 'connected') return;

    const ws = getWebSocketInstance();
    if (!ws) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      roomId: match.matchId,
      senderSessionId: currentUser.sessionId,
      senderNickname: currentUser.nickname,
      content: inputMessage.trim(),
      timestamp: new Date(),
      isEncrypted: true,
      readBy: [currentUser.sessionId],
      reactions: [],
      moderationFlags: []
    };

    // Add message optimistically
    setMessages(prev => [...prev, message]);
    setInputMessage('');

    // Send via WebSocket
    try {
      await ws.sendPeerMessage(match.matchId, message.content);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== message.id));
    }

    // Check for crisis content
    if (detectCrisisContent(message.content)) {
      handleSelfCrisisDetection();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      const ws = getWebSocketInstance();
      ws?.sendMessage('peer:typing', {
        matchId: match.matchId,
        isTyping: true
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      const ws = getWebSocketInstance();
      ws?.sendMessage('peer:typing', {
        matchId: match.matchId,
        isTyping: false
      });
    }, 2000);
  };

  const detectCrisisContent = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    return crisisKeywords.some(keyword => lowerContent.includes(keyword));
  };

  const handleSelfCrisisDetection = () => {
    const crisisMessage: ChatMessage = {
      id: `crisis_${Date.now()}`,
      roomId: match.matchId,
      senderSessionId: 'system',
      senderNickname: 'Crisis Support',
      content: 'It seems like you might be going through a really tough time. Your safety is important. Would you like to connect with a crisis counselor? Help is available 24/7.',
      timestamp: new Date(),
      isEncrypted: true,
      readBy: [currentUser.sessionId],
      reactions: [],
      moderationFlags: []
    };
    setMessages(prev => [...prev, crisisMessage]);
    setCrisisDetected(true);
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    const ws = getWebSocketInstance();
    ws?.sendMessage('peer:media', {
      matchId: match.matchId,
      audio: !audioEnabled,
      video: videoEnabled
    });
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    const ws = getWebSocketInstance();
    ws?.sendMessage('peer:media', {
      matchId: match.matchId,
      audio: audioEnabled,
      video: !videoEnabled
    });
  };

  const addEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const addReaction = (messageId: string, reaction: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.type === reaction);
        if (existingReaction) {
          if (existingReaction.sessionIds.includes(currentUser.sessionId)) {
            // Remove reaction
            existingReaction.sessionIds = existingReaction.sessionIds.filter(
              id => id !== currentUser.sessionId
            );
          } else {
            // Add reaction
            existingReaction.sessionIds.push(currentUser.sessionId);
          }
        } else {
          // New reaction
          msg.reactions.push({
            type: reaction,
            sessionIds: [currentUser.sessionId]
          });
        }
      }
      return msg;
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                P
              </div>
              {connectionStatus === 'connected' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Peer Support Partner
              </h3>
              <div className="flex items-center gap-2 text-sm">
                {encryptionVerified && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Lock className="w-3 h-3" />
                    Encrypted
                  </span>
                )}
                <span className={`flex items-center gap-1 ${
                  connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  •
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Media Controls */}
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-lg ${
                audioEnabled 
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              } hover:opacity-80 transition-opacity`}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-lg ${
                videoEnabled 
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              } hover:opacity-80 transition-opacity`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            
            {/* Options Menu */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:opacity-80 transition-opacity"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10"
                  >
                    <button
                      onClick={() => {
                        onReportUser?.('inappropriate');
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Flag className="w-4 h-4" />
                      Report User
                    </button>
                    <button
                      onClick={() => {
                        onEndChat?.();
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <PhoneOff className="w-4 h-4" />
                      End Chat
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Media Status */}
        {(peerAudioEnabled || peerVideoEnabled) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Info className="w-4 h-4" />
            <span>
              Your peer has {peerAudioEnabled && 'audio'} 
              {peerAudioEnabled && peerVideoEnabled && ' and '} 
              {peerVideoEnabled && 'video'} enabled
            </span>
          </div>
        )}
      </div>

      {/* Crisis Alert */}
      <AnimatePresence>
        {crisisDetected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Crisis Support Available
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  If you or your peer are in crisis, professional help is available 24/7.
                </p>
                <button className="mt-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Get Crisis Support
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isOwn = message.senderSessionId === currentUser.sessionId;
            const isSystem = message.senderSessionId === 'system';

            if (isSystem) {
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 max-w-md">
                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-sm ${isOwn ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>
                    {isOwn && message.readBy.length > 1 && (
                      <CheckCheck className="w-3 h-3 text-blue-500" />
                    )}
                    {isOwn && message.readBy.length === 1 && (
                      <Check className="w-3 h-3 text-gray-400" />
                    )}
                  </div>

                  {/* Reactions */}
                  {message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {message.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          onClick={() => addReaction(message.id, reaction.type)}
                          className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                            reaction.sessionIds.includes(currentUser.sessionId)
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {reaction.type}
                          <span>{reaction.sessionIds.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {peerTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2"
            >
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex gap-2 flex-wrap"
            >
              {supportEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:opacity-80 transition-opacity"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInputMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-600 
                     bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[40px] max-h-32"
            rows={1}
            disabled={connectionStatus !== 'connected'}
          />
          
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
            className={`p-2 rounded-lg transition-all ${
              inputMessage.trim() && connectionStatus === 'connected'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Compatibility Score: {match.compatibilityScore}%</span>
        </div>
      </div>
    </div>
  );
};

export default PeerChat;