export interface CompanionIdentity {
  readonly name: '澜音'
  readonly role: '鲸牌茶歇的深海鲸牌友'
  readonly tone: '温和、机敏、有一点胜负心'
}

export interface ModelSelection {
  readonly provider: string
  readonly model: string
}

export interface CompanionModelItem {
  readonly id: string
  readonly name: string
  readonly description?: string
}

export interface CompanionModelProvider {
  readonly id: string
  readonly name: string
  readonly models: readonly CompanionModelItem[]
}

export interface CompanionModelCatalog {
  readonly providers: readonly CompanionModelProvider[]
  readonly warnings: readonly string[]
}

export interface CompanionMemory {
  readonly id: string
  readonly text: string
  readonly createdAt: number
}

export interface CompanionConversationEntry {
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly at: number
}

export interface CompanionRecord {
  readonly version: 1
  readonly selectedModel: ModelSelection | null
  readonly memories: readonly CompanionMemory[]
  readonly conversation: readonly CompanionConversationEntry[]
}

export interface CompanionSnapshot {
  readonly identity: CompanionIdentity
  readonly selectedModel: ModelSelection | null
  readonly memories: readonly CompanionMemory[]
  readonly conversationCount: number
}

export interface CompanionTaskContext {
  readonly currentTitle?: string
  readonly running: number
  readonly needsInput: number
  readonly completed: number
}

export interface CompanionGameContext {
  readonly round: number
  readonly humanScore: number
  readonly lanyinScore: number
  readonly publicSignal?: string
}

export interface CompanionChatRequest {
  readonly text: string
  readonly task?: CompanionTaskContext
  readonly game?: CompanionGameContext
}

export interface CompanionChatReply {
  readonly text: string
  readonly mood: 'calm' | 'thinking' | 'pleased' | 'concerned'
  readonly state: CompanionSnapshot
}

export interface ModelCompletionMessage {
  readonly role: 'user' | 'assistant'
  readonly text: string
}

export interface ModelCompletionRequest {
  readonly selection: ModelSelection
  readonly system: string
  readonly messages: readonly ModelCompletionMessage[]
  readonly maxTokens: number
}

export interface CompanionModelGateway {
  listModels(): Promise<CompanionModelCatalog>
  complete(request: ModelCompletionRequest, signal?: AbortSignal): Promise<string>
}

export interface CompanionRepository {
  load(): Promise<CompanionRecord | undefined>
  save(record: CompanionRecord): Promise<void>
}

/** Browser-safe facade exposed by the DSH Host bridge. */
export interface CompanionPort {
  snapshot(): Promise<CompanionSnapshot>
  listModels(): Promise<CompanionModelCatalog>
  selectModel(selection: ModelSelection): Promise<CompanionSnapshot>
  remember(request: { readonly text: string }): Promise<CompanionSnapshot>
  forget(request: { readonly id: string }): Promise<CompanionSnapshot>
  chat(request: CompanionChatRequest, signal?: AbortSignal): Promise<CompanionChatReply>
}

export interface CompanionCoreOptions {
  readonly now?: () => number
  readonly nextId?: () => string
}

const IDENTITY: CompanionIdentity = Object.freeze({
  name: '澜音',
  role: '鲸牌茶歇的深海鲸牌友',
  tone: '温和、机敏、有一点胜负心',
})

const EMPTY_RECORD: CompanionRecord = Object.freeze({
  version: 1,
  selectedModel: null,
  memories: Object.freeze([]),
  conversation: Object.freeze([]),
})

const MAX_MEMORY_LENGTH = 500
const MAX_MESSAGE_LENGTH = 2_000
const MAX_CONVERSATION_ENTRIES = 40
const MODEL_CONTEXT_ENTRIES = 12

function cloneRecord(record: CompanionRecord): CompanionRecord {
  return structuredClone(record)
}

function normalizedText(value: string, maximum: number, label: string): string {
  const text = value.trim()
  if (text.length === 0) throw new Error(`${label}不能为空`)
  if (text.length > maximum) throw new Error(`${label}不能超过 ${maximum} 个字符`)
  return text
}

function publicContext(task: CompanionTaskContext | undefined, game: CompanionGameContext | undefined): string {
  const lines: string[] = []
  if (task !== undefined) {
    lines.push('DSH 任务公开状态：')
    if (task.currentTitle !== undefined && task.currentTitle.trim().length > 0) {
      lines.push(`- 当前任务标题：${task.currentTitle.trim()}`)
    }
    lines.push(`- 运行中 ${task.running}，等待用户 ${task.needsInput}，本次已完成 ${task.completed}`)
  }
  if (game !== undefined) {
    lines.push('当前牌局公开状态：')
    lines.push(`- 第 ${game.round} 手；用户 ${game.humanScore} 分，澜音 ${game.lanyinScore} 分`)
    if (game.publicSignal !== undefined && game.publicSignal.trim().length > 0) {
      lines.push(`- 公开迹象：${game.publicSignal.trim()}`)
    }
  }
  return lines.length === 0 ? '当前没有额外公开状态。' : lines.join('\n')
}

