/**
 * Virtual Post Feed Component
 * Optimized for community posts, journal entries, and social content
 * Supports infinite scroll, engagement metrics, and content moderation
 */

'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Heart, MessageCircle, Share2, Flag, MoreHorizontal, Eye, Bookmark, ChevronUp, ChevronDown } from 'lucide-react';
import { useInfiniteScroll, useVirtualScroll, useVirtualKeyboardNavigation } from '@/hooks/useVirtualScroll';
import { cn } from '@/lib/utils';

export interface Post {
  id: string;
  title?: string;
  content: string;
  excerpt?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
    role?: 'user' | 'therapist' | 'moderator';
  };
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'journal' | 'milestone' | 'question' | 'poll';
  category?: string;
  tags?: string[];
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    bookmarks: number;
  };
  userEngagement?: {
    liked?: boolean;
    bookmarked?: boolean;
    shared?: boolean;
  };
  media?: Array<{
    type: 'image' | 'video' | 'audio';
    url: string;
    thumbnail?: string;
    alt?: string;
  }>;
  poll?: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
    }>;
    userVote?: string;
    totalVotes: number;
    endsAt?: Date;
  };
  isAnonymous?: boolean;
  isSensitive?: boolean;
  isReported?: boolean;
  isFeatured?: boolean;
  priority?: 'low' | 'normal' | 'high';
  supportLevel?: 'seeking' | 'offering' | 'celebrating';
}

interface VirtualPostFeedProps {
  posts: Post[];
  height: number;
  onLoadMore?: () => Promise<void>;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onReport?: (postId: string, reason: string) => void;
  onPollVote?: (postId: string, optionId: string) => void;
  onViewPost?: (postId: string) => void;
  hasMore?: boolean;
  loading?: boolean;
  currentUserId?: string;
  showEngagement?: boolean;
  showAuthor?: boolean;
  allowAnonymous?: boolean;
  enableModeration?: boolean;
  filterOptions?: {
    categories?: string[];
    types?: Post['type'][];
    supportLevels?: Post['supportLevel'][];
  };
  sortBy?: 'recent' | 'popular' | 'trending' | 'controversial';
  className?: string;
  postClassName?: string;
  dense?: boolean;
}

