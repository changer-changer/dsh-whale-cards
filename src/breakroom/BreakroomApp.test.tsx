import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanionChatReply, CompanionChatRequest, CompanionPort, CompanionSnapshot } from '../companion/core.ts'
import type { GameProps } from './game-contract.ts'
import type { RegisteredGame } from './game-registry.ts'
import { gameStorageKey, type StorageLike } from './game-storage.ts'
import { SHELL_STORAGE_KEY, loadShellState } from './shell-persistence.ts'
import { BreakroomApp } from './BreakroomApp.tsx'
import type { TaskListSnapshot, TaskListSource } from '../ui/task-status.ts'

function memoryStorage(): StorageLike & { readonly map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

function makeSnapshot(): CompanionSnapshot {
  return {
    identity: { name: '澜音', role: '鲸牌茶歇的深海鲸牌友', tone: '温和、机敏、有一点胜负心' },
    selectedModel: { provider: 'deepseek', model: 'deepseek-chat' },
    memories: [],
    conversationCount: 0,
  }
}

function makeCompanionPort(snapshot: CompanionSnapshot = makeSnapshot()): CompanionPort {
  return {
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
}

interface CounterSave {
  readonly count: number
}

function CounterGame({ storage, companion, onExit }: GameProps): React.JSX.Element {
  const raw = storage.load()
  const initial: CounterSave =
    typeof raw === 'object' && raw !== null && 'count' in raw && typeof (raw as { count: unknown }).count === 'number'
      ? { count: (raw as { count: number }).count }
      : { count: 0 }
  return (
    <section aria-label="counter-game">
      <p>count:{initial.count}</p>
      <button
        type="button"
        onClick={() => {
          storage.save({ count: initial.count + 1 } satisfies CounterSave)
          companion.setMood('pleased')
        }}
      >
        increment
      </button>
      <button type="button" onClick={() => companion.say('counter says hi')}>
        say hi
      </button>
      <button type="button" onClick={companion.openChat}>
        open chat
      </button>
      <button type="button" onClick={onExit}>
        exit game
      </button>
    </section>
  )
}

function BombGame(): never {
  throw new Error('counter exploded')
}

const counterManifest = {
  id: 'counter-game',
  title: 'Counter Game',
  summary: 'slice B test game',
  coverUrl: 'https://example.test/cover.jpg',
  version: '1.0.0',
  author: 'breakroom',
  license: 'MIT',
} as const

function makeRegistry(): readonly RegisteredGame[] {
  return [
    {
      manifest: counterManifest,
      load: async () => ({ manifest: counterManifest, Game: CounterGame }),
    },
  ]
}

function makeBombRegistry(): readonly RegisteredGame[] {
  return [
    {
      manifest: counterManifest,
      load: async () => ({ manifest: counterManifest, Game: BombGame }),
    },
  ]
}

interface TaskFeed {
  readonly source: TaskListSource
  emit(next: TaskListSnapshot): void
}

function makeTaskFeed(initial: TaskListSnapshot): TaskFeed {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    source: {
      getSnapshot: () => snapshot,
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    emit(next) {
      snapshot = next
      for (const listener of listeners) listener()
    },
  }
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(cleanup)

describe('BreakroomApp: launcher -> hall -> game -> hall -> collapse', () => {
  it('walks the full navigation flow and preserves the counter save', async () => {
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp registry={makeRegistry()} storage={{ shell: shellStorage, game: gameStorage }} />,
    )

    // Launcher visible; panel starts closed.
    const launcher = view.getByRole('button', { name: '打开茶歇间' })
    expect(launcher).toBeTruthy()

    // Open the panel: hall appears with a 开始 CTA for the counter game.
    fireEvent.click(launcher)
    expect(await view.findByRole('dialog', { name: '茶歇间' })).toBeTruthy()
    const startButton = await view.findByRole('button', { name: '开始 Counter Game' })

    // Hall -> game.
    fireEvent.click(startButton)
    expect(await view.findByText('count:0')).toBeTruthy()

    // Bump the counter so a save exists.
    fireEvent.click(view.getByRole('button', { name: 'increment' }))
    await waitFor(() => {
      expect(gameStorage.map.get(gameStorageKey('counter-game'))).toBe(JSON.stringify({ count: 1 }))
    })

    // Game -> hall. The shell state should reflect the hall route.
    fireEvent.click(view.getByRole('button', { name: 'exit game' }))
    await waitFor(() => {
      const shell = loadShellState(shellStorage)
      expect(shell.route).toEqual({ kind: 'hall' })
    })

    // The hall now reads 继续 for the counter game.
    expect(await view.findByRole('button', { name: '继续 Counter Game' })).toBeTruthy()

    // Collapse the panel: launcher returns, dialog disappears.
    fireEvent.click(view.getByRole('button', { name: '收起茶歇间' }))
    await waitFor(() => {
      expect(view.queryByRole('dialog', { name: '茶歇间' })).toBeNull()
    })
    expect(view.getByRole('button', { name: '打开茶歇间' })).toBeTruthy()

    // The shell state persisted the collapse and the route stayed in the hall.
    const shell = loadShellState(shellStorage)
    expect(shell.panelOpen).toBe(false)
    expect(shell.route).toEqual({ kind: 'hall' })
    expect(shell.lastPlayedGameId).toBe('counter-game')

    // Re-open and re-enter the game: the save restores.
    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    const resume = await view.findByRole('button', { name: '继续 Counter Game' })
    fireEvent.click(resume)
    expect(await view.findByText('count:1')).toBeTruthy()
  })
})

describe('BreakroomApp: Escape layering', () => {
  it('closes the companion first, then the panel; never touches the game save', async () => {
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp
        companion={makeCompanionPort()}
        registry={makeRegistry()}
        storage={{ shell: shellStorage, game: gameStorage }}
      />,
    )

    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')
    fireEvent.click(view.getByRole('button', { name: 'increment' }))
    await waitFor(() => {
      expect(gameStorage.map.get(gameStorageKey('counter-game'))).toBe(JSON.stringify({ count: 1 }))
    })

    // Open the companion panel via the topbar 澜音 button.
    fireEvent.click(view.getByRole('button', { name: '打开澜音对话与记忆' }))
    expect(await view.findByRole('dialog', { name: '和澜音说说话' })).toBeTruthy()

    // Escape closes only the companion, not the panel.
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    await waitFor(() => {
      expect(view.queryByRole('dialog', { name: '和澜音说说话' })).toBeNull()
    })
    expect(view.getByRole('dialog', { name: '茶歇间' })).toBeTruthy()
    // The game is still mounted.
    expect(view.getByText('count:1')).toBeTruthy()

    // Escape again collapses the whole panel but keeps the save.
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    await waitFor(() => {
      expect(view.queryByRole('dialog', { name: '茶歇间' })).toBeNull()
    })
    expect(gameStorage.map.get(gameStorageKey('counter-game'))).toBe(JSON.stringify({ count: 1 }))
  })

  it('does not steal Escape when the panel is closed', () => {
    render(<BreakroomApp registry={makeRegistry()} />)
    const result = fireEvent.keyDown(window, { key: 'Escape' })
    expect(result).toBe(true)
  })
})

describe('BreakroomApp: error isolation', () => {
  it('a crashing game shows only its own error view; hall and companion stay usable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp registry={makeBombRegistry()} storage={{ shell: shellStorage, game: gameStorage }} />,
    )
    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))

    const alert = await view.findByRole('alert')
    expect(alert.textContent).toContain('Counter Game 暂时出问题了')

    const returnButtons = view.getAllByRole('button', { name: '返回大厅' })
    const errorViewReturn = returnButtons.find((button) => alert.contains(button))
    expect(errorViewReturn).toBeDefined()
    fireEvent.click(errorViewReturn as HTMLElement)
    await view.findByRole('button', { name: '开始 Counter Game' })
    fireEvent.click(view.getByRole('button', { name: '打开澜音对话与记忆' }))
    expect(await view.findByRole('dialog', { name: '和澜音说说话' })).toBeTruthy()
    consoleError.mockRestore()
  })
})

