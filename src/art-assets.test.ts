import { describe, expect, it } from 'vitest'
import {
  LANYIN_CALM_ART,
  LANYIN_CONCERNED_ART,
  LANYIN_HARBOR_ART,
  LANYIN_PLEASED_ART,
  LANYIN_THINKING_ART,
} from './client/generated/art.ts'

const EXPRESSION_ART = {
  calm: LANYIN_CALM_ART,
  concerned: LANYIN_CONCERNED_ART,
  pleased: LANYIN_PLEASED_ART,
  thinking: LANYIN_THINKING_ART,
}

const SOURCE_HASHES = {
  calm: 'fd253c848047356dcd1189b91f1e8f5715ef3d4abc52d0923bb59b493139a4db',
  concerned: '903cd42a547a47be977a68c8ce545ea8dabad7a4bcb6375450f4e868e79d62ae',
  pleased: 'edba1a224a8409b0bcc4091ece39e8e1f5cc7a1a767aa443e87bdeaff0655e57',
  thinking: 'e6e5d905c6addc2485b1fbee8193cde3f5aaf2aba2f1165d8831424f50a423e0',
} as const

async function sha256(dataUrl: string): Promise<string> {
  const encoded = dataUrl.split(',')[1] ?? ''
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

describe('embedded Lanyin expression artwork', () => {
  it('exports four distinct JPEG data URLs', () => {
    const urls = Object.values(EXPRESSION_ART)
    expect(new Set(urls)).toHaveLength(4)
    for (const url of urls) {
      expect(url).toMatch(/^data:image\/jpeg;base64,\/9j\//)
    }
  })

  it('keeps the original harbor export as the calm artwork alias', () => {
    expect(LANYIN_HARBOR_ART).toBe(LANYIN_CALM_ART)
  })

  it('is byte-for-byte current with every project JPEG', async () => {
    for (const expression of Object.keys(EXPRESSION_ART) as (keyof typeof EXPRESSION_ART)[]) {
      expect(await sha256(EXPRESSION_ART[expression]), expression).toBe(SOURCE_HASHES[expression])
    }
  })
})
