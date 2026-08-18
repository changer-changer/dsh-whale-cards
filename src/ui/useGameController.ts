import { useCallback, useEffect, useRef, useState } from 'react'
import { chooseAiDiscard, chooseAiDraw, type AiView } from '../game/ai'
import {
  createMatch,
  discardCard,
  drawCard,
  legalKnockDiscards,
  passAtWall,
  startNextHand,
} from '../game/engine'
import {
  DEFAULT_APP_STATE,
  LEGACY_PERSISTENCE,
  type GamePersistenceAdapter,
  type PlayerPreferences,
  type SavedAppState,
} from '../game/persistence'
import type { DrawSource, MatchState } from '../game/types'
import { useGameAudio } from './audio'
import { dialogueLine, type DialogueEvent } from './dialogue'

function restoreState(
  initiallyOpen: boolean | undefined,
  adapter: GamePersistenceAdapter,
): SavedAppState {
  try {
    const saved = adapter.load()
    return initiallyOpen === undefined ? saved : { ...saved, panelOpen: initiallyOpen }
  } catch {
    return { ...DEFAULT_APP_STATE, panelOpen: initiallyOpen ?? false }
  }
}

function updateProgress(previous: SavedAppState, match: MatchState): Pick<SavedAppState, 'countedMatchSeed' | 'stats'> {
  const enteredResult = previous.match !== null
    && previous.match.phase !== 'reveal'
    && previous.match.phase !== 'match_over'
    && (match.phase === 'reveal' || match.phase === 'match_over')
  const isNewCompletedMatch = match.phase === 'match_over' && previous.countedMatchSeed !== match.seed
  const humanWon = match.scores.human > match.scores.lanyin
  const stats = {
    ...previous.stats,
    handsPlayed: previous.stats.handsPlayed + (enteredResult ? 1 : 0),
    matchesPlayed: previous.stats.matchesPlayed + (isNewCompletedMatch ? 1 : 0),
    matchesWon: previous.stats.matchesWon + (isNewCompletedMatch && humanWon ? 1 : 0),
    rapport: Math.min(100, previous.stats.rapport + (isNewCompletedMatch ? (humanWon ? 3 : 2) : 0)),
  }
  return {
    stats,
    ...(isNewCompletedMatch ? { countedMatchSeed: match.seed } : (
      previous.countedMatchSeed === undefined ? {} : { countedMatchSeed: previous.countedMatchSeed }
    )),
  }
}

function resultDialogue(match: MatchState): DialogueEvent | null {
  if (match.phase !== 'match_over') return null
  if (match.scores.human === match.scores.lanyin) return 'match_draw'
  return match.scores.human > match.scores.lanyin ? 'match_win' : 'match_loss'
}

function lanyinView(match: MatchState): AiView {
  return {
    hand: match.hands.lanyin,
    history: match.history,
    rules: match.rules,
    stockCount: match.stock.length,
    topDiscard: match.discard.at(-1),
    drawnCardId: match.drawnCardId,
    drawSource: match.drawSource,
  }
}

export interface GameController {
  readonly aiThinking: boolean
  readonly app: SavedAppState
  readonly dialogue: string
  readonly error: string | null
  readonly selectedCardId: string | null
  chat(): void
  clearError(): void
  closePanel(): void
  discard(intent: 'discard' | 'knock', cardId?: string): void
  draw(source: DrawSource): void
  nextHand(): void
  openPanel(): void
  passWall(): void
  selectCard(cardId: string): void
  startMatch(): void
  updatePreferences(patch: Partial<PlayerPreferences>): void
}

