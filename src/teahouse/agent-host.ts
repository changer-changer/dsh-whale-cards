/**
 * Host-side Lanyin game Agent.
 *
 * Each match owns one genuine Harness Agent + Session. The model receives only
 * the current public position and an engine-authored legal-action list. Its
 * `play_game_action` call is validated here, then returned to the browser where
 * the deterministic game engine applies it. This keeps personality/model
 * judgment inside the Agent while the browser remains the rules authority.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionQueryEngine } from '@deepseek-ai/dsh-session-query'
import { defineTool, type ToolRuntime } from '@deepseek-ai/dsh-tools'
import type { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import type {
  GameAgentLegalAction,
  TeahouseAgentChatRequest,
  TeahouseAgentDecision,
  TeahouseAgentEndRequest,
  TeahouseAgentEventRequest,
  TeahouseAgentResult,
  TeahouseAgentStartRequest,
  TeahouseAgentTurnRequest,
} from './types.ts'

interface AgentHostContext extends Context {
  readonly agents: Context['agents']
  readonly tools: ToolRuntime
  readonly systemPrompt: SystemPrompt
  readonly sessionQuery: SessionQueryEngine
}

interface GameAgentRecord {
  readonly sessionId: string
  readonly gameId: string
  handle: AgentHandle | null
  legalActions: ReadonlyMap<string, GameAgentLegalAction>
  decision: TeahouseAgentDecision | null
  queue: Promise<void>
}

const MAX_LIVE_GAME_SESSIONS = 4
const ACTION_LINE_MAX = 80

function fail<T>(
  code: 'unavailable' | 'bad-request' | 'not-found' | 'provider-error',
  message: string,
): TeahouseAgentResult<T> {
  return { ok: false, code, message }
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, ACTION_LINE_MAX)
}

function textFromBlocks(content: readonly unknown[]): string {
  const parts: string[] = []
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const value = block as { type?: unknown; text?: unknown }
    if (value.type === 'text' && typeof value.text === 'string') parts.push(value.text)
  }
  return parts.join('').trim()
}

function latestAssistantText(events: readonly SessionEvent[], fromSeq: number): string {
  for (let index = events.length - 1; index >= fromSeq; index -= 1) {
    const event = events[index]
    if (event?.type !== 'assistant/message') continue
    const data = event.data as { message?: { content?: readonly unknown[] } }
    const text = textFromBlocks(data.message?.content ?? [])
    if (text !== '') return text
  }
  return ''
}

function eventFailure(events: readonly SessionEvent[], fromSeq: number): string | null {
  for (let index = events.length - 1; index >= fromSeq; index -= 1) {
    const event = events[index]
    if (event?.type !== 'turn/end') continue
    const reason = (event.data as { reason?: { kind?: string; error?: { message?: string } } }).reason
    if (reason?.kind === 'error') return reason.error?.message ?? 'Agent turn failed'
    return null
  }
  return null
}

function pluginMessage(text: string, summary: string) {
  return createUserMessage({
    source: { kind: 'plugin', plugin: 'dsh-whale-cards', form: 'notice', summary },
    content: [{ type: 'text', text }],
  })
}

function userMessage(text: string) {
  return createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text }] })
}

/** Serializes calls per Agent so a task callback cannot race a card decision. */
async function serial<T>(record: GameAgentRecord, work: () => Promise<T>): Promise<T> {
  const prior = record.queue
  let release!: () => void
  record.queue = new Promise<void>((resolve) => { release = resolve })
  await prior
  try {
    return await work()
  } finally {
    release()
  }
}

function inspectableText(event: SessionEvent): string | null {
  if (event.type === 'user/message') {
    const message = event.data as { content?: readonly unknown[] }
    const text = textFromBlocks(message.content ?? [])
    return text === '' ? null : `用户/上下文：${text}`
  }
  if (event.type === 'assistant/message') {
    const data = event.data as { message?: { content?: readonly unknown[] } }
    const text = textFromBlocks(data.message?.content ?? [])
    return text === '' ? null : `助手：${text}`
  }
  return null
}

export class LanyinGameAgentHost {
  private readonly records = new Map<string, GameAgentRecord>()

  constructor(private readonly ctx: AgentHostContext) {}

