import { act, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CompanionPort, CompanionSnapshot } from '../companion/core.ts'
import type { TaskListSource } from '../ui/task-status.ts'
import {
  apply,
  HOST_ID,
  inject,
  MOUNT_ID,
  projectTaskListSnapshot,
  type ClientCleanup,
  type MountOptions,
} from './index.tsx'

let renderedCompanion: CompanionPort | undefined

vi.mock('../breakroom/BreakroomApp.tsx', () => ({
  BreakroomApp: ({ companion, initiallyOpen, preview, taskSource }: MountOptions): ReactNode => {
    renderedCompanion = companion
    return (
      <div
        data-current-task={taskSource?.getSnapshot().current ?? ''}
        data-initially-open={String(initiallyOpen)}
        data-preview={String(preview)}
data-testid="breakroom-app"
      />
    )
  },
}))

const COMPANION_STATE: CompanionSnapshot = {
  identity: {
    name: '澜音',
    role: '鲸牌茶歇的深海鲸牌友',
    tone: '温和、机敏、有一点胜负心',
  },
  selectedModel: null,
  memories: [],
  conversationCount: 0,
}

interface TestHarness {
  readonly cleanups: ClientCleanup[]
  readonly context: Parameters<typeof apply>[0]
  readonly labels: string[]
}

function createHarness(): TestHarness {
  const cleanups: ClientCleanup[] = []
  const labels: string[] = []
  const taskSource: TaskListSource = {
    getSnapshot: () => ({
      byId: { 'task-1': { running: true } },
      current: 'task-1',
    }),
    subscribe: () => () => undefined,
  }

  let nestedRemoteInjected = false
  let context: Parameters<typeof apply>[0]
  const whaleCompanion = {
    snapshot: vi.fn(async () => ({ ok: true as const, value: COMPANION_STATE })),
    listModels: vi.fn(async () => ({ ok: true as const, value: { providers: [], warnings: [] } })),
    selectModel: vi.fn(async () => ({ ok: true as const, value: COMPANION_STATE })),
    remember: vi.fn(async () => ({ ok: true as const, value: COMPANION_STATE })),
    forget: vi.fn(async () => ({ ok: true as const, value: COMPANION_STATE })),
    chat: vi.fn(async () => ({ ok: true as const, value: { reply: '在呢。', snapshot: COMPANION_STATE } })),
  }

  context = {
    effect(setup: () => void | ClientCleanup, label?: string) {
      const cleanup = setup()
      if (cleanup !== undefined) cleanups.push(cleanup)
      if (label !== undefined) labels.push(label)
    },
    inject(deps: string[], callback: (ctx: Parameters<typeof apply>[0]) => void) {
      expect(deps).toEqual(['remote.whaleCompanion'])
      nestedRemoteInjected = true
      try {
        callback(context)
      } finally {
        nestedRemoteInjected = false
      }
      return Object.assign(Promise.resolve(), {
        dispose: vi.fn(async () => undefined),
      })
    },
    sessions: {
      list: taskSource,
    },
    remote: {
      $mount: async () => async () => undefined,
      get whaleCompanion() {
        if (!nestedRemoteInjected) {
          throw new Error('cannot get property "remote.whaleCompanion" without inject')
        }
        return whaleCompanion
      },
    },
  } as unknown as Parameters<typeof apply>[0]

  return { cleanups, context, labels }
}

afterEach(() => {
  renderedCompanion = undefined
  document.body.replaceChildren()
})

describe('client plugin lifecycle', () => {
  it('declares the sessions, connection, and strict Remote service dependencies', () => {
    expect(inject).toEqual(['sessions', 'connection', 'remote'])
  })

  it('projects only public task status fields and never task body or source code', () => {
    const projected = projectTaskListSnapshot({
      current: 'task-1',
      byId: {
        'task-1': {
          displayTitle: '修复牌桌交互',
          running: true,
          pendingInteraction: 'question',
          completed: false,
          prompt: 'private task body',
          cwd: '/private/project',
          sourceCode: 'const secret = true',
        },
      },
    })

    expect(projected).toEqual({
      current: 'task-1',
      byId: {
        'task-1': {
          displayTitle: '修复牌桌交互',
          running: true,
          pendingInteraction: 'question',
          completed: false,
        },
      },
    })
  })

  it('mounts GameApp in a shadow root and removes it on cleanup', async () => {
    const harness = createHarness()

    await act(async () => {
      apply(harness.context)
      await Promise.resolve()
    })

    const host = document.getElementById(HOST_ID)
    const mount = host?.shadowRoot?.getElementById(MOUNT_ID)
    const boundaryStyles = host?.shadowRoot?.querySelector('style')
    const app = mount?.querySelector<HTMLElement>('[data-testid="breakroom-app"]')
    expect(host?.getAttribute('data-plugin')).toBe('dsh-whale-cards')
    expect(host?.shadowRoot).not.toBeNull()
    expect(app?.dataset.currentTask).toBe('task-1')
    expect(renderedCompanion).toBeDefined()
    expect(app?.dataset.initiallyOpen).toBe('false')
    expect(app?.dataset.preview).toBe('false')
    expect(boundaryStyles?.textContent).toContain('.dwc-launcher')
    expect(boundaryStyles?.textContent).toContain('pointer-events: auto')
    expect(harness.labels).toEqual(['dsh-whale-cards: shadow mount'])

    expect(harness.cleanups).toHaveLength(1)
    await act(async () => {
      await harness.cleanups[0]?.()
    })
    expect(document.getElementById(HOST_ID)).toBeNull()
  })

  it('reads the runtime-mounted companion namespace only inside its explicit inject scope', async () => {
    const harness = createHarness()

    await act(async () => {
      apply(harness.context)
      await Promise.resolve()
    })

    if (renderedCompanion === undefined) throw new Error('GameApp did not receive the companion port')
    await expect(renderedCompanion.snapshot()).resolves.toEqual(COMPANION_STATE)
  })
})
