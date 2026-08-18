import type {
  RemoteFailure,
  RemoteResult,
  TypertDisposer,
  TypertRemoteContribution,
} from '@deepseek-ai/dsh-typert-protocol'
import type { CompanionPort } from '../companion/core.ts'
import TYPERT_REMOTE, {
  type WhaleCompanionRemoteNamespace,
} from '../companion/remote-client.ts'

export type { CompanionPort } from '../companion/core.ts'

export interface CompanionRemoteMount {
  readonly whaleCompanion: WhaleCompanionRemoteNamespace
  $mount(contribution: TypertRemoteContribution): Promise<TypertDisposer>
}

export interface CompanionBridgeFiber extends PromiseLike<unknown> {
  dispose(): void | Promise<void>
}

export interface CompanionBridgeContext {
  readonly remote: CompanionRemoteMount
  inject(
    deps: string[],
    callback: (ctx: CompanionBridgeContext) => void,
  ): CompanionBridgeFiber
}

export interface MountedCompanionBridge {
  readonly port: CompanionPort
  readonly dispose: TypertDisposer
}

export class CompanionRemoteError extends Error {
  readonly code: string
  readonly details: object

  constructor(failure: RemoteFailure) {
    super(failure.message)
    this.name = 'CompanionRemoteError'
    this.code = failure.code
    this.details = failure.details
  }
}

function unwrap<T>(result: RemoteResult<T>): T {
  if (result.ok) return result.value
  throw new CompanionRemoteError(result.error)
}

function companionPort(namespace: WhaleCompanionRemoteNamespace): CompanionPort {
  return {
    snapshot: async () => unwrap(await namespace.snapshot()),
    listModels: async () => unwrap(await namespace.listModels()),
    selectModel: async (selection) => unwrap(await namespace.selectModel(selection)),
    remember: async (request) => unwrap(await namespace.remember(request)),
    forget: async (request) => unwrap(await namespace.forget(request)),
    chat: async (request, signal) => unwrap(await namespace.chat(request, signal)),
  }
}

/** Mount the strict contribution, then consume its namespace in an explicitly injected child fiber. */
export async function mountCompanionBridge(ctx: CompanionBridgeContext): Promise<MountedCompanionBridge> {
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
  let namespaceFiber: CompanionBridgeFiber | undefined
  let port: CompanionPort | undefined
  try {
    namespaceFiber = ctx.inject(['remote.whaleCompanion'], (remoteCtx) => {
      port = companionPort(remoteCtx.remote.whaleCompanion)
    })
    await namespaceFiber
  } catch (error) {
    await namespaceFiber?.dispose()
    await disposeRemote()
    throw error
  }
  if (port === undefined) {
    await namespaceFiber.dispose()
    await disposeRemote()
    throw new Error('companion Remote namespace did not become available')
  }

  let disposed = false
  return {
    port,
    dispose: async () => {
      if (disposed) return
      disposed = true
      await namespaceFiber.dispose()
      await disposeRemote()
    },
  }
}
