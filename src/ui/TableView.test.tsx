import { cleanup, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMatch, drawCard } from '../game/engine.ts'
import { card } from '../game/test-helpers.ts'
import type { MatchState } from '../game/types.ts'
import { TableView } from './TableView.tsx'

afterEach(cleanup)

function renderTable(match: MatchState, aiThinking = false) {
  return render(
    <TableView
      match={match}
      selectedCardId={null}
      aiThinking={aiThinking}
      dialogue="慢慢想，不着急。"
      rapport={12}
      artUrl="lanyin.jpg"
      onSelectCard={vi.fn()}
      onDraw={vi.fn()}
      onDiscard={vi.fn()}
      onPassWall={vi.fn()}
      onChat={vi.fn()}
    />,
  )
}

describe('public table information', () => {
  it('does not claim Lanyin drew an unseen card before she has acted', () => {
    const cue = renderTable(createMatch(20260818)).getByRole('region', { name: '澜音公开迹象' })

    expect(cue.textContent).toContain('她还没有公开拿牌迹象')
    expect(cue.textContent).not.toContain('她只摸过暗牌')
  })

  it('raises only a public late-stock warning when the visible pile is thin', () => {
    const base = createMatch(20260818)
    const lateTable: MatchState = { ...base, stock: base.stock.slice(0, 10) }
    const cue = renderTable(lateTable).getByRole('region', { name: '澜音公开迹象' })

    expect(cue.getAttribute('data-pressure')).toBe('medium')
    expect(cue.textContent).toContain('牌堆已经变薄')
  })

  it('announces Lanyin’s visible draw and discard stages separately', () => {
    const base = createMatch(20260818)
    const drawTurn: MatchState = { ...base, turn: 'lanyin' }
    const drawing = renderTable(drawTurn, true)

    expect(drawing.getByText('澜音正在摸牌…')).toBeTruthy()
    drawing.unmount()

    const discardTurn = drawCard(drawTurn, 'lanyin', 'stock')
    const discarding = renderTable(discardTurn, true)

    expect(discarding.getByText('澜音正在挑选弃牌…')).toBeTruthy()
    expect(discarding.getByLabelText('澜音有 11 张手牌')).toBeTruthy()
  })

  it('shows the recent public draw and discard actions without inventing a stock card', () => {
    const base = createMatch(20260818)
    const match: MatchState = {
      ...base,
      history: [
        { at: 1, player: 'human', type: 'deal' },
        { at: 2, player: 'lanyin', type: 'draw_stock' },
        { at: 3, player: 'lanyin', type: 'discard', card: card('Kh') },
        { at: 4, player: 'human', type: 'take_discard', card: card('Kh') },
      ],
    }

    const view = renderTable(match)
    const rail = view.getByRole('region', { name: '最近公开行动' })

    expect(within(rail).getByText('澜音摸了一张暗牌')).toBeTruthy()
    expect(within(rail).getByText('澜音弃出 K♥')).toBeTruthy()
    expect(within(rail).getByText('你拿走明牌 K♥')).toBeTruthy()
    expect(rail.textContent).not.toContain('澜音摸到')
  })

  it('shows only face-up cards that are still publicly known in Lanyin’s hand', () => {
    const base = createMatch(20260818)
    const match: MatchState = {
      ...base,
      history: [
        { at: 1, player: 'human', type: 'deal' },
        { at: 2, player: 'lanyin', type: 'take_discard', card: card('7h') },
        { at: 3, player: 'lanyin', type: 'take_discard', card: card('9d') },
        { at: 4, player: 'lanyin', type: 'discard', card: card('7h') },
      ],
    }

    const view = renderTable(match)
    const known = view.getByRole('region', { name: '澜音已知明牌' })

    expect(within(known).getByLabelText('方片9')).toBeTruthy()
    expect(within(known).queryByLabelText('红桃7')).toBeNull()
    expect(known.getAttribute('data-known-count')).toBe('1')
  })

  it('clears known face-up cards when a new hand is dealt', () => {
    const base = createMatch(20260818)
    const match: MatchState = {
      ...base,
      history: [
        { at: 1, player: 'human', type: 'deal' },
        { at: 2, player: 'lanyin', type: 'take_discard', card: card('7h') },
        { at: 3, player: 'lanyin', type: 'discard', card: card('Kc') },
        { at: 4, player: 'lanyin', type: 'deal' },
      ],
    }

    const view = renderTable(match)
    const known = view.getByRole('region', { name: '澜音已知明牌' })

    expect(known.getAttribute('data-known-count')).toBe('0')
    expect(within(known).queryByLabelText('红桃7')).toBeNull()
  })

  it('starts a fresh recent-action rail when a new hand is dealt', () => {
    const base = createMatch(20260818)
    const match: MatchState = {
      ...base,
      history: [
        { at: 1, player: 'human', type: 'deal' },
        { at: 2, player: 'lanyin', type: 'take_discard', card: card('7h') },
        { at: 3, player: 'lanyin', type: 'discard', card: card('Kc') },
        { at: 4, player: 'lanyin', type: 'deal' },
      ],
    }

    const rail = renderTable(match).getByRole('region', { name: '最近公开行动' })

    expect(rail.textContent).not.toContain('7♥')
    expect(rail.textContent).not.toContain('K♣')
  })

  it('keeps the public pressure cue identical when only hidden cards change', () => {
    const base = createMatch(20260818)
    const history: MatchState['history'] = [
      { at: 1, player: 'human', type: 'deal' },
      { at: 2, player: 'lanyin', type: 'take_discard', card: card('7h') },
      { at: 3, player: 'lanyin', type: 'discard', card: card('Kc') },
      { at: 4, player: 'lanyin', type: 'take_discard', card: card('9h') },
    ]
    const readyHand = ['3c', '4c', '5c', '7d', '7s', '7c', '10h', 'Jh', 'Qh', 'Kh'].map(card)
    const scatteredHand = ['Ac', '4d', '8h', 'Ks', '2h', '6s', '10c', '3d', '9s', 'Qd'].map(card)

    const first = renderTable({
      ...base,
      history,
      hands: { ...base.hands, lanyin: readyHand },
    })
    const firstCue = first.getByRole('region', { name: '澜音公开迹象' })
    const firstText = firstCue.textContent
    const firstPressure = firstCue.getAttribute('data-pressure')
    first.unmount()

    const second = renderTable({
      ...base,
      history,
      hands: { ...base.hands, lanyin: scatteredHand },
      stock: [...base.stock].reverse(),
    })
    const secondCue = second.getByRole('region', { name: '澜音公开迹象' })

    expect(firstPressure).toBe('high')
    expect(secondCue.getAttribute('data-pressure')).toBe(firstPressure)
    expect(secondCue.textContent).toBe(firstText)
    expect(secondCue.textContent).toContain('只根据公开信息')
  })
})
