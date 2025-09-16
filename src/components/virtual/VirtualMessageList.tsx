/**
 * Virtual Message List Component
 * Optimized for chat messages and therapeutic conversations
 * Supports variable heights, auto-scroll, and message status indicators
 */

'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { MessageCircle, Check, CheckCheck, Clock, AlertCircle, Heart } from 'lucide-react';
import { useVirtualScroll, useScrollRestoration, useVirtualKeyboardNavigation } from '@/hooks/useVirtualScroll';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    role?: 'user' | 'therapist' | 'helper' | 'system';
  };
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system' | 'crisis-alert';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOwn?: boolean;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
    hasUserReacted: boolean;
  }>;
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
  isEncrypted?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface VirtualMessageListProps {
  messages: Message[];
  height: number;
  onLoadMore?: () => Promise<void>;
  onSendMessage?: (content: string, replyToId?: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  hasMore?: boolean;
  loading?: boolean;
  currentUserId?: string;
  enableReactions?: boolean;
  enableReplies?: boolean;
  enableEncryption?: boolean;
  showDeliveryStatus?: boolean;
  autoScroll?: boolean;
  className?: string;
  messageClassName?: string;
  crisis?: boolean;
}

export function VirtualMessageList({
  messages,
  height,
  onLoadMore,
  onSendMessage,
  onReaction,
  onDeleteMessage,
  hasMore = false,
  loading = false,
  currentUserId,
  enableReactions = true,
  enableReplies = true,
  enableEncryption = true,
  showDeliveryStatus = true,
  autoScroll = true,
  className,
  messageClassName,
  crisis = false,
}: VirtualMessageListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(autoScroll);
  const [newMessageInput, setNewMessageInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  
  // Scroll restoration
  const { handleScroll: handleScrollRestore } = useScrollRestoration({
    key: `messages-${messages[0]?.id || 'default'}`,
    enabled: !autoScroll
  });

  // Keyboard navigation
  const { focusedIndex, handleKeyDown } = useVirtualKeyboardNavigation(
    messages,
    useCallback((message: any) => {
      console.log('Selected message:', message.id);
    }, [])
  );

  // Estimate item height based on content
  const estimateItemHeight = useCallback((index: number) => {
    const message = messages[index];
    if (!message) return 80;
    
    const baseHeight = 60;
    const contentLines = Math.ceil(message.content.length / 50);
    const replyHeight = message.replyTo ? 40 : 0;
    const reactionsHeight = message.reactions?.length ? 30 : 0;
    
    return baseHeight + (contentLines * 20) + replyHeight + reactionsHeight;
  }, [messages]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (autoScroll && isAtBottom && listRef.current && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToItem(messages.length - 1, 'end');
      }, 100);
    }
  }, [messages.length, autoScroll, isAtBottom]);

  // Handle scroll events
  const handleScroll = useCallback((props: any) => {
    const { scrollOffset, scrollUpdateWasRequested } = props;
    
    if (!scrollUpdateWasRequested && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = scrollOffset + height >= container.scrollHeight - 100;
      setIsAtBottom(isNearBottom);
    }
    
    handleScrollRestore(props as any);
  }, [height, handleScrollRestore]);

  // Load more messages at top
  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loading && onLoadMore) {
      await onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Message status icon
  const getStatusIcon = useCallback((status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-500" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  }, []);

  // Render individual message
  const renderMessage = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    if (!message) return null;

    const isOwn = message.isOwn || message.sender.id === currentUserId;
    const isFocused = index === focusedIndex;
    const isCrisisMessage = message.type === 'crisis-alert' || message.priority === 'critical';
    
    return (
      <div 
        style={style} 
        className={cn(
          'px-4 py-2 transition-colors',
          isFocused && 'bg-blue-50 ring-2 ring-blue-200',
          messageClassName
        )}
        role="listitem"
        aria-label={`Message from ${message.sender.name} at ${message.timestamp.toLocaleString()}`}
        tabIndex={isFocused ? 0 : -1}
      >
        <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
          {/* Avatar */}
          {!isOwn && (
            <div className="flex-shrink-0">
              {message.sender.avatar ? (
                <Image 
                  src={message.sender.avatar} 
                  alt={`Profile picture of ${message.sender.name}`}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                  message.sender.role === 'therapist' && 'bg-green-100 text-green-700',
                  message.sender.role === 'helper' && 'bg-blue-100 text-blue-700',
                  message.sender.role === 'system' && 'bg-gray-100 text-gray-700',
                  !message.sender.role && 'bg-purple-100 text-purple-700'
                )}>
                  {message.sender.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          {/* Message content */}
          <div className={cn('flex-1 min-w-0', isOwn && 'flex flex-col items-end')}>
            {/* Reply context */}
            {message.replyTo && (
              <div className={cn(
                'mb-2 p-2 rounded-lg bg-gray-50 border-l-3 text-sm',
                isOwn ? 'border-l-blue-300' : 'border-l-gray-300'
              )}>
                <div className="font-medium text-gray-600 truncate">
                  {message.replyTo.sender}
                </div>
                <div className="text-gray-500 truncate">
                  {message.replyTo.content}
                </div>
              </div>
            )}

            {/* Sender name */}
            {!isOwn && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {message.sender.name}
                </span>
                {message.sender.role && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    message.sender.role === 'therapist' && 'bg-green-100 text-green-700',
                    message.sender.role === 'helper' && 'bg-blue-100 text-blue-700',
                    message.sender.role === 'system' && 'bg-gray-100 text-gray-700'
                  )}>
                    {message.sender.role}
                  </span>
                )}
              </div>
            )}

            {/* Message bubble */}
            <div className={cn(
              'relative max-w-[70%] rounded-2xl px-4 py-2 break-words',
              isOwn 
                ? 'bg-blue-500 text-white rounded-tr-md' 
                : 'bg-white border border-gray-200 rounded-tl-md shadow-sm',
              isCrisisMessage && 'border-red-300 bg-red-50 text-red-900',
              crisis && 'ring-2 ring-red-300'
            )}>
              {/* Crisis indicator */}
              {isCrisisMessage && (
                <div className="flex items-center gap-1 mb-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Crisis Alert</span>
                </div>
              )}

              {/* Message content */}
              <div className={cn(
                'text-sm leading-relaxed',
                message.type === 'system' && 'font-medium italic'
              )}>
                {message.content}
              </div>

              {/* Encryption indicator */}
              {message.isEncrypted && enableEncryption && (
                <div className={cn(
                  'inline-flex items-center gap-1 mt-1 text-xs opacity-70',
                  isOwn ? 'text-blue-100' : 'text-gray-500'
                )}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                  Encrypted
                </div>
              )}

              {/* Timestamp and status */}
              <div className={cn(
                'flex items-center gap-2 mt-1 text-xs',
                isOwn ? 'text-blue-100 justify-end' : 'text-gray-500'
              )}>
                <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isOwn && showDeliveryStatus && getStatusIcon(message.status)}
              </div>
            </div>

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((reaction, idx) => (
                  <button
                    key={idx}
                    onClick={() => onReaction?.(message.id, reaction.emoji)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
                      'border hover:bg-gray-50',
                      reaction.hasUserReacted 
                        ? 'bg-blue-100 border-blue-300 text-blue-700' 
                        : 'bg-white border-gray-200 text-gray-600'
                    )}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [
    messages, 
    currentUserId, 
    focusedIndex, 
    messageClassName, 
    getStatusIcon, 
    showDeliveryStatus, 
    onReaction, 
    enableEncryption, 
    crisis
  ]);

  // Handle sending new message
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageInput.trim() && onSendMessage) {
      onSendMessage(newMessageInput.trim(), replyTo?.id);
      setNewMessageInput('');
      setReplyTo(null);
    }
  }, [newMessageInput, onSendMessage, replyTo]);

  return (
    <div 
      ref={containerRef}
      className={cn('flex flex-col', className)}
      onKeyDown={handleKeyDown}
      role="log"
      aria-live="polite"
      aria-label="Message list"
    >
      {/* Load more indicator */}
      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more messages'}
          </button>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1">
        <List
          ref={listRef}
          height={height - (onSendMessage ? 80 : 0)}
          width="100%"
          itemCount={messages.length}
          itemSize={estimateItemHeight}
          onScroll={handleScroll}
          overscanCount={5}
          itemData={messages}
        >
          {renderMessage}
        </List>
      </div>

      {/* Message input */}
      {onSendMessage && (
        <div className="border-t bg-white p-4">
          {/* Reply context */}
          {replyTo && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg border-l-4 border-blue-300">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Replying to {replyTo.sender.name}:</span>
                  <span className="ml-2 text-gray-600 truncate">{replyTo.content}</span>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessageInput}
              onChange={(e) => setNewMessageInput(e.target.value)}
              placeholder={crisis ? "Type your crisis message..." : "Type a message..."}
              className={cn(
                'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                crisis && 'border-red-300 focus:ring-red-500'
              )}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!newMessageInput.trim()}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                crisis 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Jump to bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => {
            listRef.current?.scrollToItem(messages.length - 1, 'end');
            setIsAtBottom(true);
          }}
          className="absolute bottom-20 right-6 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
}

export default VirtualMessageList;