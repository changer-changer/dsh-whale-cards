/**
 * Harbor Clash — a Gwent-style card duel for the teahouse.
 *
 * Original cards and rules (no CDPR assets): both sides play from a fixed
 * 16-card harbor deck, draw 10 per round, and duel over three rounds — play
 * a card or pass; the side with the higher board power wins the round; first
 * to two round wins takes the match.
 *
 * The engine is pure and serializable: every state is a plain object that
 * round-trips through JSON, so the module can persist it in the shared slot.
 * A random source can be injected for deterministic tests.
 *
 * @module games/harbor-clash/engine
 */

export type Player = 'human' | 'lanyin'
export type CardKind = 'unit' | 'horn' | 'draw' | 'fog'
export type Phase = 'play' | 'round_end' | 'match_over'

export interface ClashCard {
  readonly id: string
  readonly name: string
  readonly power: number
  readonly kind: CardKind
}

/** A card on the board; power is the live value after horn/fog modifiers. */
export interface FieldCard {
  readonly id: string
  readonly name: string
  readonly power: number
}

export interface SideState {
  readonly hand: readonly ClashCard[]
  readonly deck: readonly ClashCard[]
  readonly field: readonly FieldCard[]
  readonly passed: boolean
  /** True while the opponent's fog light is aimed at this side. */
  readonly fogged: boolean
}

export interface ClashState {
  readonly round: number
  readonly scores: Readonly<Record<Player, number>>
  readonly turn: Player
  readonly sides: Readonly<Record<Player, SideState>>
  readonly phase: Phase
  readonly roundWinner: Player | null
  readonly matchWinner: Player | null
  /** Short human-readable summary of the last transition (for Lanyin/UI). */
  readonly lastEvent: string | null
}

export const MAX_ROUNDS = 3
export const HAND_SIZE = 10

/** The fixed, original harbor deck — 16 cards, total power 61. */
export const DECK: readonly ClashCard[] = [
  { id: 'c01', name: '深海鲸', power: 8, kind: 'unit' },
  { id: 'c02', name: '护卫舰', power: 7, kind: 'unit' },
  { id: 'c03', name: '护卫舰', power: 7, kind: 'unit' },
  { id: 'c04', name: '灯塔看守', power: 5, kind: 'unit' },
  { id: 'c05', name: '灯塔看守', power: 5, kind: 'unit' },
  { id: 'c06', name: '信风商船', power: 5, kind: 'draw' },
  { id: 'c07', name: '港务长', power: 4, kind: 'horn' },
  { id: 'c08', name: '舵手', power: 4, kind: 'unit' },
  { id: 'c09', name: '舵手', power: 4, kind: 'unit' },
  { id: 'c10', name: '渔夫', power: 3, kind: 'unit' },
  { id: 'c11', name: '渔夫', power: 3, kind: 'unit' },
  { id: 'c12', name: '码头工', power: 2, kind: 'unit' },
  { id: 'c13', name: '码头工', power: 2, kind: 'unit' },
  { id: 'c14', name: '见习水手', power: 1, kind: 'unit' },
  { id: 'c15', name: '瞭望犬', power: 1, kind: 'unit' },
  { id: 'c16', name: '雾灯', power: 0, kind: 'fog' },
]

const OPPONENT: Readonly<Record<Player, Player>> = { human: 'lanyin', lanyin: 'human' }

