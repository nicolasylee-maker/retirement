// @vitest-environment jsdom
/**
 * Tests for SubscriptionBadge component — beta countdown display.
 */
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock contexts
const mockAuth = { user: { id: '1', email: 'test@test.com' }, isLoading: false }
const defaultSub = {
  isPaid: true,
  isTrial: false,
  isOverride: true,
  isOverrideTrial: false,
  override: 'beta',
  overrideDaysRemaining: null,
  trialDaysRemaining: null,
  isLoading: false,
}

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

let mockSub = { ...defaultSub }
vi.mock('../src/contexts/SubscriptionContext', () => ({
  useSubscription: () => mockSub,
}))

import SubscriptionBadge from '../src/components/SubscriptionBadge.jsx'

describe('SubscriptionBadge', () => {
  it('shows "Beta" when overrideDaysRemaining is null (permanent)', () => {
    mockSub = { ...defaultSub, overrideDaysRemaining: null }
    const { container } = render(<SubscriptionBadge />)
    expect(container.textContent).toBe('Beta')
  })

  it('shows "Beta (142d left)" when overrideDaysRemaining = 142', () => {
    mockSub = { ...defaultSub, overrideDaysRemaining: 142 }
    const { container } = render(<SubscriptionBadge />)
    expect(container.textContent).toBe('Beta (142d left)')
  })

  it('shows "Beta (0d left)" when overrideDaysRemaining = 0', () => {
    mockSub = { ...defaultSub, overrideDaysRemaining: 0 }
    const { container } = render(<SubscriptionBadge />)
    expect(container.textContent).toBe('Beta (0d left)')
  })

  it('shows "Beta (1d left)" when overrideDaysRemaining = 1', () => {
    mockSub = { ...defaultSub, overrideDaysRemaining: 1 }
    const { container } = render(<SubscriptionBadge />)
    expect(container.textContent).toBe('Beta (1d left)')
  })
})
