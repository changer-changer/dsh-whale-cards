/**
 * Gin Rummy as a teahouse GameModule. The verified engine (src/game) is used
 * as-is; this module only adapts saves to the per-game slot and the table UI
 * to the shared shell, plus forwards game moments to Lanyin.
 *
 * @module games/gin-rummy/module
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playAiTurn } from '../../game/ai.ts'
import { rankLabel, suitSymbol } from '../../game/cards.ts'
import { canKnockWithUpcard, createMatch, discardCard, drawCard, passAtWall, startNextHand } from '../../game/engine.ts'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_STATS,
  type PlayerPreferences,
  type PlayerStats,
} from '../../game/persistence.ts'
import type { DrawSource, MatchState } from '../../game/types.ts'
import { useGameAudio } from '../../ui/audio.ts'
import { dialogueLine, type DialogueEvent } from '../../ui/dialogue.ts'
import { ResultView } from '../../ui/ResultView.tsx'
import { RulesPanel } from '../../ui/RulesPanel.tsx'
import { SettingsPanel } from '../../ui/SettingsPanel.tsx'
import { TableView } from '../../ui/TableView.tsx'
import { WelcomeView } from '../../ui/WelcomeView.tsx'
import { TEAHOUSE_HARBOR_ART } from '../../client/generated/art.ts'
import type { GameModule, GameServices, GameViewProps } from '../../teahouse/types.ts'
import { clearSlot, loadSlot, saveSlot, slotExists } from '../../teahouse/storage.ts'
import { GAME_STYLES, STYLE_ELEMENT_ID } from '../../ui/styles.ts'

const GAME_ID = 'gin-rummy'
const AGENT_RULES = '标准双人 Gin Rummy，三手累计得分。每回合先从牌堆或弃牌堆顶摸一张，再弃一张；死木不超过 10 点可敲牌，0 点为 Gin。不能立刻弃掉刚从弃牌堆拿起的牌。牌堆只剩两张时只能用明牌完成合法敲牌，否则结束本手。'

function cardLabel(card: MatchState['hands']['lanyin'][number]): string {
  return `${suitSymbol(card.suit)}${rankLabel(card.rank)}`
}

async function playAgentTurn(state: MatchState, services: GameServices): Promise<{ next: MatchState; line: string }> {
  const drawActions: { id: string; label: string }[] = []
  if (state.stock.length > 2) drawActions.push({ id: 'draw:stock', label: `从暗牌堆摸牌（剩 ${state.stock.length} 张，摸到什么未知）` })
  const upcard = state.discard.at(-1)
  if (upcard !== undefined && (state.stock.length > 2 || canKnockWithUpcard(state, 'lanyin'))) {
    drawActions.push({ id: 'draw:discard', label: `拿走弃牌堆顶的 ${cardLabel(upcard)}` })
  }
  if (drawActions.length === 0) return { next: passAtWall(state, 'lanyin'), line: '潮墙到了，这手先收住。' }

  const drawDecision = await services.chooseAgentAction({
    situation: `第 ${state.round}/${state.rules.handCount} 手。比分：玩家 ${state.scores.human}，你 ${state.scores.lanyin}。你的手牌：${state.hands.lanyin.map(cardLabel).join('、')}。弃牌堆顶：${upcard === undefined ? '空' : cardLabel(upcard)}。暗牌堆剩 ${state.stock.length} 张。现在选择摸牌来源。`,
    legalActions: drawActions,
  })
  if (drawDecision === null) throw new Error('Agent 未完成摸牌选择')
  const source: DrawSource = drawDecision.actionId === 'draw:discard' ? 'discard' : 'stock'
  const afterDraw = drawCard(state, 'lanyin', source)

  const discardActions: { id: string; label: string }[] = []
  for (const card of afterDraw.hands.lanyin) {
    try {
      discardCard(afterDraw, 'lanyin', card.id, 'discard')
      discardActions.push({ id: `discard:${card.id}`, label: `弃掉 ${cardLabel(card)}，继续本手` })
    } catch { /* engine says this discard is not legal */ }
    try {
      const knocked = discardCard(afterDraw, 'lanyin', card.id, 'knock')
      const kind = knocked.handResult?.kind === 'gin' ? 'Gin' : '敲牌'
      discardActions.push({ id: `knock:${card.id}`, label: `弃掉 ${cardLabel(card)}并${kind}，立即结算本手` })
    } catch { /* not a legal knock */ }
  }
  const discardDecision = await services.chooseAgentAction({
    situation: `你刚${source === 'stock' ? '从暗牌堆摸到' : '从弃牌堆拿到'} ${afterDraw.hands.lanyin.find((card) => card.id === afterDraw.drawnCardId) ? cardLabel(afterDraw.hands.lanyin.find((card) => card.id === afterDraw.drawnCardId)!) : '一张牌'}。现在的手牌：${afterDraw.hands.lanyin.map(cardLabel).join('、')}。请选择弃牌，若合法也可敲牌。`,
    legalActions: discardActions,
  })
  if (discardDecision === null) throw new Error('Agent 未完成弃牌选择')
  const separator = discardDecision.actionId.indexOf(':')
  const intent = discardDecision.actionId.slice(0, separator) === 'knock' ? 'knock' : 'discard'
  const cardId = discardDecision.actionId.slice(separator + 1)
  return { next: discardCard(afterDraw, 'lanyin', cardId, intent), line: discardDecision.line || drawDecision.line }
}

