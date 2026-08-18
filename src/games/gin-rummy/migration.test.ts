import { describe, expect, it } from 'vitest'
import { gameStorageKey, type StorageLike } from '../../breakroom/game-storage.ts'
import { SHELL_STORAGE_KEY } from '../../breakroom/shell-persistence.ts'
import { playAiTurn } from '../../game/ai.ts'
import {
  canKnockWithUpcard,
  createMatch,
  discardCard,
  drawCard,
  legalKnockDiscards,
  passAtWall,
  startNextHand,
} from '../../game/engine.ts'
import { DEFAULT_APP_STATE, STORAGE_KEY as LEGACY_STORAGE_KEY } from '../../game/persistence.ts'
import type { MatchState } from '../../game/types.ts'
import { GIN_GAME_ID, migrateGinSave } from './migration.ts'

function memoryStorage(map = new Map<string, string>()): StorageLike & { readonly map: Map<string, string> } {
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

function seedLegacy(storage: StorageLike, match: MatchState | null, panelOpen = true): void {
  storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
    ...DEFAULT_APP_STATE,
    match,
    panelOpen,
    preferences: { ...DEFAULT_APP_STATE.preferences, muted: true, tutorialSeen: true },
    stats: { ...DEFAULT_APP_STATE.stats, handsPlayed: 3, matchesPlayed: 1, matchesWon: 1, rapport: 5 },
    countedMatchSeed: 42,
  }))
}

function readGame(storage: StorageLike): unknown {
  const raw = storage.getItem(gameStorageKey(GIN_GAME_ID))
  return raw === null ? null : JSON.parse(raw)
}

function readShell(storage: StorageLike): unknown {
  const raw = storage.getItem(SHELL_STORAGE_KEY)
  return raw === null ? null : JSON.parse(raw)
}

function playHumanTurn(state: MatchState): MatchState {
  if (state.stock.length <= 2 && !canKnockWithUpcard(state, 'human')) {
    return passAtWall(state, 'human')
  }
  const source = state.stock.length <= 2 ? 'discard' : 'stock'
  const afterDraw = drawCard(state, 'human', source)
  const forbidden = afterDraw.drawSource === 'discard' ? afterDraw.drawnCardId : undefined
  const knock = legalKnockDiscards(afterDraw.hands.human, afterDraw.rules, forbidden)[0]
  if (knock !== undefined) return discardCard(afterDraw, 'human', knock.id, 'knock')
  const ordinary = afterDraw.hands.human.find((card) => card.id !== forbidden)
  if (ordinary === undefined) throw new Error('no legal human discard')
  return discardCard(afterDraw, 'human', ordinary.id)
}

function playToPhase(seed: number, target: 'reveal' | 'match_over'): MatchState {
  let state = createMatch(seed)
  for (let step = 0; step < 512; step += 1) {
    if (state.phase === target) return state
    if (state.phase === 'match_over') throw new Error(`overshot ${target} at round ${state.round}`)
    if (state.phase === 'reveal') state = startNextHand(state)
    else if (state.phase === 'draw') state = state.turn === 'human' ? playHumanTurn(state) : playAiTurn(state, 'steady')
    else throw new Error(`unresolved discard phase at step ${step}`)
  }
  throw new Error(`never reached ${target}`)
}

