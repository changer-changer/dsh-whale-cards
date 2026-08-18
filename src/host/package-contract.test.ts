import { describe, expect, it } from 'vitest'
import manifest from '../../package.json'

describe('published DSH bundle contract', () => {
  it('publishes strict Typert faces and requests the rc.7 Client services it uses', () => {
    expect(manifest.exports['./typert']).toBe('./lib/typert.host.js')
    expect(manifest.exports['./remote']).toBe('./lib/typert.remote-client.js')
    expect(manifest.dsh.client.inject).toEqual([
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-connection',
      '@deepseek-ai/dsh-api-remotes',
    ])
  })
})
