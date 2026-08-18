import { describe, expect, it } from 'vitest'
import { companionRecordSchema } from '../companion/schema.ts'

describe('companion storage schema', () => {
  it('rejects unexpected durable fields instead of silently retaining private data', () => {
    const parsed = companionRecordSchema.safeParse({
      version: 1,
      selectedModel: null,
      memories: [],
      conversation: [],
      taskTranscript: 'secret source code',
    })

    expect(parsed.success).toBe(false)
  })
})
