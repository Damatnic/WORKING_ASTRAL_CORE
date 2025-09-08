'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LanguageIcon,
  GlobeAltIcon,
  CogIcon,
  TranslateIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  CalendarIcon,
  FlagIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import {
  LanguageIcon as LanguageIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format } from 'date-fns';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
  status: 'active' | 'draft' | 'disabled' | 'deprecated';
  completeness: number;
  lastUpdated: Date;
  translators: Array<{
    id: string;
    name: string;
    email: string;
    role: 'translator' | 'reviewer' | 'coordinator';
  }>;
  metadata: {
    totalStrings: number;
    translatedStrings: number;
    reviewedStrings: number;
    fuzzyStrings: number;
    untranslatedStrings: number;
  };
}

interface Translation {
  key: string;
  namespace: string;
  sourceText: string;
  translations: Record<string, {
    text: string;
    status: 'translated' | 'reviewed' | 'fuzzy' | 'untranslated';
    lastModified: Date;
    translatedBy?: string;
    reviewedBy?: string;
    context?: string;
    pluralForm?: Record<string, string>;
  }>;
  metadata: {
    context?: string;
    maxLength?: number;
    isPlural: boolean;
    tags: string[];
    screenshot?: string;
  };
}

interface TranslationProject {
  id: string;
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguages: string[];
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  createdAt: Date;
  deadline?: Date;
  manager: string;
  translators: string[];
  settings: {
    allowMachineTranslation: boolean;
    requireReview: boolean;
    enableComments: boolean;
    notifyOnChanges: boolean;
  };
}

