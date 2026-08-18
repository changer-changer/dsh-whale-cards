import { describe, expect, it } from 'vitest'
import { createMatch, discardCard, drawCard } from './engine.ts'
import {
  DEFAULT_APP_STATE,
  STORAGE_KEY,
  loadAppState,
  parseSavedAppState,
  saveAppState,
} from './persistence.ts'

describe('versioned local persistence', () => {
  it('round-trips an in-progress decision point exactly', () => {
    const match = drawCard(createMatch(314159), 'human', 'stock')
    const memory = new Map<string, string>()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value) },
    }
    const value = { ...DEFAULT_APP_STATE, match, panelOpen: true }
    saveAppState(value, storage)
    expect(loadAppState(storage)).toEqual(value)
    expect(memory.has(STORAGE_KEY)).toBe(true)
  })

  it('round-trips the state after a completed player turn', () => {
    const drawn = drawCard(createMatch(271828), 'human', 'stock')
    const match = discardCard(drawn, 'human', drawn.hands.human[0]?.id ?? '')
    expect(parseSavedAppState(JSON.stringify({ ...DEFAULT_APP_STATE, match })).match).toEqual(match)
  })

  it('fails closed on malformed, stale, or duplicate-card saves', () => {
    expect(parseSavedAppState('{broken')).toEqual(DEFAULT_APP_STATE)
    expect(parseSavedAppState(JSON.stringify({ version: 9 }))).toEqual(DEFAULT_APP_STATE)
    const match = createMatch(1)
    const duplicate = {
      ...match,
      stock: [match.hands.human[0], ...match.stock.slice(1)],
    }
    expect(parseSavedAppState(JSON.stringify({ ...DEFAULT_APP_STATE, match: duplicate })).match).toBeNull()
  })
})

