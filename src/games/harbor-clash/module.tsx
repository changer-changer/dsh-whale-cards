/**
 * Harbor Clash — Gwent-style duel as a teahouse GameModule.
 *
 * The pure engine (./engine.ts) drives every transition; this module only
 * adapts it to the shared shell: the per-game save slot, keyboard controls,
 * the Lanyin dock remarks and result reporting.
 *
 * @module games/harbor-clash/module
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameModule, GameServices, GameViewProps } from '../../teahouse/types.ts'
import { clearSlot, loadSlot, saveSlot, slotExists } from '../../teahouse/storage.ts'
import {
  KIND_LABEL,
  aiDecide,
  boardPower,
  createMatch,
  nextRound,
  pass,
  playCard,
  type ClashCard,
  type ClashState,
  type Player,
} from './engine.ts'

const GAME_ID = 'harbor-clash'

const PLAYER_LABEL: Readonly<Record<Player, string>> = { human: '玩家', lanyin: '澜音' }
const KIND_MARK: Readonly<Record<ClashCard['kind'], string>> = {
  unit: '',
  horn: '✦',
  draw: '⛵',
  fog: '🌫',
}

function situationLine(state: ClashState): string {
  return `正在打港湾对决：第 ${state.round}/3 小局，玩家 ${state.scores.human} 胜，澜音 ${state.scores.lanyin} 胜，玩家 ${boardPower(state, 'human')} 点 vs 澜音 ${boardPower(state, 'lanyin')} 点。`
}

function remarkFor(state: ClashState, services: GameServices): void {
  if (state.phase === 'match_over') {
    if (state.matchWinner === null) services.lanyinRemark('match_draw', `${state.lastEvent}（港湾对决，${situationLine(state)}）`)
    else if (state.matchWinner === 'human') services.lanyinRemark('match_win', `${state.lastEvent}（港湾对决，${situationLine(state)}）`)
    else services.lanyinRemark('match_loss', `${state.lastEvent}（港湾对决，${situationLine(state)}）`)
    return
  }
  if (state.phase === 'round_end') {
    if (state.roundWinner === null) services.lanyinRemark('round_draw', state.lastEvent ?? '本小局平局。')
    else if (state.roundWinner === 'human') services.lanyinRemark('good_move', state.lastEvent ?? '本小局胜出。')
    else services.lanyinRemark('ai_good_move', state.lastEvent ?? '本小局澜音胜出。')
    return
  }
  if (state.lastEvent !== null) services.lanyinRemark('play', `${state.lastEvent}（${situationLine(state)}）`)
}

function useHarborClashGame(services: GameServices) {
  const [state, setState] = useState<ClashState | null>(() => loadSlot(GAME_ID) as ClashState | null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden')

  useEffect(() => {
    saveSlot(GAME_ID, state)
  }, [state])

  useEffect(() => {
    const onVisibility = (): void => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const commit = useCallback((next: ClashState) => {
    setState(next)
    remarkFor(next, services)
    if (next.phase === 'match_over' && state !== null && state.phase !== 'match_over') {
      services.reportMatchResult({
        won: next.matchWinner === 'human',
        draw: next.matchWinner === null,
      })
    }
  }, [services, state])

  // Lanyin's turn: decide after a short pause, respecting visibility.
  useEffect(() => {
    if (!documentVisible || state === null || state.phase !== 'play' || state.turn !== 'lanyin') {
      setAiThinking(false)
      return
    }
    setAiThinking(true)
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'hidden' || state === null) return
      try {
        const decision = aiDecide(state)
        if (decision.kind === 'play' && decision.cardId !== null) commit(playCard(state, 'lanyin', decision.cardId))
        else commit(pass(state, 'lanyin'))
        setSelectedId(null)
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '澜音暂时没接住这手牌。')
      } finally {
        setAiThinking(false)
      }
    }, 620)
    return () => {
      window.clearTimeout(timer)
      setAiThinking(false)
    }
  }, [state, commit, documentVisible])

  const startMatch = useCallback(() => {
    setState(createMatch())
    setSelectedId(null)
    setError(null)
    services.lanyinRemark('new_game', '开一局港湾对决：三局两胜，出牌或过牌，战力高者赢下小局。')
  }, [services])

  const play = useCallback((cardId: string) => {
    if (state === null) return
    try {
      commit(playCard(state, 'human', cardId))
      setSelectedId(null)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这张牌现在还不能出。')
    }
  }, [state, commit])

  const passRound = useCallback(() => {
    if (state === null) return
    try {
      commit(pass(state, 'human'))
      setSelectedId(null)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '现在还不能过牌。')
    }
  }, [state, commit])

  const advance = useCallback(() => {
    if (state === null) return
    try {
      commit(nextRound(state))
      setSelectedId(null)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下一小局暂时无法开始。')
    }
  }, [state, commit])

  return {
    aiThinking, error, state, selectedId,
    setSelectedId, startMatch, play, passRound, advance, clearError: () => setError(null),
  }
}

function FieldRow({ player, state }: { player: Player; state: ClashState }): React.JSX.Element {
  const side = state.sides[player]
  const isHuman = player === 'human'
  return (
    <section className={`dth-clash-side${isHuman ? ' mine' : ' theirs'}`} aria-label={`${PLAYER_LABEL[player]}的战场`}>
      <div className="dth-clash-side-meta">
        <span className="dth-clash-side-name">{PLAYER_LABEL[player]}{isHuman ? '' : '（盖牌手牌）'}</span>
        {!isHuman && <span className="dth-clash-hand-count">手牌 {side.hand.length}</span>}
        {side.fogged && <span className="dth-clash-badge fog" title="雾灯瞄准中：下一张出牌战力 -2">🌫 雾灯</span>}
        {side.passed && <span className="dth-clash-badge passed" title="本小局已免战">已过牌</span>}
        <span className="dth-clash-power">战力 <strong>{boardPower(state, player)}</strong></span>
      </div>
      <div className="dth-clash-field" role="list">
        {side.field.length === 0 && <span className="dth-clash-empty">战场空空如也</span>}
        {side.field.map((card) => (
          <div className="dth-clash-field-card" key={card.id} role="listitem">
            <span className="dth-clash-field-power">{card.power}</span>
            <span className="dth-clash-field-name">{card.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function HarborClashView({ services }: GameViewProps): React.JSX.Element {
  const game = useHarborClashGame(services)
  const { state } = game

  // Keyboard: 1-9 selects a hand card, Enter plays it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      if (state === null || state.phase !== 'play' || state.turn !== 'human') return
      if (/^[0-9]$/.test(event.key)) {
        const index = event.key === '0' ? 9 : Number(event.key) - 1
        const card = state.sides.human.hand[index]
        if (card !== undefined) {
          event.preventDefault()
          game.setSelectedId(card.id)
        }
        return
      }
      if (event.key === 'Enter' && game.selectedId !== null) {
        event.preventDefault()
        game.play(game.selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state, game])

  if (state === null) {
    return (
      <div className="dth-clash-intro">
        <div className="dth-clash-glyph" aria-hidden="true">🌊</div>
        <h2>港湾对决</h2>
        <p>昆特式三局两胜卡牌对决。双方各 10 张手牌，出牌或过牌；每小局战力高者获胜，先赢两局者赢得比赛。</p>
        <p className="dth-clash-hint">
          特殊牌：<strong>✦ 港务长</strong>在场牌 +1 · <strong>⛵ 信风商船</strong>出牌时抽 1 · <strong>🌫 雾灯</strong>对方下一张 -2
        </p>
        <button type="button" className="dth-primary-button" onClick={game.startMatch}>开始对决</button>
      </div>
    )
  }

  const mine = state.sides.human
  const myTurn = state.phase === 'play' && state.turn === 'human' && !mine.passed
  const roundDots = Array.from({ length: 3 }, (_, index) => index < state.round)

  return (
    <div className="dth-clash">
      {game.error !== null && (
        <div className="dwc-error" role="alert">
          <span>{game.error}</span>
          <button type="button" onClick={game.clearError} aria-label="关闭提示">×</button>
        </div>
      )}
      <header className="dth-clash-header">
        <div className="dth-clash-rounds" aria-label={`第 ${state.round} 小局，共 3 小局`}>
          {roundDots.map((lit, index) => <span key={index} className={lit ? 'lit' : ''} aria-hidden="true">◉</span>)}
        </div>
        <div className="dth-clash-score">
          <span>玩家 <strong>{state.scores.human}</strong></span>
          <span className="sep">:</span>
          <span><strong>{state.scores.lanyin}</strong> 澜音</span>
        </div>
        <div className="dth-clash-turn">
          {state.phase === 'play' ? (myTurn ? '轮到你出牌' : game.aiThinking ? '澜音正在思量…' : '澜音出牌中') : state.phase === 'round_end' ? '小局结束' : '比赛结束'}
        </div>
      </header>

      <FieldRow player="lanyin" state={state} />

      <div className="dth-clash-divider" aria-hidden="true">· · ·</div>

      <FieldRow player="human" state={state} />

      <section className="dth-clash-hand" aria-label="你的手牌">
        {mine.hand.length === 0 && <span className="dth-clash-empty">手牌已出完</span>}
        {mine.hand.map((card, index) => {
          const selected = game.selectedId === card.id
          return (
            <button
              key={card.id}
              type="button"
              className={`dth-clash-hand-card${selected ? ' selected' : ''}${card.kind !== 'unit' ? ` kind-${card.kind}` : ''}`}
              onClick={() => { game.setSelectedId(selected ? null : card.id) }}
              disabled={!myTurn}
              aria-label={`${card.name}，${card.power} 战力${KIND_LABEL[card.kind] !== '战力牌' ? `，${KIND_LABEL[card.kind]}` : ''}${selected ? '，已选中' : ''}`}
            >
              <span className="dth-clash-hand-power">{card.power}</span>
              <span className="dth-clash-hand-name">{card.name}</span>
              {KIND_MARK[card.kind] !== '' && <span className="dth-clash-hand-kind" aria-hidden="true">{KIND_MARK[card.kind]}</span>}
            </button>
          )
        })}
      </section>

      <footer className="dth-clash-actions">
        {state.phase === 'play' && (
          <>
            <button type="button" className="dth-primary-button" onClick={() => { if (game.selectedId !== null) game.play(game.selectedId) }} disabled={!myTurn || game.selectedId === null}>
              出牌{game.selectedId !== null ? `（${mine.hand.find((c) => c.id === game.selectedId)?.name ?? ''}）` : '：先选一张牌'}
            </button>
            <button type="button" className="dth-text-button" onClick={game.passRound} disabled={!myTurn}>
              过牌（免战本小局）
            </button>
          </>
        )}
        {state.phase === 'round_end' && (
          <button type="button" className="dth-primary-button" onClick={game.advance}>
            下一小局（第 {state.round + 1}/3）
          </button>
        )}
        {state.phase === 'match_over' && (
          <>
            <p className={`dth-clash-result${state.matchWinner === 'human' ? ' win' : state.matchWinner === null ? ' draw' : ' loss'}`} role="status">
              {state.matchWinner === null ? '比赛平局' : state.matchWinner === 'human' ? '你赢得了港湾对决！' : '澜音赢得了比赛'}
              <span className="dth-clash-result-score">{state.scores.human} : {state.scores.lanyin}</span>
            </p>
            <button type="button" className="dth-primary-button" onClick={game.startMatch}>再来一局</button>
          </>
        )}
      </footer>
    </div>
  )
}

export const harborClashGame: GameModule = {
  manifest: {
    id: GAME_ID,
    title: '港湾对决',
    tagline: '昆特式三局两胜卡牌对决',
    duration: '5–8 分钟',
    intensity: 'medium',
    why: '出牌或过牌，三局两胜。16 张港湾卡牌，四种能力，考验时机与判断。',
    glyph: '🌊',
    accent: 262,
  },
  hasSave: () => slotExists(GAME_ID),
  clearSave: () => clearSlot(GAME_ID),
  View: HarborClashView,
}

export type { GameServices }