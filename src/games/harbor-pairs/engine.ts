/** Pure engine for Tide Relics: short push-your-luck collection duels. */

export type Player = 'human' | 'lanyin'
export type TreasureFamily = 'pearl' | 'coral' | 'light' | 'map'
export type PerilKind = 'squall' | 'reef' | 'undertow'
export type TidePhase = 'play' | 'round_end' | 'match_over'

export type TideCard =
  | { readonly id: string; readonly category: 'treasure'; readonly family: TreasureFamily; readonly value: number }
  | { readonly id: string; readonly category: 'peril'; readonly peril: PerilKind }

export interface VoyageState {
  readonly cards: readonly TideCard[]
  readonly perils: readonly PerilKind[]
}

export interface TideState {
  readonly version: 2
  readonly round: number
  readonly phase: TidePhase
  readonly turn: Player
  readonly deck: readonly TideCard[]
  readonly voyage: VoyageState
  readonly bank: Readonly<Record<Player, number>>
  readonly totalScores: Readonly<Record<Player, number>>
  readonly lastRoundScores: Readonly<Record<Player, number>> | null
  readonly winner: Player | null
  readonly lastEvent: string
}

export const MAX_ROUNDS = 3

export const FAMILY_LABEL: Readonly<Record<TreasureFamily, string>> = {
  pearl: '月珠',
  coral: '赤珊',
  light: '灯火',
  map: '星图',
}

export const PERIL_LABEL: Readonly<Record<PerilKind, string>> = {
  squall: '风暴',
  reef: '暗礁',
  undertow: '回流',
}

export const TIDE_DECK: readonly TideCard[] = [
  ...(['pearl', 'coral', 'light', 'map'] as const).flatMap((family) =>
    [1, 1, 2, 2, 3, 4].map((value, index) => ({
      id: `${family}-${index + 1}`,
      category: 'treasure' as const,
      family,
      value,
    })),
  ),
  ...(['squall', 'reef', 'undertow'] as const).flatMap((peril) =>
    [1, 2, 3].map((index) => ({ id: `${peril}-${index}`, category: 'peril' as const, peril })),
  ),
]

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

function freshDeck(random: () => number): readonly TideCard[] {
  return shuffled(TIDE_DECK, random)
}

export function createMatch(random: () => number = Math.random): TideState {
  return {
    version: 2,
    round: 1,
    phase: 'play',
    turn: 'human',
    deck: freshDeck(random),
    voyage: { cards: [], perils: [] },
    bank: { human: 0, lanyin: 0 },
    totalScores: { human: 0, lanyin: 0 },
    lastRoundScores: null,
    winner: null,
    lastEvent: '第一轮潜航开始。',
  }
}

export function isTideState(value: unknown): value is TideState {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<TideState>
  return candidate.version === 2
    && typeof candidate.round === 'number'
    && (candidate.turn === 'human' || candidate.turn === 'lanyin')
    && Array.isArray(candidate.deck)
    && candidate.voyage !== undefined
}

export function voyageScore(cards: readonly TideCard[]): number {
  const treasures = cards.filter((card): card is Extract<TideCard, { category: 'treasure' }> => card.category === 'treasure')
  const base = treasures.reduce((total, card) => total + card.value, 0)
  const counts = new Map<TreasureFamily, number>()
  for (const card of treasures) counts.set(card.family, (counts.get(card.family) ?? 0) + 1)
  const chainBonus = [...counts.values()].reduce((total, count) => total + count * Math.max(0, count - 1), 0)
  const chartBonus = counts.size === 4 ? 5 : 0
  return base + chainBonus + chartBonus
}

export function bustRisk(state: TideState): number {
  if (state.deck.length === 0 || state.voyage.perils.length === 0) return 0
  const seen = new Set(state.voyage.perils)
  const bustCards = state.deck.filter((card) => card.category === 'peril' && seen.has(card.peril)).length
  return bustCards / state.deck.length
}

