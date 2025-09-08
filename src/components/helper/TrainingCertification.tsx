'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AcademicCapIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayCircleIcon,
  CalendarIcon,
  TrophyIcon,
  StarIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { format, addMonths, isBefore, isAfter } from 'date-fns';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'required' | 'optional' | 'advanced';
  category: 'basic' | 'communication' | 'crisis' | 'ethics' | 'specialized';
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  progress: number;
  completedAt?: Date;
  expiresAt?: Date;
  certificateUrl?: string;
  instructor: string;
  rating?: number;
  totalRatings?: number;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedAt: Date;
  expiresAt: Date;
  certificateNumber: string;
  status: 'active' | 'expiring_soon' | 'expired';
  type: 'internal' | 'external';
  renewalRequired: boolean;
  documentUrl?: string;
  verificationUrl?: string;
}

interface TrainingCertificationProps {
  className?: string;
}

// Training modules and certifications will be fetched from API

export default function TrainingCertification({ className = "" }: TrainingCertificationProps) {
  const [activeTab, setActiveTab] = useState<'training' | 'certifications'>('training');
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [trainingRes, certsRes] = await Promise.all([
          fetch('/api/helper/training'),
          fetch('/api/helper/certifications')
        ]);

        if (!trainingRes.ok || !certsRes.ok) {
          throw new Error('Failed to fetch training data');
        }

        const [trainingData, certsData] = await Promise.all([
          trainingRes.json(),
          certsRes.json()
        ]);

        setTrainingModules(trainingData.modules || []);
        setCertifications(certsData.certifications || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  const [filterType, setFilterType] = useState<'all' | 'required' | 'optional' | 'advanced'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  useEffect(() => {
    const updateCertificationStatus = () => {
      const now = new Date();
      const updatedCerts = certifications.map(cert => {
        const daysUntilExpiry = Math.floor((cert.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          return { ...cert, status: 'expired' as const };
        } else if (daysUntilExpiry <= 30) {
          return { ...cert, status: 'expiring_soon' as const };
        } else {
          return { ...cert, status: 'active' as const };
        }
      });
      setCertifications(updatedCerts);
    };

    updateCertificationStatus();
    const interval = setInterval(updateCertificationStatus, 24 * 60 * 60 * 1000); // Check daily

    return () => clearInterval(interval);
  }, [certifications]);

  const filteredTrainingModules = trainingModules.filter(module => {
    const typeMatch = filterType === 'all' || module.type === filterType;
    const statusMatch = filterStatus === 'all' || module.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
      case 'expired':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <PlayCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring_soon':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'communication':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'crisis':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'ethics':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'specialized':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const completedRequired = trainingModules.filter(m => m.type === 'required' && m.status === 'completed').length;
  const totalRequired = trainingModules.filter(m => m.type === 'required').length;
  const completionPercentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  const expiringSoon = certifications.filter(c => c.status === 'expiring_soon').length;
  const expired = certifications.filter(c => c.status === 'expired').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Overview Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <AcademicCapIcon className="w-8 h-8 text-indigo-600" />
              Training & Certifications
            </h2>
            <p className="text-gray-600 mt-1">Manage your professional development and compliance requirements</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{completionPercentage}%</div>
              <div className="text-sm text-gray-600">Required Training</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{certifications.filter(c => c.status === 'active').length}</div>
              <div className="text-sm text-gray-600">Active Certs</div>
            </div>
            {(expiringSoon > 0 || expired > 0) && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{expiringSoon + expired}</div>
                <div className="text-sm text-gray-600">Need Attention</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar for Required Training */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Required Training Progress</span>
            <span>{completedRequired} of {totalRequired} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Alerts */}
        {(expiringSoon > 0 || expired > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              <span className="text-orange-800 font-medium">
                {expired > 0 && `${expired} certification(s) expired`}
                {expired > 0 && expiringSoon > 0 && ', '}
                {expiringSoon > 0 && `${expiringSoon} certification(s) expiring soon`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'training', label: 'Training Modules', icon: AcademicCapIcon },
              { id: 'certifications', label: 'Certifications', icon: DocumentTextIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'training' | 'certifications')}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'training' && (
              <motion.div
                key="training"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Training Filters */}
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as 'all' | 'required' | 'optional' | 'advanced')}
                      className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="all">All Types</option>
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'not_started' | 'in_progress' | 'completed')}
                      className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="all">All Status</option>
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Training Modules Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredTrainingModules.map((module) => (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                            {module.type === 'required' && (
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full border border-red-200">
                                Required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                            <span className={`px-2 py-1 rounded-full border text-xs ${getCategoryColor(module.category)}`}>
                              {module.category.charAt(0).toUpperCase() + module.category.slice(1)}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              {module.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <StarIcon className="w-4 h-4 text-yellow-400" />
                              {module.rating} ({module.totalRatings})
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                          <div className="text-sm text-gray-600 mb-3">
                            <strong>Instructor:</strong> {module.instructor}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(module.status)}
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(module.status)}`}>
                            {module.status.replace('_', ' ').charAt(0).toUpperCase() + module.status.replace('_', ' ').slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {module.progress > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{module.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                              style={{ width: `${module.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Completion/Expiry Info */}
                      {module.completedAt && (
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Completed:</strong> {format(module.completedAt, 'MMM dd, yyyy')}
                        </div>
                      )}
                      {module.expiresAt && (
                        <div className="text-sm text-gray-600 mb-4">
                          <strong>Expires:</strong> {format(module.expiresAt, 'MMM dd, yyyy')}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {module.status === 'not_started' && (
                          <button className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                            <PlayCircleIcon className="w-4 h-4" />
                            Start Training
                          </button>
                        )}
                        {module.status === 'in_progress' && (
                          <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <PlayCircleIcon className="w-4 h-4" />
                            Continue
                          </button>
                        )}
                        {module.status === 'completed' && module.certificateUrl && (
                          <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download Certificate
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedModule(module)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <EyeIcon className="w-4 h-4" />
                          Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'certifications' && (
              <motion.div
                key="certifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Certifications List */}
                <div className="space-y-4">
                  {certifications.map((cert) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <TrophyIcon className="w-6 h-6 text-yellow-500" />
                            <h3 className="text-xl font-semibold text-gray-900">{cert.name}</h3>
                            <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(cert.status)}`}>
                              {cert.status.replace('_', ' ').charAt(0).toUpperCase() + cert.status.replace('_', ' ').slice(1)}
                            </span>
                            {cert.type === 'external' && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">
                                External
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <span className="font-medium text-gray-700">Issuer:</span><br />
                              {cert.issuer}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Certificate #:</span><br />
                              {cert.certificateNumber}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Issued:</span><br />
                              {format(cert.issuedAt, 'MMM dd, yyyy')}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Expires:</span><br />
                              <span className={cert.status === 'expired' || cert.status === 'expiring_soon' ? 'text-red-600 font-medium' : ''}>
                                {format(cert.expiresAt, 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>

                          {cert.renewalRequired && cert.status !== 'active' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
                                <span className="text-orange-800 text-sm">
                                  {cert.status === 'expired' ? 'This certification has expired and needs renewal.' : 'This certification expires soon and needs renewal.'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {cert.documentUrl && (
                            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              Download
                            </button>
                          )}
                          {cert.verificationUrl && (
                            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                              <EyeIcon className="w-4 h-4" />
                              Verify
                            </button>
                          )}
                          {cert.renewalRequired && (cert.status === 'expired' || cert.status === 'expiring_soon') && (
                            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4" />
                              Renew
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Add New Certification Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <DocumentTextIcon className="w-8 h-8" />
                    <span className="font-medium">Add External Certification</span>
                    <span className="text-sm">Upload certificates from external organizations</span>
                  </div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Training Module Details Modal */}
      <AnimatePresence>
        {selectedModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedModule(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedModule.title}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full border text-sm ${getCategoryColor(selectedModule.category)}`}>
                        {selectedModule.category.charAt(0).toUpperCase() + selectedModule.category.slice(1)}
                      </span>
                      {selectedModule.type === 'required' && (
                        <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full border border-red-200">
                          Required
                        </span>
                      )}
                      <span className={`text-sm px-3 py-1 rounded-full border ${getStatusColor(selectedModule.status)}`}>
                        {selectedModule.status.replace('_', ' ').charAt(0).toUpperCase() + selectedModule.status.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedModule.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Duration</h4>
                      <p className="text-gray-600">{selectedModule.duration}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Instructor</h4>
                      <p className="text-gray-600">{selectedModule.instructor}</p>
                    </div>
                  </div>

                  {selectedModule.rating && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Rating</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              className={`w-5 h-5 ${star <= Math.floor(selectedModule.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-gray-600">{selectedModule.rating} ({selectedModule.totalRatings} reviews)</span>
                      </div>
                    </div>
                  )}

                  {selectedModule.progress > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Progress</h4>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full"
                          style={{ width: `${selectedModule.progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{selectedModule.progress}% completed</p>
                    </div>
                  )}

                  {selectedModule.completedAt && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Completion Date</h4>
                      <p className="text-gray-600">{format(selectedModule.completedAt, 'MMMM dd, yyyy')}</p>
                    </div>
                  )}

                  {selectedModule.expiresAt && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Expiration Date</h4>
                      <p className="text-gray-600">{format(selectedModule.expiresAt, 'MMMM dd, yyyy')}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-6 border-t">
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {selectedModule.status === 'not_started' && (
                    <button className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                      Start Training
                    </button>
                  )}
                  {selectedModule.status === 'in_progress' && (
                    <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Continue Training
                    </button>
                  )}
                  {selectedModule.status === 'completed' && selectedModule.certificateUrl && (
                    <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                      Download Certificate
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}