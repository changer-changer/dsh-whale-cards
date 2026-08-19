/**
 * The curated game registry. Adding a game = one entry here + a PR; the
 * shell lazy-loads each game's view only when it is opened.
 *
 * @module teahouse/registry
 */

import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { GameManifest, GameViewProps } from './types.ts'
import { ginRummyGame } from '../games/gin-rummy/module.tsx'
import { harborPairsGame } from '../games/harbor-pairs/module.tsx'

export interface GameRegistration {
  readonly manifest: GameManifest
  readonly View: ComponentType<GameViewProps>
  readonly clearSave: () => void
}

export const GAME_REGISTRY: readonly GameRegistration[] = [
  {
    manifest: ginRummyGame.manifest,
    View: lazy(async () => ({ default: ginRummyGame.View })) as ComponentType<GameViewProps>,
    clearSave: ginRummyGame.clearSave,
  },
  {
    manifest: harborPairsGame.manifest,
    View: lazy(async () => ({ default: harborPairsGame.View })) as ComponentType<GameViewProps>,
    clearSave: harborPairsGame.clearSave,
  },
]
