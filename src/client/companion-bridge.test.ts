import { describe, expect, it, vi } from 'vitest'
import type { CompanionSnapshot } from '../companion/core.ts'
import { mountCompanionBridge } from './companion-bridge.ts'

const state: CompanionSnapshot = {
  identity: {
    name: '澜音',
    role: '鲸牌茶歇的深海鲸牌友',
    tone: '温和、机敏、有一点胜负心',
  },
  selectedModel: null,
  memories: [],
  conversationCount: 0,
}

describe('companion Client bridge', () => {
  it('mounts the strict contribution and exposes ordinary CompanionPort promises', async () => {
    const dispose = vi.fn(async () => undefined)
    const snapshot = vi.fn(async () => ({ ok: true as const, value: state }))
    const remote = {
      $mount: vi.fn(async () => dispose),
      whaleCompanion: {
        snapshot,
        listModels: vi.fn(async () => ({ ok: true as const, value: { providers: [], warnings: [] } })),
        selectModel: vi.fn(async () => ({ ok: true as const, value: state })),
        remember: vi.fn(async () => ({ ok: true as const, value: state })),
        forget: vi.fn(async () => ({ ok: true as const, value: state })),
        chat: vi.fn(async () => ({
          ok: false as const,
          error: { code: 'internal', message: '模型暂时离线', details: {} },
        })),
      },
    }

    const bridge = await mountCompanionBridge(remote)

    await expect(bridge.port.snapshot()).resolves.toEqual(state)
    await expect(bridge.port.chat({ text: '在吗？' })).rejects.toThrow('模型暂时离线')
    expect(remote.$mount).toHaveBeenCalledTimes(1)
    await bridge.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
