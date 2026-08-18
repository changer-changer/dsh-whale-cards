import { useMemo } from 'react'
import type { GameId } from './game-contract.ts'
import { GAME_REGISTRY, type RegisteredGame } from './game-registry.ts'
import { createGameStorage, type GameStorageOptions } from './game-storage.ts'

/**
 * Curated hall (spec §13.2). Lists registered games as cards with cover,
 * title, summary, estimated duration and a single "开始 / 继续" affordance.
 * The hall never loads game code, never renders fake install / download /
 * rating buttons, and never uses infinite scroll.
 */

export interface GameHallProps {
  /** Called when the player picks a game; receives its manifest id. */
  readonly onSelectGame: (gameId: GameId) => void
  /** Optional id of the last-played game so the hall can highlight resume. */
  readonly lastPlayedGameId?: GameId
  /** Registry override for tests; production uses `GAME_REGISTRY`. */
  readonly registry?: readonly RegisteredGame[]
  /** Storage overrides used by tests to detect existing saves in memory. */
  readonly storage?: GameStorageOptions
}

function formatEstimatedMinutes(minutes: readonly number[] | undefined): string | null {
  if (minutes === undefined || minutes.length === 0) return null
  if (minutes.length === 1) return `约 ${minutes[0]} 分钟`
  return `约 ${minutes[0]}–${minutes[minutes.length - 1]} 分钟`
}

export function GameHall({
  onSelectGame,
  lastPlayedGameId,
  registry = GAME_REGISTRY,
  storage,
}: GameHallProps): React.JSX.Element {
  // For each manifest, check whether a save exists so the CTA reads 继续 vs 开始.
  const cards = useMemo(
    () =>
      registry.map(({ manifest }) => {
        const probe = createGameStorage(manifest.id, { storage: storage?.storage })
        const hasSave = probe.load() !== null
        return { manifest, hasSave }
      }),
    [registry, storage?.storage],
  )

  return (
    <section className="dwc-breakroom-hall" aria-label="茶歇间大厅">
      <header className="dwc-breakroom-hall__intro">
        <span className="dwc-eyebrow">DSH BREAKROOM</span>
        <h2>茶歇间</h2>
        <p>维护者策展的精品小游戏。点开即玩，局面会自动保存，随时可以回来。</p>
      </header>

      <ul className="dwc-breakroom-hall__list">
        {cards.map(({ manifest, hasSave }) => {
          const isLastPlayed = lastPlayedGameId === manifest.id
          const cta = hasSave ? '继续' : '开始'
          const estimated = formatEstimatedMinutes(manifest.estimatedMinutes)
          return (
            <li
              key={manifest.id}
              className={
                isLastPlayed
                  ? 'dwc-breakroom-card dwc-breakroom-card--last-played'
                  : 'dwc-breakroom-card'
              }
            >
              <div
                className="dwc-breakroom-card__cover"
                role="img"
                aria-label={`${manifest.title} 封面`}
                style={{ backgroundImage: `url(${manifest.coverUrl})` }}
              />
              <div className="dwc-breakroom-card__body">
                <div className="dwc-breakroom-card__heading">
                  <h3>{manifest.title}</h3>
                  {isLastPlayed && <span className="dwc-breakroom-card__flag">上次在玩</span>}
                </div>
                <p className="dwc-breakroom-card__summary">{manifest.summary}</p>
                <dl className="dwc-breakroom-card__meta">
                  {estimated !== null && (
                    <div>
                      <dt>时长</dt>
                      <dd>{estimated}</dd>
                    </div>
                  )}
                  <div>
                    <dt>版本</dt>
                    <dd>{manifest.version}</dd>
                  </div>
                  {manifest.tags !== undefined && manifest.tags.length > 0 && (
                    <div>
                      <dt>标签</dt>
                      <dd>{manifest.tags.join(' · ')}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="dwc-breakroom-card__actions">
                <button
                  type="button"
                  className="dwc-button dwc-button--primary"
                  onClick={() => onSelectGame(manifest.id)}
                  aria-label={`${cta} ${manifest.title}`}
                >
                  {cta}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
