"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter,
  Brain,
  Heart,
  Users,
  Shield,
  Book,
  MessageCircle,
  Star,
  Clock,
  ArrowRight,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const searchCategories = [
    { id: 'therapy', name: 'Therapy', icon: Brain, color: 'bg-primary-500' },
    { id: 'wellness', name: 'Wellness', icon: Heart, color: 'bg-wellness-growth' },
    { id: 'community', name: 'Community', icon: Users, color: 'bg-green-500' },
    { id: 'crisis', name: 'Crisis Support', icon: Shield, color: 'bg-crisis-primary' },
    { id: 'resources', name: 'Resources', icon: Book, color: 'bg-purple-500' }
  ];

  const searchResults = [
    {
      title: "AI Therapy Assistant",
      description: "Get immediate, confidential mental health support with advanced AI",
      category: "therapy",
      link: "/therapy",
      rating: 4.8,
      users: "1.2k users"
    },
    {
      title: "Crisis Support Chat",
      description: "24/7 crisis intervention and emergency mental health support",
      category: "crisis",
      link: "/crisis",
      rating: 4.9,
      users: "Emergency Support"
    },
    {
      title: "Mood Tracking",
      description: "Track your daily mood patterns and identify triggers",
      category: "wellness",
      link: "/wellness",
      rating: 4.7,
      users: "850 users"
    },
    {
      title: "Peer Support Groups",
      description: "Connect with others who understand your experiences",
      category: "community", 
      link: "/community",
      rating: 4.6,
      users: "320 active members"
    },
    {
      title: "Breathing Exercises",
      description: "Guided breathing techniques for anxiety and stress relief",
      category: "wellness",
      link: "/wellness",
      rating: 4.8,
      users: "2.1k users"
    },
    {
      title: "Mental Health Resources",
      description: "Comprehensive library of mental health information and tools",
      category: "resources",
      link: "/resources",
      rating: 4.5,
      users: "5k+ resources"
    }
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const filteredResults = searchResults.filter(result => {
    const matchesQuery = result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        result.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters = activeFilters.length === 0 || activeFilters.includes(result.category);
    return matchesQuery && matchesFilters;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary-500 rounded-full p-4 mr-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-neutral-800">
                Search
              </h1>
            </div>
            
            <p className="text-xl text-neutral-600">
              Find the mental health support and resources you need
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8"
          >
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for therapy, wellness tools, support groups..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {searchCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleFilter(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                    activeFilters.includes(category.id)
                      ? `${category.color} text-white border-transparent`
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <category.icon className="w-4 h-4 mr-2" />
                  <span>{category.name}</span>
                  {activeFilters.includes(category.id) && (
                    <X className="w-4 h-4 ml-2" />
                  )}
                </button>
              ))}
            </div>

            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="mt-4 text-neutral-600 hover:text-neutral-800 text-sm transition-colors"
              >
                Clear all filters
              </button>
            )}
          </motion.div>

          {/* Search Results */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-neutral-800">
                {searchQuery ? `Results for "${searchQuery}"` : 'All Resources'}
              </h2>
              <p className="text-neutral-600">
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-4">
              {filteredResults.map((result, index) => {
                const categoryInfo = searchCategories.find(cat => cat.id === result.category);
                
                return (
                  <motion.div
                    key={result.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Link href={result.link} className="block">
                      <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300 group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {categoryInfo && (
                                <div className={`${categoryInfo.color} rounded-lg p-1 mr-3`}>
                                  <categoryInfo.icon className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <h3 className="text-xl font-bold text-neutral-800 group-hover:text-primary-600 transition-colors">
                                {result.title}
                              </h3>
                            </div>
                            
                            <p className="text-neutral-600 mb-3">
                              {result.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-neutral-500">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                <span>{result.rating}</span>
                              </div>
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{result.users}</span>
                              </div>
                            </div>
                          </div>
                          
                          <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all ml-4 flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {filteredResults.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-600 mb-2">
                  No results found
                </h3>
                <p className="text-neutral-500">
                  Try adjusting your search terms or removing some filters
                </p>
              </div>
            )}
          </motion.div>

          {/* Popular Searches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 bg-neutral-50 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-neutral-800 mb-4">
              Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {['anxiety', 'depression', 'stress', 'mindfulness', 'crisis support', 'peer support'].map((term) => (
                <button
                  key={term}
                  onClick={() => setSearchQuery(term)}
                  className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-700 hover:border-primary-300 hover:text-primary-700 transition-all duration-200"
                >
                  {term}
                </button>
              ))}
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