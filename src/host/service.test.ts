import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import type { CompanionRecord } from '../companion/core.ts'
import { WhaleCompanionService } from './service.ts'

describe('WhaleCompanionService', () => {
  it('opens its private storage domain and restores companion state after a service restart', async () => {
    const records = new Map<string, CompanionRecord>()
    const close = vi.fn(async () => undefined)
    const open = vi.fn(async (_spec: unknown) => ({
      table: () => ({
        get: (key: string) => records.get(key),
        put: async (key: string, value: CompanionRecord) => {
          records.set(key, structuredClone(value))
        },
      }),
      close,
    }))
    const ctx = new Context()
    ctx.provide('storageDomain', { open } as never)
    ctx.provide('llm', {
      listProviders: () => [{ id: 'deepseek', name: 'DeepSeek' }],
      listModels: async (provider: string) => [{
        provider,
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
      }],
      async *stream() {
        yield { type: 'text-delta', index: 0, text: '在呢。' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    } as never)

    const first = ctx.plugin(WhaleCompanionService)
    await first
    await ctx.whaleCompanion.selectModel({ provider: 'deepseek', model: 'deepseek-chat' })
    await ctx.whaleCompanion.remember({ text: '我喜欢在长任务间喝乌龙茶。' })
    await first.dispose()

    const restarted = ctx.plugin(WhaleCompanionService)
    await restarted
    const state = await ctx.whaleCompanion.snapshot()

    expect(state.selectedModel).toEqual({ provider: 'deepseek', model: 'deepseek-chat' })
    expect(state.memories.map((memory) => memory.text)).toEqual(['我喜欢在长任务间喝乌龙茶。'])
    expect(open.mock.calls[0]?.[0]).toMatchObject({
      name: 'dsh_whale_cards',
      version: 1,
      tables: { companions: expect.any(Object) },
    })
    await restarted.dispose()
    await ctx.fiber.dispose()
    expect(close).toHaveBeenCalledTimes(2)
  })
})
