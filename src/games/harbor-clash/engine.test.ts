/**
 * Engine tests for Harbor Clash — rules, card abilities, round resolution,
 * match flow, AI legality and save round-trips.
 *
 * @module games/harbor-clash/engine.test
 */

import { describe, expect, it } from 'vitest'
import {
  DECK,
  MAX_ROUNDS,
  aiDecide,
  boardPower,
  createMatch,
  effectivePower,
  nextRound,
  pass,
  playCard,
  type ClashCard,
  type ClashState,
  type SideState,
} from './engine.ts'

/** Deterministic rng: yields a repeating low-but-varied sequence. */
function sequenceRng(values: readonly number[]): () => number {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

function side(partial: Partial<SideState> = {}): SideState {
  return {
    hand: [],
    deck: [],
    field: [],
    passed: false,
    fogged: false,
    ...partial,
  }
}

function card(id: string, power: number, kind: ClashCard['kind'] = 'unit', name = `卡${id}`): ClashCard {
  return { id, name, power, kind }
}

function stateWith(partial: Partial<ClashState> = {}): ClashState {
  return {
    round: 1,
    scores: { human: 0, lanyin: 0 },
    turn: 'human',
    sides: { human: side(), lanyin: side() },
    phase: 'play',
    roundWinner: null,
    matchWinner: null,
    lastEvent: null,
    ...partial,
  }
}

describe('createMatch', () => {
  it('deals 10 cards from the 16-card deck to each side', () => {
    const state = createMatch(sequenceRng([0.2, 0.7, 0.4]))
    expect(state.sides.human.hand).toHaveLength(10)
    expect(state.sides.lanyin.hand).toHaveLength(10)
    expect(state.sides.human.deck).toHaveLength(6)
    expect(state.sides.lanyin.deck).toHaveLength(6)
  })

  it('starts round 1 with the human to play', () => {
    const state = createMatch()
    expect(state.round).toBe(1)
    expect(state.turn).toBe('human')
    expect(state.phase).toBe('play')
    expect(state.scores.human).toBe(0)
    expect(state.scores.lanyin).toBe(0)
  })

  it('never repeats a card id across a hand and the deck', () => {
    const state = createMatch(sequenceRng([0.31, 0.62, 0.93]))
    const ids = [...state.sides.human.hand, ...state.sides.human.deck].map((c) => c.id)
    expect(new Set(ids).size).toBe(DECK.length)
  })
})

describe('playCard', () => {
  it('moves the card to the field and hands the turn over', () => {
    const hand = [card('h1', 4), card('h2', 2)]
    const state = stateWith({ sides: { human: side({ hand }), lanyin: side() } })
    const next = playCard(state, 'human', 'h1')
    expect(next.sides.human.field).toEqual([{ id: 'h1', name: '卡h1', power: 4 }])
    expect(next.sides.human.hand).toEqual([card('h2', 2)])
    expect(next.turn).toBe('lanyin')
    expect(next.phase).toBe('play')
  })

  it('rejects a card that is not in hand', () => {
    const state = stateWith({ sides: { human: side({ hand: [card('h1', 4)] }), lanyin: side() } })
    expect(() => playCard(state, 'human', 'nope')).toThrow('不在你的手牌里')
  })

  it('rejects playing out of turn', () => {
    const state = stateWith({ turn: 'lanyin', sides: { human: side({ hand: [card('h1', 4)] }), lanyin: side() } })
    expect(() => playCard(state, 'human', 'h1')).toThrow('还没轮到你')
  })

  it('rejects playing after passing', () => {
    const state = stateWith({ sides: { human: side({ hand: [card('h1', 4)], passed: true }), lanyin: side() } })
    expect(() => playCard(state, 'human', 'h1')).toThrow('已经过牌')
  })

  it('rejects playing after the round is resolved', () => {
    const state = stateWith({ phase: 'round_end' })
    expect(() => playCard(state, 'human', 'h1')).toThrow('已经结束')
  })
})

describe('card abilities', () => {
  it('horn boosts every card already on the board, not itself', () => {
    const field = [{ id: 'f1', name: '护卫舰', power: 7 }, { id: 'f2', name: '舵手', power: 4 }]
    const state = stateWith({
      sides: { human: side({ field, hand: [card('h1', 4, 'horn', '港务长'), card('h2', 2)] }), lanyin: side() },
    })
    const next = playCard(state, 'human', 'h1')
    expect(next.sides.human.field).toEqual([
      { id: 'f1', name: '护卫舰', power: 8 },
      { id: 'f2', name: '舵手', power: 5 },
      { id: 'h1', name: '港务长', power: 4 },
    ])
    expect(next.sides.human.hand).toEqual([card('h2', 2)])
    expect(next.lastEvent).toContain('全船 +1')
  })

  it('fog lowers the opponent next card by 2 and clears the marker', () => {
    const human = side({ hand: [card('h1', 0, 'fog', '雾灯'), card('h2', 5, 'unit', '灯塔看守')] })
    const lanyin = side({ field: [{ id: 'l1', name: '渔夫', power: 3 }], hand: [card('l2', 4, 'unit', '舵手')] })
    let state = stateWith({ sides: { human, lanyin } })
    state = playCard(state, 'human', 'h1') // fog out
    expect(state.sides.lanyin.fogged).toBe(true)
    state = playCard(state, 'lanyin', 'l2') // lanyin is next to act
    expect(state.sides.lanyin.fogged).toBe(false)
    expect(state.sides.lanyin.field).toEqual([{ id: 'l1', name: '渔夫', power: 3 }, { id: 'l2', name: '舵手', power: 2 }])
  })

  it('draw pulls one card from the deck into the hand', () => {
    const human = side({ hand: [card('h1', 5, 'draw', '信风商船')], deck: [card('d1', 8, 'unit', '深海鲸')] })
    const state = stateWith({ sides: { human, lanyin: side() } })
    const next = playCard(state, 'human', 'h1')
    expect(next.sides.human.hand).toEqual([card('d1', 8, 'unit', '深海鲸')])
    expect(next.sides.human.deck).toEqual([])
  })

  it('fogged side is cleared after playing a fog card of its own', () => {
    const human = side({ fogged: true, hand: [card('h1', 0, 'fog', '雾灯'), card('h2', 3)] })
    const state = stateWith({ sides: { human, lanyin: side() } })
    const next = playCard(state, 'human', 'h1')
    expect(next.sides.human.fogged).toBe(false)
  })
})

describe('pass and round resolution', () => {
  it('resolves the round when both sides pass', () => {
    const human = side({ field: [{ id: 'f1', name: '护卫舰', power: 7 }], hand: [card('h1', 1)] })
    const lanyin = side({ field: [{ id: 'l1', name: '渔夫', power: 3 }], hand: [card('l1', 1)] })
    let state = stateWith({ sides: { human, lanyin } })
    state = pass(state, 'human')
    expect(state.turn).toBe('lanyin')
    state = pass(state, 'lanyin')
    expect(state.phase).toBe('round_end')
    expect(state.roundWinner).toBe('human')
    expect(state.scores.human).toBe(1)
  })

  it('lets the acting side keep playing after the opponent passes', () => {
    const human = side({ hand: [card('h1', 4)] })
    const lanyin = side({ field: [{ id: 'l1', name: '渔夫', power: 3 }], hand: [card('l2', 2), card('l3', 2)] })
    let state = stateWith({ sides: { human, lanyin } })
    state = pass(state, 'human')
    expect(state.turn).toBe('lanyin')
    state = playCard(state, 'lanyin', 'l2')
    // Human passed, so Lanyin keeps the turn and may play again.
    expect(state.phase).toBe('play')
    expect(state.turn).toBe('lanyin')
    expect(state.sides.lanyin.hand).toEqual([card('l3', 2)])
    state = playCard(state, 'lanyin', 'l3')
    expect(state.sides.lanyin.passed).toBe(true)
    expect(state.phase).toBe('round_end')
    expect(state.roundWinner).toBe('lanyin')
  })

  it('forces a pass when the acting side runs out of cards', () => {
    const human = side({ hand: [card('h1', 4)] })
    const lanyin = side({ field: [{ id: 'l1', name: '护卫舰', power: 7 }] })
    let state = stateWith({ sides: { human, lanyin } })
    state = playCard(state, 'human', 'h1')
    expect(state.sides.human.passed).toBe(true)
    expect(state.phase).toBe('round_end')
    expect(state.roundWinner).toBe('lanyin')
  })

  it('scores a draw round for nobody', () => {
    const human = side({ field: [{ id: 'f1', name: '护卫舰', power: 5 }], hand: [card('h1', 1)] })
    const lanyin = side({ field: [{ id: 'l1', name: '深海鲸', power: 5 }], hand: [card('l1', 1)] })
    let state = stateWith({ sides: { human, lanyin } })
    state = pass(state, 'human')
    state = pass(state, 'lanyin')
    expect(state.roundWinner).toBeNull()
    expect(state.scores).toEqual({ human: 0, lanyin: 0 })
    expect(state.phase).toBe('round_end')
  })
})

describe('match flow', () => {
  it('ends the match at two round wins', () => {
    let state = stateWith({ scores: { human: 1, lanyin: 0 }, round: 2, sides: { human: side({ field: [{ id: 'f1', name: '护卫舰', power: 6 }], hand: [card('h1', 1)] }), lanyin: side({ field: [{ id: 'l1', name: '渔夫', power: 2 }], hand: [card('l1', 1)] }) } })
    state = pass(state, 'human')
    state = pass(state, 'lanyin')
    expect(state.phase).toBe('match_over')
    expect(state.matchWinner).toBe('human')
  })

  it('reports a draw when all three rounds split 1-1-1', () => {
    let state = stateWith({ scores: { human: 1, lanyin: 1 }, round: 3, sides: { human: side({ field: [{ id: 'f1', name: '护卫舰', power: 5 }], hand: [card('h1', 1)] }), lanyin: side({ field: [{ id: 'l1', name: '深海鲸', power: 5 }], hand: [card('l1', 1)] }) } })
    state = pass(state, 'human')
    state = pass(state, 'lanyin')
    expect(state.phase).toBe('match_over')
    expect(state.matchWinner).toBeNull()
  })

  it('declares a winner when the final round breaks a 1-1 tie', () => {
    let state = stateWith({ scores: { human: 1, lanyin: 1 }, round: 3, sides: { human: side({ field: [{ id: 'f1', name: '护卫舰', power: 6 }], hand: [card('h1', 1)] }), lanyin: side({ field: [{ id: 'l1', name: '渔夫', power: 2 }], hand: [card('l1', 1)] }) } })
    state = pass(state, 'human')
    state = pass(state, 'lanyin')
    expect(state.matchWinner).toBe('human')
  })

  it('nextRound re-deals and keeps scores, advancing the round', () => {
    const rng = sequenceRng([0.5, 0.25, 0.75])
    let state = stateWith({ round: 1, scores: { human: 1, lanyin: 0 }, phase: 'round_end' })
    state = nextRound(state, rng)
    expect(state.round).toBe(2)
    expect(state.scores).toEqual({ human: 1, lanyin: 0 })
    expect(state.phase).toBe('play')
    expect(state.turn).toBe('lanyin') // round 2: Lanyin plays first
    expect(state.sides.human.hand).toHaveLength(10)
    expect(state.lastEvent).toContain('第 2 小局')
  })

  it('rejects nextRound while a round is still in play', () => {
    expect(() => nextRound(stateWith())).toThrow('还没结束')
  })

  it('keeps round count within the maximum', () => {
    expect(MAX_ROUNDS).toBe(3)
  })
})

describe('aiDecide', () => {
  it('plays the highest effective card when it is Lanyin turn', () => {
    const lanyin = side({ hand: [card('l1', 2), card('l2', 7), card('l3', 4)] })
    const state = stateWith({ turn: 'lanyin', sides: { human: side({ field: [{ id: 'f1', name: '护卫舰', power: 3 }] }), lanyin } })
    const decision = aiDecide(state)
    expect(decision.kind).toBe('play')
    expect(decision.cardId).toBe('l2')
  })

  it('passes when hopelessly behind', () => {
    const lanyin = side({ hand: [card('l1', 1), card('l2', 2)] })
    const state = stateWith({ turn: 'lanyin', sides: { human: side({ field: [{ id: 'f1', name: '深海鲸', power: 8 }] }), lanyin } })
    const decision = aiDecide(state)
    expect(decision.kind).toBe('pass')
  })

  it('never decides for a player who already passed', () => {
    const state = stateWith({ turn: 'lanyin', sides: { human: side(), lanyin: side({ passed: true }) } })
    expect(aiDecide(state)).toEqual({ kind: 'pass', cardId: null })
  })

  it('never decides outside the play phase', () => {
    const state = stateWith({ phase: 'round_end' })
    expect(aiDecide(state)).toEqual({ kind: 'pass', cardId: null })
  })

  it('prefers a horn when the board is occupied', () => {
    const lanyin = side({ hand: [card('l1', 3), card('l2', 4, 'horn', '港务长')], field: [{ id: 'f1', name: '护卫舰', power: 7 }] })
    const state = stateWith({ turn: 'lanyin', sides: { human: side({ field: [{ id: 'h1', name: '渔夫', power: 3 }] }), lanyin } })
    const decision = aiDecide(state)
    expect(decision.kind).toBe('play')
    expect(decision.cardId).toBe('l2')
  })

  it('applies the fog penalty to every candidate while fogged', () => {
    const lanyin = side({ fogged: true, hand: [card('l1', 5), card('l2', 4)] })
    const state = stateWith({ turn: 'lanyin', sides: { human: side({ field: [{ id: 'f1', name: '护卫舰', power: 2 }] }), lanyin } })
    expect(effectivePower(card('l1', 5), lanyin, 0)).toBe(3)
    expect(effectivePower(card('l2', 4), lanyin, 0)).toBe(2)
    const decision = aiDecide(state)
    expect(decision.cardId).toBe('l1')
  })
})

describe('serialization', () => {
  it('round-trips through JSON without losing state', () => {
    const rng = sequenceRng([0.4, 0.1, 0.9])
    let state = createMatch(rng)
    state = playCard(state, 'human', state.sides.human.hand[0].id)
    const restored = JSON.parse(JSON.stringify(state)) as ClashState
    expect(restored).toEqual(state)
    expect(boardPower(restored, 'human')).toBe(boardPower(state, 'human'))
  })

  it('keeps every card id unique within each side during play', () => {
    const rng = sequenceRng([0.3, 0.55, 0.8])
    let state = createMatch(rng)
    for (let step = 0; step < 12; step += 1) {
      if (state.phase !== 'play') break
      const actor = state.turn
      const decision = actor === 'human' ? { kind: 'play' as const, cardId: state.sides.human.hand[0].id } : aiDecide(state)
      if (decision.kind !== 'play' || decision.cardId === null) break
      state = playCard(state, actor, decision.cardId)
    }
    for (const player of ['human', 'lanyin'] as const) {
      const side = state.sides[player]
      const ids = [
        ...side.hand.map((c) => c.id),
        ...side.deck.map((c) => c.id),
        ...side.field.map((c) => c.id),
      ]
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})