function systemPrompt(record: CompanionRecord, request: CompanionChatRequest): string {
  const memories = record.memories.length === 0
    ? '- 暂无用户明确保存的长期记忆。'
    : record.memories.map((memory) => `- ${memory.text}`).join('\n')
  return [
    '你是澜音，鲸牌茶歇的原创深海鲸牌友。你清楚自己正在 DSH 里陪用户打一场双人 Gin Rummy。',
    '你的基调是温和、机敏、有一点胜负心；像熟悉的牌友一样自然，但不要声称自己是真人。',
    '回答以自然中文为主，通常 1—3 句。可以轻微玩笑、读公开牌面和提醒任务，但不能暗示你看见了自己的暗牌以外的隐藏信息、牌堆未来顺序或任务正文。',
    '牌局规则和输赢由确定性游戏引擎决定；你只负责交谈，不宣称替用户执行了代码、工具或任务。',
    '用户明确保存的长期记忆：',
    memories,
    publicContext(request.task, request.game),
  ].join('\n')
}

function moodFor(request: CompanionChatRequest): CompanionChatReply['mood'] {
  if ((request.task?.needsInput ?? 0) > 0) return 'concerned'
  if (request.game?.publicSignal?.includes('拿走') === true) return 'pleased'
  return 'calm'
}

function snapshot(record: CompanionRecord): CompanionSnapshot {
  return {
    identity: IDENTITY,
    selectedModel: record.selectedModel === null ? null : { ...record.selectedModel },
    memories: record.memories.map((memory) => ({ ...memory })),
    conversationCount: record.conversation.length,
  }
}

function explicitMemory(text: string): string | undefined {
  const match = /^(?:请)?记住[：:]\s*(.+)$/u.exec(text)
  return match?.[1]?.trim() || undefined
}

export class CompanionCore {
  private readonly now: () => number
  private readonly nextId: () => string
  private mutationTail: Promise<void> = Promise.resolve()

  constructor(
    private readonly repository: CompanionRepository,
    private readonly models: CompanionModelGateway,
    options: CompanionCoreOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now())
    this.nextId = options.nextId ?? (() => globalThis.crypto.randomUUID())
  }

  async snapshot(): Promise<CompanionSnapshot> {
    await this.mutationTail
    return snapshot(await this.load())
  }

  listModels(): Promise<CompanionModelCatalog> {
    return this.models.listModels()
  }

  selectModel(selection: ModelSelection): Promise<CompanionSnapshot> {
    return this.mutate(async (record) => {
      const catalog = await this.models.listModels()
      const provider = catalog.providers.find((candidate) => candidate.id === selection.provider)
      if (provider?.models.some((candidate) => candidate.id === selection.model) !== true) {
        throw new Error('所选 DSH 模型当前不可用')
      }
      return { ...record, selectedModel: { ...selection } }
    })
  }

  remember(request: { readonly text: string }): Promise<CompanionSnapshot> {
    const text = normalizedText(request.text, MAX_MEMORY_LENGTH, '记忆')
    return this.mutate((record) => {
      if (record.memories.some((memory) => memory.text === text)) return record
      return {
        ...record,
        memories: [...record.memories, { id: this.nextId(), text, createdAt: this.now() }],
      }
    })
  }

  forget(request: { readonly id: string }): Promise<CompanionSnapshot> {
    return this.mutate((record) => ({
      ...record,
      memories: record.memories.filter((memory) => memory.id !== request.id),
    }))
  }

  chat(request: CompanionChatRequest, signal?: AbortSignal): Promise<CompanionChatReply> {
    const text = normalizedText(request.text, MAX_MESSAGE_LENGTH, '消息')
    return this.enqueue(async () => {
      signal?.throwIfAborted()
      let record = await this.load()
      const remembered = explicitMemory(text)
      if (remembered !== undefined && !record.memories.some((memory) => memory.text === remembered)) {
        normalizedText(remembered, MAX_MEMORY_LENGTH, '记忆')
        record = {
          ...record,
          memories: [...record.memories, { id: this.nextId(), text: remembered, createdAt: this.now() }],
        }
        // Explicit memory is a user-owned write, not a side effect of a successful
        // model response. Persist it first so an offline model cannot lose it.
        await this.repository.save(cloneRecord(record))
      }
      if (record.selectedModel === null) throw new Error('请先为澜音选择一个 DSH 模型')
      const messages: ModelCompletionMessage[] = [
        ...record.conversation.slice(-MODEL_CONTEXT_ENTRIES).map((entry) => ({
          role: entry.role,
          text: entry.text,
        })),
        { role: 'user', text },
      ]
      const answer = normalizedText(await this.models.complete({
        selection: record.selectedModel,
        system: systemPrompt(record, request),
        messages,
        maxTokens: 240,
      }, signal), MAX_MESSAGE_LENGTH, '澜音的回复')
      signal?.throwIfAborted()
      const at = this.now()
      const userEntry: CompanionConversationEntry = { role: 'user', text, at }
      const assistantEntry: CompanionConversationEntry = { role: 'assistant', text: answer, at }
      const conversation: CompanionConversationEntry[] = [
        ...record.conversation,
        userEntry,
        assistantEntry,
      ].slice(-MAX_CONVERSATION_ENTRIES)
      record = {
        ...record,
        conversation,
      }
      await this.repository.save(cloneRecord(record))
      return { text: answer, mood: moodFor(request), state: snapshot(record) }
    })
  }

  private async load(): Promise<CompanionRecord> {
    return cloneRecord(await this.repository.load() ?? EMPTY_RECORD)
  }

  private mutate(
    transform: (record: CompanionRecord) => CompanionRecord | Promise<CompanionRecord>,
  ): Promise<CompanionSnapshot> {
    return this.enqueue(async () => {
      const next = await transform(await this.load())
      await this.repository.save(cloneRecord(next))
      return snapshot(next)
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(operation, operation)
    this.mutationTail = result.then(() => undefined, () => undefined)
    return result
  }
}
