/**
 * Gin Rummy as a teahouse GameModule. The verified engine (src/game) is used
 * as-is; this module only adapts saves to the per-game slot and the table UI
 * to the shared shell, plus forwards game moments to Lanyin.
 *
 * @module games/gin-rummy/module
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playAiTurn } from '../../game/ai.ts'
import { createMatch, discardCard, drawCard, passAtWall, startNextHand } from '../../game/engine.ts'
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
import { LANYIN_HARBOR_ART } from '../../client/generated/art.ts'
import type { GameModule, GameServices, GameViewProps } from '../../teahouse/types.ts'
import { clearSlot, loadSlot, saveSlot, slotExists } from '../../teahouse/storage.ts'

const GAME_ID = 'gin-rummy'

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
  const playSound = useGameAudio(preferences.muted)

  useEffect(() => {
    saveSlot(GAME_ID, match)
  }, [match])

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

  const finishMatch = useCallback((next: MatchState) => {
    if (next.phase === 'match_over') {
      services.reportMatchResult({
        won: next.scores.human > next.scores.lanyin,
        draw: next.scores.human === next.scores.lanyin,
      })
    }
  }, [services])

  const commitMatch = useCallback((next: MatchState) => {
    setMatch(next)
    finishMatch(next)
  }, [finishMatch])

  useEffect(() => {
    if (!documentVisible || match === null || match.turn !== 'lanyin' || match.phase !== 'draw') {
      setAiThinking(false)
      return
    }
    setAiThinking(true)
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'hidden') return
      try {
        const next = playAiTurn(match, preferences.difficulty)
        commitMatch(next)
        setSelectedCardId(null)
        setError(null)
        playSound(next.phase === 'reveal' || next.phase === 'match_over' ? 'result' : 'place')
        const matchLine = resultDialogue(next)
        if (matchLine !== null) speak(matchLine, false, situationLine(next))
        else {
          const last = next.history.slice(match.history.length).at(-1)
          if (last?.type === 'gin') speak('ai_gin')
          else if (last?.type === 'knock') speak('ai_knock')
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '澜音暂时没接住这手牌。')
      } finally {
        setAiThinking(false)
      }
    }, preferences.fastAi ? 120 : 560)
    return () => {
      window.clearTimeout(timer)
      setAiThinking(false)
    }
  }, [match, preferences.difficulty, preferences.fastAi, commitMatch, documentVisible, playSound, speak])

  const startMatch = useCallback(() => {
    const next = createMatch()
    commitMatch(next)
    setSelectedCardId(null)
    setError(null)
    setDialogue(dialogueLine('greeting', next.seed))
    playSound('deal')
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
    <div className="dwc-game">
      {game.error !== null && (
        <div className="dwc-error" role="alert">
          <span>{game.error}</span>
          <button type="button" onClick={game.clearError} aria-label="关闭提示">×</button>
        </div>
      )}
      {match === null ? (
        <WelcomeView
          artUrl={LANYIN_HARBOR_ART}
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
          artUrl={LANYIN_HARBOR_ART}
          onSelectCard={game.setSelectedCardId}
          onDraw={game.draw}
          onDiscard={({ cardId, kind }) => game.discard(kind, cardId)}
          onPassWall={game.passWall}
          onChat={() => { game.speak('chat', true) }}
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
