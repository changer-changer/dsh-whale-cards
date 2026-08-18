import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { DshCompanionModelGateway } from './model-gateway.ts'

describe('DshCompanionModelGateway', () => {
  it('lists each live DSH provider while isolating one provider catalog failure', async () => {
    const llm = {
      listProviders: () => [
        { id: 'deepseek', name: 'DeepSeek' },
        { id: 'offline', name: 'Offline provider' },
      ],
      async listModels(provider: string) {
        if (provider === 'offline') throw new Error('endpoint unavailable')
        return [{
          provider,
          id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          description: 'Balanced chat model',
        }]
      },
      stream: () => {
        throw new Error('not used by this test')
      },
    }

    const catalog = await new DshCompanionModelGateway(llm).listModels()

    expect(catalog).toEqual({
      providers: [{
        id: 'deepseek',
        name: 'DeepSeek',
        models: [{
          id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          description: 'Balanced chat model',
        }],
      }],
      warnings: ['Offline provider：endpoint unavailable'],
    })
  })

  it('completes through the Host stream with a fixed system slot and no tools', async () => {
    let streamed: Record<string, unknown> | undefined
    const llm = {
      listProviders: () => [],
      async listModels() {
        return []
      },
      async *stream(options: unknown): AsyncGenerator<StreamChunk> {
        streamed = options as Record<string, unknown>
        yield { type: 'text-delta', index: 0, text: '慢慢来，' }
        yield { type: 'text-delta', index: 0, text: '这手还有机会。' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    }
    const gateway = new DshCompanionModelGateway(llm)

    const answer = await gateway.complete({
      selection: { provider: 'deepseek', model: 'deepseek-chat' },
      system: '你是澜音。',
      messages: [
        { role: 'assistant', text: '上一手差一点。' },
        { role: 'user', text: '这一手呢？' },
      ],
      maxTokens: 240,
    })

    expect(answer).toBe('慢慢来，这手还有机会。')
    expect(streamed).toMatchObject({
      provider: 'deepseek',
      model: 'deepseek-chat',
      system: '你是澜音。',
      tools: [],
      maxTokens: 240,
    })
    expect(streamed?.messages).toMatchObject([
      { role: 'assistant', content: [{ type: 'text', text: '上一手差一点。' }] },
      { role: 'user', content: [{ type: 'text', text: '这一手呢？' }] },
    ])
  })
})
