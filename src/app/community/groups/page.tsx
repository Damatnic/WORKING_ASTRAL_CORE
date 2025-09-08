/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  Lock,
  Globe,
  MessageCircle,
  Heart,
  ArrowLeft,
  Star,
  Calendar,
  UserPlus,
  Eye
} from 'lucide-react';
import Link from 'next/link';

export default function SupportGroupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const supportGroups = [
    {
      id: '1',
      name: 'Anxiety Support Circle',
      description: 'A safe space for individuals dealing with anxiety disorders to share experiences and coping strategies.',
      category: 'anxiety',
      type: 'public',
      members: 247,
      activeMembers: 34,
      posts: 156,
      moderators: ['Dr. Sarah M.', 'Mike K.'],
      tags: ['anxiety', 'coping', 'mindfulness'],
      meetingTime: 'Thursdays 7:00 PM',
      image: '/groups/anxiety.jpg'
    },
    {
      id: '2',
      name: 'Depression Recovery Network',
      description: 'Supporting each other through depression recovery with understanding, hope, and practical advice.',
      category: 'depression',
      type: 'private',
      members: 189,
      activeMembers: 28,
      posts: 203,
      moderators: ['Lisa R.', 'Dr. James T.'],
      tags: ['depression', 'recovery', 'hope'],
      meetingTime: 'Tuesdays 6:30 PM',
      image: '/groups/depression.jpg'
    },
    {
      id: '3',
      name: 'PTSD Warriors',
      description: 'Veterans and civilians supporting each other through post-traumatic stress recovery.',
      category: 'trauma',
      type: 'private',
      members: 98,
      activeMembers: 15,
      posts: 87,
      moderators: ['Veteran Joe', 'Dr. Maria S.'],
      tags: ['ptsd', 'trauma', 'veterans'],
      meetingTime: 'Sundays 4:00 PM',
      image: '/groups/ptsd.jpg'
    },
    {
      id: '4',
      name: 'Mindful Living Community',
      description: 'Practice mindfulness together and share techniques for present-moment awareness.',
      category: 'mindfulness',
      type: 'public',
      members: 432,
      activeMembers: 67,
      posts: 312,
      moderators: ['Zen Master K.', 'Amy L.'],
      tags: ['mindfulness', 'meditation', 'wellness'],
      meetingTime: 'Daily 8:00 AM',
      image: '/groups/mindfulness.jpg'
    },
    {
      id: '5',
      name: 'Bipolar Support Alliance',
      description: 'Understanding and managing bipolar disorder together with peer support and resources.',
      category: 'bipolar',
      type: 'private',
      members: 156,
      activeMembers: 23,
      posts: 134,
      moderators: ['Dr. Rachel H.', 'Tom B.'],
      tags: ['bipolar', 'mood', 'stability'],
      meetingTime: 'Wednesdays 7:30 PM',
      image: '/groups/bipolar.jpg'
    },
    {
      id: '6',
      name: 'Young Adults Mental Health',
      description: 'Mental health support specifically for adults aged 18-30 navigating life transitions.',
      category: 'young-adult',
      type: 'public',
      members: 324,
      activeMembers: 45,
      posts: 278,
      moderators: ['Alex M.', 'Dr. Jennifer K.'],
      tags: ['young-adult', 'transitions', 'career'],
      meetingTime: 'Fridays 8:00 PM',
      image: '/groups/young-adult.jpg'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', count: supportGroups.length },
    { id: 'anxiety', name: 'Anxiety', count: supportGroups.filter(g => g.category === 'anxiety').length },
    { id: 'depression', name: 'Depression', count: supportGroups.filter(g => g.category === 'depression').length },
    { id: 'trauma', name: 'Trauma/PTSD', count: supportGroups.filter(g => g.category === 'trauma').length },
    { id: 'bipolar', name: 'Bipolar', count: supportGroups.filter(g => g.category === 'bipolar').length },
    { id: 'mindfulness', name: 'Mindfulness', count: supportGroups.filter(g => g.category === 'mindfulness').length }
  ];

  const filteredGroups = supportGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || group.category === selectedCategory;
    const matchesType = selectedType === 'all' || group.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getGroupIcon = (category: string) => {
    switch (category) {
      case 'anxiety': return '🧠';
      case 'depression': return '💙';
      case 'trauma': return '🛡️';
      case 'bipolar': return '⚖️';
      case 'mindfulness': return '🧘';
      case 'young-adult': return '🌟';
      default: return '👥';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
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
                <div className="bg-green-500 rounded-full p-3 mr-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-800">Support Groups</h1>
                  <p className="text-neutral-600">Find your community and connect with others</p>
                </div>
              </div>
            </div>
            
            <button className="flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              Create Group
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
                  placeholder="Search groups by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Categories Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-64"
            >
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-primary-100 text-primary-700 border-primary-200'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category.name}</span>
                        <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full">
                          {category.count}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Groups List */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                {filteredGroups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start flex-1">
                        <div className="text-4xl mr-4">
                          {getGroupIcon(group.category)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-xl font-bold text-neutral-800 mr-3">
                              {group.name}
                            </h3>
                            {group.type === 'private' ? (
                              <Lock className="w-4 h-4 text-neutral-500" />
                            ) : (
                              <Globe className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          
                          <p className="text-neutral-600 mb-3">
                            {group.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 mb-3">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{group.members} members</span>
                            </div>
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              <span>{group.activeMembers} active</span>
                            </div>
                            <div className="flex items-center">
                              <MessageCircle className="w-4 h-4 mr-1" />
                              <span>{group.posts} posts</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>{group.meetingTime}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {group.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          
                          <div className="text-xs text-neutral-500">
                            Moderated by: {group.moderators.join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <button className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join Group
                        </button>
                        <Link
                          href={`/community/groups/${group.id}`}
                          className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredGroups.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-neutral-600 mb-2">
                      No groups found
                    </h3>
                    <p className="text-neutral-500 mb-6">
                      Try adjusting your search criteria or create a new group
                    </p>
                    <button className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors">
                      <Plus className="w-5 h-5 mr-2" />
                      Create New Group
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Help & Guidance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Support Group Guide & Resources
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Heart className="w-8 h-8 text-red-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Getting Started</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Browse groups by category or search for specific topics</li>
                  <li>• Read group descriptions and rules before joining</li>
                  <li>• Start by observing before actively participating</li>
                  <li>• Introduce yourself when you feel comfortable</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Users className="w-8 h-8 text-blue-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Group Etiquette</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Respect others' privacy and experiences</li>
                  <li>• Keep discussions confidential</li>
                  <li>• Be supportive, not judgmental</li>
                  <li>• Follow group rules and moderator guidance</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Star className="w-8 h-8 text-yellow-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Safety Tips</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Don't share personal identifying information</li>
                  <li>• Report inappropriate behavior to moderators</li>
                  <li>• Trust your instincts about comfort levels</li>
                  <li>• Remember: groups supplement, don't replace therapy</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <MessageCircle className="w-8 h-8 text-green-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Group Types</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• <strong>Public:</strong> Open to all members</li>
                  <li>• <strong>Private:</strong> Request to join required</li>
                  <li>• <strong>Moderated:</strong> Supervised by professionals</li>
                  <li>• <strong>Peer-led:</strong> Community-managed discussions</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Calendar className="w-8 h-8 text-purple-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Meeting Times</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Check group schedules for live sessions</li>
                  <li>• Time zones are displayed in your local time</li>
                  <li>• Recordings may be available for missed sessions</li>
                  <li>• Async discussions happen 24/7</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <Eye className="w-8 h-8 text-indigo-500 mb-4" />
                <h4 className="font-bold text-neutral-800 mb-3">Finding Your Fit</h4>
                <ul className="text-sm text-neutral-600 space-y-2">
                  <li>• Try different groups to find the right match</li>
                  <li>• Consider group size and activity level</li>
                  <li>• Look for groups with similar experiences</li>
                  <li>• It's okay to leave if a group isn't helpful</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-bold text-amber-800 mb-3">Crisis Support Notice</h4>
              <p className="text-sm text-amber-700">
                If you're in crisis or having thoughts of self-harm, please reach out for immediate help. 
                Support groups are valuable but should not replace professional crisis intervention.
              </p>
              <div className="flex gap-4 mt-4">
                <Link href="/crisis" className="text-sm text-amber-800 underline hover:text-amber-900">
                  → Crisis Resources
                </Link>
                <Link href="/crisis/emergency-contacts" className="text-sm text-amber-800 underline hover:text-amber-900">
                  → Emergency Contacts
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Why Join Support Groups */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 bg-gradient-to-r from-primary-50 to-green-50 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Benefits of Support Groups
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Emotional Support</h4>
                <p className="text-neutral-600 text-sm">
                  Connect with others who understand your experiences and challenges
                </p>
              </div>
              <div className="text-center">
                <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Reduce Isolation</h4>
                <p className="text-neutral-600 text-sm">
                  Build meaningful connections and friendships with supportive community members
                </p>
              </div>
              <div className="text-center">
                <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Learn & Grow</h4>
                <p className="text-neutral-600 text-sm">
                  Discover new coping strategies and learn from others' recovery journeys
                </p>
              </div>
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