  async start(request: TeahouseAgentStartRequest): Promise<TeahouseAgentResult<{ sessionId: string }>> {
    if (!request || typeof request.sessionId !== 'string' || request.sessionId.trim() === ''
      || typeof request.provider !== 'string' || typeof request.model !== 'string'
      || typeof request.gameId !== 'string' || typeof request.gameTitle !== 'string'
      || typeof request.rules !== 'string' || typeof request.soul !== 'string') {
      return fail('bad-request', 'invalid Agent start request')
    }
    const existing = this.records.get(request.sessionId)
    if (existing?.handle !== null && existing?.handle !== undefined) {
      return { ok: true, value: { sessionId: request.sessionId } }
    }

    while (this.records.size >= MAX_LIVE_GAME_SESSIONS) {
      const oldest = this.records.values().next().value as GameAgentRecord | undefined
      if (oldest === undefined) break
      this.records.delete(oldest.sessionId)
      if (oldest.handle !== null) await oldest.handle.dispose()
    }

    const record: GameAgentRecord = {
      sessionId: request.sessionId,
      gameId: request.gameId,
      handle: null,
      legalActions: new Map(),
      decision: null,
      queue: Promise.resolve(),
    }
    this.records.set(request.sessionId, record)

    const memoryText = request.memories.slice(-12).map((memory, index) => `${index + 1}. ${memory}`).join('\n')
    const persona = [
      request.soul,
      `你正在和用户玩《${request.gameTitle}》。`,
      `规则：${request.rules}`,
      memoryText === '' ? '' : `用户长期记忆：\n${memoryText}`,
      '每次需要你行动时，必须调用 play_game_action，并且 actionId 只能来自本轮合法动作。',
      '你可以根据对话表现得认真、赌气、心软或调皮，但不能捏造牌、修改分数或绕过本地规则。',
      'line 是你出牌时对用户说的一句自然中文，最多 40 字；不要解释系统或工具。',
    ].filter(Boolean).join('\n\n')
    const sessionQuery = this.ctx.sessionQuery

    try {
      const handle = await this.ctx.agents.create({
        sessionId: SessionId(request.sessionId),
        agentOptions: { provider: request.provider, model: request.model, maxTokens: 240 },
        setup: (agentCtx) => {
          const inheritedNames = this.ctx.tools.schemas().map((schema) => schema.name)
          if (inheritedNames.length > 0) agentCtx.tools.restrict({ deny: inheritedNames })
          agentCtx.tools.presentAs('native')
          agentCtx.systemPrompt.section({ name: 'deployment:persona', order: 0, text: persona })

          agentCtx.tools.register(defineTool({
            name: 'play_game_action',
            description: 'Choose and commit exactly one legal action for the current game turn.',
            parameters: {
              actionId: { type: 'string', required: true, description: 'Exact id from the legal action list.' },
              line: { type: 'string', required: true, description: 'One short in-character Chinese line to the player.' },
              intent: {
                type: 'string',
                required: true,
                enum: ['fair', 'merciful', 'ruthless', 'mischievous'],
                description: 'The emotional/strategic flavor behind this move.',
              },
            },
            output: {
              schema: { type: 'json' },
              render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
            },
            async execute(args, exec) {
              const allowed = record.legalActions.get(args.actionId)
              if (allowed === undefined) throw new Error(`非法动作 ${args.actionId}；请从本轮合法动作中重选`)
              const decision: TeahouseAgentDecision = {
                actionId: allowed.id,
                line: cleanLine(args.line),
                intent: args.intent,
              }
              record.decision = decision
              exec.concludeTurn()
              return { ...decision } as Record<string, string>
            },
          }))

          agentCtx.tools.register(defineTool({
            name: 'search_sessions',
            description: 'Search the user-authorized DSH conversation history when their question refers to another task or session.',
            parameters: {
              query: { type: 'string', required: true, description: 'A short literal phrase to find.' },
            },
            output: {
              schema: { type: 'json' },
              render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
            },
            async execute(args, exec) {
              const page = await sessionQuery.searchSessions(
                { query: args.query.slice(0, 120), limit: 5 },
                { signal: exec.signal },
              )
              const titleRows = await sessionQuery.readTitleSnapshots(
                page.items.map((item) => item.header.id),
                exec.signal,
              )
              const titles = new Map(titleRows.flatMap((row) => row.status === 'fulfilled'
                ? [[String(row.sessionId), row.value.title?.title ?? '未命名会话'] as const]
                : []))
              return page.items.map((item) => ({
                sessionId: String(item.header.id),
                title: titles.get(String(item.header.id)) ?? '未命名会话',
                snippet: item.bestMatch.snippet.slice(0, 260),
                createdAt: item.header.createdAt,
              }))
            },
          }))

          agentCtx.tools.register(defineTool({
            name: 'inspect_session',
            description: 'Read a small recent window from one DSH session returned by search_sessions.',
            parameters: {
              sessionId: { type: 'string', required: true, description: 'Exact session id returned by search_sessions.' },
            },
            output: {
              schema: { type: 'json' },
              render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
            },
            async execute(args) {
              const snapshot = await sessionQuery.readSurface(SessionId(args.sessionId))
              return snapshot.events.map(inspectableText).filter((line): line is string => line !== null).slice(-12)
            },
          }))
        },
      })
      record.handle = handle
      return { ok: true, value: { sessionId: request.sessionId } }
    } catch (error) {
      this.records.delete(request.sessionId)
      return fail('provider-error', error instanceof Error ? error.message : String(error))
    }
  }

