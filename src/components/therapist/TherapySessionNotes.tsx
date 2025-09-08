'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  BookmarkIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface SessionNote {
  id: string;
  clientId: string;
  clientName: string;
  sessionDate: Date;
  sessionType: 'individual' | 'group' | 'family' | 'couples';
  sessionDuration: number;
  treatmentModality: 'CBT' | 'DBT' | 'EMDR' | 'psychodynamic' | 'humanistic' | 'integrated';
  sessionGoals: string[];
  progressNotes: string;
  interventions: string[];
  clientResponse: string;
  homework: string[];
  nextSessionPlan: string;
  riskAssessment: 'low' | 'moderate' | 'high';
  confidentialityNotes: string;
  supervisorReview: boolean;
  billable: boolean;
  insuranceCode: string;
  createdBy: string;
  lastModified: Date;
  isTemplate: boolean;
  tags: string[];
  attachments: { id: string; name: string; type: string; }[];
}

interface TherapySessionNotesProps {
  className?: string;
}

const mockSessionNotes: SessionNote[] = [
  {
    id: 'sn001',
    clientId: 'cl001',
    clientName: 'Sarah Johnson',
    sessionDate: new Date('2024-01-15T14:00:00'),
    sessionType: 'individual',
    sessionDuration: 50,
    treatmentModality: 'CBT',
    sessionGoals: ['Address anxiety symptoms', 'Practice mindfulness techniques'],
    progressNotes: 'Client demonstrated significant improvement in recognizing anxiety triggers. Showed good engagement with CBT techniques introduced in previous sessions. Reports decreased frequency of panic attacks from daily to 2-3 times per week.',
    interventions: ['Cognitive restructuring', 'Breathing exercises', 'Thought record worksheet'],
    clientResponse: 'Positive engagement, actively participated in exercises. Expressed feeling more hopeful about managing symptoms.',
    homework: ['Complete daily thought records', 'Practice 10-minute mindfulness meditation'],
    nextSessionPlan: 'Review homework, introduce exposure therapy techniques for specific triggers',
    riskAssessment: 'low',
    confidentialityNotes: 'No confidentiality concerns. Client consented to discuss progress with primary care physician.',
    supervisorReview: true,
    billable: true,
    insuranceCode: '90834',
    createdBy: 'Dr. Emily Chen',
    lastModified: new Date('2024-01-15T15:30:00'),
    isTemplate: false,
    tags: ['anxiety', 'CBT', 'progress'],
    attachments: []
  },
  {
    id: 'sn002',
    clientId: 'cl002',
    clientName: 'Michael Rodriguez',
    sessionDate: new Date('2024-01-14T10:00:00'),
    sessionType: 'individual',
    sessionDuration: 45,
    treatmentModality: 'EMDR',
    sessionGoals: ['Process traumatic memory', 'Reduce PTSD symptoms'],
    progressNotes: 'Client completed EMDR processing of motor vehicle accident trauma. Significant reduction in disturbance level from 8/10 to 3/10. Client reports sleeping better and fewer intrusive thoughts.',
    interventions: ['EMDR bilateral stimulation', 'Safe place visualization', 'Resource installation'],
    clientResponse: 'Initially emotional during processing but demonstrated resilience. Reported feeling lighter and more in control by session end.',
    homework: ['Practice safe place visualization', 'Continue sleep hygiene routine'],
    nextSessionPlan: 'Continue EMDR processing, address remaining trauma memories',
    riskAssessment: 'moderate',
    confidentialityNotes: 'Client discussed legal proceedings related to accident. Maintained therapeutic boundaries.',
    supervisorReview: false,
    billable: true,
    insuranceCode: '90837',
    createdBy: 'Dr. Emily Chen',
    lastModified: new Date('2024-01-14T11:15:00'),
    isTemplate: false,
    tags: ['PTSD', 'EMDR', 'trauma'],
    attachments: [{ id: 'att001', name: 'EMDR_Protocol_Notes.pdf', type: 'pdf' }]
  },
  {
    id: 'sn003',
    clientId: 'cl003',
    clientName: 'Lisa Thompson',
    sessionDate: new Date('2024-01-13T16:00:00'),
    sessionType: 'family',
    sessionDuration: 60,
    treatmentModality: 'integrated',
    sessionGoals: ['Improve family communication', 'Address adolescent behavioral issues'],
    progressNotes: 'Family session with mother and 16-year-old daughter. Significant tension observed. Introduced family communication patterns and boundaries. Both parties expressed willingness to work on relationship.',
    interventions: ['Family systems therapy', 'Communication skills training', 'Boundary setting exercises'],
    clientResponse: 'Initial resistance from adolescent, but gradual engagement. Mother very motivated for change.',
    homework: ['Weekly family meetings', 'Practice active listening techniques'],
    nextSessionPlan: 'Individual session with adolescent, then family session to practice new skills',
    riskAssessment: 'low',
    confidentialityNotes: 'Discussed confidentiality limits with minor present. Parents aware of reporting requirements.',
    supervisorReview: false,
    billable: true,
    insuranceCode: '90847',
    createdBy: 'Dr. Emily Chen',
    lastModified: new Date('2024-01-13T17:30:00'),
    isTemplate: false,
    tags: ['family therapy', 'adolescent', 'communication'],
    attachments: []
  }
];

