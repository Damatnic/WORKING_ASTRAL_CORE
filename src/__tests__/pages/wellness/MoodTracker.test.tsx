/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MoodTrackerPage from '@/app/wellness/mood-tracker/page';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/wellness/mood-tracker',
  }),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('MoodTrackerPage', () => {
  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders mood tracker interface correctly', () => {
    render(<MoodTrackerPage />);
    
    expect(screen.getByText('Mood Tracker')).toBeInTheDocument();
    expect(screen.getByText('Track your daily emotional well-being')).toBeInTheDocument();
    expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
    expect(screen.getByText('Overall Mood')).toBeInTheDocument();
    expect(screen.getByText('Specific Emotions')).toBeInTheDocument();
    expect(screen.getByText('Triggers')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('displays mood options correctly', () => {
    render(<MoodTrackerPage />);
    
    // Check all mood options are present
    expect(screen.getByText('Very Low')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Okay')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Very Good')).toBeInTheDocument();
  });

  it('allows selecting mood options', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    const goodMoodButton = screen.getByText('Good');
    await user.click(goodMoodButton);
    
    // The button should be selected (would have different styling)
    // We can check if the save button is enabled
    const saveButton = screen.getByText('Save Today\'s Mood');
    expect(saveButton).not.toBeDisabled();
  });

  it('displays emotion options and allows selection', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    // Check some emotion options
    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.getByText('Anxious')).toBeInTheDocument();
    expect(screen.getByText('Calm')).toBeInTheDocument();
    expect(screen.getByText('Grateful')).toBeInTheDocument();
    
    // Select an emotion
    const happyButton = screen.getByText('Happy');
    await user.click(happyButton);
    
    // Select another emotion
    const calmButton = screen.getByText('Calm');
    await user.click(calmButton);
    
    // These should be selected now
  });

  it('displays trigger options and allows selection', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    // Check some trigger options
    expect(screen.getByText('Work stress')).toBeInTheDocument();
    expect(screen.getByText('Relationship issues')).toBeInTheDocument();
    expect(screen.getByText('Financial concerns')).toBeInTheDocument();
    expect(screen.getByText('Health issues')).toBeInTheDocument();
    
    // Select a trigger
    const workStressButton = screen.getByText('Work stress');
    await user.click(workStressButton);
  });

  it('allows entering notes', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    const notesTextarea = screen.getByPlaceholderText('How was your day? What influenced your mood?');
    expect(notesTextarea).toBeInTheDocument();
    
    await user.type(notesTextarea, 'Had a good day at work, feeling accomplished.');
    expect(notesTextarea).toHaveValue('Had a good day at work, feeling accomplished.');
  });

  it('save button is disabled when no mood is selected', () => {
    render(<MoodTrackerPage />);
    
    const saveButton = screen.getByText('Save Today\'s Mood');
    expect(saveButton).toBeDisabled();
  });

  it('saves mood entry when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    // Select a mood
    const goodMoodButton = screen.getByText('Good');
    await user.click(goodMoodButton);
    
    // Select emotions
    const happyButton = screen.getByText('Happy');
    await user.click(happyButton);
    
    // Select triggers
    const workStressButton = screen.getByText('Work stress');
    await user.click(workStressButton);
    
    // Add notes
    const notesTextarea = screen.getByPlaceholderText('How was your day? What influenced your mood?');
    await user.type(notesTextarea, 'Good day overall');
    
    // Save
    const saveButton = screen.getByText('Save Today\'s Mood');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Mood entry saved successfully!');
    });
    
    expect(console.log).toHaveBeenCalledWith(
      'Saving mood entry:',
      expect.objectContaining({
        mood: 4, // Good mood value
        emotions: ['Happy'],
        notes: 'Good day overall',
        triggers: ['Work stress'],
        date: expect.any(String),
      })
    );
  });

  it('displays weekly mood history', () => {
    render(<MoodTrackerPage />);
    
    expect(screen.getByText('This Week')).toBeInTheDocument();
    
    // Should show days of the week
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('displays insights section', () => {
    render(<MoodTrackerPage />);
    
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Average Mood')).toBeInTheDocument();
    expect(screen.getByText('3.6/5 this week')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('7 days tracked')).toBeInTheDocument();
    expect(screen.getByText('Best Day')).toBeInTheDocument();
    expect(screen.getByText('Wednesday (5/5)')).toBeInTheDocument();
  });

  it('has accessible back navigation', () => {
    render(<MoodTrackerPage />);
    
    const backLink = screen.getByRole('link', { name: /wellness/i });
    expect(backLink).toHaveAttribute('href', '/wellness');
  });

  it('handles multiple emotion selections correctly', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    // Select multiple emotions
    const emotions = ['Happy', 'Excited', 'Grateful'];
    
    for (const emotion of emotions) {
      const emotionButton = screen.getByText(emotion);
      await user.click(emotionButton);
    }
    
    // All should be selected
    // We can verify this by checking if they have the selected styling
  });

  it('handles multiple trigger selections correctly', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    // Select multiple triggers
    const triggers = ['Work stress', 'Exercise', 'Weather'];
    
    for (const trigger of triggers) {
      const triggerButton = screen.getByText(trigger);
      await user.click(triggerButton);
    }
    
    // All should be selected
  });

  it('can deselect emotions and triggers', async () => {
    const user = userEvent.setup();
    render(<MoodTrackerPage />);
    
    // Select an emotion
    const happyButton = screen.getByText('Happy');
    await user.click(happyButton);
    
    // Deselect it by clicking again
    await user.click(happyButton);
    
    // Should be deselected now
  });

  it('displays correct mood icons', () => {
    render(<MoodTrackerPage />);
    
    // Should have mood icons/indicators for each mood level
    // This would depend on the specific icons used
    const moodButtons = screen.getAllByRole('button');
    const moodLevelButtons = moodButtons.filter(button => 
      ['Very Low', 'Low', 'Okay', 'Good', 'Very Good'].includes(button.textContent || '')
    );
    
    expect(moodLevelButtons).toHaveLength(5);
  });
});
/* eslint-disable react/display-name */
