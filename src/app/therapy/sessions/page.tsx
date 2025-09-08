"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MessageCircle, 
  Brain,
  TrendingUp,
  Filter,
  Search,
  Plus,
  ArrowLeft,
  Star,
  MoreVertical,
  HelpCircle,
  Lightbulb,
  BookOpen,
  CheckCircle,
  Target,
  Heart
} from 'lucide-react';
import Link from 'next/link';

export default function TherapySessionsPage() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'in-progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sessions = [
    {
      id: '1',
      title: 'Anxiety Management Session',
      date: '2024-01-15',
      time: '14:30',
      duration: '45 minutes',
      status: 'completed',
      topic: 'Anxiety',
      notes: 'Discussed breathing techniques and cognitive restructuring for managing work anxiety.',
      rating: 4,
      keyInsights: ['Breathing exercises helpful', 'Identified work triggers', 'Progress on thought patterns']
    },
    {
      id: '2',
      title: 'Depression Support Chat',
      date: '2024-01-12',
      time: '10:15',
      duration: '60 minutes',
      status: 'completed',
      topic: 'Depression',
      notes: 'Explored feelings of hopelessness and worked on behavioral activation strategies.',
      rating: 5,
      keyInsights: ['Small steps approach', 'Daily routine structure', 'Social connection importance']
    },
    {
      id: '3',
      title: 'Crisis Intervention',
      date: '2024-01-10',
      time: '22:45',
      duration: '30 minutes',
      status: 'completed',
      topic: 'Crisis',
      notes: 'Emergency session for crisis support. Safety plan reviewed and updated.',
      rating: 5,
      keyInsights: ['Safety plan activated', 'Crisis resources provided', 'Follow-up scheduled']
    },
    {
      id: '4',
      title: 'Relationship Issues Discussion',
      date: '2024-01-08',
      time: '16:00',
      duration: '50 minutes',
      status: 'completed',
      topic: 'Relationships',
      notes: 'Communication patterns with partner. Explored attachment styles.',
      rating: 4,
      keyInsights: ['Communication styles', 'Attachment patterns', 'Boundary setting']
    },
    {
      id: '5',
      title: 'Sleep and Stress Session',
      date: '2024-01-05',
      time: '19:20',
      duration: '40 minutes',
      status: 'in-progress',
      topic: 'Sleep',
      notes: 'Working on sleep hygiene and stress management techniques.',
      keyInsights: ['Sleep schedule', 'Bedtime routine', 'Stress triggers']
    }
  ];

  const filteredSessions = sessions.filter(session => {
    const matchesFilter = selectedFilter === 'all' || session.status === selectedFilter ||
                         (selectedFilter === 'recent' && new Date(session.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.notes.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTopicColor = (topic: string) => {
    switch (topic.toLowerCase()) {
      case 'anxiety': return 'bg-yellow-100 text-yellow-800';
      case 'depression': return 'bg-purple-100 text-purple-800';
      case 'crisis': return 'bg-red-100 text-red-800';
      case 'relationships': return 'bg-pink-100 text-pink-800';
      case 'sleep': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center mb-8"
          >
            <Link href="/therapy" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-neutral-600 hover:text-neutral-800 transition-colors" />
            </Link>
            <div className="flex items-center flex-1">
              <div className="bg-primary-500 rounded-full p-3 mr-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-neutral-800">Therapy Sessions</h1>
                <p className="text-neutral-600">Your AI therapy session history and insights</p>
              </div>
              <Link 
                href="/therapy"
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Link>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <MessageCircle className="w-8 h-8 text-primary-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">{sessions.length}</div>
                  <div className="text-sm text-neutral-600">Total Sessions</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">4.2h</div>
                  <div className="text-sm text-neutral-600">Total Time</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">4.5</div>
                  <div className="text-sm text-neutral-600">Avg Rating</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-4">
              <div className="flex items-center">
                <Brain className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-neutral-800">12</div>
                  <div className="text-sm text-neutral-600">Key Insights</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filters and Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search sessions by topic, notes, or keywords..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All Sessions' },
                  { key: 'recent', label: 'Recent' },
                  { key: 'in-progress', label: 'In Progress' },
                  { key: 'completed', label: 'Completed' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedFilter(filter.key as any)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      selectedFilter === filter.key
                        ? 'bg-primary-500 text-white border-transparent'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sessions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            {filteredSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-neutral-800 mb-2">
                          {session.title}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTopicColor(session.topic)}`}>
                            {session.topic}
                          </span>
                          {session.rating && (
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < session.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center text-neutral-600 text-sm mb-4">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span className="mr-4">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="mr-4">{session.time}</span>
                          <span>Duration: {session.duration}</span>
                        </div>

                        <p className="text-neutral-700 mb-4">
                          {session.notes}
                        </p>

                        <div>
                          <h4 className="font-semibold text-neutral-800 mb-2">Key Insights:</h4>
                          <div className="flex flex-wrap gap-2">
                            {session.keyInsights.map((insight, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-lg"
                              >
                                {insight}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button className="text-neutral-400 hover:text-neutral-600 transition-colors ml-4">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredSessions.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-600 mb-2">
                  No sessions found
                </h3>
                <p className="text-neutral-500 mb-6">
                  {searchQuery || selectedFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start your first AI therapy session'
                  }
                </p>
                <Link
                  href="/therapy"
                  className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Start New Session
                </Link>
              </div>
            )}
          </motion.div>

          {/* Help & Guidance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8"
          >
            <div className="flex items-center mb-6">
              <HelpCircle className="w-6 h-6 text-primary-500 mr-3" />
              <h3 className="text-2xl font-bold text-neutral-800">Session Management Guide</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                  Maximizing Your Sessions
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Come prepared:</strong>
                      <span className="text-neutral-600"> Think about what you want to discuss before each session</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Be honest:</strong>
                      <span className="text-neutral-600"> Share your genuine thoughts and feelings for the most effective help</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Review insights:</strong>
                      <span className="text-neutral-600"> Look back at key insights from previous sessions to track progress</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Set goals:</strong>
                      <span className="text-neutral-600"> Work with the AI to establish clear, achievable mental health goals</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 text-blue-500 mr-2" />
                  Understanding Your Progress
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">Session Ratings</h5>
                    <p className="text-neutral-600 text-sm">
                      Rate each session to help the AI understand what approaches work best for you and improve future sessions.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">Key Insights</h5>
                    <p className="text-neutral-600 text-sm">
                      Pay attention to recurring insights across sessions - these often indicate important patterns or breakthroughs.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">Session Frequency</h5>
                    <p className="text-neutral-600 text-sm">
                      Regular sessions tend to be more effective than sporadic ones. Consider scheduling consistent weekly sessions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Types Guide */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                <Target className="w-5 h-5 text-purple-500 mr-2" />
                Types of Therapy Sessions
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg border border-neutral-200">
                  <h5 className="font-medium text-neutral-800 mb-2 flex items-center">
                    <MessageCircle className="w-4 h-4 text-blue-500 mr-2" />
                    General Support
                  </h5>
                  <p className="text-neutral-600 text-xs">
                    Open conversation about your current feelings, thoughts, and experiences.
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-neutral-200">
                  <h5 className="font-medium text-neutral-800 mb-2 flex items-center">
                    <Brain className="w-4 h-4 text-purple-500 mr-2" />
                    Focused Therapy
                  </h5>
                  <p className="text-neutral-600 text-xs">
                    Targeted sessions for specific issues like anxiety, depression, or trauma.
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-neutral-200">
                  <h5 className="font-medium text-neutral-800 mb-2 flex items-center">
                    <Target className="w-4 h-4 text-green-500 mr-2" />
                    Goal-Oriented
                  </h5>
                  <p className="text-neutral-600 text-xs">
                    Working towards specific objectives like building confidence or improving relationships.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Help Links */}
            <div className="border-t border-neutral-200 pt-6">
              <h4 className="text-lg font-semibold text-neutral-800 mb-4">Need Additional Support?</h4>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/therapy"
                  className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Session
                </Link>
                <Link
                  href="/resources"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Therapy Resources
                </Link>
                <Link
                  href="/dashboard/goals"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Set Goals
                </Link>
                <Link
                  href="/crisis"
                  className="flex items-center px-4 py-2 bg-crisis-primary text-white rounded-lg hover:bg-crisis-secondary transition-colors"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Crisis Support
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center mt-8">
            <Link 
              href="/therapy"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← Back to Therapy Hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}