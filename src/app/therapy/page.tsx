/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  MessageCircle, 
  Heart, 
  Shield,
  Sparkles,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import AITherapyInterface from '@/components/ai/AITherapyInterface';
import { useTherapist } from '@/hooks/useTherapist';

export default function TherapyPage() {
  const [isStarted, setIsStarted] = useState(false);
  const [showOnboarding] = useState(true);
  const { therapist } = useTherapist();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence>
          {!isStarted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center mb-6"
                >
                  <div className="bg-primary-500 rounded-full p-4 mr-4">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-neutral-800">
                    AI Therapy Assistant
                  </h1>
                </motion.div>
                
                <p className="text-xl text-neutral-600 mb-4">
                  Get immediate, confidential support from a specialized AI therapist
                </p>
                <p className="text-sm text-neutral-500">
                  Available 24/7 • Completely Anonymous • Crisis Support Enabled
                </p>
              </div>

              {/* AI Disclosure Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-6 mb-12"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-2 flex-shrink-0">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">🤖 AI-Powered Therapy Service</h3>
                    <p className="text-sm opacity-90 mb-3">
                      <strong>Important:</strong> You will be speaking with an AI assistant, not a human therapist. 
                      While our AI provides evidence-based support and therapeutic techniques, it cannot replace 
                      professional mental health treatment when needed.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link 
                        href="/therapy/ai-terms"
                        className="text-sm bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-full transition-colors"
                      >
                        View AI Terms & Goals
                      </Link>
                      <span className="text-xs opacity-75">|</span>
                      <span className="text-xs opacity-75">Crisis situations: Call 988 or emergency services</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {[
                  {
                    icon: Shield,
                    title: "100% Anonymous",
                    description: "No personal information required. Your privacy is completely protected.",
                    color: "bg-green-500"
                  },
                  {
                    icon: Clock,
                    title: "24/7 Availability",
                    description: "Get support whenever you need it, day or night.",
                    color: "bg-blue-500"
                  },
                  {
                    icon: Heart,
                    title: "Crisis Support",
                    description: "Advanced crisis detection with immediate intervention protocols.",
                    color: "bg-red-500"
                  },
                  {
                    icon: Brain,
                    title: "Advanced AI",
                    description: "Powered by cutting-edge therapy and counseling techniques.",
                    color: "bg-purple-500"
                  },
                  {
                    icon: CheckCircle,
                    title: "Evidence-Based",
                    description: "Uses proven therapeutic approaches like CBT and DBT.",
                    color: "bg-wellness-growth"
                  },
                  {
                    icon: Sparkles,
                    title: "Personalized",
                    description: "Adapts to your unique needs and communication style.",
                    color: "bg-wellness-mindful"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-glow transition-all duration-300"
                  >
                    <div className={`${feature.color} rounded-full p-3 w-fit mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-neutral-800 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Getting Started */}
              <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8 text-center">
                <h2 className="text-2xl font-bold text-neutral-800 mb-4">
                  Ready to get started?
                </h2>
                <p className="text-neutral-600 mb-6">
                  Your conversation will be completely anonymous and confidential. 
                  You can stop at any time.
                </p>
                {therapist ? (
                  <div className="mb-6 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-neutral-50 border">
                    <span className="text-2xl" aria-hidden>{therapist.avatar}</span>
                    <div className="text-left">
                      <div className="font-semibold">{therapist.name}</div>
                      <div className="text-xs text-neutral-600">Specialties: {therapist.specialty.map(s=>s.toUpperCase()).join(' · ')}</div>
                    </div>
                    <a className="ml-4 text-sm text-primary-600 hover:text-primary-700" href="/therapy/therapists">Change</a>
                  </div>
                ) : (
                  <div className="mb-6">
                    <a className="text-sm text-primary-600 hover:text-primary-700" href="/therapy/therapists">Choose a therapist (specialty & tone)</a>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={() => setIsStarted(true)}
                    className="flex items-center justify-center px-8 py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all duration-200 group"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Start Anonymous Session
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <Link 
                    href="/crisis"
                    className="flex items-center justify-center px-8 py-4 bg-crisis-primary text-white rounded-xl font-semibold hover:bg-crisis-secondary transition-all duration-200"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Crisis Support
                  </Link>
                </div>
                
                <p className="text-xs text-neutral-500 mt-4">
                  If you're experiencing a mental health emergency, please call 988 (Suicide & Crisis Lifeline) or your local emergency services.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-center mt-8">
                <Link 
                  href="/"
                  className="text-primary-600 hover:text-primary-700 transition-colors"
                >
                  ← Back to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto"
            >
              <AITherapyInterface />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
