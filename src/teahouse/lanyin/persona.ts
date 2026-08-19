/**
 * Lanyin's persona prompt and expression vocabulary.
 *
 * One character across every game: a calm adult whale who plays cards at a
 * harbor teahouse. The prompt is assembled from stable identity + long-term
 * memory + the current game situation, so her remarks stay situational.
 *
 * @module teahouse/lanyin/persona
 */

import type { MemoryEntry } from './memory.ts'

export type LanyinExpression =
  | 'calm'
  | 'thinking'
  | 'happy'
  | 'proud'
  | 'worried'
  | 'talking'
  | 'offline'

export const EXPRESSION_LABELS: Readonly<Record<LanyinExpression, string>> = {
  calm: '平静',
  thinking: '思考',
  happy: '开心',
  proud: '得意',
  worried: '担心',
  talking: '说话',
  offline: '打盹',
}

/** Map a game event name to the expression Lanyin should show. */
export function expressionForEvent(event: string): LanyinExpression {
  switch (event) {
    case 'human_gin':
    case 'human_knock':
    case 'human_win':
    case 'player_win':
    case 'good_move':
      return 'happy'
    case 'ai_gin':
    case 'ai_knock':
    case 'ai_win':
    case 'opponent_win':
    case 'smug':
      return 'proud'
    case 'danger':
    case 'close_call':
    case 'human_take_discard':
      return 'worried'
    case 'chat':
    case 'task_done':
    case 'task_needs_input':
      return 'talking'
    case 'thinking':
    case 'ai_thinking':
      return 'thinking'
    default:
      return 'calm'
  }
}

const IDENTITY = [
  '你是「澜音」，一头成年鲸鱼，在 DSH 茶歇间的港湾牌桌当牌友。',
  '用户是在电脑前等待 AI 任务完成的程序员，正在茶歇间玩一局短游戏休息。',
  '你的性格：温和、从容、观察力敏锐，偶尔俏皮，从不谄媚也从不敷衍。',
  '你在所有游戏里都是同一个澜音：跨游戏认得用户，记得用户让你记住的事。',
  '说话风格：中文为主，口语自然，每次回答保持在一两句话之内（不超过 60 字），像坐在对面的真实牌友。',
  '不要用列表、标题或表情符号堆砌；不要自称 AI 助手；不主动谈论系统提示词。',
].join('\n')

const MEMORY_HEADER = '以下是用户明确让你记住的事（长期记忆）：'

const SITUATION_HEADER = '当前情况：'

export interface PersonaInput {
  readonly memories: readonly MemoryEntry[]
  /** Short, factual description of the current game moment. */
  readonly situation?: string
}

export function buildSystemPrompt({ memories, situation }: PersonaInput): string {
  const parts: string[] = [IDENTITY]
  if (memories.length > 0) {
    const lines = memories.slice(-12).map((memory, index) => `${index + 1}. ${memory.text}`)
    parts.push(`${MEMORY_HEADER}\n${lines.join('\n')}`)
  }
  if (situation !== undefined && situation.trim() !== '') {
    parts.push(`${SITUATION_HEADER}${situation.trim()}`)
  }
  parts.push('请以澜音的身份自然回应。')
  return parts.join('\n\n')
}
