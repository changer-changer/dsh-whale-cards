import { canKnockWithUpcard, legalKnockDiscards } from '../game/engine.ts'
import { bestMeldLayout } from '../game/melds.ts'
import type { DrawSource, MatchState } from '../game/types.ts'
import { CardView } from './CardView.tsx'

export interface DiscardIntent {
  readonly cardId: string
  readonly kind: 'discard' | 'knock'
}

export interface TableViewProps {
  readonly match: MatchState
  readonly selectedCardId: string | null
  readonly aiThinking: boolean
  readonly dialogue: string | null
  readonly rapport: number
  readonly artUrl: string
  readonly onSelectCard: (cardId: string) => void
  readonly onDraw: (source: DrawSource) => void
  readonly onDiscard: (intent: DiscardIntent) => void
  readonly onPassWall: () => void
  readonly onChat: () => void
}

function turnStatus(match: MatchState, aiThinking: boolean): string {
  if (match.phase === 'reveal') return '本手已经结算'
  if (match.phase === 'match_over') return '三手牌局已经结束'
  if (aiThinking) return '澜音正在理牌…'
  if (match.turn === 'lanyin') return '等待澜音出牌…'
  if (match.phase === 'draw') {
    return match.stock.length <= 2
      ? '牌墙已到：拿明牌并立即敲牌，或结束本手'
      : '轮到你摸牌'
  }
  return match.wallKnockRequired
    ? '请选择一张牌立即敲牌'
    : '选择一张手牌，然后弃牌或敲牌'
}

