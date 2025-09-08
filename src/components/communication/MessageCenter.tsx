'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket, WSMessage } from '@/hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  HandThumbUpIcon,
  FaceFrownIcon,
  UserIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArchiveBoxIcon,
  FlagIcon,
  BellSlashIcon
} from '@heroicons/react/24/outline';
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  HeartIcon as HeartIconSolid,
  HandThumbUpIcon as HandThumbUpIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format, isToday, isYesterday } from 'date-fns';

interface User {
  id: string;
  name: string;
  avatar?: string;
  role: 'regular_user' | 'helper' | 'therapist' | 'crisis_counselor' | 'admin';
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
  isVerified: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video_call' | 'system' | 'safety_check';
  timestamp: Date;
  isRead: boolean;
  isEdited: boolean;
  editedAt?: Date;
  replyTo?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
  reactions?: Array<{
    userId: string;
    type: 'like' | 'love' | 'care' | 'concern';
    timestamp: Date;
  }>;
  isEncrypted: boolean;
  metadata?: {
    safetyFlags?: string[];
    moderationStatus?: 'approved' | 'flagged' | 'blocked';
    crisisLevel?: 'none' | 'low' | 'medium' | 'high';
  };
}

interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'support_session' | 'therapy_session' | 'crisis_intervention';
  title?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: Date;
  settings: {
    allowFiles: boolean;
    allowVoice: boolean;
    allowVideo: boolean;
    moderationLevel: 'none' | 'basic' | 'strict';
    safetyMode: boolean;
    endToEndEncrypted: boolean;
  };
  metadata?: {
    sessionType?: 'peer_support' | 'professional_therapy' | 'crisis_support';
    scheduledEnd?: Date;
    supervisorId?: string;
    emergencyContacts?: string[];
    crisisLevel?: 'none' | 'low' | 'medium' | 'high';
  };
}

