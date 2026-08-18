import { describe, expect, it } from 'vitest'
import { playAiTurn } from './ai.ts'
import {
  BICYCLE_RULES,
  OPEN_SPIEL_RULES,
  canKnockWithUpcard,
  createMatch,
  discardCard,
  drawCard,
  legalKnockDiscards,
  passAtWall,
  startNextHand,
} from './engine.ts'
import type { Difficulty, MatchState, RulesProfile } from './types.ts'

const MAX_TRANSITIONS = 256
const DIFFICULTIES: readonly Difficulty[] = ['relaxed', 'steady', 'sharp']
const RULES: readonly RulesProfile[] = [BICYCLE_RULES, OPEN_SPIEL_RULES]

function stateContext(state: MatchState): string {
  return `seed=${state.seed} rules=${state.rules.id} round=${state.round} phase=${state.phase} turn=${state.turn}`
}

/** Fails with the exact simulated position rather than a generic loop assertion. */
function assertLegalSnapshot(state: MatchState): void {
  const context = stateContext(state)
  const cards = [
    ...state.stock,
    ...state.discard,
    ...state.hands.human,
    ...state.hands.lanyin,
  ]
  if (cards.length !== 52) throw new Error(`${context}: expected 52 cards, got ${cards.length}`)
  if (new Set(cards.map((card) => card.id)).size !== 52) {
    throw new Error(`${context}: a card was duplicated or lost`)
  }
  if (state.stock.length < 2) throw new Error(`${context}: stock crossed the two-card wall`)
  if (state.discard.length === 0) throw new Error(`${context}: discard pile is empty`)
  if (!Number.isInteger(state.scores.human) || state.scores.human < 0
    || !Number.isInteger(state.scores.lanyin) || state.scores.lanyin < 0) {
    throw new Error(`${context}: score is not a non-negative integer`)
  }

  const expectedHuman = state.phase === 'discard' && state.turn === 'human' ? 11 : 10
  const expectedLanyin = state.phase === 'discard' && state.turn === 'lanyin' ? 11 : 10
  if (state.hands.human.length !== expectedHuman || state.hands.lanyin.length !== expectedLanyin) {
    throw new Error(`${context}: hand size does not match the decision phase`)
  }

  const settled = state.phase === 'reveal' || state.phase === 'match_over'
  if (settled !== (state.handResult !== undefined)) {
    throw new Error(`${context}: result presence does not match the phase`)
  }
}

/** A deterministic, legal public-API policy used only to exercise the engine. */
function playHumanTurn(state: MatchState): MatchState {
  if (state.turn !== 'human' || state.phase !== 'draw') {
    throw new Error(`${stateContext(state)}: not a human draw decision`)
  }

  if (state.stock.length <= 2 && !canKnockWithUpcard(state, 'human')) {
    return passAtWall(state, 'human')
  }

  const source = state.stock.length <= 2 ? 'discard' : 'stock'
  const afterDraw = drawCard(state, 'human', source)
  const forbiddenCardId = afterDraw.drawSource === 'discard' ? afterDraw.drawnCardId : undefined
  const knockDiscard = legalKnockDiscards(
    afterDraw.hands.human,
    afterDraw.rules,
    forbiddenCardId,
  )[0]
  if (knockDiscard !== undefined) {
    return discardCard(afterDraw, 'human', knockDiscard.id, 'knock')
  }

  const ordinaryDiscard = afterDraw.hands.human.find((card) => card.id !== forbiddenCardId)
  if (ordinaryDiscard === undefined) {
    throw new Error(`${stateContext(afterDraw)}: no legal human discard`)
  }
  return discardCard(afterDraw, 'human', ordinaryDiscard.id)
}

function simulateMatch(seed: number, rules: RulesProfile, difficulty: Difficulty): {
  readonly state: MatchState
  readonly transitions: number
} {
  let state = createMatch(seed, rules)
  let transitions = 0

  while (state.phase !== 'match_over') {
    assertLegalSnapshot(state)
    transitions += 1
    if (transitions > MAX_TRANSITIONS) {
      throw new Error(`${stateContext(state)}: exceeded ${MAX_TRANSITIONS} transitions`)
    }

    if (state.phase === 'reveal') {
      state = startNextHand(state)
    } else if (state.phase === 'draw') {
      state = state.turn === 'human'
        ? playHumanTurn(state)
        : playAiTurn(state, difficulty)
    } else {
      throw new Error(`${stateContext(state)}: turn helper left an unresolved discard phase`)
    }
  }

  assertLegalSnapshot(state)
  return { state, transitions }
}

describe('full-match simulation', () => {
  it('finishes many seeded matches through legal public actions without looping', () => {
    const transitionCounts: number[] = []

    for (let index = 0; index < 96; index += 1) {
      const seed = Math.imul(index + 1, 0x9e3779b1) >>> 0
      const rules = RULES[index % RULES.length] as RulesProfile
      const difficulty = DIFFICULTIES[index % DIFFICULTIES.length] as Difficulty
      const result = simulateMatch(seed, rules, difficulty)
      expect(result.state.round, `seed ${seed} should complete every hand`).toBe(rules.handCount)
      transitionCounts.push(result.transitions)
    }

    expect(Math.max(...transitionCounts)).toBeLessThanOrEqual(MAX_TRANSITIONS)
  }, 30_000)
})
