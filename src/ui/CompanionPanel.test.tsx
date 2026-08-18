import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CompanionModelCatalog, CompanionSnapshot } from '../companion/core.ts'
import { CompanionPanel } from './CompanionPanel.tsx'

afterEach(cleanup)

const snapshot: CompanionSnapshot = {
  identity: {
    name: '澜音',
    role: '鲸牌茶歇的深海鲸牌友',
    tone: '温和、机敏、有一点胜负心',
  },
  selectedModel: { provider: 'deepseek', model: 'deepseek-chat' },
  memories: [{ id: 'memory-1', text: '我喜欢慢一点的出牌节奏。', createdAt: 1_780_000_000_000 }],
  conversationCount: 2,
}

const catalog: CompanionModelCatalog = {
  providers: [{
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
  }],
  warnings: [],
}

describe('CompanionPanel', () => {
  it('makes the independent model and every durable memory visible and controllable', () => {
    const selectModel = vi.fn()
    const forget = vi.fn()
    const view = render(
      <CompanionPanel
        open
        snapshot={snapshot}
        catalog={catalog}
        messages={[]}
        busy={false}
        error={null}
        onClose={vi.fn()}
        onSelectModel={selectModel}
        onSend={vi.fn()}
        onRemember={vi.fn()}
        onForget={forget}
      />,
    )

    expect(view.getByText('AI 牌友，不冒充真人')).toBeTruthy()
    const model = view.getByRole('combobox', { name: '澜音使用的 DSH 模型' })
    expect((model as HTMLSelectElement).value).toBe('deepseek\u0000deepseek-chat')
    fireEvent.change(model, { target: { value: 'deepseek\u0000deepseek-reasoner' } })
    expect(selectModel).toHaveBeenCalledWith({ provider: 'deepseek', model: 'deepseek-reasoner' })

    const memoryRegion = view.getByRole('region', { name: '澜音的本机长期记忆' })
    expect(memoryRegion.textContent).toContain('我喜欢慢一点的出牌节奏。')
    fireEvent.click(within(memoryRegion).getByRole('button', { name: '忘记：我喜欢慢一点的出牌节奏。' }))
    expect(forget).toHaveBeenCalledWith('memory-1')
  })

  it('supports free conversation and an explicit visible memory write', () => {
    const send = vi.fn()
    const remember = vi.fn()
    const view = render(
      <CompanionPanel
        open
        snapshot={snapshot}
        catalog={catalog}
        messages={[{ id: 'reply-1', role: 'assistant', text: '这张明牌，你拿得很果断。' }]}
        busy={false}
        error={null}
        onClose={vi.fn()}
        onSelectModel={vi.fn()}
        onSend={send}
        onRemember={remember}
        onForget={vi.fn()}
      />,
    )

    expect(view.getByText('这张明牌，你拿得很果断。')).toBeTruthy()
    fireEvent.change(view.getByRole('textbox', { name: '给澜音发消息' }), {
      target: { value: '你觉得我在等什么牌？' },
    })
    fireEvent.click(view.getByRole('button', { name: '发送给澜音' }))
    expect(send).toHaveBeenCalledWith('你觉得我在等什么牌？')

    fireEvent.change(view.getByRole('textbox', { name: '新增长期记忆' }), {
      target: { value: '我喜欢乌龙茶。' },
    })
    fireEvent.click(view.getByRole('button', { name: '让澜音记住' }))
    expect(remember).toHaveBeenCalledWith('我喜欢乌龙茶。')
  })
})
