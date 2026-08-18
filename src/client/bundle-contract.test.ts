import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('DSH browser bundle contract', () => {
  it('does not leave zod as a runtime require outside the DSH module table', async () => {
    const bundle = await readFile(resolve(process.cwd(), 'lib/client.js'), 'utf8')

    expect(bundle).not.toMatch(/require\((["'])zod\1\)/)
  })
})
