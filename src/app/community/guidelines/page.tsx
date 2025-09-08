'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Shield,
  Users,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Flag,
  Headphones
} from 'lucide-react';
import Link from 'next/link';

export default function CommunityGuidelinesPage() {
  const guidelines = [
    {
      icon: Heart,
      title: 'Be Kind and Respectful',
      description: 'Treat all community members with compassion and understanding.',
      examples: [
        'Use supportive language when responding to posts',
        'Respect different perspectives and experiences',
        'Avoid judgment or criticism of others\' mental health journeys'
      ]
    },
    {
      icon: Shield,
      title: 'Maintain Privacy and Safety',
      description: 'Protect yourself and others by respecting privacy boundaries.',
      examples: [
        'Don\'t share personal identifying information',
        'Respect others\' anonymity preferences',
        'Use content warnings for potentially triggering topics'
      ]
    },
    {
      icon: MessageCircle,
      title: 'Share Constructively',
      description: 'Contribute meaningfully to discussions and support others\' growth.',
      examples: [
        'Share personal experiences to help others feel less alone',
        'Offer encouragement and hope when appropriate',
        'Ask thoughtful questions that promote reflection'
      ]
    },
    {
      icon: Users,
      title: 'Foster Inclusion',
      description: 'Create a welcoming environment for people from all backgrounds.',
      examples: [
        'Use inclusive language that welcomes everyone',
        'Avoid assumptions about others\' identities or circumstances',
        'Celebrate the diversity of our community'
      ]
    }
  ];

  const prohibited = [
    'Sharing personal contact information or attempting to move conversations off-platform',
    'Providing specific medical or therapeutic advice unless you are a verified professional',
    'Posting content that glorifies self-harm, suicide, or eating disorders',
    'Harassment, bullying, or discriminatory language based on any personal characteristic',
    'Spam, promotional content, or solicitation for external services',
    'Sharing explicit, graphic, or adult content',
    'Discussing specific methods of self-harm or suicide in detail',
    'Impersonating others or creating fake accounts'
  ];

  const reporting = [
    {
      icon: Flag,
      title: 'How to Report',
      description: 'Use the report button on any post or message that violates our guidelines'
    },
    {
      icon: Headphones,
      title: 'What Happens Next',
      description: 'Our moderation team reviews reports within 24 hours and takes appropriate action'
    },
    {
      icon: CheckCircle,
      title: 'Follow Up',
      description: 'You\'ll receive a notification about the outcome of your report'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4 mb-12"
        >
          <Link 
            href="/community"
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">Community Guidelines</h1>
            <p className="text-neutral-600 mt-2">Creating a safe and supportive space for everyone</p>
          </div>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl text-white p-8 mb-12"
        >
          <h2 className="text-2xl font-bold mb-4">Our Community Promise</h2>
          <p className="text-lg leading-relaxed">
            The Astral Core community is built on mutual support, respect, and understanding. 
            These guidelines help ensure our space remains safe, welcoming, and beneficial for 
            everyone on their mental health journey.
          </p>
        </motion.div>

        {/* Core Guidelines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-neutral-800 mb-8">Core Guidelines</h2>
          <div className="space-y-8">
            {guidelines.map((guideline, index) => (
              <motion.div
                key={guideline.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-8"
              >
                <div className="flex items-start space-x-4 mb-6">
                  <div className="p-3 bg-green-100 rounded-full">
                    <guideline.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-800 mb-2">{guideline.title}</h3>
                    <p className="text-neutral-600">{guideline.description}</p>
                  </div>
                </div>
                
                <div className="ml-16">
                  <h4 className="font-semibold text-neutral-800 mb-3">Examples:</h4>
                  <ul className="space-y-2">
                    {guideline.examples.map((example, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-neutral-700">{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Prohibited Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-800">Prohibited Content</h2>
                <p className="text-neutral-600">The following behaviors are not allowed in our community:</p>
              </div>
            </div>
            
            <ul className="space-y-3">
              {prohibited.map((item, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-neutral-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Crisis Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl text-white p-8">
            <h2 className="text-2xl font-bold mb-4">Crisis Support</h2>
            <p className="mb-6">
              If you or someone in our community is experiencing a mental health crisis, 
              please seek immediate professional help:
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <h3 className="font-bold mb-2">Emergency Services</h3>
                <p>Call 911 (US) or your local emergency number</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <h3 className="font-bold mb-2">Crisis Hotline</h3>
                <p>Call or text 988 for the Suicide & Crisis Lifeline</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <h3 className="font-bold mb-2">Crisis Text Line</h3>
                <p>Text HOME to 741741</p>
              </div>
            </div>
            
            <p className="mt-6 text-sm opacity-90">
              Remember: Our community provides peer support, not professional crisis intervention.
            </p>
          </div>
        </motion.div>

        {/* Reporting Process */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-neutral-800 mb-8">Reporting Guidelines Violations</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {reporting.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6 text-center"
              >
                <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-neutral-800 mb-2">{step.title}</h3>
                <p className="text-neutral-600 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enforcement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-12"
        >
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Enforcement</h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              When guidelines are violated, our moderation team may take actions including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Warning:</strong> First-time minor violations receive a private warning</li>
              <li><strong>Content Removal:</strong> Violating posts or comments are removed</li>
              <li><strong>Temporary Restriction:</strong> Limited access for repeated violations</li>
              <li><strong>Permanent Ban:</strong> Removal from the community for severe or repeated violations</li>
            </ul>
            <p>
              We believe in education and growth. Our goal is to help community members understand 
              and follow these guidelines rather than punish them.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="text-center"
        >
          <p className="text-neutral-600 mb-6">
            Thank you for helping create a safe, supportive community for mental health and wellness.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/community"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Join the Community
            </Link>
            <Link 
              href="/community/forums"
              className="bg-neutral-200 text-neutral-700 px-6 py-3 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              Browse Forums
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}