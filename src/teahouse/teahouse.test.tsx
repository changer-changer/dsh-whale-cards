import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMatch } from '../game/engine.ts'
import { clearAllTeahouseStorage, loadShellState, loadSlot, saveSlot, slotExists } from './storage.ts'
import type { MemoryEntry } from './lanyin/memory.ts'

const LEGACY_KEY = 'dsh-whale-cards:save:v1'

afterEach(() => {
  cleanup()
  clearAllTeahouseStorage()
})

describe('teahouse storage v2', () => {
  it('migrates a legacy v1 gin-rummy match into the gin-rummy slot once', () => {
    const legacy = {
      version: 1,
      match: createMatch(),
      panelOpen: false,
      preferences: { dialogue: 'lively', difficulty: 'sharp', fastAi: true, muted: true, tutorialSeen: true },
      stats: { handsPlayed: 3, matchesPlayed: 1, matchesWon: 1, rapport: 5 },
    }
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy))

    const first = loadShellState()
    expect(first.preferences.difficulty).toBe('sharp')
    expect(first.stats.matchesWon).toBe(1)
    const migrated = loadSlot('gin-rummy') as { seed: number } | null
    expect(migrated?.seed).toBe(legacy.match.seed)
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()

    localStorage.setItem(LEGACY_KEY, JSON.stringify({ version: 1, match: null, panelOpen: true, preferences: legacy.preferences, stats: legacy.stats }))
    const second = loadShellState()
    expect((loadSlot('gin-rummy') as { seed: number } | null)?.seed).toBe(legacy.match.seed)
    expect(second.shell.lanyinDock).toBe(true)
  })

  it('does not migrate an invalid legacy match but still keeps preferences', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      version: 1,
      match: { version: 1, broken: true },
      panelOpen: false,
      preferences: { dialogue: 'quiet', difficulty: 'relaxed', fastAi: false, muted: false, tutorialSeen: false },
      stats: { handsPlayed: 0, matchesPlayed: 0, matchesWon: 0, rapport: 0 },
    }))
    const state = loadShellState()
    expect(state.preferences.dialogue).toBe('quiet')
    expect(loadSlot('gin-rummy')).toBeNull()
  })

  it('isolates per-game slots', () => {
    saveSlot('gin-rummy', { marker: 'a' })
    saveSlot('harbor-pairs', { marker: 'b' })
    expect(loadSlot('gin-rummy')).toEqual({ marker: 'a' })
    expect(loadSlot('harbor-pairs')).toEqual({ marker: 'b' })
    expect(slotExists('gin-rummy')).toBe(true)
    expect(slotExists('harbor-pairs')).toBe(true)
    expect(slotExists('unknown-game')).toBe(false)
  })

  it('removes empty saves instead of showing a false continue state', () => {
    saveSlot('gin-rummy', { marker: 'started' })
    expect(slotExists('gin-rummy')).toBe(true)
    saveSlot('gin-rummy', null)
    expect(slotExists('gin-rummy')).toBe(false)
  })

  it('degrades to defaults on corrupt shell state', () => {
    localStorage.setItem('dsh-teahouse:shell:v1', '{not json')
    const state = loadShellState()
    expect(state.version).toBe(2)
    expect(state.preferences.difficulty).toBe('steady')
  })
})

describe('lanyin memory store', () => {
  it('adds, updates, removes entries and caps length', async () => {
    const { createMemoryStore } = await import('./lanyin/memory.ts')
    const store = createMemoryStore()
    const entry = store.add('我喜欢喝乌龙')
    expect(entry).not.toBeNull()
    expect(store.list()).toHaveLength(1)

    expect(store.update((entry as MemoryEntry).id, '我喜欢喝龙井')).toBe(true)
    expect(store.list()[0]?.text).toBe('我喜欢喝龙井')

    expect(store.remove((entry as MemoryEntry).id)).toBe(true)
    expect(store.list()).toHaveLength(0)
    expect(store.remove('missing')).toBe(false)
  })

  it('sanitizes empty and oversized text', async () => {
    const { createMemoryStore } = await import('./lanyin/memory.ts')
    const store = createMemoryStore()
    expect(store.add('   ')).toBeNull()
    const long = store.add('x'.repeat(400))
    expect(long?.text.length).toBe(240)
  })
})

