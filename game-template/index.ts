import type { GameDefinition, GameManifest } from '../src/breakroom/game-contract.ts'
import type { RegisteredGame } from '../src/breakroom/game-registry.ts'
import { GAME_REGISTRY } from '../src/breakroom/game-registry.ts'
import { MyGame } from './MyGame.tsx'

/**
 * Template game entry (spec §7 `game-template/`). A game module contributes a
 * `GameDefinition` (a manifest plus a React component) and is admitted to a
 * registry. The manifest id must match the lowercase-kebab-case shape and stay
 * unique; the placeholder id below is replaced when you copy the template.
 */

export const myGameManifest: GameManifest = {
  id: 'my-game',
  title: 'My Game',
  summary: 'A tiny starter game built only from GameProps. Replace this with your game.',
  coverUrl: 'https://example.test/my-game/cover.jpg',
  version: '1.0.0',
  author: 'Your Name',
  license: 'MIT',
  tags: ['template'],
}

export { MyGame } from './MyGame.tsx'

const myGameDefinition: GameDefinition = {
  manifest: myGameManifest,
  Game: MyGame,
}

export default myGameDefinition

/**
 * Dev registry (spec §9): the curated games plus this in-development game. Pass
 * it to the hall or preview during local development so your WIP appears there
 * without touching the production `GAME_REGISTRY`. Move the entry into
 * `GAME_REGISTRY` only after the review checklist in
 * `docs/game-review-checklist.md` passes.
 */
export const DEV_REGISTRY: readonly RegisteredGame[] = [
  ...GAME_REGISTRY,
  { manifest: myGameManifest, load: async () => myGameDefinition },
]
