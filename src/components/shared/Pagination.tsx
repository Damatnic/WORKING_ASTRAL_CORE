'use client';

import React, { useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

/**
 * Pagination - Consistent pagination controls
 * Provides flexible pagination UI for tables and lists
 */

export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems?: number;
  /** Items per page */
  itemsPerPage?: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Whether to show first/last buttons */
  showFirstLast?: boolean;
  /** Whether to show page size selector */
  showPageSize?: boolean;
  /** Available page sizes */
  pageSizes?: number[];
  /** Page size change handler */
  onPageSizeChange?: (size: number) => void;
  /** Number of page buttons to show */
  maxPageButtons?: number;
  /** Whether to show item count */
  showItemCount?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Position */
  position?: 'left' | 'center' | 'right';
  /** Additional CSS classes */
  className?: string;
  /** Aria label for navigation */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: {
    button: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
    select: 'text-xs px-2 py-1'
  },
  md: {
    button: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    select: 'text-sm px-3 py-1.5'
  },
  lg: {
    button: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    select: 'text-base px-4 py-2'
  }
};

const positionClasses = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end'
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  showFirstLast = true,
  showPageSize = false,
  pageSizes = [10, 20, 50, 100],
  onPageSizeChange,
  maxPageButtons = 5,
  showItemCount = true,
  size = 'md',
  position = 'center',
  className = '',
  ariaLabel = 'Pagination Navigation'
}) => {
  const sizes = sizeClasses[size];

  // Calculate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxPageButtons) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate which pages to show with ellipsis
      const halfMax = Math.floor(maxPageButtons / 2);
      
      if (currentPage <= halfMax + 1) {
        // Near the beginning
        for (let i = 1; i <= maxPageButtons - 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - halfMax) {
        // Near the end
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - (maxPageButtons - 2); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - halfMax + 1; i <= currentPage + halfMax - 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages, maxPageButtons]);

  // Calculate item range
  const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  // Don't render if no pages
  if (totalPages === 0) return null;

  return (
    <nav
      className={`flex flex-col sm:flex-row items-center gap-4 ${className}`}
      aria-label={ariaLabel}
    >
      {/* Item Count */}
      {showItemCount && totalItems && (
        <div className={`text-gray-700 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )}

      {/* Page Size Selector */}
      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label 
            htmlFor="page-size" 
            className={`text-gray-700 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}
          >
            Show:
          </label>
          <select
            id="page-size"
            value={itemsPerPage}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={`
              border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${sizes.select}
            `}
          >
            {pageSizes.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pagination Controls */}
      <div className={`flex items-center gap-1 ${positionClasses[position]} flex-1`}>
        {/* First Page Button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`
              flex items-center justify-center rounded-lg transition-colors
              ${currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
              }
              ${sizes.button}
            `}
            aria-label="Go to first page"
          >
            <ChevronDoubleLeftIcon className={sizes.icon} />
          </button>
        )}

        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            flex items-center justify-center rounded-lg transition-colors
            ${currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
            }
            ${sizes.button}
          `}
          aria-label="Go to previous page"
        >
          <ChevronLeftIcon className={sizes.icon} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className={`px-2 text-gray-500 ${sizes.button}`}
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`
                  rounded-lg font-medium transition-colors
                  ${currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${sizes.button}
                `}
                aria-label={`Go to page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            flex items-center justify-center rounded-lg transition-colors
            ${currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
            }
            ${sizes.button}
          `}
          aria-label="Go to next page"
        >
          <ChevronRightIcon className={sizes.icon} />
        </button>

        {/* Last Page Button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`
              flex items-center justify-center rounded-lg transition-colors
              ${currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
              }
              ${sizes.button}
            `}
            aria-label="Go to last page"
          >
            <ChevronDoubleRightIcon className={sizes.icon} />
          </button>
        )}
      </div>

      {/* Page Jump */}
      {totalPages > 10 && (
        <div className="flex items-center gap-2">
          <label 
            htmlFor="page-jump" 
            className={`text-gray-700 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}
          >
            Go to:
          </label>
          <input
            id="page-jump"
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = Number(e.target.value);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
              }
            }}
            className={`
              w-16 border border-gray-300 rounded-lg text-center
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${sizes.select}
            `}
            aria-label="Jump to page"
          />
        </div>
      )}
    </nav>
  );
};

// Simple Pagination Component (just prev/next)
export const SimplePagination: React.FC<Pick<PaginationProps, 'currentPage' | 'totalPages' | 'onPageChange' | 'size' | 'className'>> = ({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  className = ''
}) => {
  const sizes = sizeClasses[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          flex items-center gap-2 rounded-lg transition-colors
          ${currentPage === 1
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
          }
          ${sizes.button}
        `}
      >
        <ChevronLeftIcon className={sizes.icon} />
        Previous
      </button>

      <span className={`text-gray-700 ${sizes.button}`}>
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          flex items-center gap-2 rounded-lg transition-colors
          ${currentPage === totalPages
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
          }
          ${sizes.button}
        `}
      >
        Next
        <ChevronRightIcon className={sizes.icon} />
      </button>
    </div>
  );
};

export default Pagination;