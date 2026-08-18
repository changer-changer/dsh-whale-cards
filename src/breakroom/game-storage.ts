import type { GameId, GameStorage } from './game-contract.ts'

/**
 * Namespaced, per-game persistence (spec §10.1). Each game's save is isolated
 * under its own versioned key, corrupted JSON reads back as `null`, and a
 * disabled `localStorage` degrades to an in-memory store so the game stays
 * playable (spec §10.3). Save failures are non-fatal and surfaced once through
 * an optional typed callback; no UI is rendered here.
 */

export const GAME_STORAGE_PREFIX = 'dsh-breakroom:game:'

/** Versioned key for a game's save, e.g. `dsh-breakroom:game:gin-rummy:v1`. */
export function gameStorageKey(gameId: GameId): string {
  return `${GAME_STORAGE_PREFIX}${gameId}:v1`
}

/** Minimal storage contract satisfied by `localStorage` and test adapters. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Discriminated save-failure notice; observable without UI. */
export type GameStorageFailure =
  | { readonly kind: 'serialization' }
  | { readonly kind: 'write' }

export interface GameStorageOptions {
  readonly storage?: StorageLike
  readonly onFailure?: (failure: GameStorageFailure) => void
}

function createInMemoryStorage(): StorageLike {
  const entries = new Map<string, string>()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
  }
}

/** Resolves the default adapter, degrading to in-memory when localStorage is unavailable. */
export function resolveDefaultStorage(): StorageLike {
  try {
    const storage: StorageLike | undefined = window.localStorage
    return storage ?? createInMemoryStorage()
  } catch {
    return createInMemoryStorage()
  }
}

export function createGameStorage(
  gameId: GameId,
  options: GameStorageOptions = {},
): GameStorage {
  const key = gameStorageKey(gameId)
  const adapter = options.storage ?? resolveDefaultStorage()
  const onFailure = options.onFailure

  // Latches the notice so a broken store reports once, not on every state change.
  let failed = false

  const notifyOnce = (failure: GameStorageFailure): void => {
    if (failed) return
    failed = true
    onFailure?.(failure)
  }

  return {
    load(): unknown | null {
      let serialized: string | null
      try {
        serialized = adapter.getItem(key)
      } catch {
        return null
      }
      if (serialized === null) return null
      try {
        const parsed: unknown = JSON.parse(serialized)
        return parsed
      } catch {
        return null
      }
    },

    save(value: unknown): void {
      let serialized: string | undefined
      try {
        serialized = JSON.stringify(value)
      } catch {
        serialized = undefined
      }
      if (serialized === undefined) {
        notifyOnce({ kind: 'serialization' })
        return
      }
      try {
        adapter.setItem(key, serialized)
      } catch {
        notifyOnce({ kind: 'write' })
        return
      }
      failed = false
    },

    clear(): void {
      try {
        adapter.removeItem(key)
        failed = false
      } catch {
        // Non-fatal: a refused remove leaves any previous save untouched.
      }
    },
  }
}