export function VirtualPostFeed({
  posts,
  height,
  onLoadMore,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onReport,
  onPollVote,
  onViewPost,
  hasMore = false,
  loading = false,
  currentUserId,
  showEngagement = true,
  showAuthor = true,
  allowAnonymous = true,
  enableModeration = true,
  filterOptions,
  sortBy = 'recent',
  className,
  postClassName,
  dense = false,
}: VirtualPostFeedProps) {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [filters, setFilters] = useState(filterOptions);

  // Infinite scroll
  const { targetRef, isLoading: isLoadingMore, loadMore } = useInfiniteScroll(
    onLoadMore || (() => {}),
    { enabled: !!onLoadMore }
  );

  // Keyboard navigation
  const { focusedIndex, handleKeyDown, setFocusedIndex } = useVirtualKeyboardNavigation(
    posts,
    useCallback((post: any, index: number) => {
      onViewPost?.(post.id);
    }, [onViewPost])
  );

  // Filter posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    if (filters) {
      if (filters.categories?.length) {
        filtered = filtered.filter(post => 
          post.category && filters.categories!.includes(post.category)
        );
      }

      if (filters.types?.length) {
        filtered = filtered.filter(post => 
          filters.types!.includes(post.type)
        );
      }

      if (filters.supportLevels?.length) {
        filtered = filtered.filter(post => 
          post.supportLevel && filters.supportLevels!.includes(post.supportLevel)
        );
      }
    }

    return filtered;
  }, [posts, filters]);

  // Estimate item height
  const estimateItemHeight = useCallback((index: number) => {
    const post = filteredPosts[index];
    if (!post) return 200;

    const baseHeight = dense ? 120 : 160;
    const contentHeight = Math.min(Math.ceil(post.content.length / 60) * 20, 100);
    const mediaHeight = post.media?.length ? 200 : 0;
    const pollHeight = post.poll ? 120 : 0;
    const engagementHeight = showEngagement ? 50 : 0;

    return baseHeight + contentHeight + mediaHeight + pollHeight + engagementHeight;
  }, [filteredPosts, dense, showEngagement]);

  // Virtual scrolling
  const {
    scrollElementRef,
    virtualMetrics,
    visibleItems: visiblePosts,
    handleScroll,
    scrollToItem
  } = useVirtualScroll(filteredPosts, height, {
    itemHeight: estimateItemHeight,
    overscan: 2
  });

  // Toggle post expansion
  const toggleExpanded = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  // Handle engagement actions
  const handleEngagement = useCallback((action: 'like' | 'comment' | 'share' | 'bookmark', postId: string) => {
    switch (action) {
      case 'like':
        onLike?.(postId);
        break;
      case 'comment':
        onComment?.(postId);
        break;
      case 'share':
        onShare?.(postId);
        break;
      case 'bookmark':
        onBookmark?.(postId);
        break;
    }
  }, [onLike, onComment, onShare, onBookmark]);

  // Format engagement numbers
  const formatEngagement = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  // Render post content
  const renderPostContent = useCallback((post: Post, isExpanded: boolean) => {
    const shouldTruncate = !isExpanded && post.content.length > 300;
    const content = shouldTruncate 
      ? post.content.slice(0, 300) + '...' 
      : post.content;

    return (
      <div className="space-y-3">
        {/* Title */}
        {post.title && (
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {post.title}
          </h3>
        )}

        {/* Content */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => toggleExpanded(post.id)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2"
            >
              Show more
            </button>
          )}
        </div>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className="space-y-2">
            {post.media.map((media, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden bg-gray-100">
                {media.type === 'image' ? (
                  <img 
                    src={media.url} 
                    alt={media.alt || 'Post image'} 
                    className="w-full h-auto max-h-96 object-cover"
                  />
                ) : media.type === 'video' ? (
                  <video 
                    src={media.url} 
                    poster={media.thumbnail}
                    controls 
                    className="w-full h-auto max-h-96"
                  />
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-gray-500">Audio content</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Poll */}
        {post.poll && (
          <div className="space-y-3 border-l-4 border-blue-300 pl-4">
            <h4 className="font-medium text-gray-900">{post.poll.question}</h4>
            <div className="space-y-2">
              {post.poll.options.map((option) => {
                const percentage = post.poll!.totalVotes > 0 
                  ? (option.votes / post.poll!.totalVotes) * 100 
                  : 0;
                const hasVoted = post.poll!.userVote === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => !post.poll?.userVote && onPollVote?.(post.id, option.id)}
                    disabled={!!post.poll?.userVote}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors relative overflow-hidden',
                      hasVoted 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50',
                      post.poll?.userVote && 'cursor-default'
                    )}
                  >
                    <div 
                      className="absolute inset-0 bg-blue-100 opacity-30 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex justify-between items-center">
                      <span className="font-medium">{option.text}</span>
                      {post.poll?.userVote && (
                        <span className="text-sm text-gray-600">
                          {formatEngagement(option.votes)} ({percentage.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-gray-500">
              {formatEngagement(post.poll.totalVotes)} votes
              {post.poll.endsAt && (
                <span> • Ends {post.poll.endsAt.toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map(tag => (
              <span 
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }, [toggleExpanded, onPollVote, formatEngagement]);

  // Render individual post
  const renderPost = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const post = visiblePosts[index];
    if (!post) return null;

    const isExpanded = expandedPosts.has(post.id);
    const isFocused = index === focusedIndex;
    const isOwnPost = post.author.id === currentUserId;

    return (
      <div
        style={style}
        className={cn(
          'px-4 py-4 transition-colors border-b border-gray-100',
          isFocused && 'bg-blue-50 ring-2 ring-blue-200',
          post.isFeatured && 'bg-gradient-to-r from-yellow-50 to-orange-50',
          post.priority === 'high' && 'border-l-4 border-l-orange-400',
          post.priority === 'low' && 'opacity-75',
          postClassName
        )}
        role="article"
        aria-label={`Post by ${post.isAnonymous ? 'Anonymous' : post.author.name}`}
        tabIndex={isFocused ? 0 : -1}
      >
        <div className="space-y-3">
          {/* Header */}
          {showAuthor && (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {post.isAnonymous ? (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">?</span>
                    </div>
                  ) : post.author.avatar ? (
                    <img 
                      src={post.author.avatar} 
                      alt={post.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {post.author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Author info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {post.isAnonymous ? 'Anonymous' : post.author.name}
                    </span>
                    {post.author.verified && (
                      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    )}
                    {post.author.role && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        post.author.role === 'therapist' && 'bg-green-100 text-green-700',
                        post.author.role === 'moderator' && 'bg-purple-100 text-purple-700'
                      )}>
                        {post.author.role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <time>{post.timestamp.toLocaleDateString()}</time>
                    {post.category && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">#{post.category}</span>
                      </>
                    )}
                    {post.supportLevel && (
                      <>
                        <span>•</span>
                        <span className={cn(
                          'capitalize font-medium',
                          post.supportLevel === 'seeking' && 'text-orange-600',
                          post.supportLevel === 'offering' && 'text-green-600',
                          post.supportLevel === 'celebrating' && 'text-purple-600'
                        )}>
                          {post.supportLevel}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Post actions */}
              <div className="flex items-center gap-2">
                {post.isSensitive && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                    Sensitive
                  </span>
                )}
                {enableModeration && (
                  <button
                    onClick={() => setReportingPost(post.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {renderPostContent(post, isExpanded)}

          {/* Engagement bar */}
          {showEngagement && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => handleEngagement('like', post.id)}
                  className={cn(
                    'flex items-center space-x-2 text-sm transition-colors',
                    post.userEngagement?.liked 
                      ? 'text-red-600' 
                      : 'text-gray-500 hover:text-red-600'
                  )}
                >
                  <Heart className={cn(
                    'w-4 h-4',
                    post.userEngagement?.liked && 'fill-current'
                  )} />
                  <span>{formatEngagement(post.engagement.likes)}</span>
                </button>

                <button
                  onClick={() => handleEngagement('comment', post.id)}
                  className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{formatEngagement(post.engagement.comments)}</span>
                </button>

                <button
                  onClick={() => handleEngagement('share', post.id)}
                  className="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{formatEngagement(post.engagement.shares)}</span>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatEngagement(post.engagement.views)}</span>
                </span>

                <button
                  onClick={() => handleEngagement('bookmark', post.id)}
                  className={cn(
                    'p-1 transition-colors',
                    post.userEngagement?.bookmarked 
                      ? 'text-yellow-600' 
                      : 'text-gray-400 hover:text-yellow-600'
                  )}
                >
                  <Bookmark className={cn(
                    'w-4 h-4',
                    post.userEngagement?.bookmarked && 'fill-current'
                  )} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    visiblePosts, 
    expandedPosts, 
    focusedIndex, 
    currentUserId, 
    showAuthor, 
    enableModeration,
    showEngagement,
    postClassName,
    renderPostContent,
    handleEngagement,
    formatEngagement
  ]);

  return (
    <div 
      className={cn('flex flex-col', className)}
      onKeyDown={handleKeyDown}
      role="feed"
      aria-label="Community posts"
    >
      {/* Virtual list */}
      <div 
        ref={scrollElementRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
        style={{ height }}
        role="list"
      >
        {visiblePosts.map((_, index) => renderPost({ 
          index, 
          style: { 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: estimateItemHeight(index) 
          } 
        }))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div 
          ref={targetRef}
          className="p-4 text-center border-t border-gray-100"
        >
          {isLoadingMore ? (
            <div className="text-gray-500">Loading more posts...</div>
          ) : (
            <button
              onClick={loadMore}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Load more posts
            </button>
          )}
        </div>
      )}

      {/* Report modal placeholder */}
      {reportingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Report Post</h3>
            <p className="text-gray-600 mb-4">Why are you reporting this post?</p>
            <div className="space-y-2">
              {['Inappropriate content', 'Harassment', 'Spam', 'Other'].map(reason => (
                <button
                  key={reason}
                  onClick={() => {
                    onReport?.(reportingPost, reason);
                    setReportingPost(null);
                  }}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReportingPost(null)}
              className="mt-4 w-full p-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VirtualPostFeed;