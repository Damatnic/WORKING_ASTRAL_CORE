import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrisisButton from '@/components/crisis/CrisisButton'
import '@testing-library/jest-dom'

// Mock the toast notifications
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

// Mock the fetch API
global.fetch = jest.fn()

describe('CrisisButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  it('renders the crisis button correctly', () => {
    render(<CrisisButton />)
    const button = screen.getByRole('button', { name: /crisis support/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-red-600')
  })

  it('displays emergency alert icon', () => {
    render(<CrisisButton />)
    const icon = screen.getByTestId('crisis-icon')
    expect(icon).toBeInTheDocument()
  })

  it('handles click event and opens crisis modal', async () => {
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Check if modal appears
    await waitFor(() => {
      expect(screen.getByText(/immediate help/i)).toBeInTheDocument()
    })
  })

  it('shows emergency hotline numbers when clicked', async () => {
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Check for emergency numbers
    await waitFor(() => {
      expect(screen.getByText(/988/)).toBeInTheDocument() // Suicide Prevention Lifeline
      expect(screen.getByText(/Crisis Text Line/i)).toBeInTheDocument()
    })
  })

  it('tracks crisis button activation for analytics', async () => {
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Verify analytics tracking call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/crisis'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('button_activated'),
        })
      )
    })
  })

  it('handles keyboard navigation properly', async () => {
    render(<CrisisButton />)
    const button = screen.getByRole('button', { name: /crisis support/i })
    
    // Focus the button
    button.focus()
    expect(button).toHaveFocus()
    
    // Trigger with Enter key
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
    
    await waitFor(() => {
      expect(screen.getByText(/immediate help/i)).toBeInTheDocument()
    })
  })

  it('maintains accessibility standards', () => {
    render(<CrisisButton />)
    const button = screen.getByRole('button', { name: /crisis support/i })
    
    // Check ARIA attributes
    expect(button).toHaveAttribute('aria-label')
    expect(button).toHaveAttribute('role', 'button')
    expect(button).not.toHaveAttribute('aria-disabled')
  })

  it('shows loading state during network request', async () => {
    // Mock slow network
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Check for loading indicator
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles network errors gracefully', async () => {
    // Mock network error
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Should still show crisis resources even on error
    await waitFor(() => {
      expect(screen.getByText(/988/)).toBeInTheDocument()
      expect(screen.getByText(/Crisis resources are always available/i)).toBeInTheDocument()
    })
  })

  it('persists user preference for quick access', async () => {
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Find and click "Always show" option
    const alwaysShowCheckbox = await screen.findByRole('checkbox', { name: /always show quick access/i })
    await user.click(alwaysShowCheckbox)
    
    // Verify localStorage is updated
    expect(localStorage.getItem('crisis-quick-access')).toBe('true')
  })

  it('provides direct call functionality', async () => {
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Find call button
    const callButton = await screen.findByRole('link', { name: /call 988/i })
    expect(callButton).toHaveAttribute('href', 'tel:988')
  })

  it('shows crisis chat option when available', async () => {
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Check for chat option
    const chatButton = await screen.findByRole('button', { name: /start crisis chat/i })
    expect(chatButton).toBeInTheDocument()
  })

  it('respects user privacy settings', async () => {
    // Set privacy preference
    localStorage.setItem('privacy-mode', 'true')
    
    const user = userEvent.setup()
    render(<CrisisButton />)
    
    const button = screen.getByRole('button', { name: /crisis support/i })
    await user.click(button)
    
    // Should not track in privacy mode
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/analytics'),
      expect.anything()
    )
  })
})