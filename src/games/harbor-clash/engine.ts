/** Pure engine for Harbor Clash: a compact three-lane formation duel. */

export type Player = 'human' | 'lanyin'
export type Suit = 'tide' | 'ember' | 'mist'
export type LaneId = 'north' | 'mid' | 'south'
export type ClashPhase = 'play' | 'match_over'

export interface ClashCard {
  readonly id: string
  readonly suit: Suit
  readonly value: number
}

export interface Lane {
  readonly id: LaneId
  readonly title: string
  readonly human: readonly ClashCard[]
  readonly lanyin: readonly ClashCard[]
  readonly claimedBy: Player | null
}

export interface ClashState {
  readonly version: 2
  readonly phase: ClashPhase
  readonly turn: Player
  readonly hands: Readonly<Record<Player, readonly ClashCard[]>>
  readonly deck: readonly ClashCard[]
  readonly lanes: readonly Lane[]
  readonly winner: Player | null
  readonly lastEvent: string
}

export interface Formation {
  readonly tier: number
  readonly label: string
  readonly sum: number
  readonly kickers: readonly number[]
}

export const SUIT_LABEL: Readonly<Record<Suit, string>> = { tide: '潮汐', ember: '灯焰', mist: '雾色' }
export const FORMATION_LABEL: Readonly<Record<number, string>> = {
  0: '未成阵',
  1: '合力',
  2: '顺风航线',
  3: '同潮编队',
  4: '同旗舰队',
  5: '灯塔连阵',
}

export const CLASH_DECK: readonly ClashCard[] = (['tide', 'ember', 'mist'] as const).flatMap((suit) =>
  Array.from({ length: 7 }, (_, index) => ({ id: `${suit}-${index + 1}`, suit, value: index + 1 })),
)

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

export function createMatch(random: () => number = Math.random): ClashState {
  const deck = shuffled(CLASH_DECK, random)
  return {
    version: 2,
    phase: 'play',
    turn: 'human',
    hands: { human: deck.slice(0, 6), lanyin: deck.slice(6, 12) },
    deck: deck.slice(12),
    lanes: [
      { id: 'north', title: '北灯塔', human: [], lanyin: [], claimedBy: null },
      { id: 'mid', title: '主航道', human: [], lanyin: [], claimedBy: null },
      { id: 'south', title: '南灯塔', human: [], lanyin: [], claimedBy: null },
    ],
    winner: null,
    lastEvent: '三座航标亮起，争夺开始。',
  }
}

export function isClashState(value: unknown): value is ClashState {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<ClashState>
  return candidate.version === 2
    && (candidate.turn === 'human' || candidate.turn === 'lanyin')
    && Array.isArray(candidate.lanes)
    && candidate.hands !== undefined
}

export function evaluateFormation(cards: readonly ClashCard[]): Formation {
  const sum = cards.reduce((total, item) => total + item.value, 0)
  const kickers = cards.map((item) => item.value).sort((left, right) => right - left)
  if (cards.length !== 3) return { tier: 0, label: FORMATION_LABEL[0], sum, kickers }
  const sameSuit = cards.every((item) => item.suit === cards[0]?.suit)
  const sameValue = cards.every((item) => item.value === cards[0]?.value)
  const values = [...cards].map((item) => item.value).sort((left, right) => left - right)
  const run = values[1] === values[0]! + 1 && values[2] === values[1]! + 1
  const tier = sameSuit && run ? 5 : sameValue ? 4 : sameSuit ? 3 : run ? 2 : 1
  return { tier, label: FORMATION_LABEL[tier], sum, kickers }
}

