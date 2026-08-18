import type { GameDefinition } from '../../breakroom/game-contract.ts'
import { GinRummyGame } from './GinRummyGame.tsx'
import { ginRummyManifest } from './manifest.ts'
import { migrateGinSave } from './migration.ts'

export { ginRummyManifest } from './manifest.ts'
export { GinRummyGame } from './GinRummyGame.tsx'
export { migrateGinSave } from './migration.ts'

/**
 * Gin Rummy's production `GameDefinition` (spec §8/§9). The registry imports
 * `ginRummyManifest` eagerly and pulls this default export lazily via
 * `(await import('../games/gin-rummy')).default`, so the hall renders a card
 * without evaluating the React game code.
 *
 * `migrate` hands the runtime the legacy→namespaced save migration, which the
 * runtime invokes once against the shared storage path before the game renders.
 */
const ginRummyDefinition: GameDefinition = {
  manifest: ginRummyManifest,
  Game: GinRummyGame,
  migrate: migrateGinSave,
}

export default ginRummyDefinition
