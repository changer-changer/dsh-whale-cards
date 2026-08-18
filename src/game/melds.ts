import { cardPoints, sortCards } from './cards.ts'
import type { Card, Meld, MeldLayout } from './types.ts'

function choose<T>(items: readonly T[], count: number): T[][] {
  const result: T[][] = []
  const visit = (start: number, selected: T[]): void => {
    if (selected.length === count) {
      result.push(selected)
      return
    }
    for (let index = start; index <= items.length - (count - selected.length); index += 1) {
      visit(index + 1, [...selected, items[index] as T])
    }
  }
  visit(0, [])
  return result
}

function meldKey(meld: Meld): string {
  return `${meld.kind}:${meld.cards.map((card) => card.id).sort().join(',')}`
}

export function enumerateMelds(hand: readonly Card[]): Meld[] {
  const result = new Map<string, Meld>()
  const byRank = new Map<number, Card[]>()
  const bySuit = new Map<string, Card[]>()

  for (const card of hand) {
    byRank.set(card.rank, [...(byRank.get(card.rank) ?? []), card])
    bySuit.set(card.suit, [...(bySuit.get(card.suit) ?? []), card])
  }

  for (const cards of byRank.values()) {
    if (cards.length < 3) continue
    for (const size of [3, 4]) {
      if (cards.length < size) continue
      for (const group of choose(cards, size)) {
        const meld: Meld = { kind: 'set', cards: sortCards(group) }
        result.set(meldKey(meld), meld)
      }
    }
  }

  for (const cards of bySuit.values()) {
    const ordered = [...cards].sort((left, right) => left.rank - right.rank)
    for (let start = 0; start < ordered.length; start += 1) {
      for (let end = start + 2; end < ordered.length; end += 1) {
        const segment = ordered.slice(start, end + 1)
        const contiguous = segment.every((card, index) => (
          index === 0 || card.rank === (segment[index - 1] as Card).rank + 1
        ))
        if (!contiguous) break
        const meld: Meld = { kind: 'run', cards: segment }
        result.set(meldKey(meld), meld)
      }
    }
  }

  return [...result.values()]
}

function layoutKey(melds: readonly Meld[]): string {
  return melds.map(meldKey).sort().join('|')
}

export function enumerateMeldLayouts(hand: readonly Card[]): MeldLayout[] {
  const candidates = enumerateMelds(hand)
  const layouts = new Map<string, MeldLayout>()

  const visit = (index: number, selected: Meld[], used: Set<string>): void => {
    if (index === candidates.length) {
      const deadwood = sortCards(hand.filter((card) => !used.has(card.id)))
      const layout: MeldLayout = {
        deadwood,
        deadwoodPoints: deadwood.reduce((sum, card) => sum + cardPoints(card), 0),
        melds: [...selected],
      }
      layouts.set(layoutKey(layout.melds), layout)
      return
    }

    visit(index + 1, selected, used)
    const meld = candidates[index] as Meld
    if (meld.cards.some((card) => used.has(card.id))) return
    const nextUsed = new Set(used)
    meld.cards.forEach((card) => nextUsed.add(card.id))
    visit(index + 1, [...selected, meld], nextUsed)
  }

  visit(0, [], new Set())
  return [...layouts.values()].sort((left, right) => (
    left.deadwoodPoints - right.deadwoodPoints
    || left.deadwood.length - right.deadwood.length
    || right.melds.length - left.melds.length
  ))
}

export function bestMeldLayout(hand: readonly Card[]): MeldLayout {
  return enumerateMeldLayouts(hand)[0] ?? {
    deadwood: sortCards(hand),
    deadwoodPoints: hand.reduce((sum, card) => sum + cardPoints(card), 0),
    melds: [],
  }
}

function canonicalMeldState(melds: readonly Meld[]): string {
  return melds.map((meld) => {
    const ordered = [...meld.cards].sort((left, right) => left.rank - right.rank)
    return `${meld.kind}:${ordered.map((card) => card.id).join(',')}`
  }).sort().join('|')
}

