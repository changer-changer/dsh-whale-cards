/** Tide Relics — a push-your-luck collection duel for short DSH breaks. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TEAHOUSE_GAMES_ART } from '../../client/generated/art.ts'
import type { GameModule, GameServices, GameViewProps } from '../../teahouse/types.ts'
import { clearSlot, loadSlot, saveSlot } from '../../teahouse/storage.ts'
import {
  FAMILY_LABEL,
  PERIL_LABEL,
  aiDecide,
  bank,
  bustRisk,
  createMatch,
  dive,
  isTideState,
  nextRound,
  voyageScore,
  type PerilKind,
  type TideCard,
  type TideState,
  type TreasureFamily,
} from './engine.ts'

const GAME_ID = 'harbor-pairs'
const AGENT_RULES = '三轮潜航对决。每次可以继续潜航翻一张牌，或收帆保存本轮分数；同一种险象第二次出现会翻船并失去本轮全部收获。同类宝物越多，连携加分越高。你只能从本轮给出的合法动作中选择。'

interface TideSave {
  readonly version: 2
  readonly state: TideState | null
  readonly bestScore: number
}

const FAMILY_MARK: Readonly<Record<TreasureFamily, string>> = {
  pearl: '珠',
  coral: '珊',
  light: '灯',
  map: '图',
}

const PERIL_MARK: Readonly<Record<PerilKind, string>> = {
  squall: '风',
  reef: '礁',
  undertow: '涡',
}

function loadSave(): TideSave {
  const stored = loadSlot(GAME_ID) as Partial<TideSave> | TideState | null
  if (stored !== null && 'state' in stored && (stored.state === null || isTideState(stored.state))) {
    return { version: 2, state: stored.state, bestScore: typeof stored.bestScore === 'number' ? stored.bestScore : 0 }
  }
  if (isTideState(stored)) return { version: 2, state: stored, bestScore: 0 }
  return { version: 2, state: null, bestScore: 0 }
}

function scoreLabel(state: TideState): string {
  const current = voyageScore(state.voyage.cards)
  return `第 ${state.round}/3 轮，${state.turn === 'human' ? '玩家' : '澜音'}潜航中，暂得 ${current} 分，翻船风险 ${Math.round(bustRisk(state) * 100)}%。`
}

function remarkFor(state: TideState, services: GameServices): void {
  if (state.phase === 'match_over') {
    const event = state.winner === 'human' ? 'match_win' : state.winner === 'lanyin' ? 'match_loss' : 'match_draw'
    services.lanyinRemark(event, `潮汐拾光结束：玩家 ${state.totalScores.human} 分，澜音 ${state.totalScores.lanyin} 分。`)
  } else if (state.phase === 'round_end') {
    services.lanyinRemark('round_end', state.lastEvent)
  } else {
    services.lanyinRemark('play', `${state.lastEvent} ${scoreLabel(state)}`)
  }
}

function useTideGame(services: GameServices) {
  const [save, setSave] = useState<TideSave>(loadSave)
  const [aiThinking, setAiThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumedAgentStarted = useRef(false)
  const state = save.state

  useEffect(() => { saveSlot(GAME_ID, save) }, [save])

  useEffect(() => {
    if (resumedAgentStarted.current || state === null || services.playMode() !== 'agent') return
    resumedAgentStarted.current = true
    void services.beginAgentGame({ gameId: GAME_ID, gameTitle: '潮汐拾光', rules: AGENT_RULES })
  }, [services, state])

  const commit = useCallback((next: TideState, previous: TideState | null) => {
    setSave((current) => ({
      ...current,
      state: next,
      bestScore: next.phase === 'match_over' ? Math.max(current.bestScore, next.totalScores.human) : current.bestScore,
    }))
    remarkFor(next, services)
    if (next.phase === 'match_over' && previous?.phase !== 'match_over') {
      resumedAgentStarted.current = false
      services.reportMatchResult({ won: next.winner === 'human', draw: next.winner === null })
      void services.endAgentGame(scoreLabel(next))
    }
  }, [services])

  useEffect(() => {
    if (state === null || state.phase !== 'play' || state.turn !== 'lanyin') {
      setAiThinking(false)
      return
    }
    setAiThinking(true)
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        let decision = aiDecide(state)
        if (services.playMode() === 'agent') {
          const agentDecision = await services.chooseAgentAction({
            situation: `${scoreLabel(state)} 你本轮已翻到：${state.voyage.cards.map((card) => card.category === 'treasure' ? `${FAMILY_LABEL[card.family]}${card.value}` : PERIL_LABEL[card.peril]).join('、') || '尚无卡牌'}。双方总分：玩家 ${state.totalScores.human}，你 ${state.totalScores.lanyin}。`,
            legalActions: [
              { id: 'dive', label: `继续潜航；当前翻船概率约 ${Math.round(bustRisk(state) * 100)}%` },
              { id: 'bank', label: `收帆并保存本轮 ${voyageScore(state.voyage.cards)} 分` },
            ],
          })
          if (agentDecision?.actionId === 'dive' || agentDecision?.actionId === 'bank') decision = agentDecision.actionId
        }
        if (cancelled) return
        const next = decision === 'bank' ? bank(state, 'lanyin') : dive(state, 'lanyin')
        commit(next, state)
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '潮水暂时看不清。')
      } finally {
        setAiThinking(false)
      }
    }, 540)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [commit, state])

  const start = useCallback(() => {
    const next = createMatch()
    commit(next, state)
    setError(null)
    if (services.playMode() === 'agent') {
      resumedAgentStarted.current = true
      void services.beginAgentGame({ gameId: GAME_ID, gameTitle: '潮汐拾光', rules: AGENT_RULES })
    }
    services.lanyinRemark('new_game', '潮汐拾光开始：三轮潜航，收集同类宝物能形成连携；险象重复会失去本轮收获。')
  }, [commit, services, state])

  const act = useCallback((kind: 'dive' | 'bank') => {
    if (state === null) return
    try {
      commit(kind === 'dive' ? dive(state, 'human') : bank(state, 'human'), state)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '现在还不能这么做。')
    }
  }, [commit, state])

  const advance = useCallback(() => {
    if (state === null) return
    try {
      commit(nextRound(state), state)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下一轮暂时无法开始。')
    }
  }, [commit, state])

  return { state, bestScore: save.bestScore, aiThinking, error, start, act, advance, clearError: () => setError(null) }
}

function TideCardView({ card, index }: { card: TideCard; index: number }): React.JSX.Element {
  if (card.category === 'peril') {
    return (
      <li className={`dth-tide-card peril peril-${card.peril}`} style={{ '--dth-tide-index': index } as React.CSSProperties}>
        <span className="dth-tide-card-mark">{PERIL_MARK[card.peril]}</span>
        <strong>{PERIL_LABEL[card.peril]}</strong>
        <small>再次出现会翻船</small>
      </li>
    )
  }
  return (
    <li className={`dth-tide-card treasure family-${card.family}`} style={{ '--dth-tide-index': index } as React.CSSProperties}>
      <span className="dth-tide-card-mark">{FAMILY_MARK[card.family]}</span>
      <strong>{FAMILY_LABEL[card.family]}</strong>
      <small>价值 {card.value}</small>
      <b>{card.value}</b>
    </li>
  )
}

function CollectionLedger({ cards }: { cards: readonly TideCard[] }): React.JSX.Element {
  const counts = useMemo(() => {
    const result: Record<TreasureFamily, number> = { pearl: 0, coral: 0, light: 0, map: 0 }
    for (const card of cards) if (card.category === 'treasure') result[card.family] += 1
    return result
  }, [cards])
  return (
    <div className="dth-tide-ledger" aria-label="本轮收藏连携">
      {(Object.keys(FAMILY_LABEL) as TreasureFamily[]).map((family) => (
        <span key={family} className={counts[family] > 0 ? 'active' : ''}>
          <i>{FAMILY_MARK[family]}</i>
          <small>{FAMILY_LABEL[family]}</small>
          <b>×{counts[family]}</b>
        </span>
      ))}
    </div>
  )
}

export function HarborPairsView({ services }: GameViewProps): React.JSX.Element {
  const game = useTideGame(services)
  const state = game.state

  if (state === null) {
    return (
      <section className="dth-game-intro dth-tide-intro" style={{ '--dth-game-art': `url(${TEAHOUSE_GAMES_ART})` } as React.CSSProperties}>
        <div className="dth-game-intro-copy">
          <span className="dth-kicker">PUSH YOUR LUCK · SET COLLECTION</span>
          <h2>潮汐拾光</h2>
          <p>潜得越深，收藏越值钱；但同一种险象第二次出现，本轮便会空手返港。</p>
          <ul className="dth-rule-chips" aria-label="游戏特点">
            <li>三轮决胜</li><li>同类连携</li><li>随时收帆</li>
          </ul>
          {game.bestScore > 0 && <p className="dth-personal-best">个人最佳 <strong>{game.bestScore}</strong> 分</p>}
          <button type="button" className="dth-primary-button" onClick={game.start}>开始潜航</button>
        </div>
      </section>
    )
  }

  const currentScore = voyageScore(state.voyage.cards)
  const risk = Math.round(bustRisk(state) * 100)
  const myTurn = state.phase === 'play' && state.turn === 'human'
  const totalPreview = {
    human: state.totalScores.human + state.bank.human,
    lanyin: state.totalScores.lanyin + state.bank.lanyin,
  }

  return (
    <section className="dth-tide" aria-label="潮汐拾光牌桌" style={{ '--dth-game-art': `url(${TEAHOUSE_GAMES_ART})` } as React.CSSProperties}>
      {game.error !== null && <div className="dth-inline-error" role="alert"><span>{game.error}</span><button type="button" onClick={game.clearError}>知道了</button></div>}
      <header className="dth-game-hud">
        <div><span className="dth-kicker">TIDE RELICS</span><strong>第 {state.round} / 3 轮</strong></div>
        <div className="dth-score-ribbon" aria-label="当前总分"><span>你 <b>{totalPreview.human}</b></span><i>:</i><span><b>{totalPreview.lanyin}</b> 澜音</span></div>
        <span className={`dth-turn-pill${myTurn ? ' active' : ''}`}>{state.phase === 'play' ? myTurn ? '你的潜航' : game.aiThinking ? '澜音正在判断…' : '澜音潜航' : '本轮已结算'}</span>
      </header>

      <div className="dth-tide-layout">
        <aside className="dth-tide-meter">
          <span className="dth-kicker">本次收获</span>
          <strong>{currentScore}<small> 分</small></strong>
          <div className="dth-risk" role="meter" aria-label="下一张翻船风险" aria-valuenow={risk} aria-valuemin={0} aria-valuemax={100}>
            <span><i style={{ width: `${risk}%` }} /></span>
            <small>翻船风险 {risk}%</small>
          </div>
          <p>{state.lastEvent}</p>
        </aside>

        <div className="dth-tide-voyage">
          <div className="dth-tide-waterline" aria-hidden="true"><span /><i /></div>
          {state.voyage.cards.length === 0
            ? <div className="dth-tide-empty"><span>水面尚静</span><small>揭开第一张潮牌，开始积累本轮收获。</small></div>
            : <ol className="dth-tide-cards">{state.voyage.cards.map((card, index) => <TideCardView key={card.id} card={card} index={index} />)}</ol>}
          <CollectionLedger cards={state.voyage.cards} />
        </div>
      </div>

      <footer className="dth-game-actions dth-tide-actions">
        {state.phase === 'play' && (
          <>
            <div className="dth-next-card" aria-hidden="true"><i /><span>{state.deck.length}</span></div>
            <div><strong>{myTurn ? '下一步由你决定' : '澜音正在权衡收益和风险'}</strong><small>同类宝物越多，连携分越高；四类齐全另加 5 分。</small></div>
            <button type="button" className="dth-secondary-button" onClick={() => game.act('bank')} disabled={!myTurn || currentScore === 0}>收帆 · 带回 {currentScore} 分</button>
            <button type="button" className="dth-primary-button" onClick={() => game.act('dive')} disabled={!myTurn}>继续下潜</button>
          </>
        )}
        {state.phase === 'round_end' && (
          <div className="dth-round-result" role="status">
            <span className="dth-kicker">ROUND COMPLETE</span>
            <strong>本轮 {state.lastRoundScores?.human ?? 0} : {state.lastRoundScores?.lanyin ?? 0}</strong>
            <small>{state.lastEvent}</small>
            <button type="button" className="dth-primary-button" onClick={game.advance}>进入第 {state.round + 1} 轮</button>
          </div>
        )}
        {state.phase === 'match_over' && (
          <div className="dth-round-result final" role="status">
            <span className="dth-kicker">VOYAGE COMPLETE</span>
            <strong>{state.winner === null ? '潮汐见证了一场平局' : state.winner === 'human' ? '你带回了更丰盛的收藏' : '澜音抢先读懂了潮水'}</strong>
            <small>最终得分 · 你 {state.totalScores.human} — {state.totalScores.lanyin} 澜音</small>
            <button type="button" className="dth-primary-button" onClick={game.start}>再潜一次</button>
          </div>
        )}
      </footer>
    </section>
  )
}

export const harborPairsGame: GameModule = {
  manifest: {
    id: GAME_ID,
    title: '潮汐拾光',
    tagline: '潜得更深，还是见好就收？',
    duration: '6–10 分钟',
    intensity: 'light',
    why: '三轮押运气收集战：同类连携会暴涨，但险象重复会让本轮归零。',
    glyph: '潮',
    accent: 174,
  },
  hasSave: () => loadSave().state !== null,
  clearSave: () => clearSlot(GAME_ID),
  View: HarborPairsView,
}

export type { GameServices }
