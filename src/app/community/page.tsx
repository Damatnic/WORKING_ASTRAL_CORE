'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageCircle, 
  Heart, 
  Trophy,
  Shield,
  Activity,
  Globe,
  ChevronRight,
  Bell,
  Settings,
  HelpCircle,
  Star
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import ChatRoom from '@/components/community/ChatRoom';
import SupportGroups from '@/components/community/SupportGroups';
import MentorshipMatching from '@/components/community/MentorshipMatching';
import { useSocket } from '@/lib/socket-client';
import CommunitySettings from '@/components/community/CommunitySettings';
import { AnonymousIdentity } from '@/types/community';
import { useNotifications } from '@/hooks/useNotifications';

interface CommunityStats {
  totalUsers: number;
  activeRooms: number;
  activeGroups: number;
  activeMentorships: number;
  messagestoday: number;
  crisisInterventions: number;
  averageTrustScore: number;
  topTopics: { topic: string; count: number }[];
}

export default function CommunityPage() {
  const session = useSession();
  const status = session?.status || 'loading';
  const { connect, connected } = useSocket();
  const [activeView, setActiveView] = useState<'overview' | 'chat' | 'groups' | 'mentorship' | 'challenges'>('overview');
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [userIdentity, setUserIdentity] = useState<AnonymousIdentity | null>(null);
  const [activeRooms, setActiveRooms] = useState<Record<string, unknown>[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unread, markAllRead, remove } = useNotifications();

  // Connect to socket on mount
  useEffect(() => {
    if (status === 'authenticated' && !connected) {
      connect();
    }
  }, [status, connected]);

  // Fetch community stats
  useEffect(() => {
    fetchStats();
    fetchUserIdentity();
    fetchActiveRooms();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/community/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUserIdentity = async () => {
    try {
      const response = await fetch('/api/community/identity');
      const data = await response.json();
      setUserIdentity(data);
    } catch (error) {
      console.error('Failed to fetch identity:', error);
    }
  };

  const fetchActiveRooms = async () => {
    try {
      const response = await fetch('/api/community/rooms');
      const data = await response.json();
      setActiveRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const communityFeatures = [
    {
      id: 'chat',
      title: 'Peer Support Chat',
      description: 'Connect with others in real-time, moderated safe spaces',
      icon: MessageCircle,
      color: 'from-purple-400 to-purple-600',
      stats: `${stats?.activeRooms || 0} active rooms`,
      onClick: () => setActiveView('chat'),
    },
    {
      id: 'groups',
      title: 'Support Groups',
      description: 'Join scheduled group sessions with shared experiences',
      icon: Users,
      color: 'from-blue-400 to-blue-600',
      stats: `${stats?.activeGroups || 0} active groups`,
      onClick: () => setActiveView('groups'),
    },
    {
      id: 'mentorship',
      title: 'Peer Mentorship',
      description: 'Get matched with experienced peers who understand',
      icon: Heart,
      color: 'from-pink-400 to-pink-600',
      stats: `${stats?.activeMentorships || 0} active mentorships`,
      onClick: () => setActiveView('mentorship'),
    },
    {
      id: 'challenges',
      title: 'Wellness Challenges',
      description: 'Join community challenges for better mental health',
      icon: Trophy,
      color: 'from-yellow-400 to-yellow-600',
      stats: 'Join a challenge',
      onClick: () => setActiveView('challenges'),
    },
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Join Our Community
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to access community features
          </p>
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
          >
            <span>Sign In</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Community & Peer Support
              </h1>
              {connected && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Identity */}
              {userIdentity && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                    {String(userIdentity.avatar)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {String(userIdentity.displayName)}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Trust: {String(userIdentity.trustScore)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <button onClick={() => setShowNotifications(true)} className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1 rounded-full min-w-[16px] text-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
              
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" aria-label="Settings">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 -mb-px">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeView === 'overview'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeView === 'chat'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Chat Rooms
            </button>
            <button
              onClick={() => setActiveView('groups')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeView === 'groups'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Support Groups
            </button>
            <button
              onClick={() => setActiveView('mentorship')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeView === 'mentorship'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Mentorship
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Welcome Message */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 mb-8 text-white">
                <h2 className="text-2xl font-bold mb-2">
                  Welcome to Our Supportive Community
                </h2>
                <p className="text-white/90 mb-4">
                  You&apos;re not alone in your journey. Connect with peers who understand, 
                  share experiences, and support each other in a safe, anonymous environment.
                </p>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Fully Anonymous</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>24/7 Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4" />
                    <span>Peer-Led</span>
                  </div>
                </div>
              </div>

              {/* Community Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalUsers.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Community Members</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.messagestoday.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Messages Today</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.activeRooms + stats.activeGroups}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Heart className="w-8 h-8 text-red-600 dark:text-red-400" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.crisisInterventions}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lives Supported</p>
                  </div>
                </div>
              )}

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {communityFeatures.map((feature) => (
                  <motion.div
                    key={feature.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
                    onClick={feature.onClick}
                  >
                    <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {feature.stats}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {feature.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {feature.description}
                      </p>
                      
                      <div className="flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium">
                        <span>Explore</span>
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Top Topics */}
              {stats?.topTopics && stats.topTopics.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Trending Support Topics
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {stats.topTopics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"
                      >
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          {topic.topic.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-purple-500 dark:text-purple-500">
                          {topic.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex gap-6 h-[calc(100vh-250px)]"
            >
              {/* Room List */}
              <div className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Chat Rooms
                  </h3>
                </div>
                <div className="overflow-y-auto h-full">
                  {activeRooms.map((room) => (
                    <button
                      key={String(room.id)}
                      onClick={() => setSelectedRoom(String(room.id))}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedRoom === room.id ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {String(room.name)}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {String(room.currentParticipants)}/{String(room.maxParticipants)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                        {String(room.description)}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                          {String(room.topic)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {String(room.language)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Room */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {selectedRoom && userIdentity ? (
                  <ChatRoom roomId={selectedRoom} currentUser={userIdentity} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a room to start chatting</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SupportGroups />
            </motion.div>
          )}

          {activeView === 'mentorship' && (
            <motion.div
              key="mentorship"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MentorshipMatching />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Challenges View */}
      {activeView === 'challenges' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
            <h2 className="text-xl font-bold mb-4">Community Wellness Challenges</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">Participate in supportive, opt-in challenges to build healthy habits together.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <InlineChallengeCard id="gratitude" title="7-Day Gratitude" desc="Write 3 things you are grateful for daily." />
              <InlineChallengeCard id="steps" title="10k Steps / Day" desc="Aim for 10,000 steps each day this week." />
              <InlineChallengeCard id="mindful" title="Mindfulness Minutes" desc="Practice 10 minutes of mindfulness daily." />
              <InlineChallengeCard id="connect" title="Reach Out" desc="Connect with a friend or community member daily." />
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      <CommunitySettings open={showSettings} onClose={() => setShowSettings(false)} />
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl border-l p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Notifications {unread > 0 && <span className="ml-1 text-xs text-red-600">({unread} new)</span>}</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => markAllRead()} className="text-xs text-neutral-500 hover:text-neutral-700">Mark all read</button>
                <button onClick={() => setShowNotifications(false)} className="text-sm text-neutral-500">Close</button>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {notifications.length === 0 && (
                <li className="p-3 bg-neutral-50 rounded border text-neutral-500">No notifications yet</li>
              )}
              {notifications.map(n => (
                <li key={n.id} className={`p-3 rounded border ${n.read ? 'bg-white' : 'bg-neutral-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-neutral-600">{n.body}</div>
                      <div className="text-[10px] text-neutral-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <button onClick={() => remove(n.id)} className="text-xs text-neutral-400 hover:text-neutral-600">Dismiss</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Crisis Support Footer */}
      <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-900 dark:text-red-200">
                If you&apos;re in crisis, help is available 24/7
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <a href="tel:988" className="text-red-600 dark:text-red-400 font-medium hover:underline">
                Call 988
              </a>
              <span className="text-red-400">|</span>
              <a href="sms:741741" className="text-red-600 dark:text-red-400 font-medium hover:underline">
                Text HOME to 741741
              </a>
              <span className="text-red-400">|</span>
              <Link href="/crisis" className="text-red-600 dark:text-red-400 font-medium hover:underline">
                Crisis Resources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineChallengeCard({ id, title, desc }: { id: string; title: string; desc: string }) {
  const key = `challenge:${id}`;
  const [joined, setJoined] = React.useState<boolean>(() => {
    try { return localStorage.getItem(key) === 'joined'; } catch { return false; }
  });
  const toggle = () => {
    const next = !joined;
    setJoined(next);
    try { localStorage.setItem(key, next ? 'joined' : 'left'); } catch {}
  };
  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700">
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{desc}</p>
      <button onClick={toggle} className={`px-3 py-2 rounded-lg text-sm font-medium ${joined ? 'bg-neutral-200' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
        {joined ? 'Joined' : 'Join Challenge'}
      </button>
    </div>
  );
}
