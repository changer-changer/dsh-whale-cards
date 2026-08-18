import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  CompanionChatReply,
  CompanionChatRequest,
  CompanionModelCatalog,
  CompanionPort,
  CompanionSnapshot,
} from '../companion/core.ts'
import { createMatch } from '../game/engine.ts'
import { card } from '../game/test-helpers.ts'
import type { TaskListSource, TaskListSnapshot } from './task-status.ts'
import { useCompanion } from './useCompanion.ts'

const baseSnapshot: CompanionSnapshot = {
  identity: {
    name: '澜音',
    role: '鲸牌茶歇的深海鲸牌友',
    tone: '温和、机敏、有一点胜负心',
  },
  selectedModel: { provider: 'deepseek', model: 'deepseek-chat' },
  memories: [],
  conversationCount: 0,
}

const catalog: CompanionModelCatalog = {
  providers: [{ id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] }],
  warnings: [],
}

function source(snapshot: TaskListSnapshot): TaskListSource {
  return { getSnapshot: () => snapshot, subscribe: () => () => undefined }
}

describe('useCompanion', () => {
  it('sends only task titles/status and public game evidence to the independent companion', async () => {
    const requests: CompanionChatRequest[] = []
    const port: CompanionPort = {
      snapshot: vi.fn(async () => baseSnapshot),
      listModels: vi.fn(async () => catalog),
      selectModel: vi.fn(async () => baseSnapshot),
      remember: vi.fn(async () => baseSnapshot),
      forget: vi.fn(async () => baseSnapshot),
      chat: vi.fn(async (request: CompanionChatRequest): Promise<CompanionChatReply> => {
        requests.push(structuredClone(request))
        return { text: '你已经看见我的牌路了。', mood: 'pleased', state: baseSnapshot }
      }),
    }
    const taskSource = source({
      current: 'task-current',
      byId: {
        'task-current': {
          displayTitle: '重构搜索索引',
          title: '不会优先使用的旧标题',
          running: true,
          // The structural source may carry other data at runtime; the projection
          // below must never forward it to the companion contract.
          transcript: 'secret task body',
        } as TaskListSnapshot['byId'][string] & { transcript: string },
        waiting: { displayTitle: '等待确认', pendingInteraction: { type: 'approval' } },
        finished: { displayTitle: '写完测试', completed: true },
      },
    })
    const base = createMatch(20260818)
    const match = {
      ...base,
      history: [
        ...base.history,
        { at: 2, player: 'lanyin' as const, type: 'take_discard' as const, card: card('7h') },
      ],
    }

    const { result } = renderHook(() => useCompanion(port, taskSource, match))
    await waitFor(() => expect(result.current.snapshot?.identity.name).toBe('澜音'))
    await act(async () => result.current.send('你刚才为什么拿那张牌？'))

    expect(requests).toHaveLength(1)
    expect(requests[0]?.task).toEqual({
      currentTitle: '重构搜索索引',
      running: 1,
      needsInput: 1,
      completed: 1,
    })
    expect(requests[0]?.game?.publicSignal).toContain('拿过一张明牌')
    expect(JSON.stringify(requests[0])).not.toContain('secret task body')
    expect(result.current.messages.map((message) => message.text)).toEqual([
      '你刚才为什么拿那张牌？',
      '你已经看见我的牌路了。',
    ])
    expect(result.current.mood).toBe('pleased')
  })
})