function canLayOff(card: Card, meld: Meld): boolean {
  if (meld.kind === 'set') {
    return meld.cards.length < 4
      && meld.cards[0]?.rank === card.rank
      && !meld.cards.some((member) => member.suit === card.suit)
  }
  if (meld.cards[0]?.suit !== card.suit) return false
  const ranks = meld.cards.map((member) => member.rank)
  return card.rank === Math.min(...ranks) - 1 || card.rank === Math.max(...ranks) + 1
}

function attach(card: Card, melds: readonly Meld[], index: number): Meld[] {
  return melds.map((meld, meldIndex) => meldIndex === index
    ? { ...meld, cards: sortCards([...meld.cards, card]) }
    : meld)
}

interface LayoffResult {
  readonly cards: readonly Card[]
  readonly points: number
}

function betterLayoff(candidate: LayoffResult, current: LayoffResult): LayoffResult {
  if (candidate.points !== current.points) return candidate.points > current.points ? candidate : current
  if (candidate.cards.length !== current.cards.length) {
    return candidate.cards.length > current.cards.length ? candidate : current
  }
  const candidateKey = candidate.cards.map((card) => card.id).sort().join(',')
  const currentKey = current.cards.map((card) => card.id).sort().join(',')
  return candidateKey < currentKey ? candidate : current
}

function maximumLayoff(cards: readonly Card[], targetMelds: readonly Meld[]): LayoffResult {
  const memo = new Map<string, LayoffResult>()
  const visit = (remaining: readonly Card[], melds: readonly Meld[]): LayoffResult => {
    if (remaining.length === 0) return { cards: [], points: 0 }
    const key = `${remaining.map((card) => card.id).sort().join(',')}::${canonicalMeldState(melds)}`
    const known = memo.get(key)
    if (known !== undefined) return known

    let best: LayoffResult = { cards: [], points: 0 }
    for (let cardIndex = 0; cardIndex < remaining.length; cardIndex += 1) {
      const card = remaining[cardIndex] as Card
      const rest = remaining.filter((_, index) => index !== cardIndex)
      best = betterLayoff(visit(rest, melds), best)
      for (let meldIndex = 0; meldIndex < melds.length; meldIndex += 1) {
        const meld = melds[meldIndex] as Meld
        if (!canLayOff(card, meld)) continue
        const next = visit(rest, attach(card, melds, meldIndex))
        best = betterLayoff({
          cards: [card, ...next.cards],
          points: cardPoints(card) + next.points,
        }, best)
      }
    }
    memo.set(key, best)
    return best
  }
  return visit(cards, targetMelds)
}

/** The opponent's truthful post-layoff layout, including cards attached to the knocker's melds. */
export function layoutAfterLayoff(
  opponentHand: readonly Card[],
  knockerMelds: readonly Meld[],
): MeldLayout {
  let best: MeldLayout | undefined
  for (const layout of enumerateMeldLayouts(opponentHand)) {
    const layoff = maximumLayoff(layout.deadwood, knockerMelds)
    const laidOffIds = new Set(layoff.cards.map((card) => card.id))
    const candidate: MeldLayout = {
      deadwood: layout.deadwood.filter((card) => !laidOffIds.has(card.id)),
      deadwoodPoints: layout.deadwoodPoints - layoff.points,
      laidOff: sortCards(layoff.cards),
      melds: layout.melds,
    }
    if (best === undefined
      || candidate.deadwoodPoints < best.deadwoodPoints
      || (candidate.deadwoodPoints === best.deadwoodPoints && candidate.deadwood.length < best.deadwood.length)
      || (candidate.deadwoodPoints === best.deadwoodPoints
        && candidate.deadwood.length === best.deadwood.length
        && candidate.melds.length > best.melds.length)) {
      best = candidate
    }
  }
  return best ?? bestMeldLayout(opponentHand)
}

/** Minimum opponent deadwood after choosing their own melds and laying off. */
export function deadwoodAfterLayoff(
  opponentHand: readonly Card[],
  knockerMelds: readonly Meld[],
): number {
  return layoutAfterLayoff(opponentHand, knockerMelds).deadwoodPoints
}
