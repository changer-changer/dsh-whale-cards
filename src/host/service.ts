import { type Context, Service } from '@deepseek-ai/cordis'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  CompanionCore,
  type CompanionChatReply,
  type CompanionChatRequest,
  type CompanionModelCatalog,
  type CompanionSnapshot,
  type ModelSelection,
} from '../companion/core.ts'
import { whaleCompanionDomainSpec } from './domain.ts'
import { DshCompanionModelGateway } from './model-gateway.ts'
import { StorageDomainCompanionRepository } from './repository.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    whaleCompanion: WhaleCompanionService
  }
}

/** Host-owned companion API: fixed persona, private storage, and tool-free LLM calls. */
export class WhaleCompanionService extends TypertRemoteService {
  static inject = ['llm', 'storageDomain']

  private core?: CompanionCore

  constructor(ctx: Context) {
    super(ctx, 'whaleCompanion')
  }

  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(whaleCompanionDomainSpec)
    this.ctx.effect(
      () => async () => domain.close(),
      'dsh-whale-cards: companion domain',
    )
    this.core = new CompanionCore(
      new StorageDomainCompanionRepository(domain.table('companions')),
      new DshCompanionModelGateway(this.ctx.llm),
    )
  }

  snapshot(): Promise<CompanionSnapshot> {
    return this.requireCore().snapshot()
  }

  listModels(): Promise<CompanionModelCatalog> {
    return this.requireCore().listModels()
  }

  selectModel(selection: ModelSelection): Promise<CompanionSnapshot> {
    return this.requireCore().selectModel(selection)
  }

  remember(request: { readonly text: string }): Promise<CompanionSnapshot> {
    return this.requireCore().remember(request)
  }

  forget(request: { readonly id: string }): Promise<CompanionSnapshot> {
    return this.requireCore().forget(request)
  }

  chat(request: CompanionChatRequest, signal?: AbortSignal): Promise<CompanionChatReply> {
    return this.requireCore().chat(request, signal)
  }

  private requireCore(): CompanionCore {
    if (this.core === undefined) throw new Error('澜音的长期记忆尚未就绪')
    return this.core
  }
}

export default WhaleCompanionService
