/**
 * Client-side caller for the teahouse Host RPC channel.
 *
 * The connection service is discovered optionally: in the real DSH Web it is
 * provided by the runtime; in standalone preview it is absent and every call
 * resolves to an `unavailable` failure, which the Lanyin layer turns into
 * local fallback lines. Games therefore never crash on missing models.
 *
 * @module teahouse/rpc-client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {
  LanyinModelRef,
  TeahouseChatRequest,
  TeahouseChatResult,
  TeahouseModelsResult,
} from './types.ts'
import { TEAHOUSE_CHANNEL } from './types.ts'

export type TeahouseCaller = {
  models(signal?: AbortSignal): Promise<TeahouseModelsResult>
  chat(request: TeahouseChatRequest, signal?: AbortSignal): Promise<TeahouseChatResult>
}

const UNAVAILABLE: TeahouseChatResult = {
  ok: false,
  code: 'unavailable',
  message: 'DSH 连接不可用（预览模式或通道未注册）',
}

function callerFrom(connection: ConnectionHandle): TeahouseCaller {
  return {
    async models(signal): Promise<TeahouseModelsResult> {
      try {
        const envelope = await connection.rpc.call(TEAHOUSE_CHANNEL, 'models', {}, signal)
        return envelope.ok ? (envelope.value as TeahouseModelsResult) : { ok: false, error: envelope.error?.message ?? 'models rpc failed' }
      } catch {
        return { ok: false, error: 'models rpc failed' }
      }
    },
    async chat(request, signal): Promise<TeahouseChatResult> {
      try {
        const envelope = await connection.rpc.call(TEAHOUSE_CHANNEL, 'chat', request, signal)
        return envelope.ok ? (envelope.value as TeahouseChatResult) : UNAVAILABLE
      } catch {
        return UNAVAILABLE
      }
    },
  }
}

/**
 * Read the connection service off a client context without declaring a hard
 * dependency. Returns null when absent — callers treat that as "model off".
 */
export function teahouseCallerFromContext(ctx: Context): TeahouseCaller | null {
  const candidate = (ctx as Partial<{ connection?: unknown }>).connection as
    | { rpc?: unknown }
    | undefined
  if (candidate?.rpc === undefined) return null
  return callerFrom(candidate as unknown as ConnectionHandle)
}

export type { LanyinModelRef }
