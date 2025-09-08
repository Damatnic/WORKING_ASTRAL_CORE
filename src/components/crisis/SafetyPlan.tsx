'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheckIcon,
  PhoneIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  HomeIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface SafetyPlanProps {
  className?: string;
}

interface SafetyPlanData {
  warningSignsPersonal: string[];
  warningSignsExternal: string[];
  copingStrategies: string[];
  socialContacts: ContactInfo[];
  professionalContacts: ContactInfo[];
  emergencyContacts: ContactInfo[];
  safeEnvironment: string[];
  reasonsToLive: string[];
  lastUpdated: Date;
}

interface ContactInfo {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  notes?: string;
  available24h: boolean;
}

const defaultSafetyPlan: SafetyPlanData = {
  warningSignsPersonal: [],
  warningSignsExternal: [],
  copingStrategies: [],
  socialContacts: [],
  professionalContacts: [],
  emergencyContacts: [],
  safeEnvironment: [],
  reasonsToLive: [],
  lastUpdated: new Date()
};

const emergencyNumbers = [
  { name: 'National Suicide Prevention Lifeline', number: '988', description: '24/7 crisis support' },
  { name: 'Crisis Text Line', number: 'Text HOME to 741741', description: 'Free 24/7 crisis support via text' },
  { name: 'Emergency Services', number: '911', description: 'Immediate emergency response' },
  { name: 'SAMHSA National Helpline', number: '1-800-662-4357', description: 'Mental health and substance abuse treatment referrals' }
];

const warningSignExamples = {
  personal: [
    'Feeling hopeless or trapped',
    'Overwhelming sadness or anxiety',
    'Thoughts of death or suicide',
    'Feeling like a burden to others',
    'Loss of interest in activities I usually enjoy',
    'Difficulty sleeping or sleeping too much',
    'Changes in appetite',
    'Increased substance use',
    'Isolating from friends and family',
    'Feeling agitated or restless'
  ],
  external: [
    'Recent loss or traumatic event',
    'Relationship problems or breakup',
    'Job loss or financial stress',
    'Health problems or chronic pain',
    'Legal troubles',
    'Anniversaries of difficult events',
    'Seasonal changes (winter, holidays)',
    'Academic or work pressure',
    'Family conflicts',
    'Social media or news triggers'
  ]
};

const copingExamples = [
  'Deep breathing exercises (4-7-8 technique)',
  'Progressive muscle relaxation',
  'Listening to calming music',
  'Taking a warm bath or shower',
  'Going for a walk in nature',
  'Writing in a journal',
  'Doing creative activities (art, music, crafts)',
  'Practicing mindfulness or meditation',
  'Watching funny videos or movies',
  'Playing with pets',
  'Doing physical exercise',
  'Calling a friend or family member',
  'Doing puzzles or brain games',
  'Cooking or baking',
  'Organizing or cleaning'
];

const environmentExamples = [
  'Remove means of self-harm from immediate environment',
  'Stay in common areas with family/friends',
  'Avoid alcohol and drugs',
  'Stay away from triggering locations',
  'Keep medications locked away or with trusted person',
  'Use apps to block harmful websites',
  'Remove weapons from home',
  'Arrange for someone to stay with me',
  'Go to a safe public place',
  'Check into a hospital if necessary'
];