export function boardPower(state: ClashState, player: Player): number {
  return state.sides[player].field.reduce((total, card) => total + card.power, 0)
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function freshSide(random: () => number): SideState {
  const deck = shuffled(DECK, random)
  return {
    hand: deck.slice(0, HAND_SIZE),
    deck: deck.slice(HAND_SIZE),
    field: [],
    passed: false,
    fogged: false,
  }
}

export function createMatch(random: () => number = Math.random): ClashState {
  return {
    round: 1,
    scores: { human: 0, lanyin: 0 },
    turn: 'human',
    sides: { human: freshSide(random), lanyin: freshSide(random) },
    phase: 'play',
    roundWinner: null,
    matchWinner: null,
    lastEvent: null,
  }
}

/** Effective power of a hand card if played right now, for AI/UI hints. */
export function effectivePower(card: ClashCard, side: SideState, allyFieldCount: number): number {
  let power = card.power
  if (card.kind === 'horn') {
    // Horn is wasted when nothing is on the board yet.
    if (allyFieldCount === 0) power -= 1
    else power += Math.min(allyFieldCount, 3)
  }
  if (card.kind === 'draw') power += 1.5
  if (side.fogged) power -= 2
  return power
}

function playResolve(state: ClashState, player: Player, card: ClashCard): { state: ClashState; event: string } {
  const side = state.sides[player]
  const opponent = state.sides[OPPONENT[player]]

  let power = card.power
  let event = `出牌 ${card.name}（${card.power} 战力）`
  const notes: string[] = []

  if (side.fogged) {
    power = Math.max(0, power - 2)
    notes.push('雾灯使战力 -2')
  }
  if (card.kind === 'horn') {
    const boosted = side.field.map((existing) => ({ ...existing, power: existing.power + 1 }))
    event = `港务长登船，全船 +1（${boosted.length} 张在场牌）`
    return {
      state: {
        ...state,
        sides: {
          ...state.sides,
          [player]: {
            ...side,
            hand: side.hand.filter((held) => held.id !== card.id),
            field: [...boosted, { id: card.id, name: card.name, power }],
            fogged: false,
            passed: false,
          },
        },
      },
      event,
    }
  }

  const fogged = card.kind === 'fog'
  const nextSide: SideState = {
    ...side,
    field: [...side.field, { id: card.id, name: card.name, power }],
    hand: side.hand.filter((held) => held.id !== card.id),
    fogged: false,
    passed: false,
  }

  let nextOpponent = opponent
  if (fogged) {
    nextOpponent = { ...opponent, fogged: true }
    event = '雾灯点亮，对准对方下一张牌（战力 -2）'
  } else if (opponent.fogged) {
    notes.push('驱散雾灯')
  }

  let next = {
    ...state,
    sides: { ...state.sides, [player]: nextSide, [OPPONENT[player]]: nextOpponent },
  }

  if (card.kind === 'draw' && nextSide.deck.length > 0) {
    const drawn = nextSide.deck[0]
    next = {
      ...next,
      sides: {
        ...next.sides,
        [player]: {
          ...nextSide,
          hand: [...nextSide.hand, drawn],
          deck: nextSide.deck.slice(1),
        },
      },
    }
    event = `${card.name} 扬帆：从卡组抽到 ${drawn.name}`
    notes.push(`抽到 ${drawn.name}`)
  }

  if (notes.length > 0) event = `${event}（${notes.join('；')}）`
  return { state: next, event }
}

function endRound(state: ClashState): ClashState {
  const human = boardPower(state, 'human')
  const lanyin = boardPower(state, 'lanyin')
  const roundWinner: Player | null = human === lanyin ? null : human > lanyin ? 'human' : 'lanyin'

  const scores = { ...state.scores }
  if (roundWinner !== null) scores[roundWinner] += 1

  const matchWinner: Player | null =
    scores.human >= 2 ? 'human'
    : scores.lanyin >= 2 ? 'lanyin'
    : state.round >= MAX_ROUNDS ? (scores.human === scores.lanyin ? null : scores.human > scores.lanyin ? 'human' : 'lanyin')
    : null

  const roundText = roundWinner === null
    ? `第 ${state.round} 小局平局（${human} : ${lanyin}）`
    : `第 ${state.round} 小局 ${roundWinner === 'human' ? '玩家' : '澜音'} 胜出（${human} : ${lanyin}）`

  return {
    ...state,
    scores,
    phase: matchWinner === null && state.round < MAX_ROUNDS ? 'round_end' : 'match_over',
    roundWinner,
    matchWinner,
    lastEvent: matchWinner === null
      ? `${roundText}。当前 ${scores.human} : ${scores.lanyin}`
      : `${roundText}。${matchWinner === null ? '比赛平局' : matchWinner === 'human' ? '玩家赢得比赛' : '澜音赢得比赛'}（${scores.human} : ${scores.lanyin}）`,
  }
}

/** Play a card from `player`'s hand. Throws on illegal moves. */
export function playCard(state: ClashState, player: Player, cardId: string): ClashState {
  if (state.phase !== 'play') throw new Error('本小局已经结束。')
  if (state.turn !== player) throw new Error('还没轮到你出牌。')
  const side = state.sides[player]
  if (side.passed) throw new Error('你已经过牌，本小局不能再出。')
  const card = side.hand.find((held) => held.id === cardId)
  if (card === undefined) throw new Error('这张牌不在你的手牌里。')

  const { state: afterPlay, event } = playResolve(state, player, card)

  // Empty hand forces a pass; if both sides have passed the round resolves.
  const played = afterPlay.sides[player]
  let next: ClashState = { ...afterPlay, lastEvent: event }
  if (played.hand.length === 0) {
    next = {
      ...next,
      sides: { ...next.sides, [player]: { ...played, passed: true } },
    }
  }
  const other = next.sides[OPPONENT[player]]
  if (next.sides.human.passed && next.sides.lanyin.passed) return endRound(next)
  if (next.sides[player].hand.length === 0 && other.hand.length === 0) {
    return endRound({
      ...next,
      sides: { ...next.sides, [OPPONENT[player]]: { ...other, passed: true } },
    })
  }
  // The turn goes to the side that can still act: a passed opponent lets the
  // acting side keep playing cards.
  return {
    ...next,
    turn: other.passed ? player : OPPONENT[player],
  }
}

/** Pass for the current round. Throws if the round is over or the side passed. */
export function pass(state: ClashState, player: Player): ClashState {
  if (state.phase !== 'play') throw new Error('本小局已经结束。')
  if (state.turn !== player) throw new Error('还没轮到你行动。')
  if (state.sides[player].passed) throw new Error('你已经过牌了。')

  const next = {
    ...state,
    sides: {
      ...state.sides,
      [player]: { ...state.sides[player], passed: true },
    },
    lastEvent: `${player === 'human' ? '玩家' : '澜音'}选择过牌，本小局不再出牌`,
  }
  if (next.sides.human.passed && next.sides.lanyin.passed) return endRound(next)
  // The other side may keep playing; if they have no cards left, they pass too.
  if (next.sides[OPPONENT[player]].hand.length === 0) {
    return endRound({
      ...next,
      sides: {
        ...next.sides,
        [OPPONENT[player]]: { ...next.sides[OPPONENT[player]], passed: true },
      },
    })
  }
  return { ...next, turn: OPPONENT[player] }
}

/** Advance to the next round (re-deal both hands from the full deck). */
export function nextRound(state: ClashState, random: () => number = Math.random): ClashState {
  if (state.phase !== 'round_end') throw new Error('当前小局还没结束。')
  const next = {
    ...createMatch(random),
    round: state.round + 1,
    scores: state.scores,
    lastEvent: `第 ${state.round + 1} 小局开始`,
  }
  // First mover alternates: Lanyin leads even rounds (2, 4, …).
  return { ...next, turn: next.round % 2 === 0 ? 'lanyin' : 'human' }
}

export interface AiDecision {
  readonly kind: 'play' | 'pass'
  readonly cardId: string | null
}

/** Greedy Lanyin: play the best effective card, pass when hopeless. */
export function aiDecide(state: ClashState, random: () => number = Math.random): AiDecision {
  if (state.phase !== 'play' || state.turn !== 'lanyin') return { kind: 'pass', cardId: null }
  const side = state.sides.lanyin
  if (side.passed || side.hand.length === 0) return { kind: 'pass', cardId: null }

  const deficit = boardPower(state, 'human') - boardPower(state, 'lanyin')
  const potential = side.hand.reduce((total, card) => total + Math.max(0, effectivePower(card, side, side.field.length)), 0)
  if (deficit > 0 && potential < deficit) return { kind: 'pass', cardId: null }

  let best: ClashCard | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const card of side.hand) {
    const score = effectivePower(card, side, side.field.length) + random() * 0.25
    if (score > bestScore) {
      bestScore = score
      best = card
    }
  }
  return best === null ? { kind: 'pass', cardId: null } : { kind: 'play', cardId: best.id }
}

/** Friendly Chinese labels for card kinds (used by the UI legend). */
export const KIND_LABEL: Readonly<Record<CardKind, string>> = {
  unit: '战力牌',
  horn: '号令：在场牌 +1',
  draw: '扬帆：出牌时抽 1',
  fog: '雾灯：对方下一张 -2',
}