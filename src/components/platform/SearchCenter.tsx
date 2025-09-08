'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  ClockIcon,
  TagIcon,
  UserIcon,
  DocumentIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  BeakerIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon,
  SparklesIcon,
  FireIcon,
  TrendingUpIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Squares2X2Icon,
  Bars3Icon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'document' | 'message' | 'resource' | 'session' | 'journal' | 'crisis_plan' | 'therapy_note';
  title: string;
  content: string;
  excerpt: string;
  author: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  createdAt: Date;
  modifiedAt: Date;
  tags: string[];
  category: string;
  relevanceScore: number;
  metadata?: {
    fileSize?: number;
    duration?: number;
    readTime?: number;
    wordCount?: number;
    imageCount?: number;
    attachmentCount?: number;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    isEncrypted?: boolean;
    isFeatured?: boolean;
    isPrivate?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'draft' | 'published' | 'archived' | 'deleted';
    thumbnailUrl?: string;
  };
  highlights?: Array<{
    field: string;
    matches: string[];
  }>;
  location?: {
    path: string;
    section: string;
  };
}

interface SearchFilters {
  types: string[];
  categories: string[];
  authors: string[];
  tags: string[];
  dateRange: {
    start?: Date;
    end?: Date;
    preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  };
  sortBy: 'relevance' | 'date' | 'title' | 'author' | 'views' | 'likes';
  sortOrder: 'asc' | 'desc';
  includeArchived: boolean;
  onlyFeatured: boolean;
  onlyPrivate: boolean;
  minRelevanceScore: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

const SearchCenter: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingSearch, setIsSavingSearch] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    categories: [],
    authors: [],
    tags: [],
    dateRange: { preset: 'all' },
    sortBy: 'relevance',
    sortOrder: 'desc',
    includeArchived: false,
    onlyFeatured: false,
    onlyPrivate: false,
    minRelevanceScore: 0
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [saveSearchName, setSaveSearchName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
  const [totalResults, setTotalResults] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; createdAt: Date; resultsCount: number }>>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [resultsPerPage] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const suggestionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved searches on mount
  useEffect(() => {
    fetchSavedSearches();
    fetchRecentSearches();
  }, []);

  // Fetch saved searches
  const fetchSavedSearches = async () => {
    try {
      const response = await fetch('/api/platform/search/saved');
      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data.savedSearches.map((search: any) => ({
          ...search,
          createdAt: new Date(search.createdAt),
          lastUsed: new Date(search.lastUsed)
        })));
      }
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  };

  // Fetch recent searches
  const fetchRecentSearches = async () => {
    try {
      const response = await fetch('/api/platform/search/recent');
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.searches.map((search: any) => ({
          ...search,
          createdAt: new Date(search.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error fetching recent searches:', error);
    }
  };

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (suggestionTimeout.current) {
      clearTimeout(suggestionTimeout.current);
    }

    suggestionTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/platform/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }, 200);
  }, []);

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length > 0) {
      fetchSuggestions(query);
    } else {
      setSearchSuggestions([]);
    }
  }, [query, fetchSuggestions]);

  const handleSearch = useCallback(async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        query: searchQuery,
        page: page.toString(),
        limit: resultsPerPage.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        includeArchived: filters.includeArchived.toString(),
        onlyFeatured: filters.onlyFeatured.toString(),
        onlyPrivate: filters.onlyPrivate.toString(),
        minRelevanceScore: filters.minRelevanceScore.toString()
      });

      // Add array parameters
      if (filters.types.length > 0) {
        params.append('types', filters.types.join(','));
      }
      if (filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.authors.length > 0) {
        params.append('authors', filters.authors.join(','));
      }
      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }

      // Add date range
      if (filters.dateRange.preset && filters.dateRange.preset !== 'all') {
        params.append('datePreset', filters.dateRange.preset);
      } else if (filters.dateRange.start && filters.dateRange.end) {
        params.append('dateStart', filters.dateRange.start.toISOString());
        params.append('dateEnd', filters.dateRange.end.toISOString());
      }

      const response = await fetch(`/api/platform/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      // Transform results to match interface
      const transformedResults = data.results.map((result: any) => ({
        ...result,
        createdAt: new Date(result.createdAt),
        modifiedAt: new Date(result.modifiedAt)
      }));

      setResults(transformedResults);
      setTotalResults(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);

      // Update recent searches
      fetchRecentSearches();
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to perform search. Please try again.');
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, resultsPerPage]);

  const debouncedSearch = useCallback((searchQuery: string, page: number = 1) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      handleSearch(searchQuery, page);
    }, 500); // Increased debounce time for API calls
  }, [handleSearch]);

  useEffect(() => {
    if (query) {
      debouncedSearch(query, currentPage);
    } else {
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
    }
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, currentPage, filters, debouncedSearch]);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return <UserIcon className="w-5 h-5 text-blue-600" />;
      case 'document':
        return <DocumentIcon className="w-5 h-5 text-red-600" />;
      case 'post':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-green-600" />;
      case 'resource':
        return <BookOpenIcon className="w-5 h-5 text-purple-600" />;
      case 'session':
        return <CalendarIcon className="w-5 h-5 text-orange-600" />;
      case 'journal':
        return <HeartIcon className="w-5 h-5 text-pink-600" />;
      case 'crisis_plan':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'therapy_note':
        return <BeakerIcon className="w-5 h-5 text-indigo-600" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const highlightText = (text: string, highlights?: Array<{ field: string; matches: string[] }>) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      highlight.matches.forEach(match => {
        const regex = new RegExp(`(${match})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 font-medium">$1</mark>');
      });
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  const applySavedSearch = async (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    setShowSavedSearches(false);
    setCurrentPage(1);
    
    // Update usage stats on server
    try {
      await fetch('/api/platform/search/saved', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedSearch.id })
      });
      
      // Refresh saved searches
      fetchSavedSearches();
    } catch (error) {
      console.error('Error updating saved search:', error);
    }
  };

  const saveCurrentSearch = async () => {
    if (!saveSearchName.trim() || !query.trim()) return;
    
    setIsSavingSearch(true);
    try {
      const response = await fetch('/api/platform/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveSearchName,
          query,
          filters
        })
      });

      if (response.ok) {
        await fetchSavedSearches();
        setShowSaveDialog(false);
        setSaveSearchName('');
      } else {
        throw new Error('Failed to save search');
      }
    } catch (error) {
      console.error('Error saving search:', error);
      setError('Failed to save search. Please try again.');
    } finally {
      setIsSavingSearch(false);
    }
  };

  const deleteSavedSearch = async (searchId: string) => {
    try {
      const response = await fetch(`/api/platform/search/saved?id=${searchId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSavedSearches();
      }
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      const response = await fetch('/api/platform/search/recent', {
        method: 'DELETE'
      });

      if (response.ok) {
        setSearchHistory([]);
      }
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      types: [],
      categories: [],
      authors: [],
      tags: [],
      dateRange: { preset: 'all' },
      sortBy: 'relevance',
      sortOrder: 'desc',
      includeArchived: false,
      onlyFeatured: false,
      onlyPrivate: false,
      minRelevanceScore: 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4 mb-6">
          <MagnifyingGlassIconSolid className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Search & Discovery</h1>
            <p className="text-gray-600">Find content, people, and resources across the platform</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-12 pr-16 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {isLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Suggestions */}
          <AnimatePresence>
            {showSuggestions && (searchHistory.length > 0 || query.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              >
                {query.length === 0 && searchHistory.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Recent Searches</h4>
                      <button
                        onClick={clearSearchHistory}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                    {searchHistory.slice(0, 5).map((historyItem, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(historyItem.query);
                          setCurrentPage(1);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span>{historyItem.query}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {historyItem.resultsCount} results
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                
                {query.length > 0 && searchSuggestions.length > 0 && (
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(suggestion);
                          setCurrentPage(1);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center space-x-2"
                      >
                        <SparklesIcon className="w-4 h-4 text-blue-400" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {savedSearches.length > 0 && (
                  <div className="border-t border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Saved Searches</h4>
                      <button
                        onClick={() => setShowSavedSearches(!showSavedSearches)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        View All
                      </button>
                    </div>
                    {savedSearches.slice(0, 3).map((saved) => (
                      <button
                        key={saved.id}
                        onClick={() => applySavedSearch(saved)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <StarIconSolid className="w-4 h-4 text-yellow-500" />
                          <span>{saved.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{saved.useCount} uses</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'All', value: 'all', active: filters.types.length === 0 },
            { label: 'Documents', value: 'document' },
            { label: 'Posts', value: 'post' },
            { label: 'Resources', value: 'resource' },
            { label: 'Therapy Notes', value: 'therapy_note' },
            { label: 'Crisis Plans', value: 'crisis_plan' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                if (filter.value === 'all') {
                  setFilters(prev => ({ ...prev, types: [] }));
                } else {
                  setFilters(prev => ({
                    ...prev,
                    types: prev.types.includes(filter.value)
                      ? prev.types.filter(t => t !== filter.value)
                      : [...prev.types, filter.value]
                  }));
                }
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter.active || filters.types.includes(filter.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results Summary */}
        {query && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600">
                {isLoading ? 'Searching...' : `${totalResults} results for "${query}"`}
              </p>
              {totalResults > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                  >
                    <Bars3Icon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {query && !isLoading && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Save Search</span>
                </button>
              )}
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilters(prev => ({
                    ...prev,
                    sortBy: sortBy as any,
                    sortOrder: sortOrder as any
                  }));
                  setCurrentPage(1);
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="relevance-desc">Most Relevant</option>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="views-desc">Most Viewed</option>
                <option value="likes-desc">Most Liked</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <div className="flex space-x-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Content Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Types</label>
                <div className="space-y-2">
                  {[
                    { value: 'document', label: 'Documents' },
                    { value: 'post', label: 'Community Posts' },
                    { value: 'resource', label: 'Resources' },
                    { value: 'therapy_note', label: 'Therapy Notes' },
                    { value: 'crisis_plan', label: 'Crisis Plans' },
                    { value: 'journal', label: 'Journal Entries' },
                    { value: 'user', label: 'Users' }
                  ].map((type) => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, types: [...prev.types, type.value] }));
                          } else {
                            setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type.value) }));
                          }
                        }}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={filters.dateRange.preset || 'custom'}
                  onChange={(e) => {
                    const preset = e.target.value as any;
                    if (preset === 'custom') {
                      setFilters(prev => ({ ...prev, dateRange: { start: undefined, end: undefined } }));
                    } else {
                      setFilters(prev => ({ ...prev, dateRange: { preset } }));
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>

                {!filters.dateRange.preset && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="date"
                      placeholder="Start date"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                      }))}
                    />
                    <input
                      type="date"
                      placeholder="End date"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                      }))}
                    />
                  </div>
                )}
              </div>

              {/* Additional Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Options</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.onlyFeatured}
                      onChange={(e) => setFilters(prev => ({ ...prev, onlyFeatured: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Featured content only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.includeArchived}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeArchived: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Include archived</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.onlyPrivate}
                      onChange={(e) => setFilters(prev => ({ ...prev, onlyPrivate: e.target.checked }))}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm text-gray-700">Private content only</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {query && (
        <div className="bg-white rounded-lg shadow-md">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p>Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'divide-y divide-gray-200'
            }>
              {results.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    viewMode === 'grid'
                      ? 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
                      : 'p-6 hover:bg-gray-50 cursor-pointer'
                  }
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {result.metadata?.thumbnailUrl ? (
                        <img
                          src={result.metadata.thumbnailUrl}
                          alt={result.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        getTypeIcon(result.type)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {highlightText(result.title, result.highlights)}
                          </h3>
                          <div className="flex items-center space-x-3 text-sm text-gray-500 mb-2">
                            <div className="flex items-center space-x-1">
                              {getTypeIcon(result.type)}
                              <span className="capitalize">{result.type.replace('_', ' ')}</span>
                            </div>
                            <span>•</span>
                            <span>{result.author.name}</span>
                            <span>•</span>
                            <span>{formatDistance(result.createdAt, new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {result.metadata?.priority && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              getPriorityColor(result.metadata.priority)
                            }`}>
                              {result.metadata.priority}
                            </span>
                          )}
                          {result.metadata?.isFeatured && (
                            <StarIconSolid className="w-4 h-4 text-yellow-500" />
                          )}
                          {result.metadata?.isEncrypted && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Encrypted" />
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {highlightText(result.excerpt, result.highlights)}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {result.metadata?.viewCount !== undefined && (
                            <div className="flex items-center space-x-1">
                              <EyeIcon className="w-4 h-4" />
                              <span>{result.metadata.viewCount}</span>
                            </div>
                          )}
                          {result.metadata?.likeCount !== undefined && (
                            <div className="flex items-center space-x-1">
                              <HeartIcon className="w-4 h-4" />
                              <span>{result.metadata.likeCount}</span>
                            </div>
                          )}
                          {result.metadata?.readTime && (
                            <span>{result.metadata.readTime} min read</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {result.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {result.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{result.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {result.location && (
                        <div className="mt-2 text-xs text-gray-400">
                          {result.location.section} • {result.location.path}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * resultsPerPage) + 1} to {Math.min(currentPage * resultsPerPage, totalResults)} of {totalResults} results
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Searches Modal */}
      <AnimatePresence>
        {showSavedSearches && (
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
              className="bg-white rounded-lg p-6 w-96 max-w-90vw max-h-90vh overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Saved Searches</h3>
                <button
                  onClick={() => setShowSavedSearches(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {savedSearches.map((saved) => (
                  <div
                    key={saved.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <button
                        onClick={() => applySavedSearch(saved)}
                        className="flex-1 text-left"
                      >
                        <h4 className="font-medium text-gray-900">{saved.name}</h4>
                      </button>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{saved.useCount} uses</span>
                          <span>•</span>
                          <span>{formatDistance(saved.lastUsed, new Date(), { addSuffix: true })}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSearch(saved.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">&ldquo;{saved.query}&rdquo;</p>
                    <div className="flex flex-wrap gap-1">
                      {saved.filters.types.map((type) => (
                        <span
                          key={type}
                          className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {savedSearches.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <StarIconSolid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No saved searches yet</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Search Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Search</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Name
                </label>
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., Recent therapy notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Query: <span className="font-medium">&ldquo;{query}&rdquo;</span>
                </p>
                {filters.types.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Types: <span className="font-medium">{filters.types.join(', ')}</span>
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveSearchName('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentSearch}
                  disabled={!saveSearchName.trim() || isSavingSearch}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSavingSearch ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Search</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchCenter;