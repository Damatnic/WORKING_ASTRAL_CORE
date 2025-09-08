import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the mood tracker component
const MoodTracker = () => {
  const [currentMood, setCurrentMood] = React.useState<number | null>(null);
  const [emotions, setEmotions] = React.useState<string[]>([]);
  const [triggers, setTriggers] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState('');

  const toggleEmotion = (emotion: string) => {
    setEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const toggleTrigger = (trigger: string) => {
    setTriggers(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const handleSave = () => {
    if (!currentMood) return;
    console.log('Saving mood entry:', { currentMood, emotions, triggers, notes });
  };

  return (
    <div data-testid="mood-tracker">
      <h2>How are you feeling today?</h2>
      
      {/* Mood Selection */}
      <div data-testid="mood-selection">
        {[1, 2, 3, 4, 5].map((mood) => (
          <button
            key={mood}
            data-testid={`mood-${mood}`}
            onClick={() => setCurrentMood(mood)}
            className={currentMood === mood ? 'selected' : ''}
          >
            {mood}
          </button>
        ))}
      </div>

      {/* Emotions */}
      <div data-testid="emotions-selection">
        {['Happy', 'Sad', 'Anxious', 'Grateful', 'Frustrated'].map((emotion) => (
          <button
            key={emotion}
            data-testid={`emotion-${emotion.toLowerCase()}`}
            onClick={() => toggleEmotion(emotion)}
            className={emotions.includes(emotion) ? 'selected' : ''}
          >
            {emotion}
          </button>
        ))}
      </div>

      {/* Triggers */}
      <div data-testid="triggers-selection">
        {['Work', 'Family', 'Health', 'Exercise', 'Sleep'].map((trigger) => (
          <button
            key={trigger}
            data-testid={`trigger-${trigger.toLowerCase()}`}
            onClick={() => toggleTrigger(trigger)}
            className={triggers.includes(trigger) ? 'selected' : ''}
          >
            {trigger}
          </button>
        ))}
      </div>

      {/* Notes */}
      <textarea
        data-testid="notes-input"
        placeholder="Add any additional notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* Save Button */}
      <button
        data-testid="save-button"
        onClick={handleSave}
        disabled={!currentMood}
      >
        Save Entry
      </button>
    </div>
  );
};

describe('MoodTracker Component', () => {
  
  test('renders all required elements', () => {
    render(<MoodTracker />);
    
    expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
    expect(screen.getByTestId('mood-selection')).toBeInTheDocument();
    expect(screen.getByTestId('emotions-selection')).toBeInTheDocument();
    expect(screen.getByTestId('triggers-selection')).toBeInTheDocument();
    expect(screen.getByTestId('notes-input')).toBeInTheDocument();
    expect(screen.getByTestId('save-button')).toBeInTheDocument();
  });

  test('mood selection works correctly', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    const mood3 = screen.getByTestId('mood-3');
    await user.click(mood3);
    
    expect(mood3).toHaveClass('selected');
    expect(screen.getByTestId('save-button')).toBeEnabled();
  });

  test('emotion selection allows multiple choices', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    const happyButton = screen.getByTestId('emotion-happy');
    const sadButton = screen.getByTestId('emotion-sad');
    
    await user.click(happyButton);
    await user.click(sadButton);
    
    expect(happyButton).toHaveClass('selected');
    expect(sadButton).toHaveClass('selected');
  });

  test('emotion can be toggled off', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    const happyButton = screen.getByTestId('emotion-happy');
    
    // Select emotion
    await user.click(happyButton);
    expect(happyButton).toHaveClass('selected');
    
    // Deselect emotion
    await user.click(happyButton);
    expect(happyButton).not.toHaveClass('selected');
  });

  test('triggers selection works correctly', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    const workTrigger = screen.getByTestId('trigger-work');
    await user.click(workTrigger);
    
    expect(workTrigger).toHaveClass('selected');
  });

  test('notes input accepts text', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    const notesInput = screen.getByTestId('notes-input');
    await user.type(notesInput, 'Feeling great today!');
    
    expect(notesInput).toHaveValue('Feeling great today!');
  });

  test('save button is disabled without mood selection', () => {
    render(<MoodTracker />);
    
    const saveButton = screen.getByTestId('save-button');
    expect(saveButton).toBeDisabled();
  });

  test('save button is enabled with mood selection', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    await user.click(screen.getByTestId('mood-4'));
    
    const saveButton = screen.getByTestId('save-button');
    expect(saveButton).toBeEnabled();
  });

  test('complete workflow: select mood, emotions, triggers, add notes, save', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<MoodTracker />);
    
    // Select mood
    await user.click(screen.getByTestId('mood-5'));
    
    // Select emotions
    await user.click(screen.getByTestId('emotion-happy'));
    await user.click(screen.getByTestId('emotion-grateful'));
    
    // Select trigger
    await user.click(screen.getByTestId('trigger-exercise'));
    
    // Add notes
    await user.type(screen.getByTestId('notes-input'), 'Great workout today!');
    
    // Save
    await user.click(screen.getByTestId('save-button'));
    
    expect(consoleSpy).toHaveBeenCalledWith('Saving mood entry:', {
      currentMood: 5,
      emotions: ['Happy', 'Grateful'],
      triggers: ['Exercise'],
      notes: 'Great workout today!'
    });
    
    consoleSpy.mockRestore();
  });

  test('handles rapid clicking without errors', async () => {
    const user = userEvent.setup();
    render(<MoodTracker />);
    
    const mood3 = screen.getByTestId('mood-3');
    
    // Click rapidly
    for (let i = 0; i < 10; i++) {
      await user.click(mood3);
    }
    
    expect(mood3).toHaveClass('selected');
    expect(screen.getByTestId('save-button')).toBeEnabled();
  });
});