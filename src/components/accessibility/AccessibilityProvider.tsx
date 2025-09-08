"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AccessibilityService } from '@/lib/accessibility';

interface AccessibilityContextType {
  isHighContrast: boolean;
  isReducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
  toggleHighContrast: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large' | 'extra-large') => void;
  focusManagement: {
    trapFocus: (container: HTMLElement) => () => void;
    restoreFocus: (element: HTMLElement | null) => void;
    focusElement: (selector: string) => void;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large' | 'extra-large'>('medium');

  useEffect(() => {
    // Check for user preferences on mount
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setIsHighContrast(highContrastQuery.matches);
    setIsReducedMotion(reducedMotionQuery.matches);

    // Load saved preferences
    const savedFontSize = localStorage.getItem('accessibility-font-size') as typeof fontSize;
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast') === 'true';
    
    if (savedFontSize) setFontSizeState(savedFontSize);
    if (savedHighContrast) setIsHighContrast(true);

    // Listen for preference changes
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    highContrastQuery.addEventListener('change', handleHighContrastChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    return () => {
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  // Apply accessibility preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply high contrast
    root.classList.toggle('high-contrast', isHighContrast);
    
    // Apply font size
    root.setAttribute('data-font-size', fontSize);
    
    // Apply reduced motion
    root.classList.toggle('reduce-motion', isReducedMotion);
  }, [isHighContrast, fontSize, isReducedMotion]);

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    AccessibilityService.announce(message, priority);
  };

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem('accessibility-high-contrast', String(newValue));
    announceMessage(`High contrast ${newValue ? 'enabled' : 'disabled'}`, 'polite');
  };

  const setFontSize = (size: 'small' | 'medium' | 'large' | 'extra-large') => {
    setFontSizeState(size);
    localStorage.setItem('accessibility-font-size', size);
    announceMessage(`Font size changed to ${size}`, 'polite');
  };

  const focusManagement = {
    trapFocus: (container: HTMLElement) => {
      return AccessibilityService.trapFocus(container);
    },
    
    restoreFocus: (element: HTMLElement | null) => {
      if (element) {
        element.focus();
      }
    },
    
    focusElement: (selector: string) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  };

  const contextValue: AccessibilityContextType = {
    isHighContrast,
    isReducedMotion,
    fontSize,
    announceMessage,
    toggleHighContrast,
    setFontSize,
    focusManagement
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Accessibility settings component
export function AccessibilitySettings() {
  const { 
    isHighContrast, 
    fontSize, 
    toggleHighContrast, 
    setFontSize 
  } = useAccessibility();

  return (
    <div className="space-y-6" role="group" aria-labelledby="accessibility-settings-heading">
      <h3 id="accessibility-settings-heading" className="text-lg font-semibold text-neutral-800">
        Accessibility Settings
      </h3>
      
      <div className="space-y-4">
        {/* High Contrast Toggle */}
        <div className="flex items-center justify-between">
          <label 
            htmlFor="high-contrast-toggle"
            className="text-sm font-medium text-neutral-700"
          >
            High Contrast Mode
          </label>
          <button
            id="high-contrast-toggle"
            type="button"
            role="switch"
            aria-checked={isHighContrast}
            onClick={toggleHighContrast}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isHighContrast ? 'bg-primary-600' : 'bg-neutral-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isHighContrast ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Font Size Selection */}
        <div>
          <fieldset>
            <legend className="text-sm font-medium text-neutral-700 mb-3">
              Font Size
            </legend>
            <div className="space-y-2">
              {[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium (Default)' },
                { value: 'large', label: 'Large' },
                { value: 'extra-large', label: 'Extra Large' }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="font-size"
                    value={option.value}
                    checked={fontSize === option.value}
                    onChange={(e) => setFontSize(e.target.value as typeof fontSize)}
                    className="h-4 w-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-sm text-neutral-700">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}