const MessageCenter: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showUserInfo, setShowUserInfo] = useState<boolean>(false);
  const [currentUser] = useState<User>({
    id: 'current_user',
    name: 'You',
    role: 'regular_user',
    status: 'online',
    isVerified: true
  });
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    error: wsError,
    sendMessage: sendWSMessage,
    joinRoom,
    leaveRoom,
    sendTyping,
    messages: wsMessages,
    onlineUsers
  } = useWebSocket({
    onMessage: (message: WSMessage) => {
      switch (message.type) {
        case 'message':
          setMessages(prev => [...prev, {
            id: message.id,
            conversationId: message.roomId || '',
            senderId: message.from,
            content: message.content || '',
            type: 'text',
            timestamp: new Date(message.timestamp),
            isRead: message.from === currentUser.id,
            isEdited: false,
            isEncrypted: message.encrypted || false,
            metadata: {
              moderationStatus: 'approved',
              crisisLevel: message.priority === 'urgent' ? 'high' : 'none'
            }
          }]);
          break;
          
        case 'typing':
          if (message.data?.isTyping) {
            setTypingUsers(prev => new Set([...prev, message.from]));
          } else {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(message.from);
              return newSet;
            });
          }
          break;
          
        case 'crisis_alert':
          // Handle crisis alerts
          console.log('Crisis alert received:', message);
          break;
      }
    },
    onConnect: () => {
      console.log('WebSocket connected');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    }
  });

  // Load conversations and messages
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load conversations
        const conversationsResponse = await fetch('/api/messaging/conversations');
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          setConversations(conversationsData.conversations || []);
          
          if (conversationsData.conversations.length > 0) {
            setSelectedConversation(conversationsData.conversations[0]);
          }
        }

        // Load messages for first conversation if exists
        if (conversations.length > 0) {
          const messagesResponse = await fetch(`/api/messaging/messages?conversationId=${conversations[0].id}`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            setMessages(messagesData.messages || []);
          }
        }
      } catch (error) {
        console.error('Failed to load messaging data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Join/leave rooms when conversation changes
  useEffect(() => {
    if (selectedConversation && isConnected) {
      // Leave previous room if any
      if (conversations.length > 0) {
        conversations.forEach(conv => {
          if (conv.id !== selectedConversation.id) {
            leaveRoom(conv.id);
          }
        });
      }
      
      // Join current conversation room
      joinRoom(selectedConversation.id);
      
      // Load messages for this conversation
      const loadMessages = async () => {
        try {
          const response = await fetch(`/api/messaging/messages?conversationId=${selectedConversation.id}`);
          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages || []);
          }
        } catch (error) {
          console.error('Failed to load messages:', error);
        }
      };
      
      loadMessages();
    }
    
    return () => {
      if (selectedConversation && isConnected) {
        leaveRoom(selectedConversation.id);
      }
    };
  }, [selectedConversation, isConnected, joinRoom, leaveRoom]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    if (filter === 'pinned' && !conv.isPinned) return false;
    if (filter === 'archived' && !conv.isArchived) return false;
    if (filter === 'all' && conv.isArchived) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return conv.title?.toLowerCase().includes(query) ||
             conv.participants.some(p => p.name.toLowerCase().includes(query)) ||
             conv.lastMessage?.content.toLowerCase().includes(query);
    }
    
    return true;
  });

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !isConnected) return;

    try {
      // Send via WebSocket for real-time delivery
      sendWSMessage({
        type: 'message',
        roomId: selectedConversation.id,
        content: newMessage,
        encrypted: selectedConversation.settings.endToEndEncrypted,
        priority: selectedConversation.type === 'crisis_intervention' ? 'urgent' : 'medium'
      });

      // Also persist to database via API
      const response = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage,
          type: 'text',
          isEncrypted: selectedConversation.settings.endToEndEncrypted
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTyping(selectedConversation.id, false);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could show error toast here
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicators
    if (selectedConversation && isConnected) {
      // Send typing start
      sendTyping(selectedConversation.id, true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(selectedConversation.id, false);
      }, 3000);
    }
  };

  const addReaction = (messageId: string, reactionType: 'like' | 'love' | 'care' | 'concern') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions?.find(r => r.userId === currentUser.id);
        if (existingReaction) {
          // Remove existing reaction if same type, or update if different
          const newReactions = msg.reactions?.filter(r => r.userId !== currentUser.id) || [];
          if (existingReaction.type !== reactionType) {
            newReactions.push({
              userId: currentUser.id,
              type: reactionType,
              timestamp: new Date()
            });
          }
          return { ...msg, reactions: newReactions };
        } else {
          // Add new reaction
          return {
            ...msg,
            reactions: [
              ...(msg.reactions || []),
              {
                userId: currentUser.id,
                type: reactionType,
                timestamp: new Date()
              }
            ]
          };
        }
      }
      return msg;
    }));
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm');
    } else if (isYesterday(timestamp)) {
      return 'Yesterday';
    } else {
      return format(timestamp, 'MMM d');
    }
  };

  const getConversationIcon = (type: Conversation['type']) => {
    switch (type) {
      case 'therapy_session':
        return <ShieldCheckIcon className="w-5 h-5 text-blue-600" />;
      case 'crisis_intervention':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'group':
      case 'support_session':
        return <UserGroupIcon className="w-5 h-5 text-green-600" />;
      default:
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Conversations List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <ChatBubbleLeftRightIconSolid className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Offline'}
                </span>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'pinned', label: 'Pinned' },
              { id: 'archived', label: 'Archived' }
            ].map((filterOption) => (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  filter === filterOption.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative flex-shrink-0">
                    {conversation.participants.length === 1 ? (
                      <div className="relative">
                        <img
                          src={conversation.participants[0].avatar || '/api/placeholder/40/40'}
                          alt={conversation.participants[0].name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          getStatusColor(conversation.participants[0].status)
                        }`}></div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserGroupIcon className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.title || conversation.participants.map(p => p.name).join(', ')}
                        </h3>
                        {getConversationIcon(conversation.type)}
                        {conversation.isPinned && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        )}
                        {conversation.settings.endToEndEncrypted && (
                          <ShieldCheckIcon className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(conversation.lastMessage.timestamp)}
                          </span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}

                    {conversation.metadata?.crisisLevel === 'high' && (
                      <div className="flex items-center space-x-1 mt-1">
                        <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />
                        <span className="text-xs text-red-600 font-medium">Crisis Support Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {selectedConversation.participants.length === 1 ? (
                      <div className="relative">
                        <img
                          src={selectedConversation.participants[0].avatar || '/api/placeholder/40/40'}
                          alt={selectedConversation.participants[0].name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          getStatusColor(selectedConversation.participants[0].status)
                        }`}></div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.title || selectedConversation.participants.map(p => p.name).join(', ')}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.participants.length === 1 ? (
                        selectedConversation.participants[0].status === 'online' ? 'Active now' :
                        selectedConversation.participants[0].lastSeen ? 
                          `Last seen ${formatDistance(selectedConversation.participants[0].lastSeen, new Date(), { addSuffix: true })}` :
                          'Offline'
                      ) : (
                        `${selectedConversation.participants.length} participants`
                      )}
                    </p>
                  </div>
                  {selectedConversation.settings.endToEndEncrypted && (
                    <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full">
                      <ShieldCheckIcon className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-700 font-medium">Encrypted</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {selectedConversation.settings.allowVideo && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <VideoCameraIcon className="w-5 h-5" />
                    </button>
                  )}
                  {selectedConversation.settings.allowVoice && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowUserInfo(!showUserInfo)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <InformationCircleIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {selectedConversation.metadata?.crisisLevel === 'high' && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Crisis Support Session Active</p>
                      <p className="text-xs text-red-600">This conversation is being monitored for safety</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages
                .filter(msg => msg.conversationId === selectedConversation.id)
                .map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${
                      message.senderId === currentUser.id ? 'order-2' : 'order-1'
                    }`}>
                      {message.type === 'system' ? (
                        <div className="text-center text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-2 mx-8">
                          <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
                          {message.content}
                        </div>
                      ) : (
                        <div className={`rounded-lg px-4 py-2 ${
                          message.senderId === currentUser.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p>{message.content}</p>
                          
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex space-x-1 mt-2">
                              {message.reactions.map((reaction, index) => (
                                <span key={index} className="text-xs bg-white bg-opacity-20 rounded-full px-1">
                                  {reaction.type === 'like' && '👍'}
                                  {reaction.type === 'love' && '❤️'}
                                  {reaction.type === 'care' && '🤗'}
                                  {reaction.type === 'concern' && '😟'}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className={`text-xs mt-1 ${
                            message.senderId === currentUser.id ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {format(message.timestamp, 'HH:mm')}
                            {message.isEncrypted && (
                              <ShieldCheckIcon className="w-3 h-3 inline ml-1" />
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Reaction buttons */}
                      {message.type !== 'system' && (
                        <div className="flex space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => addReaction(message.id, 'like')}
                            className="text-xs p-1 rounded hover:bg-gray-100"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => addReaction(message.id, 'love')}
                            className="text-xs p-1 rounded hover:bg-gray-100"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => addReaction(message.id, 'care')}
                            className="text-xs p-1 rounded hover:bg-gray-100"
                          >
                            🤗
                          </button>
                          <button
                            onClick={() => addReaction(message.id, 'concern')}
                            className="text-xs p-1 rounded hover:bg-gray-100"
                          >
                            😟
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
              ))}
              
              {typingUsers.size > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2 max-w-xs">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={isConnected ? "Type a message..." : "Connecting..."}
                    disabled={!isConnected}
                    className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32 disabled:bg-gray-100 disabled:text-gray-500"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex space-x-1">
                    {selectedConversation.settings.allowFiles && (
                      <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                        <PaperClipIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <FaceSmileIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>

              {selectedConversation.settings.safetyMode && (
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <ShieldCheckIcon className="w-3 h-3 mr-1" />
                  Safety mode is active. Messages are monitored for your protection.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* User Info Sidebar */}
      <AnimatePresence>
        {showUserInfo && selectedConversation && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 bg-white border-l border-gray-200 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Conversation Info</h3>
                <button
                  onClick={() => setShowUserInfo(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Participants */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Participants</h4>
                <div className="space-y-3">
                  {selectedConversation.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={participant.avatar || '/api/placeholder/40/40'}
                          alt={participant.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          getStatusColor(participant.status)
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{participant.name}</span>
                          {participant.isVerified && (
                            <CheckIcon className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 capitalize">
                          {participant.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversation Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Settings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">End-to-end encrypted</span>
                    <span className={selectedConversation.settings.endToEndEncrypted ? 'text-green-600' : 'text-gray-400'}>
                      {selectedConversation.settings.endToEndEncrypted ? 'On' : 'Off'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Safety mode</span>
                    <span className={selectedConversation.settings.safetyMode ? 'text-green-600' : 'text-gray-400'}>
                      {selectedConversation.settings.safetyMode ? 'On' : 'Off'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Moderation level</span>
                    <span className="text-gray-900 capitalize">{selectedConversation.settings.moderationLevel}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center space-x-2 p-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg">
                    <BellSlashIcon className="w-4 h-4" />
                    <span>Mute conversation</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 p-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg">
                    <ArchiveBoxIcon className="w-4 h-4" />
                    <span>Archive conversation</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 p-2 text-left text-red-600 hover:bg-red-50 rounded-lg">
                    <FlagIcon className="w-4 h-4" />
                    <span>Report conversation</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageCenter;