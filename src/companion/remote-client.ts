import type {
  RemoteResult,
  TypertRemoteContribution,
} from '@deepseek-ai/dsh-typert-protocol'
import type {
  CompanionChatReply,
  CompanionChatRequest,
  CompanionModelCatalog,
  CompanionSnapshot,
  ModelSelection,
} from './core.ts'
import { WHALE_COMPANION_DESCRIPTORS } from './remote-descriptors.ts'

export interface WhaleCompanionRemoteNamespace {
  snapshot(): Promise<RemoteResult<CompanionSnapshot>>
  listModels(): Promise<RemoteResult<CompanionModelCatalog>>
  selectModel(selection: ModelSelection): Promise<RemoteResult<CompanionSnapshot>>
  remember(request: { readonly text: string }): Promise<RemoteResult<CompanionSnapshot>>
  forget(request: { readonly id: string }): Promise<RemoteResult<CompanionSnapshot>>
  chat(request: CompanionChatRequest, signal?: AbortSignal): Promise<RemoteResult<CompanionChatReply>>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
    'whaleCompanion/snapshot': WhaleCompanionRemoteNamespace['snapshot']
    'whaleCompanion/listModels': WhaleCompanionRemoteNamespace['listModels']
    'whaleCompanion/selectModel': WhaleCompanionRemoteNamespace['selectModel']
    'whaleCompanion/remember': WhaleCompanionRemoteNamespace['remember']
    'whaleCompanion/forget': WhaleCompanionRemoteNamespace['forget']
    'whaleCompanion/chat': WhaleCompanionRemoteNamespace['chat']
  }

  interface TypertRemoteNamespaceMap {
    whaleCompanion: WhaleCompanionRemoteNamespace
  }
}

export const TYPERT_REMOTE: TypertRemoteContribution = Object.freeze({
  package: 'dsh-whale-cards',
  descriptors: WHALE_COMPANION_DESCRIPTORS,
})

export default TYPERT_REMOTE