function finishVoyage(state: TideState, points: number, busted: boolean, random: () => number): TideState {
  const bank = { ...state.bank, [state.turn]: points }
  const who = state.turn === 'human' ? '你' : '澜音'
  const event = busted ? `${who}的险象重复，本轮空手返港。` : `${who}收帆，把 ${points} 分带回港。`

  if (state.turn === 'human') {
    return {
      ...state,
      turn: 'lanyin',
      deck: freshDeck(random),
      voyage: { cards: [], perils: [] },
      bank,
      lastEvent: event,
    }
  }

  const totalScores = {
    human: state.totalScores.human + bank.human,
    lanyin: state.totalScores.lanyin + bank.lanyin,
  }
  const matchOver = state.round >= MAX_ROUNDS
  const winner: Player | null = !matchOver || totalScores.human === totalScores.lanyin
    ? null
    : totalScores.human > totalScores.lanyin ? 'human' : 'lanyin'

  return {
    ...state,
    phase: matchOver ? 'match_over' : 'round_end',
    bank,
    totalScores,
    lastRoundScores: bank,
    voyage: { cards: [], perils: [] },
    winner,
    lastEvent: `${event} 第 ${state.round} 轮结算：${bank.human} : ${bank.lanyin}。`,
  }
}

export function dive(state: TideState, player: Player, random: () => number = Math.random): TideState {
  if (state.phase !== 'play') throw new Error('这一轮已经结束。')
  if (state.turn !== player) throw new Error('还没轮到这位潜航者。')
  const card = state.deck[0]
  if (card === undefined) return finishVoyage(state, voyageScore(state.voyage.cards), false, random)

  const deck = state.deck.slice(1)
  if (card.category === 'peril') {
    if (state.voyage.perils.includes(card.peril)) {
      const busted = finishVoyage(
        { ...state, deck },
        0,
        true,
        random,
      )
      return { ...busted, lastEvent: `${PERIL_LABEL[card.peril]}再次出现，${player === 'human' ? '你' : '澜音'}本轮空手返港。` }
    }
    return {
      ...state,
      deck,
      voyage: {
        cards: [...state.voyage.cards, card],
        perils: [...state.voyage.perils, card.peril],
      },
      lastEvent: `${PERIL_LABEL[card.peril]}出现，再遇一次就会失去本轮收获。`,
    }
  }

  const cards = [...state.voyage.cards, card]
  return {
    ...state,
    deck,
    voyage: { ...state.voyage, cards },
    lastEvent: `发现${FAMILY_LABEL[card.family]}，本次潜航暂得 ${voyageScore(cards)} 分。`,
  }
}

export function bank(state: TideState, player: Player, random: () => number = Math.random): TideState {
  if (state.phase !== 'play') throw new Error('这一轮已经结束。')
  if (state.turn !== player) throw new Error('还没轮到这位潜航者。')
  return finishVoyage(state, voyageScore(state.voyage.cards), false, random)
}

export function nextRound(state: TideState, random: () => number = Math.random): TideState {
  if (state.phase !== 'round_end') throw new Error('当前轮次还没有结算。')
  return {
    ...state,
    round: state.round + 1,
    phase: 'play',
    turn: 'human',
    deck: freshDeck(random),
    voyage: { cards: [], perils: [] },
    bank: { human: 0, lanyin: 0 },
    lastRoundScores: null,
    lastEvent: `第 ${state.round + 1} 轮潜航开始。`,
  }
}

export type TideAiDecision = 'dive' | 'bank'

export function aiDecide(state: TideState): TideAiDecision {
  if (state.phase !== 'play' || state.turn !== 'lanyin') return 'bank'
  const score = voyageScore(state.voyage.cards)
  const risk = bustRisk(state)
  const treasureCount = state.voyage.cards.filter((card) => card.category === 'treasure').length
  if (score >= 12) return 'bank'
  if (score >= 6 && risk >= 0.2) return 'bank'
  if (score >= 4 && state.voyage.perils.length >= 2) return 'bank'
  if (treasureCount >= 7) return 'bank'
  return 'dive'
}
