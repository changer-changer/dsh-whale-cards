/**
 * Lanyin service: one persistent companion across every teahouse game.
 *
 * Owns the chat thread, the chosen model, long-term memory and the current
 * expression. Situation remarks from games are coalesced and rate-limited so
 * she comments on the flow of play without flooding; when no model is
 * reachable she degrades to her local line table and the game keeps working.
 *
 * @module teahouse/lanyin/service
 */

import { dialogueLine } from '../../ui/dialogue.ts'
import type { TeahouseCaller } from '../rpc-client.ts'
import type { GameAgentLegalAction, TeahouseAgentDecision } from '../types.ts'
import { buildSystemPrompt, expressionForEvent, LANYIN_SOUL, LANYIN_SOUL_SUMMARY, type LanyinExpression } from './persona.ts'
import { createMemoryStore, extractRememberRequest, type MemoryEntry, type MemoryStore } from './memory.ts'

export interface ChatTurn {
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly at: number
}

export interface LanyinState {
  readonly expression: LanyinExpression
  readonly chat: readonly ChatTurn[]
  readonly chatBusy: boolean
  readonly chatError: string | null
  readonly models: readonly { provider: string; model: string; displayName: string }[]
  readonly chosen: { provider: string; model: string } | null
  readonly modelsError: string | null
  /** True when a model round-trip is currently possible. */
  readonly modelLive: boolean
  readonly memories: readonly MemoryEntry[]
  readonly soul: string
  readonly agentSessionId: string | null
  readonly agentGameTitle: string | null
  readonly agentBusy: boolean
  readonly agentError: string | null
}

const CHAT_HISTORY_LIMIT = 24
const REMARK_MIN_INTERVAL_MS = 6000
const REMARK_MAX_CHARS = 120

interface ActiveGameAgent {
  readonly sessionId: string
  readonly gameId: string
  readonly gameTitle: string
  readonly started: Promise<boolean>
}

function randomSessionId(): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `lanyin-game-${id}`
}

export class LanyinService {
  private readonly listeners = new Set<() => void>()
  private readonly memory: MemoryStore = createMemoryStore()
  private readonly caller: TeahouseCaller | null
  private state: LanyinState
  private lastRemarkAt = 0
  private remarkTimer: ReturnType<typeof setTimeout> | null = null
  private pendingRemark: { event: string; context: string } | null = null
  private activeGameAgent: ActiveGameAgent | null = null

  constructor(caller: TeahouseCaller | null) {
    this.caller = caller
    this.state = {
      expression: caller === null ? 'offline' : 'calm',
      chat: [],
      chatBusy: false,
      chatError: null,
      models: [],
      chosen: readChosenModel(),
      modelsError: null,
      modelLive: false,
      memories: this.memory.list(),
      soul: LANYIN_SOUL_SUMMARY,
      agentSessionId: null,
      agentGameTitle: null,
      agentBusy: false,
      agentError: null,
    }
    if (caller !== null) void this.refreshModels()
  }

