import { z } from 'zod'
import type {
  CompanionChatReply,
  CompanionChatRequest,
  CompanionConversationEntry,
  CompanionGameContext,
  CompanionIdentity,
  CompanionMemory,
  CompanionModelCatalog,
  CompanionModelItem,
  CompanionModelProvider,
  CompanionRecord,
  CompanionSnapshot,
  CompanionTaskContext,
  ModelSelection,
} from './core.ts'

const safeTimestampSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)

export const modelSelectionSchema = z.object({
  provider: z.string().trim().min(1).max(256),
  model: z.string().trim().min(1).max(256),
}).strict() satisfies z.ZodType<ModelSelection>

export const companionMemorySchema = z.object({
  id: z.string().min(1).max(256),
  text: z.string().trim().min(1).max(500),
  createdAt: safeTimestampSchema,
}).strict() satisfies z.ZodType<CompanionMemory>

export const companionConversationEntrySchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2_000),
  at: safeTimestampSchema,
}).strict() satisfies z.ZodType<CompanionConversationEntry>

export const companionRecordSchema = z.object({
  version: z.literal(1),
  selectedModel: modelSelectionSchema.nullable(),
  memories: z.array(companionMemorySchema),
  conversation: z.array(companionConversationEntrySchema).max(40),
}).strict() satisfies z.ZodType<CompanionRecord>

export const companionIdentitySchema = z.object({
  name: z.literal('澜音'),
  role: z.literal('鲸牌茶歇的深海鲸牌友'),
  tone: z.literal('温和、机敏、有一点胜负心'),
}).strict() satisfies z.ZodType<CompanionIdentity>

export const companionModelItemSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  description: z.string().max(1_000).optional(),
}).strict() satisfies z.ZodType<CompanionModelItem>

export const companionModelProviderSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  models: z.array(companionModelItemSchema),
}).strict() satisfies z.ZodType<CompanionModelProvider>

export const companionModelCatalogSchema = z.object({
  providers: z.array(companionModelProviderSchema),
  warnings: z.array(z.string().max(2_000)),
}).strict() satisfies z.ZodType<CompanionModelCatalog>

export const companionSnapshotSchema = z.object({
  identity: companionIdentitySchema,
  selectedModel: modelSelectionSchema.nullable(),
  memories: z.array(companionMemorySchema),
  conversationCount: z.number().int().nonnegative().max(40),
}).strict() satisfies z.ZodType<CompanionSnapshot>

export const companionTaskContextSchema = z.object({
  currentTitle: z.string().trim().min(1).max(300).optional(),
  running: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  needsInput: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  completed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict() satisfies z.ZodType<CompanionTaskContext>

export const companionGameContextSchema = z.object({
  round: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  humanScore: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  lanyinScore: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  publicSignal: z.string().trim().min(1).max(500).optional(),
}).strict() satisfies z.ZodType<CompanionGameContext>

export const companionChatRequestSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
  task: companionTaskContextSchema.optional(),
  game: companionGameContextSchema.optional(),
}).strict() satisfies z.ZodType<CompanionChatRequest>

export const companionChatReplySchema = z.object({
  text: z.string().trim().min(1).max(2_000),
  mood: z.enum(['calm', 'thinking', 'pleased', 'concerned']),
  state: companionSnapshotSchema,
}).strict() satisfies z.ZodType<CompanionChatReply>

export const rememberRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
}).strict()

export const forgetRequestSchema = z.object({
  id: z.string().min(1).max(256),
}).strict()
