import { seededRandom } from './cards.ts'
import {
  canKnockWithUpcard,
  discardCard,
  drawCard,
  legalKnockDiscards,
  passAtWall,
} from './engine.ts'
import { bestMeldLayout } from './melds.ts'
import type {
  Card,
  Difficulty,
  DrawSource,
  MatchState,
  PublicAction,
  RulesProfile,
} from './types.ts'

export interface AiView {
  readonly hand: readonly Card[]
  readonly history: readonly PublicAction[]
  readonly rules: RulesProfile
  readonly stockCount: number
  readonly topDiscard?: Card
  readonly drawnCardId?: string
  readonly drawSource?: DrawSource
}

export interface AiDiscardDecision {
  readonly cardId: string
  readonly intent: 'discard' | 'knock'
}

function decisionRandom(view: AiView, salt: number): () => number {
  // Deliberately derive decision entropy only from facts Lanyin is allowed to
  // know. The match seed determines the deal and must never cross this boundary.
  const publicFacts = [
    String(salt),
    [...view.hand].map((card) => card.id).sort().join(','),
    view.history.map((action) => (
      `${action.player}:${action.type}:${action.card?.id ?? '-'}`
    )).join('|'),
    `${view.rules.id}:${view.rules.ginBonus}:${view.rules.knockLimit}:${view.rules.undercutBonus}`,
    String(view.stockCount),
    view.topDiscard?.id ?? '-',
    view.drawnCardId ?? '-',
    view.drawSource ?? '-',
  ].join('::')
  let hash = 0x811c9dc5
  for (let index = 0; index < publicFacts.length; index += 1) {
    hash ^= publicFacts.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return seededRandom(hash >>> 0)
}

function connectionScore(hand: readonly Card[]): number {
  let score = 0
  for (let left = 0; left < hand.length; left += 1) {
    for (let right = left + 1; right < hand.length; right += 1) {
      const a = hand[left] as Card
      const b = hand[right] as Card
      if (a.rank === b.rank) score += 3
      if (a.suit === b.suit && Math.abs(a.rank - b.rank) === 1) score += 2
      else if (a.suit === b.suit && Math.abs(a.rank - b.rank) === 2) score += 1
    }
  }
  return score
}

function discardRisk(card: Card, history: readonly PublicAction[]): number {
  const opponentTakes = history
    .filter((action) => action.player === 'human' && action.type === 'take_discard' && action.card !== undefined)
    .slice(-6)
  let risk = 0
  for (const action of opponentTakes) {
    const wanted = action.card as Card
    if (card.rank === wanted.rank) risk += 5
    if (card.suit === wanted.suit && Math.abs(card.rank - wanted.rank) === 1) risk += 4
    else if (card.suit === wanted.suit && Math.abs(card.rank - wanted.rank) === 2) risk += 2
  }
  return risk
}

function bestResultAfterTaking(hand: readonly Card[], card: Card, rules: RulesProfile): number {
  const combined = [...hand, card]
  const legalDiscards = combined.filter((candidate) => candidate.id !== card.id)
  return Math.min(...legalDiscards.map((candidate) => (
    bestMeldLayout(combined.filter((member) => member.id !== candidate.id)).deadwoodPoints
  )), rules.knockLimit + 20)
}

export function chooseAiDraw(view: AiView, difficulty: Difficulty): DrawSource | 'pass' {
  if (view.stockCount <= 2) {
    const mockState = {
      phase: 'draw',
      turn: 'lanyin',
      stock: Array.from({ length: view.stockCount }),
      discard: view.topDiscard === undefined ? [] : [view.topDiscard],
      hands: { lanyin: view.hand },
      rules: view.rules,
    } as unknown as MatchState
    return canKnockWithUpcard(mockState, 'lanyin') ? 'discard' : 'pass'
  }
  if (view.topDiscard === undefined) return 'stock'

  const current = bestMeldLayout(view.hand).deadwoodPoints
  const withDiscard = bestResultAfterTaking(view.hand, view.topDiscard, view.rules)
  const improvement = current - withDiscard
  const random = decisionRandom(view, 11)()
  if (difficulty === 'sharp') return improvement >= 0 ? 'discard' : 'stock'
  if (difficulty === 'steady') return improvement >= 1 || (improvement === 0 && random < 0.35) ? 'discard' : 'stock'
  return improvement >= 3 || (improvement > 0 && random < 0.55) ? 'discard' : 'stock'
}

interface RatedDiscard {
  readonly card: Card
  readonly deadwood: number
  readonly rating: number
}

function rateDiscards(view: AiView, difficulty: Difficulty): RatedDiscard[] {
  const candidates = view.hand.filter((card) => !(
    view.drawSource === 'discard' && view.drawnCardId === card.id
  ))
  return candidates.map((card) => {
    const remaining = view.hand.filter((candidate) => candidate.id !== card.id)
    const deadwood = bestMeldLayout(remaining).deadwoodPoints
    const future = connectionScore(remaining)
    const risk = difficulty === 'relaxed' ? 0 : discardRisk(card, view.history)
    return {
      card,
      deadwood,
      rating: deadwood * 12 - future + risk * (difficulty === 'sharp' ? 3 : 1.5),
    }
  }).sort((left, right) => left.rating - right.rating || right.card.rank - left.card.rank)
}

export function chooseAiDiscard(view: AiView, difficulty: Difficulty): AiDiscardDecision {
  const rated = rateDiscards(view, difficulty)
  if (rated.length === 0) throw new Error('AI has no legal discard')
  const random = decisionRandom(view, 29)
  const poolSize = difficulty === 'relaxed' ? Math.min(3, rated.length) : difficulty === 'steady' ? Math.min(2, rated.length) : 1
  const chosen = rated[Math.floor(random() * poolSize)] as RatedDiscard
  const canKnock = chosen.deadwood <= view.rules.knockLimit
  const knockChance = difficulty === 'relaxed' ? 0.72 : difficulty === 'steady' ? 0.9 : 1
  const intent = canKnock && (chosen.deadwood === 0 || random() < knockChance) ? 'knock' : 'discard'
  return { cardId: chosen.card.id, intent }
}

/**
 * Runs one complete AI turn. Decision helpers receive no player hand and no
 * stock order; only public information plus Lanyin's own cards is exposed.
 */
export function playAiTurn(state: MatchState, difficulty: Difficulty): MatchState {
  if (state.turn !== 'lanyin' || state.phase !== 'draw') {
    throw new Error('it is not Lanyin\'s draw phase')
  }
  const drawView: AiView = {
    hand: state.hands.lanyin,
    history: state.history,
    rules: state.rules,
    stockCount: state.stock.length,
    topDiscard: state.discard.at(-1),
  }
  const source = chooseAiDraw(drawView, difficulty)
  if (source === 'pass') return passAtWall(state, 'lanyin')

  const afterDraw = drawCard(state, 'lanyin', source)
  const discardView: AiView = {
    hand: afterDraw.hands.lanyin,
    history: afterDraw.history,
    rules: afterDraw.rules,
    stockCount: afterDraw.stock.length,
    topDiscard: afterDraw.discard.at(-1),
    drawnCardId: afterDraw.drawnCardId,
    drawSource: afterDraw.drawSource,
  }
  const legalWallKnocks = afterDraw.wallKnockRequired
    ? new Set(legalKnockDiscards(afterDraw.hands.lanyin, afterDraw.rules, afterDraw.drawnCardId).map((card) => card.id))
    : undefined
  let decision = chooseAiDiscard(discardView, difficulty)
  if (legalWallKnocks !== undefined && !legalWallKnocks.has(decision.cardId)) {
    const fallback = legalWallKnocks.values().next().value as string | undefined
    if (fallback === undefined) throw new Error('wall draw produced no legal knock discard')
    decision = { cardId: fallback, intent: 'knock' }
  } else if (afterDraw.wallKnockRequired) {
    decision = { ...decision, intent: 'knock' }
  }
  return discardCard(afterDraw, 'lanyin', decision.cardId, decision.intent)
}
