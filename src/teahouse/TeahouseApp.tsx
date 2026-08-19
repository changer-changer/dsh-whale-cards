/**
 * TeahouseApp — the shell every teahouse game lives in.
 *
 * Owns the launcher, the curated lobby, the game container with per-game
 * saves, the non-blocking task notice and the Lanyin dock. Games receive a
 * GameServices face and never learn how any of this is wired.
 *
 * @module teahouse/TeahouseApp
 */

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { TEAHOUSE_GAMES_ART, TEAHOUSE_HARBOR_ART } from '../client/generated/art.ts'
import type { PlayerPreferences, PlayerStats } from '../game/persistence.ts'
import { DEFAULT_PREFERENCES, DEFAULT_STATS } from '../game/persistence.ts'
import type { TaskListSource } from '../ui/task-status.ts'
import { useTaskNotice } from '../ui/task-status.ts'
import { LanyinDock } from './LanyinDock.tsx'
import { LanyinService } from './lanyin/service.ts'
import { EXPRESSION_LABELS, type LanyinExpression } from './lanyin/persona.ts'
import { GAME_REGISTRY } from './registry.ts'
import {
  DEFAULT_SHELL_PREFERENCES,
  loadShellState,
  loadSlot,
  saveShellState,
  saveSlot,
  type ShellState,
} from './storage.ts'
import type { GameServices } from './types.ts'
import { TEAHOUSE_STYLES, STYLE_ELEMENT_ID } from './teahouse-styles.ts'

const FULLSCREEN_KEY = 'dsh-teahouse:fullscreen:v1'
const DOCK_COLLAPSED_KEY = 'dsh-teahouse:dock-collapsed:v1'

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* best-effort */
  }
}

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

class GameBoundary extends Component<{ children: ReactNode; onBack: () => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <section className="dth-load-failure" role="alert">
        <span className="dth-kicker">GAME MODULE INTERRUPTED</span>
        <strong>这一桌暂时没摆好</strong>
        <p>存档仍然安全。先回大厅，再重新进入这款游戏。</p>
        <button type="button" className="dth-primary-button" onClick={this.props.onBack}>返回大厅</button>
      </section>
    )
  }
}