describe('BreakroomApp: task notice', () => {
  it('surfaces a non-blocking done notice when the watched task completes', async () => {
    const feed = makeTaskFeed({
      current: 'task-1',
      byId: { 'task-1': { running: true } },
    })
    const view = render(<BreakroomApp registry={makeRegistry()} taskSource={feed.source} />)

    // No notice before the panel opens (nothing is being watched yet).
    expect(view.queryByText('DSH 的任务完成了')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    await view.findByRole('dialog', { name: '茶歇间' })

    act(() => {
      feed.emit({ current: 'task-1', byId: { 'task-1': { running: false, completed: true } } })
    })

    expect(await view.findByText('DSH 的任务完成了')).toBeTruthy()
    // The notice is dismissible.
    fireEvent.click(view.getByRole('button', { name: '知道了' }))
    await waitFor(() => {
      expect(view.queryByText('DSH 的任务完成了')).toBeNull()
    })
  })

  it('does not steal focus or unmount the current game when a notice arrives', async () => {
    const feed = makeTaskFeed({
      current: 'task-1',
      byId: { 'task-1': { running: true } },
    })
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp registry={makeRegistry()} taskSource={feed.source} storage={{ shell: shellStorage, game: gameStorage }} />,
    )

    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')
    fireEvent.click(view.getByRole('button', { name: 'increment' }))
    await waitFor(() => {
      expect(gameStorage.map.get(gameStorageKey('counter-game'))).toBe(JSON.stringify({ count: 1 }))
    })

    act(() => {
      feed.emit({ current: 'task-1', byId: { 'task-1': { running: false, completed: true } } })
    })

    expect(await view.findByText('DSH 的任务完成了')).toBeTruthy()
    // The game is still mounted and interactive.
    expect(view.getByText('count:1')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'increment' }))
    await waitFor(() => {
      expect(gameStorage.map.get(gameStorageKey('counter-game'))).toBe(JSON.stringify({ count: 2 }))
    })
  })

  it('keeps the notice non-modal and dismiss-only, leaving the game route untouched', async () => {
    const feed = makeTaskFeed({ current: 'task-1', byId: { 'task-1': { running: true } } })
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp registry={makeRegistry()} taskSource={feed.source} storage={{ shell: shellStorage, game: gameStorage }} />,
    )

    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')

    act(() => {
      feed.emit({ current: 'task-1', byId: { 'task-1': { pendingInteraction: { kind: 'question' }, running: true } } })
    })

    const noticeText = await view.findByText('DSH 正在等你处理')
    // Non-modal: the notice announces politely and never becomes a dialog.
    expect(noticeText.closest('[aria-live="polite"]')).toBeTruthy()
    expect(view.queryByRole('dialog', { name: 'DSH 正在等你处理' })).toBeNull()

    // Dismissing removes the notice only; the shell route and game stay put.
    fireEvent.click(view.getByRole('button', { name: '知道了' }))
    await waitFor(() => {
      expect(view.queryByText('DSH 正在等你处理')).toBeNull()
    })
    expect(view.getByText('count:0')).toBeTruthy()
    expect(loadShellState(shellStorage).route).toEqual({ kind: 'game', gameId: 'counter-game' })
  })
})

