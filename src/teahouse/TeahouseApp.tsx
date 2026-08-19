/**
 * TeahouseApp — the shell every teahouse game lives in.
 *
 * Owns the launcher, the curated lobby, the game container with per-game
 * saves, the non-blocking task notice and the Lanyin dock. Games receive a
 * GameServices face and never learn how any of this is wired.
 *
 * @module teahouse/TeahouseApp
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { LANYIN_HARBOR_ART } from '../client/generated/art.ts'
import type { PlayerPreferences, PlayerStats } from '../game/persistence.ts'
import { DEFAULT_PREFERENCES, DEFAULT_STATS } from '../game/persistence.ts'
import type { TaskListSource } from '../ui/task-status.ts'
import { useTaskNotice } from '../ui/task-status.ts'
import { LanyinDock } from './LanyinDock.tsx'
import { LanyinService } from './lanyin/service.ts'
import { EXPRESSION_LABELS, type LanyinExpression } from './lanyin/persona.ts'
import { GAME_REGISTRY } from './registry.ts'
import { GAME_STYLES } from '../ui/styles.ts'
import {
  DEFAULT_SHELL_PREFERENCES,
  loadShellState,
  loadSlot,
  saveShellState,
  saveSlot,
  slotExists,
  type ShellState,
} from './storage.ts'
import type { GameServices } from './types.ts'
import { TEAHOUSE_STYLES, STYLE_ELEMENT_ID } from './teahouse-styles.ts'

export interface TeahouseAppProps {
  readonly initiallyOpen?: boolean
  readonly preview?: boolean
  readonly taskSource?: TaskListSource
  readonly lanyin: LanyinService
}

type Screen = { kind: 'lobby' } | { kind: 'game'; gameId: string }

const EXPRESSION_FACE: Readonly<Record<LanyinExpression, string>> = {
  calm: '•ᴗ•',
  thinking: '•˙•',
  happy: '•‿•',
  proud: '•◡‿◡•',
  worried: '•︿•',
  talking: '•ᴥ•',
  offline: '•ᴗ•zzz',
}

function Mark(): React.JSX.Element {
  return (
    <span className="dth-mark" aria-hidden="true">
      <span className="dth-mark-wave" />
      <span className="dth-mark-dot" />
    </span>
  )
}

export function TeahouseApp({ initiallyOpen, preview = false, taskSource, lanyin }: TeahouseAppProps): React.JSX.Element {
  const [open, setOpen] = useState(initiallyOpen ?? false)
  const [screen, setScreen] = useState<Screen>(() => (initiallyOpen === true ? { kind: 'lobby' } : { kind: 'lobby' }))
  const [shell, setShell] = useState<ShellState>(() => loadShellState())
  const lanyinState = useSyncExternalStore(lanyin.subscribe, lanyin.getSnapshot)
  const noticeRef = useRef<'done' | 'needs_input' | null>(null)

  const watchingTask = screen.kind === 'game' || open
  const task = useTaskNotice(watchingTask ? taskSource : undefined, watchingTask ? 1 : null)
  noticeRef.current = task.notice

  useEffect(() => {
    saveShellState(shell)
  }, [shell])

  useEffect(() => () => lanyin.dispose(), [lanyin])

  const activeGame = screen.kind === 'game' ? GAME_REGISTRY.find((entry) => entry.manifest.id === screen.gameId) : undefined

  const services = useMemo<GameServices>(() => {
    const store: Record<string, unknown> = { ...shell.preferences, stats: shell.stats }
    return {
      lanyinAvailable: () => lanyin.getSnapshot().modelLive,
      lanyinRemark: (event, context) => { lanyin.remark(event, context) },
      saveState: (state) => {
        if (activeGame === undefined) return
        saveSlot(activeGame.manifest.id, state)
      },
      loadState: <S,>() => {
        if (activeGame === undefined) return null
        return loadSlot(activeGame.manifest.id) as S | null
      },
      taskNotice: () => noticeRef.current,
      clearTaskNotice: () => { task.clear() },
      getPreference: (key) => store[key],
      setPreferences: (patch) => {
        Object.assign(store, patch)
        setShell((previous) => ({ ...previous, preferences: { ...previous.preferences, ...patch } as PlayerPreferences }))
      },
      reportMatchResult: ({ won, draw }) => {
        setShell((previous) => ({
          ...previous,
          stats: {
            ...previous.stats,
            matchesPlayed: previous.stats.matchesPlayed + 1,
            matchesWon: previous.stats.matchesWon + (won && !draw ? 1 : 0),
            handsPlayed: previous.stats.handsPlayed + 1,
            rapport: Math.min(100, previous.stats.rapport + (won ? 3 : 2)),
          },
        }))
      },
    }
  }, [activeGame, lanyin, shell.preferences, shell.stats, task])

  const closeAll = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !open || event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      event.preventDefault()
      if (screen.kind === 'game') setScreen({ kind: 'lobby' })
      else closeAll()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeAll, open, screen.kind])

  const expression = lanyinState.expression
  const stats: PlayerStats = shell.stats

  return (
    <div className="dth-root" data-preview={preview ? 'true' : 'false'}>
      <style id={STYLE_ELEMENT_ID}>{TEAHOUSE_STYLES}</style>
      <style id="dsh-teahouse-game-styles">{GAME_STYLES}</style>

      {!open && (
        <button className="dth-launcher" type="button" onClick={() => { setOpen(true) }} aria-label="打开茶歇间">
          <span className="dth-launcher-art" style={{ backgroundImage: `url(${LANYIN_HARBOR_ART})` }} />
          <span className="dth-launcher-copy">
            <strong>茶歇间</strong>
            <small>{lanyinState.modelLive ? `澜音 ${EXPRESSION_FACE[expression]} 候着` : '和澜音歇一手'}</small>
          </span>
          {task.notice !== null && <span className="dth-launcher-badge" aria-label="DSH 任务有新状态" />}
        </button>
      )}

      {open && (
        <div className="dth-overlay" role="dialog" aria-modal="true" aria-label="DSH 茶歇间">
          <main className="dth-shell" style={{ '--dth-accent': (activeGame?.manifest.accent ?? 195) } as React.CSSProperties}>
            <header className="dth-topbar">
              <div className="dth-brand">
                <Mark />
                <span><strong>{screen.kind === 'game' && activeGame !== undefined ? activeGame.manifest.title : 'DSH 茶歇间'}</strong><small>TEAHOUSE · 精品小游戏馆</small></span>
              </div>
              {screen.kind === 'game' && activeGame !== undefined && (
                <nav className="dth-top-actions">
                  <button type="button" className="dth-text-button" onClick={() => setScreen({ kind: 'lobby' })}>← 大厅</button>
                </nav>
              )}
              <div className="dth-top-right">
                <span className="dth-stats" aria-label="茶歇统计">
                  {stats.matchesPlayed > 0 ? `${stats.matchesPlayed} 局 · 胜 ${stats.matchesWon}` : '第一局还没开张'}
                </span>
                <button type="button" className="dth-close-button" onClick={closeAll} aria-label="收起茶歇间">—</button>
              </div>
            </header>

            {task.notice !== null && (
              <section className="dth-task-notice" aria-live="polite">
                <Mark />
                <span>
                  <strong>{task.notice === 'done' ? 'DSH 的任务完成了' : 'DSH 正在等你处理'}</strong>
                  <small>{task.notice === 'done' ? '这局打完再回去也来得及。' : '牌局已经存好，随时可以切回任务。'}</small>
                </span>
                <button type="button" onClick={task.clear}>知道了</button>
              </section>
            )}

            <div className="dth-body">
              {screen.kind === 'lobby' ? (
                <Lobby
                  lanyinState={lanyinState}
                  stats={stats}
                  onPick={(gameId) => setScreen({ kind: 'game', gameId })}
                />
              ) : activeGame === undefined ? (
                <p className="dth-empty">这款游戏不在今天的茶单上。</p>
              ) : (
                <Suspense fallback={<p className="dth-empty">正在沏茶……</p>}>
                  <activeGame.View services={services} preview={preview} />
                </Suspense>
              )}
            </div>

            {shell.shell.lanyinDock && (
              <Suspense fallback={null}>
                <LanyinDock lanyin={lanyin} />
              </Suspense>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function Lobby({ lanyinState, stats, onPick }: {
  lanyinState: ReturnType<LanyinService['getSnapshot']>
  stats: PlayerStats
  onPick: (gameId: string) => void
}): React.JSX.Element {
  return (
    <div className="dth-lobby">
      <section className="dth-lobby-hero" style={{ backgroundImage: `url(${LANYIN_HARBOR_ART})` }}>
        <div className="dth-lobby-hero-copy">
          <span className="dth-lobby-face" role="img" aria-label={`澜音：${EXPRESSION_LABELS[lanyinState.expression]}`}>
            {EXPRESSION_FACE[lanyinState.expression]}
          </span>
          <div>
            <h1>等任务的这一刻，喝口茶</h1>
            <p>{lanyinState.modelLive ? '澜音在桌边等你，随时聊两句。' : '澜音在打盹（模型未连接），牌照打。'}</p>
          </div>
        </div>
      </section>

      <section className="dth-lobby-grid" aria-label="游戏列表">
        {GAME_REGISTRY.map(({ manifest }) => {
          const hasSave = slotExists(manifest.id)
          return (
            <button key={manifest.id} type="button" className={`dth-game-card${manifest.cover !== undefined ? ' has-art' : ''}`} style={{ '--dth-card-accent': manifest.accent } as React.CSSProperties} onClick={() => { onPick(manifest.id) }}>
              {manifest.cover !== undefined && <span className="dth-game-card-art" aria-hidden="true" style={{ backgroundImage: `url(${manifest.cover})` }} />}
              <span className="dth-game-glyph" aria-hidden="true">{manifest.glyph}</span>
              <span className="dth-game-copy">
                <strong>{manifest.title}{hasSave && <em className="dth-game-resume">有存档</em>}</strong>
                <small>{manifest.tagline}</small>
                <small className="dth-game-why">{manifest.why}</small>
                <span className="dth-game-tags">
                  <i>{manifest.duration}</i>
                  <i>{intensityLabel(manifest.intensity)}</i>
                </span>
              </span>
              <span className="dth-game-go" aria-hidden="true">→</span>
            </button>
          )
        })}
      </section>

      <p className="dth-lobby-foot">
        茶单由维护者亲自试玩收录 · {DEFAULT_SHELL_PREFERENCES.lanyinDock ? '' : ''}
        {stats.rapport > 0 ? `与澜音的默契 ${stats.rapport}` : '先来一局认识澜音'}
      </p>
    </div>
  )
}

function intensityLabel(intensity: 'light' | 'medium' | 'heavy'): string {
  if (intensity === 'light') return '轻松'
  if (intensity === 'medium') return '适中'
  return '烧脑'
}

export { DEFAULT_PREFERENCES, DEFAULT_STATS }
