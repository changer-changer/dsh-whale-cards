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

/** Mount the strict Remote contribution and present the UI's stable facade. */
export async function mountCompanionBridge(remote: CompanionRemoteMount): Promise<MountedCompanionBridge> {
  const dispose = await remote.$mount(TYPERT_REMOTE)
  const namespace = remote.whaleCompanion
  const port: CompanionPort = {
    snapshot: async () => unwrap(await namespace.snapshot()),
    listModels: async () => unwrap(await namespace.listModels()),
    selectModel: async (selection) => unwrap(await namespace.selectModel(selection)),
    remember: async (request) => unwrap(await namespace.remember(request)),
    forget: async (request) => unwrap(await namespace.forget(request)),
    chat: async (request, signal) => unwrap(await namespace.chat(request, signal)),
  }
  return { port, dispose }
}
