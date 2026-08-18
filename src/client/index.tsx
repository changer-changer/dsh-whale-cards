import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { GameApp } from '../ui/GameApp.tsx'
import type { TaskListSource } from '../ui/task-status.ts'

export type ClientCleanup = () => void

export interface MountOptions {
  readonly initiallyOpen?: boolean
  readonly preview?: boolean
  readonly taskSource?: TaskListSource
}

export const inject = ['sessions']
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

/** Projects the DSH session-list store onto the small task feed the game uses. */
function taskSourceFrom(ctx: ClientContext): TaskListSource {
  return {
    getSnapshot() {
      const snapshot = ctx.sessions.list.getSnapshot()
      return {
        byId: snapshot.byId,
        current: snapshot.current,
      }
    },
    subscribe(listener) {
      return ctx.sessions.list.subscribe(listener)
    },
  }
}

/** Browser plugin entry point. Cordis owns teardown through the effect scope. */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => mountGame(document.body, {
      initiallyOpen: false,
      preview: false,
      taskSource: taskSourceFrom(ctx),
    }),
    'dsh-whale-cards: shadow mount',
  )
}
