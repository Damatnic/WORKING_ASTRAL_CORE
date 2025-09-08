'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  AlertCircle, 
  Shield, 
  Flag,
  Smile,
  Paperclip,
  Phone,
  Info
} from 'lucide-react';
import { useSocket, useSocketEvent } from '@/lib/socket-client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import EmojiPicker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Message, AnonymousIdentity } from '@/types/community';

interface ChatRoomProps {
  roomId: string;
  currentUser: AnonymousIdentity;
}

export default function ChatRoom({ roomId, currentUser }: ChatRoomProps) {
  const { emit, connected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join room on mount
  useEffect(() => {
    if (connected) {
      emit('join-room', roomId);
    }

    return () => {
      if (connected) {
        emit('leave-room', roomId);
      }
    };
  }, [connected, roomId]);

  // Handle room joined event
  useSocketEvent('room-joined', (data: {
    roomId: string;
    messages: Message[];
    participantCount: number;
  }) => {
    if (data.roomId === roomId) {
      setMessages(data.messages);
      setParticipantCount(data.participantCount);
    }
  });

  // Handle new messages
  useSocketEvent('new-message', (message: Message) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
      
      // Play notification sound if not from current user
      if (message.authorId !== currentUser.id) {
        playNotificationSound();
      }
    }
  });

  // Handle user joined
  useSocketEvent('user-joined', (data: {
    user: string;
    participantCount: number;
  }) => {
    setParticipantCount(data.participantCount);
    toast(`${data.user} joined the room`, {
      icon: '👋',
      duration: 3000,
    });
  });

  // Handle user left
  useSocketEvent('user-left', (data: {
    user: string;
    participantCount: number;
  }) => {
    setParticipantCount(data.participantCount);
    toast(`${data.user} left the room`, {
      icon: '👋',
      duration: 3000,
    });
  });

  // Handle typing indicators
  useSocketEvent('user-typing', (data: { user: string }) => {
    setTypingUsers(prev => {
      if (!prev.includes(data.user)) {
        return [...prev, data.user];
      }
      return prev;
    });
  });

  useSocketEvent('user-stopped-typing', (data: { user: string }) => {
    setTypingUsers(prev => prev.filter(u => u !== data.user));
  });

  // Handle reactions
  useSocketEvent('reaction-added', (data: {
    messageId: string;
    reactions: any[];
  }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId 
        ? { ...msg, reactions: data.reactions }
        : msg
    ));
  });

  // Send message
  const sendMessage = useCallback(() => {
    if (!inputMessage.trim() || !connected) return;

    emit('send-message', {
      roomId,
      content: inputMessage.trim(),
      type: 'text',
    });

    setInputMessage('');
    setIsTyping(false);
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    emit('typing-stop', { roomId });
  }, [inputMessage, roomId, connected]);

  // Handle typing
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      emit('typing-start', { roomId });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emit('typing-stop', { roomId });
    }, 2000);
  };

  // Add reaction
  const addReaction = (messageId: string, emoji: string) => {
    emit('add-reaction', { messageId, emoji });
    setShowEmojiPicker(false);
    setSelectedMessage(null);
  };

  // Report message
  const reportMessage = (messageId: string) => {
    const reason = prompt('Please describe why you\'re reporting this message:');
    if (reason) {
      emit('report-message', { messageId, reason });
      toast.success('Thank you for your report. Our moderators will review it.');
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Safe Space Chat
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({participantCount} participants)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Room info"
            >
              <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Voice call"
            >
              <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Moderator"
            >
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Room rules reminder */}
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Remember: Be kind, supportive, and respectful. This is a safe space for everyone.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                message.authorId === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-md ${
                message.authorId === currentUser.id ? 'order-2' : ''
              }`}>
                <div className="flex items-start space-x-2">
                  {message.authorId !== currentUser.id && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm">
                        {message.author?.avatar || '👤'}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.authorId === currentUser.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    } ${message.type === 'crisis_alert' ? 'border-2 border-red-500' : ''}`}>
                      
                      {message.authorId !== currentUser.id && (
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {message.author?.displayName || 'Anonymous'}
                        </p>
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {message.reactions.map((reaction: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => addReaction(message.id, reaction.emoji)}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center space-x-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1 px-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </span>
                      
                      {/* Message actions */}
                      <div className="flex items-center space-x-1 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedMessage(message.id);
                            setShowEmojiPicker(true);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Smile className="w-3 h-3 text-gray-500" />
                        </button>
                        
                        {message.authorId !== currentUser.id && (
                          <button
                            onClick={() => reportMessage(message.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Flag className="w-3 h-3 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {message.authorId === currentUser.id && (
                    <div className="flex-shrink-0 order-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm">
                        {currentUser.avatar}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm"
          >
            <div className="flex space-x-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              value={inputMessage}
              onChange={handleTyping}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a supportive message..."
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={!connected}
            />
          </div>
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !connected}
            className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Connection status */}
        {!connected && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Connecting to chat server...
            </p>
          </div>
        )}
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <EmojiPicker
              data={data}
              onEmojiSelect={(emoji: any) => {
                if (selectedMessage) {
                  addReaction(selectedMessage, emoji.native);
                } else {
                  setInputMessage(prev => prev + emoji.native);
                }
              }}
              theme="auto"
              previewPosition="none"
            />
          </div>
        </div>
      )}
    </div>
  );
}