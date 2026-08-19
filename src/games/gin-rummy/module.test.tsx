import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameServices } from '../../teahouse/types.ts'
import { clearAllTeahouseStorage, loadSlot, saveSlot } from '../../teahouse/storage.ts'
import { createMatch, discardCard, drawCard } from '../../game/engine.ts'
import type { MatchState } from '../../game/types.ts'
import { GinRummyView } from './module.tsx'

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

describe('embedded Gin Rummy surface', () => {
  it('mounts its complete visual system inside the teahouse game slot', () => {
    const { container } = render(<GinRummyView services={services()} />)
    const root = container.querySelector('.dwc-root')
    const styles = container.querySelector<HTMLStyleElement>('#dsh-whale-cards-styles')

    expect(root).not.toBeNull()
    expect(styles?.textContent).toContain('.dwc-table__stage')
    expect(screen.getByRole('button', { name: '入座开牌' })).not.toBeNull()
  })

  it('does not restart the same Agent draw decision when service identity changes mid-turn', async () => {
    vi.useFakeTimers()
    type AgentInput = Parameters<GameServices['chooseAgentAction']>[0]
    type AgentResult = Awaited<ReturnType<GameServices['chooseAgentAction']>>
    const pending: Array<{ input: AgentInput; resolve: (value: AgentResult) => void }> = []
    const chooseAgentAction = vi.fn((input: AgentInput) => new Promise<AgentResult>((resolve) => {
      pending.push({ input, resolve })
    }))
    const makeServices = (): GameServices => services({
      playMode: () => 'agent',
      beginAgentGame: async () => true,
      chooseAgentAction,
      getPreference: () => ({ fastAi: true, muted: true }),
    })
    const afterDraw = drawCard(createMatch(42), 'human', 'stock')
    const aiTurn = discardCard(afterDraw, 'human', afterDraw.drawnCardId as string, 'discard')
    saveSlot('gin-rummy', aiTurn)

    try {
      const view = render(<GinRummyView services={makeServices()} />)
      await act(async () => { await vi.advanceTimersByTimeAsync(120) })
      expect(pending.filter(({ input }) => input.legalActions.some((action) => action.id === 'draw:stock'))).toHaveLength(1)

      view.rerender(<GinRummyView services={makeServices()} />)
      await act(async () => { await vi.advanceTimersByTimeAsync(120) })

      expect(pending.filter(({ input }) => input.legalActions.some((action) => action.id === 'draw:stock'))).toHaveLength(1)

      await act(async () => {
        pending[0]?.resolve({ actionId: 'draw:stock', line: '摸暗牌。', intent: 'fair' })
        await Promise.resolve()
      })
      const discardAction = pending[1]?.input.legalActions.find((action) => action.id.startsWith('discard:'))
      expect(discardAction).toBeDefined()
      await act(async () => {
        pending[1]?.resolve({ actionId: discardAction?.id ?? '', line: '这张留不住。', intent: 'fair' })
        await Promise.resolve()
        await Promise.resolve()
      })

      const committed = loadSlot('gin-rummy') as MatchState
      expect(chooseAgentAction).toHaveBeenCalledTimes(2)
      expect(committed.stock).toHaveLength(aiTurn.stock.length - 1)
      expect(committed.turn).toBe('human')
      expect(committed.phase).toBe('draw')
    } finally {
      vi.useRealTimers()
    }
  })
})
