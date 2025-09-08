'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Shield,
  Heart,
  AlertTriangle,
  CheckCircle,
  Target,
  Users,
  Clock,
  Brain,
  Eye,
  Lock,
  Phone,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Zap,
  Star
} from 'lucide-react';
import Link from 'next/link';

export default function AITherapyTermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4 mb-12"
        >
          <Link 
            href="/therapy"
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">AI Therapy Terms & Conditions</h1>
            <p className="text-neutral-600 mt-2">Important information about our AI-powered therapy service</p>
          </div>
        </motion.div>

        {/* Critical Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl text-white p-8 mb-12"
        >
          <div className="flex items-center space-x-4 mb-6">
            <Bot className="w-12 h-12" />
            <div>
              <h2 className="text-3xl font-bold">AI-Powered Therapy Service</h2>
              <p className="text-xl opacity-90">NOT Human Therapists</p>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-3">⚠️ IMPORTANT DISCLOSURE</h3>
            <p className="text-lg leading-relaxed">
              The therapy conversations on Astral Core are conducted with <strong>artificial intelligence (AI) systems</strong>, 
              not licensed human therapists or mental health professionals. While our AI therapists are designed to provide 
              supportive conversations and evidence-based guidance, they are <strong>not a replacement for professional 
              mental health treatment</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h4 className="font-bold mb-2">✅ What Our AI Can Do</h4>
              <ul className="text-sm space-y-1">
                <li>• Provide emotional support and validation</li>
                <li>• Offer coping strategies and techniques</li>
                <li>• Guide through self-reflection exercises</li>
                <li>• Share evidence-based mental health information</li>
              </ul>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h4 className="font-bold mb-2">❌ What Our AI Cannot Do</h4>
              <ul className="text-sm space-y-1">
                <li>• Diagnose mental health conditions</li>
                <li>• Prescribe medications</li>
                <li>• Provide crisis intervention</li>
                <li>• Replace professional therapy</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* AI Therapist Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <div className="flex items-center space-x-3 mb-8">
            <Target className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-neutral-800">AI Therapist Goals & Objectives</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Primary Goals */}
            <div>
              <h3 className="text-xl font-bold text-neutral-800 mb-4 flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span>Primary Goals</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Heart className="w-6 h-6 text-pink-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800">Emotional Support</h4>
                    <p className="text-neutral-600 text-sm">Provide a safe, non-judgmental space for users to express their feelings and thoughts.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Lightbulb className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800">Skill Building</h4>
                    <p className="text-neutral-600 text-sm">Teach evidence-based coping strategies, mindfulness techniques, and emotional regulation skills.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Eye className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800">Self-Awareness</h4>
                    <p className="text-neutral-600 text-sm">Guide users through self-reflection exercises to better understand their emotions and patterns.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-neutral-800">Crisis Recognition</h4>
                    <p className="text-neutral-600 text-sm">Identify when users may need immediate professional help and provide appropriate resources.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Therapeutic Approach */}
            <div>
              <h3 className="text-xl font-bold text-neutral-800 mb-4 flex items-center space-x-2">
                <Brain className="w-5 h-5 text-blue-500" />
                <span>Therapeutic Approach</span>
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Cognitive Behavioral Therapy (CBT)</h4>
                  <p className="text-blue-700 text-sm">Helping users identify and challenge negative thought patterns and develop healthier thinking habits.</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Mindfulness-Based Interventions</h4>
                  <p className="text-green-700 text-sm">Teaching present-moment awareness and acceptance techniques to reduce anxiety and improve emotional regulation.</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Solution-Focused Therapy</h4>
                  <p className="text-purple-700 text-sm">Focusing on user strengths and helping develop practical solutions to current challenges.</p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Motivational Interviewing</h4>
                  <p className="text-orange-700 text-sm">Supporting users in finding their own motivation and commitment to positive changes.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Capabilities & Limitations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-8 mb-8"
        >
          
          {/* AI Capabilities */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Zap className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-neutral-800">AI Capabilities</h3>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-700">24/7 availability for immediate support</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-700">Consistent, evidence-based therapeutic approaches</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-700">Personalized responses based on user history</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-700">Integration with wellness tracking and goals</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-700">Multiple therapeutic personality styles</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-700">Resource and exercise recommendations</span>
              </li>
            </ul>
          </div>

          {/* AI Limitations */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <h3 className="text-xl font-bold text-neutral-800">AI Limitations</h3>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <span className="text-neutral-700">Cannot provide medical diagnoses or treatment</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <span className="text-neutral-700">May not understand complex emotional nuances</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <span className="text-neutral-700">Cannot handle immediate crisis situations</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <span className="text-neutral-700">Limited ability to form genuine therapeutic relationships</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <span className="text-neutral-700">Cannot prescribe medications or adjust dosages</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <span className="text-neutral-700">May have gaps in cultural or contextual understanding</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* When to Seek Professional Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl text-white p-8 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Phone className="w-8 h-8" />
            <h2 className="text-2xl font-bold">When to Seek Professional Help</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-lg mb-4">
              Our AI therapists will recommend professional help when appropriate, but you should seek immediate 
              professional assistance if you experience:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <h4 className="font-bold mb-2">🚨 Crisis Situations</h4>
                <ul className="text-sm space-y-1">
                  <li>• Thoughts of self-harm or suicide</li>
                  <li>• Plans to harm yourself or others</li>
                  <li>• Severe panic attacks or psychotic episodes</li>
                  <li>• Substance abuse emergencies</li>
                </ul>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <h4 className="font-bold mb-2">🏥 Professional Treatment Needed</h4>
                <ul className="text-sm space-y-1">
                  <li>• Persistent severe depression or anxiety</li>
                  <li>• Relationship or family counseling needs</li>
                  <li>• Trauma processing and PTSD treatment</li>
                  <li>• Medication evaluation and management</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-20 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-3">Emergency Resources</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-bold mb-2">🚨 Emergency Services</h4>
                <p>Call 911 (US) or your local emergency number</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">📞 Crisis Hotline</h4>
                <p>Call or text 988 for the Suicide & Crisis Lifeline</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">💬 Crisis Text Line</h4>
                <p>Text HOME to 741741 for immediate support</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Ethics & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-neutral-800">AI Ethics & Privacy</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-neutral-800 mb-4">Our Commitments</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">End-to-end encryption of all therapy conversations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">No sharing of therapy content with third parties</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Eye className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Transparent about AI capabilities and limitations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <BookOpen className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-700">Continuous improvement based on user feedback</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-neutral-800 mb-4">Data Usage</h3>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">✅ What We Use Data For</h4>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Improving AI therapy responses</li>
                    <li>• Personalizing your therapy experience</li>
                    <li>• Safety monitoring and crisis detection</li>
                    <li>• General service improvements (anonymized)</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">❌ What We Don&apos;t Do</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• Share conversations with insurance companies</li>
                    <li>• Sell your therapy data to advertisers</li>
                    <li>• Use conversations for non-therapeutic purposes</li>
                    <li>• Store conversations longer than necessary</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Acceptance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-neutral-50 rounded-2xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Acceptance of Terms</h2>
          
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              By using the AI therapy feature on Astral Core, you acknowledge that you have read, understood, 
              and agree to these terms and conditions. You understand that:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>You are interacting with artificial intelligence, not human therapists</li>
              <li>This service is not a replacement for professional mental health treatment</li>
              <li>You will seek appropriate professional help when recommended or needed</li>
              <li>You understand the capabilities and limitations of AI therapy</li>
              <li>You consent to the privacy and data usage practices outlined above</li>
            </ul>
            
            <p className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <strong>Remember:</strong> Our AI therapists are here to support you on your mental health journey, 
              but they work best as a complement to, not a replacement for, professional mental health care when needed.
            </p>
          </div>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <p className="text-neutral-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/therapy"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continue to AI Therapy
            </Link>
            
            <Link 
              href="/therapy/therapists"
              className="bg-neutral-200 text-neutral-700 px-8 py-3 rounded-lg hover:bg-neutral-300 transition-colors font-medium"
            >
              Choose Your AI Therapist
            </Link>
          </div>
          
          <p className="text-sm text-neutral-500 mt-4">
            Questions about these terms? Contact us at{' '}
            <a href="mailto:support@astralcore.app" className="text-blue-600 hover:text-blue-700">
              support@astralcore.app
            </a>
          </p>
        </motion.div>

      </div>
    </div>
  );
}