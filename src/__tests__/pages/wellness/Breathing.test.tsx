/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BreathingPage from '@/app/wellness/breathing/page';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/wellness/breathing',
  }),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock timers
jest.useFakeTimers();

describe('BreathingPage', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it('renders breathing exercises selection screen initially', () => {
    render(<BreathingPage />);
    
    expect(screen.getByText('Breathing Exercises')).toBeInTheDocument();
    expect(screen.getByText('Guided breathing for relaxation and focus')).toBeInTheDocument();
    expect(screen.getByText('Choose a Breathing Exercise')).toBeInTheDocument();
  });

  it('displays all breathing exercise options', () => {
    render(<BreathingPage />);
    
    expect(screen.getByText('4-7-8 Breathing')).toBeInTheDocument();
    expect(screen.getByText('Box Breathing')).toBeInTheDocument();
    expect(screen.getByText('Triangle Breathing')).toBeInTheDocument();
    expect(screen.getByText('Coherent Breathing')).toBeInTheDocument();
  });

  it('shows exercise descriptions and benefits', () => {
    render(<BreathingPage />);
    
    expect(screen.getByText('A calming technique that helps reduce anxiety and promote sleep')).toBeInTheDocument();
    expect(screen.getByText('Equal timing for all phases, great for focus and calm')).toBeInTheDocument();
    expect(screen.getByText('Simple pattern perfect for beginners')).toBeInTheDocument();
    expect(screen.getByText('5-second inhale and exhale for heart rate variability')).toBeInTheDocument();
  });

  it('displays breathing patterns for each exercise', () => {
    render(<BreathingPage />);
    
    // 4-7-8 Breathing pattern
    expect(screen.getByText(/Inhale 4s → Hold 7s → Exhale 8s/)).toBeInTheDocument();
    
    // Box Breathing pattern
    expect(screen.getByText(/Inhale 4s → Hold 4s → Exhale 4s → Pause 4s/)).toBeInTheDocument();
    
    // Triangle Breathing pattern
    expect(screen.getByText(/Inhale 4s → Hold 4s → Exhale 4s/)).toBeInTheDocument();
    
    // Coherent Breathing pattern
    expect(screen.getByText(/Inhale 5s → Exhale 5s/)).toBeInTheDocument();
  });

  it('shows benefits for each exercise', () => {
    render(<BreathingPage />);
    
    // Check some benefits
    expect(screen.getByText('Reduces anxiety')).toBeInTheDocument();
    expect(screen.getByText('Improves focus')).toBeInTheDocument();
    expect(screen.getByText('Easy for beginners')).toBeInTheDocument();
    expect(screen.getByText('Heart rate variability')).toBeInTheDocument();
  });

  it('starts breathing exercise when Start Exercise button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    // Click on the first exercise (4-7-8 Breathing)
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Should show the breathing interface
    expect(screen.getByText('4-7-8 Breathing')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Breathe In')).toBeInTheDocument();
  });

  it('displays breathing circle with correct phase instruction', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    expect(screen.getByText('Breathe In')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Timer should start at 4 for inhale
  });

  it('has pause/resume functionality', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Should show Pause button initially
    expect(screen.getByText('Pause')).toBeInTheDocument();
    
    // Click pause
    const pauseButton = screen.getByText('Pause');
    await user.click(pauseButton);
    
    // Should show Resume button
    expect(screen.getByText('Resume')).toBeInTheDocument();
    
    // Click resume
    const resumeButton = screen.getByText('Resume');
    await user.click(resumeButton);
    
    // Should show Pause button again
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('has reset functionality', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Click reset
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);
    
    // Should reset to initial state
    expect(screen.getByText('Breathe In')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 of 5')).toBeInTheDocument();
  });

  it('allows changing cycle count', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Find cycle selector
    const cycleSelect = screen.getByDisplayValue('5');
    expect(cycleSelect).toBeInTheDocument();
    
    // Change to 10 cycles
    await user.selectOptions(cycleSelect, '10');
    expect(screen.getByText('Cycle 1 of 10')).toBeInTheDocument();
  });

  it('allows going back to exercise selection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Should show the back button
    const backButton = screen.getByText('← Choose Different Exercise');
    await user.click(backButton);
    
    // Should return to exercise selection
    expect(screen.getByText('Choose a Breathing Exercise')).toBeInTheDocument();
  });

  it('displays breathing timer correctly', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Should start with 4 seconds for inhale
    expect(screen.getByText('4')).toBeInTheDocument();
    
    // Advance timer by 1 second
    jest.advanceTimersByTime(1000);
    
    // Should show 3 seconds remaining
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('transitions between breathing phases', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Start with inhale
    expect(screen.getByText('Breathe In')).toBeInTheDocument();
    
    // Advance timer by 4 seconds (complete inhale phase)
    jest.advanceTimersByTime(4000);
    
    // Should transition to hold phase
    await waitFor(() => {
      expect(screen.getByText('Hold')).toBeInTheDocument();
    });
  });

  it('shows benefits section', () => {
    render(<BreathingPage />);
    
    expect(screen.getByText('Benefits of Breathing Exercises')).toBeInTheDocument();
    expect(screen.getByText('Physical Health')).toBeInTheDocument();
    expect(screen.getByText('Mental Clarity')).toBeInTheDocument();
    expect(screen.getByText('Stress Relief')).toBeInTheDocument();
  });

  it('has sound toggle functionality', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Should have sound toggle button
    const soundButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg') // Button with icon
    );
    
    expect(soundButtons.length).toBeGreaterThan(0);
  });

  it('completes full breathing cycle', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BreathingPage />);
    
    const startButtons = screen.getAllByText('Start Exercise');
    await user.click(startButtons[0]);
    
    // Start with cycle 1
    expect(screen.getByText('Cycle 1 of 5')).toBeInTheDocument();
    
    // Complete one full cycle (4s inhale + 7s hold + 8s exhale = 19s)
    jest.advanceTimersByTime(19000);
    
    // Should advance to cycle 2
    await waitFor(() => {
      expect(screen.getByText('Cycle 2 of 5')).toBeInTheDocument();
    });
  });

  it('has accessible back navigation to wellness', () => {
    render(<BreathingPage />);
    
    const backLink = screen.getByRole('link', { name: /wellness/i });
    expect(backLink).toHaveAttribute('href', '/wellness');
  });

  it('displays exercise cards with proper styling', () => {
    render(<BreathingPage />);
    
    // Each exercise should have a start button
    const startButtons = screen.getAllByText('Start Exercise');
    expect(startButtons).toHaveLength(4); // 4 breathing exercises
    
    // Each exercise should have its name
    expect(screen.getByText('4-7-8 Breathing')).toBeInTheDocument();
    expect(screen.getByText('Box Breathing')).toBeInTheDocument();
    expect(screen.getByText('Triangle Breathing')).toBeInTheDocument();
    expect(screen.getByText('Coherent Breathing')).toBeInTheDocument();
  });
});
/* eslint-disable react/display-name */
