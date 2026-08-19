import { describe, expect, it } from 'vitest'
import { TEAHOUSE_CHANNEL } from './teahouse/types.ts'

describe('host plugin', () => {
  it('declares the teahouse RPC channel id', () => {
    expect(TEAHOUSE_CHANNEL).toBe('/teahouse')
  })
})

