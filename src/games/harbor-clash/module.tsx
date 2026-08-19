/** Harbor Clash — a three-lane formation duel inside the teahouse shell. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { TEAHOUSE_GAMES_ART } from '../../client/generated/art.ts'
import type { GameModule, GameServices, GameViewProps } from '../../teahouse/types.ts'
import { clearSlot, loadSlot, saveSlot, slotExists } from '../../teahouse/storage.ts'
import {
  FORMATION_LABEL,
  SUIT_LABEL,
  aiDecide,
  claimedCount,
  createMatch,
  evaluateFormation,
  isClashState,
  playCard,
  type ClashCard,
  type ClashState,
  type Lane,
  type LaneId,
  type Player,
  type Suit,
} from './engine.ts'

const GAME_ID = 'harbor-clash'
const AGENT_RULES = '双方轮流把一张手牌部署到三条航线之一，每条航线每方最多三张。三张组成阵型后比较强弱；先控制两条航线获胜。你只能选择给出的合法部署。'

const SUIT_MARK: Readonly<Record<Suit, string>> = { tide: '≋', ember: '◇', mist: '○' }

function loadState(): ClashState | null {
  const stored = loadSlot(GAME_ID)
  return isClashState(stored) ? stored : null
}

function situationLine(state: ClashState): string {
  return `港湾对决三塔争夺：玩家控制 ${claimedCount(state, 'human')} 塔，澜音控制 ${claimedCount(state, 'lanyin')} 塔，${state.lastEvent}`
}

function useHarborClashGame(services: GameServices) {
  const [state, setState] = useState<ClashState | null>(loadState)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedLane, setSelectedLane] = useState<LaneId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const resumedAgentStarted = useRef(false)

  useEffect(() => { saveSlot(GAME_ID, state) }, [state])

  useEffect(() => {
    if (resumedAgentStarted.current || state === null || services.playMode() !== 'agent') return
    resumedAgentStarted.current = true
    void services.beginAgentGame({ gameId: GAME_ID, gameTitle: '港湾对决', rules: AGENT_RULES })
  }, [services, state])

  const commit = useCallback((next: ClashState, previous: ClashState | null) => {
    setState(next)
    services.lanyinRemark(next.phase === 'match_over'
      ? next.winner === 'human' ? 'match_win' : next.winner === 'lanyin' ? 'match_loss' : 'match_draw'
      : 'play', situationLine(next))
    if (next.phase === 'match_over' && previous?.phase !== 'match_over') {
      resumedAgentStarted.current = false
      services.reportMatchResult({ won: next.winner === 'human', draw: next.winner === null })
      void services.endAgentGame(situationLine(next))
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
          const legalActions = state.hands.lanyin.flatMap((card) => state.lanes
            .filter((lane) => lane.claimedBy === null && lane.lanyin.length < 3)
            .map((lane) => ({
              id: `${card.id}|${lane.id}`,
              label: `把 ${SUIT_LABEL[card.suit]} ${card.value} 部署到「${lane.title}」；该线目前你 ${lane.lanyin.length}/3，玩家 ${lane.human.length}/3`,
            })))
          const agentDecision = await services.chooseAgentAction({
            situation: `${situationLine(state)} 你的手牌：${state.hands.lanyin.map((card) => `${card.id}=${SUIT_LABEL[card.suit]}${card.value}`).join('、')}。玩家已部署：${state.lanes.map((lane) => `${lane.title}[${lane.human.map((card) => `${SUIT_LABEL[card.suit]}${card.value}`).join('、') || '空'}]`).join('；')}`,
            legalActions,
          })
          if (agentDecision !== null) {
            const [cardId, laneId] = agentDecision.actionId.split('|')
            if (cardId !== undefined && laneId !== undefined) decision = { cardId, laneId: laneId as LaneId }
          }
        }
        if (cancelled) return
        if (decision !== null) commit(playCard(state, 'lanyin', decision.cardId, decision.laneId), state)
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '澜音暂时没有看清航线。')
      } finally {
        setAiThinking(false)
      }
    }, 620)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [commit, state])

  const start = useCallback(() => {
    const next = createMatch()
    setSelectedId(null)
    setSelectedLane(null)
    setError(null)
    commit(next, state)
    if (services.playMode() === 'agent') {
      resumedAgentStarted.current = true
      void services.beginAgentGame({ gameId: GAME_ID, gameTitle: '港湾对决', rules: AGENT_RULES })
    }
    services.lanyinRemark('new_game', '港湾对决开始：向三条航线部署牌阵，先以更强阵型控制两座航标。')
  }, [commit, services, state])

  const deploy = useCallback((laneId?: LaneId) => {
    if (state === null || selectedId === null) return
    const target = laneId ?? selectedLane
    if (target === null) {
      setError('先选择一条航线。')
      return
    }
    try {
      commit(playCard(state, 'human', selectedId, target), state)
      setSelectedId(null)
      setSelectedLane(null)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这张牌现在不能部署。')
    }
  }, [commit, selectedId, selectedLane, state])

  return {
    state, selectedId, selectedLane, aiThinking, error,
    setSelectedId, setSelectedLane, start, deploy, clearError: () => setError(null),
  }
}

function FormationCards({ cards, hidden = false }: { cards: readonly ClashCard[]; hidden?: boolean }): React.JSX.Element {
  return (
    <div className="dth-formation-cards" role="list">
      {Array.from({ length: 3 }, (_, index) => {
        const card = cards[index]
        if (card === undefined) return <span key={index} className="dth-clash-slot" aria-hidden="true"><i /></span>
        if (hidden) return <span key={card.id} className="dth-signal-card back" role="listitem" aria-label="澜音已部署一张暗牌"><i /></span>
        return <SignalCard key={card.id} card={card} />
      })}
    </div>
  )
}

function SignalCard({ card, selected = false, disabled = false, onClick }: {
  card: ClashCard
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}): React.JSX.Element {
  const content = (
    <>
      <span className="dth-signal-suit">{SUIT_MARK[card.suit]}</span>
      <strong>{card.value}</strong>
      <small>{SUIT_LABEL[card.suit]}</small>
      <i aria-hidden="true" />
    </>
  )
  if (onClick === undefined) return <span className={`dth-signal-card suit-${card.suit}`} role="listitem" aria-label={`${SUIT_LABEL[card.suit]} ${card.value}`}>{content}</span>
  return <button type="button" className={`dth-signal-card suit-${card.suit}${selected ? ' selected' : ''}`} disabled={disabled} onClick={onClick} aria-pressed={selected}>{content}</button>
}

function formationName(cards: readonly ClashCard[]): string {
  return cards.length === 3 ? evaluateFormation(cards).label : `${cards.length} / 3`
}

function LaneColumn({ lane, myTurn, selectedCard, selected, onSelect, onDeploy }: {
  lane: Lane
  myTurn: boolean
  selectedCard: ClashCard | undefined
  selected: boolean
  onSelect: () => void
  onDeploy: () => void
}): React.JSX.Element {
  const open = lane.claimedBy === null && lane.human.length < 3
  return (
    <section className={`dth-lane${selected ? ' selected' : ''}${lane.claimedBy !== null ? ` claimed ${lane.claimedBy}` : ''}`} aria-label={lane.title}>
      <header><span>{lane.title}</span><small>{formationName(lane.lanyin)}</small></header>
      <FormationCards cards={lane.lanyin} hidden />
      <button type="button" className="dth-beacon" onClick={onSelect} disabled={!myTurn || !open} aria-pressed={selected}>
        <i /><strong>{lane.claimedBy === 'human' ? '归你' : lane.claimedBy === 'lanyin' ? '归澜音' : '争夺中'}</strong><small>{lane.claimedBy === null ? '完成三张后比较阵型' : '航标已锁定'}</small>
      </button>
      <FormationCards cards={lane.human} />
      <footer><small>{formationName(lane.human)}</small><button type="button" onClick={onDeploy} disabled={!myTurn || !open || selectedCard === undefined}>派往此线</button></footer>
    </section>
  )
}

export function HarborClashView({ services }: GameViewProps): React.JSX.Element {
  const game = useHarborClashGame(services)
  const state = game.state

  if (state === null) {
    return (
      <section className="dth-game-intro dth-clash-intro" style={{ '--dth-game-art': `url(${TEAHOUSE_GAMES_ART})` } as React.CSSProperties}>
        <div className="dth-game-intro-copy">
          <span className="dth-kicker">FORMATION DUEL · THREE LANES</span>
          <h2>港湾对决</h2>
          <p>把信号牌部署到三条航线。凑出同色连号、同点舰队或同色编队，以更强阵型夺塔。</p>
          <div className="dth-formation-preview" aria-label="阵型强弱">
            <span><b>1</b>灯塔连阵</span><span><b>2</b>同旗舰队</span><span><b>3</b>同潮编队</span><span><b>4</b>顺风航线</span>
          </div>
          <button type="button" className="dth-primary-button" onClick={game.start}>点亮信号塔</button>
        </div>
      </section>
    )
  }

  const myTurn = state.phase === 'play' && state.turn === 'human'
  const selectedCard = state.hands.human.find((card) => card.id === game.selectedId)

  return (
    <section className="dth-clash" aria-label="港湾对决三塔牌桌">
      {game.error !== null && <div className="dth-inline-error" role="alert"><span>{game.error}</span><button type="button" onClick={game.clearError}>知道了</button></div>}
      <header className="dth-game-hud">
        <div><span className="dth-kicker">HARBOR CLASH</span><strong>先夺两座航标</strong></div>
        <div className="dth-tower-score" aria-label="航标比分"><span>你 <b>{claimedCount(state, 'human')}</b></span><i /><i /><i /><span><b>{claimedCount(state, 'lanyin')}</b> 澜音</span></div>
        <span className={`dth-turn-pill${myTurn ? ' active' : ''}`}>{state.phase === 'match_over' ? '对决结束' : myTurn ? '选择牌与航线' : game.aiThinking ? '澜音正在布局…' : '等待澜音'}</span>
      </header>

      <div className="dth-clash-board">
        {state.lanes.map((lane) => (
          <LaneColumn
            key={lane.id}
            lane={lane}
            myTurn={myTurn}
            selectedCard={selectedCard}
            selected={game.selectedLane === lane.id}
            onSelect={() => game.setSelectedLane(game.selectedLane === lane.id ? null : lane.id)}
            onDeploy={() => game.deploy(lane.id)}
          />
        ))}
      </div>

      <div className="dth-clash-event" role="status"><span className={game.aiThinking ? 'thinking' : ''} /><p>{state.lastEvent}</p></div>

      {state.phase === 'play' ? (
        <section className="dth-clash-hand-area" aria-label="你的信号牌">
          <header><div><span className="dth-kicker">YOUR SIGNALS</span><strong>你的手牌</strong></div><small>{selectedCard === undefined ? '先选一张牌，再选择航线' : `已选 ${SUIT_LABEL[selectedCard.suit]} ${selectedCard.value}`}</small></header>
          <div className="dth-clash-hand" role="list">
            {state.hands.human.map((card) => <SignalCard key={card.id} card={card} selected={card.id === game.selectedId} disabled={!myTurn} onClick={() => game.setSelectedId(card.id === game.selectedId ? null : card.id)} />)}
          </div>
          <button type="button" className="dth-primary-button dth-deploy-main" onClick={() => game.deploy()} disabled={!myTurn || selectedCard === undefined || game.selectedLane === null}>确认部署</button>
        </section>
      ) : (
        <div className="dth-round-result final" role="status">
          <span className="dth-kicker">HARBOR SECURED</span>
          <strong>{state.winner === null ? '三条航线势均力敌' : state.winner === 'human' ? '港湾回应了你的信号' : '澜音先控制了两座航标'}</strong>
          <small>航标 · 你 {claimedCount(state, 'human')} — {claimedCount(state, 'lanyin')} 澜音</small>
          <button type="button" className="dth-primary-button" onClick={game.start}>重新布阵</button>
        </div>
      )}

      <details className="dth-formation-guide">
        <summary>阵型速查</summary>
        <div>{[5, 4, 3, 2, 1].map((tier) => <span key={tier}><b>{6 - tier}</b>{FORMATION_LABEL[tier]}</span>)}</div>
      </details>
    </section>
  )
}

export const harborClashGame: GameModule = {
  manifest: {
    id: GAME_ID,
    title: '港湾对决',
    tagline: '三条航线，每一张牌都是承诺',
    duration: '8–12 分钟',
    intensity: 'heavy',
    why: '把有限手牌押在三座航标上：做强自己的阵型，也要读懂澜音正在争哪一线。',
    glyph: '塔',
    accent: 31,
  },
  hasSave: () => slotExists(GAME_ID),
  clearSave: () => clearSlot(GAME_ID),
  View: HarborClashView,
}

export type { GameServices, Player }
