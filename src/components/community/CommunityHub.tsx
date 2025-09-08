'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Heart,
  Share2,
  BookOpen,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Star,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Award,
  Coffee,
  Video,
  Mic,
  Lock,
  Globe,
  ChevronRight,
  Eye,
  ThumbsUp,
  MessageSquare,
  UserCheck,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'discussion' | 'activities' | 'therapy';
  memberCount: number;
  isPrivate: boolean;
  tags: string[];
  lastActivity: string;
  moderators: string[];
  isJoined: boolean;
  activityLevel: 'low' | 'medium' | 'high';
  supportLevel: 'peer' | 'professional' | 'mixed';
}

interface CommunityPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    badge?: string;
  };
  content: string;
  timestamp: Date;
  groupId: string;
  reactions: {
    hearts: number;
    helpful: number;
    support: number;
  };
  replies: number;
  isAnonymous: boolean;
  tags: string[];
  hasUserReacted: boolean;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  type: 'workshop' | 'support-group' | 'social' | 'therapy';
  date: Date;
  duration: number;
  capacity: number;
  attendees: number;
  isVirtual: boolean;
  facilitator: string;
  groupId?: string;
  cost: number;
  registrationRequired: boolean;
  isRegistered: boolean;
}

interface CommunityHubProps {
  className?: string;
}

export default function CommunityHub({ className = "" }: CommunityHubProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'posts' | 'events' | 'connections'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCommunityData();
  }, [filterCategory, searchQuery]);

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const [groupsResponse, postsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/community/groups?category=${filterCategory}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/community/posts?limit=10&category=${filterCategory}`),
        fetch('/api/community/events?upcoming=true&limit=5')
      ]);

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setCommunityGroups(groupsData.groups || []);
      }

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setCommunityPosts(postsData.posts || []);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setCommunityEvents(eventsData.events || []);
      }
    } catch (error) {
      console.error('Failed to load community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSupportLevelIcon = (level: string) => {
    switch (level) {
      case 'professional': return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'mixed': return <Award className="w-4 h-4 text-purple-600" />;
      case 'peer': return <Users className="w-4 h-4 text-green-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'support': return <Heart className="w-5 h-5 text-red-500" />;
      case 'discussion': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'activities': return <Calendar className="w-5 h-5 text-green-500" />;
      case 'therapy': return <Shield className="w-5 h-5 text-purple-500" />;
      default: return <Users className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredGroups = communityGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || group.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleJoinGroup = (groupId: string) => {
    // In production, this would make an API call
    console.log('Joining group:', groupId);
  };

  const handleReactToPost = (postId: string, reactionType: string) => {
    // In production, this would make an API call
    console.log('Reacting to post:', postId, reactionType);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-200">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-2 mr-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Community Hub</h2>
            <p className="text-sm text-neutral-600">Connect, share, and support each other</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <Shield className="w-4 h-4 mr-1" />
            Safe Space
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-neutral-200 bg-neutral-50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search groups, posts, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="support">Support Groups</option>
            <option value="discussion">Discussion</option>
            <option value="activities">Activities</option>
            <option value="therapy">Therapy Groups</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-200 bg-neutral-50">
        {[
          { id: 'groups', label: 'Groups', icon: Users, count: filteredGroups.length },
          { id: 'posts', label: 'Recent Posts', icon: MessageCircle, count: communityPosts.length },
          { id: 'events', label: 'Events', icon: Calendar, count: communityEvents.length },
          { id: 'connections', label: 'My Connections', icon: Heart, count: 12 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center px-4 py-3 font-medium transition-all ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
            <span className="ml-2 text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 max-h-96 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      {getCategoryIcon(group.category)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-neutral-800">{group.name}</h3>
                          {group.isPrivate && <Lock className="w-4 h-4 text-gray-500" />}
                          {getSupportLevelIcon(group.supportLevel)}
                        </div>
                        <p className="text-sm text-neutral-600 mb-2">{group.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {group.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityLevelColor(group.activityLevel)}`}>
                        {group.activityLevel} activity
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-neutral-600">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {group.memberCount} members
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {group.lastActivity}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {group.isJoined ? (
                        <span className="flex items-center text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Joined
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(group.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          Join Group
                        </button>
                      )}
                      <button className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {communityPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg">
                      {post.author.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-neutral-800">{post.author.name}</span>
                        {post.author.badge && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            {post.author.badge}
                          </span>
                        )}
                        {post.isAnonymous && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                            Anonymous
                          </span>
                        )}
                        <span className="text-sm text-neutral-500">{formatTimeAgo(post.timestamp)}</span>
                      </div>
                      
                      <p className="text-neutral-700 mb-3">{post.content}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleReactToPost(post.id, 'heart')}
                        className={`flex items-center space-x-1 text-sm transition-colors ${
                          post.hasUserReacted ? 'text-red-600' : 'text-neutral-600 hover:text-red-600'
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                        <span>{post.reactions.hearts}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-blue-600 transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.reactions.helpful}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-green-600 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.replies}</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="text-neutral-500 hover:text-neutral-700 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {communityEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-neutral-800">{event.title}</h3>
                        {event.isVirtual ? (
                          <Video className="w-4 h-4 text-blue-600" />
                        ) : (
                          <MapPin className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">{event.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {event.date.toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {event.duration} minutes
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {event.attendees}/{event.capacity}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600 mb-1">
                        {event.cost === 0 ? 'Free' : `$${event.cost}`}
                      </div>
                      <div className="text-xs text-neutral-500">
                        by {event.facilitator}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.type === 'workshop' ? 'bg-purple-100 text-purple-700' :
                        event.type === 'support-group' ? 'bg-blue-100 text-blue-700' :
                        event.type === 'social' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {event.type.replace('-', ' ')}
                      </span>
                      {event.registrationRequired && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                          Registration Required
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {event.isRegistered ? (
                        <span className="flex items-center text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Registered
                        </span>
                      ) : (
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                          {event.registrationRequired ? 'Register' : 'Join Event'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'connections' && (
            <motion.div
              key="connections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Users className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-800 mb-2">Your Connections</h3>
              <p className="text-neutral-600 mb-6">
                Connect with others who share similar experiences and goals
              </p>
              <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Find Connections
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}