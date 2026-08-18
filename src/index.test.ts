import { describe, expect, it } from 'vitest'
import { apply } from './index.ts'

describe('host plugin', () => {
  it('has an inert apply entry point', () => {
    expect(apply()).toBeUndefined()
  })
})

