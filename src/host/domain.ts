import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { CompanionRecord } from '../companion/core.ts'
import { companionRecordSchema } from '../companion/schema.ts'

/** One private durable row; no session transcript or source content is stored. */
export const whaleCompanionDomainSpec = defineDomain({
  name: 'dsh_whale_cards',
  version: 1,
  tables: {
    companions: domainTable<string, CompanionRecord>(companionRecordSchema),
  },
})
