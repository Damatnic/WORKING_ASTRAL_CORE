'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Lock, 
  Globe, 
  Search, 
  Filter,
  MessageCircle,
  Shield,
  Heart,
  Calendar,
  ChevronRight,
  UserPlus,
  Info,
  Star,
  TrendingUp
} from 'lucide-react';
import { 
  SupportGroup, 
  GroupTopic, 
  AnonymousUser 
} from '@/types/community';
import { getWebSocketInstance } from '@/services/community/websocket';

interface SupportGroupsProps {
  currentUser?: AnonymousUser;
  onGroupJoin?: (groupId: string) => void;
  onGroupLeave?: (groupId: string) => void;
}

const SupportGroups: React.FC<SupportGroupsProps> = ({
  onGroupJoin,
  onGroupLeave
}: SupportGroupsProps) => {
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<GroupTopic | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Topic definitions with colors and descriptions
  const topicInfo: Record<GroupTopic, { color: string; description: string; icon: React.ReactNode }> = {
    'anxiety': { 
      color: 'bg-purple-500', 
      description: 'Managing worry and stress',
      icon: <TrendingUp className="w-4 h-4" />
    },
    'depression': { 
      color: 'bg-blue-500', 
      description: 'Coping with low mood',
      icon: <Heart className="w-4 h-4" />
    },
    'trauma': { 
      color: 'bg-red-500', 
      description: 'Healing from past experiences',
      icon: <Shield className="w-4 h-4" />
    },
    'grief': { 
      color: 'bg-gray-500', 
      description: 'Processing loss',
      icon: <Heart className="w-4 h-4" />
    },
    'addiction': { 
      color: 'bg-orange-500', 
      description: 'Recovery and sobriety',
      icon: <TrendingUp className="w-4 h-4" />
    },
    'relationships': { 
      color: 'bg-pink-500', 
      description: 'Connection and boundaries',
      icon: <Users className="w-4 h-4" />
    },
    'self-harm': { 
      color: 'bg-yellow-500', 
      description: 'Finding healthier coping',
      icon: <Shield className="w-4 h-4" />
    },
    'eating-disorders': { 
      color: 'bg-green-500', 
      description: 'Body and food relationship',
      icon: <Heart className="w-4 h-4" />
    },
    'bipolar': { 
      color: 'bg-indigo-500', 
      description: 'Managing mood episodes',
      icon: <TrendingUp className="w-4 h-4" />
    },
    'ocd': { 
      color: 'bg-teal-500', 
      description: 'Obsessions and compulsions',
      icon: <Shield className="w-4 h-4" />
    },
    'ptsd': { 
      color: 'bg-amber-500', 
      description: 'Post-traumatic recovery',
      icon: <Shield className="w-4 h-4" />
    },
    'general-support': { 
      color: 'bg-cyan-500', 
      description: 'General mental wellness',
      icon: <Heart className="w-4 h-4" />
    }
  };

  // Load groups on mount
  useEffect(() => {
    loadGroups();
    setupWebSocketListeners();

    return () => {
      cleanupWebSocketListeners();
    };
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // Fetch support groups from API
      const response = await fetch(`/api/community/groups?privacy=${privacyFilter}&topic=${topicFilter}`);
      if (!response.ok) {
        throw new Error('Failed to fetch support groups');
      }
      
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    const ws = getWebSocketInstance();
    if (!ws) return;

    ws.on('group:update', handleGroupUpdate);
    ws.on('group:member:join', handleMemberJoin);
    ws.on('group:member:leave', handleMemberLeave);
  };

  const cleanupWebSocketListeners = () => {
    const ws = getWebSocketInstance();
    if (!ws) return;

    ws.off('group:update', handleGroupUpdate);
    ws.off('group:member:join', handleMemberJoin);
    ws.off('group:member:leave', handleMemberLeave);
  };

  const handleGroupUpdate = (data: { groupId: string; updates: Partial<SupportGroup> }) => {
    setGroups(prev => prev.map(g => 
      g.id === data.groupId ? { ...g, ...data.updates } : g
    ));
  };

  const handleMemberJoin = (data: { groupId: string; memberId: string }) => {
    setGroups(prev => prev.map(g => 
      g.id === data.groupId 
        ? { ...g, currentMembers: g.currentMembers + 1 }
        : g
    ));
  };

  const handleMemberLeave = (data: { groupId: string; memberId: string }) => {
    setGroups(prev => prev.map(g => 
      g.id === data.groupId 
        ? { ...g, currentMembers: Math.max(0, g.currentMembers - 1) }
        : g
    ));
  };

  const handleJoinGroup = async (group: SupportGroup) => {
    if (joinedGroups.has(group.id)) return;

    try {
      const ws = getWebSocketInstance();
      if (ws) {
        await ws.joinGroup(group.id);
      }

      setJoinedGroups(prev => new Set([...prev, group.id]));
      onGroupJoin?.(group.id);

      // Show success message
      console.log(`Joined group: ${group.name}`);
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const ws = getWebSocketInstance();
      if (ws) {
        await ws.leaveGroup(groupId);
      }

      setJoinedGroups(prev => {
        const updated = new Set(prev);
        updated.delete(groupId);
        return updated;
      });
      onGroupLeave?.(groupId);

      console.log(`Left group: ${groupId}`);
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const filteredGroups = groups.filter(group => {
    if (selectedTopic !== 'all' && group.topic !== selectedTopic) return false;
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !group.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Support Groups
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Connect with others who understand. Join anonymous support groups for shared experiences and peer support.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Topic Filter */}
            <div className="flex gap-2 items-center">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={selectedTopic}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTopic(e.target.value as GroupTopic | 'all')}
                className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Topics</option>
                {Object.keys(topicInfo).map(topic => (
                  <option key={topic} value={topic}>
                    {topic.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Group Button */}
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                       font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Create Group
            </button>
          </div>
        </motion.div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden
                         hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                onClick={() => setSelectedGroup(group)}
              >
                {/* Group Header */}
                <div className={`h-2 ${topicInfo[group.topic].color}`} />
                
                <div className="p-6">
                  {/* Group Title and Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {group.privacy === 'private' && (
                        <Lock className="w-4 h-4 text-gray-500" />
                      )}
                      {group.supportLevel === 'professional' && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                      {group.supportLevel === 'guided' && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {group.description}
                  </p>

                  {/* Topic Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${topicInfo[group.topic].color}`}>
                      {group.topic.replace('-', ' ')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {group.language.toUpperCase()}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{group.currentMembers}/{group.maxMembers}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <MessageCircle className="w-4 h-4" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Join Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {joinedGroups.has(group.id) ? (
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Joined
                        </span>
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleLeaveGroup(group.id);
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Leave
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          handleJoinGroup(group);
                        }}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                                 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        Join Group
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No groups found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filters, or create a new group.
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {/* Group Detail Modal */}
        <AnimatePresence>
          {selectedGroup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedGroup(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              >
                <div className={`h-3 ${topicInfo[selectedGroup.topic].color}`} />
                
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {selectedGroup.name}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${topicInfo[selectedGroup.topic].color}`}>
                          {selectedGroup.topic.replace('-', ' ')}
                        </span>
                        {selectedGroup.privacy === 'private' && (
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Lock className="w-4 h-4" />
                            Private
                          </span>
                        )}
                        {selectedGroup.supportLevel === 'professional' && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Shield className="w-4 h-4" />
                            Professional Support
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                    {selectedGroup.description}
                  </p>

                  {/* Group Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Members</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedGroup.currentMembers}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Moderators</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedGroup.moderators.length}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Created</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {new Date(selectedGroup.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">Language</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedGroup.language.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Guidelines */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Community Guidelines
                    </h3>
                    <ul className="space-y-2">
                      {selectedGroup.guidelines.map((guideline, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span className="text-gray-600 dark:text-gray-300">{guideline}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tags */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Topics Discussed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroup.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {joinedGroups.has(selectedGroup.id) ? (
                      <>
                        <button
                          className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                                   font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-5 h-5" />
                          Open Chat
                        </button>
                        <button
                          onClick={() => handleLeaveGroup(selectedGroup.id)}
                          className="px-6 py-3 border border-red-600 text-red-600 hover:bg-red-50 
                                   dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors duration-200"
                        >
                          Leave Group
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleJoinGroup(selectedGroup)}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                                 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        Join Group
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
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

export default SupportGroups;