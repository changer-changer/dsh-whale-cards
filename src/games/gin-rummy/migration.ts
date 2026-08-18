import { gameStorageKey, type StorageLike } from '../../breakroom/game-storage.ts'
import { SHELL_STORAGE_KEY, type BreakroomShellState } from '../../breakroom/shell-persistence.ts'
import { parseSavedAppStateOrNull, STORAGE_KEY as LEGACY_STORAGE_KEY } from '../../game/persistence.ts'
import { appStateToGinGameSave } from './save.ts'

export const GIN_GAME_ID = 'gin-rummy'

export interface GinMigrationResult {
  readonly migrated: boolean
}

function read(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function write(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Non-fatal: a refused write leaves the game playable for this session.
  }
}

/**
 * One-time, idempotent migration of the legacy `dsh-whale-cards:save:v1` save
 * into the namespaced Gin game key and the shell key (spec §10.2).
 *
 * - Existing new game key wins: never re-migrate, never overwrite.
 * - Absent or corrupt legacy save is a no-op; never blocks the hall.
 * - `match`/preferences/stats/countedMatchSeed go to the game key.
 * - `panelOpen` seeds the shell key (only when it is still absent); route is
 *   gin-rummy when a match exists, else the hall.
 * - The legacy key is preserved for at least one release cycle (never removed).
 */
export function migrateGinSave(storage: StorageLike): GinMigrationResult {
  const gameKey = gameStorageKey(GIN_GAME_ID)
  if (read(storage, gameKey) !== null) return { migrated: false }

  const legacyRaw = read(storage, LEGACY_STORAGE_KEY)
  if (legacyRaw === null) return { migrated: false }

  const legacy = parseSavedAppStateOrNull(legacyRaw)
  if (legacy === null) return { migrated: false }

  write(storage, gameKey, JSON.stringify(appStateToGinGameSave(legacy)))

  if (read(storage, SHELL_STORAGE_KEY) === null) {
    const shellState: BreakroomShellState = {
      version: 1,
      panelOpen: legacy.panelOpen,
      route: legacy.match !== null ? { kind: 'game', gameId: GIN_GAME_ID } : { kind: 'hall' },
      ...(legacy.match !== null ? { lastPlayedGameId: GIN_GAME_ID } : {}),
    }
    write(storage, SHELL_STORAGE_KEY, JSON.stringify(shellState))
  }

  return { migrated: true }
}
