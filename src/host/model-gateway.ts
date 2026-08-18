import {
  BlockAssembler,
  createMessage,
  type GenerateOptions,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import type {
  CompanionModelCatalog,
  CompanionModelGateway,
  ModelCompletionRequest,
} from '../companion/core.ts'

interface LiveProvider {
  readonly id: string
  readonly name: string
}

interface LiveModel {
  readonly provider: string
  readonly id: string
  readonly name: string
  readonly description?: string
}

export interface CompanionLlmRuntime {
  listProviders(): readonly LiveProvider[]
  listModels(provider: string): Promise<readonly LiveModel[]>
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Adapts the Host's registered DSH models to the companion core boundary. */
export class DshCompanionModelGateway implements CompanionModelGateway {
  constructor(private readonly llm: CompanionLlmRuntime) {}

  async listModels(): Promise<CompanionModelCatalog> {
    const providers: CompanionModelCatalog['providers'][number][] = []
    const warnings: string[] = []
    for (const provider of this.llm.listProviders()) {
      try {
        const models = await this.llm.listModels(provider.id)
        providers.push({
          id: provider.id,
          name: provider.name,
          models: models.map((model) => ({
            id: model.id,
            name: model.name,
            ...(model.description === undefined ? {} : { description: model.description }),
          })),
        })
      } catch (error) {
        warnings.push(`${provider.name}：${errorMessage(error)}`)
      }
    }
    return { providers, warnings }
  }

  async complete(request: ModelCompletionRequest, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted()
    const messages = request.messages.map((message) => createMessage({
      role: message.role,
      content: [{ type: 'text', text: message.text }],
      source: message.role === 'user'
        ? { kind: 'user' }
        : { kind: 'plugin', plugin: 'dsh-whale-cards/companion-history' },
    }))
    const assembler = new BlockAssembler()
    for await (const chunk of this.llm.stream({
      provider: request.selection.provider,
      model: request.selection.model,
      system: request.system,
      messages,
      tools: [],
      temperature: 0.8,
      maxTokens: request.maxTokens,
      signal,
    })) assembler.push(chunk)

    const finish = assembler.finish
    if (finish.kind !== 'stop') {
      const detail = 'failure' in finish ? `：${finish.failure.message}` : ''
      throw new Error(`澜音的模型回复未完成（${finish.kind}）${detail}`)
    }
    const blocks = assembler.blocks()
    if (blocks.some((block) => block.type === 'tool-call')) {
      throw new Error('澜音的独立对话不允许调用工具')
    }
    return blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
  }
}
