import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AITherapyInterface from '@/components/ai/AITherapyInterface'
import { faker } from '@faker-js/faker'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  })),
}))

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    connected: true,
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}))

// Mock fetch
global.fetch = jest.fn()

describe('AITherapyInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        response: faker.lorem.sentence(),
        sentiment: 'neutral',
        suggestions: [],
      }),
    })
  })

  it('renders the AI therapy interface correctly', () => {
    render(<AITherapyInterface />)
    
    expect(screen.getByText(/AI Therapy Assistant/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/How are you feeling/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('handles user input and sends message', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'I feel anxious about my upcoming presentation')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/therapy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('anxious'),
        })
      )
    })
  })

  it('displays AI response appropriately', async () => {
    const mockResponse = 'I understand you are feeling anxious. Let us work through this together.'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: mockResponse,
        sentiment: 'concerned',
        suggestions: ['Try deep breathing', 'Consider breaking down the task'],
      }),
    })
    
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'I am anxious')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(mockResponse)).toBeInTheDocument()
      expect(screen.getByText(/Try deep breathing/i)).toBeInTheDocument()
    })
  })

  it('detects crisis keywords and shows intervention', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    
    // Type crisis keyword
    await user.type(input, 'I want to hurt myself')
    
    // Should immediately show crisis intervention
    await waitFor(() => {
      expect(screen.getByText(/immediate support/i)).toBeInTheDocument()
      expect(screen.getByText(/988/)).toBeInTheDocument()
    })
  })

  it('maintains conversation history', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    
    // Send first message
    await user.type(input, 'Hello')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Clear and send second message
    await user.clear(input)
    await user.type(input, 'I need help')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Both messages should be in history
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('I need help')).toBeInTheDocument()
    })
  })

  it('shows typing indicator while AI responds', async () => {
    // Mock slow response
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ response: 'Test response' }),
      }), 1000))
    )
    
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'Test message')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Check for typing indicator
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('handles network errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'Test message')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/Unable to send message/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('provides therapeutic techniques suggestions', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'I hear that you are stressed.',
        sentiment: 'stressed',
        suggestions: ['Progressive muscle relaxation', 'Mindful breathing', 'Grounding exercise'],
        techniques: [
          { name: 'Box Breathing', type: 'breathing', duration: 5 },
          { name: '5-4-3-2-1 Grounding', type: 'grounding', duration: 3 },
        ],
      }),
    })
    
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'I feel stressed')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/Box Breathing/i)).toBeInTheDocument()
      expect(screen.getByText(/5-4-3-2-1 Grounding/i)).toBeInTheDocument()
    })
  })

  it('respects message rate limiting', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    // Send multiple messages rapidly
    for (let i = 0; i < 5; i++) {
      await user.type(input, `Message ${i}`)
      await user.click(sendButton)
      await user.clear(input)
    }
    
    // Should show rate limit warning after threshold
    await waitFor(() => {
      expect(screen.getByText(/Please slow down/i)).toBeInTheDocument()
    })
  })

  it('saves conversation for future reference', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'Important conversation')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Find save button
    const saveButton = await screen.findByRole('button', { name: /save conversation/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/save',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  it('allows exporting conversation transcript', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    // Add some messages first
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'Test conversation')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Find export button
    const exportButton = await screen.findByRole('button', { name: /export/i })
    await user.click(exportButton)
    
    // Check if download was triggered
    expect(screen.getByText(/Transcript exported/i)).toBeInTheDocument()
  })

  it('implements end-to-end encryption for sensitive messages', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    // Enable encryption mode
    const encryptToggle = screen.getByRole('switch', { name: /encrypt messages/i })
    await user.click(encryptToggle)
    
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'Sensitive information')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Verify encrypted transmission
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/therapy',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Encryption': 'enabled',
          }),
        })
      )
    })
  })

  it('provides session summary at the end', async () => {
    const user = userEvent.setup()
    render(<AITherapyInterface />)
    
    // Simulate conversation
    const input = screen.getByPlaceholderText(/How are you feeling/i)
    await user.type(input, 'I discussed my anxiety')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // End session
    const endButton = await screen.findByRole('button', { name: /end session/i })
    await user.click(endButton)
    
    // Check for summary
    await waitFor(() => {
      expect(screen.getByText(/Session Summary/i)).toBeInTheDocument()
      expect(screen.getByText(/Topics discussed/i)).toBeInTheDocument()
      expect(screen.getByText(/anxiety/i)).toBeInTheDocument()
    })
  })
})