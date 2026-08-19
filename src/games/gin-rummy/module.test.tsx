import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameServices } from '../../teahouse/types.ts'
import { clearAllTeahouseStorage } from '../../teahouse/storage.ts'
import { GinRummyView } from './module.tsx'

function services(): GameServices {
  const preferences: Record<string, unknown> = {}
  return {
    lanyinAvailable: () => false,
    lanyinRemark: vi.fn(),
    playMode: () => 'classic',
    beginAgentGame: async () => false,
    chooseAgentAction: async () => null,
    endAgentGame: async () => undefined,
    saveState: vi.fn(),
    loadState: () => null,
    taskNotice: () => null,
    clearTaskNotice: vi.fn(),
    getPreference: (key) => preferences[key],
    setPreferences: (patch) => Object.assign(preferences, patch),
    reportMatchResult: vi.fn(),
  }
}

afterEach(() => {
  clearAllTeahouseStorage()
  document.body.replaceChildren()
})

describe('embedded Gin Rummy surface', () => {
  it('mounts its complete visual system inside the teahouse game slot', () => {
    const { container } = render(<GinRummyView services={services()} />)
    const root = container.querySelector('.dwc-root')
    const styles = container.querySelector<HTMLStyleElement>('#dsh-whale-cards-styles')

    expect(root).not.toBeNull()
    expect(styles?.textContent).toContain('.dwc-table__stage')
    expect(screen.getByRole('button', { name: '入座开牌' })).not.toBeNull()
  })
})
