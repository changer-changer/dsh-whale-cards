import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { CompanionGameContext, CompanionPort } from '../companion/core.ts'
import {
  LANYIN_CALM_ART,
  LANYIN_CONCERNED_ART,
  LANYIN_PLEASED_ART,
  LANYIN_THINKING_ART,
} from '../client/generated/art'
import { CompanionPanel } from '../ui/CompanionPanel.tsx'
import { lanyinExpression, type LanyinExpression } from '../ui/expression.ts'
import { GAME_STYLES, STYLE_ELEMENT_ID } from '../ui/styles.ts'
import { useTaskNotice, type TaskListSource } from './task-status.ts'
import { useCompanion } from '../ui/useCompanion.ts'
import type { GameCompanionPort, GameId, CompanionMood } from './game-contract.ts'
import { GameHall } from './GameHall.tsx'
import { GameRuntime } from './GameRuntime.tsx'
import type { RegisteredGame } from './game-registry.ts'
import { GAME_REGISTRY } from './game-registry.ts'
import type { GameStorageFailure, StorageLike } from './game-storage.ts'
import {
  DEFAULT_SHELL_STATE,
  loadShellState,
  saveShellState,
  shellReducer,
} from './shell-persistence.ts'
import { BREAKROOM_STYLES } from './styles.ts'

/**
 * Breakroom shell (spec §6.1, slice B). Owns the launcher, the panel-open
 * state, hall vs game routing, the task notice toast, and the public
 * CompanionPanel. The shell knows nothing about Gin rules, scores, cards or
 * AI; the only thing it sees of a running game is the narrowed
 * `GameCompanionPort` and the shell's own route.
 */

export interface BreakroomAppProps {
  readonly companion?: CompanionPort
  readonly initiallyOpen?: boolean
  /** When true, render in preview mode (no fixed launcher, fills its parent). */
  readonly preview?: boolean
  readonly taskSource?: TaskListSource
  /** Persistence overrides used by tests; production reads localStorage. */
  readonly storage?: {
    readonly shell?: StorageLike
    readonly game?: StorageLike
  }
  /** Registry override for tests; production uses `GAME_REGISTRY`. */
  readonly registry?: readonly RegisteredGame[]
}

const EXPRESSION_ART: Record<LanyinExpression, string> = {
  calm: LANYIN_CALM_ART,
  concerned: LANYIN_CONCERNED_ART,
  pleased: LANYIN_PLEASED_ART,
  thinking: LANYIN_THINKING_ART,
}

function Mark(): React.JSX.Element {
  return (
    <span className="dwc-mark" aria-hidden="true">
      <span className="dwc-mark-wave" />
      <span className="dwc-mark-dot" />
    </span>
  )
}

