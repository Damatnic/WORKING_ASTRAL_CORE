'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  PhoneIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  GlobeAltIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { 
  format, 
  startOfWeek, 
  addDays, 
  addWeeks, 
  subWeeks, 
  isSameDay, 
  parseISO, 
  setHours, 
  setMinutes,
  isAfter,
  isBefore,
  addMinutes,
  getDay
} from 'date-fns';

interface TimeSlot {
  id: string;
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  isRecurring: boolean;
  maxSessions: number;
  sessionDuration: number; // minutes
  sessionTypes: ('chat' | 'video' | 'phone')[];
  isAvailable: boolean;
}

interface ScheduledSession {
  id: string;
  clientId: string;
  clientName: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'chat' | 'video' | 'phone';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  reminderSent: boolean;
}

interface ScheduleManagerProps {
  className?: string;
}

const defaultTimeSlots: TimeSlot[] = [
  {
    id: '1',
    day: 1, // Monday
    startTime: '09:00',
    endTime: '12:00',
    isRecurring: true,
    maxSessions: 3,
    sessionDuration: 60,
    sessionTypes: ['chat', 'video', 'phone'],
    isAvailable: true
  },
  {
    id: '2',
    day: 2, // Tuesday
    startTime: '14:00',
    endTime: '17:00',
    isRecurring: true,
    maxSessions: 3,
    sessionDuration: 60,
    sessionTypes: ['chat', 'video'],
    isAvailable: true
  },
  {
    id: '3',
    day: 3, // Wednesday
    startTime: '10:00',
    endTime: '15:00',
    isRecurring: true,
    maxSessions: 5,
    sessionDuration: 60,
    sessionTypes: ['chat', 'video', 'phone'],
    isAvailable: true
  },
  {
    id: '4',
    day: 4, // Thursday
    startTime: '09:00',
    endTime: '12:00',
    isRecurring: true,
    maxSessions: 3,
    sessionDuration: 60,
    sessionTypes: ['chat', 'video', 'phone'],
    isAvailable: true
  },
  {
    id: '5',
    day: 5, // Friday
    startTime: '13:00',
    endTime: '16:00',
    isRecurring: true,
    maxSessions: 3,
    sessionDuration: 60,
    sessionTypes: ['chat', 'video'],
    isAvailable: true
  }
];

