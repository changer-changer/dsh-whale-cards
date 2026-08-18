import { useEffect, useMemo, useState } from 'react'
import type { GameCompanionPort, GameDefinition, GameId } from './game-contract.ts'
import { GAME_REGISTRY, type RegisteredGame } from './game-registry.ts'
import {
  createGameStorage,
  resolveDefaultStorage,
  type GameStorageFailure,
  type GameStorageOptions,
  type StorageLike,
} from './game-storage.ts'
import { GameErrorBoundary } from './GameErrorBoundary.tsx'

/**
 * Per-game runtime container (spec §6.1, slice B). Resolves a `gameId` against
 * the production registry, lazily pulls the `GameDefinition`, builds the
 * namespaced `GameStorage` and the narrowed `GameCompanionPort`, then renders
 * the game behind a `GameErrorBoundary`. The runtime never touches DSH
 * sessions, model catalogs, or Gin-specific state; it owns only the seam the
 * game sees.
 */

export interface GameRuntimeProps {
  readonly gameId: GameId
  /** Companion surface the shell hands down; the runtime forwards it verbatim. */
  readonly companion: GameCompanionPort
  /** Storage overrides used by tests to keep saves in memory. */
  readonly storage?: GameStorageOptions
  /** Optional observer for non-fatal save failures (spec §10.3). */
  readonly onStorageFailure?: (failure: GameStorageFailure) => void
  /** Called when the game itself or the error boundary asks to leave. */
  readonly onExit: () => void
  /** Registry override for tests; production uses `GAME_REGISTRY`. */
  readonly registry?: readonly RegisteredGame[]
}

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly definition: GameDefinition }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'failed'; readonly reason: string }

export function GameRuntime({
  gameId,
  companion,
  storage,
  onStorageFailure,
  onExit,
  registry = GAME_REGISTRY,
}: GameRuntimeProps): React.JSX.Element {
  const registered = useMemo(
    () => registry.find((entry) => entry.manifest.id === gameId),
    [registry, gameId],
  )
  const manifest = registered?.manifest
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const storageLike = useMemo<StorageLike>(
    () => storage?.storage ?? resolveDefaultStorage(),
    [storage?.storage],
  )

  useEffect(() => {
    if (registered === undefined) {
      setState({ kind: 'unknown' })
      return
    }
    let active = true
    setState({ kind: 'loading' })
    registered.load().then(
      (definition) => {
        if (!active) return
        try {
          definition.migrate?.(storageLike)
        } catch {
          // A game's migration must never block the game from loading.
        }
        setState({ kind: 'ready', definition })
      },
      (cause: unknown) => {
        if (!active) return
        setState({
          kind: 'failed',
          reason: cause instanceof Error ? cause.message : String(cause),
        })
      },
    )
    return () => {
      active = false
    }
  }, [registered, storageLike])

  const gameStorage = useMemo(
    () =>
      createGameStorage(gameId, {
        storage: storageLike,
        onFailure: onStorageFailure ?? storage?.onFailure,
      }),
    [gameId, storageLike, storage?.onFailure, onStorageFailure],
  )

  if (manifest === undefined || state.kind === 'unknown') {
    return (
      <div className="dwc-breakroom-runtime dwc-breakroom-runtime--empty" role="alert">
        <strong>没有找到这款游戏</strong>
        <p>它可能还没有被收录进大厅。返回大厅看看现在能玩什么。</p>
        <button type="button" className="dwc-button dwc-button--primary" onClick={onExit}>
          返回大厅
        </button>
      </div>
    )
  }

  if (state.kind === 'loading') {
    return (
      <div className="dwc-breakroom-runtime dwc-breakroom-runtime--loading" aria-live="polite">
        <strong>正在装载 {manifest.title}…</strong>
      </div>
    )
  }

  if (state.kind === 'failed') {
    return (
      <div className="dwc-breakroom-runtime dwc-breakroom-runtime--failed" role="alert">
        <strong>{manifest.title} 装载失败</strong>
        <p>{state.reason}</p>
        <button type="button" className="dwc-button dwc-button--primary" onClick={onExit}>
          返回大厅
        </button>
      </div>
    )
  }

  const { Game } = state.definition
  return (
    <GameErrorBoundary gameTitle={manifest.title} onReturnToHall={onExit}>
      <Game storage={gameStorage} companion={companion} onExit={onExit} />
    </GameErrorBoundary>
  )
}
