import { SUITS, type Card, type Rank, type Suit } from './types.ts'

const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit[0]}${rank.toString().padStart(2, '0')}`
}

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({
    id: cardId(suit, rank),
    rank,
    suit,
  })))
}

export function cardPoints(card: Card): number {
  return Math.min(card.rank, 10)
}

export function rankLabel(rank: Rank): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

export function suitSymbol(suit: Suit): string {
  if (suit === 'clubs') return '♣'
  if (suit === 'diamonds') return '♦'
  if (suit === 'hearts') return '♥'
  return '♠'
}

/** A deterministic PRNG; the seed itself is created with browser crypto. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  const values = new Uint32Array(1)
  if (globalThis.crypto?.getRandomValues !== undefined) {
    globalThis.crypto.getRandomValues(values)
    return values[0] ?? 1
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}

export function shuffleDeck(seed: number): Card[] {
  const deck = createDeck()
  const random = seededRandom(seed)
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const held = deck[index]
    deck[index] = deck[target] as Card
    deck[target] = held as Card
  }
  return deck
}

export function sortCards(cards: readonly Card[]): Card[] {
  const suitOrder = new Map<Suit, number>(SUITS.map((suit, index) => [suit, index]))
  return [...cards].sort((left, right) => (
    (suitOrder.get(left.suit) ?? 0) - (suitOrder.get(right.suit) ?? 0)
    || left.rank - right.rank
  ))
}

