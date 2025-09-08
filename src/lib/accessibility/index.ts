// Comprehensive Accessibility Utilities for Astral Core
// Provides ARIA support, keyboard navigation, screen reader compatibility, and WCAG compliance

import { ReactNode, RefObject } from 'react';

// ARIA Types and Interfaces
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-readonly'?: boolean;
  'aria-multiselectable'?: boolean;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-atomic'?: boolean;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-busy'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup';
  'aria-grabbed'?: boolean;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-level'?: number;
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-modal'?: boolean;
  'aria-multiline'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-placeholder'?: string;
  'aria-posinset'?: number;
  'aria-pressed'?: boolean | 'mixed';
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  'aria-setsize'?: number;
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  role?: string;
}

export interface FocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: string | HTMLElement;
  fallbackFocus?: string | HTMLElement;
  preventScroll?: boolean;
}

export interface AccessibilityPreferences {
  reducedMotion?: boolean;
  highContrast?: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  screenReader?: boolean;
  keyboardNavigation?: boolean;
  colorBlindnessType?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

// Accessibility Service
export class AccessibilityService {
  private static liveRegions: Map<string, HTMLElement> = new Map();
  private static focusHistory: HTMLElement[] = [];

  // ARIA Live Region Management
  static createLiveRegion(id: string, type: 'polite' | 'assertive' = 'polite'): HTMLElement {
    if (this.liveRegions.has(id)) {
      return this.liveRegions.get(id)!;
    }

    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', type);
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    
    document.body.appendChild(region);
    this.liveRegions.set(id, region);
    
    return region;
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const regionId = `live-region-${priority}`;
    const region = this.createLiveRegion(regionId, priority);
    
    // Clear previous message and announce new one
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 100);
  }

  static announceError(message: string): void {
    this.announce(`Error: ${message}`, 'assertive');
  }

