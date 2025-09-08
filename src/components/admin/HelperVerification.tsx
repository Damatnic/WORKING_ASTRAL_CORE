'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserIcon as UserCheckIcon,
  DocumentCheckIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  StarIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserGroupIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { format, subDays, subWeeks } from 'date-fns';

interface VerificationApplication {
  id: string;
  applicantId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: Date;
    profileImage?: string;
  };
  roleAppliedFor: 'helper' | 'therapist' | 'crisis_counselor';
  applicationDate: Date;
  status: 'pending' | 'under_review' | 'documentation_requested' | 'interview_scheduled' | 'approved' | 'rejected' | 'on_hold';
  currentStep: number;
  totalSteps: number;
  credentials: {
    education: Array<{
      institution: string;
      degree: string;
      fieldOfStudy: string;
      graduationDate: Date;
      isVerified: boolean;
    }>;
    licenses: Array<{
      type: string;
      number: string;
      issuingAuthority: string;
      issueDate: Date;
      expiryDate: Date;
      isVerified: boolean;
    }>;
    certifications: Array<{
      name: string;
      issuingOrganization: string;
      issueDate: Date;
      expiryDate?: Date;
      isVerified: boolean;
    }>;
    experience: Array<{
      organization: string;
      position: string;
      startDate: Date;
      endDate?: Date;
      description: string;
      isVerified: boolean;
    }>;
  };
  documents: Array<{
    id: string;
    type: 'diploma' | 'license' | 'certificate' | 'resume' | 'transcript' | 'reference' | 'background_check' | 'photo_id';
    filename: string;
    uploadDate: Date;
    status: 'pending' | 'verified' | 'rejected';
    reviewNotes?: string;
  }>;
  backgroundCheck: {
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completedDate?: Date;
    results?: {
      criminalHistory: boolean;
      professionalSanctions: boolean;
      references: boolean;
      identityVerified: boolean;
    };
  };
  interview: {
    status: 'not_scheduled' | 'scheduled' | 'completed' | 'rescheduled';
    scheduledDate?: Date;
    interviewer?: string;
    type: 'video' | 'phone' | 'in_person';
    notes?: string;
    rating?: number;
  };
  references: Array<{
    name: string;
    relationship: string;
    organization: string;
    email: string;
    phone: string;
    contacted: boolean;
    response?: string;
    rating?: number;
  }>;
  specializations: string[];
  languagesSpoken: string[];
  availability: {
    hoursPerWeek: number;
    timeZone: string;
    preferredSchedule: string[];
  };
  motivationStatement: string;
  reviewHistory: Array<{
    reviewerId: string;
    reviewerName: string;
    timestamp: Date;
    action: string;
    notes: string;
  }>;
  assignedReviewer?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  flagged: boolean;
  flagReason?: string;
}

