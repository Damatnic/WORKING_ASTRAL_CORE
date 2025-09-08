'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PencilSquareIcon, 
  BookOpenIcon,
  CalendarIcon,
  TagIcon,
  MagnifyingGlassIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  HeartIcon,
  SparklesIcon,
  CloudIcon,
  SunIcon,
  FireIcon,
  ArchiveBoxIcon,
  EyeIcon,
  TrashIcon,
  PlusIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import ReflectionPrompts from './ReflectionPrompts';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: 'great' | 'good' | 'neutral' | 'difficult' | 'challenging';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

interface PersonalJournalProps {
  className?: string;
}

const moodEmojis = {
  great: { icon: SunIcon, color: 'text-yellow-500', label: 'Great' },
  good: { icon: FaceSmileIcon, color: 'text-green-500', label: 'Good' },
  neutral: { icon: CloudIcon, color: 'text-gray-500', label: 'Neutral' },
  difficult: { icon: FaceFrownIcon, color: 'text-orange-500', label: 'Difficult' },
  challenging: { icon: FireIcon, color: 'text-red-500', label: 'Challenging' }
};

const journalPrompts = [
  "What am I grateful for today?",
  "How did I grow or learn today?",
  "What emotions did I experience today?",
  "What challenged me and how did I handle it?",
  "What brought me joy today?",
  "What would I like to release or let go of?",
  "What are my hopes for tomorrow?",
  "How did I show kindness to myself or others?",
  "What patterns do I notice in my thoughts?",
  "What would I tell a friend in my situation?"
];

