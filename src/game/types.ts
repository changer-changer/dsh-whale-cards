export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
export type Suit = (typeof SUITS)[number]

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  readonly id: string
  readonly rank: Rank
  readonly suit: Suit
}

export interface Meld {
  readonly kind: 'run' | 'set'
  readonly cards: readonly Card[]
}

export interface MeldLayout {
  readonly deadwood: readonly Card[]
  readonly deadwoodPoints: number
  readonly laidOff?: readonly Card[]
  readonly melds: readonly Meld[]
}

export type Player = 'human' | 'lanyin'
export type DrawSource = 'stock' | 'discard'
export type Difficulty = 'relaxed' | 'steady' | 'sharp'

export interface RulesProfile {
  readonly id: 'bicycle' | 'openSpielCompat'
  readonly ginBonus: number
  readonly handCount: number
  readonly knockLimit: number
  readonly undercutBonus: number
}

export interface PublicAction {
  readonly at: number
  readonly card?: Card
  readonly player: Player
  readonly type: 'deal' | 'draw_stock' | 'take_discard' | 'discard' | 'knock' | 'gin'
}

export interface HandResult {
  readonly humanLayout: MeldLayout
  readonly lanyinLayout: MeldLayout
  readonly kind: 'draw' | 'gin' | 'knock' | 'undercut'
  readonly points: number
  readonly round: number
  readonly winner: Player | null
}

export interface MatchState {
  readonly version: 1
  readonly seed: number
  readonly rules: RulesProfile
  readonly round: number
  readonly dealer: Player
  readonly turn: Player
  readonly phase: 'draw' | 'discard' | 'reveal' | 'match_over'
  readonly stock: readonly Card[]
  readonly discard: readonly Card[]
  readonly hands: Readonly<Record<Player, readonly Card[]>>
  readonly drawnCardId?: string
  readonly drawSource?: DrawSource
  readonly wallKnockRequired?: boolean
  readonly scores: Readonly<Record<Player, number>>
  readonly history: readonly PublicAction[]
  readonly handResult?: HandResult
}