const mockApplications: VerificationApplication[] = [
  {
    id: 'app-1',
    applicantId: 'user-123',
    personalInfo: {
      firstName: 'Dr. Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@email.com',
      phone: '+1 (555) 123-4567',
      address: '123 Main St, San Francisco, CA 94102',
      dateOfBirth: new Date('1985-05-15')
    },
    roleAppliedFor: 'therapist',
    applicationDate: subDays(new Date(), 5),
    status: 'under_review',
    currentStep: 3,
    totalSteps: 6,
    credentials: {
      education: [
        {
          institution: 'Stanford University',
          degree: 'PhD',
          fieldOfStudy: 'Clinical Psychology',
          graduationDate: new Date('2015-06-01'),
          isVerified: true
        },
        {
          institution: 'UC Berkeley',
          degree: 'BA',
          fieldOfStudy: 'Psychology',
          graduationDate: new Date('2010-05-15'),
          isVerified: true
        }
      ],
      licenses: [
        {
          type: 'Licensed Clinical Psychologist',
          number: 'PSY12345',
          issuingAuthority: 'California Board of Psychology',
          issueDate: new Date('2016-01-15'),
          expiryDate: new Date('2026-01-15'),
          isVerified: true
        }
      ],
      certifications: [
        {
          name: 'Trauma-Informed Care Specialist',
          issuingOrganization: 'International Society for Traumatic Stress Studies',
          issueDate: new Date('2018-03-20'),
          expiryDate: new Date('2025-03-20'),
          isVerified: true
        }
      ],
      experience: [
        {
          organization: 'SF General Hospital',
          position: 'Clinical Psychologist',
          startDate: new Date('2016-02-01'),
          endDate: new Date('2023-12-01'),
          description: 'Provided individual and group therapy for patients with anxiety, depression, and trauma',
          isVerified: false
        }
      ]
    },
    documents: [
      {
        id: 'doc-1',
        type: 'diploma',
        filename: 'PhD_Diploma_Stanford.pdf',
        uploadDate: subDays(new Date(), 5),
        status: 'verified'
      },
      {
        id: 'doc-2',
        type: 'license',
        filename: 'CA_Psychology_License.pdf',
        uploadDate: subDays(new Date(), 5),
        status: 'verified'
      },
      {
        id: 'doc-3',
        type: 'resume',
        filename: 'Sarah_Chen_Resume.pdf',
        uploadDate: subDays(new Date(), 5),
        status: 'pending'
      }
    ],
    backgroundCheck: {
      status: 'completed',
      completedDate: subDays(new Date(), 2),
      results: {
        criminalHistory: false,
        professionalSanctions: false,
        references: true,
        identityVerified: true
      }
    },
    interview: {
      status: 'scheduled',
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      interviewer: 'Dr. Michael Rodriguez',
      type: 'video',
      notes: 'Initial screening interview'
    },
    references: [
      {
        name: 'Dr. Jennifer Walsh',
        relationship: 'Former Supervisor',
        organization: 'SF General Hospital',
        email: 'j.walsh@sfgh.org',
        phone: '+1 (555) 987-6543',
        contacted: true,
        response: 'Excellent clinical skills and patient rapport',
        rating: 5
      },
      {
        name: 'Dr. Robert Kim',
        relationship: 'Colleague',
        organization: 'SF General Hospital',
        email: 'r.kim@sfgh.org',
        phone: '+1 (555) 456-7890',
        contacted: false
      }
    ],
    specializations: ['Anxiety Disorders', 'Depression', 'Trauma Therapy', 'Cognitive Behavioral Therapy'],
    languagesSpoken: ['English', 'Mandarin', 'Spanish'],
    availability: {
      hoursPerWeek: 25,
      timeZone: 'America/Los_Angeles',
      preferredSchedule: ['Monday Evening', 'Tuesday Evening', 'Weekend']
    },
    motivationStatement: 'I am passionate about providing accessible mental health care and believe this platform can help reach underserved populations.',
    reviewHistory: [
      {
        reviewerId: 'admin-1',
        reviewerName: 'Admin Chen',
        timestamp: subDays(new Date(), 3),
        action: 'Document verification completed',
        notes: 'All educational and licensing documents verified'
      }
    ],
    assignedReviewer: 'admin-1',
    priority: 'normal',
    flagged: false
  },
  {
    id: 'app-2',
    applicantId: 'user-456',
    personalInfo: {
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'mjohnson@email.com',
      phone: '+1 (555) 234-5678',
      address: '456 Oak Ave, Portland, OR 97201',
      dateOfBirth: new Date('1990-08-22')
    },
    roleAppliedFor: 'helper',
    applicationDate: subDays(new Date(), 10),
    status: 'documentation_requested',
    currentStep: 2,
    totalSteps: 4,
    credentials: {
      education: [
        {
          institution: 'Portland Community College',
          degree: 'Certificate',
          fieldOfStudy: 'Peer Support Specialist',
          graduationDate: new Date('2022-12-15'),
          isVerified: false
        }
      ],
      licenses: [],
      certifications: [
        {
          name: 'Mental Health First Aid',
          issuingOrganization: 'National Council for Mental Wellbeing',
          issueDate: new Date('2023-01-10'),
          isVerified: false
        }
      ],
      experience: [
        {
          organization: 'Crisis Support Network',
          position: 'Volunteer Peer Support',
          startDate: new Date('2021-06-01'),
          description: 'Provided peer support to individuals in crisis',
          isVerified: false
        }
      ]
    },
    documents: [
      {
        id: 'doc-4',
        type: 'certificate',
        filename: 'Peer_Support_Certificate.pdf',
        uploadDate: subDays(new Date(), 10),
        status: 'rejected',
        reviewNotes: 'Document quality too poor to verify - please resubmit'
      }
    ],
    backgroundCheck: {
      status: 'pending'
    },
    interview: {
      status: 'not_scheduled',
      type: 'video'
    },
    references: [],
    specializations: ['Peer Support', 'Crisis Intervention'],
    languagesSpoken: ['English'],
    availability: {
      hoursPerWeek: 15,
      timeZone: 'America/Los_Angeles',
      preferredSchedule: ['Weekends', 'Friday Evening']
    },
    motivationStatement: 'Having experienced mental health challenges myself, I want to help others on their recovery journey.',
    reviewHistory: [
      {
        reviewerId: 'admin-2',
        reviewerName: 'Admin Wilson',
        timestamp: subDays(new Date(), 2),
        action: 'Requested document resubmission',
        notes: 'Certificate image unclear - requested higher quality scan'
      }
    ],
    assignedReviewer: 'admin-2',
    priority: 'normal',
    flagged: false
  },
  {
    id: 'app-3',
    applicantId: 'user-789',
    personalInfo: {
      firstName: 'Emma',
      lastName: 'Rodriguez',
      email: 'e.rodriguez@email.com',
      phone: '+1 (555) 345-6789',
      address: '789 Pine St, Denver, CO 80202',
      dateOfBirth: new Date('1988-03-10')
    },
    roleAppliedFor: 'crisis_counselor',
    applicationDate: subDays(new Date(), 3),
    status: 'pending',
    currentStep: 1,
    totalSteps: 7,
    credentials: {
      education: [
        {
          institution: 'University of Denver',
          degree: 'MSW',
          fieldOfStudy: 'Clinical Social Work',
          graduationDate: new Date('2014-05-20'),
          isVerified: false
        }
      ],
      licenses: [
        {
          type: 'Licensed Clinical Social Worker',
          number: 'LCSW9876',
          issuingAuthority: 'Colorado Department of Regulatory Agencies',
          issueDate: new Date('2016-08-01'),
          expiryDate: new Date('2026-08-01'),
          isVerified: false
        }
      ],
      certifications: [
        {
          name: 'Crisis Intervention Specialist',
          issuingOrganization: 'American Association of Crisis Counselors',
          issueDate: new Date('2017-11-15'),
          isVerified: false
        }
      ],
      experience: [
        {
          organization: 'Denver Crisis Center',
          position: 'Crisis Counselor',
          startDate: new Date('2016-09-01'),
          description: '24/7 crisis hotline counselor and mobile crisis response',
          isVerified: false
        }
      ]
    },
    documents: [],
    backgroundCheck: {
      status: 'pending'
    },
    interview: {
      status: 'not_scheduled',
      type: 'video'
    },
    references: [],
    specializations: ['Crisis Intervention', 'Suicide Prevention', 'Trauma Response'],
    languagesSpoken: ['English', 'Spanish'],
    availability: {
      hoursPerWeek: 40,
      timeZone: 'America/Denver',
      preferredSchedule: ['24/7 On-Call']
    },
    motivationStatement: 'I have 8 years of experience in crisis intervention and want to expand my reach through this platform.',
    reviewHistory: [],
    priority: 'high',
    flagged: false
  }
];

