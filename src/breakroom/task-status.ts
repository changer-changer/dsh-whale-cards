import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Shell-owned task notice (spec §11). The breakroom shell, not any individual
 * game, owns watching the DSH task list. A game (Gin or a fixture) must never
 * subscribe to DSH task state, pause on it, or change its save because of it.
 */

export interface TaskSummary {
  readonly completed?: boolean
  readonly displayTitle?: string
  readonly pendingInteraction?: unknown
  readonly running?: boolean
  readonly title?: string
}

export interface TaskListSnapshot {
  readonly byId: Readonly<Record<string, TaskSummary | undefined>>
  readonly current?: string | null
}

export interface TaskListSource {
  getSnapshot(): TaskListSnapshot
  subscribe(listener: () => void): () => void
}

export type TaskNotice = 'done' | 'needs_input' | null

/**
 * Watches the DSH task captured when the panel opens, and only that task, until
 * the panel closes (§11.1).
 *
 * - `watchKey` is a per-open token: when it is non-null the hook captures the
 *   then-current `current` task ID and establishes the initial snapshot as the
 *   baseline; a fresh baseline never backfills a stale completion.
 * - `running: true → false` reports `done`.
 * - `pendingInteraction: absent → present` reports `needs_input`.
 * - When both fire in the same transition, `needs_input` wins (§11.2).
 * - On `watchKey === null` (panel closed) the subscription is torn down and the
 *   notice is cleared; the next open captures the current task again.
 */
export function useTaskNotice(
  source: TaskListSource | undefined,
  watchKey: number | null,
): { clear: () => void; notice: TaskNotice } {
  const [notice, setNotice] = useState<TaskNotice>(null)
  const watchedId = useRef<string | null>(null)
  const previous = useRef<{ pending: boolean; running: boolean } | null>(null)

  useEffect(() => {
    setNotice(null)
    if (source === undefined || watchKey === null) {
      watchedId.current = null
      previous.current = null
      return
    }
    const initial = source.getSnapshot()
    watchedId.current = initial.current === undefined || initial.current === null
      ? null
      : String(initial.current)
    const row = watchedId.current === null ? undefined : initial.byId[watchedId.current]
    previous.current = row === undefined
      ? null
      : { pending: row.pendingInteraction !== undefined, running: row.running === true }

    return source.subscribe(() => {
      const id = watchedId.current
      if (id === null) return
      const next = source.getSnapshot().byId[id]
      if (next === undefined) return
      const current = {
        pending: next.pendingInteraction !== undefined,
        running: next.running === true,
      }
      const before = previous.current
      previous.current = current
      if (before === null) return
      if (!before.pending && current.pending) setNotice('needs_input')
      else if (before.running && !current.running) setNotice('done')
    })
  }, [source, watchKey])

  const clear = useCallback(() => setNotice(null), [])
  return { clear, notice }
}
