'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Star, 
  Globe, 
  CheckCircle,
  MessageCircle,
  Search
} from 'lucide-react';
import { 
  MentorProfile, 
  MentorshipRequest, 
  SupportTopic,
  MentorPreferences
} from '@/types/community';
import { toast } from 'react-hot-toast';

interface MentorCardProps {
  mentor: MentorProfile & { identity: { displayName: string; avatar: string } };
  onSelect: () => void;
}

function MentorCard({ mentor, onSelect, ...props }: MentorCardProps & { key?: any }) {
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
    >
      {/* Mentor Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xl">
            {mentor.identity.avatar}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {mentor.identity.displayName}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex">{renderStars(mentor.rating)}</div>
              <span className="text-sm text-gray-500">({mentor.reviews.length})</span>
            </div>
          </div>
        </div>
        
        {mentor.verified && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-600 dark:text-green-400">Verified</span>
          </div>
        )}
      </div>

      {/* Specializations */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Specializes in:</p>
        <div className="flex flex-wrap gap-2">
          {mentor.specializations.slice(0, 3).map((topic: SupportTopic, idx: number) => (
            <span 
              key={idx}
              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full"
            >
              {topic.replace(/_/g, ' ')}
            </span>
          ))}
          {mentor.specializations.length > 3 && (
            <span className="text-xs text-gray-500">+{mentor.specializations.length - 3}</span>
          )}
        </div>
      </div>

      {/* Experience & Approach */}
      <div className="mb-4 space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {mentor.experience}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 italic line-clamp-2">
          &quot;{mentor.approach}&quot;
        </p>
      </div>

      {/* Languages */}
      <div className="flex items-center space-x-4 mb-4 text-sm">
        <div className="flex items-center space-x-1 text-gray-500">
          <Globe className="w-4 h-4" />
          <span>{mentor.languages.join(', ')}</span>
        </div>
        <div className="flex items-center space-x-1 text-gray-500">
          <Users className="w-4 h-4" />
          <span>{mentor.currentMentees}/{mentor.maxMentees}</span>
        </div>
      </div>

      {/* Availability Status */}
      <div className="mb-4">
        {mentor.currentMentees < mentor.maxMentees ? (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">Available for mentoring</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-sm">Limited availability</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onSelect}
        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Request Mentorship</span>
      </button>
    </motion.div>
  );
}

export default function MentorshipMatching() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<SupportTopic | 'all'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'find' | 'requests' | 'sessions'>('find');

  // Fetch mentors
  useEffect(() => {
    fetchMentors();
  }, []);

  // Filter mentors
  useEffect(() => {
    let filtered = mentors;

    if (selectedTopic !== 'all') {
      filtered = filtered.filter(m => 
        m.specializations.includes(selectedTopic)
      );
    }

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(m => 
        m.languages.includes(selectedLanguage)
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.experience.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.approach.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by rating and availability
    filtered.sort((a, b) => {
      const aAvailable = a.currentMentees.length < a.maxMentees ? 1 : 0;
      const bAvailable = b.currentMentees.length < b.maxMentees ? 1 : 0;
      
      if (aAvailable !== bAvailable) return bAvailable - aAvailable;
      return b.rating - a.rating;
    });

    setFilteredMentors(filtered);
  }, [mentors, selectedTopic, selectedLanguage, searchQuery]);

  const fetchMentors = async () => {
    try {
      const response = await fetch('/api/community/mentors');
      const data = await response.json();
      setMentors(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
      toast.error('Failed to load mentors');
      setLoading(false);
    }
  };

  const requestMentorship = async (mentorId: string, request: MentorshipRequest) => {
    try {
      const response = await fetch('/api/community/mentorship/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId, ...request }),
      });

      if (response.ok) {
        toast.success('Mentorship request sent successfully!');
        setShowRequestModal(false);
        setSelectedMentor(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Failed to request mentorship:', error);
      toast.error('Failed to send mentorship request');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Peer Mentorship
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with experienced peers who understand your journey
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'find' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Find Mentors
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'requests' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'sessions' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Sessions
          </button>
        </div>

        {activeTab === 'find' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by experience or approach..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Topic Filter */}
                <select
                  value={selectedTopic}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTopic(e.target.value as SupportTopic | 'all')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Topics</option>
                  <option value="anxiety">Anxiety</option>
                  <option value="depression">Depression</option>
                  <option value="stress">Stress</option>
                  <option value="relationships">Relationships</option>
                  <option value="grief">Grief</option>
                  <option value="trauma">Trauma</option>
                  <option value="addiction">Addiction</option>
                </select>

                {/* Language Filter */}
                <select
                  value={selectedLanguage}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLanguage(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Languages</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>

            {/* Mentor Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredMentors.map((mentor) => (
                    <MentorCard
                      key={mentor.id}
                      mentor={mentor}
                      onSelect={() => {
                        setSelectedMentor(mentor);
                        setShowRequestModal(true);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredMentors.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No mentors found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your filters or check back later
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && <MentorshipRequests />}
        {activeTab === 'sessions' && <MentorshipSessions />}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedMentor && (
        <RequestMentorshipModal
          mentor={selectedMentor}
          onSubmit={(request) => requestMentorship(selectedMentor.id, request)}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedMentor(null);
          }}
        />
      )}
    </div>
  );
}

// Request Modal Component
function RequestMentorshipModal({ 
  mentor, 
  onSubmit, 
  onClose 
}: { 
  mentor: any;
  onSubmit: (request: any) => void;
  onClose: () => void;
}) {
  const [topics, setTopics] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>(['']);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState<MentorPreferences>({
    languages: ['en'],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    communicationStyle: 'balanced',
    sessionFrequency: 'weekly',
    preferredTimes: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (topics.length === 0) {
      toast.error('Please select at least one topic');
      return;
    }
    
    if (goals.filter(g => g.trim()).length === 0) {
      toast.error('Please add at least one goal');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please write a message to the mentor');
      return;
    }

    onSubmit({
      topics,
      goals: goals.filter(g => g.trim()),
      urgency,
      message,
      preferences,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Request Mentorship
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              from {mentor.identity.displayName}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Topics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What topics would you like help with?
              </label>
              <div className="flex flex-wrap gap-2">
                {mentor.specializations.map((topic: string) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setTopics(prev => 
                        prev.includes(topic) 
                          ? prev.filter(t => t !== topic)
                          : [...prev, topic]
                      );
                    }}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      topics.includes(topic)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {topic.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What are your goals for this mentorship?
              </label>
              <div className="space-y-2">
                {goals.map((goal, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={goal}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newGoals = [...goals];
                      newGoals[idx] = e.target.value;
                      setGoals(newGoals);
                    }}
                    placeholder={`Goal ${idx + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                ))}
                {goals.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setGoals([...goals, ''])}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                  >
                    + Add another goal
                  </button>
                )}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How urgent is your need for support?
              </label>
              <div className="flex space-x-4">
                {(['low', 'medium', 'high'] as const).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      urgency === level
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message to mentor
              </label>
              <textarea
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Introduce yourself and explain why you'd like this mentor's support..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Communication style preference
              </label>
              <select
                value={preferences.communicationStyle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreferences({
                  ...preferences,
                  communicationStyle: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="supportive">Supportive & Gentle</option>
                <option value="direct">Direct & Practical</option>
                <option value="balanced">Balanced Approach</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t dark:border-gray-700 flex space-x-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              Send Request
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Placeholder components
function MentorshipRequests() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        My Mentorship Requests
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Your mentorship requests will appear here
      </p>
    </div>
  );
}

function MentorshipSessions() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Upcoming Sessions
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Your scheduled mentorship sessions will appear here
      </p>
    </div>
  );
}