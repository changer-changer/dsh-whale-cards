import { describe, expect, it } from 'vitest'
import {
  CompanionCore,
  type CompanionModelGateway,
  type CompanionRecord,
  type CompanionRepository,
  type ModelCompletionRequest,
} from './core.ts'

class MemoryRepository implements CompanionRepository {
  record: CompanionRecord | undefined

  async load(): Promise<CompanionRecord | undefined> {
    return this.record === undefined ? undefined : structuredClone(this.record)
  }

  async save(record: CompanionRecord): Promise<void> {
    this.record = structuredClone(record)
  }
}

class RecordingModels implements CompanionModelGateway {
  readonly requests: ModelCompletionRequest[] = []

  async listModels() {
    return {
      providers: [{
        id: 'deepseek',
        name: 'DeepSeek',
        models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }],
      }],
      warnings: [],
    }
  }

  async complete(request: ModelCompletionRequest): Promise<string> {
    this.requests.push(structuredClone(request))
    return '记得。等这手结束，我也会提醒你回去看看。'
  }
}

class OfflineModels extends RecordingModels {
  override async complete(request: ModelCompletionRequest): Promise<string> {
    this.requests.push(structuredClone(request))
    throw new Error('模型暂时离线')
  }
}

describe('CompanionCore', () => {
  it('keeps Lanyin identity, chosen DSH model, and explicit memory across a restart', async () => {
    const repository = new MemoryRepository()
    const models = new RecordingModels()
    let id = 0
    const options = { now: () => 1_780_000_000_000, nextId: () => `memory-${++id}` }
    const first = new CompanionCore(repository, models, options)

    await first.selectModel({ provider: 'deepseek', model: 'deepseek-chat' })
    await first.remember({ text: '我喜欢在长任务等待时喝乌龙茶。' })

    const restarted = new CompanionCore(repository, models, options)
    const beforeChat = await restarted.snapshot()
    expect(beforeChat.identity.name).toBe('澜音')
    expect(beforeChat.selectedModel).toEqual({ provider: 'deepseek', model: 'deepseek-chat' })
    expect(beforeChat.memories.map((memory) => memory.text)).toEqual(['我喜欢在长任务等待时喝乌龙茶。'])

    const reply = await restarted.chat({
      text: '你还记得我等待任务时喜欢喝什么吗？',
      task: {
        currentTitle: '修复牌桌交互',
        running: 1,
        needsInput: 0,
        completed: 0,
      },
      game: {
        gameId: 'gin-rummy',
        gameTitle: 'Gin Rummy',
        summary: '第 2/3 手；你 12 分，澜音 8 分',
      },
    })

    expect(reply.text).toContain('记得')
    expect(models.requests).toHaveLength(1)
    expect(models.requests[0]?.system).toContain('你是澜音')
    expect(models.requests[0]?.system).toContain('我喜欢在长任务等待时喝乌龙茶。')
    expect(models.requests[0]?.system).toContain('修复牌桌交互')
    expect(models.requests[0]?.system).toContain('Gin Rummy')
    expect(models.requests[0]?.system).toContain('第 2/3 手；你 12 分，澜音 8 分')
    expect(models.requests[0]?.selection).toEqual({ provider: 'deepseek', model: 'deepseek-chat' })
  })

  it('persists an explicit 记住 request before an unavailable model can fail', async () => {
    const repository = new MemoryRepository()
    const models = new OfflineModels()
    const core = new CompanionCore(repository, models, {
      now: () => 1_780_000_000_000,
      nextId: () => 'memory-offline',
    })

    await core.selectModel({ provider: 'deepseek', model: 'deepseek-chat' })
    await expect(core.chat({ text: '记住：我喜欢慢一点的出牌节奏。' })).rejects.toThrow('模型暂时离线')

    const restarted = new CompanionCore(repository, models)
    expect((await restarted.snapshot()).memories).toEqual([{
      id: 'memory-offline',
      text: '我喜欢慢一点的出牌节奏。',
      createdAt: 1_780_000_000_000,
    }])
  })
})