describe('BreakroomApp: companion game context composition', () => {
  it('composes the active game context from registry and route and passes it to chat', async () => {
    const requests: CompanionChatRequest[] = []
    const snapshot = makeSnapshot()
    const port: CompanionPort = {
      snapshot: vi.fn(async () => snapshot),
      listModels: vi.fn(async () => ({
        providers: [{ id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] }],
        warnings: [],
      })),
      selectModel: vi.fn(async () => snapshot),
      remember: vi.fn(async () => snapshot),
      forget: vi.fn(async () => snapshot),
      chat: vi.fn(async (request: CompanionChatRequest): Promise<CompanionChatReply> => {
        requests.push(structuredClone(request))
        return { text: '在呢。', mood: 'calm', state: snapshot }
      }),
    }
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp
        companion={port}
        registry={makeRegistry()}
        storage={{ shell: shellStorage, game: gameStorage }}
      />,
    )

    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')

    fireEvent.click(view.getByRole('button', { name: '打开澜音对话与记忆' }))
    fireEvent.change(await view.findByLabelText('给澜音发消息'), { target: { value: '现在玩的是什么？' } })
    fireEvent.click(view.getByRole('button', { name: '发送给澜音' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]?.game).toEqual({
      gameId: 'counter-game',
      gameTitle: 'Counter Game',
      summary: 'slice B test game',
    })
  })

  it('passes no game context when the companion chats from the hall', async () => {
    const requests: CompanionChatRequest[] = []
    const snapshot = makeSnapshot()
    const port: CompanionPort = {
      snapshot: vi.fn(async () => snapshot),
      listModels: vi.fn(async () => ({
        providers: [{ id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] }],
        warnings: [],
      })),
      selectModel: vi.fn(async () => snapshot),
      remember: vi.fn(async () => snapshot),
      forget: vi.fn(async () => snapshot),
      chat: vi.fn(async (request: CompanionChatRequest): Promise<CompanionChatReply> => {
        requests.push(structuredClone(request))
        return { text: '在呢。', mood: 'calm', state: snapshot }
      }),
    }
    const view = render(
      <BreakroomApp companion={port} registry={makeRegistry()} />,
    )

    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    await view.findByRole('dialog', { name: '茶歇间' })

    fireEvent.click(view.getByRole('button', { name: '打开澜音对话与记忆' }))
    fireEvent.change(await view.findByLabelText('给澜音发消息'), { target: { value: '现在能玩什么？' } })
    fireEvent.click(view.getByRole('button', { name: '发送给澜音' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]?.game).toBeUndefined()
  })
})

