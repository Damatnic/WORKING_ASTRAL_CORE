"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Phone, MessageCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CrisisButtonProps {
  variant?: "floating" | "inline" | "compact";
  className?: string;
}

export default function CrisisButton({ variant = "floating", className = "" }: CrisisButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Keyboard shortcut for crisis help (Ctrl/Cmd + H)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setIsOpen(true);
        setIsUrgent(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleEmergencyCall = () => {
    // In production, this would trigger actual emergency services
    if (typeof window !== "undefined") {
      window.location.href = "tel:988"; // Suicide & Crisis Lifeline
    }
  };

  const handleTextSupport = () => {
    // In production, integrate with crisis text line
    if (typeof window !== "undefined") {
      window.open("https://www.crisistextline.org/", "_blank");
    }
  };

  const handleSafetyPlan = () => {
    // Navigate to safety plan creation/viewing
    window.location.href = "/crisis/safety-plan";
  };

  if (variant === "floating") {
    return (
      <>
        {/* Floating Crisis Button - Always Visible */}
        <motion.button
          className={`fixed bottom-6 right-6 z-50 bg-crisis-primary text-white p-4 rounded-full shadow-lg hover:bg-crisis-secondary transition-all duration-200 ${className}`}
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Crisis Support"
          role="button"
          aria-expanded={isOpen}
        >
          <AlertTriangle size={24} className="animate-pulse-slow" />
        </motion.button>

        {/* Crisis Menu Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 right-6 z-50 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-80 border border-crisis-accent"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Immediate Support Available
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    aria-label="Close crisis menu"
                  >
                    ×
                  </button>
                </div>

                <button
                  onClick={handleEmergencyCall}
                  className="w-full flex items-center gap-3 p-4 bg-crisis-background hover:bg-crisis-accent rounded-xl transition-colors group"
                  aria-label="Call 988 Crisis Lifeline"
                >
                  <Phone className="text-crisis-primary group-hover:scale-110 transition-transform" size={20} />
                  <div className="text-left">
                    <p className="font-semibold text-neutral-900">Call 988</p>
                    <p className="text-sm text-neutral-600">24/7 Crisis Lifeline</p>
                  </div>
                </button>

                <button
                  onClick={handleTextSupport}
                  className="w-full flex items-center gap-3 p-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors group"
                  aria-label="Text Crisis Support"
                >
                  <MessageCircle className="text-primary-600 group-hover:scale-110 transition-transform" size={20} />
                  <div className="text-left">
                    <p className="font-semibold text-neutral-900">Text Support</p>
                    <p className="text-sm text-neutral-600">Chat with a counselor</p>
                  </div>
                </button>

                <button
                  onClick={handleSafetyPlan}
                  className="w-full flex items-center gap-3 p-4 bg-wellness-calm/10 hover:bg-wellness-calm/20 rounded-xl transition-colors group"
                  aria-label="Access Safety Plan"
                >
                  <Heart className="text-wellness-calm group-hover:scale-110 transition-transform" size={20} />
                  <div className="text-left">
                    <p className="font-semibold text-neutral-900">Safety Plan</p>
                    <p className="text-sm text-neutral-600">Access your coping strategies</p>
                  </div>
                </button>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 text-center">
                    You&apos;re not alone. Help is available 24/7.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Inline variant for embedding in pages
  if (variant === "inline") {
    return (
      <div className={`bg-crisis-background border border-crisis-accent rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-4 mb-4">
          <AlertTriangle className="text-crisis-primary" size={24} />
          <h3 className="text-lg font-semibold">Need immediate help?</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handleEmergencyCall}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-crisis-accent rounded-lg transition-colors"
          >
            <Phone size={18} />
            <span>Call 988</span>
          </button>
          <button
            onClick={handleTextSupport}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-primary-50 rounded-lg transition-colors"
          >
            <MessageCircle size={18} />
            <span>Text Support</span>
          </button>
          <button
            onClick={handleSafetyPlan}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-wellness-calm/10 rounded-lg transition-colors"
          >
            <Heart size={18} />
            <span>Safety Plan</span>
          </button>
        </div>
      </div>
    );
  }

  // Compact variant for headers/navigation
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`flex items-center gap-2 px-4 py-2 bg-crisis-primary text-white rounded-lg hover:bg-crisis-secondary transition-colors ${className}`}
      aria-label="Crisis Support"
    >
      <AlertTriangle size={18} />
      <span className="font-medium">Crisis Help</span>
    </button>
  );
}