export default function PersonalJournal({ className = "" }: PersonalJournalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'prompts'>('entries');
  
  // New entry form state
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 'neutral' as JournalEntry['mood'],
    tags: [] as string[],
    newTag: ''
  });

  useEffect(() => {
    // Load entries from localStorage
    const saved = localStorage.getItem('journal-entries');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed.map((entry: any) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt)
      })));
    }
  }, []);

  const saveEntries = (updatedEntries: JournalEntry[]) => {
    localStorage.setItem('journal-entries', JSON.stringify(updatedEntries));
    setEntries(updatedEntries);
  };

  const handleSaveEntry = () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      title: newEntry.title.trim(),
      content: newEntry.content.trim(),
      mood: newEntry.mood,
      tags: newEntry.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false
    };

    const updatedEntries = [entry, ...entries];
    saveEntries(updatedEntries);

    setNewEntry({
      title: '',
      content: '',
      mood: 'neutral',
      tags: [],
      newTag: ''
    });
    setIsWriting(false);
    setCurrentPrompt('');
  };

  const handleAddTag = () => {
    if (newEntry.newTag.trim() && !newEntry.tags.includes(newEntry.newTag.trim())) {
      setNewEntry(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ''
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewEntry(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleDeleteEntry = (entryId: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== entryId);
    saveEntries(updatedEntries);
    setSelectedEntry(null);
  };

  const handleArchiveEntry = (entryId: string) => {
    const updatedEntries = entries.map(entry =>
      entry.id === entryId ? { ...entry, isArchived: !entry.isArchived } : entry
    );
    saveEntries(updatedEntries);
  };

  const getRandomPrompt = () => {
    const randomPrompt = journalPrompts[Math.floor(Math.random() * journalPrompts.length)];
    setCurrentPrompt(randomPrompt);
  };

  const handlePromptSelect = (prompt: string) => {
    setCurrentPrompt(prompt);
    setIsWriting(true);
    setActiveTab('entries');
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter;
    const matchesTag = selectedTagFilter === 'all' || entry.tags.includes(selectedTagFilter);
    
    return matchesSearch && matchesMood && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(entries.flatMap(entry => entry.tags)));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BookOpenIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personal Journal</h1>
            <p className="text-gray-600">Reflect, grow, and track your journey</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(activeTab === 'prompts' ? 'entries' : 'prompts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'prompts'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            }`}
          >
            <AcademicCapIcon className="w-5 h-5" />
            <span>{activeTab === 'prompts' ? 'View Entries' : 'Get Prompts'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsWriting(true);
              setActiveTab('entries');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Entry</span>
          </motion.button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'prompts' ? (
        <ReflectionPrompts onSelectPrompt={handlePromptSelect} />
      ) : (
        <>
        </>
      )}

      {/* Search and Filters */}
      {activeTab === 'entries' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <select
          value={selectedMoodFilter}
          onChange={(e) => setSelectedMoodFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Moods</option>
          {Object.entries(moodEmojis).map(([mood, config]) => (
            <option key={mood} value={mood}>{config.label}</option>
          ))}
        </select>

        <select
          value={selectedTagFilter}
          onChange={(e) => setSelectedTagFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>
      )}

      {/* Writing Interface */}
      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">New Journal Entry</h3>
                <button
                  onClick={getRandomPrompt}
                  className="flex items-center space-x-2 px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>Get Prompt</span>
                </button>
              </div>

              {currentPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-purple-50 p-4 rounded-lg border border-purple-200"
                >
                  <p className="text-purple-800 font-medium">{currentPrompt}</p>
                </motion.div>
              )}

              <input
                type="text"
                placeholder="Entry title..."
                value={newEntry.title}
                onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 text-lg font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />

              <textarea
                placeholder="What's on your mind today? Write freely about your thoughts, feelings, experiences, or anything you'd like to reflect on..."
                value={newEntry.content}
                onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />

              {/* Mood Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">How are you feeling?</label>
                <div className="flex space-x-3">
                  {Object.entries(moodEmojis).map(([mood, config]) => {
                    const IconComponent = config.icon;
                    return (
                      <button
                        key={mood}
                        onClick={() => setNewEntry(prev => ({ ...prev, mood: mood as JournalEntry['mood'] }))}
                        className={`flex flex-col items-center space-y-1 p-3 rounded-lg border-2 transition-colors ${
                          newEntry.mood === mood
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <IconComponent className={`w-6 h-6 ${config.color}`} />
                        <span className="text-xs text-gray-600">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {newEntry.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={newEntry.newTag}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, newTag: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveEntry}
                  disabled={!newEntry.title.trim() || !newEntry.content.trim()}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Save Entry
                </motion.button>
                <button
                  onClick={() => {
                    setIsWriting(false);
                    setCurrentPrompt('');
                    setNewEntry({
                      title: '',
                      content: '',
                      mood: 'neutral',
                      tags: [],
                      newTag: ''
                    });
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries Grid */}
      {activeTab === 'entries' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredEntries.map((entry) => {
            const MoodIcon = moodEmojis[entry.mood].icon;
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                  entry.isArchived ? 'opacity-60' : ''
                }`}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <MoodIcon className={`w-5 h-5 ${moodEmojis[entry.mood].color}`} />
                      <span className="text-xs text-gray-500">
                        {format(entry.createdAt, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {entry.isArchived && (
                      <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                    {entry.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                    {entry.content}
                  </p>

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{entry.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}

      {activeTab === 'entries' && filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedMoodFilter !== 'all' || selectedTagFilter !== 'all'
              ? 'Try adjusting your search filters'
              : 'Start your journaling journey by creating your first entry'
            }
          </p>
          {!searchQuery && selectedMoodFilter === 'all' && selectedTagFilter === 'all' && (
            <button
              onClick={() => setIsWriting(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create First Entry
            </button>
          )}
        </div>
      )}

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${moodEmojis[selectedEntry.mood].color.replace('text-', 'bg-').replace('-500', '-100')}`}>
                      {(() => {
                        const MoodIcon = moodEmojis[selectedEntry.mood].icon;
                        return <MoodIcon className={`w-6 h-6 ${moodEmojis[selectedEntry.mood].color}`} />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedEntry.title}</h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{format(selectedEntry.createdAt, 'MMMM dd, yyyy')}</span>
                        <span>{moodEmojis[selectedEntry.mood].label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleArchiveEntry(selectedEntry.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ArchiveBoxIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(selectedEntry.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96">
                <div className="prose prose-gray max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {selectedEntry.content}
                  </p>
                </div>

                {selectedEntry.tags.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.tags.map(tag => (
                        <span
                          key={tag}
                          className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          <TagIcon className="w-3 h-3" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}