function resultDialogue(match: MatchState): DialogueEvent | null {
  if (match.phase !== 'match_over') return null
  if (match.scores.human === match.scores.lanyin) return 'match_draw'
  return match.scores.human > match.scores.lanyin ? 'match_win' : 'match_loss'
}

function situationLine(match: MatchState): string {
  return `正在玩三手 Gin Rummy：第 ${match.round}/${match.rules.handCount} 手，玩家 ${match.scores.human} 分，澜音 ${match.scores.lanyin} 分，轮到${match.turn === 'human' ? '玩家' : '澜音'}${match.phase === 'draw' ? '摸牌' : '弃牌'}。`
}

function useGinRummyGame(services: GameServices) {
  const [match, setMatch] = useState<MatchState | null>(() => loadSlot(GAME_ID) as MatchState | null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [dialogue, setDialogue] = useState(() => dialogueLine('greeting', 1))
  const [error, setError] = useState<string | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const preferences = useMemo<PlayerPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...(services.getPreference('ginRummy') as Partial<PlayerPreferences> | undefined),
  }), [services])
  const dialogueIndex = useRef(0)
  const resumedAgentStarted = useRef(false)
  const playSound = useGameAudio(preferences.muted)
  const servicesRef = useRef(services)
  const preferencesRef = useRef(preferences)
  const playSoundRef = useRef(playSound)
  servicesRef.current = services
  preferencesRef.current = preferences
  playSoundRef.current = playSound

  useEffect(() => {
    saveSlot(GAME_ID, match)
  }, [match])

  useEffect(() => {
    if (resumedAgentStarted.current || match === null || services.playMode() !== 'agent') return
    resumedAgentStarted.current = true
    void services.beginAgentGame({ gameId: GAME_ID, gameTitle: '鲸牌 Gin Rummy', rules: AGENT_RULES })
  }, [match, services])

  useEffect(() => {
    const onVisibility = (): void => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const speak = useCallback((event: DialogueEvent, force = false, context?: string) => {
    const mode = preferences.dialogue
    if (!force && mode === 'quiet') return
    if (mode === 'standard' && (event === 'ai_take_discard' || event === 'human_take_discard')) return
    dialogueIndex.current += 1
    setDialogue(dialogueLine(event, match?.seed ?? 1, dialogueIndex.current))
    services.lanyinRemark(event, context ?? `对局事件：${event}`)
  }, [match?.seed, preferences.dialogue, services])
  const speakRef = useRef(speak)
  speakRef.current = speak

  const finishMatch = useCallback((next: MatchState) => {
    if (next.phase === 'match_over') {
      resumedAgentStarted.current = false
      services.reportMatchResult({
        won: next.scores.human > next.scores.lanyin,
        draw: next.scores.human === next.scores.lanyin,
      })
      void services.endAgentGame(situationLine(next))
    }
  }, [services])

  const commitMatch = useCallback((next: MatchState) => {
    setMatch(next)
    finishMatch(next)
  }, [finishMatch])
  const commitMatchRef = useRef(commitMatch)
  commitMatchRef.current = commitMatch
  const scheduledTurnRef = useRef<string | null>(null)

  const aiTurnKey = match !== null && match.turn === 'lanyin' && match.phase === 'draw'
    ? `${match.seed}:${match.round}:${match.history.length}`
    : null

  useEffect(() => {
    if (!documentVisible || match === null || aiTurnKey === null) {
      setAiThinking(false)
      scheduledTurnRef.current = null
      return
    }
    // Schedule each Lanyin turn exactly once, keyed by the turn itself. In agent
    // mode the move costs two sequential model round-trips, and Lanyin's own
    // chatter re-renders the shell while they are in flight; tearing the turn
    // down on cleanup would discard a move that was already paid for and strand
    // aiThinking at true — she would keep talking and never play a card.
    if (scheduledTurnRef.current === aiTurnKey) return
    scheduledTurnRef.current = aiTurnKey
    setAiThinking(true)
    const turnServices = servicesRef.current
    const turnPreferences = preferencesRef.current
    const timer = window.setTimeout(async () => {
      if (document.visibilityState === 'hidden') {
        setAiThinking(false)
        scheduledTurnRef.current = null
        return
      }
      try {
        const agentMove = turnServices.playMode() === 'agent' ? await playAgentTurn(match, turnServices).catch(() => null) : null
        const next = agentMove?.next ?? playAiTurn(match, turnPreferences.difficulty)
        commitMatchRef.current(next)
        setSelectedCardId(null)
        setError(null)
        playSoundRef.current(next.phase === 'reveal' || next.phase === 'match_over' ? 'result' : 'place')
        if (agentMove?.line.trim()) setDialogue(agentMove.line)
        const matchLine = resultDialogue(next)
        if (matchLine !== null) speakRef.current(matchLine, false, situationLine(next))
        else {
          const last = next.history.slice(match.history.length).at(-1)
          if (last?.type === 'gin') speakRef.current('ai_gin')
          else if (last?.type === 'knock') speakRef.current('ai_knock')
          else if (last?.type === 'take_discard') speakRef.current('ai_take_discard')
        }
      } catch (cause) {
        scheduledTurnRef.current = null
        setError(cause instanceof Error ? cause.message : '澜音暂时没接住这手牌。')
      } finally {
        setAiThinking(false)
      }
    }, turnPreferences.fastAi ? 120 : 560)
    return () => {
      window.clearTimeout(timer)
    }
  }, [aiTurnKey, documentVisible, match])

  const startMatch = useCallback(() => {
    const next = createMatch()
    commitMatch(next)
    setSelectedCardId(null)
    setError(null)
    setDialogue(dialogueLine('greeting', next.seed))
    playSound('deal')
    if (services.playMode() === 'agent') {
      resumedAgentStarted.current = true
      void services.beginAgentGame({ gameId: GAME_ID, gameTitle: '鲸牌 Gin Rummy', rules: AGENT_RULES })
    }
  }, [commitMatch, playSound])

  const draw = useCallback((source: DrawSource) => {
    if (match === null) return
    try {
      const next = drawCard(match, 'human', source)
      commitMatch(next)
      setSelectedCardId(next.drawnCardId ?? null)
      setError(null)
      playSound('draw')
      if (source === 'discard') speak('human_take_discard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这张牌现在还不能拿。')
    }
  }, [match, commitMatch, playSound, speak])

  const discard = useCallback((intent: 'discard' | 'knock', cardId?: string) => {
    const targetCardId = cardId ?? selectedCardId
    if (match === null || targetCardId === null) {
      setError('先点一张手牌。')
      return
    }
    try {
      const next = discardCard(match, 'human', targetCardId, intent)
      commitMatch(next)
      setSelectedCardId(null)
      setError(null)
      playSound(next.phase === 'reveal' || next.phase === 'match_over' ? 'result' : 'place')
      const matchLine = resultDialogue(next)
      if (matchLine !== null) speak(matchLine, false, situationLine(next))
      else if (intent === 'knock') speak(next.handResult?.kind === 'gin' ? 'human_gin' : 'human_knock')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这手牌还不能这样出。')
    }
  }, [match, commitMatch, playSound, selectedCardId, speak])

  const passWall = useCallback(() => {
    if (match === null) return
    try {
      commitMatch(passAtWall(match, 'human'))
      setSelectedCardId(null)
      playSound('result')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '现在还不能结束本手。')
    }
  }, [match, commitMatch, playSound])

  const nextHand = useCallback(() => {
    if (match === null) return
    try {
      const next = startNextHand(match)
      commitMatch(next)
      setSelectedCardId(null)
      setError(null)
      setDialogue(dialogueLine('greeting', next.seed, next.round))
      playSound('deal')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下一手暂时无法开始。')
    }
  }, [match, commitMatch, playSound])

  return {
    aiThinking, dialogue, error, match, preferences, selectedCardId, rulesOpen, settingsOpen,
    setRulesOpen, setSettingsOpen, clearError: () => setError(null), discard, draw, nextHand,
    passWall, setSelectedCardId, startMatch, speak,
    updatePreferences: (patch: Partial<PlayerPreferences>) => {
      const current = { ...DEFAULT_PREFERENCES, ...(services.getPreference('ginRummy') as Partial<PlayerPreferences> | undefined) }
      services.setPreferences({ ginRummy: { ...current, ...patch } })
    },
  }
}

