import type { ComponentType } from 'react'
import type { StorageLike } from './game-storage.ts'

/**
 * Contract seam for game modules (spec §8). A game contributes a
 * `GameDefinition` and receives only `GameProps` at render time; it must not
 * import DSH Client/Host adapters or the full Companion surface.
 */

/** Stable, registry-unique identifier for a game module. */
export type GameId = string

/**
 * Anchor for the lowercase-kebab-case shape every `manifest.id` must satisfy
 * (spec §8.1). IDs are unique across the registry and never reused for a
 * different game after release.
 */
export const GAME_ID_PATTERN: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** True when `id` satisfies the `manifest.id` shape from spec §8.1. */
export function isValidGameId(id: string): boolean {
  return GAME_ID_PATTERN.test(id)
}

export interface GameManifest {
  readonly id: GameId
  readonly title: string
  readonly summary: string
  readonly coverUrl: string
  readonly iconUrl?: string
  readonly version: string
  readonly estimatedMinutes?: readonly number[]
  readonly tags?: readonly string[]
  readonly author: string
  readonly license: string
}

/** Per-game persistence, isolated by game id. Games validate their own saves. */
export interface GameStorage {
  load(): unknown | null
  save(value: unknown): void
  clear(): void
}

export type CompanionMood = 'calm' | 'thinking' | 'pleased' | 'concerned'

/** Narrowed companion surface a game may use; never the full Host remote. */
export interface GameCompanionPort {
  say(text: string): void
  setMood(mood: CompanionMood): void
  openChat(): void
}

export interface GameProps {
  readonly storage: GameStorage
  readonly companion: GameCompanionPort
  readonly onExit: () => void
}

export interface GameDefinition {
  readonly manifest: GameManifest
  readonly Game: ComponentType<GameProps>
  /** Optional one-time, idempotent migration run before the game first renders. */
  readonly migrate?: (storage: StorageLike) => void
}
