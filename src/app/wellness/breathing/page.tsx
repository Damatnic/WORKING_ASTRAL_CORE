/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowLeft,
  Wind,
  Heart,
  Brain,
  Timer,
  Volume2,
  VolumeX,
  HelpCircle,
  Lightbulb,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function BreathingPage() {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [timeLeft, setTimeLeft] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [totalCycles, setTotalCycles] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const breathingExercises = [
    {
      id: '4-7-8',
      name: '4-7-8 Breathing',
      description: 'A calming technique that helps reduce anxiety and promote sleep',
      pattern: { inhale: 4, hold: 7, exhale: 8, pause: 0 },
      benefits: ['Reduces anxiety', 'Promotes better sleep', 'Lowers stress'],
      color: 'bg-blue-500'
    },
    {
      id: 'box',
      name: 'Box Breathing',
      description: 'Equal timing for all phases, great for focus and calm',
      pattern: { inhale: 4, hold: 4, exhale: 4, pause: 4 },
      benefits: ['Improves focus', 'Balances nervous system', 'Reduces stress'],
      color: 'bg-green-500'
    },
    {
      id: 'triangle',
      name: 'Triangle Breathing',
      description: 'Simple pattern perfect for beginners',
      pattern: { inhale: 4, hold: 4, exhale: 4, pause: 0 },
      benefits: ['Easy for beginners', 'Quick stress relief', 'Centering'],
      color: 'bg-purple-500'
    },
    {
      id: 'coherent',
      name: 'Coherent Breathing',
      description: '5-second inhale and exhale for heart rate variability',
      pattern: { inhale: 5, hold: 0, exhale: 5, pause: 0 },
      benefits: ['Heart rate variability', 'Emotional balance', 'Sustained calm'],
      color: 'bg-wellness-mindful'
    }
  ];

  const currentExercise = breathingExercises.find(ex => ex.id === selectedExercise);

  useEffect(() => {
    if (isActive && currentExercise) {
      const pattern = currentExercise.pattern;
      const phases: Array<{ name: 'inhale' | 'hold' | 'exhale' | 'pause', duration: number }> = [
        { name: 'inhale', duration: pattern.inhale },
        ...(pattern.hold > 0 ? [{ name: 'hold' as const, duration: pattern.hold }] : []),
        { name: 'exhale', duration: pattern.exhale },
        ...(pattern.pause > 0 ? [{ name: 'pause' as const, duration: pattern.pause }] : [])
      ];

      let currentPhaseIndex = phases.findIndex(p => p.name === phase);
      let currentTime = timeLeft;

      intervalRef.current = setInterval(() => {
        currentTime--;
        setTimeLeft(currentTime);

        if (currentTime <= 0) {
          currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
          if (currentPhaseIndex === 0) {
            setCycle(prev => prev + 1);
            if (cycle + 1 >= totalCycles) {
              setIsActive(false);
              setPhase('inhale');
              setCycle(0);
              setTimeLeft(phases[0]?.duration ?? 4);
              return;
            }
          }
          const nextPhase = phases[currentPhaseIndex];
          if (nextPhase) {
            setPhase(nextPhase.name);
            currentTime = nextPhase.duration;
          }
          setTimeLeft(currentTime);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, phase, timeLeft, cycle, totalCycles, currentExercise]);

  const startExercise = (exerciseId: string) => {
    const exercise = breathingExercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      setSelectedExercise(exerciseId);
      setPhase('inhale');
      setTimeLeft(exercise.pattern.inhale);
      setCycle(0);
      setIsActive(true);
    }
  };

  const pauseResume = () => {
    setIsActive(!isActive);
  };

  const reset = () => {
    setIsActive(false);
    setPhase('inhale');
    setCycle(0);
    if (currentExercise) {
      setTimeLeft(currentExercise.pattern.inhale);
    }
  };

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'pause': return 'Pause';
      default: return 'Breathe';
    }
  };

  const getBreathingCircleScale = () => {
    if (!isActive) return 1;
    switch (phase) {
      case 'inhale': return 1.5;
      case 'hold': return 1.5;
      case 'exhale': return 1;
      case 'pause': return 1;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-calm/20 via-white to-wellness-mindful/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center mb-8"
          >
            <Link href="/wellness" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-neutral-600 hover:text-neutral-800 transition-colors" />
            </Link>
            <div className="flex items-center">
              <div className="bg-wellness-calm rounded-full p-3 mr-4">
                <Wind className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-800">Breathing Exercises</h1>
                <p className="text-neutral-600">Guided breathing for relaxation and focus</p>
              </div>
            </div>
          </motion.div>

          {!selectedExercise ? (
            /* Exercise Selection */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-neutral-800 mb-8 text-center">
                Choose a Breathing Exercise
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {breathingExercises.map((exercise, index) => (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300 cursor-pointer"
                    onClick={() => startExercise(exercise.id)}
                  >
                    <div className={`${exercise.color} rounded-full p-3 w-fit mb-4`}>
                      <Wind className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-neutral-800 mb-3">
                      {exercise.name}
                    </h3>
                    
                    <p className="text-neutral-600 mb-4">
                      {exercise.description}
                    </p>
                    
                    <div className="mb-4">
                      <div className="text-sm font-medium text-neutral-700 mb-2">Pattern:</div>
                      <div className="text-sm text-neutral-600">
                        Inhale {exercise.pattern.inhale}s
                        {exercise.pattern.hold > 0 && ` → Hold ${exercise.pattern.hold}s`}
                        → Exhale {exercise.pattern.exhale}s
                        {exercise.pattern.pause > 0 && ` → Pause ${exercise.pattern.pause}s`}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm font-medium text-neutral-700 mb-2">Benefits:</div>
                      <div className="flex flex-wrap gap-1">
                        {exercise.benefits.map((benefit, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full"
                          >
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button className="w-full flex items-center justify-center px-4 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors">
                      <Play className="w-5 h-5 mr-2" />
                      Start Exercise
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Breathing Interface */
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                {/* Exercise Info */}
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-8">
                  <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                    {currentExercise?.name}
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    Cycle {cycle + 1} of {totalCycles}
                  </p>
                  
                  {/* Breathing Circle */}
                  <div className="relative mb-8">
                    <motion.div
                      animate={{
                        scale: getBreathingCircleScale(),
                      }}
                      transition={{
                        duration: currentExercise ? (
                          phase === 'inhale' ? currentExercise.pattern.inhale :
                          phase === 'hold' ? currentExercise.pattern.hold :
                          phase === 'exhale' ? currentExercise.pattern.exhale :
                          currentExercise.pattern.pause
                        ) : 4,
                        ease: "easeInOut"
                      }}
                      className={`w-48 h-48 mx-auto rounded-full ${
                        phase === 'inhale' ? 'bg-blue-400' :
                        phase === 'hold' ? 'bg-purple-400' :
                        phase === 'exhale' ? 'bg-green-400' :
                        'bg-gray-400'
                      } flex items-center justify-center shadow-2xl`}
                    >
                      <div className="text-white text-center">
                        <div className="text-2xl font-bold mb-2">
                          {getPhaseInstruction()}
                        </div>
                        <div className="text-4xl font-mono">
                          {timeLeft}
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center gap-4 mb-6">
                    <button
                      onClick={pauseResume}
                      className={`flex items-center px-6 py-3 ${
                        isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                      } text-white rounded-xl font-semibold transition-colors`}
                    >
                      {isActive ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 mr-2" />
                          Resume
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={reset}
                      className="flex items-center px-6 py-3 bg-neutral-500 text-white rounded-xl font-semibold hover:bg-neutral-600 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Reset
                    </button>
                  </div>

                  {/* Settings */}
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center">
                      <label className="mr-2 text-neutral-600">Cycles:</label>
                      <select
                        value={totalCycles}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTotalCycles(Number(e.target.value))}
                        className="border border-neutral-200 rounded px-2 py-1"
                        disabled={isActive}
                      >
                        {[3, 5, 10, 15, 20].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`flex items-center px-3 py-1 rounded ${
                        soundEnabled ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedExercise(null)}
                  className="text-primary-600 hover:text-primary-700 transition-colors"
                >
                  ← Choose Different Exercise
                </button>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Guidance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 bg-gradient-to-r from-wellness-calm/10 to-wellness-mindful/10 rounded-2xl p-8"
          >
            <div className="flex items-center mb-6">
              <HelpCircle className="w-6 h-6 text-wellness-calm mr-3" />
              <h3 className="text-2xl font-bold text-neutral-800">Breathing Exercise Guide</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 text-wellness-balanced mr-2" />
                  Getting Started
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Find a comfortable position:</strong>
                      <span className="text-neutral-600"> Sit upright or lie down in a quiet, comfortable space</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Start slow:</strong>
                      <span className="text-neutral-600"> Begin with 3-5 cycles and gradually increase as you get comfortable</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Focus on your breath:</strong>
                      <span className="text-neutral-600"> Pay attention to the sensation of air entering and leaving your body</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-wellness-growth mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-neutral-800">Be patient:</strong>
                      <span className="text-neutral-600"> It's normal for your mind to wander - gently return focus to your breath</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 text-primary-500 mr-2" />
                  Exercise Selection Guide
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">For Anxiety & Stress</h5>
                    <p className="text-neutral-600 text-sm">
                      Try <strong>4-7-8 Breathing</strong> - The extended exhale activates your parasympathetic nervous system, promoting calm.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">For Focus & Concentration</h5>
                    <p className="text-neutral-600 text-sm">
                      Use <strong>Box Breathing</strong> - The equal timing helps balance your nervous system and improve mental clarity.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">For Beginners</h5>
                    <p className="text-neutral-600 text-sm">
                      Start with <strong>Triangle Breathing</strong> - Simple pattern that's easy to follow and build habits with.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-neutral-200">
                    <h5 className="font-medium text-neutral-800 mb-2">For Heart Health</h5>
                    <p className="text-neutral-600 text-sm">
                      Practice <strong>Coherent Breathing</strong> - 5-second cycles improve heart rate variability and cardiovascular health.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Safety & Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-yellow-800 mb-2">Safety Notes</h5>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Stop if you feel dizzy or lightheaded</li>
                    <li>• Don't force your breath - let it flow naturally within the pattern</li>
                    <li>• Consult your doctor if you have respiratory conditions</li>
                    <li>• Practice regularly for best results, even just 5 minutes daily helps</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Help Links */}
            <div className="border-t border-neutral-200 pt-6">
              <h4 className="text-lg font-semibold text-neutral-800 mb-4">Need Additional Support?</h4>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/therapy"
                  className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  AI Therapy Session
                </Link>
                <Link
                  href="/resources"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Breathing Resources
                </Link>
                <Link
                  href="/wellness/mood-tracker"
                  className="flex items-center px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Track Your Mood
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 bg-gradient-to-r from-wellness-calm/20 to-wellness-mindful/20 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-neutral-800 mb-6 text-center">
              Benefits of Breathing Exercises
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Physical Health</h4>
                <p className="text-neutral-600 text-sm">
                  Lowers blood pressure, improves heart rate variability, and reduces muscle tension
                </p>
              </div>
              <div className="text-center">
                <Brain className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Mental Clarity</h4>
                <p className="text-neutral-600 text-sm">
                  Enhances focus, reduces mental fog, and improves decision-making abilities
                </p>
              </div>
              <div className="text-center">
                <Timer className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-bold text-neutral-800 mb-2">Stress Relief</h4>
                <p className="text-neutral-600 text-sm">
                  Activates relaxation response, reduces cortisol levels, and promotes emotional balance
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