export function useGameController(
  initiallyOpen: boolean | undefined,
  adapter: GamePersistenceAdapter = LEGACY_PERSISTENCE,
): GameController {
  const [app, setApp] = useState<SavedAppState>(() => restoreState(initiallyOpen, adapter))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [dialogue, setDialogue] = useState(() => dialogueLine('greeting', 1))
  const [error, setError] = useState<string | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden')
  const dialogueIndex = useRef(0)
  const playSound = useGameAudio(app.preferences.muted)

  useEffect(() => {
    try {
      adapter.save(app)
    } catch {
      // Storage may be disabled; the game remains fully playable for this session.
    }
  }, [app, adapter])

  useEffect(() => {
    const onVisibility = (): void => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const speak = useCallback((event: DialogueEvent, force = false) => {
    const mode = app.preferences.dialogue
    if (!force && mode === 'quiet') return
    if (mode === 'standard' && (event === 'ai_take_discard' || event === 'human_take_discard')) return
    dialogueIndex.current += 1
    setDialogue(dialogueLine(event, app.match?.seed ?? 1, dialogueIndex.current))
  }, [app.match?.seed, app.preferences.dialogue])

  const commitMatch = useCallback((match: MatchState) => {
    setApp((previous) => ({
      ...previous,
      match,
      ...updateProgress(previous, match),
    }))
  }, [])

  useEffect(() => {
    const match = app.match
    const isLanyinTurn = match !== null
      && match.turn === 'lanyin'
      && (match.phase === 'draw' || match.phase === 'discard')
    if (!app.panelOpen || !documentVisible || !isLanyinTurn) {
      setAiThinking(false)
      return
    }
    setAiThinking(true)
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'hidden') return
      try {
        if (match.phase === 'draw') {
          const source = chooseAiDraw(lanyinView(match), app.preferences.difficulty)
          const next = source === 'pass'
            ? passAtWall(match, 'lanyin')
            : drawCard(match, 'lanyin', source)
          commitMatch(next)
          setSelectedCardId(null)
          setError(null)
          playSound(source === 'pass' ? 'result' : 'draw')
          if (source === 'discard') speak('ai_take_discard')
          return
        }

        const legalWallKnocks = match.wallKnockRequired
          ? new Set(legalKnockDiscards(match.hands.lanyin, match.rules, match.drawnCardId).map((card) => card.id))
          : undefined
        let decision = chooseAiDiscard(lanyinView(match), app.preferences.difficulty)
        if (legalWallKnocks !== undefined && !legalWallKnocks.has(decision.cardId)) {
          const fallback = legalWallKnocks.values().next().value as string | undefined
          if (fallback === undefined) throw new Error('wall draw produced no legal knock discard')
          decision = { cardId: fallback, intent: 'knock' }
        } else if (match.wallKnockRequired) {
          decision = { ...decision, intent: 'knock' }
        }

        const next = discardCard(match, 'lanyin', decision.cardId, decision.intent)
        const last = next.history.at(-1)
        commitMatch(next)
        setSelectedCardId(null)
        setError(null)
        playSound(next.phase === 'reveal' || next.phase === 'match_over' ? 'result' : 'place')
        const matchLine = resultDialogue(next)
        if (matchLine !== null) speak(matchLine)
        else if (last?.type === 'gin') speak('ai_gin')
        else if (last?.type === 'knock') speak('ai_knock')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '澜音暂时没接住这手牌。')
        setAiThinking(false)
      }
    }, match.phase === 'draw'
      ? (app.preferences.fastAi ? 120 : 560)
      : (app.preferences.fastAi ? 180 : 420))
    return () => window.clearTimeout(timer)
  }, [app.match, app.panelOpen, app.preferences.difficulty, app.preferences.fastAi, commitMatch, documentVisible, playSound, speak])

  const startMatch = useCallback(() => {
    const match = createMatch()
    setApp((previous) => ({ ...previous, match, panelOpen: true }))
    setSelectedCardId(null)
    setError(null)
    setDialogue(dialogueLine('greeting', match.seed))
    playSound('deal')
  }, [playSound])

  const draw = useCallback((source: DrawSource) => {
    if (app.match === null) return
    try {
      const next = drawCard(app.match, 'human', source)
      commitMatch(next)
      setSelectedCardId(next.drawnCardId ?? null)
      setError(null)
      playSound('draw')
      if (source === 'discard') speak('human_take_discard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这张牌现在还不能拿。')
    }
  }, [app.match, commitMatch, playSound, speak])

  const discard = useCallback((intent: 'discard' | 'knock', cardId?: string) => {
    const targetCardId = cardId ?? selectedCardId
    if (app.match === null || targetCardId === null) {
      setError('先点一张手牌。')
      return
    }
    try {
      const next = discardCard(app.match, 'human', targetCardId, intent)
      commitMatch(next)
      setSelectedCardId(null)
      setError(null)
      playSound(next.phase === 'reveal' || next.phase === 'match_over' ? 'result' : 'place')
      const matchLine = resultDialogue(next)
      if (matchLine !== null) speak(matchLine)
      else if (intent === 'knock') speak(next.handResult?.kind === 'gin' ? 'human_gin' : 'human_knock')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '这手牌还不能这样出。')
    }
  }, [app.match, commitMatch, playSound, selectedCardId, speak])

  const passWallAction = useCallback(() => {
    if (app.match === null) return
    try {
      const next = passAtWall(app.match, 'human')
      commitMatch(next)
      setSelectedCardId(null)
      playSound('result')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '现在还不能结束本手。')
    }
  }, [app.match, commitMatch, playSound])

  const nextHand = useCallback(() => {
    if (app.match === null) return
    try {
      const next = startNextHand(app.match)
      commitMatch(next)
      setSelectedCardId(null)
      setError(null)
      setDialogue(dialogueLine('greeting', next.seed, next.round))
      playSound('deal')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下一手暂时无法开始。')
    }
  }, [app.match, commitMatch, playSound])

  return {
    aiThinking,
    app,
    dialogue,
    error,
    selectedCardId,
    chat: () => { playSound('tap'); speak('chat', true) },
    clearError: () => setError(null),
    closePanel: () => setApp((previous) => ({ ...previous, panelOpen: false })),
    discard,
    draw,
    nextHand,
    openPanel: () => setApp((previous) => ({ ...previous, panelOpen: true })),
    passWall: passWallAction,
    selectCard: (cardId) => { setSelectedCardId((selected) => selected === cardId ? null : cardId); playSound('tap') },
    startMatch,
    updatePreferences: (patch) => setApp((previous) => ({
      ...previous,
      preferences: { ...previous.preferences, ...patch },
    })),
  }
}