export function BreakroomApp({
  companion: companionPort,
  initiallyOpen,
  preview = false,
  taskSource,
  storage,
  registry = GAME_REGISTRY,
}: BreakroomAppProps): React.JSX.Element {
  const [shell, dispatch] = useReducer(
    shellReducer,
    undefined,
    () => {
      try {
        const restored = loadShellState(storage?.shell ?? null)
        return initiallyOpen === undefined ? restored : { ...restored, panelOpen: initiallyOpen }
      } catch {
        return { ...DEFAULT_SHELL_STATE, panelOpen: initiallyOpen ?? false }
      }
    },
  )
  const [companionOpen, setCompanionOpen] = useState(false)
  const [transientLine, setTransientLine] = useState<string | null>(null)
  const [companionMood, setCompanionMood] = useState<CompanionMood>('calm')
  const [storageFailure, setStorageFailure] = useState<GameStorageFailure | null>(null)

  // Privacy fence: compose the game context from route + registry only, never
  // from Gin rules, scores, cards or AI.
  const currentRoute = shell.route
  const inGame = currentRoute.kind === 'game' ? currentRoute : null
  const gameContext = useMemo<CompanionGameContext | null>(() => {
    if (inGame === null) return null
    const manifest = registry.find((entry) => entry.manifest.id === inGame.gameId)?.manifest
    if (manifest === undefined) return null
    return {
      gameId: inGame.gameId,
      gameTitle: manifest.title,
      summary: manifest.summary,
    }
  }, [inGame, registry])

  const companionController = useCompanion(companionPort, taskSource, gameContext)

  // The panel-open watch key mirrors what the controller used: each time the
  // panel opens we capture the then-current DSH task and watch only it until
  // the panel closes (spec §11.1).
  const [watchKey, setWatchKey] = useState<number | null>(null)
  useEffect(() => {
    if (shell.panelOpen) {
      setWatchKey((previous) => (previous === null ? 1 : previous + 1))
    } else {
      setWatchKey(null)
    }
  }, [shell.panelOpen])
  const task = useTaskNotice(taskSource, watchKey)

  // Persist shell state on every transition.
  useEffect(() => {
    saveShellState(shell, storage?.shell ?? null)
  }, [shell, storage?.shell])

  // Transient companion line auto-clears so it does not linger as fake history.
  useEffect(() => {
    if (transientLine === null) return
    const timer = window.setTimeout(() => setTransientLine(null), 6_000)
    return () => window.clearTimeout(timer)
  }, [transientLine])

  // Stable GameCompanionPort handed to every game. Identity stays constant so
  // a game re-render never re-triggers its own effects.
  const openPanel = useCallback(() => dispatch({ type: 'open-panel' }), [])
  const closePanel = useCallback(() => dispatch({ type: 'close-panel' }), [])
  const returnToHall = useCallback(() => dispatch({ type: 'return-to-hall' }), [])
  const openGame = useCallback((gameId: GameId) => dispatch({ type: 'open-game', gameId }), [])
  const openCompanion = useCallback(() => setCompanionOpen(true), [])
  const closeCompanion = useCallback(() => setCompanionOpen(false), [])

  const gameCompanion = useMemo<GameCompanionPort>(
    () => ({
      say: (text) => {
        setTransientLine(text)
      },
      setMood: (mood) => {
        setCompanionMood(mood)
      },
      openChat: () => {
        openCompanion()
      },
    }),
    [openCompanion],
  )

  const onStorageFailure = useCallback((failure: GameStorageFailure) => {
    setStorageFailure(failure)
  }, [])
  const clearStorageFailure = useCallback(() => setStorageFailure(null), [])

  // Track which overlay is topmost for Escape layering (spec §13.4).
  // Order: CompanionPanel > storage failure toast > collapse panel.
  // Task notice is non-modal and never grabs Escape.
  const handleEscape = useCallback((): boolean => {
    if (companionOpen) {
      closeCompanion()
      return true
    }
    if (storageFailure !== null) {
      clearStorageFailure()
      return true
    }
    if (shell.panelOpen) {
      closePanel()
      return true
    }
    return false
  }, [companionOpen, closeCompanion, closePanel, clearStorageFailure, shell.panelOpen, storageFailure])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      if (handleEscape()) {
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleEscape])

  // Expression picks up the game's mood signal and the chat mood, falling back
  // to calm when neither has spoken yet.
  const expression = lanyinExpression({
    aiThinking: false,
    mood: companionController.mood !== 'calm' ? companionController.mood : companionMood,
    taskNotice: task.notice,
  })
  const artUrl = EXPRESSION_ART[expression]

  // Refs so the latest say line and mood signal are visible without re-rendering
  // the GameRuntime tree that holds them.
  const transientLineRef = useRef<string | null>(null)
  transientLineRef.current = transientLine

  return (
    <div
      className="dwc-root dwc-breakroom-root"
      data-expression={expression}
      data-preview={preview ? 'true' : 'false'}
    >
      <style id={STYLE_ELEMENT_ID}>{GAME_STYLES}</style>
      <style>{BREAKROOM_STYLES}</style>

      {!shell.panelOpen && (
        <button
          className="dwc-launcher"
          type="button"
          onClick={openPanel}
          aria-label="打开茶歇间"
        >
          <span className="dwc-launcher-art" style={{ backgroundImage: `url(${artUrl})` }} />
          <span className="dwc-launcher-copy">
            <strong>茶歇间</strong>
            <small>和澜音歇一手</small>
          </span>
          {task.notice !== null && (
            <span className="dwc-launcher-badge" aria-label="DSH 任务有新状态" />
          )}
        </button>
      )}

      {shell.panelOpen && (
        <div className="dwc-overlay" role="dialog" aria-modal="true" aria-label="茶歇间">
          <main className="dwc-game-shell">
            <header className="dwc-topbar">
              <div className="dwc-brand">
                <Mark />
                <span>
                  <strong>茶歇间</strong>
                  <small>DSH BREAKROOM</small>
                </span>
              </div>
              <nav className="dwc-top-actions" aria-label="茶歇间菜单">
                {inGame !== null && (
                  <button
                    type="button"
                    className="dwc-text-button"
                    onClick={returnToHall}
                    aria-label="返回大厅"
                  >
                    大厅
                  </button>
                )}
                <button
                  type="button"
                  className="dwc-text-button dwc-text-button--companion"
                  onClick={openCompanion}
                  aria-label="打开澜音对话与记忆"
                >
                  澜音
                </button>
                <button
                  type="button"
                  className="dwc-close-button"
                  onClick={closePanel}
                  aria-label="收起茶歇间"
                >
                  —
                </button>
              </nav>
            </header>

            {task.notice !== null && (
              <section className="dwc-task-notice" aria-live="polite">
                <Mark />
                <span>
                  <strong>
                    {task.notice === 'done' ? 'DSH 的任务完成了' : 'DSH 正在等你处理'}
                  </strong>
                  <small>
                    {task.notice === 'done'
                      ? '茶歇间不催你；这手打完再回去也来得及。'
                      : '当前局面已经存好，随时可以切回任务。'}
                  </small>
                </span>
                <button type="button" onClick={task.clear}>
                  知道了
                </button>
              </section>
            )}

            {storageFailure !== null && (
              <div className="dwc-error" role="alert">
                <span>
                  {storageFailure.kind === 'serialization'
                    ? '这一刻的进度暂时存不下来；继续玩不影响，但关闭页面后可能丢失。'
                    : '浏览器暂时不让写本地存档；继续玩不影响，但关闭页面后可能丢失。'}
                </span>
                <button type="button" onClick={clearStorageFailure} aria-label="关闭提示">
                  ×
                </button>
              </div>
            )}

            {transientLine !== null && (
              <aside className="dwc-breakroom-toast" aria-live="polite">
                <Mark />
                <p>{transientLine}</p>
              </aside>
            )}

            <div className="dwc-content">
              {inGame === null ? (
                <GameHall
                  onSelectGame={openGame}
                  lastPlayedGameId={shell.lastPlayedGameId}
                  registry={registry}
                  storage={{ storage: storage?.game }}
                />
              ) : (
                <GameRuntime
                  key={inGame.gameId}
                  gameId={inGame.gameId}
                  companion={gameCompanion}
                  registry={registry}
                  storage={{ storage: storage?.game }}
                  onStorageFailure={onStorageFailure}
                  onExit={returnToHall}
                />
              )}
            </div>
          </main>
        </div>
      )}

      <CompanionPanel
        open={companionOpen}
        snapshot={companionController.snapshot}
        catalog={companionController.catalog}
        messages={companionController.messages}
        busy={companionController.busy}
        error={companionController.error}
        onClose={closeCompanion}
        onSelectModel={companionController.selectModel}
        onSend={companionController.send}
        onRemember={companionController.remember}
        onForget={companionController.forget}
      />
    </div>
  )
}