export default function SafetyPlan({ className = "" }: SafetyPlanProps) {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlanData>(defaultSafetyPlan);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<ContactInfo | null>(null);
  const [showExamples, setShowExamples] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('safety-plan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSafetyPlan({
          ...parsed,
          lastUpdated: new Date(parsed.lastUpdated)
        });
      } catch (error) {
        console.error('Error loading safety plan:', error);
      }
    }
  }, []);

  const savePlan = (updatedPlan: SafetyPlanData) => {
    const planWithTimestamp = {
      ...updatedPlan,
      lastUpdated: new Date()
    };
    setSafetyPlan(planWithTimestamp);
    localStorage.setItem('safety-plan', JSON.stringify(planWithTimestamp));
  };

  const addItem = (section: keyof SafetyPlanData, item: string) => {
    if (item.trim()) {
      const updated = {
        ...safetyPlan,
        [section]: [...(safetyPlan[section] as string[]), item.trim()]
      };
      savePlan(updated);
    }
  };

  const removeItem = (section: keyof SafetyPlanData, index: number) => {
    const updated = {
      ...safetyPlan,
      [section]: (safetyPlan[section] as string[]).filter((_, i) => i !== index)
    };
    savePlan(updated);
  };

  const addContact = (section: 'socialContacts' | 'professionalContacts' | 'emergencyContacts', contact: Omit<ContactInfo, 'id'>) => {
    const newContact: ContactInfo = {
      ...contact,
      id: Date.now().toString()
    };
    const updated = {
      ...safetyPlan,
      [section]: [...safetyPlan[section], newContact]
    };
    savePlan(updated);
  };

  const removeContact = (section: 'socialContacts' | 'professionalContacts' | 'emergencyContacts', contactId: string) => {
    const updated = {
      ...safetyPlan,
      [section]: safetyPlan[section].filter(contact => contact.id !== contactId)
    };
    savePlan(updated);
  };

  const ContactForm = ({ type, onSave, onCancel, initialData }: {
    type: 'social' | 'professional' | 'emergency';
    onSave: (contact: Omit<ContactInfo, 'id'>) => void;
    onCancel: () => void;
    initialData?: ContactInfo;
  }) => {
    const [formData, setFormData] = useState({
      name: initialData?.name || '',
      relationship: initialData?.relationship || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      notes: initialData?.notes || '',
      available24h: initialData?.available24h || false
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-lg border border-gray-200 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name *"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Relationship *"
            value={formData.relationship}
            onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="tel"
            placeholder="Phone Number *"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <textarea
          placeholder="Notes (optional)"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.available24h}
            onChange={(e) => setFormData(prev => ({ ...prev, available24h: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Available 24/7</span>
        </label>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name.trim() || !formData.relationship.trim() || !formData.phone.trim()}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save Contact
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  };

  const SectionWithExamples = ({ 
    title, 
    icon: Icon, 
    items, 
    examples, 
    sectionKey, 
    placeholder,
    description 
  }: {
    title: string;
    icon: React.ComponentType<any>;
    items: string[];
    examples: string[];
    sectionKey: keyof SafetyPlanData;
    placeholder: string;
    description: string;
  }) => {
    const [newItem, setNewItem] = useState('');

    return (
      <motion.div
        layout
        className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>
            <button
              onClick={() => setShowExamples(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showExamples[sectionKey] ? 'Hide' : 'Show'} Examples
            </button>
          </div>

          <AnimatePresence>
            {showExamples[sectionKey] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <h4 className="font-medium text-blue-900 mb-2">Examples:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        addItem(sectionKey, example);
                        setShowExamples(prev => ({ ...prev, [sectionKey]: false }));
                      }}
                      className="text-left p-2 text-sm text-blue-800 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="flex-1 text-gray-800">{item}</span>
                <button
                  onClick={() => removeItem(sectionKey, index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))}

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder={placeholder}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addItem(sectionKey, newItem);
                    setNewItem('');
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  addItem(sectionKey, newItem);
                  setNewItem('');
                }}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg text-white p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ShieldCheckIcon className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Crisis Safety Plan</h1>
            <p className="text-blue-100">A personalized plan to keep you safe during difficult times</p>
          </div>
        </div>
        
        {safetyPlan.lastUpdated && (
          <div className="flex items-center space-x-2 text-blue-100">
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm">
              Last updated: {safetyPlan.lastUpdated.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Emergency Numbers */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold text-red-900">Emergency Contacts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyNumbers.map((contact, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-gray-900">{contact.name}</h3>
              <p className="text-2xl font-bold text-red-600 my-1">{contact.number}</p>
              <p className="text-sm text-gray-600">{contact.description}</p>
              <a
                href={`tel:${contact.number.replace(/[^\d]/g, '')}`}
                className="inline-flex items-center space-x-1 mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                <PhoneIcon className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Signs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionWithExamples
          title="Personal Warning Signs"
          icon={HeartIcon}
          items={safetyPlan.warningSignsPersonal}
          examples={warningSignExamples.personal}
          sectionKey="warningSignsPersonal"
          placeholder="Add a personal warning sign..."
          description="Internal thoughts, feelings, or behaviors that signal you may be in crisis"
        />

        <SectionWithExamples
          title="External Warning Signs"
          icon={ExclamationTriangleIcon}
          items={safetyPlan.warningSignsExternal}
          examples={warningSignExamples.external}
          sectionKey="warningSignsExternal"
          placeholder="Add an external trigger..."
          description="External situations, events, or circumstances that may trigger a crisis"
        />
      </div>

      {/* Coping Strategies */}
      <SectionWithExamples
        title="Coping Strategies"
        icon={LightBulbIcon}
        items={safetyPlan.copingStrategies}
        examples={copingExamples}
        sectionKey="copingStrategies"
        placeholder="Add a coping strategy..."
        description="Things you can do on your own to manage difficult feelings without contacting others"
      />

      {/* Contacts Sections */}
      <div className="space-y-6">
        {/* Social Contacts */}
        <motion.div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Social Support Contacts</h3>
                  <p className="text-sm text-gray-600">Friends and family who can provide emotional support</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('social')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="space-y-3">
              {safetyPlan.socialContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    <p className="text-sm text-gray-600">{contact.relationship}</p>
                    <p className="text-sm text-gray-800">{contact.phone}</p>
                    {contact.available24h && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                        24/7 Available
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <PhoneIcon className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => removeContact('socialContacts', contact.id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {activeSection === 'social' && (
              <div className="mt-4">
                <ContactForm
                  type="social"
                  onSave={(contact) => {
                    addContact('socialContacts', contact);
                    setActiveSection(null);
                  }}
                  onCancel={() => setActiveSection(null)}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Professional Contacts */}
        <motion.div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Professional Contacts</h3>
                  <p className="text-sm text-gray-600">Mental health professionals and healthcare providers</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('professional')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="space-y-3">
              {safetyPlan.professionalContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    <p className="text-sm text-gray-600">{contact.relationship}</p>
                    <p className="text-sm text-gray-800">{contact.phone}</p>
                    {contact.available24h && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                        24/7 Available
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <PhoneIcon className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => removeContact('professionalContacts', contact.id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {activeSection === 'professional' && (
              <div className="mt-4">
                <ContactForm
                  type="professional"
                  onSave={(contact) => {
                    addContact('professionalContacts', contact);
                    setActiveSection(null);
                  }}
                  onCancel={() => setActiveSection(null)}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Safe Environment & Reasons to Live */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionWithExamples
          title="Safe Environment Steps"
          icon={HomeIcon}
          items={safetyPlan.safeEnvironment}
          examples={environmentExamples}
          sectionKey="safeEnvironment"
          placeholder="Add a safety step..."
          description="Steps to make your environment safer during a crisis"
        />

        <SectionWithExamples
          title="Reasons to Live"
          icon={HeartIcon}
          items={safetyPlan.reasonsToLive}
          examples={[
            'My children need me',
            'I have goals I want to achieve',
            'My family loves me',
            'I want to see what tomorrow brings',
            'My pets depend on me',
            'I have people who care about me',
            'I want to travel to new places',
            'I have dreams to pursue',
            'I can help others who are struggling',
            'Life has beautiful moments worth experiencing'
          ]}
          sectionKey="reasonsToLive"
          placeholder="Add a reason to live..."
          description="Personal reasons that motivate you to stay alive and get through difficult times"
        />
      </div>

      {/* Important Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Important Reminders</h3>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• This safety plan is a tool to help you through difficult times, but it&apos;s not a substitute for professional help</li>
              <li>• Share this plan with your trusted contacts and mental health professionals</li>
              <li>• Review and update your plan regularly, especially after major life changes</li>
              <li>• If you&apos;re in immediate danger, call 911 or go to your nearest emergency room</li>
              <li>• Remember: asking for help is a sign of strength, not weakness</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}