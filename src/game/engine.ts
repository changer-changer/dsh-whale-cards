import { randomSeed, shuffleDeck, sortCards } from './cards.ts'
import { bestMeldLayout, layoutAfterLayoff } from './melds.ts'
import type {
  Card,
  DrawSource,
  HandResult,
  MatchState,
  Player,
  PublicAction,
  RulesProfile,
} from './types.ts'

export const BICYCLE_RULES: RulesProfile = {
  id: 'bicycle',
  ginBonus: 20,
  handCount: 3,
  knockLimit: 10,
  undercutBonus: 10,
}

export const OPEN_SPIEL_RULES: RulesProfile = {
  id: 'openSpielCompat',
  ginBonus: 25,
  handCount: 3,
  knockLimit: 10,
  undercutBonus: 25,
}

export function otherPlayer(player: Player): Player {
  return player === 'human' ? 'lanyin' : 'human'
}

function event(player: Player, type: PublicAction['type'], card?: Card): PublicAction {
  return { at: Date.now(), player, type, ...(card === undefined ? {} : { card }) }
}

function roundSeed(matchSeed: number, round: number): number {
  return (matchSeed ^ Math.imul(round, 0x9e3779b1)) >>> 0
}

function dealRound(
  seed: number,
  round: number,
  dealer: Player,
  scores: MatchState['scores'],
  rules: RulesProfile,
): MatchState {
  const deck = shuffleDeck(roundSeed(seed, round))
  const hands: Record<Player, Card[]> = { human: [], lanyin: [] }
  const first = otherPlayer(dealer)
  for (let count = 0; count < 10; count += 1) {
    hands[first].push(deck.pop() as Card)
    hands[dealer].push(deck.pop() as Card)
  }
  const upcard = deck.pop() as Card
  return {
    version: 1,
    seed,
    rules,
    round,
    dealer,
    turn: first,
    phase: 'draw',
    stock: deck,
    discard: [upcard],
    hands: {
      human: sortCards(hands.human),
      lanyin: sortCards(hands.lanyin),
    },
    scores,
    history: [event(first, 'deal')],
  }
}

export function createMatch(
  seed = randomSeed(),
  rules: RulesProfile = BICYCLE_RULES,
): MatchState {
  return dealRound(seed, 1, 'lanyin', { human: 0, lanyin: 0 }, rules)
}

export function legalKnockDiscards(
  hand: readonly Card[],
  rules: RulesProfile,
  forbiddenCardId?: string,
): Card[] {
  return hand.filter((card) => (
    card.id !== forbiddenCardId
    && bestMeldLayout(hand.filter((candidate) => candidate.id !== card.id)).deadwoodPoints <= rules.knockLimit
  ))
}

export function canKnockWithUpcard(state: MatchState, player: Player): boolean {
  const upcard = state.discard.at(-1)
  if (state.phase !== 'draw' || state.turn !== player || state.stock.length > 2 || upcard === undefined) {
    return false
  }
  return legalKnockDiscards([...state.hands[player], upcard], state.rules, upcard.id).length > 0
}

export function drawCard(state: MatchState, player: Player, source: DrawSource): MatchState {
  if (state.phase !== 'draw' || state.turn !== player) {
    throw new Error('draw is not legal in the current phase')
  }
  if (source === 'stock' && state.stock.length <= 2) {
    throw new Error('the stock wall has been reached')
  }
  if (source === 'discard' && state.discard.length === 0) {
    throw new Error('the discard pile is empty')
  }
  if (state.stock.length <= 2 && source === 'discard' && !canKnockWithUpcard(state, player)) {
    throw new Error('the upcard may only be taken for a legal wall knock')
  }

  const stock = [...state.stock]
  const discard = [...state.discard]
  const card = source === 'stock' ? stock.pop() : discard.pop()
  if (card === undefined) throw new Error('draw source produced no card')

  return {
    ...state,
    stock,
    discard,
    hands: {
      ...state.hands,
      [player]: sortCards([...state.hands[player], card]),
    },
    phase: 'discard',
    drawnCardId: card.id,
    drawSource: source,
    wallKnockRequired: state.stock.length <= 2,
    history: [
      ...state.history,
      event(player, source === 'stock' ? 'draw_stock' : 'take_discard', source === 'discard' ? card : undefined),
    ],
  }
}

