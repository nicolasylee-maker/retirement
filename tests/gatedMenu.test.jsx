// @vitest-environment jsdom
/**
 * Gated menu tests — verifies that the 3-dot menu uses GatedButton for
 * creation actions (New Plan, Duplicate Plan, Import) while leaving
 * non-creation actions as regular buttons.
 *
 * Tests the menu markup directly by rendering a minimal reproduction of
 * the 3-dot menu from App.jsx, with the same GatedButton wrapping pattern.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React, { useState, useRef } from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// ─── Mocks ──────────────────────────────────────────────────────────────────

let mockIsPaid = false
vi.mock('../src/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPaid: mockIsPaid }),
}))

vi.mock('../src/components/UpgradePrompt', () => ({
  default: ({ featureName }) => <div data-testid="upgrade-prompt">Upgrade: {featureName}</div>,
}))

const { GatedButton } = await import('../src/components/GatedButton')

// ─── Test menu component ────────────────────────────────────────────────────

/**
 * Minimal reproduction of the App.jsx 3-dot menu to test GatedButton wiring.
 * This mirrors the exact JSX pattern used in App.jsx.
 */
function TestMenu({ onStartNew, onDuplicate, onImport, onExport, onEdit, onRename, onDelete }) {
  const importInputRef = useRef(null)

  return (
    <div data-testid="menu">
      <button onClick={onEdit} className="menu-item">Edit Plan</button>
      <GatedButton featureName="Multiple Plans" onClick={onStartNew} className="menu-item w-full text-left">New Plan</GatedButton>
      <button onClick={onRename} className="menu-item">Rename Plan</button>
      <GatedButton featureName="Multiple Plans" onClick={onDuplicate} className="menu-item w-full text-left">Duplicate Plan</GatedButton>
      <button onClick={onExport} className="menu-item">Export</button>
      <GatedButton featureName="Multiple Plans" onClick={() => importInputRef.current?.click()} className="menu-item w-full text-left">Import</GatedButton>
      <button onClick={onDelete} className="menu-item text-red-600">Delete Plan</button>
      <input ref={importInputRef} type="file" data-testid="import-input" style={{ display: 'none' }} onChange={onImport} />
    </div>
  )
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockIsPaid = false
})

afterEach(() => {
  cleanup()
})

// ═══════════════════════════════════════════════════════════════════════════
// A. Free-tier tests (isPaid=false)
// ═══════════════════════════════════════════════════════════════════════════

describe('free-tier menu gating', () => {
  // Test 1
  it('"New Plan" renders with GatedButton opacity styling', () => {
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    const btn = screen.getByRole('button', { name: 'New Plan' })
    expect(btn.className).toContain('opacity-50')
  })

  // Test 2
  it('clicking "New Plan" opens UpgradePrompt modal, not calling the handler', () => {
    const onStartNew = vi.fn()
    render(<TestMenu onStartNew={onStartNew} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'New Plan' }))

    expect(onStartNew).not.toHaveBeenCalled()
    expect(screen.getByTestId('upgrade-prompt')).toBeTruthy()
  })

  // Test 3
  it('clicking "Duplicate Plan" opens UpgradePrompt modal', () => {
    const onDuplicate = vi.fn()
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={onDuplicate} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Plan' }))

    expect(onDuplicate).not.toHaveBeenCalled()
    expect(screen.getByTestId('upgrade-prompt')).toBeTruthy()
  })

  // Test 4
  it('clicking "Import" opens UpgradePrompt modal', () => {
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(screen.getByTestId('upgrade-prompt')).toBeTruthy()
  })

  // Test 5
  it('"Export" is NOT gated — fires handler directly', () => {
    const onExport = vi.fn()
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={onExport} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  // Test 6
  it('"Edit Plan" is NOT gated — fires handler directly', () => {
    const onEdit = vi.fn()
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={onEdit} onRename={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit Plan' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  // Test 7
  it('"Rename Plan" is NOT gated — fires handler directly', () => {
    const onRename = vi.fn()
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={onRename} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Rename Plan' }))
    expect(onRename).toHaveBeenCalledOnce()
  })

  // Test 8
  it('"Delete Plan" is NOT gated — fires handler directly', () => {
    const onDelete = vi.fn()
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Plan' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// B. Paid/trialing tests (isPaid=true)
// ═══════════════════════════════════════════════════════════════════════════

describe('paid-tier menu (no gating)', () => {
  beforeEach(() => {
    mockIsPaid = true
  })

  // Test 9
  it('"New Plan" calls handler directly (no upgrade prompt)', () => {
    const onStartNew = vi.fn()
    render(<TestMenu onStartNew={onStartNew} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    const btn = screen.getByRole('button', { name: 'New Plan' })
    expect(btn.className).not.toContain('opacity-50')

    fireEvent.click(btn)
    expect(onStartNew).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('upgrade-prompt')).toBeNull()
  })

  // Test 10
  it('"Duplicate Plan" calls handler directly', () => {
    const onDuplicate = vi.fn()
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={onDuplicate} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Plan' }))
    expect(onDuplicate).toHaveBeenCalledOnce()
  })

  // Test 11
  it('"Import" triggers file input (no gating)', () => {
    render(<TestMenu onStartNew={vi.fn()} onDuplicate={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onEdit={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)

    const clickSpy = vi.fn()
    const input = screen.getByTestId('import-input')
    input.click = clickSpy

    fireEvent.click(screen.getByRole('button', { name: 'Import' }))
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('upgrade-prompt')).toBeNull()
  })
})
