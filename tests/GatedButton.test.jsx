// @vitest-environment jsdom
/**
 * GatedButton unit tests — verifies gating logic for free vs paid users.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// ─── Mocks ──────────────────────────────────────────────────────────────────

let mockIsPaid = false
vi.mock('../src/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPaid: mockIsPaid }),
}))

// Mock UpgradePrompt so we can detect when it renders without pulling in real deps
vi.mock('../src/components/UpgradePrompt', () => ({
  default: ({ featureName }) => <div data-testid="upgrade-prompt">Upgrade: {featureName}</div>,
}))

const { GatedButton } = await import('../src/components/GatedButton')

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockIsPaid = false
})

afterEach(() => {
  cleanup()
})

describe('GatedButton', () => {
  // Test 1
  it('when isPaid=true, renders normal button and fires onClick', () => {
    mockIsPaid = true
    const onClick = vi.fn()

    render(<GatedButton featureName="Test" onClick={onClick} className="my-btn">Click me</GatedButton>)

    const btn = screen.getByRole('button', { name: 'Click me' })
    expect(btn.className).toContain('my-btn')
    expect(btn.className).not.toContain('opacity-50')

    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })

  // Test 2
  it('when isPaid=false, renders button at reduced opacity', () => {
    render(<GatedButton featureName="Test" onClick={vi.fn()}>Gated</GatedButton>)

    const btn = screen.getByRole('button', { name: 'Gated' })
    expect(btn.className).toContain('opacity-50')
  })

  // Test 3
  it('when isPaid=false, click opens UpgradePrompt portal and does NOT fire onClick', () => {
    const onClick = vi.fn()

    render(<GatedButton featureName="Multiple Plans" onClick={onClick}>New Plan</GatedButton>)

    fireEvent.click(screen.getByRole('button', { name: 'New Plan' }))

    // onClick should NOT fire
    expect(onClick).not.toHaveBeenCalled()

    // UpgradePrompt should appear in the document (rendered via portal into document.body)
    expect(screen.getByTestId('upgrade-prompt')).toBeTruthy()
    expect(screen.getByText('Upgrade: Multiple Plans')).toBeTruthy()
  })

  // Test 4
  it('when bypass=true (admin), renders normal button regardless of isPaid', () => {
    mockIsPaid = false
    const onClick = vi.fn()

    render(<GatedButton featureName="Test" onClick={onClick} bypass>Admin Action</GatedButton>)

    const btn = screen.getByRole('button', { name: 'Admin Action' })
    expect(btn.className).not.toContain('opacity-50')

    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()

    // No upgrade prompt should appear
    expect(screen.queryByTestId('upgrade-prompt')).toBeNull()
  })
})