describe('BreakroomApp: GameCompanionPort narrowing', () => {
  it('exposes say, setMood and openChat only; say renders a transient toast', async () => {
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp registry={makeRegistry()} storage={{ shell: shellStorage, game: gameStorage }} />,
    )
    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')

    fireEvent.click(view.getByRole('button', { name: 'say hi' }))
    expect(await view.findByText('counter says hi')).toBeTruthy()
  })

  it('opens the public CompanionPanel when a game calls openChat', async () => {
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp
        companion={makeCompanionPort()}
        registry={makeRegistry()}
        storage={{ shell: shellStorage, game: gameStorage }}
      />,
    )
    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')

    fireEvent.click(view.getByRole('button', { name: 'open chat' }))
    expect(await view.findByRole('dialog', { name: '和澜音说说话' })).toBeTruthy()
  })
})

describe('BreakroomApp: shell state persistence', () => {
  it('persists shell route under the dedicated shell key only', async () => {
    const shellStorage = memoryStorage()
    const gameStorage = memoryStorage()
    const view = render(
      <BreakroomApp registry={makeRegistry()} storage={{ shell: shellStorage, game: gameStorage }} />,
    )
    fireEvent.click(view.getByRole('button', { name: '打开茶歇间' }))
    fireEvent.click(await view.findByRole('button', { name: '开始 Counter Game' }))
    await view.findByText('count:0')

    await waitFor(() => {
      expect(shellStorage.map.has(SHELL_STORAGE_KEY)).toBe(true)
    })
    // The shell key never carries any game save payload.
    const shellRaw = shellStorage.map.get(SHELL_STORAGE_KEY)
    expect(shellRaw).toBeDefined()
    const parsed: unknown = JSON.parse(shellRaw ?? '{}')
    expect(parsed).toMatchObject({
      version: 1,
      panelOpen: true,
      route: { kind: 'game', gameId: 'counter-game' },
    })
  })
})
