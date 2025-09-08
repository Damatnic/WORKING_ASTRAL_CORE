'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Lock, Heart } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
            href="/"
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-neutral-800">Terms of Service</h1>
            <p className="text-neutral-600 mt-2">Last updated: December 15, 2024</p>
          </div>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-8 mb-12"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Heart className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Our Commitment to You</h2>
          </div>
          <p className="text-lg leading-relaxed">
            Astral Core is designed to support your mental wellness journey. These terms are written 
            to protect both you and our community while ensuring everyone can access safe, effective 
            mental health resources.
          </p>
        </motion.div>

        {/* Terms Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-8 space-y-8"
        >
          
          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4 flex items-center space-x-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <span>1. Acceptance of Terms</span>
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                By accessing and using Astral Core (&ldquo;the Service&rdquo;), you accept and agree to be bound by 
                these Terms of Service. If you do not agree to these terms, please do not use our service.
              </p>
              <p>
                We may update these terms periodically. Continued use of the service after changes 
                constitutes acceptance of the updated terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4 flex items-center space-x-3">
              <Eye className="w-6 h-6 text-green-600" />
              <span>2. Service Description</span>
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Astral Core provides digital mental health and wellness resources, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Self-help tools and exercises</li>
                <li>Mood tracking and wellness analytics</li>
                <li>Community support forums</li>
                <li>Educational content and resources</li>
                <li>AI-assisted therapeutic conversations</li>
              </ul>
              <p>
                <strong>Important:</strong> Our service is not a substitute for professional medical advice, 
                diagnosis, or treatment. Always seek the advice of qualified healthcare providers.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4 flex items-center space-x-3">
              <Lock className="w-6 h-6 text-purple-600" />
              <span>3. Privacy & Data Protection</span>
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Your privacy is fundamental to our mission. We collect and process personal information 
                only as described in our Privacy Policy, which includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information and preferences</li>
                <li>Usage data to improve our services</li>
                <li>Wellness tracking data you choose to share</li>
                <li>Community interactions within our platform</li>
              </ul>
              <p>
                We use industry-standard encryption and security measures to protect your data. 
                We will never sell your personal information to third parties.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">4. User Responsibilities</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>As a user of Astral Core, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate information when creating your account</li>
                <li>Use the service in a manner that&apos;s respectful to other users</li>
                <li>Not share content that is harmful, illegal, or violates others&apos; rights</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Report any concerning behavior or content to our moderation team</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">5. Crisis Situations</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4 text-neutral-700">
              <p className="font-semibold text-red-800">
                If you are experiencing a mental health emergency or having thoughts of self-harm:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact emergency services immediately (911 in the US)</li>
                <li>Call the 988 Suicide & Crisis Lifeline: 988</li>
                <li>Text &ldquo;HOME&rdquo; to 741741 for the Crisis Text Line</li>
                <li>Go to your nearest emergency room</li>
              </ul>
              <p>
                Astral Core is not equipped to handle crisis situations and should not be used 
                as your sole resource during emergencies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">6. Intellectual Property</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                All content, features, and functionality of Astral Core are owned by us and protected 
                by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                You retain ownership of any content you create and share within our platform, but 
                you grant us a license to use, display, and distribute that content as part of 
                operating the service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">7. Limitation of Liability</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Astral Core is provided &ldquo;as is&rdquo; without warranties of any kind. We strive to provide 
                reliable service but cannot guarantee uninterrupted access or error-free operation.
              </p>
              <p>
                We are not liable for any direct, indirect, incidental, or consequential damages 
                arising from your use of the service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">8. Contact Information</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Questions about these Terms of Service? Contact us:
              </p>
              <div className="bg-neutral-50 rounded-lg p-4">
                <p><strong>Email:</strong> legal@astralcore.app</p>
                <p><strong>Address:</strong> Astral Core, Inc.<br />
                123 Wellness Way<br />
                Mental Health City, MH 12345</p>
              </div>
            </div>
          </section>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-neutral-600 mb-6">
            Thank you for being part of the Astral Core community. Together, we&apos;re building 
            a more accessible and supportive mental health future.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>Return to Astral Core</span>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}