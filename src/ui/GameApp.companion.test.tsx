import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanionChatReply, CompanionPort, CompanionSnapshot } from '../companion/core.ts'
import { GameApp } from './GameApp.tsx'

const snapshot: CompanionSnapshot = {
  identity: {
    name: '澜音',
    role: '鲸牌茶歇的深海鲸牌友',
    tone: '温和、机敏、有一点胜负心',
  },
  selectedModel: { provider: 'deepseek', model: 'deepseek-chat' },
  memories: [],
  conversationCount: 0,
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('GameApp companion entry', () => {
  it('opens the independent DSH model and memory panel from the table shell', async () => {
    const port: CompanionPort = {
      snapshot: vi.fn(async () => snapshot),
      listModels: vi.fn(async () => ({
        providers: [{ id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] }],
        warnings: [],
      })),
      selectModel: vi.fn(async () => snapshot),
      remember: vi.fn(async () => snapshot),
      forget: vi.fn(async () => snapshot),
      chat: vi.fn(async (): Promise<CompanionChatReply> => ({ text: '在呢。', mood: 'calm', state: snapshot })),
    }
    const view = render(<GameApp initiallyOpen companion={port} />)

    fireEvent.click(view.getByRole('button', { name: '打开澜音对话与记忆' }))

    expect(await view.findByRole('dialog', { name: '和澜音说说话' })).toBeTruthy()
    await waitFor(() => expect(port.snapshot).toHaveBeenCalledTimes(1))
    expect(view.getByRole('combobox', { name: '澜音使用的 DSH 模型' })).toBeTruthy()
  })
})
