'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Target,
  Zap,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  Award,
  Star,
  Heart,
  Sparkles,
  CheckCircle,
  Gift,
  Crown,
  Medal,
  BarChart3,
  Timer,
  Flame
} from 'lucide-react';
import {
  WellnessChallenge,
  Reward,
  AnonymousUser,
  ChallengeType
} from '@/types/community';

interface WellnessChallengesProps {
  currentUser?: AnonymousUser;
  onJoinChallenge?: (challengeId: string) => void;
  onCompleteGoal?: (challengeId: string, goalId: string) => void;
}

const WellnessChallenges: React.FC<WellnessChallengesProps> = ({
  currentUser,
  onJoinChallenge,
  onCompleteGoal
}: WellnessChallengesProps) => {
  const [challenges, setChallenges] = useState<WellnessChallenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Set<string>>(new Set());
  const [selectedChallenge, setSelectedChallenge] = useState<WellnessChallenge | null>(null);
  const [filterType, setFilterType] = useState<ChallengeType | 'all'>('all');
  const [userProgress, setUserProgress] = useState<Map<string, number>>(new Map());
  const [userRewards, setUserRewards] = useState<Reward[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Challenge type information
  const challengeTypeInfo: Record<ChallengeType, { color: string; icon: React.ReactNode; description: string }> = {
    'mindfulness': {
      color: 'bg-purple-500',
      icon: <Sparkles className="w-5 h-5" />,
      description: 'Meditation and awareness'
    },
    'gratitude': {
      color: 'bg-pink-500',
      icon: <Heart className="w-5 h-5" />,
      description: 'Appreciation and positivity'
    },
    'exercise': {
      color: 'bg-green-500',
      icon: <Zap className="w-5 h-5" />,
      description: 'Physical movement'
    },
    'sleep': {
      color: 'bg-blue-500',
      icon: <Clock className="w-5 h-5" />,
      description: 'Rest and recovery'
    },
    'social-connection': {
      color: 'bg-orange-500',
      icon: <Users className="w-5 h-5" />,
      description: 'Building relationships'
    },
    'creativity': {
      color: 'bg-yellow-500',
      icon: <Star className="w-5 h-5" />,
      description: 'Creative expression'
    },
    'nutrition': {
      color: 'bg-teal-500',
      icon: <Target className="w-5 h-5" />,
      description: 'Healthy eating'
    },
    'self-care': {
      color: 'bg-indigo-500',
      icon: <Heart className="w-5 h-5" />,
      description: 'Personal wellness'
    }
  };

  useEffect(() => {
    loadChallenges();
    loadUserData();
  }, [filterType]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/wellness/challenges?type=${filterType}&active=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch wellness challenges');
      }
      
      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [streakResponse, challengesResponse, progressResponse, rewardsResponse] = await Promise.all([
        fetch('/api/wellness/user/streak'),
        fetch('/api/wellness/user/challenges'),
        fetch('/api/wellness/user/progress'),
        fetch('/api/wellness/user/rewards')
      ]);

      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        setStreakCount(streakData.streak || 0);
      }

      if (challengesResponse.ok) {
        const challengesData = await challengesResponse.json();
        setUserChallenges(new Set(challengesData.challengeIds || []));
      }

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        const progressMap = new Map();
        (progressData.progress || []).forEach((p: any) => {
          progressMap.set(p.challengeId, p.progress);
        });
        setUserProgress(progressMap);
      }

      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json();
        setUserRewards(rewardsData.rewards || []);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleJoinChallenge = async (challenge: WellnessChallenge) => {
    try {
      const response = await fetch('/api/wellness/challenges/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeId: challenge.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to join challenge');
      }

      // Update local state
      setUserChallenges(prev => new Set([...prev, challenge.id]));
      setUserProgress(prev => new Map([...prev, [challenge.id, 0]]));
      
      // Update participant count
      setChallenges(prev => prev.map(c => {
        if (c.id === challenge.id) {
          c.participants.push({
            sessionId: currentUser?.sessionId || 'anonymous',
            nickname: currentUser?.nickname || 'Anonymous',
            progress: 0,
            joinedAt: new Date(),
            lastActivity: new Date(),
            completedGoals: []
          });
        }
        return c;
      }));
      
      onJoinChallenge?.(challenge.id);
    } catch (error) {
      console.error('Failed to join challenge:', error);
    }
  };

  const handleCompleteGoal = async (challengeId: string, goalId: string) => {
    try {
      const response = await fetch('/api/wellness/challenges/complete-goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeId,
          goalId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete goal');
      }

      const data = await response.json();
      
      // Update user progress with actual progress from API
      setUserProgress(prev => {
        return new Map([...prev, [challengeId, data.newProgress || 0]]);
      });
      
      onCompleteGoal?.(challengeId, goalId);
    } catch (error) {
      console.error('Failed to complete goal:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-500';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-yellow-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Wellness Challenges
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            Join community challenges, build healthy habits, and earn rewards on your wellness journey
          </p>
          
          {/* User Stats Bar */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Flame className="w-5 h-5" />
                  <span className="text-3xl font-bold">{streakCount}</span>
                </div>
                <p className="text-sm opacity-90">Day Streak</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-3xl font-bold">{userChallenges.size}</span>
                </div>
                <p className="text-sm opacity-90">Active Challenges</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="w-5 h-5" />
                  <span className="text-3xl font-bold">{userRewards.length}</span>
                </div>
                <p className="text-sm opacity-90">Rewards Earned</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-3xl font-bold">247</span>
                </div>
                <p className="text-sm opacity-90">Community Members</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-8"
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Challenges
            </button>
            {Object.entries(challengeTypeInfo).map(([type, info]) => (
              <button
                key={type}
                onClick={() => setFilterType(type as ChallengeType)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                  filterType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {info.icon}
                {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AnimatePresence mode="popLayout">
            {challenges.map((challenge, index) => {
              const isJoined = userChallenges.has(challenge.id);
              const progress = userProgress.get(challenge.id) || 0;
              const daysRemaining = Math.ceil(
                (new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              
              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden
                           hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Challenge Header */}
                  <div className={`h-2 ${challengeTypeInfo[challenge.type].color}`} />
                  
                  <div className="p-6">
                    {/* Title and Badges */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {challenge.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                            {challenge.difficulty}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {challenge.duration} days
                          </span>
                          {daysRemaining <= 3 && daysRemaining > 0 && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Ending soon!
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg ${challengeTypeInfo[challenge.type].color} text-white`}>
                        {challengeTypeInfo[challenge.type].icon}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {challenge.description}
                    </p>

                    {/* Goals Preview */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Daily Goals:
                      </h4>
                      <div className="space-y-1">
                        {challenge.goals.slice(0, 2).map((goal) => (
                          <div key={goal.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {goal.title} (+{goal.points} pts)
                            </span>
                          </div>
                        ))}
                        {challenge.goals.length > 2 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{challenge.goals.length - 2} more goals
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Community Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Community Progress
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {challenge.communityProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${challenge.communityProgress}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        />
                      </div>
                    </div>

                    {/* User Progress (if joined) */}
                    {isJoined && (
                      <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            Your Progress
                          </span>
                          <span className="text-sm font-bold text-purple-900 dark:text-purple-100">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="bg-purple-600 h-2 rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Participants and Rewards */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{challenge.participants.length} joined</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Gift className="w-4 h-4" />
                          <span>{challenge.rewards.length} rewards</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Timer className="w-4 h-4" />
                        <span>{daysRemaining} days left</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      {isJoined ? (
                        <button
                          onClick={() => setSelectedChallenge(challenge)}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                                   font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinChallenge(challenge)}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                                   text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          Join Challenge
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Rewards Section */}
        {userRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              Your Rewards
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {userRewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div className={`w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br ${getRarityColor(reward.rarity)} 
                                p-4 flex items-center justify-center text-white shadow-lg`}>
                    {reward.type === 'badge' && <Medal className="w-10 h-10" />}
                    {reward.type === 'achievement' && <Trophy className="w-10 h-10" />}
                    {reward.type === 'milestone' && <Star className="w-10 h-10" />}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {reward.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {reward.rarity}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Challenge Detail Modal */}
        <AnimatePresence>
          {selectedChallenge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedChallenge(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              >
                <div className={`h-3 ${challengeTypeInfo[selectedChallenge.type].color}`} />
                
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {selectedChallenge.title}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getDifficultyColor(selectedChallenge.difficulty)}`}>
                          {selectedChallenge.difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {selectedChallenge.duration} days
                        </span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          {selectedChallenge.participants.length} participants
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedChallenge(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                    {selectedChallenge.description}
                  </p>

                  {/* Goals Section */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Challenge Goals
                    </h3>
                    <div className="space-y-3">
                      {selectedChallenge.goals.map((goal) => {
                        const isCompleted = false; // Check if user completed this goal
                        
                        return (
                          <div
                            key={goal.id}
                            className={`p-4 rounded-lg border ${
                              isCompleted 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  isCompleted 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                }`}>
                                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {goal.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {goal.description}
                                  </p>
                                  {goal.repeatable && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                                        {goal.frequency}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                  +{goal.points}
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                              </div>
                            </div>
                            {userChallenges.has(selectedChallenge.id) && !isCompleted && (
                              <button
                                onClick={() => handleCompleteGoal(selectedChallenge.id, goal.id)}
                                className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                                         text-sm font-medium transition-colors"
                              >
                                Mark as Complete
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rewards Section */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Rewards
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedChallenge.rewards.map((reward) => (
                        <div
                          key={reward.id}
                          className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 
                                   dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                        >
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRarityColor(reward.rarity)} 
                                        p-3 flex items-center justify-center text-white shadow-lg`}>
                            {reward.type === 'badge' && <Medal className="w-8 h-8" />}
                            {reward.type === 'achievement' && <Trophy className="w-8 h-8" />}
                            {reward.type === 'milestone' && <Star className="w-8 h-8" />}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {reward.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {reward.description}
                            </p>
                            <span className={`text-xs font-medium ${
                              reward.rarity === 'legendary' ? 'text-yellow-600' :
                              reward.rarity === 'epic' ? 'text-purple-600' :
                              reward.rarity === 'rare' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {reward.rarity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard Preview */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Top Participants
                    </h3>
                    <div className="space-y-2">
                      {selectedChallenge.participants
                        .sort((a, b) => b.progress - a.progress)
                        .slice(0, 5)
                        .map((participant, index) => (
                          <div
                            key={participant.sessionId}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold ${
                                index === 0 ? 'text-yellow-500' :
                                index === 1 ? 'text-gray-400' :
                                index === 2 ? 'text-orange-600' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                #{index + 1}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {participant.nickname}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {participant.progress}%
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {participant.completedGoals.length} goals
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {userChallenges.has(selectedChallenge.id) ? (
                      <button
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                                 text-white rounded-lg font-medium transition-all duration-200"
                      >
                        Continue Challenge
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleJoinChallenge(selectedChallenge);
                          setSelectedChallenge(null);
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                                 text-white rounded-lg font-medium transition-all duration-200"
                      >
                        Join This Challenge
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {challenges.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No challenges available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back soon for new wellness challenges!
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WellnessChallenges;