  /* ---------------- external store plumbing ---------------- */

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): LanyinState => this.state

  private set(patch: Partial<LanyinState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  /* ---------------- models ---------------- */

  async refreshModels(): Promise<void> {
    if (this.caller === null) {
      this.set({ modelsError: '当前环境没有 DSH 模型通道（预览模式）', modelLive: false })
      return
    }
    const result = await this.caller.models()
    if (result.ok && result.models !== undefined && result.models.length > 0) {
      const models = result.models
      let chosen = this.state.chosen
      if (chosen === null || !models.some((m) => m.provider === chosen?.provider && m.model === chosen.model)) {
        chosen = { provider: models[0].provider, model: models[0].model }
        writeChosenModel(chosen)
      }
      this.set({ models, chosen, modelsError: null, modelLive: true, expression: 'calm' })
    } else {
      this.set({ modelsError: result.error ?? '没有可用模型', modelLive: false, expression: 'offline' })
    }
  }

  chooseModel(provider: string, model: string): void {
    const chosen = { provider, model }
    writeChosenModel(chosen)
    this.set({ chosen })
  }

  /* ---------------- memory ---------------- */

  memoryList(): readonly MemoryEntry[] {
    return this.memory.list()
  }

  remember(text: string): boolean {
    const entry = this.memory.add(text)
    if (entry === null) return false
    this.set({ memories: this.memory.list() })
    return true
  }

  updateMemory(id: string, text: string): void {
    this.memory.update(id, text)
    this.set({ memories: this.memory.list() })
  }

  removeMemory(id: string): void {
    this.memory.remove(id)
    this.set({ memories: this.memory.list() })
  }

  /* ---------------- chat ---------------- */

  async beginGameAgent(input: { gameId: string; gameTitle: string; rules: string }): Promise<boolean> {
    const chosen = this.state.chosen
    if (this.caller === null || chosen === null) return false
    if (this.activeGameAgent !== null) await this.endGameAgent()

    const sessionId = randomSessionId()
    let resolveStarted!: (value: boolean) => void
    const started = new Promise<boolean>((resolve) => { resolveStarted = resolve })
    const active: ActiveGameAgent = { sessionId, gameId: input.gameId, gameTitle: input.gameTitle, started }
    this.activeGameAgent = active
    this.set({ agentSessionId: sessionId, agentGameTitle: input.gameTitle, agentBusy: true, agentError: null })

    const result = await this.caller.startAgent({
      sessionId,
      provider: chosen.provider,
      model: chosen.model,
      gameId: input.gameId,
      gameTitle: input.gameTitle,
      rules: input.rules,
      soul: LANYIN_SOUL,
      memories: this.memory.list().map((entry) => entry.text),
    })
    const ok = result.ok
    resolveStarted(ok)
    if (this.activeGameAgent === active) {
      this.set({
        agentBusy: false,
        agentError: result.ok ? null : result.message,
        ...(ok ? {} : { agentSessionId: null, agentGameTitle: null }),
      })
      if (!ok) this.activeGameAgent = null
    }
    return ok
  }

  async chooseGameAction(input: {
    situation: string
    legalActions: readonly GameAgentLegalAction[]
  }): Promise<TeahouseAgentDecision | null> {
    const active = this.activeGameAgent
    if (this.caller === null || active === null || !(await active.started)) return null
    this.set({ agentBusy: true, agentError: null, expression: 'thinking' })
    const result = await this.caller.turnAgent({
      sessionId: active.sessionId,
      situation: input.situation,
      legalActions: input.legalActions,
    })
    if (this.activeGameAgent !== active) return null
    if (!result.ok) {
      this.set({ agentBusy: false, agentError: result.message, expression: 'worried' })
      return null
    }
    const line = result.value.line.trim()
    this.set({
      agentBusy: false,
      agentError: null,
      expression: result.value.intent === 'ruthless' ? 'proud' : 'talking',
      chat: line === '' ? this.state.chat : [...this.state.chat, { role: 'assistant' as const, text: line, at: Date.now() }].slice(-CHAT_HISTORY_LIMIT),
    })
    return result.value
  }

  async endGameAgent(summary?: string): Promise<void> {
    const active = this.activeGameAgent
    if (this.caller === null || active === null) return
    this.activeGameAgent = null
    if (await active.started) {
      if (summary?.trim()) {
        const event = await this.caller.eventAgent({
          sessionId: active.sessionId,
          event: 'game_finished',
          context: summary,
        })
        if (event.ok && event.value.text.trim() !== '') {
          this.set({ chat: [...this.state.chat, { role: 'assistant' as const, text: event.value.text, at: Date.now() }].slice(-CHAT_HISTORY_LIMIT) })
        }
      }
      await this.caller.endAgent({ sessionId: active.sessionId })
    }
    this.set({ agentSessionId: null, agentGameTitle: null, agentBusy: false })
  }

  async notifyTask(status: 'done' | 'needs_input', context: string): Promise<void> {
    const active = this.activeGameAgent
    if (this.caller === null || active === null || !(await active.started)) {
      this.remark(status === 'done' ? 'task_done' : 'task_needs_input', context)
      return
    }
    const result = await this.caller.eventAgent({
      sessionId: active.sessionId,
      event: status === 'done' ? 'task_done' : 'task_needs_input',
      context,
    })
    if (this.activeGameAgent !== active || !result.ok) return
    this.set({
      expression: 'talking',
      chat: [...this.state.chat, { role: 'assistant' as const, text: result.value.text, at: Date.now() }].slice(-CHAT_HISTORY_LIMIT),
    })
  }

  async sendChat(text: string): Promise<void> {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (clean === '' || this.state.chatBusy) return

    const remember = extractRememberRequest(clean)
    if (remember !== null) this.memory.add(remember.toRemember)

    const history: ChatTurn[] = [...this.state.chat, { role: 'user', text: clean, at: Date.now() }]
    this.set({ chat: history.slice(-CHAT_HISTORY_LIMIT), chatBusy: true, chatError: null, expression: 'thinking' })

    const active = this.activeGameAgent
    let reply: string | null = null
    if (this.caller !== null && active !== null && await active.started) {
      const result = await this.caller.chatAgent({ sessionId: active.sessionId, text: clean })
      if (result.ok) reply = result.value.text
    }
    if (reply === null) {
      reply = await this.generateReply(
        buildSystemPrompt({ memories: this.memory.list(), situation: '用户在茶歇间和你聊天。' }),
        history.map((turn) => ({ role: turn.role, text: turn.text })),
      )
    }

    const next: ChatTurn[] = [...history]
    let expression: LanyinExpression = 'calm'
    if (reply !== null) {
      next.push({ role: 'assistant', text: reply, at: Date.now() })
      expression = 'talking'
    } else if (remember !== null) {
      next.push({ role: 'assistant', text: '好，这件事我记住了。', at: Date.now() })
      expression = 'talking'
    } else {
      const fallback = dialogueLine('chat', Date.now() % 100000)
      next.push({ role: 'assistant', text: `${fallback}（模型暂时不在，我先陪你聊这句。）`, at: Date.now() })
    }
    this.set({ chat: next.slice(-CHAT_HISTORY_LIMIT), chatBusy: false, expression, memories: this.memory.list() })
  }

  /* ---------------- game-situation remarks ---------------- */

  /**
   * Comment on a game moment. Coalesced: bursts collapse into the latest
   * event; at most one remark leaves per interval; failures degrade to the
   * local line table silently.
   */
  remark(event: string, context: string): void {
    this.pendingRemark = { event, context }
    this.set({ expression: expressionForEvent(event) })
    if (this.remarkTimer !== null) return
    const wait = Math.max(0, REMARK_MIN_INTERVAL_MS - (Date.now() - this.lastRemarkAt))
    this.remarkTimer = setTimeout(() => {
      this.remarkTimer = null
      const pending = this.pendingRemark
      this.pendingRemark = null
      if (pending === null) return
      this.lastRemarkAt = Date.now()
      void this.deliverRemark(pending.event, pending.context)
    }, wait === 0 ? 250 : wait)
  }

  private async deliverRemark(event: string, context: string): Promise<void> {
    const history = this.state.chat.slice(-6).map((turn) => ({ role: turn.role, text: turn.text }))
    const reply = await this.generateReply(
      buildSystemPrompt({ memories: this.memory.list(), situation: context }),
      [...history, { role: 'user', text: `（对局事件：${event}。请就这个局面说一句话。）` }],
    )
    const text = reply ?? dialogueLine(
      remarkDialogueEvent(event),
      (Date.now() % 2147483647),
    )
    const trimmed = text.length > REMARK_MAX_CHARS ? `${text.slice(0, REMARK_MAX_CHARS - 1)}…` : text
    this.set({
      chat: [...this.state.chat, { role: 'assistant' as const, text: trimmed, at: Date.now() }].slice(-CHAT_HISTORY_LIMIT),
      expression: expressionForEvent(event),
    })
  }

  private async generateReply(system: string, messages: readonly { role: 'user' | 'assistant'; text: string }[]): Promise<string | null> {
    const chosen = this.state.chosen
    if (this.caller === null || chosen === null) return null
    const result = await this.caller.chat({ provider: chosen.provider, model: chosen.model, system, messages })
    if (result.ok) return result.text
    if (this.state.modelLive) void this.refreshModels()
    return null
  }

  /** Used on unmount / collapse to clear timers. */
  dispose(): void {
    if (this.remarkTimer !== null) {
      clearTimeout(this.remarkTimer)
      this.remarkTimer = null
    }
    void this.endGameAgent()
  }
}

