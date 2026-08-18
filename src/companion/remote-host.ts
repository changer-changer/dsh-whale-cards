import { WHALE_COMPANION_DESCRIPTORS } from './remote-descriptors.ts'

const methods = [
  ['snapshot', 'snapshot(): Promise<CompanionSnapshot>'],
  ['listModels', 'listModels(): Promise<CompanionModelCatalog>'],
  ['selectModel', 'selectModel(selection: ModelSelection): Promise<CompanionSnapshot>'],
  ['remember', 'remember(request: RememberRequest): Promise<CompanionSnapshot>'],
  ['forget', 'forget(request: ForgetRequest): Promise<CompanionSnapshot>'],
  ['chat', 'chat(request: CompanionChatRequest, signal?: AbortSignal): Promise<CompanionChatReply>'],
] as const

/** Hand-authored strict Host manifest for the standalone package. */
export const TYPERT = Object.freeze({
  package: 'dsh-whale-cards',
  face: 'host' as const,
  schemas: [],
  invocations: WHALE_COMPANION_DESCRIPTORS,
  model: {
    services: [{
      description: 'Tool-free durable whale companion Remote service.',
      summary: 'Whale companion Remote service.',
      tags: [],
      key: 'whaleCompanion',
      exportName: 'WhaleCompanionService',
      members: methods.map(([name, signature]) => ({ kind: 'method' as const, name, signature })),
      types: [],
    }],
    events: [],
    objects: [],
  },
})

export default TYPERT