export function TeahouseApp({ initiallyOpen, preview = false, taskSource, lanyin }: TeahouseAppProps): React.JSX.Element {
  const [open, setOpen] = useState(initiallyOpen ?? false)
  const [screen, setScreen] = useState<Screen>(() => (initiallyOpen === true ? { kind: 'lobby' } : { kind: 'lobby' }))
  const [shell, setShell] = useState<ShellState>(() => loadShellState())
  const [fullscreen, setFullscreen] = useState(() => readFlag(FULLSCREEN_KEY, false))
  const [dockCollapsed, setDockCollapsed] = useState(() => readFlag(DOCK_COLLAPSED_KEY, false))
  const lanyinState = useSyncExternalStore(lanyin.subscribe, lanyin.getSnapshot)
  const noticeRef = useRef<'done' | 'needs_input' | null>(null)
  const deliveredTaskNotice = useRef<'done' | 'needs_input' | null>(null)

  const watchingTask = screen.kind === 'game' || open
  const task = useTaskNotice(watchingTask ? taskSource : undefined, watchingTask ? 1 : null)
  noticeRef.current = task.notice

  useEffect(() => {
    if (task.notice === deliveredTaskNotice.current) return
    deliveredTaskNotice.current = task.notice
    if (task.notice !== null) {
      void lanyin.notifyTask(
        task.notice,
        task.notice === 'done' ? '用户当前在茶歇间，DSH 任务刚刚完成。' : '用户当前在茶歇间，DSH 任务正在等待输入。',
      )
    }
  }, [lanyin, task.notice])

  useEffect(() => {
    saveShellState(shell)
  }, [shell])

  useEffect(() => () => lanyin.dispose(), [lanyin])

  const activeGame = screen.kind === 'game' ? GAME_REGISTRY.find((entry) => entry.manifest.id === screen.gameId) : undefined
  const defaultGame = GAME_REGISTRY.find((entry) => entry.manifest.id === shell.shell.defaultGameId) ?? GAME_REGISTRY[0]

  // `services` must keep a stable identity: games put it in effect dependency
  // arrays, and a fresh object on every shell render restarts their turn logic.
  const activeGameRef = useRef(activeGame)
  activeGameRef.current = activeGame
  const shellRef = useRef(shell)
  shellRef.current = shell
  const taskClearRef = useRef(task.clear)
  taskClearRef.current = task.clear
  const prefStoreRef = useRef<Record<string, unknown>>({})
  prefStoreRef.current = { ...shell.preferences, ...shell.shell, stats: shell.stats }

  const services = useMemo<GameServices>(() => ({
    lanyinAvailable: () => lanyin.getSnapshot().modelLive,
    lanyinRemark: (event, context) => { lanyin.remark(event, context) },
    playMode: () => shellRef.current.shell.playMode,
    beginAgentGame: (input) => shellRef.current.shell.playMode === 'agent' ? lanyin.beginGameAgent(input) : Promise.resolve(false),
    chooseAgentAction: (input) => shellRef.current.shell.playMode === 'agent' ? lanyin.chooseGameAction(input) : Promise.resolve(null),
    endAgentGame: (summary) => lanyin.endGameAgent(summary),
    saveState: (state) => {
      const game = activeGameRef.current
      if (game === undefined) return
      saveSlot(game.manifest.id, state)
    },
    loadState: <S,>() => {
      const game = activeGameRef.current
      if (game === undefined) return null
      return loadSlot(game.manifest.id) as S | null
    },
    taskNotice: () => noticeRef.current,
    clearTaskNotice: () => { taskClearRef.current() },
    getPreference: (key) => prefStoreRef.current[key],
    setPreferences: (patch) => {
      Object.assign(prefStoreRef.current, patch)
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
  }), [lanyin])

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
    <div className="dth-root" data-preview={preview ? 'true' : 'false'} data-fullscreen={fullscreen ? 'true' : 'false'}>
      <style id={STYLE_ELEMENT_ID}>{TEAHOUSE_STYLES}</style>

      {!open && (
        <div className="dth-launcher-cluster">
          <button className="dth-launcher" type="button" onClick={() => { setScreen({ kind: 'lobby' }); setOpen(true) }} aria-label="打开茶歇间大厅">
            <span className="dth-launcher-art" style={{ backgroundImage: `url(${TEAHOUSE_HARBOR_ART})` }} />
            <span className="dth-launcher-copy">
              <strong>茶歇间</strong>
              <small>{lanyinState.modelLive ? `鲸鱼娘澜音 ${EXPRESSION_FACE[expression]} 候着` : '去港湾找澜音'}</small>
            </span>
            {task.notice !== null && <span className="dth-launcher-badge" aria-label="DSH 任务有新状态" />}
          </button>
          <button
            className="dth-launcher-quick"
            type="button"
            onClick={() => {
              if (defaultGame === undefined) return
              setScreen({ kind: 'game', gameId: defaultGame.manifest.id })
              setOpen(true)
            }}
            aria-label={`直接进入默认游戏：${defaultGame?.manifest.title ?? '茶歇间'}`}
            title={`一键进入 ${defaultGame?.manifest.title ?? '默认游戏'}`}
          >
            <span aria-hidden="true">▶</span>
            <small>直达</small>
          </button>
        </div>
      )}

      {open && (
        <div className="dth-overlay" role="dialog" aria-modal="true" aria-label="DSH 茶歇间">
          <main className="dth-shell" style={{ '--dth-accent': (activeGame?.manifest.accent ?? 195) } as React.CSSProperties}>
            <header className="dth-topbar">
              <div className="dth-brand">
                <Mark />
                <span><strong>{screen.kind === 'game' && activeGame !== undefined ? activeGame.manifest.title : '深夜港湾'}</strong><small>DSH TEAHOUSE · CURATED PLAY</small></span>
              </div>
              {screen.kind === 'game' && activeGame !== undefined && (
                <nav className="dth-top-actions">
                  <button type="button" className="dth-text-button" onClick={() => setScreen({ kind: 'lobby' })}>← 大厅</button>
                </nav>
              )}
              <div className="dth-top-right">
                <span className="dth-live-dot"><i /> OPEN LATE</span>
                <span className="dth-stats" aria-label="茶歇统计">
                  {stats.matchesPlayed > 0 ? `${stats.matchesPlayed} 局 · 胜 ${stats.matchesWon}` : '第一局还没开张'}
                </span>
                <button
                  type="button"
                  className="dth-fullscreen-button"
                  onClick={() => { setFullscreen((v) => { writeFlag(FULLSCREEN_KEY, !v); return !v }) }}
                  aria-pressed={fullscreen}
                  aria-label={fullscreen ? '退出全屏' : '茶歇间全屏'}
                  title={fullscreen ? '退出全屏' : '全屏'}
                >
                  {fullscreen ? '⤡' : '⤢'}
                </button>
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
                <button type="button" onClick={() => { task.clear(); closeAll() }}>返回任务</button>
              </section>
            )}

            <div className={`dth-body dth-body--${screen.kind}`}>
              {screen.kind === 'lobby' ? (
                <Lobby
                  lanyinState={lanyinState}
                  stats={stats}
                  defaultGameId={defaultGame?.manifest.id ?? 'gin-rummy'}
                  playMode={shell.shell.playMode}
                  onPick={(gameId) => setScreen({ kind: 'game', gameId })}
                  onDefaultGame={(defaultGameId) => setShell((previous) => ({ ...previous, shell: { ...previous.shell, defaultGameId } }))}
                  onPlayMode={(playMode) => setShell((previous) => ({ ...previous, shell: { ...previous.shell, playMode } }))}
                />
              ) : activeGame === undefined ? (
                <p className="dth-empty">这款游戏不在今天的茶单上。</p>
              ) : (
                <GameBoundary key={`${activeGame.manifest.id}:${shell.shell.playMode}`} onBack={() => setScreen({ kind: 'lobby' })}>
                  <Suspense fallback={<div className="dth-game-loading" role="status"><span /><strong>正在摆好这一桌</strong><small>装载规则、存档与港湾灯光…</small></div>}>
                    <activeGame.View services={services} preview={preview} />
                  </Suspense>
                </GameBoundary>
              )}
            </div>

            {shell.shell.lanyinDock && (
              <Suspense fallback={null}>
                <LanyinDock
                  lanyin={lanyin}
                  collapsed={dockCollapsed}
                  onToggleCollapsed={() => { setDockCollapsed((v) => { writeFlag(DOCK_COLLAPSED_KEY, !v); return !v }) }}
                />
              </Suspense>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function Lobby({ lanyinState, stats, defaultGameId, playMode, onPick, onDefaultGame, onPlayMode }: {
  lanyinState: ReturnType<LanyinService['getSnapshot']>
  stats: PlayerStats
  defaultGameId: string
  playMode: 'classic' | 'agent'
  onPick: (gameId: string) => void
  onDefaultGame: (gameId: string) => void
  onPlayMode: (mode: 'classic' | 'agent') => void
}): React.JSX.Element {
  return (
    <div className="dth-lobby">
      <section className="dth-lobby-hero" style={{ backgroundImage: `url(${TEAHOUSE_HARBOR_ART})` }}>
        <div className="dth-lobby-edition"><span>08 / 19</span><i />雨夜茶单</div>
        <div className="dth-lobby-hero-copy">
          <span className="dth-lobby-face" role="img" aria-label={`鲸鱼娘澜音：${EXPRESSION_LABELS[lanyinState.expression]}`}>
            {EXPRESSION_FACE[lanyinState.expression]}
          </span>
          <div>
            <span className="dth-kicker">A ROOM BETWEEN TASKS</span>
            <h1>让脑子换一种方式醒着</h1>
            <p>{lanyinState.modelLive ? '鲸鱼娘澜音已经温好茶，也替你听着 DSH 的回声。选一桌，十分钟后再返航。' : '澜音暂时在听远处的鲸歌，但今晚的每一桌仍然可以独立开局。'}</p>
          </div>
        </div>
      </section>

      <div className="dth-section-heading"><div><span className="dth-kicker">TONIGHT'S TABLES</span><h2>今晚玩什么</h2></div><p>每款都能随时存下，任务有动静时立刻回去。</p></div>

      <section className="dth-play-config" aria-label="茶歇游玩设置">
        <div className="dth-mode-switch" role="group" aria-label="对手模式">
          <button type="button" className={playMode === 'classic' ? 'active' : ''} onClick={() => onPlayMode('classic')}>
            <strong>经典模式</strong><small>本地逻辑 · 不消耗 Token</small>
          </button>
          <button type="button" className={playMode === 'agent' ? 'active' : ''} disabled={!lanyinState.modelLive} onClick={() => onPlayMode('agent')}>
            <strong>澜音 Agent</strong><small>{lanyinState.modelLive ? '真人感对局 · 会消耗 Token' : '先在下方接入模型'}</small>
          </button>
        </div>
        <label className="dth-default-game">
          <span><strong>悬浮窗一键直达</strong><small>右侧小按钮会直接进入这款游戏</small></span>
          <select value={defaultGameId} onChange={(event) => onDefaultGame(event.target.value)} aria-label="默认直达游戏">
            {GAME_REGISTRY.map(({ manifest }) => <option key={manifest.id} value={manifest.id}>{manifest.title}</option>)}
          </select>
        </label>
      </section>

      <section className="dth-lobby-grid" aria-label="游戏列表">
        {GAME_REGISTRY.map(({ manifest, hasSave: readHasSave }, index) => {
          const hasSave = readHasSave()
          return (
            <button key={manifest.id} type="button" className={`dth-game-card${index === 0 ? ' featured' : ''}`} style={{ '--dth-card-accent': manifest.accent, '--dth-card-art': `url(${index === 0 ? TEAHOUSE_HARBOR_ART : TEAHOUSE_GAMES_ART})` } as React.CSSProperties} onClick={() => { onPick(manifest.id) }} aria-label={`${hasSave ? '继续' : '开始'}${manifest.title}`}>
              <span className="dth-game-card-art" aria-hidden="true"><i>{manifest.glyph}</i></span>
              <span className="dth-game-copy">
                <span className="dth-game-index">0{index + 1} · {intensityLabel(manifest.intensity)}</span>
                <strong>{manifest.title}{hasSave && <em className="dth-game-resume">继续</em>}</strong>
                <small className="dth-game-tagline">{manifest.tagline}</small>
                <small className="dth-game-why">{manifest.why}</small>
                <span className="dth-game-tags">
                  <i>{manifest.duration}</i>
                  <i>{hasSave ? '进度已保存' : '新牌局'}</i>
                </span>
              </span>
              <span className="dth-game-go" aria-hidden="true">入座 <i>↗</i></span>
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
