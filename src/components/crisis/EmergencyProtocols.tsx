'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldExclamationIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellAlertIcon,
  TruckIcon,
  BuildingOffice2Icon,
  HeartIcon,
  FireIcon,
  SpeakerWaveIcon,
  PencilIcon,
  EyeIcon,
  PlusIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface EmergencyContact {
  id: string;
  name: string;
  organization: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  jurisdiction?: string;
  availability: '24/7' | 'business_hours' | 'on_call' | 'emergency_only';
  responseTime: string; // e.g., "5-10 minutes"
  specialties: string[];
  contactPriority: 'primary' | 'secondary' | 'backup';
  lastContact?: Date;
  notes?: string;
  active: boolean;
}

interface EscalationLevel {
  id: string;
  level: number;
  name: string;
  description: string;
  triggers: string[];
  requiredActions: string[];
  contacts: string[]; // Contact IDs
  timeframe: string;
  approval?: {
    required: boolean;
    approver: string;
  };
}

interface ProtocolStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timeLimit?: number; // minutes
  required: boolean;
  dependencies?: string[]; // Step IDs that must be completed first
  contacts?: string[]; // Contact IDs to notify
  documentation?: string[];
  alternatives?: string[];
}

interface EmergencyProtocol {
  id: string;
  name: string;
  category: 'suicide_risk' | 'violence_threat' | 'medical_emergency' | 'domestic_violence' | 'child_abuse' | 'elder_abuse' | 'substance_overdose' | 'psychotic_episode' | 'general';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  activationCriteria: string[];
  steps: ProtocolStep[];
  escalationLevels: EscalationLevel[];
  legalRequirements?: string[];
  documentation: string[];
  lastUpdated: Date;
  version: string;
  approvedBy: string;
  active: boolean;
}

interface EscalationRecord {
  id: string;
  protocolId: string;
  clientId?: string;
  escalationLevel: number;
  initiatedBy: string;
  initiatedAt: Date;
  reason: string;
  contactsNotified: string[];
  actions: EscalationAction[];
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated_further';
  resolution?: string;
  resolvedAt?: Date;
  notes: string;
}

interface EscalationAction {
  id: string;
  action: string;
  assignedTo: string;
  dueTime: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  notes?: string;
}

interface EmergencyProtocolsProps {
  className?: string;
}

const mockEmergencyContacts: EmergencyContact[] = [
  {
    id: 'contact_911',
    name: '911 Emergency Services',
    organization: 'Local Emergency Services',
    role: 'Emergency Dispatcher',
    phone: '911',
    availability: '24/7',
    responseTime: '5-10 minutes',
    specialties: ['Medical Emergency', 'Fire', 'Police'],
    contactPriority: 'primary',
    active: true
  },
  {
    id: 'contact_crisis_line',
    name: 'National Suicide Prevention Lifeline',
    organization: '988 Lifeline',
    role: 'Crisis Counselor',
    phone: '988',
    availability: '24/7',
    responseTime: 'Immediate',
    specialties: ['Suicide Prevention', 'Mental Health Crisis'],
    contactPriority: 'primary',
    active: true
  },
  {
    id: 'contact_supervisor',
    name: 'Crisis Supervisor Johnson',
    organization: 'Astral Core Crisis Team',
    role: 'Clinical Supervisor',
    phone: '(555) 123-4567',
    email: 'supervisor@astralcore.org',
    availability: 'on_call',
    responseTime: '10-15 minutes',
    specialties: ['Clinical Oversight', 'Risk Assessment', 'Protocol Authorization'],
    contactPriority: 'primary',
    lastContact: new Date('2024-01-14T16:30:00'),
    active: true
  },
  {
    id: 'contact_mobile_crisis',
    name: 'Mobile Crisis Response Team',
    organization: 'County Mental Health',
    role: 'Crisis Intervention Specialist',
    phone: '(555) 234-5678',
    address: '123 Mental Health Way, City, State',
    jurisdiction: 'County-wide',
    availability: '24/7',
    responseTime: '30-45 minutes',
    specialties: ['Mobile Crisis Response', 'Mental Health Assessment', 'Involuntary Commitment'],
    contactPriority: 'primary',
    active: true
  },
  {
    id: 'contact_police_crisis',
    name: 'Police Crisis Intervention Unit',
    organization: 'City Police Department',
    role: 'Crisis Intervention Officer',
    phone: '(555) 345-6789',
    availability: '24/7',
    responseTime: '10-20 minutes',
    specialties: ['Mental Health Crisis', 'De-escalation', 'Welfare Checks'],
    contactPriority: 'secondary',
    active: true
  },
  {
    id: 'contact_hospital',
    name: 'General Hospital Emergency Department',
    organization: 'City General Hospital',
    role: 'Emergency Department',
    phone: '(555) 456-7890',
    address: '456 Hospital Drive, City, State',
    availability: '24/7',
    responseTime: 'Varies',
    specialties: ['Medical Emergency', 'Psychiatric Evaluation', 'Involuntary Hold'],
    contactPriority: 'secondary',
    active: true
  }
];

const mockProtocols: EmergencyProtocol[] = [
  {
    id: 'protocol_suicide_imminent',
    name: 'Imminent Suicide Risk',
    category: 'suicide_risk',
    severity: 'critical',
    description: 'Protocol for clients presenting imminent suicide risk with plan, means, and intent',
    activationCriteria: [
      'Client expresses intent to die by suicide',
      'Client has specific plan for suicide',
      'Client has access to means',
      'Client refuses to commit to safety',
      'Client displays agitation or impulsivity'
    ],
    steps: [
      {
        id: 'step_1',
        stepNumber: 1,
        title: 'Immediate Safety Assessment',
        description: 'Assess immediate danger and client\'s current location',
        timeLimit: 5,
        required: true,
        contacts: ['contact_supervisor']
      },
      {
        id: 'step_2',
        stepNumber: 2,
        title: 'Engage Emergency Services',
        description: 'Contact 911 for immediate emergency response',
        timeLimit: 2,
        required: true,
        contacts: ['contact_911']
      },
      {
        id: 'step_3',
        stepNumber: 3,
        title: 'Maintain Contact',
        description: 'Stay on line with client until emergency services arrive',
        required: true,
        dependencies: ['step_2']
      },
      {
        id: 'step_4',
        stepNumber: 4,
        title: 'Documentation',
        description: 'Complete crisis intervention documentation',
        required: true,
        dependencies: ['step_3']
      }
    ],
    escalationLevels: [
      {
        id: 'level_1',
        level: 1,
        name: 'Supervisor Notification',
        description: 'Notify clinical supervisor immediately',
        triggers: ['Imminent suicide risk identified'],
        requiredActions: ['Contact supervisor', 'Begin safety planning'],
        contacts: ['contact_supervisor'],
        timeframe: 'Immediate'
      },
      {
        id: 'level_2',
        level: 2,
        name: 'Emergency Services',
        description: 'Engage emergency services for immediate intervention',
        triggers: ['Client refuses safety planning', 'Immediate danger present'],
        requiredActions: ['Call 911', 'Request mobile crisis team'],
        contacts: ['contact_911', 'contact_mobile_crisis'],
        timeframe: 'Within 2 minutes'
      }
    ],
    legalRequirements: [
      'Duty to warn if threat to specific individual',
      'Involuntary commitment procedures if applicable',
      'Documentation of all interventions'
    ],
    documentation: [
      'Crisis assessment form',
      'Safety planning worksheet',
      'Intervention notes',
      'Outcome documentation'
    ],
    lastUpdated: new Date('2024-01-01'),
    version: '2.1',
    approvedBy: 'Clinical Director',
    active: true
  },
  {
    id: 'protocol_violence_threat',
    name: 'Violence Threat Assessment',
    category: 'violence_threat',
    severity: 'high',
    description: 'Protocol for threats of violence against others',
    activationCriteria: [
      'Client threatens violence against specific person',
      'Client has means to carry out threat',
      'Client has history of violence',
      'Client displays agitation or paranoia'
    ],
    steps: [
      {
        id: 'step_1',
        stepNumber: 1,
        title: 'Threat Assessment',
        description: 'Assess credibility and immediacy of threat',
        timeLimit: 10,
        required: true
      },
      {
        id: 'step_2',
        stepNumber: 2,
        title: 'Duty to Warn',
        description: 'Notify intended victim and law enforcement if applicable',
        required: true,
        contacts: ['contact_police_crisis'],
        dependencies: ['step_1']
      },
      {
        id: 'step_3',
        stepNumber: 3,
        title: 'Clinical Consultation',
        description: 'Consult with supervisor on next steps',
        required: true,
        contacts: ['contact_supervisor']
      }
    ],
    escalationLevels: [
      {
        id: 'level_1',
        level: 1,
        name: 'Supervisor Consultation',
        description: 'Immediate consultation with clinical supervisor',
        triggers: ['Violence threat identified'],
        requiredActions: ['Contact supervisor', 'Document threat details'],
        contacts: ['contact_supervisor'],
        timeframe: 'Within 5 minutes'
      },
      {
        id: 'level_2',
        level: 2,
        name: 'Law Enforcement',
        description: 'Notify law enforcement if credible threat exists',
        triggers: ['Credible threat to specific individual'],
        requiredActions: ['Contact police', 'Warn intended victim'],
        contacts: ['contact_police_crisis'],
        timeframe: 'Immediate',
        approval: {
          required: true,
          approver: 'Clinical Supervisor'
        }
      }
    ],
    documentation: [
      'Threat assessment worksheet',
      'Duty to warn documentation',
      'Consultation notes'
    ],
    lastUpdated: new Date('2024-01-01'),
    version: '1.8',
    approvedBy: 'Clinical Director',
    active: true
  }
];