describe('remember-request extraction', () => {
  it('detects explicit remember requests in zh and en', async () => {
    const { extractRememberRequest } = await import('./lanyin/memory.ts')
    expect(extractRememberRequest('记住：我喜欢深色主题')).toMatchObject({ toRemember: '我喜欢深色主题' })
    expect(extractRememberRequest('帮我记住这个 周五要发布')).toMatchObject({ toRemember: '周五要发布' })
    expect(extractRememberRequest('remember this: I prefer short replies')).toMatchObject({ toRemember: 'I prefer short replies' })
    expect(extractRememberRequest('今天天气怎么样')).toBeNull()
    expect(extractRememberRequest('记住')).toBeNull()
  })
})

describe('lanyin service degradation', () => {
  it('never throws and falls back to local lines without a caller', async () => {
    const { LanyinService } = await import('./lanyin/service.ts')
    const service = new LanyinService(null)
    expect(service.getSnapshot().modelLive).toBe(false)
    expect(service.getSnapshot().expression).toBe('offline')

    await service.sendChat('你好呀')
    const chat = service.getSnapshot().chat
    expect(chat).toHaveLength(2)
    expect(chat[0]?.role).toBe('user')
    expect(chat[1]?.role).toBe('assistant')
    expect(chat[1]?.text).toContain('模型暂时不在')

    service.remark('human_knock', '玩家敲牌')
    await new Promise((resolve) => setTimeout(resolve, 400))
    const after = service.getSnapshot().chat
    expect(after.length).toBeGreaterThanOrEqual(3)
    expect(after[2]?.role).toBe('assistant')
    service.dispose()
  })

  it('records explicit memory requests even while offline', async () => {
    const { LanyinService } = await import('./lanyin/service.ts')
    const service = new LanyinService(null)
    await service.sendChat('记住：我喜欢乌龙茶')
    expect(service.getSnapshot().memories).toHaveLength(1)
    expect(service.getSnapshot().memories[0]?.text).toBe('我喜欢乌龙茶')
    service.dispose()
  })

  it('keeps memories editable and deletable', async () => {
    const { LanyinService } = await import('./lanyin/service.ts')
    const service = new LanyinService(null)
    service.remember('初版记忆')
    const id = service.getSnapshot().memories[0]?.id
    expect(id).toBeDefined()
    service.updateMemory(id as string, '修改后的记忆')
    expect(service.getSnapshot().memories[0]?.text).toBe('修改后的记忆')
    service.removeMemory(id as string)
    expect(service.getSnapshot().memories).toHaveLength(0)
    service.dispose()
  })
})

