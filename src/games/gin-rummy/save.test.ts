import { describe, expect, it } from 'vitest'
import { createMatch, drawCard } from '../../game/engine.ts'
import { DEFAULT_APP_STATE } from '../../game/persistence.ts'
import type { MatchState } from '../../game/types.ts'
import {
  DEFAULT_GIN_GAME_SAVE,
  appStateToGinGameSave,
  ginGameSaveToAppState,
  parseGinGameSave,
} from './save.ts'

describe('gin game save', () => {
  it('round-trips a save with an in-progress match', () => {
    const match = drawCard(createMatch(20260818), 'human', 'stock')
    const save = {
      version: 1 as const,
      match,
      preferences: { ...DEFAULT_APP_STATE.preferences, muted: true },
      stats: { ...DEFAULT_APP_STATE.stats, handsPlayed: 2 },
      countedMatchSeed: 7,
    }
    expect(parseGinGameSave(save)).toEqual(save)
  })

  it('rejects non-objects, wrong versions, and non-record payloads', () => {
    expect(parseGinGameSave(null)).toBeNull()
    expect(parseGinGameSave('junk')).toBeNull()
    expect(parseGinGameSave(42)).toBeNull()
    expect(parseGinGameSave({ version: 2 })).toBeNull()
    expect(parseGinGameSave({ version: 1, match: 'not-a-match' })).toEqual(DEFAULT_GIN_GAME_SAVE)
  })

  it('drops an invalid match while preserving preferences and stats', () => {
    const parsed = parseGinGameSave({
      version: 1,
      match: { version: 1, phase: 'draw', turn: 'human', stock: [], discard: [], hands: {} },
      preferences: { dialogue: 'quiet', difficulty: 'sharp', fastAi: true, muted: true, tutorialSeen: true },
      stats: { handsPlayed: 9, matchesPlayed: 2, matchesWon: 1, rapport: 40 },
    })
    expect(parsed?.match).toBeNull()
    expect(parsed?.preferences).toMatchObject({ dialogue: 'quiet', difficulty: 'sharp' })
    expect(parsed?.stats).toMatchObject({ handsPlayed: 9 })
  })

  it('maps between the game save and the controller app state without panelOpen', () => {
    const match: MatchState = createMatch(314159)
    const save = {
      ...DEFAULT_GIN_GAME_SAVE,
      match,
      countedMatchSeed: 11,
    }

    const app = ginGameSaveToAppState(save)
    expect(app.panelOpen).toBe(false)
    expect(app.match).toBe(match)
    expect(app.countedMatchSeed).toBe(11)

    const back = appStateToGinGameSave(app)
    expect(back).toEqual(save)
    expect('panelOpen' in back).toBe(false)
  })
})
