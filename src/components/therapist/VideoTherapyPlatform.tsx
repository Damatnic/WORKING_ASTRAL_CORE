'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  VideoCameraIcon,
  PhoneIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  CogIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  LockClosedIcon,
  SignalIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { format, addMinutes, differenceInMinutes } from 'date-fns';

interface VideoSession {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  therapistId: string;
  therapistName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  dateAdministered?: Date; // For recording date reference
  status: 'scheduled' | 'waiting' | 'active' | 'completed' | 'cancelled' | 'no_show';
  sessionType: 'individual' | 'group' | 'family' | 'couples' | 'consultation';
  platform: 'webrtc' | 'zoom' | 'teams' | 'custom';
  roomId: string;
  accessCode?: string;
  recordingEnabled: boolean;
  recordingUrl?: string;
  chatEnabled: boolean;
  screenSharingEnabled: boolean;
  waitingRoomEnabled: boolean;
  encryptionLevel: 'standard' | 'enhanced' | 'hipaa_compliant';
  participants: Participant[];
  technicalIssues: TechnicalIssue[];
  sessionNotes?: string;
  qualityRating?: number;
  followUpRequired: boolean;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  role: 'therapist' | 'client' | 'observer' | 'supervisor';
  joinedAt?: Date;
  leftAt?: Date;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  audioEnabled: boolean;
  videoEnabled: boolean;
  isPresenter: boolean;
}

interface TechnicalIssue {
  id: string;
  timestamp: Date;
  type: 'audio' | 'video' | 'connection' | 'screen_share' | 'recording';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
  resolution?: string;
}

interface VideoTherapySettings {
  defaultRecording: boolean;
  autoJoinAudio: boolean;
  autoJoinVideo: boolean;
  waitingRoomEnabled: boolean;
  chatEnabled: boolean;
  screenSharingEnabled: boolean;
  recordingRetentionDays: number;
  qualityPreference: 'auto' | 'high' | 'medium' | 'low';
  bandwidthLimit?: number;
  encryptionRequired: boolean;
}

interface VideoTherapyPlatformProps {
  className?: string;
}

