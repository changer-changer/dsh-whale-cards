/**
 * Teahouse storage v2: per-game save slots plus shell-level preferences,
 * with a silent one-way migration from the single-slot v1 whale-cards save.
 *
 * Layout:
 *   dsh-teahouse:save:<gameId>:v1   → opaque per-game JSON (game-owned)
 *   dsh-teahouse:shell:v1           → shell preferences + lobby state
 *   dsh-whale-cards:save:v1         → legacy v1 (migrated away on first run)
 *
 * @module teahouse/storage
 */

import {
  clearAppState,
  loadAppState,
  type PlayerPreferences,
  type PlayerStats,
  type SavedAppState,
} from '../game/persistence.ts'
import type { TeahousePlayMode } from './types.ts'

export interface ShellPreferences {
  readonly lanyinDock: boolean
  readonly defaultGameId: string
  readonly playMode: TeahousePlayMode
}

export interface ShellState {
  readonly version: 2
  readonly preferences: PlayerPreferences
  readonly stats: PlayerStats
  readonly shell: ShellPreferences
}

const SLOT_PREFIX = 'dsh-teahouse:save:'
const SHELL_KEY = 'dsh-teahouse:shell:v1'
const MIGRATION_DONE_KEY = 'dsh-teahouse:migrated:v1'

export const DEFAULT_SHELL_PREFERENCES: ShellPreferences = {
  lanyinDock: true,
  defaultGameId: 'gin-rummy',
  playMode: 'classic',
}

export function gameSlotKey(gameId: string): string {
  return `${SLOT_PREFIX}${gameId}:v1`
}

/* ---------------- per-game slots ---------------- */

export function loadSlot(gameId: string): unknown {
  try {
    const raw = localStorage.getItem(gameSlotKey(gameId))
    return raw === null ? null : (JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveSlot(gameId: string, state: unknown): void {
  try {
    if (state === null) {
      localStorage.removeItem(gameSlotKey(gameId))
      return
    }
    localStorage.setItem(gameSlotKey(gameId), JSON.stringify(state))
  } catch {
    /* quota or unavailable — saves are best-effort */
  }
}

export function clearSlot(gameId: string): void {
  try {
    localStorage.removeItem(gameSlotKey(gameId))
  } catch {
    /* ignore */
  }
}

export function slotExists(gameId: string): boolean {
  try {
    return localStorage.getItem(gameSlotKey(gameId)) !== null
  } catch {
    return false
  }
}

/* ---------------- shell state ---------------- */

function defaultShell(preferences: PlayerPreferences, stats: PlayerStats): ShellState {
  return { version: 2, preferences, stats, shell: DEFAULT_SHELL_PREFERENCES }
}

/**
 * Load shell state; on the very first teahouse run, absorb the legacy v1
 * whale-cards save (preferences + stats + the gin-rummy match itself) and
 * flag the migration so it never repeats.
 */
export function loadShellState(): ShellState {
  const legacy = loadAppState()
  let migrated = false
  try {
    migrated = localStorage.getItem(MIGRATION_DONE_KEY) === '1'
  } catch {
    migrated = false
  }

  if (!migrated) {
    // Move the legacy gin-rummy match into the gin-rummy slot.
    if (legacy.match !== null) saveSlot('gin-rummy', legacy.match)
    try {
      localStorage.setItem(MIGRATION_DONE_KEY, '1')
      localStorage.removeItem('dsh-whale-cards:save:v1')
    } catch {
      /* ignore */
    }
    return defaultShell(legacy.preferences, legacy.stats)
  }

  try {
    const raw = localStorage.getItem(SHELL_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>
        if (typeof record.preferences === 'object' && typeof record.stats === 'object') {
          return {
            version: 2,
            preferences: record.preferences as PlayerPreferences,
            stats: record.stats as PlayerStats,
            shell: { ...DEFAULT_SHELL_PREFERENCES, ...(record.shell as Partial<ShellPreferences> | undefined) },
          }
        }
      }
    }
  } catch {
    /* fall through to defaults */
  }
  return defaultShell(legacy.preferences, legacy.stats)
}

export function saveShellState(state: ShellState): void {
  try {
    localStorage.setItem(SHELL_KEY, JSON.stringify(state))
  } catch {
    /* best-effort */
  }
}

/** Test helper: wipe every teahouse key plus the legacy save. */
export function clearAllTeahouseStorage(): void {
  try {
    const doomed: string[] = [SHELL_KEY, MIGRATION_DONE_KEY, 'dsh-whale-cards:save:v1']
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key !== null && (key.startsWith(SLOT_PREFIX) || key.startsWith('dsh-teahouse:lanyin:'))) {
        doomed.push(key)
      }
    }
    for (const key of doomed) localStorage.removeItem(key)
    clearAppState()
  } catch {
    /* ignore */
  }
}

export type { PlayerPreferences, PlayerStats, SavedAppState }
