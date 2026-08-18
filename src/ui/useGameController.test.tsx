import { act } from 'react'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatch, discardCard, drawCard } from '../game/engine.ts'
import { DEFAULT_APP_STATE, loadAppState, saveAppState } from '../game/persistence.ts'
import type { MatchState, PublicAction } from '../game/types.ts'
import { useGameController } from './useGameController.ts'

function lanyinDrawTurn(): MatchState {
  const match = createMatch(20260818)
  const afterDraw = drawCard(match, 'human', 'stock')
  return discardCard(afterDraw, 'human', afterDraw.drawnCardId as string)
}

function saveOpenMatch(match: MatchState): void {
  saveAppState({
    ...DEFAULT_APP_STATE,
    match,
    panelOpen: true,
    preferences: {
      ...DEFAULT_APP_STATE.preferences,
      muted: true,
    },
  })
}

function actionsAdded(
  before: MatchState,
  after: MatchState,
): readonly PublicAction[] {
  return after.history.slice(before.history.length)
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('Lanyin turn staging', () => {
  it('shows a separate 11-card draw step before Lanyin discards back to 10', () => {
    const before = lanyinDrawTurn()
    saveOpenMatch(before)
    const { result } = renderHook(() => useGameController(undefined))

    expect(result.current.app.match?.phase).toBe('draw')
    expect(result.current.app.match?.hands.lanyin).toHaveLength(10)

    act(() => vi.advanceTimersByTime(560))

    const afterDraw = result.current.app.match as MatchState
    expect(afterDraw.turn).toBe('lanyin')
    expect(afterDraw.phase).toBe('discard')
    expect(afterDraw.hands.lanyin).toHaveLength(11)
    expect(actionsAdded(before, afterDraw)).toHaveLength(1)
    expect(['draw_stock', 'take_discard']).toContain(actionsAdded(before, afterDraw)[0]?.type)

    act(() => vi.advanceTimersByTime(419))

    expect(result.current.app.match?.phase).toBe('discard')
    expect(result.current.app.match?.hands.lanyin).toHaveLength(11)

    act(() => vi.advanceTimersByTime(1))

    const afterDiscard = result.current.app.match as MatchState
    expect(afterDiscard.hands.lanyin).toHaveLength(10)
    expect(actionsAdded(before, afterDiscard)).toHaveLength(2)
    expect(['discard', 'knock', 'gin']).toContain(actionsAdded(before, afterDiscard)[1]?.type)
  })

  it('pauses an 11-card turn in the background and resumes without drawing twice', () => {
    const before = lanyinDrawTurn()
    saveOpenMatch(before)
    const { result } = renderHook(() => useGameController(undefined))

    act(() => vi.advanceTimersByTime(560))
    const paused = result.current.app.match as MatchState
    expect(paused.phase).toBe('discard')
    expect(paused.hands.lanyin).toHaveLength(11)

    setVisibility('hidden')
    act(() => vi.advanceTimersByTime(2_000))

    expect(result.current.app.match?.phase).toBe('discard')
    expect(result.current.app.match?.hands.lanyin).toHaveLength(11)
    expect(actionsAdded(before, result.current.app.match as MatchState)).toHaveLength(1)

    setVisibility('visible')
    act(() => vi.advanceTimersByTime(420))

    const resumed = result.current.app.match as MatchState
    expect(resumed.hands.lanyin).toHaveLength(10)
    expect(actionsAdded(before, resumed).map((action) => action.type).filter(
      (type) => type === 'draw_stock' || type === 'take_discard',
    )).toHaveLength(1)
  })

  it('continues a saved 11-card discard step without drawing another card', () => {
    const before = lanyinDrawTurn()
    const savedDiscard = drawCard(before, 'lanyin', 'stock')
    saveOpenMatch(savedDiscard)
    const { result } = renderHook(() => useGameController(undefined))

    expect(result.current.app.match?.phase).toBe('discard')
    expect(result.current.app.match?.hands.lanyin).toHaveLength(11)
    act(() => vi.advanceTimersByTime(420))

    const resumed = result.current.app.match as MatchState
    expect(resumed.hands.lanyin).toHaveLength(10)
    expect(actionsAdded(before, resumed).map((action) => action.type).filter(
      (type) => type === 'draw_stock' || type === 'take_discard',
    )).toHaveLength(1)
  })

  it('cancels the pending discard when the controller unmounts', () => {
    const before = lanyinDrawTurn()
    saveOpenMatch(before)
    const { result, unmount } = renderHook(() => useGameController(undefined))

    act(() => vi.advanceTimersByTime(560))
    expect(result.current.app.match?.phase).toBe('discard')
    unmount()
    act(() => vi.advanceTimersByTime(2_000))

    const persisted = loadAppState().match as MatchState
    expect(persisted.phase).toBe('discard')
    expect(persisted.hands.lanyin).toHaveLength(11)
    expect(actionsAdded(before, persisted)).toHaveLength(1)
  })
})
