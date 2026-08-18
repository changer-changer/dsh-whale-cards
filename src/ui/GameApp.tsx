import { useCallback, useEffect, useState } from 'react'
import {
  LANYIN_CALM_ART,
  LANYIN_CONCERNED_ART,
  LANYIN_PLEASED_ART,
  LANYIN_THINKING_ART,
} from '../client/generated/art'
import type { CompanionGameContext, CompanionPort } from '../companion/core.ts'
import type { PlayerPreferences } from '../game/persistence'
import type { MatchState } from '../game/types'
import { CompanionPanel } from './CompanionPanel.tsx'
import { lanyinExpression, type LanyinExpression } from './expression.ts'
import type { TaskListSource } from './task-status'
import { ResultView } from './ResultView'
import { RulesPanel } from './RulesPanel'
import { SettingsPanel } from './SettingsPanel'
import { GAME_STYLES, STYLE_ELEMENT_ID } from './styles'
import { TableView } from './TableView'
import { useCompanion } from './useCompanion.ts'
import { useGameController } from './useGameController'
import { WelcomeView } from './WelcomeView'

export interface GameAppProps {
  readonly companion?: CompanionPort
  readonly initiallyOpen?: boolean
  readonly preview?: boolean
  readonly taskSource?: TaskListSource
}

const EXPRESSION_ART: Record<LanyinExpression, string> = {
  calm: LANYIN_CALM_ART,
  concerned: LANYIN_CONCERNED_ART,
  pleased: LANYIN_PLEASED_ART,
  thinking: LANYIN_THINKING_ART,
}

function latestAssistantText(messages: readonly { readonly role: 'user' | 'assistant'; readonly text: string }[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'assistant') return message.text
  }
  return undefined
}

function Mark(): React.JSX.Element {
  return (
    <span className="dwc-mark" aria-hidden="true">
      <span className="dwc-mark-wave" />
      <span className="dwc-mark-dot" />
    </span>
  )
}

function ginGameContext(match: MatchState | null): CompanionGameContext | null {
  if (match === null) return null
  return {
    gameId: 'gin-rummy',
    gameTitle: 'Gin Rummy',
    summary: `第 ${match.round}/${match.rules.handCount} 手；你 ${match.scores.human} 分，澜音 ${match.scores.lanyin} 分`,
  }
}

