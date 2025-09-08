"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Plus, 
  Trash, 
  Save, 
  AlertTriangle,
  Phone,
  Heart,
  User,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function SafetyPlanPage() {
  const [safetyPlan, setSafetyPlan] = useState({
    warningSigns: [''],
    copingStrategies: [''],
    distractions: [''],
    supportContacts: [{ name: '', phone: '', relationship: '' }],
    professionalContacts: [{ name: '', phone: '', organization: '' }],
    safetyActions: ['']
  });

  const addItem = (section: string) => {
    setSafetyPlan(prev => ({
      ...prev,
      [section]: section === 'supportContacts' || section === 'professionalContacts' 
        ? [...prev[section as keyof typeof prev], section === 'supportContacts' 
          ? { name: '', phone: '', relationship: '' }
          : { name: '', phone: '', organization: '' }]
        : [...prev[section as keyof typeof prev], '']
    }));
  };

  const removeItem = (section: string, index: number) => {
    setSafetyPlan(prev => ({
      ...prev,
      [section]: (prev[section as keyof typeof prev] as any[]).filter((_, i) => i !== index)
    }));
  };

  const updateItem = (section: string, index: number, value: any) => {
    setSafetyPlan(prev => ({
      ...prev,
      [section]: (prev[section as keyof typeof prev] as any[]).map((item, i) => 
        i === index ? value : item
      )
    }));
  };

  const savePlan = () => {
    console.log('Saving safety plan:', safetyPlan);
    // Here you would save to your backend/database
    alert('Safety plan saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-crisis-background via-red-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center mb-8"
          >
            <Link href="/crisis" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-neutral-600 hover:text-neutral-800 transition-colors" />
            </Link>
            <div className="flex items-center">
              <div className="bg-crisis-primary rounded-full p-3 mr-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-800">Safety Plan Builder</h1>
                <p className="text-neutral-600">Create a personalized crisis safety plan</p>
              </div>
            </div>
          </motion.div>

          {/* Warning Signs Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-6"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-crisis-primary mr-2" />
              <h2 className="text-xl font-bold text-neutral-800">Warning Signs</h2>
            </div>
            <p className="text-neutral-600 mb-4">
              Identify thoughts, feelings, or behaviors that indicate a crisis is developing.
            </p>
            
            {safetyPlan.warningSigns.map((sign, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={sign}
                  onChange={(e: any) => updateItem('warningSigns', index, e.target.value)}
                  placeholder="Enter a warning sign..."
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => removeItem('warningSigns', index)}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addItem('warningSigns')}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Warning Sign
            </button>
          </motion.div>

          {/* Coping Strategies Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-6"
          >
            <div className="flex items-center mb-4">
              <Heart className="w-5 h-5 text-wellness-growth mr-2" />
              <h2 className="text-xl font-bold text-neutral-800">Coping Strategies</h2>
            </div>
            <p className="text-neutral-600 mb-4">
              Things you can do on your own to help yourself feel better.
            </p>
            
            {safetyPlan.copingStrategies.map((strategy, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={strategy}
                  onChange={(e: any) => updateItem('copingStrategies', index, e.target.value)}
                  placeholder="Enter a coping strategy..."
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => removeItem('copingStrategies', index)}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addItem('copingStrategies')}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Coping Strategy
            </button>
          </motion.div>

          {/* Support Contacts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-6"
          >
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-primary-500 mr-2" />
              <h2 className="text-xl font-bold text-neutral-800">Support Contacts</h2>
            </div>
            <p className="text-neutral-600 mb-4">
              People you can call for support during a crisis.
            </p>
            
            {safetyPlan.supportContacts.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 p-4 border border-neutral-200 rounded-lg">
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e: any) => updateItem('supportContacts', index, { ...contact, name: e.target.value })}
                  placeholder="Name"
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e: any) => updateItem('supportContacts', index, { ...contact, phone: e.target.value })}
                  placeholder="Phone number"
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={contact.relationship}
                    onChange={(e: any) => updateItem('supportContacts', index, { ...contact, relationship: e.target.value })}
                    placeholder="Relationship"
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => removeItem('supportContacts', index)}
                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addItem('supportContacts')}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Support Contact
            </button>
          </motion.div>

          {/* Professional Contacts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-6"
          >
            <div className="flex items-center mb-4">
              <Phone className="w-5 h-5 text-blue-500 mr-2" />
              <h2 className="text-xl font-bold text-neutral-800">Professional Contacts</h2>
            </div>
            <p className="text-neutral-600 mb-4">
              Mental health professionals and crisis services you can contact.
            </p>
            
            {safetyPlan.professionalContacts.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 p-4 border border-neutral-200 rounded-lg">
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e: any) => updateItem('professionalContacts', index, { ...contact, name: e.target.value })}
                  placeholder="Name/Title"
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e: any) => updateItem('professionalContacts', index, { ...contact, phone: e.target.value })}
                  placeholder="Phone number"
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={contact.organization}
                    onChange={(e: any) => updateItem('professionalContacts', index, { ...contact, organization: e.target.value })}
                    placeholder="Organization"
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => removeItem('professionalContacts', index)}
                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addItem('professionalContacts')}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Professional Contact
            </button>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center gap-4"
          >
            <button
              onClick={savePlan}
              className="flex items-center px-8 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all duration-200"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Safety Plan
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}