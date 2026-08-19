import { describe, expect, it } from 'vitest'
import {
  CLASH_DECK,
  aiDecide,
  compareFormations,
  createMatch,
  evaluateFormation,
  playCard,
  type ClashCard,
  type ClashState,
  type Lane,
} from './engine.ts'

const card = (id: string, suit: ClashCard['suit'], value: number): ClashCard => ({ id, suit, value })

function lane(partial: Partial<Lane> = {}): Lane {
  return { id: 'north', title: '北灯塔', human: [], lanyin: [], claimedBy: null, ...partial }
}

function stateWith(partial: Partial<ClashState> = {}): ClashState {
  return {
    version: 2,
    phase: 'play',
    turn: 'human',
    hands: { human: [], lanyin: [] },
    deck: [],
    lanes: [lane(), lane({ id: 'mid', title: '主航道' }), lane({ id: 'south', title: '南灯塔' })],
    winner: null,
    lastEvent: '测试牌局',
    ...partial,
  }
}

describe('formation hierarchy', () => {
  it('ranks a suited run above a fleet, suit, run and raw strength', () => {
    const beacon = [card('a', 'tide', 3), card('b', 'tide', 4), card('c', 'tide', 5)]
    const fleet = [card('d', 'tide', 7), card('e', 'ember', 7), card('f', 'mist', 7)]
    const suit = [card('g', 'ember', 1), card('h', 'ember', 4), card('i', 'ember', 7)]
    const run = [card('j', 'tide', 2), card('k', 'ember', 3), card('l', 'mist', 4)]
    const strength = [card('m', 'tide', 1), card('n', 'ember', 3), card('o', 'mist', 7)]
    expect(evaluateFormation(beacon).tier).toBe(5)
    expect(compareFormations(beacon, fleet)).toBeGreaterThan(0)
    expect(compareFormations(fleet, suit)).toBeGreaterThan(0)
    expect(compareFormations(suit, run)).toBeGreaterThan(0)
    expect(compareFormations(run, strength)).toBeGreaterThan(0)
  })
})

describe('three-lane duel', () => {
  it('deals six hidden cards per side from one unique deck', () => {
    const state = createMatch(() => 0.37)
    expect(state.hands.human).toHaveLength(6)
    expect(state.hands.lanyin).toHaveLength(6)
    expect(state.deck).toHaveLength(CLASH_DECK.length - 12)
    const ids = [...state.hands.human, ...state.hands.lanyin, ...state.deck].map((item) => item.id)
    expect(new Set(ids).size).toBe(CLASH_DECK.length)
  })

  it('places a card on a chosen lane, draws and passes the turn', () => {
    const humanCard = card('h1', 'tide', 3)
    const drawn = card('d1', 'mist', 6)
    const state = stateWith({ hands: { human: [humanCard], lanyin: [card('l1', 'ember', 2)] }, deck: [drawn] })
    const next = playCard(state, 'human', humanCard.id, 'mid')
    expect(next.lanes[1]?.human).toEqual([humanCard])
    expect(next.hands.human).toEqual([drawn])
    expect(next.turn).toBe('lanyin')
  })

  it('does not stall when the other side has no cards and the deck is empty', () => {
    const held = card('h1', 'tide', 3)
    const state = stateWith({ hands: { human: [held, card('h2', 'mist', 4)], lanyin: [] } })
    const next = playCard(state, 'human', held.id, 'mid')
    expect(next.phase).toBe('play')
    expect(next.turn).toBe('human')
  })

  it('claims a lane when both formations are complete', () => {
    const human = [card('h1', 'tide', 3), card('h2', 'tide', 4)]
    const lanyin = [card('l1', 'ember', 7), card('l2', 'mist', 7), card('l3', 'tide', 7)]
    const finish = card('h3', 'tide', 5)
    const state = stateWith({
      hands: { human: [finish], lanyin: [] },
      lanes: [lane({ human, lanyin }), lane({ id: 'mid', title: '主航道' }), lane({ id: 'south', title: '南灯塔' })],
    })
    const next = playCard(state, 'human', finish.id, 'north')
    expect(next.lanes[0]?.claimedBy).toBe('human')
    expect(next.lastEvent).toContain('拿下北灯塔')
  })

  it('ends immediately when a player claims a second lane', () => {
    const finish = card('h3', 'tide', 5)
    const winning = lane({
      id: 'mid', title: '主航道',
      human: [card('h1', 'tide', 3), card('h2', 'tide', 4)],
      lanyin: [card('l1', 'ember', 7), card('l2', 'mist', 7), card('l3', 'tide', 7)],
    })
    const state = stateWith({
      hands: { human: [finish], lanyin: [] },
      lanes: [lane({ claimedBy: 'human' }), winning, lane({ id: 'south', title: '南灯塔' })],
    })
    const next = playCard(state, 'human', finish.id, 'mid')
    expect(next.phase).toBe('match_over')
    expect(next.winner).toBe('human')
  })

  it('rejects full, claimed or unknown lanes', () => {
    const held = card('h', 'tide', 2)
    const state = stateWith({ hands: { human: [held], lanyin: [] }, lanes: [lane({ claimedBy: 'lanyin' }), lane({ id: 'mid', title: '主航道' }), lane({ id: 'south', title: '南灯塔' })] })
    expect(() => playCard(state, 'human', held.id, 'north')).toThrow('已经归属')
    expect(() => playCard(state, 'human', held.id, 'missing' as 'north')).toThrow('不存在')
  })

  it('has Lanyin take an immediate winning lane', () => {
    const winner = card('x', 'mist', 5)
    const state = stateWith({
      turn: 'lanyin',
      hands: { human: [], lanyin: [winner, card('low', 'ember', 1)] },
      lanes: [
        lane({
          lanyin: [card('m3', 'mist', 3), card('m4', 'mist', 4)],
          human: [card('e7', 'tide', 7), card('f7', 'ember', 7), card('t7', 'mist', 7)],
        }),
        lane({ id: 'mid', title: '主航道' }),
        lane({ id: 'south', title: '南灯塔' }),
      ],
    })
    expect(aiDecide(state)).toEqual({ cardId: 'x', laneId: 'north' })
  })
})

describe('serialization', () => {
  it('round-trips after a legal move', () => {
    let state = createMatch(() => 0.61)
    state = playCard(state, 'human', state.hands.human[0]!.id, 'north')
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })
})
