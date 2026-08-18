import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CompanionPort } from '../companion/core.ts'
import { GameApp } from '../ui/GameApp.tsx'
import type { TaskListSnapshot, TaskListSource, TaskSummary } from '../ui/task-status.ts'
import {
  mountCompanionBridge,
  type CompanionRemoteMount,
  type MountedCompanionBridge,
} from './companion-bridge.ts'

export type ClientCleanup = () => void

export interface MountOptions {
  readonly companion?: CompanionPort
  readonly initiallyOpen?: boolean
  readonly preview?: boolean
  readonly taskSource?: TaskListSource
}

export const inject = ['sessions', 'connection', 'remote']
export const HOST_ID = 'dsh-whale-cards-host'
export const MOUNT_ID = 'dsh-whale-cards-root'

const SHADOW_BASE_STYLES = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    pointer-events: none;
    isolation: isolate;
    color-scheme: light dark;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  button, input, select, textarea {
    font: inherit;
  }

  #${MOUNT_ID} {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .dwc-launcher,
  .dwc-overlay {
    pointer-events: auto;
  }
`

/** Mounts the game in an isolated shadow tree and returns its full disposer. */
export function mountGame(parent: HTMLElement, options: MountOptions = {}): ClientCleanup {
  const host = document.createElement('div')
  host.id = HOST_ID
  host.dataset.plugin = 'dsh-whale-cards'

  const shadow = host.attachShadow({ mode: 'open' })
  const styles = document.createElement('style')
  styles.textContent = SHADOW_BASE_STYLES
  const mount = document.createElement('div')
  mount.id = MOUNT_ID
  shadow.append(styles, mount)
  parent.append(host)

  const root: Root = createRoot(mount)
  root.render(createElement(GameApp, options))

  return () => {
    root.unmount()
    host.remove()
  }
}

interface DshTaskRow {
  readonly completed?: unknown
  readonly displayTitle?: unknown
  readonly pendingInteraction?: unknown
  readonly running?: unknown
}

interface DshTaskListSnapshot {
  readonly byId: object
  readonly current?: string | null
}

function pendingInteraction(value: unknown): TaskSummary['pendingInteraction'] {
  if (value === undefined) return undefined
  if (value === 'approval' || value === 'plan-review' || value === 'question') return value
  return 'pending'
}

/** Privacy fence: copy only public status metadata, never prompts, transcripts, cwd, or code. */
export function projectTaskListSnapshot(snapshot: DshTaskListSnapshot): TaskListSnapshot {
  const byId: Record<string, TaskSummary | undefined> = {}
  for (const [id, value] of Object.entries(snapshot.byId)) {
    const row = value as DshTaskRow | undefined
    if (row === undefined) {
      byId[id] = undefined
      continue
    }
    const displayTitle = typeof row.displayTitle === 'string'
      ? row.displayTitle.trim().slice(0, 300) || undefined
      : undefined
    byId[id] = {
      ...(displayTitle === undefined ? {} : { displayTitle }),
      running: row.running === true,
      pendingInteraction: pendingInteraction(row.pendingInteraction),
      completed: row.completed === true,
    }
  }
  return { byId, current: snapshot.current }
}

/** Projects the DSH session-list store onto the small task feed the game uses. */
function taskSourceFrom(ctx: ClientContext): TaskListSource {
  return {
    getSnapshot() {
      return projectTaskListSnapshot(ctx.sessions.list.getSnapshot())
    },
    subscribe(listener) {
      return ctx.sessions.list.subscribe(listener)
    },
  }
}

type BridgeOutcome =
  | { readonly ok: true; readonly value: MountedCompanionBridge }
  | { readonly ok: false; readonly error: unknown }

function deferredCompanionPort(bridge: Promise<BridgeOutcome>): CompanionPort {
  async function withPort<T>(operation: (port: CompanionPort) => Promise<T>): Promise<T> {
    const outcome = await bridge
    if (!outcome.ok) throw outcome.error
    return operation(outcome.value.port)
  }
  return {
    snapshot: () => withPort((port) => port.snapshot()),
    listModels: () => withPort((port) => port.listModels()),
    selectModel: (selection) => withPort((port) => port.selectModel(selection)),
    remember: (request) => withPort((port) => port.remember(request)),
    forget: (request) => withPort((port) => port.forget(request)),
    chat: (request, signal) => withPort((port) => port.chat(request, signal)),
  }
}

/** Browser plugin entry point. Cordis owns teardown through the effect scope. */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => {
      const remote = (ctx as unknown as { readonly remote: CompanionRemoteMount }).remote
      const bridge: Promise<BridgeOutcome> = mountCompanionBridge(remote).then(
        (value) => ({ ok: true, value }),
        (error: unknown) => ({ ok: false, error }),
      )
      const unmount = mountGame(document.body, {
        companion: deferredCompanionPort(bridge),
        initiallyOpen: false,
        preview: false,
        taskSource: taskSourceFrom(ctx),
      })
      return async () => {
        unmount()
        const outcome = await bridge
        if (outcome.ok) await outcome.value.dispose()
      }
    },
    'dsh-whale-cards: shadow mount',
  )
}
