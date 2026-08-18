import { describe, expect, it } from 'vitest'
import type { CompanionRecord } from '../companion/core.ts'
import { StorageDomainCompanionRepository } from './repository.ts'

describe('StorageDomainCompanionRepository', () => {
  it('restores the one durable companion record after the Host service restarts', async () => {
    const records = new Map<string, CompanionRecord>()
    const table = {
      get: (key: string) => records.get(key),
      put: async (key: string, value: CompanionRecord) => {
        records.set(key, structuredClone(value))
      },
    }
    const record: CompanionRecord = {
      version: 1,
      selectedModel: { provider: 'deepseek', model: 'deepseek-chat' },
      memories: [{ id: 'memory-1', text: '我喜欢乌龙茶。', createdAt: 1_780_000_000_000 }],
      conversation: [],
    }

    await new StorageDomainCompanionRepository(table).save(record)
    const restarted = new StorageDomainCompanionRepository(table)

    expect(await restarted.load()).toEqual(record)
  })
})
