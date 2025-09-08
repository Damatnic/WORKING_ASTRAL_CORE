'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  PenTool,
  Calendar,
  Search,
  Filter,
  Plus,
  BookOpen,
  Heart,
  Sun,
  Moon,
  Star,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function WellnessJournalPage() {
  const [activeView, setActiveView] = useState<'list' | 'write'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState('all');
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 7,
    tags: [] as string[],
    gratitude: ['', '', ''],
    challenges: '',
    wins: '',
    tomorrow: ''
  });

  const [entries] = useState([
    {
      id: 1,
      date: '2024-12-15',
      title: 'Morning Reflections',
      content: 'Started the day with meditation and felt more centered. The breathing exercises really helped calm my mind before the busy day ahead.',
      mood: 8,
      tags: ['meditation', 'morning', 'breathing'],
      gratitude: ['Beautiful sunrise', 'Good health', 'Supportive friends'],
      challenges: 'Felt anxious about the presentation',
      wins: 'Completed my morning routine',
      tomorrow: 'Practice presentation one more time'
    },
    {
      id: 2,
      date: '2024-12-14',
      title: 'Evening Wind Down',
      content: 'Reflecting on a challenging but rewarding day. The team meeting went better than expected, and I felt confident sharing my ideas.',
      mood: 7,
      tags: ['evening', 'work', 'confidence'],
      gratitude: ['Team support', 'Learning opportunity', 'Quiet evening'],
      challenges: 'Time management with multiple deadlines',
      wins: 'Spoke up confidently in meeting',
      tomorrow: 'Focus on one task at a time'
    },
    {
      id: 3,
      date: '2024-12-13',
      title: 'Midweek Check-in',
      content: 'Feeling grateful for progress made this week. The mindfulness practice is becoming more natural, and I notice I\'m more patient with myself.',
      mood: 9,
      tags: ['gratitude', 'progress', 'mindfulness'],
      gratitude: ['Progress in mindfulness', 'Patient with myself', 'Peaceful moments'],
      challenges: 'Staying consistent with evening routine',
      wins: 'Three days of mindfulness practice',
      tomorrow: 'Maintain consistency'
    }
  ]);

  const moods = [
    { value: 'all', label: 'All Moods', color: 'text-neutral-600' },
    { value: 'high', label: 'Great (8-10)', color: 'text-green-600' },
    { value: 'medium', label: 'Good (5-7)', color: 'text-yellow-600' },
    { value: 'low', label: 'Challenging (1-4)', color: 'text-red-600' }
  ];

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return 'text-green-500 bg-green-50';
    if (mood >= 5) return 'text-yellow-500 bg-yellow-50';
    return 'text-red-500 bg-red-50';
  };

  const getMoodIcon = (mood: number) => {
    if (mood >= 8) return Sun;
    if (mood >= 5) return Star;
    return Moon;
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesMood = filterMood === 'all' ||
      (filterMood === 'high' && entry.mood >= 8) ||
      (filterMood === 'medium' && entry.mood >= 5 && entry.mood < 8) ||
      (filterMood === 'low' && entry.mood < 5);
    
    return matchesSearch && matchesMood;
  });

  const handleSaveEntry = () => {
    // In a real app, this would save to backend
    console.log('Saving entry:', newEntry);
    setNewEntry({
      title: '',
      content: '',
      mood: 7,
      tags: [],
      gratitude: ['', '', ''],
      challenges: '',
      wins: '',
      tomorrow: ''
    });
    setActiveView('list');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Link 
              href="/wellness"
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-800">Wellness Journal</h1>
              <p className="text-neutral-600 mt-1">Reflect on your journey and track your growth</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('list')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeView === 'list'
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                <BookOpen className="w-4 h-4 mr-2 inline" />
                Entries
              </button>
              <button
                onClick={() => setActiveView('write')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeView === 'write'
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                <PenTool className="w-4 h-4 mr-2 inline" />
                Write
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeView === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Search and Filters */}
              <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 mb-8">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search entries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <select
                      value={filterMood}
                      onChange={(e) => setFilterMood(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 appearance-none"
                    >
                      {moods.map(mood => (
                        <option key={mood.value} value={mood.value}>{mood.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Journal Entries */}
              <div className="space-y-6">
                {filteredEntries.map((entry, index) => {
                  const MoodIcon = getMoodIcon(entry.mood);
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-full ${getMoodColor(entry.mood)}`}>
                            <MoodIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-neutral-800">{entry.title}</h3>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 text-neutral-500" />
                                <span className="text-sm text-neutral-600">{entry.date}</span>
                              </div>
                            </div>
                            <p className="text-neutral-700 mb-4">{entry.content}</p>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {entry.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Gratitude */}
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-neutral-800 mb-2">Gratitude</h4>
                                <ul className="space-y-1">
                                  {entry.gratitude.map((item, idx) => (
                                    <li key={idx} className="text-sm text-neutral-600 flex items-center space-x-2">
                                      <Heart className="w-3 h-3 text-pink-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-neutral-200">
                                <div>
                                  <h5 className="font-medium text-neutral-800 mb-1">Challenges</h5>
                                  <p className="text-sm text-neutral-600">{entry.challenges}</p>
                                </div>
                                <div>
                                  <h5 className="font-medium text-neutral-800 mb-1">Wins</h5>
                                  <p className="text-sm text-neutral-600">{entry.wins}</p>
                                </div>
                                <div>
                                  <h5 className="font-medium text-neutral-800 mb-1">Tomorrow</h5>
                                  <p className="text-sm text-neutral-600">{entry.tomorrow}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMoodColor(entry.mood)}`}>
                            {entry.mood}/10
                          </div>
                          <button className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                            <Edit3 className="w-4 h-4 text-neutral-600" />
                          </button>
                          <button className="p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4 text-neutral-600" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {filteredEntries.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <BookOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-neutral-600 mb-2">No entries found</h3>
                  <p className="text-neutral-500 mb-6">Try adjusting your search or filters</p>
                  <button
                    onClick={() => setActiveView('write')}
                    className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Write your first entry
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="write"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8"
            >
              {/* Write Entry Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Entry Title
                  </label>
                  <input
                    type="text"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                    placeholder="Give your entry a title..."
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Your Thoughts
                  </label>
                  <textarea
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                    placeholder="How are you feeling today? What's on your mind?"
                    rows={6}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Mood Rating (1-10)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.mood}
                      onChange={(e) => setNewEntry({...newEntry, mood: Number(e.target.value)})}
                      className="flex-1"
                    />
                    <div className={`px-4 py-2 rounded-lg font-bold ${getMoodColor(newEntry.mood)}`}>
                      {newEntry.mood}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Three Things I&apos;m Grateful For
                  </label>
                  <div className="space-y-2">
                    {newEntry.gratitude.map((item, index) => (
                      <input
                        key={index}
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newGratitude = [...newEntry.gratitude];
                          newGratitude[index] = e.target.value;
                          setNewEntry({...newEntry, gratitude: newGratitude});
                        }}
                        placeholder={`Grateful for #${index + 1}...`}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Challenges Today
                    </label>
                    <textarea
                      value={newEntry.challenges}
                      onChange={(e) => setNewEntry({...newEntry, challenges: e.target.value})}
                      placeholder="What was difficult?"
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Wins & Successes
                    </label>
                    <textarea
                      value={newEntry.wins}
                      onChange={(e) => setNewEntry({...newEntry, wins: e.target.value})}
                      placeholder="What went well?"
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Tomorrow&apos;s Intention
                    </label>
                    <textarea
                      value={newEntry.tomorrow}
                      onChange={(e) => setNewEntry({...newEntry, tomorrow: e.target.value})}
                      placeholder="What's your focus for tomorrow?"
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 pt-6 border-t border-neutral-200">
                  <button
                    onClick={() => setActiveView('list')}
                    className="flex-1 py-3 px-4 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors flex items-center justify-center space-x-2"
                  >
                    <X className="w-5 h-5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    disabled={!newEntry.title.trim() || !newEntry.content.trim()}
                    className="flex-1 py-3 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save Entry</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}