  static announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, 'polite');
  }

  static announcePageChange(title: string): void {
    this.announce(`Navigated to ${title}`, 'polite');
  }

  // Focus Management
  static trapFocus(container: HTMLElement | RefObject<HTMLElement>): () => void {
    const element = container instanceof HTMLElement ? container : container.current;
    if (!element) return () => {};

    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.restoreFocus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);
    
    // Set initial focus
    firstElement.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }

  static saveFocus(): void {
    if (document.activeElement instanceof HTMLElement) {
      this.focusHistory.push(document.activeElement);
    }
  }

  static restoreFocus(): void {
    const lastFocusedElement = this.focusHistory.pop();
    if (lastFocusedElement && lastFocusedElement.isConnected) {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(',');

    return Array.from(container.querySelectorAll<HTMLElement>(selector))
      .filter(el => !el.hasAttribute('inert') && this.isVisible(el));
  }

  static isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetHeight > 0 &&
      element.offsetWidth > 0
    );
  }

  // Keyboard Navigation Utilities
  static createKeyboardHandler(handlers: Record<string, (event: KeyboardEvent) => void>) {
    return (event: KeyboardEvent) => {
      const key = event.key;
      const handler = handlers[key] || handlers['default'];
      
      if (handler) {
        handler(event);
      }
    };
  }

  static handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' | 'both' = 'both'
  ): number {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }

    return newIndex;
  }

  // Screen Reader Utilities
  static createScreenReaderOnlyText(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  }

  static addScreenReaderDescription(element: HTMLElement, description: string): void {
    const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
    const descElement = this.createScreenReaderOnlyText(description);
    descElement.id = descId;
    
    element.parentNode?.insertBefore(descElement, element.nextSibling);
    element.setAttribute('aria-describedby', descId);
  }

  // Form Accessibility
  static associateLabelWithInput(
    label: HTMLLabelElement,
    input: HTMLElement,
    required: boolean = false
  ): void {
    const labelId = label.id || `label-${Math.random().toString(36).substr(2, 9)}`;
    const inputId = input.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    label.id = labelId;
    label.setAttribute('for', inputId);
    input.id = inputId;
    
    if (required) {
      input.setAttribute('aria-required', 'true');
      
      // Add visual indicator
      if (!label.querySelector('.required-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'required-indicator';
        indicator.setAttribute('aria-label', 'required');
        indicator.textContent = '*';
        indicator.style.color = 'red';
        label.appendChild(indicator);
      }
    }
  }

  static announceFormError(fieldName: string, errorMessage: string): void {
    this.announceError(`${fieldName}: ${errorMessage}`);
  }

  static announceFormSuccess(message: string = 'Form submitted successfully'): void {
    this.announceSuccess(message);
  }

  // Modal Accessibility
  static openModal(modal: HTMLElement): () => void {
    // Save current focus
    this.saveFocus();
    
    // Set aria attributes
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    
    // Trap focus
    const releaseFocusTrap = this.trapFocus(modal);
    
    // Hide background content from screen readers
    const mainContent = document.querySelector('main, #root, .app');
    if (mainContent) {
      mainContent.setAttribute('aria-hidden', 'true');
    }

    // Announce modal opening
    const title = modal.querySelector('h1, h2, h3, [role="heading"]')?.textContent;
    if (title) {
      this.announce(`Dialog opened: ${title}`);
    }

    return () => {
      // Restore focus
      this.restoreFocus();
      
      // Release focus trap
      releaseFocusTrap();
      
      // Show background content to screen readers
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden');
      }
      
      // Announce modal closing
      this.announce('Dialog closed');
    };
  }

  // Color and Contrast Utilities
  static checkColorContrast(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): { ratio: number; passes: boolean } {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    const requiredRatio = isLargeText ? 3 : 4.5; // WCAG AA standards
    const passes = ratio >= requiredRatio;
    
    return { ratio, passes };
  }

  private static getLuminance(color: string): number {
    // Convert color to RGB values (simplified - would need full color parser in production)
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Loading State Accessibility
  static announceLoadingState(isLoading: boolean, message?: string): void {
    if (isLoading) {
      this.announce(message || 'Loading...', 'polite');
    }
  }

  static announceLoadingComplete(message?: string): void {
    this.announce(message || 'Loading complete', 'polite');
  }

  // Table Accessibility
  static enhanceTableAccessibility(table: HTMLTableElement): void {
    // Add role if not present
    if (!table.getAttribute('role')) {
      table.setAttribute('role', 'table');
    }

    // Enhance headers
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
      if (!header.id) {
        header.id = `header-${index}`;
      }
      header.setAttribute('role', 'columnheader');
    });

    // Enhance cells
    const cells = table.querySelectorAll('td');
    cells.forEach(cell => {
      cell.setAttribute('role', 'gridcell');
      
      // Associate with headers if not already done
      if (!cell.getAttribute('headers')) {
        const columnIndex = Array.from(cell.parentElement!.children).indexOf(cell);
        const header = table.querySelector(`th:nth-child(${columnIndex + 1})`);
        if (header?.id) {
          cell.setAttribute('headers', header.id);
        }
      }
    });
  }

  // Media Accessibility
  static addCaptionsToVideo(video: HTMLVideoElement, captionsUrl: string): void {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = captionsUrl;
    track.srclang = 'en';
    track.label = 'English Captions';
    track.default = true;
    
    video.appendChild(track);
  }

  static addAudioDescription(video: HTMLVideoElement, description: string): void {
    video.setAttribute('aria-describedby', description);
  }

  // Reduced Motion Support
  static respectsReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  static applyReducedMotion(element: HTMLElement): void {
    if (this.respectsReducedMotion()) {
      element.style.animation = 'none';
      element.style.transition = 'none';
    }
  }

  // High Contrast Support
  static respectsHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  static applyHighContrastStyles(element: HTMLElement): void {
    if (this.respectsHighContrast()) {
      element.classList.add('high-contrast');
    }
  }

  // Skip Links
  static createSkipLink(targetId: string, text: string): HTMLAnchorElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    
    // Style the skip link (usually hidden until focused)
    Object.assign(skipLink.style, {
      position: 'absolute',
      left: '-9999px',
      zIndex: '999',
      padding: '8px 16px',
      background: '#000',
      color: '#fff',
      textDecoration: 'none',
      fontSize: '14px'
    });

    skipLink.addEventListener('focus', () => {
      skipLink.style.left = '6px';
      skipLink.style.top = '7px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.left = '-9999px';
    });

    return skipLink;
  }

  // Breadcrumb Accessibility
  static enhanceBreadcrumbs(breadcrumb: HTMLElement): void {
    breadcrumb.setAttribute('aria-label', 'Breadcrumb');
    
    const items = breadcrumb.querySelectorAll('a, span');
    items.forEach((item, index) => {
      if (index === items.length - 1) {
        item.setAttribute('aria-current', 'page');
      }
    });
  }
}

// React Hooks for Accessibility
export function useAccessibility() {
  return {
    announce: AccessibilityService.announce,
    announceError: AccessibilityService.announceError,
    announceSuccess: AccessibilityService.announceSuccess,
    trapFocus: AccessibilityService.trapFocus,
    saveFocus: AccessibilityService.saveFocus,
    restoreFocus: AccessibilityService.restoreFocus,
    respectsReducedMotion: AccessibilityService.respectsReducedMotion,
    respectsHighContrast: AccessibilityService.respectsHighContrast
  };
}

// ARIA Helper Functions
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createAriaProps(props: AriaAttributes): Record<string, any> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined)
  );
}

// CSS Classes for Accessibility
export const accessibilityStyles = `
  /* Screen reader only text */
  .sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  /* Skip link */
  .skip-link {
    position: absolute;
    left: -9999px;
    z-index: 999;
    padding: 8px 16px;
    background: #000;
    color: #fff;
    text-decoration: none;
    font-size: 14px;
  }

  .skip-link:focus {
    left: 6px !important;
    top: 7px !important;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .high-contrast {
      border: 2px solid currentColor !important;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Focus indicators */
  .focus-visible:focus-visible {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
  }

  /* High visibility focus for users who need it */
  @media (prefers-contrast: high) {
    .focus-visible:focus-visible {
      outline: 3px solid #ffff00;
      outline-offset: 2px;
    }
  }
`;

export default AccessibilityService;