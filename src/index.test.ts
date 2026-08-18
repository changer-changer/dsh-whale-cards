import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { WhaleCompanionService } from './host/service.ts'
import plugin from './index.ts'

describe('host plugin', () => {
  it('mounts the Host companion service behind its required rc.7 services', async () => {
    const ctx = new Context()
    ctx.provide('llm', {} as never)
    ctx.provide('storageDomain', {
      open: async () => ({
        table: () => ({ get: () => undefined, put: async () => undefined }),
        close: async () => undefined,
      }),
    } as never)

    const fiber = ctx.plugin(plugin)
    await fiber

    expect(plugin).toBe(WhaleCompanionService)
    expect(plugin.inject).toEqual(['llm', 'storageDomain'])
    expect(ctx.whaleCompanion).toBeInstanceOf(WhaleCompanionService)
    await expect(ctx.whaleCompanion.snapshot()).resolves.toMatchObject({
      identity: { name: '澜音' },
      memories: [],
    })
    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})
