import { useState, useCallback, useEffect } from 'react';

interface AccessibilityHook {
  fontSize: number;
  highContrast: boolean;
  screenReaderMode: boolean;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  toggleHighContrast: () => void;
  toggleScreenReader: () => void;
}

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;

export function useAccessibility(): AccessibilityHook {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('accessibility-preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setFontSize(prefs.fontSize || DEFAULT_FONT_SIZE);
        setHighContrast(prefs.highContrast || false);
        setScreenReaderMode(prefs.screenReaderMode || false);
        setVoiceEnabled(prefs.voiceEnabled || false);
      }
    } catch (error) {
      console.error('Failed to load accessibility preferences:', error);
    }
  }, []);

  // Save preferences to localStorage when they change
  const savePreferences = useCallback((newPrefs: Partial<{
    fontSize: number;
    highContrast: boolean;
    screenReaderMode: boolean;
    voiceEnabled: boolean;
  }>) => {
    try {
      const currentPrefs = {
        fontSize,
        highContrast,
        screenReaderMode,
        voiceEnabled,
        ...newPrefs
      };
      localStorage.setItem('accessibility-preferences', JSON.stringify(currentPrefs));
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }, [fontSize, highContrast, screenReaderMode, voiceEnabled]);

  const increaseFontSize = useCallback(() => {
    const newSize = Math.min(fontSize + 2, MAX_FONT_SIZE);
    setFontSize(newSize);
    savePreferences({ fontSize: newSize });
  }, [fontSize, savePreferences]);

  const decreaseFontSize = useCallback(() => {
    const newSize = Math.max(fontSize - 2, MIN_FONT_SIZE);
    setFontSize(newSize);
    savePreferences({ fontSize: newSize });
  }, [fontSize, savePreferences]);

  const toggleHighContrast = useCallback(() => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    savePreferences({ highContrast: newValue });
    
    // Apply high contrast class to document root
    if (newValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast, savePreferences]);

  const toggleScreenReader = useCallback(() => {
    const newValue = !screenReaderMode;
    setScreenReaderMode(newValue);
    savePreferences({ screenReaderMode: newValue });
  }, [screenReaderMode, savePreferences]);

  const toggleVoice = useCallback(() => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    savePreferences({ voiceEnabled: newValue });
  }, [voiceEnabled, savePreferences]);

  return {
    fontSize,
    highContrast,
    screenReaderMode,
    voiceEnabled,
    toggleVoice,
    increaseFontSize,
    decreaseFontSize,
    toggleHighContrast,
    toggleScreenReader
  };
}