export default function HelperVerification() {
  const [applications, setApplications] = useState<VerificationApplication[]>(mockApplications);
  const [selectedApplication, setSelectedApplication] = useState<VerificationApplication | null>(null);
  const [activeView, setActiveView] = useState<'queue' | 'review' | 'analytics'>('queue');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'under_review' | 'documentation_requested' | 'approved' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'helper' | 'therapist' | 'crisis_counselor'>('all');

  const filteredApplications = applications.filter(app => {
    const matchesSearch = `${app.personalInfo.firstName} ${app.personalInfo.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.personalInfo.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesRole = roleFilter === 'all' || app.roleAppliedFor === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingApplications = applications.filter(app => 
    ['pending', 'under_review', 'documentation_requested'].includes(app.status)
  ).length;

  const handleApproveApplication = useCallback((applicationId: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { 
            ...app, 
            status: 'approved',
            reviewHistory: [
              ...app.reviewHistory,
              {
                reviewerId: 'current-admin',
                reviewerName: 'Current Admin',
                timestamp: new Date(),
                action: 'Application approved',
                notes: 'All verification requirements met'
              }
            ]
          }
        : app
    ));
  }, []);

  const handleRejectApplication = useCallback((applicationId: string, reason: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { 
            ...app, 
            status: 'rejected',
            reviewHistory: [
              ...app.reviewHistory,
              {
                reviewerId: 'current-admin',
                reviewerName: 'Current Admin',
                timestamp: new Date(),
                action: 'Application rejected',
                notes: reason
              }
            ]
          }
        : app
    ));
  }, []);

  const handleRequestDocumentation = useCallback((applicationId: string, reason: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { 
            ...app, 
            status: 'documentation_requested',
            reviewHistory: [
              ...app.reviewHistory,
              {
                reviewerId: 'current-admin',
                reviewerName: 'Current Admin',
                timestamp: new Date(),
                action: 'Documentation requested',
                notes: reason
              }
            ]
          }
        : app
    ));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'under_review': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'documentation_requested': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'interview_scheduled': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'on_hold': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'crisis_counselor': return 'text-red-600 bg-red-50 border-red-200';
      case 'therapist': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'helper': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-gray-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (activeView === 'analytics') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Verification Analytics</h2>
            <p className="text-gray-600">Application statistics and performance metrics</p>
          </div>
          <button
            onClick={() => setActiveView('queue')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Queue
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{applications.length}</div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{pendingApplications}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {applications.filter(app => app.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-red-600">
              {applications.filter(app => app.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications by Role</h3>
            <div className="space-y-3">
              {['therapist', 'helper', 'crisis_counselor'].map(role => {
                const count = applications.filter(app => app.roleAppliedFor === role).length;
                return (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{role.replace('_', ' ')}</span>
                    <div className="flex items-center">
                      <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                        <div 
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${(count / applications.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-6">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
            <div className="space-y-3">
              {['pending', 'under_review', 'documentation_requested', 'approved', 'rejected'].map(status => {
                const count = applications.filter(app => app.status === status).length;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                    <div className="flex items-center">
                      <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                        <div 
                          className="h-2 bg-green-600 rounded-full"
                          style={{ width: `${(count / applications.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-6">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedApplication) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Application Review</h2>
            <p className="text-gray-600">
              {selectedApplication.personalInfo.firstName} {selectedApplication.personalInfo.lastName} - 
              {selectedApplication.roleAppliedFor.replace('_', ' ').charAt(0).toUpperCase() + selectedApplication.roleAppliedFor.replace('_', ' ').slice(1)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedApplication(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Queue
            </button>
            {selectedApplication.status !== 'approved' && selectedApplication.status !== 'rejected' && (
              <>
                <button
                  onClick={() => handleApproveApplication(selectedApplication.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRejectApplication(selectedApplication.id, 'Application does not meet requirements')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Application Progress</span>
            <span className="text-sm text-gray-600">
              Step {selectedApplication.currentStep} of {selectedApplication.totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="h-3 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(selectedApplication.currentStep / selectedApplication.totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                  <p className="text-gray-900">
                    {selectedApplication.personalInfo.firstName} {selectedApplication.personalInfo.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <p className="text-gray-900">{selectedApplication.personalInfo.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                  <p className="text-gray-900">{selectedApplication.personalInfo.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
                  <p className="text-gray-900">{format(selectedApplication.personalInfo.dateOfBirth, 'PPP')}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                  <p className="text-gray-900">{selectedApplication.personalInfo.address}</p>
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Credentials</h3>
              
              {/* Education */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Education</h4>
                <div className="space-y-3">
                  {selectedApplication.credentials.education.map((edu, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{edu.degree} in {edu.fieldOfStudy}</p>
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                        <p className="text-sm text-gray-500">Graduated {format(edu.graduationDate, 'yyyy')}</p>
                      </div>
                      <div className="flex items-center">
                        {edu.isVerified ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Licenses */}
              {selectedApplication.credentials.licenses.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Professional Licenses</h4>
                  <div className="space-y-3">
                    {selectedApplication.credentials.licenses.map((license, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{license.type}</p>
                          <p className="text-sm text-gray-600">#{license.number}</p>
                          <p className="text-sm text-gray-500">
                            {license.issuingAuthority} • Expires {format(license.expiryDate, 'MMM yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {license.isVerified ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <ClockIcon className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {selectedApplication.credentials.certifications.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Certifications</h4>
                  <div className="space-y-3">
                    {selectedApplication.credentials.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{cert.name}</p>
                          <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                          <p className="text-sm text-gray-500">
                            Issued {format(cert.issueDate, 'MMM yyyy')}
                            {cert.expiryDate && ` • Expires ${format(cert.expiryDate, 'MMM yyyy')}`}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {cert.isVerified ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <ClockIcon className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submitted Documents</h3>
              <div className="space-y-3">
                {selectedApplication.documents.length > 0 ? (
                  selectedApplication.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {doc.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">{doc.filename}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded {format(doc.uploadDate, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                        <button className="p-1 text-blue-600 hover:text-blue-800">
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
                )}
              </div>
            </div>

            {/* Background Check */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Background Check</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Status</span>
                  <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(selectedApplication.backgroundCheck.status)}`}>
                    {selectedApplication.backgroundCheck.status.replace('_', ' ')}
                  </span>
                </div>
                
                {selectedApplication.backgroundCheck.results && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Criminal History</span>
                      {selectedApplication.backgroundCheck.results.criminalHistory ? (
                        <XCircleIcon className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Professional Sanctions</span>
                      {selectedApplication.backgroundCheck.results.professionalSanctions ? (
                        <XCircleIcon className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">References Verified</span>
                      {selectedApplication.backgroundCheck.results.references ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Identity Verified</span>
                      {selectedApplication.backgroundCheck.results.identityVerified ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status and Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Status</span>
                  <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(selectedApplication.status)}`}>
                    {selectedApplication.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Priority</span>
                  <span className={`font-medium ${getPriorityColor(selectedApplication.priority)}`}>
                    {selectedApplication.priority.charAt(0).toUpperCase() + selectedApplication.priority.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Applied</span>
                  <span className="text-gray-900">{format(selectedApplication.applicationDate, 'MMM d, yyyy')}</span>
                </div>
                {selectedApplication.assignedReviewer && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Reviewer</span>
                    <span className="text-gray-900">{selectedApplication.assignedReviewer}</span>
                  </div>
                )}
              </div>

              {selectedApplication.status !== 'approved' && selectedApplication.status !== 'rejected' && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => handleRequestDocumentation(selectedApplication.id, 'Additional documentation required')}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Request Documents
                  </button>
                </div>
              )}
            </div>

            {/* Interview Information */}
            {selectedApplication.interview.status !== 'not_scheduled' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(selectedApplication.interview.status)}`}>
                      {selectedApplication.interview.status.replace('_', ' ')}
                    </span>
                  </div>
                  {selectedApplication.interview.scheduledDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Scheduled</span>
                      <span className="text-gray-900">
                        {format(selectedApplication.interview.scheduledDate, 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                  {selectedApplication.interview.interviewer && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Interviewer</span>
                      <span className="text-gray-900">{selectedApplication.interview.interviewer}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type</span>
                    <span className="text-gray-900 capitalize">{selectedApplication.interview.type}</span>
                  </div>
                  {selectedApplication.interview.rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Rating</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${
                              i < selectedApplication.interview.rating!
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review History */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review History</h3>
              <div className="space-y-3">
                {selectedApplication.reviewHistory.length > 0 ? (
                  selectedApplication.reviewHistory.map((review, index) => (
                    <div key={index} className="border-l-2 border-blue-500 pl-3">
                      <p className="font-medium text-gray-900">{review.action}</p>
                      <p className="text-sm text-gray-600">{review.notes}</p>
                      <p className="text-xs text-gray-500">
                        {review.reviewerName} • {format(review.timestamp, 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No review history yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Helper Verification</h2>
          <p className="text-gray-600">Review and approve helper, therapist, and crisis counselor applications</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('analytics')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Analytics
          </button>
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingApplications} Pending
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-orange-600">{pendingApplications}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {applications.filter(app => app.status === 'under_review').length}
          </div>
          <div className="text-sm text-gray-600">Under Review</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {applications.filter(app => app.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-red-600">
            {applications.filter(app => app.flagged).length}
          </div>
          <div className="text-sm text-gray-600">Flagged</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="documentation_requested">Documentation Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="helper">Helper</option>
              <option value="therapist">Therapist</option>
              <option value="crisis_counselor">Crisis Counselor</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <motion.tr
                  key={application.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <UserCheckIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {application.personalInfo.firstName} {application.personalInfo.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.personalInfo.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(application.roleAppliedFor)}`}>
                      {application.roleAppliedFor.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
                        {application.status.replace('_', ' ')}
                      </span>
                      {application.flagged && (
                        <FlagIcon className="h-4 w-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                        <div 
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${(application.currentStep / application.totalSteps) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {application.currentStep}/{application.totalSteps}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(application.applicationDate, 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${getPriorityColor(application.priority)}`}>
                      {application.priority.charAt(0).toUpperCase() + application.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedApplication(application)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {application.status !== 'approved' && application.status !== 'rejected' && (
                      <>
                        <button
                          onClick={() => handleApproveApplication(application.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRejectApplication(application.id, 'Application rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No applications match the current filters
          </div>
        )}
      </div>
    </div>
  );
}