describe('lanyin real game Agent controller', () => {
  it('opens one match session, receives a legal decision, then disposes it', async () => {
    const caller = {
      models: vi.fn(async () => ({ ok: true as const, models: [{ provider: 'deepseek', model: 'chat', displayName: 'DeepSeek Chat' }] })),
      chat: vi.fn(async () => ({ ok: true as const, text: '普通聊天' })),
      startAgent: vi.fn(async (request: { sessionId: string }) => ({ ok: true as const, value: { sessionId: request.sessionId } })),
      turnAgent: vi.fn(async () => ({ ok: true as const, value: { actionId: 'play:a', line: '这张牌，我认真出了。', intent: 'ruthless' as const } })),
      chatAgent: vi.fn(async () => ({ ok: true as const, value: { text: '我还在这局里。' } })),
      eventAgent: vi.fn(async () => ({ ok: true as const, value: { text: '任务那边亮灯了。' } })),
      endAgent: vi.fn(async () => ({ ok: true as const, value: {} })),
    }
    const { LanyinService } = await import('./lanyin/service.ts')
    const service = new LanyinService(caller)
    await service.refreshModels()

    expect(await service.beginGameAgent({ gameId: 'test', gameTitle: '测试牌局', rules: '选一张牌。' })).toBe(true)
    expect(service.getSnapshot().agentSessionId).toMatch(/^lanyin-game-/)
    const decision = await service.chooseGameAction({ situation: '轮到你。', legalActions: [{ id: 'play:a', label: '出 A' }] })
    expect(decision?.actionId).toBe('play:a')
    expect(service.getSnapshot().chat.at(-1)?.text).toContain('认真')

    await service.endGameAgent()
    expect(caller.endAgent).toHaveBeenCalledOnce()
    expect(service.getSnapshot().agentSessionId).toBeNull()
  })

  it('offers in-match coaching and mood prompts in the same Agent session', async () => {
    const caller = {
      models: vi.fn(async () => ({ ok: true as const, models: [{ provider: 'deepseek', model: 'chat', displayName: 'DeepSeek Chat' }] })),
      chat: vi.fn(async () => ({ ok: true as const, text: '普通聊天' })),
      startAgent: vi.fn(async (request: { sessionId: string }) => ({ ok: true as const, value: { sessionId: request.sessionId } })),
      turnAgent: vi.fn(async () => ({ ok: true as const, value: { actionId: 'pass', line: '过。', intent: 'fair' as const } })),
      chatAgent: vi.fn(async (_request: { sessionId: string }) => ({ ok: true as const, value: { text: '先看住关键牌。' } })),
      eventAgent: vi.fn(async () => ({ ok: true as const, value: { text: '知道了。' } })),
      endAgent: vi.fn(async () => ({ ok: true as const, value: {} })),
    }
    const { LanyinService } = await import('./lanyin/service.ts')
    const { LanyinDock } = await import('./LanyinDock.tsx')
    const service = new LanyinService(caller)
    await service.refreshModels()
    await service.beginGameAgent({ gameId: 'test', gameTitle: '测试牌局', rules: '选牌或过牌。' })
    render(<LanyinDock lanyin={service} />)

    fireEvent.click(screen.getByRole('button', { name: '教我这一步' }))
    await waitFor(() => { expect(caller.chatAgent).toHaveBeenCalledOnce() })
    expect(caller.chatAgent.mock.calls[0]?.[0].sessionId).toBe(service.getSnapshot().agentSessionId)
    expect(await screen.findByText('先看住关键牌。')).not.toBeNull()
    service.dispose()
  })
})

describe('teahouse quick launcher', () => {
  it('opens the configured default game without visiting the lobby', async () => {
    const { LanyinService } = await import('./lanyin/service.ts')
    const { TeahouseApp } = await import('./TeahouseApp.tsx')
    const service = new LanyinService(null)
    render(<TeahouseApp lanyin={service} />)

    fireEvent.click(screen.getByRole('button', { name: /直接进入默认游戏：鲸牌 Gin Rummy/ }))
    expect(await screen.findByRole('button', { name: '入座开牌' })).not.toBeNull()
    expect(screen.queryByRole('heading', { name: '今晚玩什么' })).toBeNull()
  })
})

describe('game module contract', () => {
  it('every registered game satisfies the GameModule seam', async () => {
    const { ginRummyGame } = await import('../games/gin-rummy/module.tsx')
    const { harborPairsGame } = await import('../games/harbor-pairs/module.tsx')
    const { harborClashGame } = await import('../games/harbor-clash/module.tsx')
    for (const game of [ginRummyGame, harborPairsGame, harborClashGame]) {
      expect(typeof game.manifest.id).toBe('string')
      expect(game.manifest.title.length).toBeGreaterThan(0)
      expect(game.manifest.why.length).toBeGreaterThan(0)
      expect(['light', 'medium', 'heavy']).toContain(game.manifest.intensity)
      expect(typeof game.hasSave).toBe('function')
      expect(typeof game.clearSave).toBe('function')
      expect(game.View).toBeTypeOf('function')
    }
  })
})

describe('persona prompt assembly', () => {
  it('injects memories and situation into the system prompt', async () => {
    const { buildSystemPrompt } = await import('./lanyin/persona.ts')
    const prompt = buildSystemPrompt({
      memories: [{ id: 'm1', text: '用户喜欢乌龙茶', createdAt: 0 }],
      situation: '玩家刚敲牌',
    })
    expect(prompt).toContain('澜音')
    expect(prompt).toContain('用户喜欢乌龙茶')
    expect(prompt).toContain('玩家刚敲牌')
  })
})

describe('lanyin expressions', () => {
  it('keeps match outcomes emotionally consistent across every game', async () => {
    const { expressionForEvent } = await import('./lanyin/persona.ts')
    expect(expressionForEvent('match_win')).toBe('happy')
    expect(expressionForEvent('match_loss')).toBe('proud')
  })
})
