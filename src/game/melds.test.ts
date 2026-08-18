import { describe, expect, it } from 'vitest'
import { cardPoints, createDeck, shuffleDeck } from './cards.ts'
import { BICYCLE_RULES, legalKnockDiscards } from './engine.ts'
import { bestMeldLayout, deadwoodAfterLayoff, enumerateMelds, layoutAfterLayoff } from './melds.ts'
import { cards } from './test-helpers.ts'

describe('deck and card values', () => {
  it('creates 52 unique cards and shuffles deterministically', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((card) => card.id))).toHaveLength(52)
    expect(shuffleDeck(42).map((card) => card.id)).toEqual(shuffleDeck(42).map((card) => card.id))
    expect(shuffleDeck(42).map((card) => card.id)).not.toEqual(shuffleDeck(43).map((card) => card.id))
  })

  it('caps face-card deadwood at ten', () => {
    const hand = cards(['Ac', '3s', 'Jd', 'Kh'])
    expect(hand.map(cardPoints)).toEqual([1, 3, 10, 10])
    expect(bestMeldLayout(hand).deadwoodPoints).toBe(24)
  })
})

describe('meld search', () => {
  it('accepts ace-low runs and rejects around-the-corner runs', () => {
    expect(enumerateMelds(cards(['As', '2s', '3s']))).toHaveLength(1)
    expect(enumerateMelds(cards(['As', '2s', '3s', 'Ks'])).some((meld) => meld.cards.length === 4)).toBe(false)
  })

  it('enumerates all four ace triples, the four-card set, and A-2-3', () => {
    expect(enumerateMelds(cards(['As', 'Ac', 'Ad', 'Ah', '2s', '3s']))).toHaveLength(6)
  })

  it('finds the globally optimal non-overlapping meld layout', () => {
    const hand = cards(['As', '5s', '6s', '7s', '5c', '6c', '7c', '5d', '6d', '7d'])
    const layout = bestMeldLayout(hand)
    expect(layout.deadwood.map((card) => card.id)).toEqual(cards(['As']).map((card) => card.id))
    expect(layout.deadwoodPoints).toBe(1)
  })

  it('finds the best discard across an overlapping eleven-card hand', () => {
    const hand = cards(['4s', '4c', '4d', '4h', '5s', '5c', '5d', '6s', '2c', '3s', '3c'])
    const options = hand.map((discard) => ({
      discard,
      layout: bestMeldLayout(hand.filter((candidate) => candidate.id !== discard.id)),
    })).sort((left, right) => left.layout.deadwoodPoints - right.layout.deadwoodPoints)
    expect(options[0]?.discard.id).toBe(cards(['6s'])[0]?.id)
    expect(options[0]?.layout.deadwoodPoints).toBe(3)
  })

  it('allows a knock at exactly ten deadwood only after discarding 8c', () => {
    const hand = cards(['Js', 'Jh', 'Jd', '8c', '7s', '7h', '7d', '4s', '3d', '2s', 'Ac'])
    expect(legalKnockDiscards(hand, BICYCLE_RULES).map((card) => card.id)).toEqual(
      cards(['8c']).map((card) => card.id),
    )
  })
})

describe('layoff optimization', () => {
  it('can break a potential set when sequential layoffs leave less deadwood', () => {
    const knocker = bestMeldLayout(cards(['Ks', 'Kc', 'Kd', '5s', '6s', '7s', '9c', 'Tc', 'Jc', 'Jd']))
    const opponent = cards(['2s', '2c', '2d', '2h', '8s', '9s', '7c', '8c', '8d', 'Ac'])
    expect(knocker.deadwoodPoints).toBe(10)
    expect(deadwoodAfterLayoff(opponent, knocker.melds)).toBe(9)
  })

  it('supports chained run extension in the useful order', () => {
    const knocker = bestMeldLayout(cards(['As', 'Ac', 'Ad', 'Tc', 'Td', 'Th', 'Js', 'Qs', 'Ks', '2h']))
    const opponent = cards(['4s', '5s', '9s', 'Ts', '4c', '5c', '4d', '5d', '4h', '5h'])
    const layout = layoutAfterLayoff(opponent, knocker.melds)
    expect(layout.deadwoodPoints).toBe(0)
    expect(layout.laidOff?.map((card) => card.id)).toEqual(cards(['9s', 'Ts']).map((card) => card.id))
    expect([
      ...layout.melds.flatMap((meld) => meld.cards),
      ...(layout.laidOff ?? []),
      ...layout.deadwood,
    ].map((card) => card.id).sort()).toEqual(opponent.map((card) => card.id).sort())
  })
})