const mockVideoSessions: VideoSession[] = [
  {
    id: 'vs001',
    clientId: 'cl001',
    clientName: 'Sarah Johnson',
    clientEmail: 'sarah.j@email.com',
    therapistId: 'th001',
    therapistName: 'Dr. Emily Chen',
    scheduledStart: new Date('2024-01-15T14:00:00'),
    scheduledEnd: new Date('2024-01-15T14:50:00'),
    actualStart: new Date('2024-01-15T14:02:00'),
    actualEnd: new Date('2024-01-15T14:48:00'),
    status: 'completed',
    sessionType: 'individual',
    platform: 'webrtc',
    roomId: 'room_001_secure',
    accessCode: '843921',
    recordingEnabled: true,
    recordingUrl: '/recordings/vs001_20240115.mp4',
    chatEnabled: true,
    screenSharingEnabled: false,
    waitingRoomEnabled: true,
    encryptionLevel: 'hipaa_compliant',
    participants: [
      {
        id: 'p001',
        name: 'Dr. Emily Chen',
        email: 'emily.chen@practice.com',
        role: 'therapist',
        joinedAt: new Date('2024-01-15T14:00:00'),
        leftAt: new Date('2024-01-15T14:48:00'),
        connectionQuality: 'excellent',
        audioEnabled: true,
        videoEnabled: true,
        isPresenter: true
      },
      {
        id: 'p002',
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        role: 'client',
        joinedAt: new Date('2024-01-15T14:02:00'),
        leftAt: new Date('2024-01-15T14:48:00'),
        connectionQuality: 'good',
        audioEnabled: true,
        videoEnabled: true,
        isPresenter: false
      }
    ],
    technicalIssues: [],
    sessionNotes: 'Session completed successfully. Good audio/video quality throughout.',
    qualityRating: 5,
    followUpRequired: false
  },
  {
    id: 'vs002',
    clientId: 'cl002',
    clientName: 'Michael Rodriguez',
    clientEmail: 'michael.r@email.com',
    therapistId: 'th001',
    therapistName: 'Dr. Emily Chen',
    scheduledStart: new Date('2024-01-16T10:00:00'),
    scheduledEnd: new Date('2024-01-16T11:00:00'),
    status: 'scheduled',
    sessionType: 'individual',
    platform: 'webrtc',
    roomId: 'room_002_secure',
    accessCode: '749385',
    recordingEnabled: true,
    chatEnabled: true,
    screenSharingEnabled: true,
    waitingRoomEnabled: true,
    encryptionLevel: 'hipaa_compliant',
    participants: [
      {
        id: 'p003',
        name: 'Dr. Emily Chen',
        email: 'emily.chen@practice.com',
        role: 'therapist',
        connectionQuality: 'excellent',
        audioEnabled: true,
        videoEnabled: true,
        isPresenter: true
      },
      {
        id: 'p004',
        name: 'Michael Rodriguez',
        email: 'michael.r@email.com',
        role: 'client',
        connectionQuality: 'good',
        audioEnabled: true,
        videoEnabled: true,
        isPresenter: false
      }
    ],
    technicalIssues: [],
    followUpRequired: false
  },
  {
    id: 'vs003',
    clientId: 'cl003',
    clientName: 'Lisa Thompson',
    clientEmail: 'lisa.t@email.com',
    therapistId: 'th001',
    therapistName: 'Dr. Emily Chen',
    scheduledStart: new Date('2024-01-15T16:00:00'),
    scheduledEnd: new Date('2024-01-15T17:00:00'),
    actualStart: new Date('2024-01-15T16:05:00'),
    actualEnd: new Date('2024-01-15T16:55:00'),
    status: 'completed',
    sessionType: 'family',
    platform: 'webrtc',
    roomId: 'room_003_secure',
    recordingEnabled: false,
    chatEnabled: true,
    screenSharingEnabled: false,
    waitingRoomEnabled: true,
    encryptionLevel: 'hipaa_compliant',
    participants: [
      {
        id: 'p005',
        name: 'Dr. Emily Chen',
        email: 'emily.chen@practice.com',
        role: 'therapist',
        joinedAt: new Date('2024-01-15T16:00:00'),
        leftAt: new Date('2024-01-15T16:55:00'),
        connectionQuality: 'excellent',
        audioEnabled: true,
        videoEnabled: true,
        isPresenter: true
      },
      {
        id: 'p006',
        name: 'Lisa Thompson',
        email: 'lisa.t@email.com',
        role: 'client',
        joinedAt: new Date('2024-01-15T16:05:00'),
        leftAt: new Date('2024-01-15T16:55:00'),
        connectionQuality: 'fair',
        audioEnabled: true,
        videoEnabled: false,
        isPresenter: false
      }
    ],
    technicalIssues: [
      {
        id: 'ti001',
        timestamp: new Date('2024-01-15T16:15:00'),
        type: 'video',
        severity: 'medium',
        description: 'Client experienced intermittent video freezing',
        resolved: true,
        resolution: 'Reduced video quality, issue resolved'
      }
    ],
    sessionNotes: 'Minor technical issues with client video, resolved by adjusting quality settings.',
    qualityRating: 4,
    followUpRequired: false
  }
];

const platformOptions = [
  { value: 'webrtc', label: 'Secure WebRTC', icon: VideoCameraIcon, secure: true },
  { value: 'zoom', label: 'Zoom Healthcare', icon: VideoCameraIcon, secure: true },
  { value: 'teams', label: 'Microsoft Teams', icon: VideoCameraIcon, secure: true },
  { value: 'custom', label: 'Custom Platform', icon: ComputerDesktopIcon, secure: false }
];

