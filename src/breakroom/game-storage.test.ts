import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createGameStorage,
  gameStorageKey,
  type GameStorageFailure,
  type StorageLike,
} from './game-storage.ts'

/** A deterministic in-memory adapter backed by a shared Map for isolation tests. */
function mapStorage(map = new Map<string, string>()): { storage: StorageLike; map: Map<string, string> } {
  const storage: StorageLike = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
  return { storage, map }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('game storage: key namespace', () => {
  it('builds a versioned, per-game key', () => {
    expect(gameStorageKey('gin-rummy')).toBe('dsh-breakroom:game:gin-rummy:v1')
    expect(gameStorageKey('tic-tac-toe-2')).toBe('dsh-breakroom:game:tic-tac-toe-2:v1')
  })

  it('keeps the version suffix out of the game id segment', () => {
    expect(gameStorageKey('a')).toBe('dsh-breakroom:game:a:v1')
  })
})

describe('game storage: cross-game isolation', () => {
  it('does not leak a save from one game into another', () => {
    const { storage, map } = mapStorage()
    const rummy = createGameStorage('gin-rummy', { storage })
    const tictactoe = createGameStorage('tic-tac-toe', { storage })

    rummy.save({ hand: ['7H', '8H', '9H'] })

    expect(tictactoe.load()).toBeNull()
    expect(rummy.load()).toEqual({ hand: ['7H', '8H', '9H'] })
    expect(map.has('dsh-breakroom:game:gin-rummy:v1')).toBe(true)
    expect(map.has('dsh-breakroom:game:tic-tac-toe:v1')).toBe(false)
  })

  it('keeps two games writing independently', () => {
    const { storage } = mapStorage()
    const rummy = createGameStorage('gin-rummy', { storage })
    const tictactoe = createGameStorage('tic-tac-toe', { storage })

    rummy.save({ n: 1 })
    tictactoe.save({ n: 2 })

    expect(rummy.load()).toEqual({ n: 1 })
    expect(tictactoe.load()).toEqual({ n: 2 })
  })
})

describe('game storage: corrupt or missing data', () => {
  it('returns null when nothing has been saved', () => {
    const { storage } = mapStorage()
    expect(createGameStorage('gin-rummy', { storage }).load()).toBeNull()
  })

  it('returns null on corrupt JSON instead of throwing', () => {
    const { storage, map } = mapStorage()
    map.set('dsh-breakroom:game:gin-rummy:v1', '{not-json')
    expect(createGameStorage('gin-rummy', { storage }).load()).toBeNull()
  })

  it('returns null when the adapter read throws', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }
    expect(createGameStorage('gin-rummy', { storage: throwing }).load()).toBeNull()
  })
})

describe('game storage: unavailable localStorage falls back to in-memory', () => {
  it('still round-trips within the page when localStorage access throws', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled')
    })

    const storage = createGameStorage('gin-rummy')

    expect(() => storage.save({ hand: ['AS', 'KS'] })).not.toThrow()
    expect(storage.load()).toEqual({ hand: ['AS', 'KS'] })
    expect(spy).toHaveBeenCalled()
  })
})

describe('game storage: save serialization failure is non-fatal and noticed once', () => {
  it('does not throw and reports a serialization failure exactly once', () => {
    const { storage } = mapStorage()
    const failures: GameStorageFailure[] = []
    const game = createGameStorage('gin-rummy', {
      storage,
      onFailure: (failure) => failures.push(failure),
    })

    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(() => game.save(circular)).not.toThrow()
    expect(() => game.save(circular)).not.toThrow()

    expect(failures).toEqual([{ kind: 'serialization' }])
    expect(game.load()).toBeNull()
  })

  it('does not throw and reports a write failure exactly once', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    const failures: GameStorageFailure[] = []
    const game = createGameStorage('gin-rummy', {
      storage: failing,
      onFailure: (failure) => failures.push(failure),
    })

    expect(() => game.save({ hand: ['7H'] })).not.toThrow()
    expect(() => game.save({ hand: ['8H'] })).not.toThrow()

    expect(failures).toEqual([{ kind: 'write' }])
  })

  it('re-arms the notice after a later successful save', () => {
    const { storage } = mapStorage()
    const failures: GameStorageFailure[] = []
    const game = createGameStorage('gin-rummy', {
      storage,
      onFailure: (failure) => failures.push(failure),
    })

    const circular: Record<string, unknown> = {}
    circular.self = circular
    game.save(circular)
    game.save({ hand: ['9H'] })
    game.save(circular)

    expect(failures.map((failure) => failure.kind)).toEqual(['serialization', 'serialization'])
  })
})

describe('game storage: clear', () => {
  it('removes a saved value', () => {
    const { storage, map } = mapStorage()
    const game = createGameStorage('gin-rummy', { storage })
    game.save({ hand: ['7H'] })
    game.clear()
    expect(game.load()).toBeNull()
    expect(map.has('dsh-breakroom:game:gin-rummy:v1')).toBe(false)
  })

  it('does not throw when the adapter refuses to remove', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => createGameStorage('gin-rummy', { storage: failing }).clear()).not.toThrow()
  })
})
