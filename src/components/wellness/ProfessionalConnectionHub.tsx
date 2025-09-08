/**
 * ProfessionalConnectionHub - Connect with healthcare providers and track treatment
 * Manages therapy sessions, treatment plans, and professional care coordination
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  Video,
  Phone,
  MessageSquare,
  FileText,
  Shield,
  ChevronRight,
  Plus,
  Star,
  CheckCircle,
  AlertCircle,
  Pill,
  Activity,
  Brain,
  Stethoscope,
  Download,
  Upload,
  Send,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/contexts/AuthContext';

interface ProfessionalConnectionHubProps {
  onScheduleAppointment?: () => void;
  onContactProvider?: (provider: Provider) => void;
}

interface Provider {
  id: string;
  name: string;
  title: string;
  specialty: string;
  photo?: string;
  rating: number;
  nextAppointment?: Date;
  lastContact?: Date;
  isAvailable: boolean;
  contactMethods: ('video' | 'phone' | 'message')[];
}

interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  date: Date;
  type: 'therapy' | 'psychiatry' | 'checkup' | 'emergency';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  duration: number;
  mode: 'in-person' | 'video' | 'phone';
}

interface TreatmentPlan {
  id: string;
  name: string;
  provider: string;
  startDate: Date;
  goals: string[];
  medications?: string[];
  interventions: string[];
  progress: number;
  nextReview: Date;
}

const ProfessionalConnectionHub: React.FC<ProfessionalConnectionHubProps> = ({
  onScheduleAppointment,
  onContactProvider
}: ProfessionalConnectionHubProps) => {
  const { user } = useAuth() as AuthContextType;
  const [activeTab, setActiveTab] = useState<'team' | 'appointments' | 'treatment' | 'records'>('team');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCareTeam();
    loadAppointments();
    loadTreatmentPlan();
  }, []);

  const loadCareTeam = () => {
    setProviders([
      {
        id: '1',
        name: 'Dr. Sarah Johnson',
        title: 'Psychiatrist',
        specialty: 'Anxiety & Depression',
        rating: 4.9,
        nextAppointment: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isAvailable: true,
        contactMethods: ['video', 'message']
      },
      {
        id: '2',
        name: 'Michael Chen, LCSW',
        title: 'Therapist',
        specialty: 'CBT & Trauma',
        rating: 4.8,
        nextAppointment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isAvailable: false,
        contactMethods: ['video', 'phone', 'message']
      },
      {
        id: '3',
        name: 'Dr. Emily Rodriguez',
        title: 'Primary Care',
        specialty: 'General Health',
        rating: 4.7,
        lastContact: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        isAvailable: true,
        contactMethods: ['phone', 'message']
      }
    ]);
  };

  const loadAppointments = () => {
    setAppointments([
      {
        id: '1',
        providerId: '1',
        providerName: 'Dr. Sarah Johnson',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        type: 'psychiatry',
        status: 'scheduled',
        duration: 30,
        mode: 'video',
        notes: 'Medication review and mood check-in'
      },
      {
        id: '2',
        providerId: '2',
        providerName: 'Michael Chen, LCSW',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'therapy',
        status: 'scheduled',
        duration: 50,
        mode: 'video',
        notes: 'CBT session - working on thought patterns'
      },
      {
        id: '3',
        providerId: '1',
        providerName: 'Dr. Sarah Johnson',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        type: 'psychiatry',
        status: 'completed',
        duration: 30,
        mode: 'video',
        notes: 'Adjusted medication dosage'
      }
    ]);
  };

  const loadTreatmentPlan = () => {
    setTreatmentPlan({
      id: '1',
      name: 'Anxiety Management Plan',
      provider: 'Dr. Sarah Johnson & Michael Chen',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      goals: [
        'Reduce anxiety symptoms by 50%',
        'Improve sleep quality to 7+ hours',
        'Develop healthy coping strategies',
        'Build social support network'
      ],
      medications: ['Sertraline 50mg daily', 'Hydroxyzine 25mg as needed'],
      interventions: [
        'Weekly CBT therapy sessions',
        'Daily mindfulness practice',
        'Regular exercise routine',
        'Sleep hygiene improvements'
      ],
      progress: 65,
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'therapy': return Brain;
      case 'psychiatry': return Pill;
      case 'checkup': return Stethoscope;
      case 'emergency': return AlertCircle;
      default: return Calendar;
    }
  };

  const renderCareTeam = () => (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onScheduleAppointment}
          className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700"
        >
          <Calendar className="w-6 h-6 text-blue-500 mb-2" />
          <p className="font-medium">Schedule Appointment</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700"
        >
          <FileText className="w-6 h-6 text-purple-500 mb-2" />
          <p className="font-medium">Request Records</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700"
        >
          <Shield className="w-6 h-6 text-green-500 mb-2" />
          <p className="font-medium">Emergency Support</p>
        </motion.button>
      </div>

      {/* Care Team Members */}
      <div>
        <h4 className="font-semibold mb-3">Your Care Team</h4>
        <div className="space-y-3">
          {providers.map(provider => (
            <motion.div
              key={provider.id}
              whileHover={{ scale: 1.01 }}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {provider.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h5 className="font-semibold">{provider.name}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {provider.title} • {provider.specialty}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm">{provider.rating}</span>
                      </div>
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs
                        ${provider.isAvailable 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700'}
                      `}>
                        {provider.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </div>
                    {provider.nextAppointment && (
                      <p className="text-sm text-blue-600 mt-2">
                        Next: {provider.nextAppointment.toLocaleDateString()} at{' '}
                        {provider.nextAppointment.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {provider.contactMethods.map(method => (
                    <motion.button
                      key={method}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (method === 'message') {
                          setSelectedProvider(provider);
                          setShowMessageModal(true);
                        } else {
                          onContactProvider?.(provider);
                        }
                      }}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {method === 'video' && <Video className="w-4 h-4" />}
                      {method === 'phone' && <Phone className="w-4 h-4" />}
                      {method === 'message' && <MessageSquare className="w-4 h-4" />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Provider */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors"
      >
        <Plus className="w-5 h-5 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Add Healthcare Provider</p>
      </motion.button>
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-4">
      {/* Upcoming Appointments */}
      <div>
        <h4 className="font-semibold mb-3">Upcoming Appointments</h4>
        <div className="space-y-3">
          {appointments
            .filter(apt => apt.status === 'scheduled')
            .map(appointment => {
              const Icon = getAppointmentIcon(appointment.type);
              return (
                <motion.div
                  key={appointment.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold">{appointment.providerName}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} •{' '}
                          {appointment.duration} minutes • {appointment.mode}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {appointment.date.toLocaleDateString()}
                          </span>
                          <Clock className="w-4 h-4 text-gray-500 ml-2" />
                          <span className="text-sm">
                            {appointment.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {appointment.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                      >
                        Join
                      </motion.button>
                      <button className="text-sm text-gray-500 hover:text-gray-700">
                        Reschedule
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Past Appointments */}
      <div className="mt-6">
        <h4 className="font-semibold mb-3">Recent Appointments</h4>
        <div className="space-y-2">
          {appointments
            .filter(apt => apt.status === 'completed')
            .map(appointment => (
              <div
                key={appointment.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{appointment.providerName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {appointment.date.toLocaleDateString()} • {appointment.type}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderTreatmentPlan = () => (
    <div className="space-y-6">
      {treatmentPlan && (
        <>
          {/* Plan Overview */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
            <h4 className="font-semibold mb-4">{treatmentPlan.name}</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Provider</p>
                <p className="font-medium">{treatmentPlan.provider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Review</p>
                <p className="font-medium">{treatmentPlan.nextReview.toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Progress</span>
                <span className="font-medium">{treatmentPlan.progress}%</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${treatmentPlan.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h5 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Treatment Goals
            </h5>
            <div className="space-y-2">
              {treatmentPlan.goals.map((goal, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{goal}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interventions */}
          <div>
            <h5 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Active Interventions
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {treatmentPlan.interventions.map((intervention, i) => (
                <div
                  key={i}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                >
                  <p className="text-sm">{intervention}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Medications */}
          {treatmentPlan.medications && (
            <div>
              <h5 className="font-semibold mb-3 flex items-center gap-2">
                <Pill className="w-5 h-5 text-green-500" />
                Current Medications
              </h5>
              <div className="space-y-2">
                {treatmentPlan.medications.map((med, i) => (
                  <div
                    key={i}
                    className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 flex items-center justify-between"
                  >
                    <p className="text-sm font-medium">{med}</p>
                    <button className="text-sm text-green-600 hover:text-green-700">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Download Plan
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-purple-500 text-white rounded-lg font-medium"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Share Progress
            </motion.button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          Professional Care
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your healthcare team and treatment
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'team', label: 'Care Team', icon: Users },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'treatment', label: 'Treatment Plan', icon: FileText },
          { id: 'records', label: 'Records', icon: Shield }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-all
              ${activeTab === tab.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-500 text-blue-600'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'team' && renderCareTeam()}
            {activeTab === 'appointments' && renderAppointments()}
            {activeTab === 'treatment' && renderTreatmentPlan()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {showMessageModal && selectedProvider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowMessageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <h4 className="font-semibold mb-4">Message {selectedProvider.name}</h4>
              <textarea
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none h-32"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfessionalConnectionHub;