'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

/**
 * FilterControls - Reusable filtering and search component
 * Provides search input, dropdown filters, and date range selection
 */

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
  icon?: React.ComponentType<any>;
}

export interface FilterControlsProps {
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Filter configurations */
  filters?: FilterConfig[];
  /** Current filter values */
  filterValues?: Record<string, string | string[]>;
  /** Filter change handler */
  onFilterChange?: (filterId: string, value: string | string[]) => void;
  /** Whether to show date range filter */
  showDateRange?: boolean;
  /** Date range values */
  dateRange?: { start: Date | null; end: Date | null };
  /** Date range change handler */
  onDateRangeChange?: (range: { start: Date | null; end: Date | null }) => void;
  /** Whether to show the filter toggle button */
  showFilterToggle?: boolean;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether filters are loading */
  isLoading?: boolean;
  /** Custom actions to display */
  customActions?: React.ReactNode;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  showDateRange = false,
  dateRange,
  onDateRangeChange,
  showFilterToggle = true,
  onClearFilters,
  className = '',
  isLoading = false,
  customActions
}) => {
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchValue !== searchValue) {
        onSearchChange?.(localSearchValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchValue]);

  const hasActiveFilters = Object.keys(filterValues).some(key => {
    const value = filterValues[key];
    return Array.isArray(value) ? value.length > 0 : !!value;
  });

  const handleFilterSelect = (filterId: string, value: string) => {
    const config = filters.find(f => f.id === filterId);
    if (!config) return;

    if (config.multiple) {
      const currentValues = (filterValues[filterId] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      onFilterChange?.(filterId, newValues);
    } else {
      onFilterChange?.(filterId, value === filterValues[filterId] ? '' : value);
      setOpenDropdown(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={localSearchValue}
              onChange={(e) => setLocalSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isLoading}
              aria-label="Search"
            />
            {localSearchValue && (
              <button
                onClick={() => setLocalSearchValue('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle and Actions */}
        <div className="flex items-center gap-2">
          {showFilterToggle && (
            <button
              onClick={() => setIsFiltersVisible(!isFiltersVisible)}
              className={`
                flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors
                ${isFiltersVisible || hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
              aria-label="Toggle filters"
              aria-expanded={isFiltersVisible}
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {Object.keys(filterValues).filter(key => {
                    const value = filterValues[key];
                    return Array.isArray(value) ? value.length > 0 : !!value;
                  }).length}
                </span>
              )}
            </button>
          )}

          {hasActiveFilters && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Clear all filters"
            >
              Clear all
            </button>
          )}

          {customActions}
        </div>
      </div>

      {/* Filter Dropdowns */}
      <AnimatePresence>
        {isFiltersVisible && filters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {filters.map((filter) => (
                <div key={filter.id} className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    aria-label={`Filter by ${filter.label}`}
                    aria-expanded={openDropdown === filter.id}
                    aria-haspopup="listbox"
                  >
                    {filter.icon && <filter.icon className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm font-medium text-gray-700">
                      {filter.label}
                    </span>
                    {filterValues[filter.id] && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {Array.isArray(filterValues[filter.id])
                          ? (filterValues[filter.id] as string[]).length
                          : 1}
                      </span>
                    )}
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {openDropdown === filter.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200"
                        role="listbox"
                        aria-label={`${filter.label} options`}
                      >
                        <div className="max-h-64 overflow-y-auto">
                          {filter.options.map((option) => {
                            const isSelected = filter.multiple
                              ? (filterValues[filter.id] as string[] || []).includes(option.value)
                              : filterValues[filter.id] === option.value;

                            return (
                              <button
                                key={option.value}
                                onClick={() => handleFilterSelect(filter.id, option.value)}
                                className={`
                                  w-full px-4 py-2 text-left flex items-center justify-between
                                  hover:bg-gray-50 transition-colors
                                  ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                                `}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <span className="text-sm">{option.label}</span>
                                {option.count !== undefined && (
                                  <span className="text-xs text-gray-500">
                                    ({option.count})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Date Range Filter */}
              {showDateRange && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Date Range:
                  </label>
                  <input
                    type="date"
                    value={dateRange?.start ? dateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      onDateRangeChange?.({ ...dateRange!, start: date });
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    aria-label="Start date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={dateRange?.end ? dateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      onDateRangeChange?.({ ...dateRange!, end: date });
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    aria-label="End date"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterControls;