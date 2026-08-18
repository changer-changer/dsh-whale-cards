import type { CompanionChatReply } from '../companion/core.ts'
import type { PublicAction } from '../game/types.ts'
import type { TaskNotice } from './task-status.ts'

export type LanyinExpression = 'calm' | 'thinking' | 'pleased' | 'concerned'

export interface LanyinExpressionInput {
  readonly aiThinking: boolean
  readonly lastPublicAction?: PublicAction
  readonly mood: CompanionChatReply['mood']
  readonly taskNotice: TaskNotice
}

/**
 * Expressions deliberately depend only on user-visible state. Hidden cards,
 * meld quality, AI scores and future stock order never enter this function.
 */
export function lanyinExpression(input: LanyinExpressionInput): LanyinExpression {
  if (input.taskNotice === 'needs_input' || input.mood === 'concerned') return 'concerned'
  if (input.aiThinking || input.mood === 'thinking') return 'thinking'
  if (input.taskNotice === 'done' || input.mood === 'pleased') return 'pleased'
  if (input.lastPublicAction?.player === 'lanyin'
    && (input.lastPublicAction.type === 'take_discard'
      || input.lastPublicAction.type === 'knock'
      || input.lastPublicAction.type === 'gin')) {
    return 'pleased'
  }
  return 'calm'
}
