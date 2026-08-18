import { useCallback, useEffect, useRef, useState } from 'react'
import { playAiTurn } from '../game/ai'
import { createMatch, discardCard, drawCard, passAtWall, startNextHand } from '../game/engine'
import {
  DEFAULT_APP_STATE,
  loadAppState,
  saveAppState,
  type PlayerPreferences,
  type SavedAppState,
} from '../game/persistence'
import type { DrawSource, MatchState } from '../game/types'
import { useGameAudio } from './audio'
import { dialogueLine, type DialogueEvent } from './dialogue'
import { useTaskNotice, type TaskListSource } from './task-status'

function restoreState(initiallyOpen: boolean | undefined): SavedAppState {
  try {
    const saved = loadAppState()
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

export interface GameController {
  readonly aiThinking: boolean
  readonly app: SavedAppState
  readonly dialogue: string
  readonly error: string | null
  readonly selectedCardId: string | null
  readonly taskNotice: 'done' | 'needs_input' | null
  chat(): void
  clearError(): void
  clearTaskNotice(): void
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
  taskSource: TaskListSource | undefined,
  initiallyOpen: boolean | undefined,
): GameController {
  const [app, setApp] = useState<SavedAppState>(() => restoreState(initiallyOpen))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [dialogue, setDialogue] = useState(() => dialogueLine('greeting', 1))
  const [error, setError] = useState<string | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden')
  const dialogueIndex = useRef(0)
  const playSound = useGameAudio(app.preferences.muted)
  const task = useTaskNotice(taskSource, app.match?.seed ?? null)

  useEffect(() => {
    try {
      saveAppState(app)
    } catch {
      // Storage may be disabled; the game remains fully playable for this session.
    }
  }, [app])

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
    if (task.notice === null) return
    speak(task.notice === 'done' ? 'task_done' : 'task_needs_input', true)
    playSound('result')
  }, [playSound, speak, task.notice])

  useEffect(() => {
    const match = app.match
    if (!app.panelOpen || !documentVisible || match === null || match.turn !== 'lanyin' || match.phase !== 'draw') {
      setAiThinking(false)
      return
    }
    setAiThinking(true)
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'hidden') return
      try {
        const next = playAiTurn(match, app.preferences.difficulty)
        const added = next.history.slice(match.history.length)
        const last = added.at(-1)
        commitMatch(next)
        setSelectedCardId(null)
        setError(null)
        playSound(next.phase === 'reveal' || next.phase === 'match_over' ? 'result' : 'place')
        const matchLine = resultDialogue(next)
        if (matchLine !== null) speak(matchLine)
        else if (last?.type === 'gin') speak('ai_gin')
        else if (last?.type === 'knock') speak('ai_knock')
        else if (added.some((action) => action.type === 'take_discard')) speak('ai_take_discard')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '澜音暂时没接住这手牌。')
      } finally {
        setAiThinking(false)
      }
    }, app.preferences.fastAi ? 120 : 560)
    return () => {
      window.clearTimeout(timer)
      setAiThinking(false)
    }
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
    taskNotice: task.notice,
    chat: () => { playSound('tap'); speak('chat', true) },
    clearError: () => setError(null),
    clearTaskNotice: task.clear,
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
