import { rankLabel, suitSymbol } from '../game/cards.ts'
import type { Card } from '../game/types.ts'

interface CardViewProps {
  readonly card: Card
  readonly compact?: boolean
  readonly disabled?: boolean
  readonly inMeld?: boolean
  readonly onClick?: () => void
  readonly selected?: boolean
}

const SUIT_NAME = {
  clubs: '梅花',
  diamonds: '方片',
  hearts: '红桃',
  spades: '黑桃',
} as const

export function CardView({
  card,
  compact = false,
  disabled = false,
  inMeld = false,
  onClick,
  selected = false,
}: CardViewProps) {
  const red = card.suit === 'diamonds' || card.suit === 'hearts'
  const className = [
    'dwc-card',
    red ? 'dwc-card--red' : '',
    selected ? 'dwc-card--selected' : '',
    inMeld ? 'dwc-card--meld' : '',
    compact ? 'dwc-card--compact' : '',
  ].filter(Boolean).join(' ')
  const label = `${SUIT_NAME[card.suit]}${rankLabel(card.rank)}${inMeld ? '，已成组' : ''}`
  if (onClick === undefined) {
    return <span className={className} aria-label={label}>
      <span className="dwc-card__rank">{rankLabel(card.rank)}</span>
      <span className="dwc-card__suit">{suitSymbol(card.suit)}</span>
    </span>
  }
  return <button
    type="button"
    className={className}
    aria-label={`${selected ? '已选择，' : ''}${label}`}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="dwc-card__rank">{rankLabel(card.rank)}</span>
    <span className="dwc-card__suit">{suitSymbol(card.suit)}</span>
    {inMeld ? <span className="dwc-card__meld-dot" aria-label="已成组" /> : null}
  </button>
}
