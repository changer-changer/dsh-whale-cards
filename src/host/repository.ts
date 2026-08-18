import type { CompanionRecord, CompanionRepository } from '../companion/core.ts'

const COMPANION_KEY = 'lanyin'

export interface CompanionRecordTable {
  get(key: string): CompanionRecord | undefined
  put(key: string, value: CompanionRecord): Promise<void>
}

/** Durable repository over this plugin's private storage-domain table. */
export class StorageDomainCompanionRepository implements CompanionRepository {
  constructor(private readonly table: CompanionRecordTable) {}

  async load(): Promise<CompanionRecord | undefined> {
    const record = this.table.get(COMPANION_KEY)
    return record === undefined ? undefined : structuredClone(record)
  }

  async save(record: CompanionRecord): Promise<void> {
    await this.table.put(COMPANION_KEY, structuredClone(record))
  }
}
