/**
 * Accessibility utilities and services
 */

export class AccessibilityService {
  private static liveRegion: HTMLElement | null = null;

  /**
   * Initialize the accessibility service
   */
  static initialize() {
    if (typeof window === 'undefined') return;

    // Create live region for announcements
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';
      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Announce a message to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (typeof window === 'undefined') return;

    this.initialize();
    
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;
      
      // Clear the message after a delay to allow for repeated announcements
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Trap focus within a container element
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check if user prefers high contrast
   */
  static prefersHighContrast(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Get accessible color with sufficient contrast
   */
  static getAccessibleColor(backgroundColor: string, lightColor: string, darkColor: string): string {
    // This is a simplified implementation - in production you'd want proper contrast calculation
    const isDark = backgroundColor.includes('dark') || backgroundColor.includes('black');
    return isDark ? lightColor : darkColor;
  }

  /**
   * Skip to main content functionality
   */
  static skipToMain() {
    const mainContent = document.getElementById('main') || document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  }

  /**
   * Generate accessible IDs for form elements
   */
  static generateId(prefix: string = 'accessible'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Hook-like utilities for accessibility
 */
export const accessibility = {
  announce: AccessibilityService.announce.bind(AccessibilityService),
  trapFocus: AccessibilityService.trapFocus.bind(AccessibilityService),
  prefersReducedMotion: AccessibilityService.prefersReducedMotion.bind(AccessibilityService),
  prefersHighContrast: AccessibilityService.prefersHighContrast.bind(AccessibilityService),
  getAccessibleColor: AccessibilityService.getAccessibleColor.bind(AccessibilityService),
  skipToMain: AccessibilityService.skipToMain.bind(AccessibilityService),
  generateId: AccessibilityService.generateId.bind(AccessibilityService),
};

// Initialize on module load
if (typeof window !== 'undefined') {
  AccessibilityService.initialize();
}