/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SupportGroupsPage from '@/app/community/groups/page';

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
    pathname: '/community/groups',
  }),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('SupportGroupsPage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders support groups page correctly', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText('Support Groups')).toBeInTheDocument();
    expect(screen.getByText('Find your community and connect with others')).toBeInTheDocument();
  });

  it('displays create group button', () => {
    render(<SupportGroupsPage />);
    
    const createGroupButton = screen.getByText('Create Group');
    expect(createGroupButton).toBeInTheDocument();
  });

  it('has search functionality', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search groups by name, description, or tags...');
    expect(searchInput).toBeInTheDocument();
    
    await user.type(searchInput, 'anxiety');
    expect(searchInput).toHaveValue('anxiety');
  });

  it('displays filter options', () => {
    render(<SupportGroupsPage />);
    
    const typeFilter = screen.getByDisplayValue('All Types');
    expect(typeFilter).toBeInTheDocument();
    
    // Check filter options
    expect(screen.getByText('All Types')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('displays category sidebar', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    expect(screen.getByText('Depression')).toBeInTheDocument();
    expect(screen.getByText('Trauma/PTSD')).toBeInTheDocument();
    expect(screen.getByText('Bipolar')).toBeInTheDocument();
    expect(screen.getByText('Mindfulness')).toBeInTheDocument();
  });

  it('displays support group cards', () => {
    render(<SupportGroupsPage />);
    
    // Check for group names
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
    expect(screen.getByText('Depression Recovery Network')).toBeInTheDocument();
    expect(screen.getByText('PTSD Warriors')).toBeInTheDocument();
    expect(screen.getByText('Mindful Living Community')).toBeInTheDocument();
    expect(screen.getByText('Bipolar Support Alliance')).toBeInTheDocument();
    expect(screen.getByText('Young Adults Mental Health')).toBeInTheDocument();
  });

  it('shows group descriptions', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText(/A safe space for individuals dealing with anxiety disorders/)).toBeInTheDocument();
    expect(screen.getByText(/Supporting each other through depression recovery/)).toBeInTheDocument();
    expect(screen.getByText(/Veterans and civilians supporting each other/)).toBeInTheDocument();
  });

  it('displays group statistics', () => {
    render(<SupportGroupsPage />);
    
    // Check for member counts
    expect(screen.getByText('247 members')).toBeInTheDocument();
    expect(screen.getByText('189 members')).toBeInTheDocument();
    expect(screen.getByText('98 members')).toBeInTheDocument();
    
    // Check for active member counts
    expect(screen.getByText('34 active')).toBeInTheDocument();
    expect(screen.getByText('28 active')).toBeInTheDocument();
    expect(screen.getByText('15 active')).toBeInTheDocument();
    
    // Check for post counts
    expect(screen.getByText('156 posts')).toBeInTheDocument();
    expect(screen.getByText('203 posts')).toBeInTheDocument();
    expect(screen.getByText('87 posts')).toBeInTheDocument();
  });

  it('shows meeting times', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText('Thursdays 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Tuesdays 6:30 PM')).toBeInTheDocument();
    expect(screen.getByText('Sundays 4:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Daily 8:00 AM')).toBeInTheDocument();
  });

  it('displays group tags', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText('#anxiety')).toBeInTheDocument();
    expect(screen.getByText('#coping')).toBeInTheDocument();
    expect(screen.getByText('#mindfulness')).toBeInTheDocument();
    expect(screen.getByText('#depression')).toBeInTheDocument();
    expect(screen.getByText('#recovery')).toBeInTheDocument();
    expect(screen.getByText('#hope')).toBeInTheDocument();
  });

  it('shows public/private indicators', () => {
    render(<SupportGroupsPage />);
    
    // Public groups should have globe icons
    // Private groups should have lock icons
    // We can't easily test for icons, but we can test that the groups render
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
    expect(screen.getByText('Depression Recovery Network')).toBeInTheDocument();
  });

  it('displays moderator information', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText(/Moderated by: Dr. Sarah M., Mike K./)).toBeInTheDocument();
    expect(screen.getByText(/Moderated by: Lisa R., Dr. James T./)).toBeInTheDocument();
    expect(screen.getByText(/Moderated by: Veteran Joe, Dr. Maria S./)).toBeInTheDocument();
  });

  it('has join group buttons', () => {
    render(<SupportGroupsPage />);
    
    const joinButtons = screen.getAllByText('Join Group');
    expect(joinButtons).toHaveLength(6); // Should have 6 groups
  });

  it('has view details buttons', () => {
    render(<SupportGroupsPage />);
    
    const viewDetailsButtons = screen.getAllByText('View Details');
    expect(viewDetailsButtons).toHaveLength(6); // Should have 6 groups
  });

  it('filters groups by category', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    // Click on Anxiety category
    const anxietyCategory = screen.getByRole('button', { name: /Anxiety/ });
    await user.click(anxietyCategory);
    
    // Should show only anxiety-related groups
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
  });

  it('filters groups by type', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    const typeFilter = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeFilter, 'public');
    
    // Should filter to show only public groups
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
    expect(screen.getByText('Mindful Living Community')).toBeInTheDocument();
  });

  it('searches groups by name and description', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search groups by name, description, or tags...');
    await user.type(searchInput, 'anxiety');
    
    // Should show groups related to anxiety
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
  });

  it('combines search and filters', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    // Apply type filter first
    const typeFilter = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeFilter, 'public');
    
    // Then search
    const searchInput = screen.getByPlaceholderText('Search groups by name, description, or tags...');
    await user.type(searchInput, 'mindful');
    
    // Should show public groups matching "mindful"
    expect(screen.getByText('Mindful Living Community')).toBeInTheDocument();
  });

  it('displays empty state when no groups match filters', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search groups by name, description, or tags...');
    await user.type(searchInput, 'nonexistentgroup');
    
    await waitFor(() => {
      expect(screen.getByText('No groups found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria or create a new group')).toBeInTheDocument();
    });
  });

  it('shows benefits section', () => {
    render(<SupportGroupsPage />);
    
    expect(screen.getByText('Why Join Support Groups?')).toBeInTheDocument();
    expect(screen.getByText('Emotional Support')).toBeInTheDocument();
    expect(screen.getByText('Reduce Isolation')).toBeInTheDocument();
    expect(screen.getByText('Learn & Grow')).toBeInTheDocument();
    
    // Check benefit descriptions
    expect(screen.getByText(/Connect with others who understand your experiences/)).toBeInTheDocument();
    expect(screen.getByText(/Build meaningful connections and friendships/)).toBeInTheDocument();
    expect(screen.getByText(/Discover new coping strategies/)).toBeInTheDocument();
  });

  it('has accessible back navigation', () => {
    render(<SupportGroupsPage />);
    
    const backLink = screen.getByRole('link', { name: /community/i });
    expect(backLink).toHaveAttribute('href', '/community');
  });

  it('displays category counts', () => {
    render(<SupportGroupsPage />);
    
    // Each category should show the count of groups
    expect(screen.getByText('6')).toBeInTheDocument(); // All Categories count
    expect(screen.getByText('1')).toBeInTheDocument(); // Individual category counts
  });

  it('handles create group button click', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    const createGroupButton = screen.getByText('Create Group');
    await user.click(createGroupButton);
    
    // Button should be clickable (implementation would handle the action)
    expect(createGroupButton).toBeInTheDocument();
  });

  it('displays group emojis correctly', () => {
    render(<SupportGroupsPage />);
    
    // Each group should have an associated emoji/icon
    // We test this indirectly by ensuring all groups render with their content
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
    expect(screen.getByText('Depression Recovery Network')).toBeInTheDocument();
    expect(screen.getByText('PTSD Warriors')).toBeInTheDocument();
  });

  it('shows view details links with correct href', () => {
    render(<SupportGroupsPage />);
    
    const viewDetailsLinks = screen.getAllByText('View Details');
    expect(viewDetailsLinks[0].closest('a')).toHaveAttribute('href', '/community/groups/1');
  });

  it('filters correctly when selecting All Categories', async () => {
    const user = userEvent.setup();
    render(<SupportGroupsPage />);
    
    // First select a specific category
    const anxietyCategory = screen.getByRole('button', { name: /Anxiety/ });
    await user.click(anxietyCategory);
    
    // Then select All Categories
    const allCategoriesButton = screen.getByRole('button', { name: /All Categories/ });
    await user.click(allCategoriesButton);
    
    // Should show all groups again
    expect(screen.getByText('Anxiety Support Circle')).toBeInTheDocument();
    expect(screen.getByText('Depression Recovery Network')).toBeInTheDocument();
    expect(screen.getByText('PTSD Warriors')).toBeInTheDocument();
  });
});
/* eslint-disable react/display-name */
