import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '../../breakroom/game-contract.ts'
import {
  LANYIN_CALM_ART,
  LANYIN_CONCERNED_ART,
  LANYIN_PLEASED_ART,
  LANYIN_THINKING_ART,
} from '../../client/generated/art'
import { lanyinExpression, type LanyinExpression } from '../../ui/expression.ts'
import { ResultView } from '../../ui/ResultView.tsx'
import { RulesPanel } from '../../ui/RulesPanel.tsx'
import { SettingsPanel } from '../../ui/SettingsPanel.tsx'
import { GAME_STYLES, STYLE_ELEMENT_ID } from '../../ui/styles.ts'
import { TableView } from '../../ui/TableView.tsx'
import { useGameController } from '../../ui/useGameController.ts'
import { WelcomeView } from '../../ui/WelcomeView.tsx'
import { createGinStorageAdapter } from './save.ts'

const EXPRESSION_ART: Record<LanyinExpression, string> = {
  calm: LANYIN_CALM_ART,
  concerned: LANYIN_CONCERNED_ART,
  pleased: LANYIN_PLEASED_ART,
  thinking: LANYIN_THINKING_ART,
}

/**
 * Gin Rummy's `GameDefinition` component (spec §8). It receives only
 * `GameProps` — the namespaced `storage`, the narrowed `companion` port, and
 * `onExit` — and renders the existing Gin Rummy experience by reusing the
 * current controller and views.
 *
 * Persistence now flows through the namespaced `GameStorage` via
 * `createGinStorageAdapter`; the legacy `dsh-whale-cards:save:v1` key is only
 * read by the one-time migration the runtime invokes (`migrate` on the
 * `GameDefinition`), never here.
 *
 * The narrowed `GameCompanionPort` is used only outbound: the current dialogue
 * line is forwarded through `say`, the computed expression through `setMood`,
 * and the table's chat affordance through `openChat`. None of these gate
 * playability.
 */
export function GinRummyGame({ storage, companion, onExit }: GameProps): React.JSX.Element {
  const adapter = useMemo(() => createGinStorageAdapter(storage), [storage])
  const game = useGameController(true, adapter)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Keep the latest companion port in a ref so the outbound signals below fire
  // only when the emitted value changes, not on every parent re-render.
  const companionRef = useRef(companion)
  useEffect(() => {
    companionRef.current = companion
  }, [companion])

  const match = game.app.match
  const expression = lanyinExpression({
    aiThinking: game.aiThinking,
    lastPublicAction: match?.history.at(-1),
    mood: 'calm',
    taskNotice: null,
  })
  const artUrl = EXPRESSION_ART[expression]

  useEffect(() => {
    companionRef.current.say(game.dialogue)
  }, [game.dialogue])

  useEffect(() => {
    companionRef.current.setMood(expression)
  }, [expression])

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

  return (
    <div className="dwc-root">
      <style id={STYLE_ELEMENT_ID}>{GAME_STYLES}</style>

      <div className="dwc-gin-adapter">
        <header className="dwc-gin-adapter__bar" aria-label="游戏菜单">
          <button type="button" className="dwc-text-button" onClick={() => setRulesOpen(true)}>玩法</button>
          <button type="button" className="dwc-text-button" onClick={() => setSettingsOpen(true)}>偏好</button>
          <button type="button" className="dwc-text-button" onClick={onExit} aria-label="返回大厅">返回大厅</button>
        </header>

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
            dialogue={game.dialogue}
            rapport={game.app.stats.rapport}
            artUrl={artUrl}
            onSelectCard={game.selectCard}
            onDraw={game.draw}
            onDiscard={({ cardId, kind }) => game.discard(kind, cardId)}
            onPassWall={game.passWall}
            onChat={companionRef.current.openChat}
          />
        )}
      </div>

      <RulesPanel
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        onStart={match === null ? startFromRules : undefined}
      />
      <SettingsPanel
        open={settingsOpen}
        preferences={game.app.preferences}
        onChange={game.updatePreferences}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
