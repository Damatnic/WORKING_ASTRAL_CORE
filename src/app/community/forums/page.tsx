/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Plus,
  Pin,
  Clock,
  ArrowLeft,
  ThumbsUp,
  MessageCircle,
  Eye,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function ForumsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const forums = [
    {
      id: 'general',
      name: 'General Discussion',
      description: 'Open discussions about mental health and wellness',
      topics: 234,
      posts: 1567,
      lastActivity: '2 minutes ago',
      lastPost: {
        title: 'Anyone else struggling with seasonal depression?',
        author: 'Sarah M.',
        time: '2 minutes ago'
      },
      moderators: ['Dr. Lisa', 'Mike K.'],
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'anxiety',
      name: 'Anxiety & Panic',
      description: 'Support and strategies for managing anxiety disorders',
      topics: 156,
      posts: 892,
      lastActivity: '15 minutes ago',
      lastPost: {
        title: 'Breathing exercises that actually work',
        author: 'Alex R.',
        time: '15 minutes ago'
      },
      moderators: ['Dr. James', 'Anna L.'],
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'depression',
      name: 'Depression Support',
      description: 'Understanding and overcoming depression together',
      topics: 198,
      posts: 1234,
      lastActivity: '8 minutes ago',
      lastPost: {
        title: 'Small victories worth celebrating',
        author: 'Tom B.',
        time: '8 minutes ago'
      },
      moderators: ['Dr. Rachel', 'Jennifer K.'],
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'therapy',
      name: 'Therapy & Treatment',
      description: 'Discussions about therapy approaches and treatments',
      topics: 89,
      posts: 456,
      lastActivity: '32 minutes ago',
      lastPost: {
        title: 'Finding the right therapist',
        author: 'Maria S.',
        time: '32 minutes ago'
      },
      moderators: ['Dr. John', 'Lisa M.'],
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'relationships',
      name: 'Relationships & Family',
      description: 'Navigating relationships while managing mental health',
      topics: 67,
      posts: 378,
      lastActivity: '1 hour ago',
      lastPost: {
        title: 'Setting boundaries with family',
        author: 'Chris W.',
        time: '1 hour ago'
      },
      moderators: ['Dr. Emma', 'David R.'],
      color: 'bg-pink-100 text-pink-800'
    },
    {
      id: 'crisis',
      name: 'Crisis Support',
      description: 'Immediate support and crisis resources',
      topics: 34,
      posts: 123,
      lastActivity: '3 hours ago',
      lastPost: {
        title: 'Emergency contacts and resources',
        author: 'Moderator',
        time: '3 hours ago'
      },
      moderators: ['Crisis Team'],
      color: 'bg-red-100 text-red-800',
      pinned: true
    }
  ];

  const recentTopics = [
    {
      id: '1',
      title: 'How to cope with work-related stress?',
      author: 'Jennifer K.',
      forum: 'General Discussion',
      replies: 23,
      views: 156,
      lastReply: '5 minutes ago',
      likes: 12,
      pinned: false
    },
    {
      id: '2',
      title: 'Meditation apps that actually help',
      author: 'Mike R.',
      forum: 'Anxiety & Panic',
      replies: 45,
      views: 234,
      lastReply: '12 minutes ago',
      likes: 28,
      pinned: true
    },
    {
      id: '3',
      title: 'Support for caregivers',
      author: 'Sarah L.',
      forum: 'Relationships & Family',
      replies: 18,
      views: 89,
      lastReply: '25 minutes ago',
      likes: 15,
      pinned: false
    },
    {
      id: '4',
      title: 'Winter blues and seasonal affective disorder',
      author: 'Alex M.',
      forum: 'Depression Support',
      replies: 67,
      views: 445,
      lastReply: '1 hour ago',
      likes: 42,
      pinned: false
    },
    {
      id: '5',
      title: 'Online therapy vs in-person therapy',
      author: 'Dr. Lisa',
      forum: 'Therapy & Treatment',
      replies: 89,
      views: 567,
      lastReply: '2 hours ago',
      likes: 56,
      pinned: false
    }
  ];

  const filteredForums = forums.filter(forum => {
    const matchesSearch = forum.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         forum.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || forum.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedTopics = [...recentTopics].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.lastReply).getTime() - new Date(a.lastReply).getTime();
    } else if (sortBy === 'popular') {
      return b.views - a.views;
    } else if (sortBy === 'replies') {
      return b.replies - a.replies;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center">
              <Link href="/community" className="mr-4">
                <ArrowLeft className="w-6 h-6 text-neutral-600 hover:text-neutral-800 transition-colors" />
              </Link>
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-full p-3 mr-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-800">Community Forums</h1>
                  <p className="text-neutral-600">Discuss, share, and support each other</p>
                </div>
              </div>
            </div>
            
            <button className="flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              New Topic
            </button>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search forums and topics..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="replies">Most Replies</option>
                </select>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Forum Categories */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8">
                <h2 className="text-2xl font-bold text-neutral-800 mb-6">Forum Categories</h2>
                
                <div className="space-y-4">
                  {filteredForums.map((forum, index) => (
                    <motion.div
                      key={forum.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <div className="mr-4">
                            <MessageSquare className="w-8 h-8 text-primary-500" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <Link 
                                href={`/community/forums/${forum.id}`}
                                className="text-xl font-bold text-neutral-800 hover:text-primary-600 transition-colors"
                              >
                                {forum.name}
                              </Link>
                              {forum.pinned && (
                                <Pin className="w-4 h-4 text-yellow-500 ml-2" />
                              )}
                            </div>
                            
                            <p className="text-neutral-600 mb-3">
                              {forum.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-neutral-500 mb-2">
                              <span>{forum.topics} topics</span>
                              <span>{forum.posts} posts</span>
                            </div>
                            
                            <div className="flex items-center text-xs text-neutral-500">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>Last activity: {forum.lastActivity}</span>
                            </div>
                            
                            {forum.lastPost && (
                              <div className="mt-2 p-2 bg-neutral-50 rounded-lg">
                                <Link 
                                  href={`/community/forums/${forum.id}/topic/${forum.lastPost.title.toLowerCase().replace(/\s+/g, '-')}`}
                                  className="text-sm font-medium text-neutral-800 hover:text-primary-600 transition-colors"
                                >
                                  {forum.lastPost.title}
                                </Link>
                                <div className="text-xs text-neutral-500 mt-1">
                                  by {forum.lastPost.author} • {forum.lastPost.time}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${forum.color}`}>
                            {forum.name}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* Recent Topics */}
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">Recent Topics</h3>
                
                <div className="space-y-3">
                  {sortedTopics.slice(0, 5).map((topic, index) => (
                    <div key={topic.id} className="border-b border-neutral-100 last:border-b-0 pb-3 last:pb-0">
                      <div className="flex items-start">
                        {topic.pinned && (
                          <Pin className="w-4 h-4 text-yellow-500 mr-2 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <Link 
                            href={`/community/forums/topic/${topic.id}`}
                            className="text-sm font-medium text-neutral-800 hover:text-primary-600 transition-colors line-clamp-2"
                          >
                            {topic.title}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                            <span>by {topic.author}</span>
                            <div className="flex items-center">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              <span>{topic.replies}</span>
                            </div>
                            <div className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              <span>{topic.views}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Link
                  href="/community/forums/all-topics"
                  className="block text-center text-primary-600 hover:text-primary-700 font-medium text-sm mt-4 transition-colors"
                >
                  View All Topics →
                </Link>
              </div>

              {/* Forum Stats */}
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">Community Stats</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Total Topics</span>
                    <span className="font-bold text-neutral-800">
                      {forums.reduce((sum, forum) => sum + forum.topics, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Total Posts</span>
                    <span className="font-bold text-neutral-800">
                      {forums.reduce((sum, forum) => sum + forum.posts, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Active Users</span>
                    <span className="font-bold text-neutral-800">1,234</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Online Now</span>
                    <span className="font-bold text-green-600">67</span>
                  </div>
                </div>
              </div>

              {/* Forum Guidelines */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">Forum Guidelines</h3>
                
                <div className="space-y-2 text-sm text-neutral-700">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span>Be respectful and supportive</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span>No personal attacks or harassment</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span>Keep discussions relevant to mental health</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span>Respect privacy and confidentiality</span>
                  </div>
                </div>
                
                <Link
                  href="/community/guidelines"
                  className="inline-block text-primary-600 hover:text-primary-700 font-medium text-sm mt-3 transition-colors"
                >
                  Read Full Guidelines
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Help & Guidance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Forum Participation Guide
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <MessageSquare className="w-8 h-8 text-blue-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Getting Started</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Browse forum categories to find relevant topics</li>
                  <li>• Read existing discussions before posting</li>
                  <li>• Use clear, descriptive titles for new topics</li>
                  <li>• Introduce yourself in the General Discussion</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Search className="w-8 h-8 text-green-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Finding Discussions</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Use the search bar to find specific topics</li>
                  <li>• Sort by recent, popular, or most replies</li>
                  <li>• Check pinned topics for important information</li>
                  <li>• Explore different categories for varied perspectives</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Plus className="w-8 h-8 text-purple-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Creating Topics</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Choose the appropriate forum category</li>
                  <li>• Write a clear, specific title</li>
                  <li>• Provide context and background information</li>
                  <li>• Ask specific questions to encourage responses</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <ThumbsUp className="w-8 h-8 text-yellow-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Helpful Responses</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Share personal experiences respectfully</li>
                  <li>• Offer support without giving medical advice</li>
                  <li>• Ask follow-up questions to show interest</li>
                  <li>• Use "I" statements to share perspectives</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Eye className="w-8 h-8 text-indigo-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Privacy & Safety</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Don't share personal identifying information</li>
                  <li>• Keep location details general</li>
                  <li>• Report concerning posts to moderators</li>
                  <li>• Remember discussions are visible to all members</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <TrendingUp className="w-8 h-8 text-red-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Community Building</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Engage regularly to build relationships</li>
                  <li>• Welcome new community members</li>
                  <li>• Share resources and helpful links</li>
                  <li>• Celebrate others' progress and milestones</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-bold text-amber-800 mb-3">Crisis Support Notice</h4>
              <p className="text-sm text-amber-700 mb-3">
                Forums are for peer support and should not replace professional mental health care. 
                If you're experiencing a mental health crisis, please seek immediate professional help.
              </p>
              <div className="flex gap-4">
                <Link href="/crisis" className="text-sm text-amber-800 underline hover:text-amber-900">
                  → Crisis Resources
                </Link>
                <Link href="/crisis/emergency-contacts" className="text-sm text-amber-800 underline hover:text-amber-900">
                  → Emergency Contacts
                </Link>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <h4 className="font-bold text-neutral-800 mb-3">Need Help Using the Forums?</h4>
              <p className="text-neutral-600 text-sm mb-4">
                If you're having trouble navigating or using the forum features, don't hesitate to ask for help.
              </p>
              <Link
                href="/community/forums/general"
                className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Ask for Help in General Discussion
              </Link>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center mt-8">
            <Link 
              href="/community"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← Back to Community
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
