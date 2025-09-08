'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon,
  LightBulbIcon,
  HeartIcon,
  BeakerIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  CloudIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ReflectionPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

const promptCategories = {
  gratitude: {
    title: 'Gratitude & Appreciation',
    icon: HeartIcon,
    color: 'bg-pink-100 text-pink-600',
    prompts: [
      "What are three things I'm grateful for today?",
      "Who in my life am I most thankful for and why?",
      "What simple pleasure brought me joy recently?",
      "What challenge am I grateful to have overcome?",
      "What skill or ability am I thankful to have?",
      "What moment from today made me smile?",
      "What opportunity am I grateful for right now?",
      "What lesson am I thankful to have learned?",
      "What aspect of my health am I grateful for?",
      "What memory am I grateful to have?"
    ]
  },
  growth: {
    title: 'Growth & Learning',
    icon: BeakerIcon,
    color: 'bg-green-100 text-green-600',
    prompts: [
      "How did I grow as a person today?",
      "What new thing did I learn recently?",
      "What mistake did I make and what did I learn from it?",
      "How have I changed in the past month?",
      "What skill would I like to develop?",
      "What feedback have I received that I can use?",
      "What pattern in my behavior do I want to change?",
      "What would I tell my younger self?",
      "What challenge taught me something valuable?",
      "How can I step out of my comfort zone tomorrow?"
    ]
  },
  emotions: {
    title: 'Emotions & Feelings',
    icon: CloudIcon,
    color: 'bg-blue-100 text-blue-600',
    prompts: [
      "What emotions did I experience today?",
      "What triggered my strongest emotional reaction today?",
      "How did I handle difficult feelings today?",
      "What emotion am I avoiding right now?",
      "When did I feel most at peace today?",
      "What emotion would I like to feel more of?",
      "How do my emotions affect my decisions?",
      "What helps me process difficult emotions?",
      "When do I feel most confident?",
      "What emotion am I ready to release?"
    ]
  },
  relationships: {
    title: 'Relationships & Connection',
    icon: StarIcon,
    color: 'bg-purple-100 text-purple-600',
    prompts: [
      "How did I connect with someone meaningful today?",
      "What relationship do I want to invest more in?",
      "How did I show kindness to someone today?",
      "What conversation had the biggest impact on me?",
      "How can I be a better friend/partner/family member?",
      "What boundaries do I need to set or maintain?",
      "Who do I need to forgive (including myself)?",
      "How do I want to be remembered by others?",
      "What quality do I admire in someone close to me?",
      "How can I show more appreciation to those I love?"
    ]
  },
  purpose: {
    title: 'Purpose & Direction',
    icon: LightBulbIcon,
    color: 'bg-yellow-100 text-yellow-600',
    prompts: [
      "What gives my life meaning?",
      "How did I live according to my values today?",
      "What legacy do I want to leave?",
      "What would I do if I couldn't fail?",
      "What cause or mission feels important to me?",
      "How can I make a positive difference?",
      "What does success mean to me personally?",
      "What would my ideal day look like?",
      "What am I uniquely positioned to contribute?",
      "What steps can I take toward my dreams?"
    ]
  },
  selfcare: {
    title: 'Self-Care & Wellness',
    icon: SunIcon,
    color: 'bg-orange-100 text-orange-600',
    prompts: [
      "How did I take care of myself today?",
      "What does my body need right now?",
      "What activity makes me feel most energized?",
      "How can I be more compassionate with myself?",
      "What boundary do I need to set for my wellbeing?",
      "What habit would improve my daily life?",
      "When do I feel most relaxed and at ease?",
      "What self-care practice am I neglecting?",
      "How can I honor my needs tomorrow?",
      "What would perfect self-care look like for me?"
    ]
  },
  dreams: {
    title: 'Dreams & Aspirations',
    icon: MoonIcon,
    color: 'bg-indigo-100 text-indigo-600',
    prompts: [
      "What dream am I working toward?",
      "What would I attempt if I had unlimited resources?",
      "What adventure do I want to go on?",
      "What creative project excites me?",
      "Where do I see myself in five years?",
      "What skill would I love to master?",
      "What fear is holding me back from my dreams?",
      "What small step can I take toward my goals?",
      "What would my dream life feel like?",
      "What inspiration am I drawn to right now?"
    ]
  }
};

export default function ReflectionPrompts({ onSelectPrompt, className = "" }: ReflectionPromptsProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [randomPrompt, setRandomPrompt] = useState<string>('');

  const getRandomPrompt = () => {
    const allPrompts = Object.values(promptCategories).flatMap(category => category.prompts);
    const randomIndex = Math.floor(Math.random() * allPrompts.length);
    const prompt = allPrompts[randomIndex];
    setRandomPrompt(prompt);
    return prompt;
  };

  const handleRandomPrompt = () => {
    const prompt = getRandomPrompt();
    onSelectPrompt(prompt);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Reflection Prompts</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Find inspiration for your journaling with thoughtful prompts
        </p>
      </div>

      {/* Random Prompt Generator */}
      <motion.div
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100"
      >
        <div className="text-center space-y-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRandomPrompt}
            className="flex items-center space-x-2 mx-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            <span>Get Random Prompt</span>
          </motion.button>
          
          <AnimatePresence mode="wait">
            {randomPrompt && (
              <motion.p
                key={randomPrompt}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-purple-800 font-medium text-center max-w-2xl mx-auto"
              >
                &ldquo;{randomPrompt}&rdquo;
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(promptCategories).map(([key, category]) => {
          const IconComponent = category.icon;
          const isActive = activeCategory === key;
          
          return (
            <motion.div
              key={key}
              className="space-y-3"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(isActive ? null : key)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-purple-300 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{category.title}</h4>
                    <p className="text-sm text-gray-600">{category.prompts.length} prompts</p>
                  </div>
                </div>
              </motion.button>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {category.prompts.map((prompt, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => onSelectPrompt(prompt)}
                        className="w-full text-left p-3 text-sm text-gray-700 bg-white rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-colors"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h4 className="font-medium text-blue-900 mb-3">💡 Journaling Tips</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Write freely without worrying about grammar or structure</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Be honest and authentic with your thoughts and feelings</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Use prompts as starting points, let your thoughts flow naturally</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Set aside regular time for reflection, even if just 5 minutes</span>
          </li>
        </ul>
      </div>
    </div>
  );
}