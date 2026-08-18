import { describe, expect, it } from 'vitest'
import type { PublicAction } from '../game/types.ts'
import { lanyinExpression } from './expression.ts'

describe('lanyinExpression', () => {
  it('uses task attention, visible thinking, and public moves without hidden-hand tells', () => {
    const visibleTake: PublicAction = {
      at: 2,
      player: 'lanyin',
      type: 'take_discard',
      card: { id: '7h', rank: 7, suit: 'hearts' },
    }

    expect(lanyinExpression({ aiThinking: false, mood: 'calm', taskNotice: 'needs_input' })).toBe('concerned')
    expect(lanyinExpression({ aiThinking: true, mood: 'calm', taskNotice: null })).toBe('thinking')
    expect(lanyinExpression({ aiThinking: false, lastPublicAction: visibleTake, mood: 'calm', taskNotice: null })).toBe('pleased')
    expect(lanyinExpression({ aiThinking: false, mood: 'calm', taskNotice: null })).toBe('calm')
  })
})
