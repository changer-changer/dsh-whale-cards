import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BreakroomApp } from './breakroom/BreakroomApp.tsx'
import type { TaskListSnapshot, TaskListSource } from './ui/task-status.ts'

const TASK_ID = 'preview-dsh-task'
const FRAME_MS = 4200

const frames: readonly TaskListSnapshot[] = [
  {
    byId: { [TASK_ID]: { running: true } },
    current: TASK_ID,
  },
  {
    byId: { [TASK_ID]: { pendingInteraction: { kind: 'preview-question' }, running: true } },
    current: TASK_ID,
  },
  {
    byId: { [TASK_ID]: { running: true } },
    current: TASK_ID,
  },
  {
    byId: { [TASK_ID]: { completed: true, running: false } },
    current: TASK_ID,
  },
]

function createPreviewTaskSource(): { dispose: () => void; source: TaskListSource } {
  const listeners = new Set<() => void>()
  let frame = 0
  let snapshot = frames[frame] as TaskListSnapshot

  const source: TaskListSource = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  const timer = window.setInterval(() => {
    frame = (frame + 1) % frames.length
    snapshot = frames[frame] as TaskListSnapshot
    for (const listener of listeners) listener()
  }, FRAME_MS)

  return {
    source,
    dispose: () => {
      window.clearInterval(timer)
      listeners.clear()
    },
  }
}

const previewRoot = document.getElementById('preview-root')
if (!(previewRoot instanceof HTMLElement)) {
  throw new Error('whale-cards preview root is missing')
}

const taskFeed = createPreviewTaskSource()
const root = createRoot(previewRoot)
root.render(createElement(BreakroomApp, {
  initiallyOpen: true,
  preview: true,
  taskSource: taskFeed.source,
}))

window.addEventListener('beforeunload', () => {
  taskFeed.dispose()
  root.unmount()
}, { once: true })

