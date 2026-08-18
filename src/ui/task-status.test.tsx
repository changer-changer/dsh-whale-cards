import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTaskNotice, type TaskListSnapshot, type TaskListSource } from './task-status'

function taskFeed(initial: TaskListSnapshot): {
  emit(next: TaskListSnapshot): void
  source: TaskListSource
} {
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

describe('useTaskNotice', () => {
  it('reports the watched DSH task completing without changing sessions', () => {
    const feed = taskFeed({ current: 'task-1', byId: { 'task-1': { running: true } } })
    const { result } = renderHook(() => useTaskNotice(feed.source, 42))

    act(() => feed.emit({ current: 'task-1', byId: { 'task-1': { completed: true, running: false } } }))

    expect(result.current.notice).toBe('done')
    act(() => result.current.clear())
    expect(result.current.notice).toBeNull()
  })

  it('prioritizes a newly pending interaction and keeps watching the captured task', () => {
    const feed = taskFeed({ current: 'task-1', byId: { 'task-1': { running: true }, 'task-2': { running: true } } })
    const { result } = renderHook(() => useTaskNotice(feed.source, 84))

    act(() => feed.emit({
      current: 'task-2',
      byId: {
        'task-1': { pendingInteraction: { kind: 'approval' }, running: true },
        'task-2': { running: true },
      },
    }))

    expect(result.current.notice).toBe('needs_input')
  })
})