export function TableView({
  match,
  selectedCardId,
  aiThinking,
  dialogue,
  rapport,
  artUrl,
  onSelectCard,
  onDraw,
  onDiscard,
  onPassWall,
  onChat,
}: TableViewProps) {
  const humanHand = match.hands.human
  const selectedCard = humanHand.find((card) => card.id === selectedCardId)
  const humanTurn = match.turn === 'human'
  const canDraw = humanTurn && match.phase === 'draw' && !aiThinking
  const canChooseCard = humanTurn && match.phase === 'discard' && !aiThinking
  const atWall = match.stock.length <= 2
  const upcard = match.discard.at(-1)
  const forbiddenCardId = match.drawSource === 'discard' ? match.drawnCardId : undefined
  const selectedIsForbidden = selectedCardId !== null && selectedCardId === forbiddenCardId
  const knockCardIds = new Set(
    legalKnockDiscards(humanHand, match.rules, forbiddenCardId).map((card) => card.id),
  )
  const canDiscardSelected = canChooseCard
    && selectedCard !== undefined
    && !selectedIsForbidden
    && !match.wallKnockRequired
  const canKnockSelected = canChooseCard
    && selectedCard !== undefined
    && !selectedIsForbidden
    && knockCardIds.has(selectedCard.id)
  const layout = bestMeldLayout(humanHand)
  const meldCardIds = new Set(layout.melds.flatMap((meld) => meld.cards.map((card) => card.id)))
  const canTakeWallUpcard = atWall && canDraw && canKnockWithUpcard(match, 'human')
  const normalizedRapport = Math.max(0, Math.min(100, rapport))

  return (
    <section className="dwc-table" aria-label="与澜音的 Gin Rummy 牌桌">
      <header className="dwc-table__bar">
        <div className="dwc-table__identity">
          <span className="dwc-eyebrow">DSH / BREAK SESSION</span>
          <strong>鲸牌茶歇</strong>
        </div>
        <dl className="dwc-score" aria-label="当前比分">
          <div>
            <dt>你</dt>
            <dd>{match.scores.human}</dd>
          </div>
          <div className="dwc-score__round">
            <dt>手数</dt>
            <dd>{match.round}/{match.rules.handCount}</dd>
          </div>
          <div>
            <dt>澜音</dt>
            <dd>{match.scores.lanyin}</dd>
          </div>
        </dl>
      </header>

      <div className="dwc-table__stage">
        <aside className="dwc-companion" aria-label="牌友澜音">
          <img
            className="dwc-companion__art"
            src={artUrl}
            alt="澜音坐在深夜港湾茶室的牌桌旁"
            draggable={false}
          />
          <div className="dwc-companion__shade" aria-hidden="true" />
          <div className="dwc-companion__meta">
            <div>
              <span className="dwc-eyebrow">TABLEMATE</span>
              <strong>澜音</strong>
            </div>
            <div
              className="dwc-rapport"
              role="progressbar"
              aria-label="与澜音的熟悉度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={normalizedRapport}
            >
              <span>熟悉度 {normalizedRapport}</span>
              <i style={{ '--dwc-progress': `${normalizedRapport}%` } as React.CSSProperties} />
            </div>
          </div>
          <div className="dwc-dialogue" aria-live="polite" aria-atomic="true">
            <span className="dwc-dialogue__name">澜音</span>
            <p>{dialogue ?? '海面很安静。慢慢想，不着急。'}</p>
            <button type="button" className="dwc-icon-button" onClick={onChat} aria-label="和澜音聊一句">
              <span aria-hidden="true">···</span>
            </button>
          </div>
        </aside>

        <div className="dwc-play-area">
          <div className="dwc-opponent-zone" aria-label={`澜音有 ${match.hands.lanyin.length} 张手牌`}>
            <div className="dwc-zone-label">
              <span>澜音的手牌</span>
              <output>{match.hands.lanyin.length} 张</output>
            </div>
            <div className="dwc-opponent-hand" aria-hidden="true">
              {match.hands.lanyin.map((card, index) => (
                <span
                  key={card.id}
                  className="dwc-card dwc-card--back dwc-card--compact"
                  style={{ '--dwc-card-index': index } as React.CSSProperties}
                >
                  <i />
                </span>
              ))}
            </div>
          </div>

          <div className="dwc-table-center">
            <div className="dwc-pile-group">
              <button
                type="button"
                className="dwc-pile"
                disabled={!canDraw || atWall}
                onClick={() => onDraw('stock')}
                aria-label={atWall ? '牌墙已到，不能继续从牌堆摸牌' : `从牌堆摸一张，还剩 ${match.stock.length} 张`}
              >
                <span className="dwc-card dwc-card--back" aria-hidden="true"><i /></span>
                <span className="dwc-pile__label">牌堆 <b>{match.stock.length}</b></span>
              </button>
              <button
                type="button"
                className="dwc-pile dwc-pile--discard"
                disabled={!canDraw || upcard === undefined || (atWall && !canTakeWallUpcard)}
                onClick={() => onDraw('discard')}
                aria-label={upcard === undefined ? '弃牌区为空' : `拿起弃牌区顶牌`}
              >
                {upcard === undefined
                  ? <span className="dwc-card dwc-card--empty" aria-hidden="true" />
                  : <CardView card={upcard} />}
                <span className="dwc-pile__label">明牌 <b>{match.discard.length}</b></span>
              </button>
            </div>

            <div className="dwc-turn-status" role="status" aria-live="polite">
              <span className={aiThinking ? 'dwc-status-dot dwc-status-dot--thinking' : 'dwc-status-dot'} aria-hidden="true" />
              <span>{turnStatus(match, aiThinking)}</span>
            </div>

            {atWall && canDraw ? (
              <button type="button" className="dwc-button dwc-button--quiet" onClick={onPassWall}>
                结束本手
              </button>
            ) : null}
          </div>

          <div className="dwc-player-zone">
            <div className="dwc-zone-label">
              <span>你的手牌</span>
              <output>散牌 {layout.deadwoodPoints} 点</output>
            </div>
            <ul className="dwc-hand" aria-label="你的手牌">
              {humanHand.map((card) => (
                <li
                  key={card.id}
                  className={card.id === forbiddenCardId ? 'dwc-hand__card dwc-hand__card--locked' : 'dwc-hand__card'}
                >
                  <CardView
                    card={card}
                    disabled={!canChooseCard}
                    inMeld={meldCardIds.has(card.id)}
                    onClick={() => onSelectCard(card.id)}
                    selected={card.id === selectedCardId}
                  />
                  {card.id === forbiddenCardId ? <span className="dwc-hand__hint">本轮不能弃</span> : null}
                </li>
              ))}
            </ul>
            <div className="dwc-actions" aria-label="出牌操作">
              <p className="dwc-actions__selection" aria-live="polite">
                {selectedCard === undefined
                  ? '尚未选牌'
                  : selectedIsForbidden
                    ? '刚拿起的明牌本轮不能弃掉'
                    : `已选 ${selectedCard.rank === 1 ? 'A' : selectedCard.rank === 11 ? 'J' : selectedCard.rank === 12 ? 'Q' : selectedCard.rank === 13 ? 'K' : selectedCard.rank}`}
              </p>
              <button
                type="button"
                className="dwc-button dwc-button--secondary"
                disabled={!canDiscardSelected}
                onClick={() => selectedCard && onDiscard({ cardId: selectedCard.id, kind: 'discard' })}
              >
                弃牌
              </button>
              <button
                type="button"
                className="dwc-button dwc-button--primary"
                disabled={!canKnockSelected}
                onClick={() => selectedCard && onDiscard({ cardId: selectedCard.id, kind: 'knock' })}
              >
                敲牌
                <span>≤ {match.rules.knockLimit}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