function settle(
  state: MatchState,
  knocker: Player | null,
  hands: MatchState['hands'] = state.hands,
): MatchState {
  let humanLayout = bestMeldLayout(hands.human)
  let lanyinLayout = bestMeldLayout(hands.lanyin)
  let result: HandResult

  if (knocker === null) {
    result = {
      humanLayout,
      lanyinLayout,
      kind: 'draw',
      points: 0,
      round: state.round,
      winner: null,
    }
  } else {
    const opponent = otherPlayer(knocker)
    const knockLayout = knocker === 'human' ? humanLayout : lanyinLayout
    const opponentLayout = opponent === 'human' ? humanLayout : lanyinLayout
    if (knockLayout.deadwoodPoints === 0) {
      result = {
        humanLayout,
        lanyinLayout,
        kind: 'gin',
        points: state.rules.ginBonus + opponentLayout.deadwoodPoints,
        round: state.round,
        winner: knocker,
      }
    } else {
      const opponentAfterLayoff = layoutAfterLayoff(hands[opponent], knockLayout.melds)
      if (opponent === 'human') humanLayout = opponentAfterLayoff
      else lanyinLayout = opponentAfterLayoff
      if (knockLayout.deadwoodPoints < opponentAfterLayoff.deadwoodPoints) {
        result = {
          humanLayout,
          lanyinLayout,
          kind: 'knock',
          points: opponentAfterLayoff.deadwoodPoints - knockLayout.deadwoodPoints,
          round: state.round,
          winner: knocker,
        }
      } else {
        result = {
          humanLayout,
          lanyinLayout,
          kind: 'undercut',
          points: state.rules.undercutBonus + knockLayout.deadwoodPoints - opponentAfterLayoff.deadwoodPoints,
          round: state.round,
          winner: opponent,
        }
      }
    }
  }

  const scores = { ...state.scores }
  if (result.winner !== null) scores[result.winner] += result.points
  return {
    ...state,
    hands,
    scores,
    phase: state.round >= state.rules.handCount ? 'match_over' : 'reveal',
    handResult: result,
    drawnCardId: undefined,
    drawSource: undefined,
    wallKnockRequired: undefined,
  }
}

export function passAtWall(state: MatchState, player: Player): MatchState {
  if (state.phase !== 'draw' || state.turn !== player || state.stock.length > 2) {
    throw new Error('wall pass is not legal in the current phase')
  }
  return settle(state, null)
}

export function discardCard(
  state: MatchState,
  player: Player,
  cardId: string,
  intent: 'discard' | 'knock' = 'discard',
): MatchState {
  if (state.phase !== 'discard' || state.turn !== player) {
    throw new Error('discard is not legal in the current phase')
  }
  if (state.drawSource === 'discard' && state.drawnCardId === cardId) {
    throw new Error('the face-up card cannot be discarded on the same turn')
  }
  if (state.wallKnockRequired && intent !== 'knock') {
    throw new Error('taking the wall upcard requires an immediate knock')
  }
  const card = state.hands[player].find((candidate) => candidate.id === cardId)
  if (card === undefined) throw new Error('card is not in the current hand')

  const nextHand = state.hands[player].filter((candidate) => candidate.id !== cardId)
  const layout = bestMeldLayout(nextHand)
  if (intent === 'knock' && layout.deadwoodPoints > state.rules.knockLimit) {
    throw new Error(`knock requires ${state.rules.knockLimit} or fewer deadwood points`)
  }

  const hands = { ...state.hands, [player]: sortCards(nextHand) }
  const history = [
    ...state.history,
    event(player, layout.deadwoodPoints === 0 && intent === 'knock' ? 'gin' : intent === 'knock' ? 'knock' : 'discard', card),
  ]
  const discardedState: MatchState = {
    ...state,
    hands,
    discard: [...state.discard, card],
    history,
    drawnCardId: undefined,
    drawSource: undefined,
    wallKnockRequired: undefined,
  }

  if (intent === 'knock') return settle(discardedState, player, hands)
  return {
    ...discardedState,
    turn: otherPlayer(player),
    phase: 'draw',
  }
}

export function startNextHand(state: MatchState): MatchState {
  if (state.phase !== 'reveal') throw new Error('the current hand is not ready to advance')
  return dealRound(
    state.seed,
    state.round + 1,
    otherPlayer(state.dealer),
    state.scores,
    state.rules,
  )
}