// Sessions will be fetched from API

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleManager({ className = "" }: ScheduleManagerProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(defaultTimeSlots);
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sessions from API
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/helper/schedule');
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [currentWeek]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'availability'>('week');
  const [timezone] = useState('EST'); // Would come from user settings

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(session => isSameDay(session.date, date));
  };

  const getAvailableSlots = (date: Date) => {
    const dayOfWeek = getDay(date);
    return timeSlots.filter(slot => 
      slot.day === dayOfWeek && 
      slot.isAvailable &&
      slot.isRecurring
    );
  };

  const generateTimeSlots = (startTime: string, endTime: string, duration: number) => {
    const slots = [];
    let current = parseISO(`2024-01-01T${startTime}:00`);
    const end = parseISO(`2024-01-01T${endTime}:00`);

    while (isBefore(current, end)) {
      const slotEnd = addMinutes(current, duration);
      if (isBefore(slotEnd, end) || slotEnd.getTime() === end.getTime()) {
        slots.push({
          start: format(current, 'HH:mm'),
          end: format(slotEnd, 'HH:mm')
        });
      }
      current = slotEnd;
    }
    return slots;
  };

  const isSlotBooked = (date: Date, startTime: string, endTime: string) => {
    return sessions.some(session => 
      isSameDay(session.date, date) &&
      session.startTime === startTime &&
      session.endTime === endTime &&
      session.status !== 'cancelled'
    );
  };

  const getStatusColor = (status: ScheduledSession['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: ScheduledSession['type']) => {
    switch (type) {
      case 'video': return VideoCameraIcon;
      case 'phone': return PhoneIcon;
      case 'chat': return ChatBubbleLeftRightIcon;
      default: return ChatBubbleLeftRightIcon;
    }
  };

  const updateSessionStatus = (sessionId: string, newStatus: ScheduledSession['status']) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: newStatus }
          : session
      )
    );
  };

  const TimeSlotEditor = ({ slot, onSave, onCancel }: {
    slot?: TimeSlot;
    onSave: (slot: TimeSlot) => void;
    onCancel: () => void;
  }) => {
    const [editedSlot, setEditedSlot] = useState<TimeSlot>(
      slot || {
        id: '',
        day: 1,
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
        maxSessions: 6,
        sessionDuration: 60,
        sessionTypes: ['chat', 'video', 'phone'],
        isAvailable: true
      }
    );

    const handleSave = () => {
      if (!editedSlot.id) {
        editedSlot.id = Date.now().toString();
      }
      onSave(editedSlot);
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {slot ? 'Edit' : 'Add'} Availability
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
              <select
                value={editedSlot.day}
                onChange={(e) => setEditedSlot(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dayNames.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={editedSlot.startTime}
                  onChange={(e) => setEditedSlot(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={editedSlot.endTime}
                  onChange={(e) => setEditedSlot(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Duration (minutes)
              </label>
              <select
                value={editedSlot.sessionDuration}
                onChange={(e) => setEditedSlot(prev => ({ ...prev, sessionDuration: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Types
              </label>
              <div className="space-y-2">
                {['chat', 'video', 'phone'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editedSlot.sessionTypes.includes(type as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditedSlot(prev => ({
                            ...prev,
                            sessionTypes: [...prev.sessionTypes, type as any]
                          }));
                        } else {
                          setEditedSlot(prev => ({
                            ...prev,
                            sessionTypes: prev.sessionTypes.filter(t => t !== type)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="recurring"
                checked={editedSlot.isRecurring}
                onChange={(e) => setEditedSlot(prev => ({ ...prev, isRecurring: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
                Repeat weekly
              </label>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule & Availability</h1>
          <p className="text-gray-600 mt-1">
            Manage your availability and upcoming sessions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <GlobeAltIcon className="w-4 h-4" />
            <span>{timezone}</span>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('availability')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'availability'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Availability
            </button>
          </div>

          <button
            onClick={() => setShowNewSlotModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Hours</span>
          </button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <div className="space-y-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900">
                {format(weekStart, 'MMM dd')} - {format(addDays(weekStart, 6), 'MMM dd, yyyy')}
              </h2>
              
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {weekDays.map((day, index) => (
                <div key={index} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                  <div className="text-sm font-medium text-gray-900">
                    {dayAbbr[index]}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${
                    isSameDay(day, new Date()) 
                      ? 'text-blue-600' 
                      : 'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((day, dayIndex) => {
                const daySessions = getSessionsForDay(day);
                const daySlots = getAvailableSlots(day);
                
                return (
                  <div 
                    key={dayIndex} 
                    className="p-3 border-r border-gray-200 last:border-r-0 space-y-2"
                  >
                    {/* Available time slots */}
                    {daySlots.map(slot => {
                      const timeSlots = generateTimeSlots(
                        slot.startTime, 
                        slot.endTime, 
                        slot.sessionDuration
                      );
                      
                      return timeSlots.map((timeSlot, index) => {
                        const isBooked = isSlotBooked(day, timeSlot.start, timeSlot.end);
                        const session = daySessions.find(s => 
                          s.startTime === timeSlot.start && s.endTime === timeSlot.end
                        );

                        return (
                          <div
                            key={`${slot.id}-${index}`}
                            className={`p-2 rounded-lg text-xs border ${
                              isBooked
                                ? session 
                                  ? getStatusColor(session.status)
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                                : 'bg-green-50 text-green-700 border-green-200 border-dashed'
                            }`}
                          >
                            <div className="font-medium">
                              {timeSlot.start} - {timeSlot.end}
                            </div>
                            {session ? (
                              <div className="flex items-center space-x-1 mt-1">
                                {(() => {
                                  const IconComponent = getTypeIcon(session.type);
                                  return <IconComponent className="w-3 h-3" />;
                                })()}
                                <span className="truncate">{session.clientName}</span>
                              </div>
                            ) : (
                              <div className="text-green-600 text-xs">Available</div>
                            )}
                          </div>
                        );
                      });
                    })}

                    {daySlots.length === 0 && (
                      <div className="text-xs text-gray-400 p-2">
                        No availability
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Sessions Summary */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week&apos;s Sessions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sessions
                .filter(session => {
                  const sessionDate = session.date;
                  return sessionDate >= weekStart && sessionDate <= addDays(weekStart, 6);
                })
                .map(session => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const IconComponent = getTypeIcon(session.type);
                          return <IconComponent className="w-4 h-4 text-gray-500" />;
                        })()}
                        <span className="font-medium text-gray-900">{session.clientName}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{format(session.date, 'EEE, MMM dd')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-3">
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => updateSessionStatus(session.id, 'confirmed')}
                          className="flex-1 py-1 px-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {(session.status === 'scheduled' || session.status === 'confirmed') && (
                        <button
                          onClick={() => updateSessionStatus(session.id, 'cancelled')}
                          className="flex-1 py-1 px-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      ) : (
        /* Availability Management View */
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
              <p className="text-sm text-gray-600 mt-1">
                Set your recurring availability for each day of the week
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {dayNames.map((day, dayIndex) => {
                const daySlots = timeSlots.filter(slot => slot.day === dayIndex);
                
                return (
                  <div key={dayIndex} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">{day}</h4>
                      <button
                        onClick={() => {
                          const newSlot: TimeSlot = {
                            id: Date.now().toString(),
                            day: dayIndex,
                            startTime: '09:00',
                            endTime: '17:00',
                            isRecurring: true,
                            maxSessions: 6,
                            sessionDuration: 60,
                            sessionTypes: ['chat', 'video', 'phone'],
                            isAvailable: true
                          };
                          setSelectedTimeSlot(newSlot);
                          setIsEditing(true);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>Add Time</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {daySlots.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">
                          No availability set for this day
                        </div>
                      ) : (
                        daySlots.map(slot => (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              slot.isAvailable 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-3 h-3 rounded-full ${
                                slot.isAvailable ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              
                              <div>
                                <div className="font-medium text-gray-900">
                                  {slot.startTime} - {slot.endTime}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {slot.sessionDuration}min sessions • 
                                  {slot.sessionTypes.join(', ')} • 
                                  Max {slot.maxSessions} sessions
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setTimeSlots(prev => 
                                    prev.map(s => 
                                      s.id === slot.id 
                                        ? { ...s, isAvailable: !s.isAvailable }
                                        : s
                                    )
                                  );
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  slot.isAvailable
                                    ? 'text-yellow-600 hover:bg-yellow-100'
                                    : 'text-green-600 hover:bg-green-100'
                                }`}
                                title={slot.isAvailable ? 'Disable' : 'Enable'}
                              >
                                {slot.isAvailable ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedTimeSlot(slot);
                                  setIsEditing(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  setTimeSlots(prev => prev.filter(s => s.id !== slot.id));
                                }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Time Slot Editor Modal */}
      <AnimatePresence>
        {(isEditing || showNewSlotModal) && (
          <TimeSlotEditor
            slot={selectedTimeSlot}
            onSave={(slot) => {
              if (selectedTimeSlot?.id) {
                // Edit existing
                setTimeSlots(prev => 
                  prev.map(s => s.id === slot.id ? slot : s)
                );
              } else {
                // Add new
                setTimeSlots(prev => [...prev, slot]);
              }
              setIsEditing(false);
              setShowNewSlotModal(false);
              setSelectedTimeSlot(null);
            }}
            onCancel={() => {
              setIsEditing(false);
              setShowNewSlotModal(false);
              setSelectedTimeSlot(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}