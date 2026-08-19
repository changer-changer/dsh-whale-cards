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
  TeahouseAgentChatRequest,
  TeahouseAgentDecision,
  TeahouseAgentEndRequest,
  TeahouseAgentEventRequest,
  TeahouseAgentResult,
  TeahouseAgentStartRequest,
  TeahouseAgentTurnRequest,
  TeahouseChatRequest,
  TeahouseChatResult,
  TeahouseModelsResult,
} from './types.ts'
import { TEAHOUSE_CHANNEL } from './types.ts'

export type TeahouseCaller = {
  models(signal?: AbortSignal): Promise<TeahouseModelsResult>
  chat(request: TeahouseChatRequest, signal?: AbortSignal): Promise<TeahouseChatResult>
  startAgent(request: TeahouseAgentStartRequest, signal?: AbortSignal): Promise<TeahouseAgentResult<{ sessionId: string }>>
  turnAgent(request: TeahouseAgentTurnRequest, signal?: AbortSignal): Promise<TeahouseAgentResult<TeahouseAgentDecision>>
  chatAgent(request: TeahouseAgentChatRequest, signal?: AbortSignal): Promise<TeahouseAgentResult<{ text: string }>>
  eventAgent(request: TeahouseAgentEventRequest, signal?: AbortSignal): Promise<TeahouseAgentResult<{ text: string }>>
  endAgent(request: TeahouseAgentEndRequest, signal?: AbortSignal): Promise<TeahouseAgentResult<Record<string, never>>>
}

const UNAVAILABLE: TeahouseChatResult = {
  ok: false,
  code: 'unavailable',
  message: 'DSH 连接不可用（预览模式或通道未注册）',
}

function callerFrom(connection: ConnectionHandle): TeahouseCaller {
  const callAgent = async <T,>(endpoint: string, payload: unknown, signal?: AbortSignal): Promise<TeahouseAgentResult<T>> => {
    try {
      const envelope = await connection.rpc.call(TEAHOUSE_CHANNEL, endpoint, payload, signal)
      return envelope.ok
        ? (envelope.value as TeahouseAgentResult<T>)
        : { ok: false, code: 'unavailable', message: envelope.error?.message ?? `${endpoint} rpc failed` }
    } catch {
      return { ok: false, code: 'unavailable', message: `${endpoint} rpc failed` }
    }
  }
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
    startAgent: (request, signal) => callAgent('agent/start', request, signal),
    turnAgent: (request, signal) => callAgent('agent/turn', request, signal),
    chatAgent: (request, signal) => callAgent('agent/chat', request, signal),
    eventAgent: (request, signal) => callAgent('agent/event', request, signal),
    endAgent: (request, signal) => callAgent('agent/end', request, signal),
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
