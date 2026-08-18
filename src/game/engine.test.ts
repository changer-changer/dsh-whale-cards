import { describe, expect, it } from 'vitest'
import { playAiTurn } from './ai.ts'
import {
  BICYCLE_RULES,
  canKnockWithUpcard,
  createMatch,
  discardCard,
  drawCard,
  passAtWall,
} from './engine.ts'
import { bestMeldLayout } from './melds.ts'
import { cards } from './test-helpers.ts'
import type { MatchState } from './types.ts'

describe('match engine', () => {
  it('deals a complete unique deck and alternates turns legally', () => {
    const state = createMatch(20260818)
    const all = [...state.stock, ...state.discard, ...state.hands.human, ...state.hands.lanyin]
    expect(all).toHaveLength(52)
    expect(new Set(all.map((card) => card.id))).toHaveLength(52)
    expect(state.turn).toBe('human')

    const afterDraw = drawCard(state, 'human', 'stock')
    expect(afterDraw.hands.human).toHaveLength(11)
    const afterDiscard = discardCard(afterDraw, 'human', afterDraw.hands.human[0]?.id ?? '')
    expect(afterDiscard.hands.human).toHaveLength(10)
    expect(afterDiscard.turn).toBe('lanyin')
    expect(afterDiscard.phase).toBe('draw')
  })

  it('never exposes the human hand to the AI decision surface', () => {
    const state = createMatch(91)
    const afterHumanDraw = drawCard(state, 'human', 'stock')
    const afterHuman = discardCard(afterHumanDraw, 'human', afterHumanDraw.hands.human[0]?.id ?? '')
    const afterAi = playAiTurn(afterHuman, 'steady')
    expect(afterAi.turn === 'human' || afterAi.phase === 'reveal' || afterAi.phase === 'match_over').toBe(true)
    expect(afterAi.hands.lanyin).toHaveLength(10)
  })

  it('enforces the two-card wall pass', () => {
    const base = createMatch(7)
    const wall: MatchState = {
      ...base,
      stock: base.stock.slice(0, 2),
      hands: {
        human: cards(['Ac', '3c', '5d', '7h', '9s', 'Jc', 'Qd', 'Kh', '2s', '4h']),
        lanyin: base.hands.lanyin,
      },
      discard: cards(['Qs']),
    }
    expect(canKnockWithUpcard(wall, 'human')).toBe(false)
    expect(() => drawCard(wall, 'human', 'stock')).toThrow(/wall/)
    expect(passAtWall(wall, 'human').handResult?.kind).toBe('draw')
  })

  it('scores Bicycle gin without allowing layoffs', () => {
    const base = createMatch(11)
    const beforeDiscard: MatchState = {
      ...base,
      phase: 'discard',
      turn: 'human',
      hands: {
        human: cards(['As', '2s', '3s', '4s', '5s', '6s', '7s', 'Jh', 'Qh', 'Kh', '9c']),
        lanyin: cards(['9s', 'Ts', 'Js', 'Qs', 'Ks', 'Ac', '2c', '3c', '8h', 'Th']),
      },
      drawnCardId: cards(['9c'])[0]?.id,
      drawSource: 'stock',
      rules: BICYCLE_RULES,
    }
    const settled = discardCard(beforeDiscard, 'human', cards(['9c'])[0]?.id ?? '', 'knock')
    expect(bestMeldLayout(settled.hands.human).deadwoodPoints).toBe(0)
    expect(settled.handResult).toMatchObject({ kind: 'gin', winner: 'human', points: 38 })
  })

  it('awards an undercut on equal deadwood', () => {
    const base = createMatch(17)
    const beforeDiscard: MatchState = {
      ...base,
      phase: 'discard',
      turn: 'human',
      hands: {
        human: cards(['Js', 'Jh', 'Jd', '7s', '7h', '7d', '4s', '3d', '2s', 'Ac', '8c']),
        lanyin: cards(['Qs', 'Qh', 'Qd', '6s', '6h', '6d', '4c', '3h', '2d', 'Ah']),
      },
      drawnCardId: cards(['8c'])[0]?.id,
      drawSource: 'stock',
      rules: BICYCLE_RULES,
    }
    const settled = discardCard(beforeDiscard, 'human', cards(['8c'])[0]?.id ?? '', 'knock')
    expect(settled.handResult).toMatchObject({ kind: 'undercut', winner: 'lanyin', points: 10 })
  })

  it('stores the post-layoff layout used for scoring', () => {
    const base = createMatch(23)
    const beforeDiscard: MatchState = {
      ...base,
      phase: 'discard',
      turn: 'human',
      hands: {
        human: cards(['Ks', 'Kc', 'Kd', '5s', '6s', '7s', '9c', 'Tc', 'Jc', 'Jd', 'Qh']),
        lanyin: cards(['2s', '2c', '2d', '2h', '8s', '9s', '7c', '8c', '8d', 'Ac']),
      },
      drawnCardId: cards(['Qh'])[0]?.id,
      drawSource: 'stock',
      rules: BICYCLE_RULES,
    }
    const settled = discardCard(beforeDiscard, 'human', cards(['Qh'])[0]?.id ?? '', 'knock')
    expect(settled.handResult).toMatchObject({ kind: 'undercut', winner: 'lanyin', points: 11 })
    expect(settled.handResult?.lanyinLayout.deadwoodPoints).toBe(9)
    expect(settled.handResult?.lanyinLayout.laidOff?.length).toBeGreaterThan(0)
  })
})
