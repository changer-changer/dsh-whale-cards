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

  it('never backfills a notice from the opening snapshot', () => {
    // The panel opens on a task that already finished: the baseline absorbs it.
    const feed = taskFeed({ current: 'task-1', byId: { 'task-1': { completed: true, running: false } } })
    const { result } = renderHook(() => useTaskNotice(feed.source, 1))

    expect(result.current.notice).toBeNull()
    // A further no-op emission still must not surface a stale "done".
    act(() => feed.emit({ current: 'task-1', byId: { 'task-1': { completed: true, running: false } } }))
    expect(result.current.notice).toBeNull()
  })

  it('prefers needs_input when completion and pending input coincide', () => {
    const feed = taskFeed({ current: 'task-1', byId: { 'task-1': { running: true } } })
    const { result } = renderHook(() => useTaskNotice(feed.source, 1))

    act(() => feed.emit({
      current: 'task-1',
      byId: { 'task-1': { pendingInteraction: { kind: 'question' }, running: false, completed: true } },
    }))

    expect(result.current.notice).toBe('needs_input')
  })

  it('stops watching once the panel closes', () => {
    const feed = taskFeed({ current: 'task-1', byId: { 'task-1': { running: true } } })
    const { result, rerender } = renderHook(
      ({ key }: { key: number | null }) => useTaskNotice(feed.source, key),
      { initialProps: { key: 1 as number | null } },
    )

    rerender({ key: null })
    act(() => feed.emit({ current: 'task-1', byId: { 'task-1': { completed: true, running: false } } }))

    expect(result.current.notice).toBeNull()
  })

  it('captures the current task afresh each time the panel opens', () => {
    const feed = taskFeed({
      current: 'task-1',
      byId: { 'task-1': { running: true }, 'task-2': { running: true } },
    })
    const { result, rerender } = renderHook(
      ({ key }: { key: number | null }) => useTaskNotice(feed.source, key),
      { initialProps: { key: 1 as number | null } },
    )

    // Close; the DSH current task moves to task-2 while the panel is shut.
    rerender({ key: null })
    act(() => feed.emit({ current: 'task-2', byId: { 'task-1': { running: true }, 'task-2': { running: true } } }))
    rerender({ key: 2 })

    // task-1 finishing is irrelevant now; only task-2 is watched.
    act(() => feed.emit({
      current: 'task-2',
      byId: { 'task-1': { running: false, completed: true }, 'task-2': { running: true } },
    }))
    expect(result.current.notice).toBeNull()

    act(() => feed.emit({
      current: 'task-2',
      byId: { 'task-1': { running: false, completed: true }, 'task-2': { running: false, completed: true } },
    }))
    expect(result.current.notice).toBe('done')
  })
})
