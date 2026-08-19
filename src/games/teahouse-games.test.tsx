import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HarborClashView } from './harbor-clash/module.tsx'
import { HarborPairsView } from './harbor-pairs/module.tsx'
import { clearAllTeahouseStorage } from '../teahouse/storage.ts'
import type { GameServices } from '../teahouse/types.ts'

function services(overrides: Partial<GameServices> = {}): GameServices {
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
    ...overrides,
  }
}

afterEach(() => {
  clearAllTeahouseStorage()
  document.body.replaceChildren()
})

describe('teahouse game surfaces', () => {
  it('mounts Tide Relics from intro into a complete decision table', () => {
    const { container } = render(<HarborPairsView services={services()} />)
    fireEvent.click(screen.getByRole('button', { name: '开始潜航' }))
    expect(container.querySelector('.dth-tide-layout')).not.toBeNull()
    expect(screen.getByRole('button', { name: '继续下潜' })).not.toBeNull()
  })

  it('starts one Tide Relics Agent session when Agent mode is selected', () => {
    const beginAgentGame = vi.fn(async (_input: Parameters<GameServices['beginAgentGame']>[0]) => true)
    const gameServices = services({ playMode: () => 'agent', beginAgentGame })
    render(<HarborPairsView services={gameServices} />)

    fireEvent.click(screen.getByRole('button', { name: '开始潜航' }))
    expect(beginAgentGame).toHaveBeenCalledOnce()
    expect(beginAgentGame.mock.calls[0]?.[0]).toMatchObject({ gameId: 'harbor-pairs', gameTitle: '潮汐拾光' })
  })

  it('mounts Harbor Clash with three interactive lanes and a hand', () => {
    const { container } = render(<HarborClashView services={services()} />)
    fireEvent.click(screen.getByRole('button', { name: '点亮信号塔' }))
    expect(container.querySelectorAll('.dth-lane')).toHaveLength(3)
    expect(container.querySelectorAll('.dth-clash-hand .dth-signal-card').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '确认部署' })).not.toBeNull()
  })
})
