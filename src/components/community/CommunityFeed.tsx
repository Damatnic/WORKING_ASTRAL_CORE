'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Flag,
  Trophy,
  Sparkles,
  Clock,
  PlusCircle,
  Send,
  X,
  AlertCircle,
  Users,
  Smile,
  ThumbsUp,
  Shield
} from 'lucide-react';
import {
  CommunityPost,
  Milestone,
  AnonymousUser
} from '@/types/community';
import { VirtualPostFeed, Post } from '@/components/virtual/VirtualPostFeed';
import { VirtualList } from '@/components/ui/VirtualList';

interface CommunityFeedProps {
  currentUser?: AnonymousUser;
  onPostCreate?: (post: CommunityPost) => void;
  onMilestoneShare?: (milestone: Milestone) => void;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({
  currentUser,
  onPostCreate
}: CommunityFeedProps) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'stories' | 'milestones' | 'questions'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'helpful'>('recent');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<CommunityPost['type']>('story');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(true);

  // Convert CommunityPost to Post format for virtual scrolling
  const virtualPosts: Post[] = useMemo(() => {
    return posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author: {
        id: post.author.id || 'anonymous',
        name: post.author.displayName || 'Anonymous User',
        avatar: post.author.avatar,
        verified: false,
        role: 'user'
      },
      timestamp: new Date(post.createdAt),
      type: post.type === 'story' ? 'text' : post.type === 'milestone' ? 'milestone' : 'question',
      category: post.category,
      tags: post.tags || [],
      engagement: {
        likes: post.likes,
        comments: post.comments?.length || 0,
        shares: 0,
        views: 0,
        bookmarks: 0
      },
      userEngagement: {
        liked: post.userInteraction?.liked,
        bookmarked: false,
        shared: false
      },
      isAnonymous: post.isAnonymous,
      supportLevel: post.supportLevel === 'seeking-support' ? 'seeking' : 
                    post.supportLevel === 'offering-support' ? 'offering' : 'celebrating'
    }));
  }, [posts]);

  // Handle infinite scroll loading
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add more posts (this would be an actual API call)
      const newPosts = generateMockPosts(10, posts.length);
      setPosts(prevPosts => [...prevPosts, ...newPosts]);
      setPage(prev => prev + 1);
      
      // Check if we have more data
      if (posts.length + 10 >= 100) { // Assume 100 total posts
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, posts.length]);

  // Handle post interactions for virtual feed
  const handleVirtualPostLike = useCallback((postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes: post.userInteraction?.liked ? post.likes - 1 : post.likes + 1,
              userInteraction: { 
                ...post.userInteraction, 
                liked: !post.userInteraction?.liked 
              }
            }
          : post
      )
    );
  }, []);

  const handleVirtualPostComment = useCallback((postId: string) => {
    setReplyingTo(postId);
    // Scroll to comment form or open comment modal
  }, []);

  // Generate mock posts for demonstration
  const generateMockPosts = useCallback((count: number, startIndex: number): CommunityPost[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `post-${startIndex + i + 1}`,
      title: `Community Post ${startIndex + i + 1}`,
      content: `This is the content of community post ${startIndex + i + 1}. It contains some meaningful discussion about mental health topics and community support.`,
      type: ['story', 'milestone', 'question'][Math.floor(Math.random() * 3)] as CommunityPost['type'],
      category: ['general', 'anxiety', 'depression', 'therapy'][Math.floor(Math.random() * 4)],
      author: {
        id: `user-${Math.floor(Math.random() * 100)}`,
        displayName: `User ${Math.floor(Math.random() * 100)}`,
        avatar: undefined
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      likes: Math.floor(Math.random() * 50),
      isAnonymous: Math.random() > 0.7,
      supportLevel: ['seeking-support', 'offering-support', 'celebrating'][Math.floor(Math.random() * 3)] as CommunityPost['supportLevel'],
      tags: [`tag${Math.floor(Math.random() * 10)}`, `tag${Math.floor(Math.random() * 10)}`],
      userInteraction: {
        liked: Math.random() > 0.8
      }
    }));
  }, []);

  // Initialize with some mock data
  useEffect(() => {
    if (posts.length === 0) {
      setPosts(generateMockPosts(20, 0));
    }
  }, [posts.length, generateMockPosts]);

  // Available tags for posts
  const availableTags = [
    'recovery', 'progress', 'daily-win', 'gratitude', 'coping-strategies',
    'self-care', 'therapy', 'medication', 'relationships', 'work-life',
    'anxiety', 'depression', 'breakthrough', 'setback', 'seeking-support'
  ];

  // Reaction types with icons
  const reactionTypes = [
    { type: 'heart', icon: Heart, color: 'text-red-500', label: 'Love' },
    { type: 'support', icon: Users, color: 'text-blue-500', label: 'Support' },
    { type: 'celebrate', icon: Trophy, color: 'text-yellow-500', label: 'Celebrate' },
    { type: 'understand', icon: Smile, color: 'text-purple-500', label: 'I Understand' }
  ];

  // Milestone achievements

  useEffect(() => {
    loadFeedData();
  }, [filterType, sortBy]);

  const loadFeedData = async () => {
    setLoading(true);
    try {
      // Mock data - in production, fetch from API
      // Fetch posts from API
      const postsResponse = await fetch(`/api/community/feed?type=${filterType}&sort=${sortBy}&limit=20`);
      if (!postsResponse.ok) {
        throw new Error('Failed to fetch community posts');
      }
      
      const postsData = await postsResponse.json();
      
      // Fetch milestones from API
      const milestonesResponse = await fetch('/api/community/milestones');
      if (!milestonesResponse.ok) {
        throw new Error('Failed to fetch milestones');
      }
      
      const milestonesData = await milestonesResponse.json();

      setPosts(postsData.posts || []);
      setMilestones(milestonesData.milestones || []);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/community/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: reactionType,
          action: 'toggle' // Will toggle reaction on/off
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }

      const data = await response.json();
      
      // Update local state with new reaction data
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, reactions: data.reactions };
        }
        return post;
      }));
    } catch (error) {
      console.error('Failed to update reaction:', error);
      // Could add toast notification here
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    const newPost: CommunityPost = {
      id: `post_${Date.now()}`,
      authorSessionId: currentUser?.sessionId || 'anonymous',
      authorNickname: currentUser?.nickname || 'Anonymous',
      content: newPostContent,
      type: newPostType,
      tags: selectedTags,
      reactions: [],
      replies: [],
      isAnonymous: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentiment: 'neutral',
      helpfulVotes: 0,
      reportCount: 0,
      moderationStatus: 'pending'
    };

    setPosts(prev => [newPost, ...prev]);
    onPostCreate?.(newPost);
    
    // Reset form
    setNewPostContent('');
    setNewPostType('story');
    setSelectedTags([]);
    setShowCreatePost(false);
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        post.replies.push({
          id: `reply_${Date.now()}`,
          authorSessionId: currentUser?.sessionId || 'anonymous',
          authorNickname: currentUser?.nickname || 'Anonymous',
          content: replyContent,
          createdAt: new Date(),
          helpfulVotes: 0,
          moderationStatus: 'pending'
        });
      }
      return post;
    }));

    setReplyContent('');
    setReplyingTo(null);
  };

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const updated = new Set(prev);
      if (updated.has(postId)) {
        updated.delete(postId);
      } else {
        updated.add(postId);
      }
      return updated;
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Community Stories
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Share your journey, celebrate milestones, and support each other
          </p>
        </motion.div>

        {/* Milestones Carousel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-8 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Recent Milestones
            </h2>
            <Sparkles className="w-6 h-6" />
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20">
            {milestones.map((milestone) => (
              <motion.div
                key={milestone.id}
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 bg-white/20 backdrop-blur rounded-xl p-4 min-w-[250px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{milestone.title}</h3>
                    <p className="text-sm opacity-90">
                      {formatTimeAgo(milestone.achievedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm opacity-90 mb-3">{milestone.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {milestone.celebrationCount} celebrations
                  </span>
                  <button className="text-sm hover:underline">Celebrate</button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Filters and Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {['all', 'stories', 'milestones', 'questions'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="helpful">Most Helpful</option>
              </select>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseVirtualScrolling(!useVirtualScrolling)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors duration-200 text-sm ${
                    useVirtualScrolling 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  title={useVirtualScrolling ? 'Virtual Scrolling Enabled' : 'Virtual Scrolling Disabled'}
                >
                  {useVirtualScrolling ? '⚡ Virtual' : '📜 Standard'}
                </button>
                
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                           font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Posts Feed */}
        {useVirtualScrolling ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Community Posts ({posts.length})
                </h3>
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  ⚡ Virtual Scrolling Active
                </div>
              </div>
            </div>
            <VirtualPostFeed
              posts={virtualPosts}
              height={800}
              onLoadMore={handleLoadMore}
              onLike={handleVirtualPostLike}
              onComment={handleVirtualPostComment}
              onShare={(postId) => console.log('Share post:', postId)}
              onBookmark={(postId) => console.log('Bookmark post:', postId)}
              hasMore={hasMore}
              loading={loading}
              currentUserId={currentUser?.sessionId}
              showEngagement={true}
              showAuthor={true}
              allowAnonymous={true}
              className=""
            />
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {posts.map((post, index) => {
              const isExpanded = expandedPosts.has(post.id);
              const truncated = post.content.length > 280 && !isExpanded;
              const displayContent = truncated 
                ? post.content.substring(0, 280) + '...' 
                : post.content;

                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
                  >
                  {/* Post Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                          {post.authorNickname.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {post.authorNickname}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(post.createdAt)}</span>
                            {post.type === 'milestone' && (
                              <>
                                <span>•</span>
                                <Trophy className="w-3 h-3 text-yellow-500" />
                                <span>Milestone</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Post Content */}
                    <div className="mb-4">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {displayContent}
                      </p>
                      {truncated && (
                        <button
                          onClick={() => togglePostExpansion(post.id)}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-2"
                        >
                          Read more
                        </button>
                      )}
                      {isExpanded && post.content.length > 280 && (
                        <button
                          onClick={() => togglePostExpansion(post.id)}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-2"
                        >
                          Show less
                        </button>
                      )}
                    </div>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sentiment Indicator */}
                    {post.sentiment === 'struggling' && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">This person may need extra support</span>
                        </div>
                      </div>
                    )}

                    {/* Reactions Bar */}
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center gap-2">
                        {reactionTypes.map((reaction) => {
                          const postReaction = post.reactions.find(r => r.type === reaction.type);
                          const hasReacted = postReaction && currentUser && 
                                           postReaction.sessionIds.includes(currentUser.sessionId);
                          
                          return (
                            <button
                              key={reaction.type}
                              onClick={() => handleReaction(post.id, reaction.type)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                                hasReacted
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              <reaction.icon className={`w-4 h-4 ${hasReacted ? reaction.color : ''}`} />
                              <span className="text-sm font-medium">
                                {postReaction?.count || 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">{post.helpfulVotes} helpful</span>
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                          className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{post.replies.length}</span>
                        </button>
                      </div>
                    </div>

                    {/* Replies Section */}
                    {post.replies.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {post.replies.slice(0, 2).map((reply) => (
                          <div key={reply.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {reply.authorNickname.charAt(0)}
                              </div>
                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                {reply.authorNickname}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {reply.content}
                            </p>
                            {reply.helpfulVotes > 0 && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <ThumbsUp className="w-3 h-3" />
                                <span>{reply.helpfulVotes} found this helpful</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {post.replies.length > 2 && (
                          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            View {post.replies.length - 2} more replies
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reply Input */}
                    <AnimatePresence>
                      {replyingTo === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyContent}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyContent(e.target.value)}
                              placeholder="Write a supportive reply..."
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                       focus:outline-none focus:ring-2 focus:ring-purple-500"
                              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  handleReply(post.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleReply(post.id)}
                              disabled={!replyContent.trim()}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300
                                       text-white rounded-lg font-medium transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Be the first to share your story or ask a question.
            </p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                       font-medium transition-colors duration-200"
            >
              Create First Post
            </button>
          </motion.div>
        )}

        {/* Create Post Modal */}
        <AnimatePresence>
          {showCreatePost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreatePost(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Share with the Community
                    </h2>
                    <button
                      onClick={() => setShowCreatePost(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Post Type Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      What would you like to share?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'story', label: 'Story', icon: MessageCircle },
                        { value: 'milestone', label: 'Milestone', icon: Trophy },
                        { value: 'question', label: 'Question', icon: AlertCircle },
                        { value: 'encouragement', label: 'Encouragement', icon: Heart }
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setNewPostType(type.value as any)}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            newPostType === type.value
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <type.icon className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your message
                    </label>
                    <textarea
                      value={newPostContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostContent(e.target.value)}
                      placeholder={
                        newPostType === 'question' 
                          ? "What would you like to ask the community?"
                          : newPostType === 'milestone'
                          ? "Share your achievement and what it means to you..."
                          : "Share your thoughts with the community..."
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 
                               bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[150px]"
                      rows={6}
                    />
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {newPostContent.length}/1000 characters
                    </div>
                  </div>

                  {/* Tags Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Add tags (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSelectedTags(prev => 
                              prev.includes(tag) 
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Privacy Note */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Your post will be completely anonymous
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          No personal information will be shared. You&apos;ll be identified only by your anonymous nickname.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCreatePost(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                               hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim()}
                      className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300
                               text-white rounded-lg font-medium transition-colors"
                    >
                      Share Post
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CommunityFeed;
