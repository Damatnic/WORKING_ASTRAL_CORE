'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { CreateMoodEntryRequest } from '@/types/wellness';
import {
  Heart,
  Smile,
  Meh,
  Frown,
  Save,
  Calendar,
  TrendingUp,
  MessageSquare,
  Plus,
  BarChart3,
  Sun,
  Cloud,
  CloudRain,
  Zap,
  Coffee,
  Bed,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';


interface MoodTrackerProps {
  className?: string;
}

export default function MoodTracker({ className = "" }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [selectedAnxiety, setSelectedAnxiety] = useState<number | null>(null);
  const [selectedSleep, setSelectedSleep] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  const moodEmojis = [
    { value: 1, emoji: '😢', label: 'Very Sad', color: 'text-red-600' },
    { value: 2, emoji: '😕', label: 'Sad', color: 'text-orange-600' },
    { value: 3, emoji: '😐', label: 'Neutral', color: 'text-yellow-600' },
    { value: 4, emoji: '🙂', label: 'Good', color: 'text-blue-600' },
    { value: 5, emoji: '😊', label: 'Happy', color: 'text-green-600' },
    { value: 6, emoji: '😄', label: 'Very Happy', color: 'text-green-700' },
    { value: 7, emoji: '🤩', label: 'Excellent', color: 'text-emerald-600' }
  ];

  const energyLevels = [
    { value: 1, icon: Bed, label: 'Exhausted', color: 'text-red-600' },
    { value: 2, icon: Cloud, label: 'Tired', color: 'text-orange-600' },
    { value: 3, icon: CloudRain, label: 'Low', color: 'text-yellow-600' },
    { value: 4, icon: Sun, label: 'Moderate', color: 'text-blue-600' },
    { value: 5, icon: Coffee, label: 'Energetic', color: 'text-green-600' },
    { value: 6, icon: Zap, label: 'Very High', color: 'text-emerald-600' }
  ];

  const commonTriggers = [
    'Work stress', 'Relationship issues', 'Financial worries', 'Health concerns',
    'Social situations', 'Weather', 'Sleep issues', 'Family problems',
    'Technology', 'News/Media', 'Physical pain', 'Loneliness'
  ];

  const commonActivities = [
    'Exercise', 'Meditation', 'Reading', 'Music', 'Socializing',
    'Nature walk', 'Therapy', 'Journaling', 'Cooking', 'Gaming',
    'Art/Creative', 'Movies/TV', 'Work/Study', 'Cleaning'
  ];

  const { data: session } = useSession();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selectedMood) return;
    if (!session?.user) {
      setErrorMessage('Please sign in to track your mood');
      return;
    }

    setIsTracking(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const entry: CreateMoodEntryRequest = {
      moodScore: selectedMood,
      energyLevel: selectedEnergy || undefined,
      anxietyLevel: selectedAnxiety || undefined,
      sleepQuality: selectedSleep || undefined,
      notes: notes || undefined,
      triggers: selectedTriggers.length > 0 ? selectedTriggers : undefined,
      activities: selectedActivities.length > 0 ? selectedActivities : undefined
    };

    try {
      const response = await fetch('/api/wellness/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Reset form
        setSelectedMood(null);
        setSelectedEnergy(null);
        setSelectedAnxiety(null);
        setSelectedSleep(null);
        setNotes('');
        setSelectedTriggers([]);
        setSelectedActivities([]);
        setSuccessMessage('Mood entry saved successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Trigger refresh of parent components if needed
        if (window.location.pathname.includes('wellness')) {
          // Dispatch custom event that parent components can listen to
          window.dispatchEvent(new CustomEvent('moodEntryAdded'));
        }
      } else {
        throw new Error(data.error || 'Failed to save mood entry');
      }
    } catch (error) {
      console.error('Error saving mood entry:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save mood entry. Please try again.');
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsTracking(false);
    }
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev => 
      prev.includes(trigger) 
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-wellness-mindful/10 rounded-lg p-2 mr-3">
            <Heart className="w-6 h-6 text-wellness-mindful" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Mood Tracker</h2>
            <p className="text-sm text-neutral-600">How are you feeling today?</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-neutral-600">
          <Calendar className="w-4 h-4 mr-1" />
          {new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>

      {/* Mood Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Current Mood *</h3>
        <div className="grid grid-cols-7 gap-2">
          {moodEmojis.map((mood, index) => (
            <motion.button
              key={mood.value}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedMood(mood.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedMood === mood.value
                  ? 'border-wellness-mindful bg-wellness-mindful/10'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="text-2xl mb-1">{mood.emoji}</div>
              <div className="text-xs text-neutral-600">{mood.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Energy Level */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Energy Level</h3>
        <div className="grid grid-cols-6 gap-2">
          {energyLevels.map((energy) => (
            <motion.button
              key={energy.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedEnergy(energy.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedEnergy === energy.value
                  ? 'border-wellness-growth bg-wellness-growth/10'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <energy.icon className={`w-5 h-5 mx-auto mb-1 ${energy.color}`} />
              <div className="text-xs text-neutral-600">{energy.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Anxiety Level */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Anxiety Level</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-neutral-600">Low</span>
          <div className="flex-1 flex space-x-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedAnxiety(level)}
                className={`flex-1 h-3 rounded-full transition-colors ${
                  selectedAnxiety && selectedAnxiety >= level
                    ? 'bg-red-400'
                    : 'bg-neutral-200 hover:bg-neutral-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-600">High</span>
        </div>
      </div>

      {/* Sleep Quality */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Sleep Quality</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-neutral-600">Poor</span>
          <div className="flex-1 flex space-x-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedSleep(level)}
                className={`flex-1 h-3 rounded-full transition-colors ${
                  selectedSleep && selectedSleep >= level
                    ? 'bg-wellness-balanced'
                    : 'bg-neutral-200 hover:bg-neutral-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-600">Great</span>
        </div>
      </div>

      {/* Triggers */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Triggers (optional)</h3>
        <div className="flex flex-wrap gap-2">
          {commonTriggers.map((trigger) => (
            <button
              key={trigger}
              onClick={() => toggleTrigger(trigger)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedTriggers.includes(trigger)
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {trigger}
            </button>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Activities (optional)</h3>
        <div className="flex flex-wrap gap-2">
          {commonActivities.map((activity) => (
            <button
              key={activity}
              onClick={() => toggleActivity(activity)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedActivities.includes(activity)
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Notes (optional)</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How are you feeling? What's on your mind?"
          className="w-full p-3 border border-neutral-300 rounded-lg resize-none focus:ring-2 focus:ring-wellness-mindful/50 focus:border-wellness-mindful"
          rows={3}
          maxLength={500}
        />
        <div className="text-xs text-neutral-500 mt-1">
          {notes.length}/500 characters
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-sm text-green-700 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            {successMessage}
          </p>
        </motion.div>
      )}
      
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-sm text-red-700">{errorMessage}</p>
        </motion.div>
      )}

      {/* Save Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={!selectedMood || isTracking}
        className={`w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all ${
          selectedMood && !isTracking
            ? 'bg-wellness-mindful text-white hover:bg-wellness-mindful/90'
            : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
        }`}
      >
        {isTracking ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
            />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Mood Entry
          </>
        )}
      </motion.button>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <Link href="/wellness/analytics" className="flex items-center justify-center p-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm">
          <BarChart3 className="w-4 h-4 mr-2" />
          View Analytics
        </Link>
        <Link href="/therapy" className="flex items-center justify-center p-2 bg-wellness-growth/10 text-wellness-growth rounded-lg hover:bg-wellness-growth/20 transition-colors text-sm">
          <MessageSquare className="w-4 h-4 mr-2" />
          Get Support
        </Link>
      </div>
    </div>
  );
}