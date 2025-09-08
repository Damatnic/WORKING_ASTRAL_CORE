/**
 * CommunityWellness - Peer support and community wellness features
 * Anonymous support groups, wellness challenges, and social connections
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Heart,
  MessageCircle,
  Trophy,
  Shield,
  Star,
  Clock,
  UserPlus,
  Lock,
  Sparkles,
  Award,
  HandHeart,
  Share,
  Send,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommunityWellnessProps {
  onJoinGroup?: (group: SupportGroup) => void;
  onStartChallenge?: (challenge: Challenge) => void;
}

interface SupportGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isPrivate: boolean;
  isJoined: boolean;
  meetingTime?: string;
  moderator: string;
  tags: string[];
  activity: 'high' | 'medium' | 'low';
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: string;
  participants: number;
  progress: number;
  reward: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  startDate: Date;
  endDate: Date;
  isJoined: boolean;
}

interface PeerConnection {
  id: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  sharedInterests: string[];
  supportScore: number;
  lastActive: Date;
  isConnected: boolean;
}

interface CommunityPost {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  isLiked: boolean;
  category: string;
  isAnonymous: boolean;
}

const CommunityWellness: React.FC<CommunityWellnessProps> = ({
  onJoinGroup,
  onStartChallenge
}: CommunityWellnessProps) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'challenges' | 'peers' | 'feed'>('groups');
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = () => {
    // Load support groups
    setSupportGroups([
      {
        id: '1',
        name: 'Anxiety Warriors',
        description: 'A safe space for those dealing with anxiety to share and support each other',
        category: 'Mental Health',
        memberCount: 234,
        isPrivate: false,
        isJoined: true,
        meetingTime: 'Daily at 7 PM',
        moderator: 'CertifiedTherapist',
        tags: ['anxiety', 'support', 'coping'],
        activity: 'high'
      },
      {
        id: '2',
        name: 'Mindful Mornings',
        description: 'Start your day with meditation and positive intentions',
        category: 'Mindfulness',
        memberCount: 156,
        isPrivate: false,
        isJoined: false,
        meetingTime: 'Weekdays at 6 AM',
        moderator: 'MindfulModerator',
        tags: ['meditation', 'morning', 'mindfulness'],
        activity: 'medium'
      },
      {
        id: '3',
        name: 'Depression Support Circle',
        description: 'Understanding and support for those experiencing depression',
        category: 'Mental Health',
        memberCount: 189,
        isPrivate: true,
        isJoined: false,
        meetingTime: 'Twice weekly',
        moderator: 'LicensedCounselor',
        tags: ['depression', 'support', 'recovery'],
        activity: 'high'
      }
    ]);

    // Load challenges
    setChallenges([
      {
        id: '1',
        title: '30 Days of Gratitude',
        description: 'Practice gratitude daily and transform your mindset',
        duration: '30 days',
        participants: 1234,
        progress: 45,
        reward: 'Gratitude Master Badge',
        difficulty: 'easy',
        category: 'Mindfulness',
        startDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        isJoined: true
      },
      {
        id: '2',
        title: 'Sleep Better Challenge',
        description: 'Improve your sleep quality with daily sleep hygiene practices',
        duration: '21 days',
        participants: 856,
        progress: 0,
        reward: 'Sleep Champion Badge',
        difficulty: 'medium',
        category: 'Wellness',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        isJoined: false
      },
      {
        id: '3',
        title: 'Meditation Marathon',
        description: 'Meditate for at least 10 minutes every day',
        duration: '7 days',
        participants: 2341,
        progress: 71,
        reward: 'Zen Master Badge',
        difficulty: 'easy',
        category: 'Mindfulness',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isJoined: true
      }
    ]);

    // Load peer connections
    setPeerConnections([
      {
        id: '1',
        username: 'HopefulHeart',
        status: 'online',
        sharedInterests: ['anxiety', 'meditation', 'journaling'],
        supportScore: 92,
        lastActive: new Date(),
        isConnected: true
      },
      {
        id: '2',
        username: 'MindfulSoul',
        status: 'away',
        sharedInterests: ['depression', 'art therapy', 'nature'],
        supportScore: 88,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isConnected: true
      },
      {
        id: '3',
        username: 'ResilienceRising',
        status: 'online',
        sharedInterests: ['CBT', 'exercise', 'reading'],
        supportScore: 95,
        lastActive: new Date(),
        isConnected: false
      }
    ]);

    // Load community posts
    setCommunityPosts([
      {
        id: '1',
        author: 'Anonymous',
        content: 'Today marks 100 days of managing my anxiety without panic attacks. Small wins matter! 💪',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 234,
        comments: 45,
        isLiked: true,
        category: 'Success Story',
        isAnonymous: true
      },
      {
        id: '2',
        author: 'HopefulHeart',
        content: 'Just finished my morning meditation. Feeling centered and ready for the day ahead.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        likes: 56,
        comments: 12,
        isLiked: false,
        category: 'Daily Check-in',
        isAnonymous: false
      }
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30';
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700';
    }
  };

  const renderSupportGroups = () => (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">3</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Active Groups</p>
        </div>
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <MessageCircle className="w-6 h-6 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">45</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Messages Today</p>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Heart className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">89</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Support Score</p>
        </div>
      </div>

      {/* Groups List */}
      <div>
        <h4 className="font-semibold mb-3">Your Support Groups</h4>
        <div className="space-y-3">
          {supportGroups.map(group => (
            <motion.div
              key={group.id}
              whileHover={{ scale: 1.01 }}
              className={`
                p-4 rounded-lg border transition-all cursor-pointer
                ${group.isJoined 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
              `}
              onClick={() => onJoinGroup?.(group)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-semibold">{group.name}</h5>
                    {group.isPrivate && <Lock className="w-4 h-4 text-gray-500" />}
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs
                      ${group.activity === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                        group.activity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700'}
                    `}>
                      {group.activity} activity
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {group.description}
                  </p>
                </div>
                {group.isJoined && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {group.memberCount} members
                  </span>
                  {group.meetingTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {group.meetingTime}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {group.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Discover More Groups */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium"
      >
        Discover More Groups
      </motion.button>
    </div>
  );

  const renderChallenges = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-3">Active Challenges</h4>
        <div className="space-y-3">
          {challenges.map(challenge => (
            <motion.div
              key={challenge.id}
              whileHover={{ scale: 1.01 }}
              className={`
                p-4 rounded-lg border transition-all
                ${challenge.isJoined
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h5 className="font-semibold">{challenge.title}</h5>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {challenge.description}
                  </p>
                </div>
                {challenge.isJoined && (
                  <span className="text-sm font-medium text-purple-600">
                    {challenge.progress}%
                  </span>
                )}
              </div>

              {challenge.isJoined && (
                <div className="mb-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${challenge.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {challenge.participants}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {challenge.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {challenge.reward}
                  </span>
                </div>
                {!challenge.isJoined && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onStartChallenge?.(challenge)}
                    className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm"
                  >
                    Join
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPeerConnections = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-3">Peer Support Network</h4>
        <div className="space-y-3">
          {peerConnections.map(peer => (
            <div
              key={peer.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {peer.username[0]}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(peer.status)} rounded-full border-2 border-white dark:border-gray-800`} />
                  </div>
                  <div>
                    <h5 className="font-semibold">{peer.username}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {peer.supportScore}% match
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {peer.status === 'online' ? 'Active now' :
                         peer.status === 'away' ? 'Away' : 
                         `Last seen ${peer.lastActive.toLocaleTimeString()}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {peer.isConnected ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm"
                    >
                      Connect
                    </motion.button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {peer.sharedInterests.map(interest => (
                  <span
                    key={interest}
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full text-xs"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 transition-colors"
      >
        <UserPlus className="w-5 h-5 mx-auto mb-1 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Find Support Buddies</p>
      </motion.button>
    </div>
  );

  const renderCommunityFeed = () => (
    <div className="space-y-4">
      {/* New Post Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowNewPostModal(true)}
        className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        Share Your Journey
      </motion.button>

      {/* Posts */}
      <div className="space-y-4">
        {communityPosts.map(post => (
          <div
            key={post.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {post.isAnonymous ? (
                  <Shield className="w-8 h-8 text-gray-400" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {post.author[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium">{post.author}</p>
                  <p className="text-xs text-gray-500">
                    {post.timestamp.toLocaleTimeString()} • {post.category}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm mb-3">{post.content}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}
                >
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{post.likes}</span>
                </motion.button>
                <button className="flex items-center gap-1 text-gray-500">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{post.comments}</span>
                </button>
              </div>
              <button className="text-gray-500">
                <Share className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" />
          Community Wellness
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect, share, and grow together
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'groups', label: 'Support Groups', icon: Users },
          { id: 'challenges', label: 'Challenges', icon: Trophy },
          { id: 'peers', label: 'Peer Support', icon: HandHeart },
          { id: 'feed', label: 'Community', icon: MessageCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-all
              ${activeTab === tab.id
                ? 'bg-purple-50 dark:bg-purple-900/30 border-b-2 border-purple-500 text-purple-600'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden md:inline text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'groups' && renderSupportGroups()}
            {activeTab === 'challenges' && renderChallenges()}
            {activeTab === 'peers' && renderPeerConnections()}
            {activeTab === 'feed' && renderCommunityFeed()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowNewPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <h4 className="font-semibold mb-4">Share with the Community</h4>
              
              <textarea
                value={newPost}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPost(e.target.value)}
                placeholder="What's on your mind? Your story might help someone today..."
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none h-32"
              />
              
              <div className="flex items-center justify-between mt-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Post anonymously</span>
                  <Shield className="w-4 h-4 text-gray-400" />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Share
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityWellness;