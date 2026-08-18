import { act, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TaskListSource } from '../ui/task-status.ts'
import {
  apply,
  HOST_ID,
  inject,
  MOUNT_ID,
  type ClientCleanup,
  type MountOptions,
} from './index.tsx'

vi.mock('../ui/GameApp.tsx', () => ({
  GameApp: ({ initiallyOpen, preview, taskSource }: MountOptions): ReactNode => (
    <div
      data-current-task={taskSource?.getSnapshot().current ?? ''}
      data-initially-open={String(initiallyOpen)}
      data-preview={String(preview)}
      data-testid="game-app"
    />
  ),
}))

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

  const context = {
    effect(setup: () => void | ClientCleanup, label?: string) {
      const cleanup = setup()
      if (cleanup !== undefined) cleanups.push(cleanup)
      if (label !== undefined) labels.push(label)
    },
    sessions: {
      list: taskSource,
    },
  } as unknown as Parameters<typeof apply>[0]

  return { cleanups, context, labels }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('client plugin lifecycle', () => {
  it('declares the sessions service dependency', () => {
    expect(inject).toEqual(['sessions'])
  })

  it('mounts GameApp in a shadow root and removes it on cleanup', () => {
    const harness = createHarness()

    act(() => apply(harness.context))

    const host = document.getElementById(HOST_ID)
    const mount = host?.shadowRoot?.getElementById(MOUNT_ID)
    const boundaryStyles = host?.shadowRoot?.querySelector('style')
    const app = mount?.querySelector<HTMLElement>('[data-testid="game-app"]')
    expect(host?.getAttribute('data-plugin')).toBe('dsh-whale-cards')
    expect(host?.shadowRoot).not.toBeNull()
    expect(app?.dataset.currentTask).toBe('task-1')
    expect(app?.dataset.initiallyOpen).toBe('false')
    expect(app?.dataset.preview).toBe('false')
    expect(boundaryStyles?.textContent).toContain('.dwc-launcher')
    expect(boundaryStyles?.textContent).toContain('pointer-events: auto')
    expect(harness.labels).toEqual(['dsh-whale-cards: shadow mount'])

    expect(harness.cleanups).toHaveLength(1)
    act(() => harness.cleanups[0]?.())
    expect(document.getElementById(HOST_ID)).toBeNull()
  })
})