export function GameApp({ companion: companionPort, initiallyOpen, preview = false, taskSource }: GameAppProps): React.JSX.Element {
  const game = useGameController(initiallyOpen)
  const companion = useCompanion(companionPort, taskSource, ginGameContext(game.app.match))
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [companionOpen, setCompanionOpen] = useState(false)
  const match = game.app.match
  const expression = lanyinExpression({
    aiThinking: game.aiThinking,
    lastPublicAction: match?.history.at(-1),
    mood: companion.mood,
    taskNotice: null,
  })
  const artUrl = EXPRESSION_ART[expression]
  const latestCompanionReply = latestAssistantText(companion.messages)

  const start = useCallback(() => {
    if (!game.app.preferences.tutorialSeen) {
      setRulesOpen(true)
      return
    }
    game.startMatch()
  }, [game])

  const startFromRules = useCallback(() => {
    game.updatePreferences({ tutorialSeen: true })
    setRulesOpen(false)
    game.startMatch()
  }, [game])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!game.app.panelOpen || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') {
        event.preventDefault()
        if (companionOpen) setCompanionOpen(false)
        else if (settingsOpen) setSettingsOpen(false)
        else if (rulesOpen) setRulesOpen(false)
        else game.closePanel()
        return
      }
      if (match === null || match.phase === 'reveal' || match.phase === 'match_over') return
      if (/^[0-9]$/.test(event.key) && match.turn === 'human' && match.phase === 'discard') {
        const index = event.key === '0' ? 9 : Number(event.key) - 1
        const card = match.hands.human[index]
        if (card !== undefined) {
          event.preventDefault()
          game.selectCard(card.id)
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
  }, [companionOpen, game, match, rulesOpen, settingsOpen])

  const changePreferences = (next: PlayerPreferences): void => game.updatePreferences(next)

  return (
    <div className="dwc-root" data-expression={expression} data-preview={preview ? 'true' : 'false'}>
      <style id={STYLE_ELEMENT_ID}>{GAME_STYLES}</style>
      {!game.app.panelOpen && (
        <button className="dwc-launcher" type="button" onClick={game.openPanel} aria-label="打开鲸牌茶歇">
          <span className="dwc-launcher-art" style={{ backgroundImage: `url(${artUrl})` }} />
          <span className="dwc-launcher-copy"><strong>鲸牌</strong><small>和澜音歇一手</small></span>
        </button>
      )}

      {game.app.panelOpen && (
        <div className="dwc-overlay" role="dialog" aria-modal="true" aria-label="鲸牌茶歇">
          <main className="dwc-game-shell">
            <header className="dwc-topbar">
              <div className="dwc-brand"><Mark /><span><strong>鲸牌茶歇</strong><small>WHALE BREAKROOM</small></span></div>
              {match !== null && (
                <div className="dwc-match-meta" aria-label="本局状态">
                  <span>第 {match.round}/{match.rules.handCount} 手</span>
                  <span>你 {match.scores.human}</span>
                  <span>澜音 {match.scores.lanyin}</span>
                </div>
              )}
              <nav className="dwc-top-actions" aria-label="游戏菜单">
                <button
                  type="button"
                  className="dwc-text-button dwc-text-button--companion"
                  onClick={() => setCompanionOpen(true)}
                  aria-label="打开澜音对话与记忆"
                >澜音</button>
                <button type="button" className="dwc-text-button" onClick={() => setRulesOpen(true)}>玩法</button>
                <button type="button" className="dwc-text-button" onClick={() => setSettingsOpen(true)}>偏好</button>
                <button type="button" className="dwc-close-button" onClick={game.closePanel} aria-label="收起鲸牌">—</button>
              </nav>
            </header>

            {game.error !== null && (
              <div className="dwc-error" role="alert">
                <span>{game.error}</span>
                <button type="button" onClick={game.clearError} aria-label="关闭提示">×</button>
              </div>
            )}

            <div className="dwc-content">
              {match === null ? (
                <WelcomeView
                  artUrl={artUrl}
                  stats={game.app.stats}
                  onStart={start}
                  onRules={() => setRulesOpen(true)}
                />
              ) : match.phase === 'reveal' || match.phase === 'match_over' ? (
                <ResultView match={match} onNext={game.nextHand} onNewMatch={game.startMatch} />
              ) : (
                <TableView
                  match={match}
                  selectedCardId={game.selectedCardId}
                  aiThinking={game.aiThinking}
                  dialogue={latestCompanionReply ?? game.dialogue}
                  rapport={game.app.stats.rapport}
                  artUrl={artUrl}
                  onSelectCard={game.selectCard}
                  onDraw={game.draw}
                  onDiscard={({ cardId, kind }) => game.discard(kind, cardId)}
                  onPassWall={game.passWall}
                  onChat={() => setCompanionOpen(true)}
                />
              )}
            </div>
          </main>
        </div>
      )}

      <RulesPanel
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        onStart={match === null ? startFromRules : undefined}
      />
      <SettingsPanel
        open={settingsOpen}
        preferences={game.app.preferences}
        onChange={changePreferences}
        onClose={() => setSettingsOpen(false)}
      />
      <CompanionPanel
        open={companionOpen}
        snapshot={companion.snapshot}
        catalog={companion.catalog}
        messages={companion.messages}
        busy={companion.busy}
        error={companion.error}
        onClose={() => setCompanionOpen(false)}
        onSelectModel={companion.selectModel}
        onSend={companion.send}
        onRemember={companion.remember}
        onForget={companion.forget}
      />
    </div>
  )
}