interface LanguageContext {
  currentLanguage: string;
  availableLanguages: Language[];
  translations: Record<string, Translation>;
  setLanguage: (languageCode: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContext | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const LanguageManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'languages' | 'translations' | 'projects' | 'settings'>('languages');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [showAddLanguage, setShowAddLanguage] = useState<boolean>(false);
  const [showTranslationEditor, setShowTranslationEditor] = useState<boolean>(false);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [langRes, transRes, projRes] = await Promise.all([
          fetch('/api/platform/language/languages'),
          fetch('/api/platform/language/translations'),
          fetch('/api/platform/language/projects')
        ]);

        if (!langRes.ok || !transRes.ok || !projRes.ok) {
          throw new Error('Failed to fetch language data');
        }

        const langData = await langRes.json();
        const transData = await transRes.json();
        const projData = await projRes.json();

        setLanguages(langData.languages || []);
        setTranslations(transData.translations || []);
        setProjects(projData.projects || []);
      } catch (err) {
        console.error('Error fetching language data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load language data');
        // Set empty arrays as fallback
        setLanguages([]);
        setTranslations([]);
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const saveTranslation = async (translation: Translation, languageCode: string, text: string, status: string) => {
    try {
      const response = await fetch('/api/platform/language/translations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: translation.key,
          languageCode,
          text,
          status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save translation');
      }

      const updatedTranslation = await response.json();
      setTranslations(prev => prev.map(t => 
        t.key === translation.key ? updatedTranslation : t
      ));

      return updatedTranslation;
    } catch (err) {
      console.error('Error saving translation:', err);
      throw err;
    }
  };

  const addLanguage = async (languageCode: string, languageData: Partial<Language>) => {
    try {
      const response = await fetch('/api/platform/language/languages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: languageCode,
          ...languageData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add language');
      }

      const newLanguage = await response.json();
      setLanguages(prev => [...prev, newLanguage]);
      
      return newLanguage;
    } catch (err) {
      console.error('Error adding language:', err);
      throw err;
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'reviewed':
      case 'translated':
        return 'text-green-600 bg-green-100';
      case 'draft':
      case 'fuzzy':
        return 'text-yellow-600 bg-yellow-100';
      case 'disabled':
      case 'untranslated':
        return 'text-red-600 bg-red-100';
      case 'deprecated':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 90) return 'bg-green-500';
    if (completeness >= 70) return 'bg-yellow-500';
    if (completeness >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const filteredTranslations = translations.filter(translation => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!translation.key.toLowerCase().includes(query) &&
          !translation.sourceText.toLowerCase().includes(query) &&
          !translation.namespace.toLowerCase().includes(query)) {
        return false;
      }
    }

    if (namespaceFilter !== 'all' && translation.namespace !== namespaceFilter) {
      return false;
    }

    if (statusFilter !== 'all') {
      const langTranslation = translation.translations[selectedLanguage];
      if (!langTranslation || langTranslation.status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  const namespaces = Array.from(new Set(translations.map(t => t.namespace)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Language Data</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <GlobeAltIconSolid className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Language Manager</h1>
              <p className="text-gray-600">Manage translations and localization</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setShowAddLanguage(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Language</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'languages', label: 'Languages', icon: FlagIcon },
              { id: 'translations', label: 'Translations', icon: TranslateIcon },
              { id: 'projects', label: 'Projects', icon: DocumentTextIcon },
              { id: 'settings', label: 'Settings', icon: CogIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Languages Tab */}
      {activeTab === 'languages' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Supported Languages</h2>
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <CloudArrowUpIcon className="w-5 h-5" />
                  <span>Import</span>
                </button>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <CloudArrowDownIcon className="w-5 h-5" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {languages.map((language) => (
              <motion.div
                key={language.code}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{language.flag}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{language.name}</h3>
                      <p className="text-sm text-gray-600">{language.nativeName}</p>
                      {language.isRTL && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          RTL
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    getStatusColor(language.status)
                  }`}>
                    {language.status}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Completion</span>
                    <span className="text-sm font-semibold text-gray-900">{language.completeness}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getCompletenessColor(language.completeness)}`}
                      style={{ width: `${language.completeness}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex justify-between">
                    <span>Translated:</span>
                    <span>{language.metadata.translatedStrings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reviewed:</span>
                    <span>{language.metadata.reviewedStrings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuzzy:</span>
                    <span>{language.metadata.fuzzyStrings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missing:</span>
                    <span>{language.metadata.untranslatedStrings.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Translators:</p>
                  <div className="flex flex-wrap gap-1">
                    {language.translators.map((translator) => (
                      <span
                        key={translator.id}
                        className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        title={`${translator.name} (${translator.role})`}
                      >
                        {translator.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  Last updated: {formatDistance(language.lastUpdated, new Date(), { addSuffix: true })}
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Edit
                  </button>
                  <button className="flex-1 text-green-600 hover:text-green-700 text-sm font-medium">
                    Translate
                  </button>
                  <button className="flex-1 text-gray-600 hover:text-gray-700 text-sm font-medium">
                    Export
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Translations Tab */}
      {activeTab === 'translations' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-64">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search translations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={namespaceFilter}
                onChange={(e) => setNamespaceFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Namespaces</option>
                {namespaces.map((namespace) => (
                  <option key={namespace} value={namespace}>{namespace}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="translated">Translated</option>
                <option value="reviewed">Reviewed</option>
                <option value="fuzzy">Fuzzy</option>
                <option value="untranslated">Untranslated</option>
              </select>
            </div>
          </div>

          {/* Translations List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="divide-y divide-gray-200">
              {filteredTranslations.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <TranslateIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No translations found</h3>
                  <p>Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredTranslations.map((translation) => {
                  const langTranslation = translation.translations[selectedLanguage];
                  return (
                    <motion.div
                      key={translation.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedTranslation(translation);
                        setShowTranslationEditor(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{translation.key}</h3>
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {translation.namespace}
                            </span>
                            {translation.metadata.isPlural && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                Plural
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Source ({languages.find(l => l.code === 'en')?.flag}):</p>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {translation.sourceText}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">
                                Translation ({languages.find(l => l.code === selectedLanguage)?.flag}):
                              </p>
                              <div className={`text-sm p-2 rounded ${
                                !langTranslation || langTranslation.status === 'untranslated' 
                                  ? 'bg-red-50 text-red-800 border border-red-200'
                                  : langTranslation.status === 'fuzzy'
                                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                  : 'bg-green-50 text-green-800 border border-green-200'
                              }`}>
                                {langTranslation?.text || 'Not translated'}
                              </div>
                            </div>
                          </div>

                          {translation.metadata.context && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Context:</p>
                              <p className="text-xs text-gray-600">{translation.metadata.context}</p>
                            </div>
                          )}

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {langTranslation && (
                              <>
                                <span>Status: {langTranslation.status}</span>
                                <span>Modified: {formatDistance(langTranslation.lastModified, new Date(), { addSuffix: true })}</span>
                                {langTranslation.translatedBy && (
                                  <span>By: {langTranslation.translatedBy}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getStatusColor(langTranslation?.status || 'untranslated')
                          }`}>
                            {langTranslation?.status || 'untranslated'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTranslation(translation);
                              setShowTranslationEditor(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Translation Projects</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                New Project
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {projects.map((project) => (
              <div key={project.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        getStatusColor(project.status)
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-3">{project.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Progress</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Languages</p>
                        <div className="flex space-x-1 mt-1">
                          {project.targetLanguages.map((langCode) => {
                            const lang = languages.find(l => l.code === langCode);
                            return (
                              <span key={langCode} className="text-sm" title={lang?.name}>
                                {lang?.flag}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Deadline</p>
                        <p className="text-sm text-gray-900">
                          {project.deadline ? format(project.deadline, 'MMM d, yyyy') : 'No deadline'}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Translators</p>
                        <p className="text-sm text-gray-900">{project.translators.length} assigned</p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      Created {formatDistance(project.createdAt, new Date(), { addSuffix: true })} by {project.manager}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button className="text-blue-600 hover:text-blue-700 px-3 py-1 text-sm font-medium">
                      View
                    </button>
                    <button className="text-gray-600 hover:text-gray-700 px-3 py-1 text-sm">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
                <select className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2">
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fallback Language</label>
                <select className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2">
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Enable automatic language detection</span>
                </label>
                
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 mr-2" />
                  <span className="text-sm text-gray-700">Allow machine translation suggestions</span>
                </label>
                
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Require review for all translations</span>
                </label>
                
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 mr-2" defaultChecked />
                  <span className="text-sm text-gray-700">Send notifications for translation updates</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Import/Export</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <CloudArrowUpIcon className="w-6 h-6 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Import Translations</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Import translations from various file formats</p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                  Import Files
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <CloudArrowDownIcon className="w-6 h-6 text-green-600" />
                  <h3 className="font-medium text-gray-900">Export Translations</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Export translations to various file formats</p>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                  Export Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Language Modal */}
      <AnimatePresence>
        {showAddLanguage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-90vw"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Language</h3>
                <button
                  onClick={() => setShowAddLanguage(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select name="language" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="">Select a language...</option>
                    <option value="it">🇮🇹 Italian</option>
                    <option value="pt">🇵🇹 Portuguese</option>
                    <option value="ru">🇷🇺 Russian</option>
                    <option value="ja">🇯🇵 Japanese</option>
                    <option value="ko">🇰🇷 Korean</option>
                    <option value="zh">🇨🇳 Chinese</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" name="rtl" className="rounded border-gray-300 mr-2" />
                    <span className="text-sm text-gray-700">Right-to-left (RTL) language</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input type="checkbox" name="enable" className="rounded border-gray-300 mr-2" defaultChecked />
                    <span className="text-sm text-gray-700">Enable for public use</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddLanguage(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      // Get values from form (you'd need to add refs or state for these)
                      const languageSelect = document.querySelector('select[name="language"]') as HTMLSelectElement;
                      const rtlCheckbox = document.querySelector('input[type="checkbox"][name="rtl"]') as HTMLInputElement;
                      const enableCheckbox = document.querySelector('input[type="checkbox"][name="enable"]') as HTMLInputElement;
                      
                      if (languageSelect?.value) {
                        await addLanguage(languageSelect.value, {
                          isRTL: rtlCheckbox?.checked || false,
                          status: enableCheckbox?.checked ? 'active' : 'draft'
                        });
                        setShowAddLanguage(false);
                      }
                    } catch (err) {
                      alert('Failed to add language');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Language
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translation Editor Modal */}
      <AnimatePresence>
        {showTranslationEditor && selectedTranslation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-[800px] max-w-90vw max-h-90vh overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTranslation.key}</h3>
                  <p className="text-sm text-gray-600">{selectedTranslation.namespace}</p>
                </div>
                <button
                  onClick={() => setShowTranslationEditor(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Text (English)
                  </label>
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    {selectedTranslation.sourceText}
                  </div>
                </div>

                {selectedTranslation.metadata.context && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Context
                    </label>
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-sm text-blue-800">
                      {selectedTranslation.metadata.context}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translation ({languages.find(l => l.code === selectedLanguage)?.flag} {languages.find(l => l.code === selectedLanguage)?.name})
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedTranslation.translations[selectedLanguage]?.text || ''}
                    onChange={() => {}}
                    placeholder="Enter translation..."
                  />
                </div>

                {selectedTranslation.metadata.isPlural && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plural Forms
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">=0 (Zero)</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="No items"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">=1 (One)</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="1 item"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">other (Many)</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="# items"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select name="status" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="translated">Translated</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="fuzzy">Fuzzy</option>
                    <option value="untranslated">Untranslated</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTranslationEditor(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      const statusSelect = document.querySelector('select[name="status"]') as HTMLSelectElement;
                      
                      if (selectedTranslation && textarea && statusSelect) {
                        await saveTranslation(
                          selectedTranslation,
                          selectedLanguage,
                          textarea.value,
                          statusSelect.value
                        );
                        setShowTranslationEditor(false);
                      }
                    } catch (err) {
                      alert('Failed to save translation');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Translation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [isLoading, setIsLoading] = useState(true);

  const setLanguage = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    // In a real implementation, this would load the translations for the selected language
  };

  const t = (key: string, params?: Record<string, string>) => {
    const translation = translations[key];
    if (!translation) return key;

    const langTranslation = translation.translations[currentLanguage];
    if (!langTranslation || !langTranslation.text) {
      // Fallback to English
      const fallback = translation.translations['en'];
      if (!fallback || !fallback.text) return key;
      
      let text = fallback.text;
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          text = text.replace(new RegExp(`{{${param}}}`, 'g'), value);
        });
      }
      return text;
    }

    let text = langTranslation.text;
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), value);
      });
    }
    return text;
  };

  useEffect(() => {
    // Load initial language data
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      availableLanguages,
      translations,
      setLanguage,
      t,
      isLoading
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageManager;