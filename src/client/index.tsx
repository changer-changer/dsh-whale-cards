/**
 * Browser entry: mounts the teahouse into DSH Web.
 *
 * Cordis owns teardown through the effect scope. The Lanyin service binds to
 * the Host RPC bridge when the connection service is present and degrades to
 * local lines otherwise (standalone preview, bridge down).
 *
 * @module client/index
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createElement, Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TeahouseApp } from '../teahouse/TeahouseApp.tsx'
import { LanyinService } from '../teahouse/lanyin/service.ts'
import { teahouseCallerFromContext } from '../teahouse/rpc-client.ts'
import type { TaskListSource } from '../ui/task-status.ts'

export type ClientCleanup = () => void

export interface MountOptions {
  readonly initiallyOpen?: boolean
  readonly preview?: boolean
  readonly taskSource?: TaskListSource
  readonly lanyin?: LanyinService
}

export const inject = ['sessions', 'connection']
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

  .dth-launcher,
  .dth-launcher-quick,
  .dth-overlay {
    pointer-events: auto;
  }
`

/** Mounts the teahouse in an isolated shadow tree and returns its full disposer. */
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

  const lanyin = options.lanyin ?? new LanyinService(null)
  const root: Root = createRoot(mount)
  root.render(createElement(Suspense, { fallback: null },
    createElement(TeahouseApp, { ...options, lanyin })))

  return () => {
    root.unmount()
    lanyin.dispose()
    host.remove()
  }
}

/** Projects the DSH session-list store onto the small task feed the teahouse uses. */
function taskSourceFrom(ctx: ClientContext): TaskListSource {
  // Host and browser packages both declaration-merge `Context.sessions` in this
  // dual-face bundle; pin the browser face explicitly at this seam.
  const list = (ctx.sessions as unknown as {
    list: {
      getSnapshot(): { byId: unknown; current?: unknown }
      subscribe(listener: () => void): () => void
    }
  }).list
  return {
    getSnapshot() {
      const snapshot = list.getSnapshot()
      return {
        byId: snapshot.byId as unknown as ReturnType<TaskListSource['getSnapshot']>['byId'],
        current: snapshot.current as unknown as ReturnType<TaskListSource['getSnapshot']>['current'],
      }
    },
    subscribe(listener) {
      return list.subscribe(listener)
    },
  }
}

/** Browser plugin entry point. Cordis owns teardown through the effect scope. */
export function apply(ctx: ClientContext): void {
  const lanyin = new LanyinService(teahouseCallerFromContext(ctx))
  ctx.effect(
    () => mountGame(document.body, {
      initiallyOpen: false,
      preview: false,
      taskSource: taskSourceFrom(ctx),
      lanyin,
    }),
    'dsh-whale-cards: shadow mount',
  )
}
