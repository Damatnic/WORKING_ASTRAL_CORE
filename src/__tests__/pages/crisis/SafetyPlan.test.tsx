/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SafetyPlanPage from '@/app/crisis/safety-plan/page';

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
    pathname: '/crisis/safety-plan',
  }),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('SafetyPlanPage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders safety plan builder correctly', () => {
    render(<SafetyPlanPage />);
    
    expect(screen.getByText('Safety Plan Builder')).toBeInTheDocument();
    expect(screen.getByText('Create a personalized crisis safety plan')).toBeInTheDocument();
    expect(screen.getByText('Warning Signs')).toBeInTheDocument();
    expect(screen.getByText('Coping Strategies')).toBeInTheDocument();
    expect(screen.getByText('Support Contacts')).toBeInTheDocument();
    expect(screen.getByText('Professional Contacts')).toBeInTheDocument();
  });

  it('allows adding warning signs', async () => {
    const user = userEvent.setup();
    render(<SafetyPlanPage />);
    
    const warningSignInput = screen.getByPlaceholderText('Enter a warning sign...');
    await user.type(warningSignInput, 'Feeling overwhelmed');
    
    expect(warningSignInput).toHaveValue('Feeling overwhelmed');
    
    const addWarningSignButton = screen.getByText('Add Warning Sign');
    await user.click(addWarningSignButton);
    
    // Should have added a new input field
    const warningSignInputs = screen.getAllByPlaceholderText('Enter a warning sign...');
    expect(warningSignInputs).toHaveLength(2);
  });

  it('allows removing warning signs', async () => {
    const user = userEvent.setup();
    render(<SafetyPlanPage />);
    
    // First add content to the input
    const warningSignInput = screen.getByPlaceholderText('Enter a warning sign...');
    await user.type(warningSignInput, 'Test warning sign');
    
    // Add another warning sign
    const addButton = screen.getByText('Add Warning Sign');
    await user.click(addButton);
    
    // Now we should have 2 inputs
    let warningSignInputs = screen.getAllByPlaceholderText('Enter a warning sign...');
    expect(warningSignInputs).toHaveLength(2);
    
    // Remove the first one
    const removeButtons = screen.getAllByTitle('Remove item');
    await user.click(removeButtons[0]);
    
    // Should now have 1 input
    warningSignInputs = screen.getAllByPlaceholderText('Enter a warning sign...');
    expect(warningSignInputs).toHaveLength(1);
  });

  it('allows adding and editing support contacts', async () => {
    const user = userEvent.setup();
    render(<SafetyPlanPage />);
    
    // Find support contacts section
    const nameInput = screen.getByPlaceholderText('Name');
    const phoneInput = screen.getByPlaceholderText('Phone number');
    const relationshipInput = screen.getByPlaceholderText('Relationship');
    
    await user.type(nameInput, 'John Doe');
    await user.type(phoneInput, '555-1234');
    await user.type(relationshipInput, 'Friend');
    
    expect(nameInput).toHaveValue('John Doe');
    expect(phoneInput).toHaveValue('555-1234');
    expect(relationshipInput).toHaveValue('Friend');
    
    // Add another support contact
    const addContactButton = screen.getByText('Add Support Contact');
    await user.click(addContactButton);
    
    const nameInputs = screen.getAllByPlaceholderText('Name');
    expect(nameInputs).toHaveLength(2);
  });

  it('saves safety plan when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<SafetyPlanPage />);
    
    // Fill in some basic information
    const warningSignInput = screen.getByPlaceholderText('Enter a warning sign...');
    await user.type(warningSignInput, 'Feeling isolated');
    
    const copingStrategyInput = screen.getByPlaceholderText('Enter a coping strategy...');
    await user.type(copingStrategyInput, 'Call a friend');
    
    // Click save
    const saveButton = screen.getByText('Save Safety Plan');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Safety plan saved successfully!');
    });
    
    expect(console.log).toHaveBeenCalledWith(
      'Saving safety plan:',
      expect.objectContaining({
        warningSigns: ['Feeling isolated'],
        copingStrategies: ['Call a friend'],
      })
    );
  });

  it('has accessible form labels and inputs', () => {
    render(<SafetyPlanPage />);
    
    // Check that form inputs are properly labeled
    expect(screen.getByText('Warning Signs')).toBeInTheDocument();
    expect(screen.getByText('Coping Strategies')).toBeInTheDocument();
    expect(screen.getByText('Support Contacts')).toBeInTheDocument();
    expect(screen.getByText('Professional Contacts')).toBeInTheDocument();
    
    // Check that inputs have proper placeholders
    expect(screen.getByPlaceholderText('Enter a warning sign...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter a coping strategy...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument();
  });

  it('displays back navigation link', () => {
    render(<SafetyPlanPage />);
    
    const backLink = screen.getByRole('link', { name: /crisis/i });
    expect(backLink).toHaveAttribute('href', '/crisis');
  });

  it('handles professional contacts correctly', async () => {
    const user = userEvent.setup();
    render(<SafetyPlanPage />);
    
    // Find professional contacts inputs
    const professionalNameInput = screen.getByPlaceholderText('Name/Title');
    const professionalPhoneInput = screen.getAllByPlaceholderText('Phone number')[1];
    const organizationInput = screen.getByPlaceholderText('Organization');
    
    await user.type(professionalNameInput, 'Dr. Smith');
    await user.type(professionalPhoneInput, '555-9876');
    await user.type(organizationInput, 'Mental Health Clinic');
    
    expect(professionalNameInput).toHaveValue('Dr. Smith');
    expect(professionalPhoneInput).toHaveValue('555-9876');
    expect(organizationInput).toHaveValue('Mental Health Clinic');
    
    // Add another professional contact
    const addProfessionalButton = screen.getByText('Add Professional Contact');
    await user.click(addProfessionalButton);
    
    const professionalNameInputs = screen.getAllByPlaceholderText('Name/Title');
    expect(professionalNameInputs).toHaveLength(2);
  });

  it('validates required sections exist', () => {
    render(<SafetyPlanPage />);
    
    // All main sections should be present
    expect(screen.getByText('Warning Signs')).toBeInTheDocument();
    expect(screen.getByText('Coping Strategies')).toBeInTheDocument();
    expect(screen.getByText('Support Contacts')).toBeInTheDocument();
    expect(screen.getByText('Professional Contacts')).toBeInTheDocument();
    
    // Save button should be present
    expect(screen.getByText('Save Safety Plan')).toBeInTheDocument();
  });
});
/* eslint-disable react/display-name */
