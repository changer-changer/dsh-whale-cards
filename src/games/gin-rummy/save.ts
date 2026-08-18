import type { GameStorage } from '../../breakroom/game-contract.ts'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_STATS,
  isValidMatch,
  normalizePreferences,
  normalizeStats,
  type GamePersistenceAdapter,
  type PlayerPreferences,
  type PlayerStats,
  type SavedAppState,
} from '../../game/persistence.ts'
import type { MatchState } from '../../game/types.ts'

/**
 * Gin's namespaced save (spec §10.1/§10.2): `match`, preferences, stats and
 * `countedMatchSeed`. `panelOpen` belongs to the shell and is deliberately
 * absent so the shell and every game's save stay independent.
 */
export interface GinGameSave {
  readonly version: 1
  readonly match: MatchState | null
  readonly preferences: PlayerPreferences
  readonly stats: PlayerStats
  readonly countedMatchSeed?: number
}

export const DEFAULT_GIN_GAME_SAVE: GinGameSave = {
  version: 1,
  match: null,
  preferences: DEFAULT_PREFERENCES,
  stats: DEFAULT_STATS,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validates a Gin save; `null` for absent, corrupt, or wrong-version payloads. */
export function parseGinGameSave(raw: unknown): GinGameSave | null {
  if (!isRecord(raw) || raw.version !== 1) return null
  return {
    version: 1,
    match: raw.match === null || raw.match === undefined
      ? null
      : isValidMatch(raw.match) ? raw.match : null,
    preferences: normalizePreferences(raw.preferences),
    stats: normalizeStats(raw.stats),
    ...(typeof raw.countedMatchSeed === 'number'
      ? { countedMatchSeed: raw.countedMatchSeed >>> 0 }
      : {}),
  }
}

export function ginGameSaveToAppState(save: GinGameSave): SavedAppState {
  return {
    version: 1,
    match: save.match,
    panelOpen: false,
    preferences: save.preferences,
    stats: save.stats,
    ...(save.countedMatchSeed === undefined ? {} : { countedMatchSeed: save.countedMatchSeed }),
  }
}

export function appStateToGinGameSave(state: SavedAppState): GinGameSave {
  return {
    version: 1,
    match: state.match,
    preferences: state.preferences,
    stats: state.stats,
    ...(state.countedMatchSeed === undefined ? {} : { countedMatchSeed: state.countedMatchSeed }),
  }
}

/** Adapts the namespaced `GameStorage` to the controller's `SavedAppState` seam. */
export function createGinStorageAdapter(storage: GameStorage): GamePersistenceAdapter {
  return {
    load: () => ginGameSaveToAppState(parseGinGameSave(storage.load()) ?? DEFAULT_GIN_GAME_SAVE),
    save: (state) => {
      storage.save(appStateToGinGameSave(state))
    },
  }
}
