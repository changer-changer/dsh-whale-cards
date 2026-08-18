import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHELL_STATE,
  HALL_ROUTE,
  SHELL_STORAGE_KEY,
  loadShellState,
  parseShellState,
  saveShellState,
  shellReducer,
  type ShellStorageLike,
} from './shell-persistence.ts'

function memoryStorage(): ShellStorageLike & { readonly map: Map<string, string> } {
  const map = new Map<string, string>()
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

describe('shellReducer', () => {
  it('opens the panel without changing the current route', () => {
    const next = shellReducer(DEFAULT_SHELL_STATE, { type: 'open-panel' })
    expect(next.panelOpen).toBe(true)
    expect(next.route).toEqual(HALL_ROUTE)
  })

  it('collapses the panel without touching the route', () => {
    const open = { ...DEFAULT_SHELL_STATE, panelOpen: true, route: { kind: 'game' as const, gameId: 'gin-rummy' } }
    const next = shellReducer(open, { type: 'close-panel' })
    expect(next.panelOpen).toBe(false)
    expect(next.route).toEqual({ kind: 'game', gameId: 'gin-rummy' })
  })

  it('enters a game and records the last played id', () => {
    const next = shellReducer(DEFAULT_SHELL_STATE, { type: 'open-game', gameId: 'gin-rummy' })
    expect(next.panelOpen).toBe(true)
    expect(next.route).toEqual({ kind: 'game', gameId: 'gin-rummy' })
    expect(next.lastPlayedGameId).toBe('gin-rummy')
  })

  it('returns to the hall from a game without clearing last played', () => {
    const inGame = shellReducer(DEFAULT_SHELL_STATE, { type: 'open-game', gameId: 'gin-rummy' })
    const hall = shellReducer(inGame, { type: 'return-to-hall' })
    expect(hall.route).toEqual(HALL_ROUTE)
    expect(hall.lastPlayedGameId).toBe('gin-rummy')
    expect(hall.panelOpen).toBe(true)
  })

  it('preserves the route across a collapse-and-reopen cycle', () => {
    const inGame = shellReducer(DEFAULT_SHELL_STATE, { type: 'open-game', gameId: 'gin-rummy' })
    const collapsed = shellReducer(inGame, { type: 'close-panel' })
    const reopened = shellReducer(collapsed, { type: 'open-panel' })
    expect(reopened.panelOpen).toBe(true)
    expect(reopened.route).toEqual({ kind: 'game', gameId: 'gin-rummy' })
  })
})

describe('parseShellState', () => {
  it('round-trips a fully populated state', () => {
    const state = {
      version: 1 as const,
      panelOpen: true,
      route: { kind: 'game' as const, gameId: 'gin-rummy' },
      lastPlayedGameId: 'gin-rummy',
    }
    expect(parseShellState(state)).toEqual(state)
  })

  it('accepts a hall route without lastPlayedGameId', () => {
    const parsed = parseShellState({ version: 1, panelOpen: false, route: { kind: 'hall' } })
    expect(parsed).toEqual({ version: 1, panelOpen: false, route: HALL_ROUTE })
  })

  it('rejects unknown versions and malformed routes', () => {
    expect(parseShellState({ version: 2, panelOpen: true, route: { kind: 'hall' } })).toBeNull()
    expect(parseShellState({ version: 1, panelOpen: true, route: { kind: 'unknown' } })).toBeNull()
    expect(parseShellState({ version: 1, panelOpen: true, route: { kind: 'game' } })).toBeNull()
    expect(parseShellState({ version: 1, panelOpen: 'yes', route: { kind: 'hall' } })).toBeNull()
    expect(parseShellState(null)).toBeNull()
    expect(parseShellState('junk')).toBeNull()
  })
})

describe('shell persistence', () => {
  it('saves and loads the shell state under the dedicated shell key', () => {
    const storage = memoryStorage()
    const state = shellReducer(DEFAULT_SHELL_STATE, { type: 'open-game', gameId: 'gin-rummy' })
    saveShellState(state, storage)
    expect(storage.map.has(SHELL_STORAGE_KEY)).toBe(true)
    expect(loadShellState(storage)).toEqual(state)
  })

  it('returns the safe default when the stored payload is corrupt', () => {
    const storage = memoryStorage()
    storage.map.set(SHELL_STORAGE_KEY, '{ not valid json')
    expect(loadShellState(storage)).toEqual(DEFAULT_SHELL_STATE)
  })

  it('returns the safe default when the version drifts', () => {
    const storage = memoryStorage()
    storage.map.set(SHELL_STORAGE_KEY, JSON.stringify({ version: 99, panelOpen: true, route: { kind: 'hall' } }))
    expect(loadShellState(storage)).toEqual(DEFAULT_SHELL_STATE)
  })

  it('survives a storage adapter that throws on read or write', () => {
    const throwing: ShellStorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(loadShellState(throwing)).toEqual(DEFAULT_SHELL_STATE)
    expect(() => saveShellState(DEFAULT_SHELL_STATE, throwing)).not.toThrow()
  })

  it('degrades to defaults when storage is unavailable entirely', () => {
    expect(loadShellState(null)).toEqual(DEFAULT_SHELL_STATE)
    expect(() => saveShellState(DEFAULT_SHELL_STATE, null)).not.toThrow()
  })
})
