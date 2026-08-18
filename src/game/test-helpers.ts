import { cardId } from './cards.ts'
import type { Card, Rank, Suit } from './types.ts'

const SUIT_BY_CODE: Readonly<Record<string, Suit>> = {
  c: 'clubs',
  d: 'diamonds',
  h: 'hearts',
  s: 'spades',
}

const RANK_BY_CODE: Readonly<Record<string, Rank>> = {
  A: 1,
  J: 11,
  K: 13,
  Q: 12,
  T: 10,
}

export function card(notation: string): Card {
  const suit = SUIT_BY_CODE[notation.at(-1) ?? '']
  const rankCode = notation.slice(0, -1)
  const rank = RANK_BY_CODE[rankCode] ?? Number(rankCode) as Rank
  if (suit === undefined || !Number.isInteger(rank) || rank < 1 || rank > 13) {
    throw new Error(`invalid card notation: ${notation}`)
  }
  return { id: cardId(suit, rank), rank, suit }
}

export function cards(notations: readonly string[]): Card[] {
  return notations.map(card)
}

