/**
 * Host half: a tiny RPC bridge exposing DSH's `llm` service to the teahouse.
 *
 * The browser side of the plugin has no credentials and must not see any.
 * All model calls stay on the Host: the client posts plain chat requests to
 * the `/teahouse` channel, and this handler runs them through LlmRuntime.
 *
 * Wire convention: the RpcResult envelope carries `{ok:true, value}` /
 * `{ok:false, error}`; the teahouse's own payload rides inside `value`.
 *
 * @module index (host)
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, HostConnectionRpc } from '@deepseek-ai/dsh-client-connection'
import type { LlmRuntime, Message } from '@deepseek-ai/dsh-llm'
import type {
  LanyinModelRef,
  TeahouseChatFailure,
  TeahouseChatRequest,
  TeahouseChatResult,
  TeahouseModelsResult,
} from './teahouse/types.ts'
import { TEAHOUSE_CHANNEL } from './teahouse/types.ts'

export const inject = ['llm', 'connection']

interface HostContext extends Context {
  readonly llm: LlmRuntime
  readonly connection: { readonly rpc: HostConnectionRpc }
}

const CHAT_MAX_TOKENS = 320

function badRequest(message: string): TeahouseChatFailure {
  return { ok: false, code: 'bad-request', message }
}

function providerError(message: string): TeahouseChatFailure {
  return { ok: false, code: 'provider-error', message }
}

function toWireMessages(request: TeahouseChatRequest): Message[] | null {
  if (!Array.isArray(request?.messages) || request.messages.length === 0) return null
  const messages: Message[] = []
  for (const turn of request.messages) {
    const role = turn?.role === 'assistant' ? 'assistant' : 'user'
    const text = typeof turn?.text === 'string' ? turn.text : ''
    if (text.trim() === '') return null
    messages.push({
      id: `teahouse-${messages.length}` as Message['id'],
      role,
      content: [{ type: 'text', text }],
    } as Message)
  }
  return messages
}

async function runChat(ctx: HostContext, request: TeahouseChatRequest, signal: AbortSignal): Promise<TeahouseChatResult> {
  if (typeof request?.provider !== 'string' || typeof request?.model !== 'string') {
    return badRequest('provider and model are required')
  }
  const messages = toWireMessages(request)
  if (messages === null) return badRequest('messages must be non-empty {role,text} turns')

  let text = ''
  try {
    for await (const chunk of ctx.llm.stream({
      provider: request.provider,
      model: request.model,
      system: typeof request.system === 'string' ? request.system : undefined,
      messages,
      maxTokens: request.maxTokens ?? CHAT_MAX_TOKENS,
      signal,
    })) {
      if (chunk.type === 'text-delta') text += chunk.text
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return providerError(message)
  }
  if (text.trim() === '') return providerError('model returned no text')
  return { ok: true, text: text.trim() }
}

async function listModels(ctx: HostContext): Promise<TeahouseModelsResult> {
  try {
    const models: LanyinModelRef[] = []
    for (const provider of ctx.llm.listProviders()) {
      for (const model of await ctx.llm.listModels(provider.id)) {
        models.push({
          provider: provider.id,
          model: model.id,
          displayName: `${model.name} · ${provider.name}`,
        })
      }
    }
    return { ok: true, models }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

export function apply(ctx: HostContext): void {
  const handler: ConnectionRpcHandler = async (endpoint, payload, signal) => {
    if (endpoint === 'models') return { ok: true, value: await listModels(ctx) }
    if (endpoint === 'chat') {
      const result = await runChat(ctx, payload as TeahouseChatRequest, signal)
      return { ok: true, value: result }
    }
    return { ok: true, value: badRequest(`unknown endpoint: ${endpoint}`) }
  }
  const dispose = ctx.connection.rpc.handle(TEAHOUSE_CHANNEL, handler, { authority: 'trusted-host' })
  ctx.effect(() => dispose, 'teahouse: rpc channel')
}
