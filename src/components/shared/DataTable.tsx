'use client';

import React, { useState, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';

/**
 * DataTable - Reusable table component with sorting, pagination, and filtering
 * Provides consistent table functionality across all dashboards
 */

export interface Column<T> {
  /** Unique identifier for the column */
  id: string;
  /** Column header label */
  label: string;
  /** Property key to access data or render function */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom width class */
  width?: string;
  /** Custom alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom cell className */
  cellClassName?: string;
  /** Custom header className */
  headerClassName?: string;
}

export interface DataTableProps<T> {
  /** Array of data items */
  data: T[];
  /** Column configurations */
  columns: Column<T>[];
  /** Unique key accessor for each row */
  keyAccessor: keyof T | ((row: T) => string);
  /** Whether to show pagination */
  showPagination?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Current page (controlled) */
  currentPage?: number;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Row selection */
  selectedRows?: T[];
  /** Row selection handler */
  onRowSelect?: (rows: T[]) => void;
  /** Whether to show checkboxes for selection */
  showCheckboxes?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Whether table is loading */
  isLoading?: boolean;
  /** Custom row className function */
  rowClassName?: (row: T) => string;
  /** Whether to show table borders */
  bordered?: boolean;
  /** Whether to show striped rows */
  striped?: boolean;
  /** Whether to show hover effect */
  hoverable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Sort configuration */
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  /** Sort handler */
  onSort?: (key: string) => void;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyAccessor,
  showPagination = true,
  itemsPerPage = 10,
  currentPage: controlledPage,
  onPageChange,
  onRowClick,
  selectedRows = [],
  onRowSelect,
  showCheckboxes = false,
  emptyMessage = 'No data available',
  isLoading = false,
  rowClassName,
  bordered = true,
  striped = false,
  hoverable = true,
  className = '',
  sortConfig,
  onSort
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = controlledPage || internalPage;

  const getRowKey = (row: T): string => {
    if (typeof keyAccessor === 'function') {
      return keyAccessor(row);
    }
    return String(row[keyAccessor]);
  };

  const getCellValue = (row: T, column: Column<T>): ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor as keyof T] as ReactNode;
  };

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    if (!showPagination) return data;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, currentPage, itemsPerPage, showPagination]);

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      onRowSelect?.([]);
    } else {
      onRowSelect?.(paginatedData);
    }
  };

  const handleSelectRow = (row: T) => {
    const isSelected = selectedRows.some(r => getRowKey(r) === getRowKey(row));
    if (isSelected) {
      onRowSelect?.(selectedRows.filter(r => getRowKey(r) !== getRowKey(row)));
    } else {
      onRowSelect?.([...selectedRows, row]);
    }
  };

  const isRowSelected = (row: T) => {
    return selectedRows.some(r => getRowKey(r) === getRowKey(row));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${bordered ? 'border border-gray-200' : ''} ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showCheckboxes && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`
                    px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}
                    ${column.headerClassName || ''}
                    ${column.width || ''}
                  `}
                  onClick={() => column.sortable && onSort?.(column.id)}
                  role={column.sortable ? 'button' : undefined}
                  aria-sort={
                    sortConfig?.key === column.id
                      ? sortConfig.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="inline-block">
                        {sortConfig?.key === column.id ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
              {paginatedData.map((row, index) => {
                const rowKey = getRowKey(row);
                const isSelected = isRowSelected(row);
                const isClickable = !!onRowClick;

                return (
                  <motion.tr
                    key={rowKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`
                      ${striped && index % 2 === 1 ? 'bg-gray-50' : ''}
                      ${hoverable ? 'hover:bg-gray-50' : ''}
                      ${isClickable ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${rowClassName?.(row) || ''}
                    `}
                    onClick={() => onRowClick?.(row)}
                  >
                    {showCheckboxes && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select row ${rowKey}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`
                          px-6 py-4 whitespace-nowrap text-sm
                          ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                          ${column.cellClassName || ''}
                        `}
                      >
                        {getCellValue(row, column)}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`
                p-2 rounded-lg transition-colors
                ${currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`
                      px-3 py-1 rounded-lg text-sm font-medium transition-colors
                      ${currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded-lg transition-colors
                ${currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
              aria-label="Next page"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;