const mockEscalations: EscalationRecord[] = [
  {
    id: 'esc_001',
    protocolId: 'protocol_suicide_imminent',
    escalationLevel: 2,
    initiatedBy: 'Crisis Counselor Rodriguez',
    initiatedAt: new Date('2024-01-15T14:45:00'),
    reason: 'Client expressing imminent suicide plan with available means',
    contactsNotified: ['contact_911', 'contact_supervisor'],
    actions: [
      {
        id: 'action_001',
        action: 'Emergency services dispatched',
        assignedTo: '911 Dispatcher',
        dueTime: new Date('2024-01-15T14:47:00'),
        completedAt: new Date('2024-01-15T14:46:00'),
        status: 'completed'
      },
      {
        id: 'action_002',
        action: 'Mobile crisis team en route',
        assignedTo: 'Mobile Crisis Team',
        dueTime: new Date('2024-01-15T15:15:00'),
        status: 'in_progress'
      }
    ],
    status: 'in_progress',
    notes: 'Client located at home address. Emergency services responding.'
  }
];

export default function EmergencyProtocols({ className = "" }: EmergencyProtocolsProps) {
  const [contacts] = useState<EmergencyContact[]>(mockEmergencyContacts);
  const [protocols] = useState<EmergencyProtocol[]>(mockProtocols);
  const [escalations, setEscalations] = useState<EscalationRecord[]>(mockEscalations);
  const [activeTab, setActiveTab] = useState<'contacts' | 'protocols' | 'escalations' | 'active'>('contacts');
  const [selectedProtocol, setSelectedProtocol] = useState<EmergencyProtocol | null>(null);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Filter functions
  const filteredContacts = contacts.filter(contact => {
    if (searchTerm && !contact.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !contact.organization.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return contact.active;
  });

  const filteredProtocols = protocols.filter(protocol => {
    if (searchTerm && !protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !protocol.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedCategory && protocol.category !== selectedCategory) return false;
    return protocol.active;
  });

  const activeEscalations = escalations.filter(esc => 
    esc.status === 'in_progress' || esc.status === 'pending'
  );

  const handleContactTest = (contactId: string) => {
    // In a real implementation, this would test the contact
    console.log(`Testing contact: ${contactId}`);
    // Update last contact time
  };

  const handleProtocolActivate = (protocolId: string, clientId?: string, reason?: string) => {
    const protocol = protocols.find(p => p.id === protocolId);
    if (!protocol) return;

    // Create escalation record
    const escalation: EscalationRecord = {
      id: `esc_${Date.now()}`,
      protocolId,
      clientId,
      escalationLevel: 1,
      initiatedBy: 'Current User', // Would be actual user
      initiatedAt: new Date(),
      reason: reason || 'Protocol activation',
      contactsNotified: [],
      actions: [],
      status: 'pending',
      notes: ''
    };

    setEscalations(prev => [...prev, escalation]);
  };

  const toggleContactExpanded = (contactId: string) => {
    setExpandedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'moderate': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-green-700 bg-green-100 border-green-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case '24/7': return 'text-green-600 bg-green-50';
      case 'on_call': return 'text-blue-600 bg-blue-50';
      case 'business_hours': return 'text-yellow-600 bg-yellow-50';
      case 'emergency_only': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
              Emergency Contact & Escalation Protocols
            </h2>
            <p className="text-gray-600 mt-1">
              Crisis response contacts, protocols, and escalation procedures
            </p>
          </div>
          
          {activeEscalations.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
              <BellAlertIcon className="h-5 w-5 animate-pulse" />
              <span className="font-medium">{activeEscalations.length} Active Escalation{activeEscalations.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="flex space-x-8">
            {[
              { id: 'contacts', label: 'Emergency Contacts', icon: PhoneIcon, count: contacts.filter(c => c.active).length },
              { id: 'protocols', label: 'Response Protocols', icon: DocumentTextIcon, count: protocols.filter(p => p.active).length },
              { id: 'escalations', label: 'Escalation History', icon: ExclamationTriangleIcon },
              { id: 'active', label: 'Active Escalations', icon: BellAlertIcon, count: activeEscalations.length }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === tab.id 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Emergency Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Test All Contacts
              </button>
            </div>

            <div className="grid gap-4">
              {filteredContacts.map(contact => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleContactExpanded(contact.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <PhoneIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{contact.name}</h3>
                          <p className="text-sm text-gray-600">{contact.organization} • {contact.role}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm font-medium text-gray-900">{contact.phone}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getAvailabilityColor(contact.availability)}`}>
                              {contact.availability.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              Response: {contact.responseTime}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          contact.contactPriority === 'primary' ? 'bg-green-100 text-green-800' :
                          contact.contactPriority === 'secondary' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contact.contactPriority}
                        </span>
                        {expandedContacts.has(contact.id) ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedContacts.has(contact.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 p-4 bg-gray-50"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Contact Details</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              {contact.email && <div><strong>Email:</strong> {contact.email}</div>}
                              {contact.address && <div><strong>Address:</strong> {contact.address}</div>}
                              {contact.jurisdiction && <div><strong>Jurisdiction:</strong> {contact.jurisdiction}</div>}
                              {contact.lastContact && (
                                <div><strong>Last Contact:</strong> {format(contact.lastContact, 'MMM d, yyyy h:mm a')}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Specialties</h4>
                            <div className="flex flex-wrap gap-1">
                              {contact.specialties.map(specialty => (
                                <span key={specialty} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                            {contact.notes && (
                              <div className="mt-2">
                                <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
                                <p className="text-sm text-gray-600">{contact.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            onClick={() => handleContactTest(contact.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Test Contact
                          </button>
                          <button
                            onClick={() => window.open(`tel:${contact.phone}`)}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Call Now
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Protocols Tab */}
        {activeTab === 'protocols' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search protocols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Categories</option>
                <option value="suicide_risk">Suicide Risk</option>
                <option value="violence_threat">Violence Threat</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="domestic_violence">Domestic Violence</option>
                <option value="child_abuse">Child Abuse</option>
                <option value="elder_abuse">Elder Abuse</option>
              </select>
            </div>

            <div className="grid gap-4">
              {filteredProtocols.map(protocol => (
                <motion.div
                  key={protocol.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border-2 rounded-lg p-6 ${getSeverityColor(protocol.severity)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{protocol.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(protocol.severity)}`}>
                          {protocol.severity.toUpperCase()}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          v{protocol.version}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{protocol.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Activation Criteria:</h4>
                          <ul className="space-y-1 text-gray-600">
                            {protocol.activationCriteria.slice(0, 3).map((criteria, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                {criteria}
                              </li>
                            ))}
                            {protocol.activationCriteria.length > 3 && (
                              <li className="text-gray-500">+{protocol.activationCriteria.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Protocol Steps:</h4>
                          <div className="space-y-1 text-gray-600">
                            {protocol.steps.slice(0, 3).map((step, index) => (
                              <div key={step.id} className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center">
                                  {step.stepNumber}
                                </span>
                                <span>{step.title}</span>
                                {step.timeLimit && (
                                  <span className="text-red-600 text-xs">({step.timeLimit}min)</span>
                                )}
                              </div>
                            ))}
                            {protocol.steps.length > 3 && (
                              <div className="text-gray-500">+{protocol.steps.length - 3} more steps</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedProtocol(protocol);
                          setShowProtocolModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Enter reason for protocol activation:');
                          if (reason) {
                            handleProtocolActivate(protocol.id, undefined, reason);
                          }
                        }}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 border-t pt-3">
                    Last updated: {format(protocol.lastUpdated, 'MMM d, yyyy')} • Approved by: {protocol.approvedBy}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Active Escalations Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeEscalations.length > 0 ? (
              activeEscalations.map(escalation => {
                const protocol = protocols.find(p => p.id === escalation.protocolId);
                return (
                  <motion.div
                    key={escalation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border-2 border-red-200 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <BellAlertIcon className="h-6 w-6 text-red-600 animate-pulse" />
                          <h3 className="text-lg font-semibold text-red-900">
                            {protocol?.name || 'Unknown Protocol'}
                          </h3>
                          <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded-full">
                            Level {escalation.escalationLevel}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            escalation.status === 'in_progress' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                          }`}>
                            {escalation.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-red-800 mb-2"><strong>Reason:</strong> {escalation.reason}</p>
                            <p className="text-red-700 mb-2">
                              <strong>Initiated:</strong> {format(escalation.initiatedAt, 'MMM d, yyyy h:mm a')}
                            </p>
                            <p className="text-red-700">
                              <strong>Initiated by:</strong> {escalation.initiatedBy}
                            </p>
                          </div>
                          <div>
                            <p className="text-red-700 mb-2">
                              <strong>Contacts Notified:</strong> {escalation.contactsNotified.length}
                            </p>
                            <p className="text-red-700">
                              <strong>Actions:</strong> {escalation.actions.length} ({escalation.actions.filter(a => a.status === 'completed').length} completed)
                            </p>
                          </div>
                        </div>
                        
                        {escalation.actions.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-red-900 mb-2">Current Actions:</h4>
                            <div className="space-y-2">
                              {escalation.actions.map(action => (
                                <div key={action.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                      action.status === 'completed' ? 'bg-green-500' :
                                      action.status === 'in_progress' ? 'bg-yellow-500' :
                                      action.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                                    }`} />
                                    <span className="text-sm">{action.action}</span>
                                  </div>
                                  <span className="text-xs text-gray-600">{action.assignedTo}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Escalations</h3>
                <p className="text-gray-600">All escalations have been resolved.</p>
              </div>
            )}
          </div>
        )}

        {/* Escalations History Tab */}
        {activeTab === 'escalations' && (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Escalation History</h3>
            <p className="text-gray-600">
              Historical escalation records and outcomes will be displayed here.
            </p>
          </div>
        )}
      </div>

      {/* Protocol Detail Modal */}
      <AnimatePresence>
        {showProtocolModal && selectedProtocol && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedProtocol.name} Protocol
                </h2>
                <button
                  onClick={() => setShowProtocolModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Protocol Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Activation Criteria</h3>
                    <ul className="space-y-2">
                      {selectedProtocol.activationCriteria.map((criteria, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {criteria}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Legal Requirements</h3>
                    {selectedProtocol.legalRequirements ? (
                      <ul className="space-y-2">
                        {selectedProtocol.legalRequirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No specific legal requirements</p>
                    )}
                  </div>
                </div>

                {/* Protocol Steps */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Protocol Steps</h3>
                  <div className="space-y-4">
                    {selectedProtocol.steps.map(step => (
                      <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
                            <p className="text-gray-600 text-sm mb-2">{step.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {step.timeLimit && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  {step.timeLimit} minutes
                                </span>
                              )}
                              {step.required && (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                              )}
                              {step.contacts && step.contacts.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <PhoneIcon className="h-3 w-3" />
                                  {step.contacts.length} contact{step.contacts.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalation Levels */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Escalation Levels</h3>
                  <div className="space-y-3">
                    {selectedProtocol.escalationLevels.map(level => (
                      <div key={level.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Level {level.level}: {level.name}
                        </h4>
                        <p className="text-gray-600 text-sm mb-3">{level.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="font-medium text-gray-700 mb-1">Triggers:</h5>
                            <ul className="space-y-1">
                              {level.triggers.map((trigger, index) => (
                                <li key={index} className="text-gray-600">• {trigger}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-700 mb-1">Required Actions:</h5>
                            <ul className="space-y-1">
                              {level.requiredActions.map((action, index) => (
                                <li key={index} className="text-gray-600">• {action}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          Timeframe: {level.timeframe}
                          {level.approval?.required && (
                            <span className="ml-4 text-yellow-600">Approval required from {level.approval.approver}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}