describe('gin save migration', () => {
  it('migrates a valid unfinished hand into the game key and seeds the shell', () => {
    const storage = memoryStorage()
    const match = createMatch(20260818)
    seedLegacy(storage, match)

    const result = migrateGinSave(storage)

    expect(result).toEqual({ migrated: true })
    expect((readGame(storage) as { match: MatchState }).match).toEqual(match)
    expect(readShell(storage)).toEqual({
      version: 1,
      panelOpen: true,
      route: { kind: 'game', gameId: GIN_GAME_ID },
      lastPlayedGameId: GIN_GAME_ID,
    })
    expect(storage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull()
  })

  it('migrates an 11-card discard-wait hand without losing the drawn card', () => {
    const storage = memoryStorage()
    const match = drawCard(createMatch(271828), 'human', 'stock')
    expect(match.phase).toBe('discard')
    expect(match.hands.human).toHaveLength(11)
    seedLegacy(storage, match)

    migrateGinSave(storage)

    const migrated = (readGame(storage) as { match: MatchState }).match
    expect(migrated.phase).toBe('discard')
    expect(migrated.hands.human).toHaveLength(11)
    expect(migrated.drawnCardId).toBe(match.drawnCardId)
  })

  it('migrates a settled reveal hand preserving the hand result', () => {
    const storage = memoryStorage()
    const match = playToPhase(7, 'reveal')
    seedLegacy(storage, match, false)

    migrateGinSave(storage)

    const migrated = (readGame(storage) as { match: MatchState }).match
    expect(migrated.phase).toBe('reveal')
    expect(migrated.handResult).toEqual(match.handResult)
    expect(readShell(storage)).toEqual(expect.objectContaining({
      panelOpen: false,
      route: { kind: 'game', gameId: GIN_GAME_ID },
    }))
  })

  it('migrates a completed match_over state with final scores intact', () => {
    const storage = memoryStorage()
    const match = playToPhase(11, 'match_over')
    seedLegacy(storage, match)

    migrateGinSave(storage)

    const migrated = (readGame(storage) as { match: MatchState }).match
    expect(migrated.phase).toBe('match_over')
    expect(migrated.scores).toEqual(match.scores)
  })

  it('carries preferences, stats and countedMatchSeed into the game save', () => {
    const storage = memoryStorage()
    seedLegacy(storage, null)

    migrateGinSave(storage)

    const game = readGame(storage) as {
      preferences: Record<string, unknown>
      stats: Record<string, unknown>
      countedMatchSeed: number
    }
    expect(game.preferences).toMatchObject({ muted: true, tutorialSeen: true })
    expect(game.stats).toMatchObject({ handsPlayed: 3, matchesPlayed: 1, matchesWon: 1, rapport: 5 })
    expect(game.countedMatchSeed).toBe(42)
    expect(readShell(storage)).toEqual(expect.objectContaining({ route: { kind: 'hall' } }))
  })

  it('is idempotent: a second run leaves both migrated keys unchanged', () => {
    const storage = memoryStorage()
    seedLegacy(storage, createMatch(314159))

    migrateGinSave(storage)
    const firstGame = storage.map.get(gameStorageKey(GIN_GAME_ID))
    const firstShell = storage.map.get(SHELL_STORAGE_KEY)

    expect(migrateGinSave(storage)).toEqual({ migrated: false })
    expect(storage.map.get(gameStorageKey(GIN_GAME_ID))).toBe(firstGame)
    expect(storage.map.get(SHELL_STORAGE_KEY)).toBe(firstShell)
  })

  it('never overwrites an existing new game key and leaves the shell untouched', () => {
    const storage = memoryStorage()
    const existing = { version: 1, match: null, preferences: DEFAULT_APP_STATE.preferences, stats: DEFAULT_APP_STATE.stats }
    storage.setItem(gameStorageKey(GIN_GAME_ID), JSON.stringify(existing))
    seedLegacy(storage, createMatch(161803))

    const result = migrateGinSave(storage)

    expect(result).toEqual({ migrated: false })
    expect(readGame(storage)).toEqual(existing)
    expect(readShell(storage)).toBeNull()
  })

  it('ignores a corrupt legacy save and leaves all new keys absent', () => {
    const storage = memoryStorage()
    storage.setItem(LEGACY_STORAGE_KEY, '{not json')

    const result = migrateGinSave(storage)

    expect(result).toEqual({ migrated: false })
    expect(storage.map.has(gameStorageKey(GIN_GAME_ID))).toBe(false)
    expect(storage.map.has(SHELL_STORAGE_KEY)).toBe(false)
  })

  it('ignores a stale (wrong-version) legacy save', () => {
    const storage = memoryStorage()
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 9, panelOpen: true }))

    expect(migrateGinSave(storage)).toEqual({ migrated: false })
    expect(storage.map.has(gameStorageKey(GIN_GAME_ID))).toBe(false)
  })

  it('writes only the gin-rummy key and leaves other games isolated', () => {
    const storage = memoryStorage()
    const otherKey = gameStorageKey('tic-tac-toe')
    storage.setItem(otherKey, JSON.stringify({ n: 5 }))
    seedLegacy(storage, createMatch(271828))

    migrateGinSave(storage)

    expect(storage.map.get(otherKey)).toBe(JSON.stringify({ n: 5 }))
    expect(storage.map.has(gameStorageKey(GIN_GAME_ID))).toBe(true)
  })

  it('does not seed the shell when it already has state', () => {
    const storage = memoryStorage()
    const existingShell = { version: 1, panelOpen: false, route: { kind: 'hall' } }
    storage.setItem(SHELL_STORAGE_KEY, JSON.stringify(existingShell))
    seedLegacy(storage, createMatch(1))

    migrateGinSave(storage)

    expect(readShell(storage)).toEqual(existingShell)
    expect(readGame(storage)).not.toBeNull()
  })

  it('survives a storage adapter that throws without propagating the error', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
      removeItem: () => {
        throw new Error('storage blocked')
      },
    }
    expect(() => migrateGinSave(throwing)).not.toThrow()
    expect(migrateGinSave(throwing)).toEqual({ migrated: false })
  })
})
