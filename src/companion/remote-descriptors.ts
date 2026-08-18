import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import type { z } from 'zod'
import {
  companionChatReplySchema,
  companionChatRequestSchema,
  companionModelCatalogSchema,
  companionSnapshotSchema,
  forgetRequestSchema,
  modelSelectionSchema,
  rememberRequestSchema,
} from './schema.ts'

const PACKAGE_ID = 'dsh-whale-cards'
const SERVICE = 'whaleCompanion'

function codec(typeSymbol: string, schema: z.ZodType): InvocationDescriptor['result'] {
  return { mode: 'strict', typeSymbol: `${PACKAGE_ID}#${typeSymbol}`, schema }
}

function descriptor(
  method: string,
  result: InvocationDescriptor['result'],
  parameter?: { readonly name: string; readonly schema: z.ZodType; readonly typeSymbol: string },
  cancellation = false,
): InvocationDescriptor {
  return {
    id: `${PACKAGE_ID}#${SERVICE}/${method}`,
    service: SERVICE,
    namespace: SERVICE,
    method,
    invocation: { kind: 'direct' },
    parameters: parameter === undefined ? [] : [{
      name: parameter.name,
      wire: parameter.name,
      source: 'json',
      codec: codec(parameter.typeSymbol, parameter.schema),
    }],
    ...(cancellation ? { cancellation: { parameter: 'signal' as const } } : {}),
    result,
  }
}

/** Single source of truth shared by the Host registry and browser contribution. */
export const WHALE_COMPANION_DESCRIPTORS: readonly InvocationDescriptor[] = Object.freeze([
  descriptor('snapshot', codec('CompanionSnapshot', companionSnapshotSchema)),
  descriptor('listModels', codec('CompanionModelCatalog', companionModelCatalogSchema)),
  descriptor(
    'selectModel',
    codec('CompanionSnapshot', companionSnapshotSchema),
    { name: 'selection', schema: modelSelectionSchema, typeSymbol: 'ModelSelection' },
  ),
  descriptor(
    'remember',
    codec('CompanionSnapshot', companionSnapshotSchema),
    { name: 'request', schema: rememberRequestSchema, typeSymbol: 'RememberRequest' },
  ),
  descriptor(
    'forget',
    codec('CompanionSnapshot', companionSnapshotSchema),
    { name: 'request', schema: forgetRequestSchema, typeSymbol: 'ForgetRequest' },
  ),
  descriptor(
    'chat',
    codec('CompanionChatReply', companionChatReplySchema),
    { name: 'request', schema: companionChatRequestSchema, typeSymbol: 'CompanionChatRequest' },
    true,
  ),
])
