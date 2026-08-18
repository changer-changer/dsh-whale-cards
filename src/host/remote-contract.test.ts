import * as Cordis from '@deepseek-ai/cordis'
import { TypertGatewayService } from '@deepseek-ai/dsh-api-gateway'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import type { TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol'
import { describe, expect, it } from 'vitest'
import type { CompanionSnapshot } from '../companion/core.ts'
import TYPERT_REMOTE from '../companion/remote-client.ts'
import { TYPERT } from '../companion/remote-host.ts'
import { WhaleCompanionService } from './service.ts'

describe('whale companion Remote contract', () => {
  it('publishes six Host methods with strict codecs on both faces', () => {
    const methods = TYPERT_REMOTE.descriptors.map((descriptor) => descriptor.method)

    expect(methods).toEqual([
      'snapshot',
      'listModels',
      'selectModel',
      'remember',
      'forget',
      'chat',
    ])
    expect(TYPERT_REMOTE.descriptors.every((descriptor) =>
      descriptor.result.mode === 'strict'
      && descriptor.parameters.every((parameter) => parameter.codec.mode === 'strict'))).toBe(true)
    expect(TYPERT.invocations).toBe(TYPERT_REMOTE.descriptors)
    expect(TYPERT_REMOTE.descriptors.find((descriptor) => descriptor.method === 'chat')?.cancellation)
      .toEqual({ parameter: 'signal' })
  })

  it('mounts in the rc.7 Client gateway and validates a real Remote result', async () => {
    const expected: CompanionSnapshot = {
      identity: {
        name: '澜音',
        role: '鲸牌茶歇的深海鲸牌友',
        tone: '温和、机敏、有一点胜负心',
      },
      selectedModel: null,
      memories: [],
      conversationCount: 0,
    }
    let gateway: { readonly apply: (ctx: Cordis.Context) => void; readonly inject: readonly string[] } | undefined
    Object.defineProperty(window, '__ModuleLoader__', {
      configurable: true,
      value: {
        load(definition: {
          readonly factory: (require: (id: string) => unknown) => unknown
        }) {
          gateway = definition.factory((id) => {
            if (id === '@deepseek-ai/cordis') return Cordis
            throw new Error(`unexpected gateway dependency ${id}`)
          }) as typeof gateway
        },
      },
    })
    await import('@deepseek-ai/dsh-api-gateway/client')
    if (gateway === undefined) throw new Error('rc.7 Client gateway did not register')

    const ctx = new Cordis.Context()
    await ctx.plugin(TypertRegistry)
    ctx.provide('connection', {
      rpc: {
        call: async () => ({ ok: true, value: expected }),
      },
    } as never)
    await ctx.plugin({ inject: [...gateway.inject], apply: gateway.apply })
    const remote = ctx.get('remote') as TypertClientRemote & {
      whaleCompanion: { snapshot(): Promise<{ ok: true; value: CompanionSnapshot }> }
    }

    const dispose = await remote.$mount(TYPERT_REMOTE)
    await expect(remote.whaleCompanion.snapshot()).resolves.toEqual({ ok: true, value: expected })

    await dispose()
    await ctx.fiber.dispose()
  })

  it('dispatches the strict Host descriptor to the live companion service', async () => {
    const ctx = new Cordis.Context()
    await ctx.plugin(TypertRegistry)
    ctx.typert.register(TYPERT)
    ctx.provide('llm', {} as never)
    ctx.provide('storageDomain', {
      open: async () => ({
        table: () => ({ get: () => undefined, put: async () => undefined }),
        close: async () => undefined,
      }),
    } as never)
    await ctx.plugin(WhaleCompanionService)
    await ctx.plugin(TypertGatewayService)

    const value = await ctx.typertGateway.invoke({
      namespace: 'whaleCompanion',
      method: 'snapshot',
      args: {},
    })

    expect(value).toMatchObject({
      identity: { name: '澜音' },
      selectedModel: null,
      conversationCount: 0,
    })
    await ctx.fiber.dispose()
  })
})
