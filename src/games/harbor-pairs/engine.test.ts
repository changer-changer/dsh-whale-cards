import { describe, expect, it } from 'vitest'
import {
  aiDecide,
  bank,
  createMatch,
  dive,
  nextRound,
  voyageScore,
  type TideCard,
  type TideState,
} from './engine.ts'

const pearl = (id: string, value: number): TideCard => ({ id, category: 'treasure', family: 'pearl', value })
const light = (id: string, value: number): TideCard => ({ id, category: 'treasure', family: 'light', value })
const squall = (id: string): TideCard => ({ id, category: 'peril', peril: 'squall' })

function withDeck(state: TideState, deck: readonly TideCard[]): TideState {
  return { ...state, deck }
}

describe('tide collection scoring', () => {
  it('rewards family chains and a complete four-family chart', () => {
    expect(voyageScore([pearl('p1', 2), pearl('p2', 3)])).toBe(7)
    expect(voyageScore([
      pearl('p', 1),
      { id: 'c', category: 'treasure', family: 'coral', value: 1 },
      light('l', 1),
      { id: 'm', category: 'treasure', family: 'map', value: 1 },
    ])).toBe(9)
  })
})

describe('tide voyage loop', () => {
  it('lets the player bank a growing catch before danger repeats', () => {
    let state = withDeck(createMatch(() => 0.42), [pearl('p1', 2), pearl('p2', 3), squall('s1')])
    state = dive(state, 'human')
    state = dive(state, 'human')
    expect(voyageScore(state.voyage.cards)).toBe(7)

    state = bank(state, 'human')
    expect(state.bank.human).toBe(7)
    expect(state.turn).toBe('lanyin')
    expect(state.voyage.cards).toHaveLength(0)
  })

  it('busts on a repeated peril and hands the voyage to Lanyin', () => {
    let state = withDeck(createMatch(() => 0.2), [squall('s1'), pearl('p1', 4), squall('s2')])
    state = dive(state, 'human')
    state = dive(state, 'human')
    expect(voyageScore(state.voyage.cards)).toBe(4)
    state = dive(state, 'human')

    expect(state.turn).toBe('lanyin')
    expect(state.bank.human).toBe(0)
    expect(state.lastEvent).toContain('风暴再次出现')
  })

  it('ends a three-round match by accumulated banked score', () => {
    let state = createMatch(() => 0.3)
    state = { ...state, turn: 'lanyin', bank: { human: 8, lanyin: 0 } }
    state = bank(state, 'lanyin')
    expect(state.phase).toBe('round_end')
    state = nextRound(state, () => 0.4)
    expect(state.round).toBe(2)

    state = { ...state, totalScores: { human: 8, lanyin: 0 }, bank: { human: 9, lanyin: 0 }, turn: 'lanyin' }
    state = bank(state, 'lanyin')
    state = nextRound(state, () => 0.5)
    state = { ...state, totalScores: { human: 17, lanyin: 0 }, bank: { human: 6, lanyin: 0 }, turn: 'lanyin' }
    state = bank(state, 'lanyin')

    expect(state.phase).toBe('match_over')
    expect(state.winner).toBe('human')
    expect(state.totalScores.human).toBe(23)
  })

  it('makes Lanyin bank a valuable run when repeated danger is likely', () => {
    const base = createMatch(() => 0.1)
    const risky: TideState = {
      ...base,
      turn: 'lanyin',
      voyage: { cards: [pearl('p1', 4), pearl('p2', 3)], perils: ['squall'] },
      deck: [squall('s2'), light('l1', 1), squall('s3')],
    }
    expect(aiDecide(risky)).toBe('bank')
  })
})
