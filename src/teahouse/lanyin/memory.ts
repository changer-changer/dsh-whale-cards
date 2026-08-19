/**
 * Lanyin's long-term memory: explicit, inspectable, editable, deletable.
 *
 * Nothing enters memory unless the user asked for it ("记住这个") or tapped
 * the pin button. Everything stored is visible in the memory panel where it
 * can be edited or removed. The list is injected into her system prompt so
 * she genuinely remembers across sessions and across games.
 *
 * @module teahouse/lanyin/memory
 */

export interface MemoryEntry {
  readonly id: string
  text: string
  readonly createdAt: number
}

const MEMORY_KEY = 'dsh-teahouse:lanyin:memory:v1'
const MAX_ENTRIES = 60

export interface MemoryStore {
  list(): readonly MemoryEntry[]
  add(text: string): MemoryEntry | null
  update(id: string, text: string): boolean
  remove(id: string): boolean
  clear(): void
}

function sanitize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 240)
}

function randomId(): string {
  const cryptoRef = globalThis.crypto
  if (cryptoRef?.randomUUID !== undefined) return cryptoRef.randomUUID()
  return `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Detect an explicit "remember this" request in a user chat message. */
export function extractRememberRequest(text: string): { request: string; toRemember: string } | null {
  const patterns = [
    /(?:请|帮我)?记住[：:，,\s]+(.+)/u,
    /(?:请|帮我)?记住这个[：:，,\s]*(.*)/u,
    /remember (?:this[：:,]+ )?(.+)/iu,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match !== null) {
      const toRemember = sanitize(match[1] ?? '')
      if (toRemember !== '') {
        const prefix = text.slice(0, match.index ?? 0)
        const request = sanitize(prefix) === '' ? text : prefix
        return { request, toRemember }
      }
    }
  }
  return null
}

/** Parse-then-validate storage access; corrupt data degrades to empty. */
function readRaw(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const entries: MemoryEntry[] = []
    for (const item of parsed) {
      if (typeof item?.id !== 'string' || typeof item?.text !== 'string') continue
      entries.push({ id: item.id, text: item.text, createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now() })
    }
    return entries
  } catch {
    return []
  }
}

function write(entries: readonly MemoryEntry[]): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    /* storage full or unavailable — memory is best-effort */
  }
}

export function createMemoryStore(): MemoryStore {
  return {
    list: () => readRaw(),
    add(text) {
      const clean = sanitize(text)
      if (clean === '') return null
      const entry: MemoryEntry = { id: randomId(), text: clean, createdAt: Date.now() }
      const next = [...readRaw(), entry]
      write(next)
      return entry
    },
    update(id, text) {
      const clean = sanitize(text)
      if (clean === '') return false
      const entries = readRaw()
      let found = false
      for (const entry of entries) {
        if (entry.id === id) {
          entry.text = clean
          found = true
        }
      }
      if (found) write(entries)
      return found
    },
    remove(id) {
      const entries = readRaw()
      const next = entries.filter((entry) => entry.id !== id)
      if (next.length === entries.length) return false
      write(next)
      return true
    },
    clear: () => write([]),
  }
}