export function GinRummyView({ services }: GameViewProps): React.JSX.Element {
  const game = useGinRummyGame(services)
  const { match } = game
  const stats = services.getPreference('stats') as PlayerStats | undefined ?? DEFAULT_STATS

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') {
        event.preventDefault()
        if (game.settingsOpen) game.setSettingsOpen(false)
        else if (game.rulesOpen) game.setRulesOpen(false)
        return
      }
      if (match === null || match.phase === 'reveal' || match.phase === 'match_over') return
      if (/^[0-9]$/.test(event.key) && match.turn === 'human' && match.phase === 'discard') {
        const index = event.key === '0' ? 9 : Number(event.key) - 1
        const card = match.hands.human[index]
        if (card !== undefined) {
          event.preventDefault()
          game.setSelectedCardId(card.id)
        }
        return
      }
      if (event.key === 'Enter' && match.turn === 'human' && match.phase === 'discard' && game.selectedCardId !== null) {
        event.preventDefault()
        game.discard(match.wallKnockRequired ? 'knock' : 'discard')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game, match])

  return (
    <div className="dwc-root dwc-game">
      <style id={STYLE_ELEMENT_ID}>{GAME_STYLES}</style>
      {game.error !== null && (
        <div className="dwc-error" role="alert">
          <span>{game.error}</span>
          <button type="button" onClick={game.clearError} aria-label="关闭提示">×</button>
        </div>
      )}
      {match === null ? (
        <WelcomeView
          artUrl={TEAHOUSE_HARBOR_ART}
          stats={stats}
          onStart={() => {
            if (!services.getPreference('tutorialSeen')) {
              game.setRulesOpen(true)
              return
            }
            game.startMatch()
          }}
          onRules={() => game.setRulesOpen(true)}
        />
      ) : match.phase === 'reveal' || match.phase === 'match_over' ? (
        <ResultView match={match} onNext={game.nextHand} onNewMatch={game.startMatch} />
      ) : (
        <TableView
          match={match}
          selectedCardId={game.selectedCardId}
          aiThinking={game.aiThinking}
          dialogue={game.dialogue}
          rapport={stats.rapport}
          artUrl={TEAHOUSE_HARBOR_ART}
          onSelectCard={game.setSelectedCardId}
          onDraw={game.draw}
          onDiscard={({ cardId, kind }) => game.discard(kind, cardId)}
          onPassWall={game.passWall}
          onChat={() => { game.speak('chat', true) }}
          onRules={() => game.setRulesOpen(true)}
          onSettings={() => game.setSettingsOpen(true)}
        />
      )}
      <RulesPanel
        open={game.rulesOpen}
        onClose={() => game.setRulesOpen(false)}
        onStart={() => {
          game.updatePreferences({ tutorialSeen: true })
          game.setRulesOpen(false)
          game.startMatch()
        }}
      />
      <GinRummySettings game={game} />
    </div>
  )
}

/** Settings panel wired to shell preferences instead of legacy app state. */
function GinRummySettings({ game }: { game: ReturnType<typeof useGinRummyGame> }): React.JSX.Element {
  return (
    <SettingsPanel
      open={game.settingsOpen}
      preferences={game.preferences}
      onChange={game.updatePreferences}
      onClose={() => game.setSettingsOpen(false)}
    />
  )
}

export const ginRummyGame: GameModule = {
  manifest: {
    id: GAME_ID,
    title: '鲸牌 Gin Rummy',
    tagline: '和澜音打一场三手决胜的经典金拉米',
    duration: '8–12 分钟',
    intensity: 'medium',
    why: '真正有暗牌、有回合、有胜负的双人对抗，是茶歇间的旗舰牌局。',
    glyph: '🃏',
    accent: 205,
  },
  hasSave: () => slotExists(GAME_ID),
  clearSave: () => clearSlot(GAME_ID),
  View: GinRummyView,
}
