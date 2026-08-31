// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'

// This suite's own test file has no global RTL auto-cleanup configured
// (tests/setup.ts only wires up jest-dom matchers), so each render()
// accumulates in the jsdom document unless torn down explicitly here.
afterEach(cleanup)

describe('WhatsAppButton', () => {
  it('renders nothing when no number is configured', () => {
    const { container } = render(<WhatsAppButton number="" message="Hi!" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('builds a wa.me link from the number with the message URL-encoded', () => {
    render(<WhatsAppButton number="17145550100" message="Hi SuyaBuzz! I'd like to pre-order." />)
    const link = screen.getByRole('link', { name: 'Chat with SuyaBuzz on WhatsApp' })
    expect(link).toHaveAttribute(
      'href',
      "https://wa.me/17145550100?text=Hi%20SuyaBuzz!%20I'd%20like%20to%20pre-order.",
    )
  })

  it('opens in a new tab safely and marks the icon decorative', () => {
    render(<WhatsAppButton number="17145550100" message="Hi!" />)
    const link = screen.getByRole('link', { name: 'Chat with SuyaBuzz on WhatsApp' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
