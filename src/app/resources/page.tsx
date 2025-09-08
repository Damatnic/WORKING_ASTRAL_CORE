"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Book, 
  Search, 
  Filter,
  Download,
  ExternalLink,
  Heart,
  Brain,
  Users,
  Shield,
  Phone,
  Video,
  FileText,
  Headphones,
  Star,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const resourceCategories = [
    { id: 'all', name: 'All Resources', icon: Book, count: 45 },
    { id: 'crisis', name: 'Crisis Support', icon: Shield, count: 8 },
    { id: 'therapy', name: 'Therapy & Treatment', icon: Brain, count: 12 },
    { id: 'wellness', name: 'Wellness & Self-Care', icon: Heart, count: 15 },
    { id: 'community', name: 'Community Support', icon: Users, count: 10 }
  ];

  const resourceTypes = [
    { id: 'all', name: 'All Types' },
    { id: 'article', name: 'Articles' },
    { id: 'video', name: 'Videos' },
    { id: 'audio', name: 'Podcasts/Audio' },
    { id: 'tool', name: 'Tools & Worksheets' },
    { id: 'guide', name: 'Guides' }
  ];

  const resources = [
    {
      id: '1',
      title: 'Understanding Anxiety Disorders',
      description: 'Comprehensive guide to recognizing and managing anxiety disorders, including symptoms, causes, and treatment options.',
      category: 'therapy',
      type: 'article',
      author: 'Dr. Sarah Johnson',
      readTime: '8 min read',
      rating: 4.8,
      downloads: 2341,
      tags: ['anxiety', 'mental-health', 'treatment'],
      isFree: true,
      thumbnail: '/resources/anxiety-guide.jpg'
    },
    {
      id: '2',
      title: 'Crisis Safety Plan Template',
      description: 'Downloadable template to create your personalized crisis safety plan with step-by-step guidance.',
      category: 'crisis',
      type: 'tool',
      author: 'Crisis Intervention Team',
      readTime: 'Tool',
      rating: 4.9,
      downloads: 5672,
      tags: ['crisis', 'safety-plan', 'template'],
      isFree: true,
      thumbnail: '/resources/safety-plan.jpg'
    },
    {
      id: '3',
      title: 'Mindfulness for Beginners',
      description: 'A complete guide to starting your mindfulness practice, including meditation techniques and daily exercises.',
      category: 'wellness',
      type: 'video',
      author: 'Mindfulness Center',
      readTime: '45 min',
      rating: 4.7,
      downloads: 3890,
      tags: ['mindfulness', 'meditation', 'beginner'],
      isFree: true,
      thumbnail: '/resources/mindfulness.jpg'
    },
    {
      id: '4',
      title: 'Cognitive Behavioral Therapy Workbook',
      description: 'Interactive workbook with CBT exercises, thought records, and behavioral activation techniques.',
      category: 'therapy',
      type: 'tool',
      author: 'Dr. Michael Chen',
      readTime: 'Workbook',
      rating: 4.6,
      downloads: 1876,
      tags: ['cbt', 'workbook', 'therapy'],
      isFree: false,
      price: '$9.99',
      thumbnail: '/resources/cbt-workbook.jpg'
    },
    {
      id: '5',
      title: 'Building Support Networks',
      description: 'How to create and maintain meaningful connections for mental health support and recovery.',
      category: 'community',
      type: 'guide',
      author: 'Community Wellness Team',
      readTime: '12 min read',
      rating: 4.5,
      downloads: 2103,
      tags: ['community', 'support', 'relationships'],
      isFree: true,
      thumbnail: '/resources/support-network.jpg'
    },
    {
      id: '6',
      title: 'Sleep Hygiene for Mental Health',
      description: 'Evidence-based strategies for improving sleep quality to support mental health and emotional well-being.',
      category: 'wellness',
      type: 'article',
      author: 'Sleep Research Institute',
      readTime: '6 min read',
      rating: 4.4,
      downloads: 2567,
      tags: ['sleep', 'wellness', 'mental-health'],
      isFree: true,
      thumbnail: '/resources/sleep-hygiene.jpg'
    },
    {
      id: '7',
      title: 'Mental Health First Aid',
      description: 'Audio guide on how to provide initial support to someone experiencing a mental health crisis.',
      category: 'crisis',
      type: 'audio',
      author: 'Mental Health First Aid Team',
      readTime: '35 min',
      rating: 4.8,
      downloads: 1445,
      tags: ['first-aid', 'crisis', 'help'],
      isFree: true,
      thumbnail: '/resources/first-aid.jpg'
    },
    {
      id: '8',
      title: 'Depression Recovery Roadmap',
      description: 'Step-by-step guide through depression recovery, including goal setting and progress tracking tools.',
      category: 'therapy',
      type: 'guide',
      author: 'Depression Recovery Alliance',
      readTime: '20 min read',
      rating: 4.7,
      downloads: 3210,
      tags: ['depression', 'recovery', 'goals'],
      isFree: true,
      thumbnail: '/resources/depression-recovery.jpg'
    }
  ];

  const filteredResources = resources.filter(resource => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesType && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return FileText;
      case 'video': return Video;
      case 'audio': return Headphones;
      case 'tool': return Download;
      case 'guide': return Book;
      default: return FileText;
    }
  };

  const featuredResources = resources.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-500 rounded-full p-4 mr-4">
                <Book className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-neutral-800">Mental Health Resources</h1>
            </div>
            <p className="text-xl text-neutral-600 mb-4">
              Evidence-based tools, guides, and educational materials for your mental health journey
            </p>
            <p className="text-neutral-500">
              Free and premium resources from mental health professionals
            </p>
          </motion.div>

          {/* Featured Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-neutral-800 mb-6">Featured Resources</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredResources.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden hover:shadow-glow transition-all duration-300 cursor-pointer"
                >
                  <div className="h-48 bg-gradient-to-br from-primary-500 to-purple-500 relative">
                    <div className="absolute top-4 left-4">
                      {!resource.isFree && (
                        <span className="px-2 py-1 bg-white text-primary-600 text-xs font-medium rounded-full">
                          {resource.price}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="text-lg font-bold mb-1">{resource.title}</h3>
                      <p className="text-sm opacity-90">{resource.author}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-neutral-600 mb-3 text-sm">
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-neutral-500">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span>{resource.rating}</span>
                        <span className="mx-2">•</span>
                        <span>{resource.downloads} downloads</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-primary-500" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search resources by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
                  className="px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {resourceTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Categories Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:w-64"
            >
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 sticky top-6">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">Categories</h3>
                <div className="space-y-2">
                  {resourceCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <category.icon className="w-5 h-5 mr-3" />
                          <span>{category.name}</span>
                        </div>
                        <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded-full">
                          {category.count}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Resources Grid */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-800">
                    {searchQuery ? `Results for "${searchQuery}"` : 'All Resources'}
                  </h2>
                  <p className="text-neutral-600">
                    {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </motion.div>

              <div className="grid gap-6">
                {filteredResources.map((resource, index) => {
                  const TypeIcon = getTypeIcon(resource.type);
                  
                  return (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <div className="mr-4">
                            <TypeIcon className="w-8 h-8 text-primary-500" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-xl font-bold text-neutral-800 mr-3">
                                {resource.title}
                              </h3>
                              {!resource.isFree && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                  {resource.price}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-neutral-600 mb-3">
                              {resource.description}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 mb-3">
                              <span>by {resource.author}</span>
                              <span>•</span>
                              <span>{resource.readTime}</span>
                              <span>•</span>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                <span>{resource.rating}</span>
                              </div>
                              <span>•</span>
                              <span>{resource.downloads} downloads</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {resource.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <button className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
                            <Download className="w-4 h-4 mr-2" />
                            {resource.isFree ? 'Download' : 'Purchase'}
                          </button>
                          <button className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Preview
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredResources.length === 0 && (
                  <div className="text-center py-12">
                    <Book className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-neutral-600 mb-2">
                      No resources found
                    </h3>
                    <p className="text-neutral-500">
                      Try adjusting your search criteria or browse different categories
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Need Help Finding Resources?
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Phone className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Contact Support</h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Our support team can help you find the right resources for your needs
                </p>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Contact Us →
                </button>
              </div>
              <div className="text-center">
                <Users className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Community Recommendations</h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Get resource recommendations from community members with similar experiences
                </p>
                <Link href="/community" className="text-green-600 hover:text-green-700 font-medium text-sm">
                  Join Community →
                </Link>
              </div>
              <div className="text-center">
                <Brain className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">AI Recommendations</h4>
                <p className="text-neutral-600 text-sm mb-3">
                  Get personalized resource suggestions based on your therapy sessions and goals
                </p>
                <Link href="/therapy" className="text-purple-600 hover:text-purple-700 font-medium text-sm">
                  Start Session →
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center mt-8">
            <Link 
              href="/"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}