export default function VideoTherapyPlatform({ className = "" }: VideoTherapyPlatformProps) {
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>(mockVideoSessions);
  const [filteredSessions, setFilteredSessions] = useState<VideoSession[]>(mockVideoSessions);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'active' | 'completed' | 'settings'>('scheduled');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<VideoSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'good' | 'fair' | 'poor'>('good');

  const [settings, setSettings] = useState<VideoTherapySettings>({
    defaultRecording: true,
    autoJoinAudio: true,
    autoJoinVideo: true,
    waitingRoomEnabled: true,
    chatEnabled: true,
    screenSharingEnabled: true,
    recordingRetentionDays: 30,
    qualityPreference: 'auto',
    encryptionRequired: true
  });

  // Filter sessions based on active tab and search
  useEffect(() => {
    let filtered = videoSessions;

    // Filter by tab
    switch (activeTab) {
      case 'scheduled':
        filtered = filtered.filter(session => 
          session.status === 'scheduled' || session.status === 'waiting'
        );
        break;
      case 'active':
        filtered = filtered.filter(session => session.status === 'active');
        break;
      case 'completed':
        filtered = filtered.filter(session => 
          session.status === 'completed' || session.status === 'cancelled' || session.status === 'no_show'
        );
        break;
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.roomId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  }, [activeTab, searchTerm, videoSessions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'waiting': return 'text-yellow-600 bg-yellow-50';
      case 'active': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-gray-600 bg-gray-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      case 'no_show': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleJoinSession = (session: VideoSession) => {
    // In a real implementation, this would open the video conference
    console.log(`Joining session: ${session.roomId}`);
    // Update session status to active if it's waiting
    if (session.status === 'waiting' || session.status === 'scheduled') {
      setVideoSessions(prev => prev.map(s => 
        s.id === session.id 
          ? { ...s, status: 'active', actualStart: new Date() }
          : s
      ));
    }
  };

  const handleEndSession = (session: VideoSession) => {
    setVideoSessions(prev => prev.map(s => 
      s.id === session.id 
        ? { ...s, status: 'completed', actualEnd: new Date() }
        : s
    ));
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    const qualities = ['good', 'fair', 'poor'] as const;
    setConnectionStatus(qualities[Math.floor(Math.random() * qualities.length)]);
    setIsTestingConnection(false);
  };

  const handleViewSession = (session: VideoSession) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const getCurrentSessionDuration = (session: VideoSession) => {
    if (!session.actualStart) return 0;
    const end = session.actualEnd || new Date();
    return differenceInMinutes(end, session.actualStart);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <VideoCameraIcon className="h-6 w-6 text-indigo-600" />
              Video Therapy Platform
            </h2>
            <p className="text-gray-600 mt-1">
              Secure HIPAA-compliant video therapy sessions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={isTestingConnection}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isTestingConnection ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SignalIcon className={`h-4 w-4 ${getConnectionColor(connectionStatus)}`} />
              )}
              {isTestingConnection ? 'Testing...' : `Connection: ${connectionStatus}`}
            </button>
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <CogIcon className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="flex space-x-8">
            {[
              { id: 'scheduled', label: 'Scheduled Sessions', count: videoSessions.filter(s => s.status === 'scheduled' || s.status === 'waiting').length },
              { id: 'active', label: 'Active Sessions', count: videoSessions.filter(s => s.status === 'active').length },
              { id: 'completed', label: 'Completed Sessions', count: videoSessions.filter(s => s.status === 'completed' || s.status === 'cancelled').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        {activeTab !== 'settings' && (
          <div className="mt-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions, clients, or room IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Sessions List */}
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredSessions.map(session => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <UserGroupIcon className="h-5 w-5 text-gray-500" />
                      <h3 className="font-medium text-gray-900">{session.clientName}</h3>
                      <span className="text-sm text-gray-600">•</span>
                      <span className="text-sm text-gray-600 capitalize">{session.sessionType}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                      {session.encryptionLevel === 'hipaa_compliant' && (
                        <LockClosedIcon className="h-4 w-4 text-green-500" title="HIPAA Compliant" />
                      )}
                      {session.recordingEnabled && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">REC</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(session.scheduledStart, 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {format(session.scheduledStart, 'h:mm a')} - {format(session.scheduledEnd, 'h:mm a')}
                      </div>
                      <div>
                        Platform: {platformOptions.find(p => p.value === session.platform)?.label}
                      </div>
                      <div>
                        Room: {session.roomId}
                        {session.accessCode && (
                          <span className="ml-2 text-xs bg-gray-100 px-1 rounded">
                            Code: {session.accessCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">Participants:</span>
                        <span className="text-sm text-gray-600">
                          {session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {session.participants.map(participant => (
                          <div key={participant.id} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded">
                            <span className="font-medium">{participant.name}</span>
                            <span className="text-gray-500">({participant.role})</span>
                            {participant.joinedAt && (
                              <span className={`w-2 h-2 rounded-full ${getConnectionColor(participant.connectionQuality)}`} 
                                    style={{ backgroundColor: 'currentColor' }}
                                    title={`Connection: ${participant.connectionQuality}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Session Duration for Active/Completed */}
                    {(session.status === 'active' || session.status === 'completed') && session.actualStart && (
                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">
                          {session.status === 'active' ? 'Current duration: ' : 'Total duration: '}
                        </span>
                        {getCurrentSessionDuration(session)} minutes
                        {session.status === 'active' && (
                          <span className="ml-2 text-green-600">● Live</span>
                        )}
                      </div>
                    )}

                    {/* Technical Issues */}
                    {session.technicalIssues.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-yellow-700">
                            {session.technicalIssues.length} technical issue{session.technicalIssues.length !== 1 ? 's' : ''}
                            {session.technicalIssues.every(issue => issue.resolved) ? ' (resolved)' : ' (some unresolved)'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quality Rating for Completed Sessions */}
                    {session.status === 'completed' && session.qualityRating && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Session Quality:</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span
                              key={star}
                              className={`text-sm ${star <= session.qualityRating! ? 'text-yellow-500' : 'text-gray-300'}`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="ml-1">({session.qualityRating}/5)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-start gap-2 ml-4">
                    {session.status === 'scheduled' || session.status === 'waiting' ? (
                      <button
                        onClick={() => handleJoinSession(session)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <VideoCameraIcon className="h-4 w-4" />
                        Join Session
                      </button>
                    ) : session.status === 'active' ? (
                      <button
                        onClick={() => handleEndSession(session)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <StopIcon className="h-4 w-4" />
                        End Session
                      </button>
                    ) : (
                      <button
                        onClick={() => handleViewSession(session)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'scheduled' ? 'No scheduled sessions' : 
                 activeTab === 'active' ? 'No active sessions' : 
                 'No completed sessions'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? "Try adjusting your search criteria."
                  : activeTab === 'scheduled' 
                    ? "Scheduled video therapy sessions will appear here."
                    : activeTab === 'active'
                      ? "Active video sessions will be shown here."
                      : "Completed sessions will be listed here."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {showSessionModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Video Session Details - {selectedSession.clientName}
                </h2>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Session Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Session Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Client:</strong> {selectedSession.clientName}</div>
                      <div><strong>Therapist:</strong> {selectedSession.therapistName}</div>
                      <div><strong>Type:</strong> {selectedSession.sessionType}</div>
                      <div><strong>Platform:</strong> {platformOptions.find(p => p.value === selectedSession.platform)?.label}</div>
                      <div><strong>Room ID:</strong> {selectedSession.roomId}</div>
                      {selectedSession.accessCode && (
                        <div><strong>Access Code:</strong> {selectedSession.accessCode}</div>
                      )}
                      <div><strong>Scheduled:</strong> {format(selectedSession.scheduledStart, 'PPP p')} - {format(selectedSession.scheduledEnd, 'p')}</div>
                      {selectedSession.actualStart && (
                        <div><strong>Actual Duration:</strong> {getCurrentSessionDuration(selectedSession)} minutes</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Security & Features</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <strong>Encryption:</strong>
                        <span className={`px-2 py-1 text-xs rounded ${
                          selectedSession.encryptionLevel === 'hipaa_compliant' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedSession.encryptionLevel}
                        </span>
                      </div>
                      <div><strong>Recording:</strong> {selectedSession.recordingEnabled ? 'Enabled' : 'Disabled'}</div>
                      <div><strong>Chat:</strong> {selectedSession.chatEnabled ? 'Enabled' : 'Disabled'}</div>
                      <div><strong>Screen Sharing:</strong> {selectedSession.screenSharingEnabled ? 'Enabled' : 'Disabled'}</div>
                      <div><strong>Waiting Room:</strong> {selectedSession.waitingRoomEnabled ? 'Enabled' : 'Disabled'}</div>
                      <div className="flex items-center gap-2">
                        <strong>Status:</strong>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedSession.status)}`}>
                          {selectedSession.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Participants</h3>
                  <div className="space-y-3">
                    {selectedSession.participants.map(participant => (
                      <div key={participant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900">{participant.name}</h4>
                            <p className="text-sm text-gray-600">{participant.email} • {participant.role}</p>
                            {participant.joinedAt && (
                              <p className="text-xs text-gray-500">
                                Joined: {format(participant.joinedAt, 'p')}
                                {participant.leftAt && ` • Left: ${format(participant.leftAt, 'p')}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getConnectionColor(participant.connectionQuality)}`} 
                                  style={{ backgroundColor: 'currentColor' }} />
                            <span className={getConnectionColor(participant.connectionQuality)}>
                              {participant.connectionQuality}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MicrophoneIcon className={`h-4 w-4 ${participant.audioEnabled ? 'text-green-600' : 'text-red-600'}`} />
                            <VideoCameraIcon className={`h-4 w-4 ${participant.videoEnabled ? 'text-green-600' : 'text-red-600'}`} />
                            {participant.isPresenter && (
                              <ShareIcon className="h-4 w-4 text-blue-600" title="Presenter" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Issues */}
                {selectedSession.technicalIssues.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Issues</h3>
                    <div className="space-y-3">
                      {selectedSession.technicalIssues.map(issue => (
                        <div key={issue.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                  issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {issue.severity}
                                </span>
                                <span className="text-sm text-gray-600 capitalize">{issue.type}</span>
                                <span className="text-xs text-gray-500">
                                  {format(issue.timestamp, 'p')}
                                </span>
                              </div>
                              <p className="text-gray-700 mb-2">{issue.description}</p>
                              {issue.resolution && (
                                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                  <strong>Resolution:</strong> {issue.resolution}
                                </p>
                              )}
                            </div>
                            {issue.resolved && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Notes */}
                {selectedSession.sessionNotes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Session Notes</h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{selectedSession.sessionNotes}</p>
                  </div>
                )}

                {/* Recording */}
                {selectedSession.recordingUrl && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Session Recording</h3>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <PlayIcon className="h-6 w-6 text-indigo-600" />
                      <div>
                        <p className="font-medium text-gray-900">Session Recording Available</p>
                        <p className="text-sm text-gray-600">Recorded on {format(selectedSession.dateAdministered || selectedSession.scheduledStart, 'PPP')}</p>
                      </div>
                      <button className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        View Recording
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Video Therapy Settings
                </h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Default Session Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Default Session Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Default Recording</label>
                        <p className="text-sm text-gray-600">Automatically enable recording for new sessions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.defaultRecording}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultRecording: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Auto Join Audio</label>
                        <p className="text-sm text-gray-600">Automatically join with audio enabled</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoJoinAudio}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoJoinAudio: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Auto Join Video</label>
                        <p className="text-sm text-gray-600">Automatically join with video enabled</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoJoinVideo}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoJoinVideo: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Waiting Room</label>
                        <p className="text-sm text-gray-600">Enable waiting room for security</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.waitingRoomEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, waitingRoomEnabled: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security & Privacy</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Encryption Required</label>
                        <p className="text-sm text-gray-600">Require HIPAA-compliant encryption</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.encryptionRequired}
                        onChange={(e) => setSettings(prev => ({ ...prev, encryptionRequired: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recording Retention Period
                      </label>
                      <select
                        value={settings.recordingRetentionDays}
                        onChange={(e) => setSettings(prev => ({ ...prev, recordingRetentionDays: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={7}>7 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                        <option value={365}>1 year</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quality Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quality & Performance</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video Quality Preference
                      </label>
                      <select
                        value={settings.qualityPreference}
                        onChange={(e) => setSettings(prev => ({ ...prev, qualityPreference: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="auto">Auto (Adaptive)</option>
                        <option value="high">High Quality</option>
                        <option value="medium">Medium Quality</option>
                        <option value="low">Low Quality</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Save settings logic would go here
                      setShowSettingsModal(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}