const sessionTypeOptions = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'family', label: 'Family' },
  { value: 'couples', label: 'Couples' }
];

const treatmentModalityOptions = [
  { value: 'CBT', label: 'Cognitive Behavioral Therapy' },
  { value: 'DBT', label: 'Dialectical Behavior Therapy' },
  { value: 'EMDR', label: 'Eye Movement Desensitization' },
  { value: 'psychodynamic', label: 'Psychodynamic' },
  { value: 'humanistic', label: 'Humanistic' },
  { value: 'integrated', label: 'Integrated Approach' }
];

const insuranceCodeOptions = [
  { code: '90834', description: '45-minute psychotherapy' },
  { code: '90837', description: '60-minute psychotherapy' },
  { code: '90847', description: 'Family therapy with patient present' },
  { code: '90853', description: 'Group psychotherapy' },
  { code: '90791', description: 'Psychiatric diagnostic evaluation' },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services' }
];

export default function TherapySessionNotes({ className = "" }: TherapySessionNotesProps) {
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>(mockSessionNotes);
  const [filteredNotes, setFilteredNotes] = useState<SessionNote[]>(mockSessionNotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState('');
  const [selectedModality, setSelectedModality] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);

  // Get unique clients for filter dropdown
  const uniqueClients = Array.from(new Set(sessionNotes.map(note => note.clientName)))
    .map(name => ({ value: name, label: name }));

  // Filter notes based on search criteria
  useEffect(() => {
    let filtered = sessionNotes;

    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.progressNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedClient) {
      filtered = filtered.filter(note => note.clientName === selectedClient);
    }

    if (selectedSessionType) {
      filtered = filtered.filter(note => note.sessionType === selectedSessionType);
    }

    if (selectedModality) {
      filtered = filtered.filter(note => note.treatmentModality === selectedModality);
    }

    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      filtered = filtered.filter(note => 
        note.sessionDate >= startDate && note.sessionDate <= endDate
      );
    }

    setFilteredNotes(filtered);
  }, [searchTerm, selectedClient, selectedSessionType, selectedModality, dateRange, sessionNotes]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setSelectedSessionType('');
    setSelectedModality('');
    setDateRange({ start: '', end: '' });
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setShowCreateModal(true);
  };

  const handleEditNote = (note: SessionNote) => {
    setEditingNote(note);
    setShowCreateModal(true);
  };

  const handleDeleteNote = (noteId: string) => {
    setSessionNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const handleViewNote = (note: SessionNote) => {
    setSelectedNote(note);
    setShowNoteModal(true);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return UserIcon;
      case 'group': return UserIcon;
      case 'family': return UserIcon;
      case 'couples': return UserIcon;
      default: return DocumentTextIcon;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
              Session Notes & Documentation
            </h2>
            <p className="text-gray-600 mt-1">
              Manage therapy session notes and clinical documentation
            </p>
          </div>
          <button
            onClick={handleCreateNote}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Session Note
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes, clients, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Clients</option>
                    {uniqueClients.map(client => (
                      <option key={client.value} value={client.value}>{client.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                  <select
                    value={selectedSessionType}
                    onChange={(e) => setSelectedSessionType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Types</option>
                    {sessionTypeOptions.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Modality</label>
                  <select
                    value={selectedModality}
                    onChange={(e) => setSelectedModality(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Modalities</option>
                    {treatmentModalityOptions.map(modality => (
                      <option key={modality.value} value={modality.value}>{modality.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Clear Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session Notes List */}
      <div className="p-6">
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredNotes.map(note => {
              const SessionIcon = getSessionTypeIcon(note.sessionType);
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewNote(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <SessionIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="font-medium text-gray-900">{note.clientName}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(note.riskAssessment)}`}>
                          {note.riskAssessment} risk
                        </span>
                        {note.supervisorReview && (
                          <CheckIcon className="h-4 w-4 text-green-500" title="Supervisor Reviewed" />
                        )}
                        {note.billable && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {note.insuranceCode}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(note.sessionDate, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {note.sessionDuration} minutes
                        </div>
                        <div className="capitalize">
                          {note.sessionType} • {note.treatmentModality}
                        </div>
                        <div className="text-right">
                          Modified: {format(note.lastModified, 'MMM d')}
                        </div>
                      </div>

                      <p className="text-gray-700 line-clamp-2 mb-3">
                        {note.progressNotes}
                      </p>

                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {note.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {note.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <DocumentArrowDownIcon className="h-4 w-4" />
                          {note.attachments.length} attachment(s)
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditNote(note);
                        }}
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Print functionality would go here
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this session note?')) {
                            handleDeleteNote(note.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No session notes found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedClient || selectedSessionType || selectedModality 
                  ? "Try adjusting your search criteria or filters."
                  : "Create your first session note to get started."}
              </p>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4" />
                Create Session Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {showNoteModal && selectedNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Session Note - {selectedNote.clientName}
                </h2>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                    <p className="text-gray-900">{format(selectedNote.sessionDate, 'PPP p')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="text-gray-900">{selectedNote.sessionDuration} minutes</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="text-gray-900 capitalize">{selectedNote.sessionType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Modality</label>
                    <p className="text-gray-900">{selectedNote.treatmentModality}</p>
                  </div>
                </div>

                {/* Session Goals */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Session Goals</h3>
                  <ul className="space-y-2">
                    {selectedNote.sessionGoals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progress Notes */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Progress Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedNote.progressNotes}</p>
                </div>

                {/* Interventions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Interventions Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.interventions.map((intervention, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {intervention}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Client Response */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Client Response</h3>
                  <p className="text-gray-700">{selectedNote.clientResponse}</p>
                </div>

                {/* Homework */}
                {selectedNote.homework.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Homework Assigned</h3>
                    <ul className="space-y-2">
                      {selectedNote.homework.map((task, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-gray-700">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Session Plan */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Next Session Plan</h3>
                  <p className="text-gray-700">{selectedNote.nextSessionPlan}</p>
                </div>

                {/* Risk Assessment */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Risk Assessment</h3>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getRiskColor(selectedNote.riskAssessment)}`}>
                      {selectedNote.riskAssessment} risk
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Supervisor Review: {selectedNote.supervisorReview ? 'Complete' : 'Pending'}</p>
                    <p>Billable: {selectedNote.billable ? `Yes (${selectedNote.insuranceCode})` : 'No'}</p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedNote.attachments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Attachments</h3>
                    <div className="space-y-2">
                      {selectedNote.attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                          <DocumentArrowDownIcon className="h-5 w-5 text-gray-500" />
                          <span className="text-gray-900">{attachment.name}</span>
                          <span className="text-sm text-gray-500 uppercase">{attachment.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Created by: {selectedNote.createdBy}</span>
                    <span>Last modified: {format(selectedNote.lastModified, 'PPP p')}</span>
                  </div>
                  {selectedNote.confidentialityNotes && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800"><strong>Confidentiality Notes:</strong> {selectedNote.confidentialityNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}