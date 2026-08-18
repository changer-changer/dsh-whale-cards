import type { Difficulty, MatchState } from './types.ts'

export const STORAGE_KEY = 'dsh-whale-cards:save:v1'

export interface PlayerPreferences {
  readonly dialogue: 'quiet' | 'standard' | 'lively'
  readonly difficulty: Difficulty
  readonly fastAi: boolean
  readonly muted: boolean
  readonly tutorialSeen: boolean
}

export interface PlayerStats {
  readonly handsPlayed: number
  readonly matchesPlayed: number
  readonly matchesWon: number
  readonly rapport: number
}

export interface SavedAppState {
  readonly version: 1
  readonly match: MatchState | null
  readonly panelOpen: boolean
  readonly preferences: PlayerPreferences
  readonly stats: PlayerStats
  readonly countedMatchSeed?: number
}

export const DEFAULT_PREFERENCES: PlayerPreferences = {
  dialogue: 'standard',
  difficulty: 'steady',
  fastAi: false,
  muted: false,
  tutorialSeen: false,
}

export const DEFAULT_STATS: PlayerStats = {
  handsPlayed: 0,
  matchesPlayed: 0,
  matchesWon: 0,
  rapport: 0,
}

export const DEFAULT_APP_STATE: SavedAppState = {
  version: 1,
  match: null,
  panelOpen: false,
  preferences: DEFAULT_PREFERENCES,
  stats: DEFAULT_STATS,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Validates a match's structural shape (52 unique cards, phase/turn enums) —
 * the shared match validator used by the legacy parser and the Gin game save.
 */
export function isValidMatch(value: unknown): value is MatchState {
  if (!isRecord(value) || value.version !== 1) return false
  if (!['draw', 'discard', 'reveal', 'match_over'].includes(String(value.phase))) return false
  if (!['human', 'lanyin'].includes(String(value.turn))) return false
  if (!Array.isArray(value.stock) || !Array.isArray(value.discard) || !isRecord(value.hands)) return false
  const human = value.hands.human
  const lanyin = value.hands.lanyin
  if (!Array.isArray(human) || !Array.isArray(lanyin)) return false
  const cards = [...value.stock, ...value.discard, ...human, ...lanyin]
  if (cards.length !== 52) return false
  const ids = cards.map((card) => isRecord(card) ? card.id : undefined)
  return ids.every((id) => typeof id === 'string') && new Set(ids).size === 52
}

export function normalizePreferences(value: unknown): PlayerPreferences {
  if (!isRecord(value)) return DEFAULT_PREFERENCES
  return {
    dialogue: value.dialogue === 'quiet' || value.dialogue === 'lively' ? value.dialogue : 'standard',
    difficulty: value.difficulty === 'relaxed' || value.difficulty === 'sharp' ? value.difficulty : 'steady',
    fastAi: value.fastAi === true,
    muted: value.muted === true,
    tutorialSeen: value.tutorialSeen === true,
  }
}

export function normalizeStats(value: unknown): PlayerStats {
  if (!isRecord(value)) return DEFAULT_STATS
  const safeNumber = (candidate: unknown, maximum: number): number => (
    typeof candidate === 'number' && Number.isFinite(candidate)
      ? Math.max(0, Math.min(maximum, Math.floor(candidate)))
      : 0
  )
  return {
    handsPlayed: safeNumber(value.handsPlayed, 1_000_000),
    matchesPlayed: safeNumber(value.matchesPlayed, 1_000_000),
    matchesWon: safeNumber(value.matchesWon, 1_000_000),
    rapport: safeNumber(value.rapport, 100),
  }
}

/** Returns `null` when the payload is absent, corrupt, or not a version-1 save. */
export function parseSavedAppStateOrNull(serialized: string | null): SavedAppState | null {
  if (serialized === null) return null
  try {
    const value: unknown = JSON.parse(serialized)
    if (!isRecord(value) || value.version !== 1) return null
    return {
      version: 1,
      match: value.match === null || value.match === undefined
        ? null
        : isValidMatch(value.match) ? value.match : null,
      panelOpen: value.panelOpen === true,
      preferences: normalizePreferences(value.preferences),
      stats: normalizeStats(value.stats),
      ...(typeof value.countedMatchSeed === 'number'
        ? { countedMatchSeed: value.countedMatchSeed >>> 0 }
        : {}),
    }
  } catch {
    return null
  }
}

export function parseSavedAppState(serialized: string | null): SavedAppState {
  return parseSavedAppStateOrNull(serialized) ?? DEFAULT_APP_STATE
}

export function loadAppState(storage: Pick<Storage, 'getItem'> = localStorage): SavedAppState {
  return parseSavedAppState(storage.getItem(STORAGE_KEY))
}

export function saveAppState(
  state: SavedAppState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearAppState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(STORAGE_KEY)
}

/** Persistence seam a controller reads/writes `SavedAppState` through. */
export interface GamePersistenceAdapter {
  load(): SavedAppState
  save(state: SavedAppState): void
}

/** Default adapter that persists to the legacy `dsh-whale-cards:save:v1` key. */
export const LEGACY_PERSISTENCE: GamePersistenceAdapter = {
  load: () => loadAppState(),
  save: (state) => saveAppState(state),
}

