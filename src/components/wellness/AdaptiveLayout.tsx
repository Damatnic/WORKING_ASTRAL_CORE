/**
 * AdaptiveLayout - AI-driven responsive layout system
 * Automatically adjusts widget placement based on user behavior and wellness state
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGesture } from '@use-gesture/react';
import { 
  Grid3x3, 
  Settings,
  Sparkles,
  Layout,
  Focus,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

interface AdaptiveLayoutProps {
  mode: 'adaptive' | 'grid' | 'focus';
  widgets: any[];
  wellnessData: any;
  onLayoutChange: (mode: 'adaptive' | 'grid' | 'focus') => void;
  children?: React.ReactNode;
}

interface LayoutPattern {
  id: string;
  name: string;
  description: string;
  gridTemplate: string;
  mobileTemplate: string;
  conditions: {
    crisisRisk?: string[];
    timeOfDay?: string[];
    userPreference?: boolean;
  };
  priority: number;
}

const AdaptiveLayout: React.FC<AdaptiveLayoutProps> = ({
  mode,
  widgets,
  wellnessData,
  onLayoutChange,
  children
}: AdaptiveLayoutProps) => {
  const [currentLayout, setCurrentLayout] = useState<LayoutPattern | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  // Predefined layout patterns optimized for mental health
  const layoutPatterns: LayoutPattern[] = [
    {
      id: 'crisis-focused',
      name: 'Crisis Support',
      description: 'Prioritizes crisis resources and immediate support',
      gridTemplate: `
        "crisis crisis tools"
        "mood mood professional"
        "metrics metrics community"
      `,
      mobileTemplate: `
        "crisis"
        "tools"
        "mood"
        "professional"
      `,
      conditions: {
        crisisRisk: ['high', 'elevated']
      },
      priority: 1
    },
    {
      id: 'morning-routine',
      name: 'Morning Wellness',
      description: 'Optimized for morning check-ins and planning',
      gridTemplate: `
        "mood mood goals"
        "meditation journal schedule"
        "metrics metrics insights"
      `,
      mobileTemplate: `
        "mood"
        "goals"
        "meditation"
        "schedule"
      `,
      conditions: {
        timeOfDay: ['morning']
      },
      priority: 2
    },
    {
      id: 'evening-reflection',
      name: 'Evening Wind-down',
      description: 'Focus on relaxation and reflection',
      gridTemplate: `
        "journal journal sleep"
        "mood gratitude meditation"
        "progress progress community"
      `,
      mobileTemplate: `
        "journal"
        "sleep"
        "mood"
        "meditation"
      `,
      conditions: {
        timeOfDay: ['evening']
      },
      priority: 2
    },
    {
      id: 'balanced',
      name: 'Balanced View',
      description: 'Equal focus on all wellness aspects',
      gridTemplate: `
        "wellness mood mood analytics"
        "wellness tools tools professional"
        "progress progress community community"
      `,
      mobileTemplate: `
        "wellness"
        "mood"
        "tools"
        "analytics"
        "progress"
      `,
      conditions: {
        crisisRisk: ['low', 'moderate']
      },
      priority: 3
    },
    {
      id: 'therapy-day',
      name: 'Therapy Day',
      description: 'Optimized for therapy session days',
      gridTemplate: `
        "professional professional notes"
        "mood mood goals"
        "progress insights insights"
      `,
      mobileTemplate: `
        "professional"
        "notes"
        "mood"
        "progress"
      `,
      conditions: {
        userPreference: true
      },
      priority: 2
    }
  ];

  // Determine optimal layout based on current context
  useEffect(() => {
    if (mode === 'adaptive') {
      const optimalLayout = determineOptimalLayout();
      setCurrentLayout(optimalLayout);
    }
  }, [mode, wellnessData, widgets]);

  const determineOptimalLayout = (): LayoutPattern => {
    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : 
                      currentHour < 18 ? 'afternoon' : 
                      'evening';

    // Find matching layouts based on conditions
    const matchingLayouts = layoutPatterns.filter(pattern => {
      if (pattern.conditions.crisisRisk && 
          pattern.conditions.crisisRisk.includes(wellnessData?.crisisRisk)) {
        return true;
      }
      if (pattern.conditions.timeOfDay && 
          pattern.conditions.timeOfDay.includes(timeOfDay)) {
        return true;
      }
      return false;
    });

    // Sort by priority and return the best match
    matchingLayouts.sort((a, b) => a.priority - b.priority);
    return matchingLayouts[0] || layoutPatterns.find(p => p.id === 'balanced')!;
  };

  // Handle touch gestures for mobile
  const bind = useGesture({
    onDrag: ({ movement: [mx, my], first, last }: { movement: [number, number], first: boolean, last: boolean }) => {
      if (first) {
        setTouchStartPos({ x: mx, y: my });
      }
      if (last && Math.abs(mx) > 100) {
        // Swipe gesture detected
        if (mx > 0) {
          // Swipe right - show previous layout mode
          cycleLayoutMode('prev');
        } else {
          // Swipe left - show next layout mode
          cycleLayoutMode('next');
        }
      }
    },
    onPinch: ({ offset }: { offset: [number, number] }) => {
      const [scale] = offset;
      // Pinch to zoom for focus mode
      if (scale < 0.8) {
        onLayoutChange('grid');
      } else if (scale > 1.2) {
        onLayoutChange('focus');
      }
    }
  });

  const cycleLayoutMode = (direction: 'next' | 'prev') => {
    const modes: Array<'adaptive' | 'grid' | 'focus'> = ['adaptive', 'grid', 'focus'];
    const currentMode = mode || 'adaptive';
    const currentIndex = modes.indexOf(currentMode);
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % modes.length
      : (currentIndex - 1 + modes.length) % modes.length;
    const newMode = modes[newIndex];
    if (newMode) {
      onLayoutChange(newMode);
    }
  };

  // Render layout mode selector
  const renderLayoutModeSelector = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
    >
      <span className="text-sm font-medium mr-4 flex items-center gap-2">
        <Layout className="w-4 h-4" />
        Layout Mode:
      </span>
      
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onLayoutChange('adaptive')}
          className={`
            px-4 py-2 rounded-lg flex items-center gap-2 transition-all
            ${mode === 'adaptive' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          `}
        >
          <Sparkles className="w-4 h-4" />
          Adaptive
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onLayoutChange('grid')}
          className={`
            px-4 py-2 rounded-lg flex items-center gap-2 transition-all
            ${mode === 'grid' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          `}
        >
          <Grid3x3 className="w-4 h-4" />
          Grid
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onLayoutChange('focus')}
          className={`
            px-4 py-2 rounded-lg flex items-center gap-2 transition-all
            ${mode === 'focus' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          `}
        >
          <Focus className="w-4 h-4" />
          Focus
        </motion.button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isMobile && <Smartphone className="w-4 h-4 text-gray-500" />}
        {isTablet && !isMobile && <Tablet className="w-4 h-4 text-gray-500" />}
        {isDesktop && <Monitor className="w-4 h-4 text-gray-500" />}
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCustomizing(!isCustomizing)}
          className={`
            p-2 rounded-lg transition-all
            ${isCustomizing 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          `}
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );

  // Apply responsive grid styles based on layout mode
  const getLayoutStyles = () => {
    if (mode === 'focus') {
      return {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
        maxWidth: '800px',
        margin: '0 auto'
      };
    }

    if (mode === 'grid') {
      return {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 
                            isTablet ? 'repeat(2, 1fr)' : 
                            'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
        gridAutoRows: 'minmax(200px, auto)'
      };
    }

    // Adaptive mode with custom grid template
    if (currentLayout) {
      const template = isMobile ? currentLayout.mobileTemplate : currentLayout.gridTemplate;
      return {
        display: 'grid',
        gridTemplateAreas: template,
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        gridAutoRows: 'minmax(180px, auto)'
      };
    }

    return {};
  };


  // Render customization overlay
  const renderCustomizationOverlay = () => {
    if (!isCustomizing) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
        onClick={() => setIsCustomizing(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        >
          <h3 className="text-2xl font-bold mb-4">Customize Dashboard Layout</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Choose a Layout Pattern</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {layoutPatterns.map(pattern => (
                  <motion.button
                    key={pattern.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setCurrentLayout(pattern);
                      onLayoutChange('adaptive');
                    }}
                    className={`
                      p-4 rounded-lg border text-left transition-all
                      ${currentLayout?.id === pattern.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}
                    `}
                  >
                    <h5 className="font-semibold mb-1">{pattern.name}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {pattern.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Widget Visibility</h4>
              <div className="space-y-2">
                {widgets.map(widget => (
                  <label
                    key={widget.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <widget.icon className="w-4 h-4" />
                      {widget.title}
                    </span>
                    <input
                      type="checkbox"
                      checked={widget.visible}
                      onChange={() => {
                        // Toggle widget visibility
                      }}
                      className="w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCustomizing(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save customization
                  setIsCustomizing(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="relative">
      {renderLayoutModeSelector()}
      
      <motion.div
        ref={containerRef}
        {...(isMobile ? { 
          onPointerDown: bind().onPointerDown,
          onPointerUp: bind().onPointerUp,
          onPointerMove: bind().onPointerMove,
          onPointerCancel: bind().onPointerCancel
        } : {})}
        style={getLayoutStyles()}
        className="relative"
        layout
        transition={{
          layout: { duration: 0.3, ease: 'easeInOut' }
        }}
      >
        {mode === 'adaptive' && currentLayout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-10 right-0 text-sm text-gray-500 dark:text-gray-400"
          >
            Using: {currentLayout.name}
          </motion.div>
        )}
        
        {children}
      </motion.div>

      <AnimatePresence>
        {renderCustomizationOverlay()}
      </AnimatePresence>

      {/* Mobile Gesture Hints */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm"
        >
          Swipe to change layout • Pinch to zoom
        </motion.div>
      )}
    </div>
  );
};

export default AdaptiveLayout;
