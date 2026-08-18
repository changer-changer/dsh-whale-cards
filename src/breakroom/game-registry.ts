import { ginRummyManifest } from '../games/gin-rummy/manifest.ts'
import { isValidGameId } from './game-contract.ts'
import type { GameDefinition, GameId, GameManifest } from './game-contract.ts'

/**
 * A game module admitted to the breakroom (spec §9). The manifest is known at
 * registration time so the hall can render a card without loading the game;
 * `load()` pulls the game module lazily via an in-bundle dynamic import, keeping
 * the single-file client bundle intact while deferring non-current game code.
 */
export interface RegisteredGame {
  readonly manifest: GameManifest
  load(): Promise<GameDefinition>
}

/** Manifest fields the registry requires to be non-empty (spec §9). */
export const REQUIRED_MANIFEST_FIELDS = [
  'id',
  'title',
  'summary',
  'coverUrl',
  'version',
  'author',
  'license',
] as const
export type RequiredManifestField = (typeof REQUIRED_MANIFEST_FIELDS)[number]

/**
 * IDs reserved for dev/test fixture games. Fixtures prove the game interface is
 * not Gin-specific; they are never shipped in the production registry (§4.1.10).
 */
export const FIXTURE_GAME_IDS: readonly GameId[] = ['reference-game']

/** One validation problem, keyed to the game id that triggered it. */
export interface RegistryIssue {
  readonly gameId: GameId
  readonly reason: string
}

/** Returns `null` for a valid id, else a reason naming the violated shape. */
export function validateGameId(id: GameId): string | null {
  if (!isValidGameId(id)) {
    return `game id "${id}" must match the lowercase-kebab-case shape ^[a-z0-9]+(?:-[a-z0-9]+)*$`
  }
  return null
}

/** IDs registered more than once, each reported exactly once. */
export function findDuplicateGameIds(registry: readonly RegisteredGame[]): readonly GameId[] {
  const seen = new Set<GameId>()
  const duplicates = new Set<GameId>()
  for (const { manifest } of registry) {
    if (seen.has(manifest.id)) duplicates.add(manifest.id)
    seen.add(manifest.id)
  }
  return [...duplicates]
}

/** Required manifest fields that are empty or whitespace-only. */
export function findMissingManifestFields(manifest: GameManifest): readonly RequiredManifestField[] {
  const missing: RequiredManifestField[] = []
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (manifest[field].trim() === '') missing.push(field)
  }
  return missing
}

/** True when a loaded definition's manifest id matches the registered manifest. */
export function loadResultIdMatches(manifest: GameManifest, definition: GameDefinition): boolean {
  return definition.manifest.id === manifest.id
}

/** True when the id is reserved for a dev/test fixture game. */
export function isFixtureGameId(id: GameId): boolean {
  return FIXTURE_GAME_IDS.includes(id)
}

/** Registry entries whose id is reserved for fixtures. */
export function findFixtureEntries(registry: readonly RegisteredGame[]): readonly RegisteredGame[] {
  return registry.filter(({ manifest }) => isFixtureGameId(manifest.id))
}

/**
 * Static production invariants (spec §9): id format, id uniqueness, non-empty
 * required manifest fields, and no fixture games. Does not load anything.
 */
export function validateProductionRegistry(
  registry: readonly RegisteredGame[],
): readonly RegistryIssue[] {
  const issues: RegistryIssue[] = []
  for (const { manifest } of registry) {
    const idProblem = validateGameId(manifest.id)
    if (idProblem !== null) issues.push({ gameId: manifest.id, reason: idProblem })

    for (const field of findMissingManifestFields(manifest)) {
      issues.push({ gameId: manifest.id, reason: `manifest field "${field}" must be non-empty` })
    }

    if (isFixtureGameId(manifest.id)) {
      issues.push({ gameId: manifest.id, reason: 'fixture game ids must not ship in the production registry' })
    }
  }

  for (const duplicateId of findDuplicateGameIds(registry)) {
    issues.push({ gameId: duplicateId, reason: `game id "${duplicateId}" is registered more than once` })
  }

  return issues
}

/**
 * Async production invariant: every `load()` must resolve a `GameDefinition`
 * whose manifest id matches the pre-registered manifest, and must not reject.
 */
export async function validateProductionLoads(
  registry: readonly RegisteredGame[],
): Promise<readonly RegistryIssue[]> {
  const issues: RegistryIssue[] = []
  for (const { manifest, load } of registry) {
    try {
      const definition = await load()
      if (!loadResultIdMatches(manifest, definition)) {
        issues.push({
          gameId: manifest.id,
          reason: `load() returned manifest id "${definition.manifest.id}", expected "${manifest.id}"`,
        })
      }
    } catch (error) {
      issues.push({
        gameId: manifest.id,
        reason: `load() rejected: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
  return issues
}

/**
 * Production game registry (spec §9). Hand-edited and reviewed; only curated
 * games ship here. Each entry keeps the manifest up front and defers the game
 * module to `load()`, so the hall renders without evaluating every game's code.
 *
 * Gin Rummy is the first production game. Its manifest is imported eagerly
 * (from `src/games/gin-rummy/manifest.ts`) so the hall can render a card
 * without loading the React game code; `load()` pulls the full `GameDefinition`
 * lazily from `src/games/gin-rummy`.
 */
export const GAME_REGISTRY: readonly RegisteredGame[] = [
  {
    manifest: ginRummyManifest,
    load: async () => (await import('../games/gin-rummy')).default,
  },
]