function remarkDialogueEvent(event: string): Parameters<typeof dialogueLine>[0] {
  switch (event) {
    case 'human_gin':
    case 'player_win':
    case 'human_win':
      return 'human_gin'
    case 'human_knock':
      return 'human_knock'
    case 'ai_gin':
    case 'opponent_win':
    case 'ai_win':
      return 'ai_gin'
    case 'ai_knock':
      return 'ai_knock'
    case 'human_take_discard':
      return 'human_take_discard'
    case 'ai_take_discard':
      return 'ai_take_discard'
    case 'task_done':
      return 'task_done'
    case 'task_needs_input':
      return 'task_needs_input'
    default:
      return 'chat'
  }
}

const CHOSEN_MODEL_KEY = 'dsh-teahouse:lanyin:model:v1'

function readChosenModel(): { provider: string; model: string } | null {
  try {
    const raw = localStorage.getItem(CHOSEN_MODEL_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null
      && typeof (parsed as Record<string, unknown>).provider === 'string'
      && typeof (parsed as Record<string, unknown>).model === 'string') {
      const record = parsed as { provider: string; model: string }
      return { provider: record.provider, model: record.model }
    }
    return null
  } catch {
    return null
  }
}

function writeChosenModel(chosen: { provider: string; model: string }): void {
  try {
    localStorage.setItem(CHOSEN_MODEL_KEY, JSON.stringify(chosen))
  } catch {
    /* best-effort */
  }
}