  async turn(request: TeahouseAgentTurnRequest): Promise<TeahouseAgentResult<TeahouseAgentDecision>> {
    const record = this.records.get(request?.sessionId)
    if (record?.handle === null || record?.handle === undefined) return fail('not-found', 'game Agent session not found')
    if (!Array.isArray(request.legalActions) || request.legalActions.length === 0 || typeof request.situation !== 'string') {
      return fail('bad-request', 'situation and legalActions are required')
    }
    const actions = new Map<string, GameAgentLegalAction>()
    for (const action of request.legalActions.slice(0, 80)) {
      if (typeof action?.id !== 'string' || typeof action?.label !== 'string' || action.id.trim() === '') continue
      actions.set(action.id, { id: action.id, label: action.label.slice(0, 180) })
    }
    if (actions.size === 0) return fail('bad-request', 'no valid legal actions')

    return serial(record, async () => {
      record.legalActions = actions
      record.decision = null
      const startSeq = record.handle!.agent.session.seq
      const legal = [...actions.values()].map((action) => `- ${action.id}: ${action.label}`).join('\n')
      record.handle!.agent.followup(pluginMessage(
        `当前牌局（只包含你能看到的信息）：\n${request.situation.slice(0, 5000)}\n\n本轮合法动作：\n${legal}\n\n现在调用 play_game_action。`,
        `${record.gameId}：轮到澜音行动`,
      ))
      await record.handle!.agent.whenIdle()
      const decision = record.decision
      record.legalActions = new Map()
      if (decision !== null) return { ok: true as const, value: decision }
      const error = eventFailure(record.handle!.agent.session.events, startSeq)
      return fail('provider-error', error ?? 'Agent 没有选择合法动作')
    })
  }

  async chat(request: TeahouseAgentChatRequest): Promise<TeahouseAgentResult<{ text: string }>> {
    const record = this.records.get(request?.sessionId)
    if (record?.handle === null || record?.handle === undefined) return fail('not-found', 'game Agent session not found')
    const clean = typeof request.text === 'string' ? request.text.replace(/\s+/g, ' ').trim().slice(0, 500) : ''
    if (clean === '') return fail('bad-request', 'chat text is required')
    return serial(record, async () => {
      record.legalActions = new Map()
      const startSeq = record.handle!.agent.session.seq
      const situation = request.situation?.trim() ? `\n当前牌局：${request.situation.slice(0, 1800)}` : ''
      record.handle!.agent.followup(userMessage(`${clean}${situation}`))
      await record.handle!.agent.whenIdle()
      const text = latestAssistantText(record.handle!.agent.session.events, startSeq)
      if (text !== '') return { ok: true as const, value: { text } }
      return fail('provider-error', eventFailure(record.handle!.agent.session.events, startSeq) ?? 'Agent 没有回复')
    })
  }

  async event(request: TeahouseAgentEventRequest): Promise<TeahouseAgentResult<{ text: string }>> {
    const record = this.records.get(request?.sessionId)
    if (record?.handle === null || record?.handle === undefined) return fail('not-found', 'game Agent session not found')
    const labels = {
      task_done: '你守望的 DSH 当前任务已经完成。自然提醒用户可以返航查看结果，但不要催促。',
      task_needs_input: '你守望的 DSH 当前任务正在等待用户输入。简短提醒用户应优先回去处理。',
      game_finished: '本局已经结束。用一句话收尾，不要复述完整比分。',
    } as const
    return serial(record, async () => {
      record.legalActions = new Map()
      const startSeq = record.handle!.agent.session.seq
      record.handle!.agent.followup(pluginMessage(
        `${labels[request.event]}\n补充：${request.context.slice(0, 1000)}`,
        request.event === 'task_done' ? 'DSH 任务已完成' : request.event === 'task_needs_input' ? 'DSH 等待输入' : '牌局结束',
      ))
      await record.handle!.agent.whenIdle()
      const text = latestAssistantText(record.handle!.agent.session.events, startSeq)
      if (text !== '') return { ok: true as const, value: { text } }
      return fail('provider-error', eventFailure(record.handle!.agent.session.events, startSeq) ?? 'Agent 没有回复')
    })
  }

  async end(request: TeahouseAgentEndRequest): Promise<TeahouseAgentResult<Record<string, never>>> {
    const record = this.records.get(request?.sessionId)
    if (record === undefined) return { ok: true, value: {} }
    this.records.delete(request.sessionId)
    if (record.handle !== null) await record.handle.dispose()
    return { ok: true, value: {} }
  }
}
