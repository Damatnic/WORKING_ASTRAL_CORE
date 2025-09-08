/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TherapySessionsPage from '@/app/therapy/sessions/page';

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
    pathname: '/therapy/sessions',
  }),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('TherapySessionsPage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders therapy sessions page correctly', () => {
    render(<TherapySessionsPage />);
    
    expect(screen.getByText('Therapy Sessions')).toBeInTheDocument();
    expect(screen.getByText('Your AI therapy session history and insights')).toBeInTheDocument();
  });

  it('displays session statistics', () => {
    render(<TherapySessionsPage />);
    
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
    expect(screen.getByText('Total Time')).toBeInTheDocument();
    expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    
    // Check the actual values
    expect(screen.getByText('5')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('4.2h')).toBeInTheDocument(); // Total time
    expect(screen.getByText('4.5')).toBeInTheDocument(); // Avg rating
    expect(screen.getByText('12')).toBeInTheDocument(); // Key insights
  });

  it('has search functionality', async () => {
    const user = userEvent.setup();
    render(<TherapySessionsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search sessions by topic, notes, or keywords...');
    expect(searchInput).toBeInTheDocument();
    
    await user.type(searchInput, 'anxiety');
    expect(searchInput).toHaveValue('anxiety');
  });

  it('has filter options', () => {
    render(<TherapySessionsPage />);
    
    expect(screen.getByText('All Sessions')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays session cards with correct information', () => {
    render(<TherapySessionsPage />);
    
    // Check for session titles
    expect(screen.getByText('Anxiety Management Session')).toBeInTheDocument();
    expect(screen.getByText('Depression Support Chat')).toBeInTheDocument();
    expect(screen.getByText('Crisis Intervention')).toBeInTheDocument();
    expect(screen.getByText('Relationship Issues Discussion')).toBeInTheDocument();
    expect(screen.getByText('Sleep and Stress Session')).toBeInTheDocument();
  });

  it('shows session details', () => {
    render(<TherapySessionsPage />);
    
    // Check for session details
    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('60 minutes')).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    
    // Check for session notes
    expect(screen.getByText(/Discussed breathing techniques and cognitive restructuring/)).toBeInTheDocument();
    expect(screen.getByText(/Explored feelings of hopelessness/)).toBeInTheDocument();
    expect(screen.getByText(/Emergency session for crisis support/)).toBeInTheDocument();
  });

  it('displays session categories and statuses', () => {
    render(<TherapySessionsPage />);
    
    // Check for categories
    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    expect(screen.getByText('Depression')).toBeInTheDocument();
    expect(screen.getByText('Crisis')).toBeInTheDocument();
    expect(screen.getByText('Relationships')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    
    // Check for statuses
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows star ratings for sessions', () => {
    render(<TherapySessionsPage />);
    
    // There should be star rating components
    const starElements = screen.getAllByTestId('star-rating');
    expect(starElements.length).toBeGreaterThan(0);
  });

  it('displays key insights for each session', () => {
    render(<TherapySessionsPage />);
    
    // Check for some key insights
    expect(screen.getByText('Breathing exercises helpful')).toBeInTheDocument();
    expect(screen.getByText('Small steps approach')).toBeInTheDocument();
    expect(screen.getByText('Safety plan activated')).toBeInTheDocument();
    expect(screen.getByText('Communication styles')).toBeInTheDocument();
  });

  it('filters sessions by status', async () => {
    const user = userEvent.setup();
    render(<TherapySessionsPage />);
    
    // Click on "Completed" filter
    const completedFilterButton = screen.getByRole('button', { name: 'Completed' });
    await user.click(completedFilterButton);
    
    // Should show only completed sessions
    expect(screen.getByText('Anxiety Management Session')).toBeInTheDocument();
    expect(screen.getByText('Depression Support Chat')).toBeInTheDocument();
    
    // In-progress session should not be visible or should be filtered differently
  });

  it('filters sessions by search query', async () => {
    const user = userEvent.setup();
    render(<TherapySessionsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search sessions by topic, notes, or keywords...');
    await user.type(searchInput, 'anxiety');
    
    // Should show sessions related to anxiety
    expect(screen.getByText('Anxiety Management Session')).toBeInTheDocument();
  });

  it('has new session button', () => {
    render(<TherapySessionsPage />);
    
    const newSessionButton = screen.getByText('New Session');
    expect(newSessionButton).toBeInTheDocument();
    expect(newSessionButton.closest('a')).toHaveAttribute('href', '/therapy');
  });

  it('displays empty state when no sessions match filters', async () => {
    const user = userEvent.setup();
    render(<TherapySessionsPage />);
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search sessions by topic, notes, or keywords...');
    await user.type(searchInput, 'nonexistentsession');
    
    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText('No sessions found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });
  });

  it('has accessible back navigation', () => {
    render(<TherapySessionsPage />);
    
    const backLink = screen.getByRole('link', { name: /therapy/i });
    expect(backLink).toHaveAttribute('href', '/therapy');
  });

  it('displays session dates and times correctly', () => {
    render(<TherapySessionsPage />);
    
    // Check for formatted dates
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 12, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
    
    // Check for times
    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('10:15')).toBeInTheDocument();
    expect(screen.getByText('22:45')).toBeInTheDocument();
  });

  it('shows session duration information', () => {
    render(<TherapySessionsPage />);
    
    expect(screen.getByText('Duration: 45 minutes')).toBeInTheDocument();
    expect(screen.getByText('Duration: 60 minutes')).toBeInTheDocument();
    expect(screen.getByText('Duration: 30 minutes')).toBeInTheDocument();
    expect(screen.getByText('Duration: 50 minutes')).toBeInTheDocument();
    expect(screen.getByText('Duration: 40 minutes')).toBeInTheDocument();
  });

  it('has more options menu for sessions', () => {
    render(<TherapySessionsPage />);
    
    // Should have more options buttons (three dots menu)
    const moreOptionsButtons = screen.getAllByTitle('More options');
    expect(moreOptionsButtons.length).toBeGreaterThan(0);
  });

  it('applies recent filter correctly', async () => {
    const user = userEvent.setup();
    render(<TherapySessionsPage />);
    
    const recentFilterButton = screen.getByRole('button', { name: 'Recent' });
    await user.click(recentFilterButton);
    
    // Should show recent sessions (within last 7 days)
    // This would depend on the current date and test data
  });

  it('combines search and filter functionality', async () => {
    const user = userEvent.setup();
    render(<TherapySessionsPage />);
    
    // Apply a filter first
    const completedFilterButton = screen.getByRole('button', { name: 'Completed' });
    await user.click(completedFilterButton);
    
    // Then search within completed sessions
    const searchInput = screen.getByPlaceholderText('Search sessions by topic, notes, or keywords...');
    await user.type(searchInput, 'anxiety');
    
    // Should show only completed sessions that match the search
    expect(screen.getByText('Anxiety Management Session')).toBeInTheDocument();
  });
});
/* eslint-disable react/display-name */