export function compareFormations(left: readonly ClashCard[], right: readonly ClashCard[]): number {
  const a = evaluateFormation(left)
  const b = evaluateFormation(right)
  if (a.tier !== b.tier) return a.tier - b.tier
  if (a.sum !== b.sum) return a.sum - b.sum
  for (let index = 0; index < Math.max(a.kickers.length, b.kickers.length); index += 1) {
    const difference = (a.kickers[index] ?? 0) - (b.kickers[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export function claimedCount(state: ClashState, player: Player): number {
  return state.lanes.filter((lane) => lane.claimedBy === player).length
}

function resolveLane(lane: Lane): Lane {
  if (lane.claimedBy !== null || lane.human.length !== 3 || lane.lanyin.length !== 3) return lane
  const result = compareFormations(lane.human, lane.lanyin)
  return { ...lane, claimedBy: result === 0 ? null : result > 0 ? 'human' : 'lanyin' }
}

function hasOpenSlot(state: ClashState): boolean {
  return state.lanes.some((lane) => lane.claimedBy === null && (lane.human.length < 3 || lane.lanyin.length < 3))
}

function settleState(state: ClashState, event: string): ClashState {
  const human = claimedCount(state, 'human')
  const lanyin = claimedCount(state, 'lanyin')
  if (human >= 2 || lanyin >= 2) {
    const winner: Player = human > lanyin ? 'human' : 'lanyin'
    return { ...state, phase: 'match_over', winner, lastEvent: `${event} ${winner === 'human' ? '你' : '澜音'}率先控制两座航标。` }
  }
  if (!hasOpenSlot(state) || (state.hands.human.length === 0 && state.hands.lanyin.length === 0 && state.deck.length === 0)) {
    const winner: Player | null = human === lanyin ? null : human > lanyin ? 'human' : 'lanyin'
    return { ...state, phase: 'match_over', winner, lastEvent: `${event} 三条航线全部锁定。` }
  }
  return { ...state, lastEvent: event }
}

export function playCard(state: ClashState, player: Player, cardId: string, laneId: LaneId): ClashState {
  if (state.phase !== 'play') throw new Error('这场对决已经结束。')
  if (state.turn !== player) throw new Error('还没轮到你行动。')
  const card = state.hands[player].find((item) => item.id === cardId)
  if (card === undefined) throw new Error('这张牌不在你的手牌里。')
  const laneIndex = state.lanes.findIndex((item) => item.id === laneId)
  if (laneIndex < 0) throw new Error('这条航线不存在。')
  const lane = state.lanes[laneIndex]!
  if (lane.claimedBy !== null) throw new Error('这座航标已经归属一方。')
  if (lane[player].length >= 3) throw new Error('你在这条航线的编队已经满员。')

  const drawn = state.deck[0]
  const hands = {
    ...state.hands,
    [player]: [
      ...state.hands[player].filter((item) => item.id !== cardId),
      ...(drawn === undefined ? [] : [drawn]),
    ],
  }
  const placed = { ...lane, [player]: [...lane[player], card] }
  const resolved = resolveLane(placed)
  const lanes = state.lanes.map((item, index) => index === laneIndex ? resolved : item)
  const actor = player === 'human' ? '你' : '澜音'
  const claimText = resolved.claimedBy === player ? `，${actor}拿下${lane.title}` : ''
  const other: Player = player === 'human' ? 'lanyin' : 'human'
  const nextTurn = hands[other].length === 0 && (drawn === undefined ? state.deck : state.deck.slice(1)).length === 0
    ? player
    : other
  const next: ClashState = {
    ...state,
    hands,
    deck: drawn === undefined ? state.deck : state.deck.slice(1),
    lanes,
    turn: nextTurn,
    lastEvent: `${actor}把 ${SUIT_LABEL[card.suit]} ${card.value} 派往${lane.title}${claimText}。`,
  }
  return settleState(next, next.lastEvent)
}

function partialPotential(cards: readonly ClashCard[]): number {
  const base = cards.reduce((total, item) => total + item.value, 0)
  if (cards.length <= 1) return base
  const sameSuit = cards.every((item) => item.suit === cards[0]?.suit)
  const sameValue = cards.every((item) => item.value === cards[0]?.value)
  const values = cards.map((item) => item.value).sort((left, right) => left - right)
  const nearRun = new Set(values).size === values.length && Math.max(...values) - Math.min(...values) <= 2
  return base + (sameSuit ? 34 : 0) + (sameValue ? 40 : 0) + (nearRun ? 24 : 0)
}

export interface AiDecision { readonly cardId: string; readonly laneId: LaneId }

export function aiDecide(state: ClashState): AiDecision | null {
  if (state.phase !== 'play' || state.turn !== 'lanyin') return null
  let best: AiDecision | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const card of state.hands.lanyin) {
    for (const lane of state.lanes) {
      if (lane.claimedBy !== null || lane.lanyin.length >= 3) continue
      const cards = [...lane.lanyin, card]
      let score = partialPotential(cards)
      if (cards.length === 3) {
        const formation = evaluateFormation(cards)
        score += formation.tier * 120 + formation.sum
        if (lane.human.length === 3) score += compareFormations(cards, lane.human) > 0 ? 1200 : -500
      }
      if (lane.human.length === 2) score += 42
      if (claimedCount(state, 'lanyin') === 1 && cards.length === 3 && lane.human.length === 3 && compareFormations(cards, lane.human) > 0) score += 2000
      if (score > bestScore) {
        bestScore = score
        best = { cardId: card.id, laneId: lane.id }
      }
    }
  }
  return best
}
