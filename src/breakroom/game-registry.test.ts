import { describe, expect, expectTypeOf, it } from 'vitest'
import { isValidGameId } from './game-contract.ts'
import type { GameDefinition, GameManifest } from './game-contract.ts'
import {
  FIXTURE_GAME_IDS,
  GAME_REGISTRY,
  REQUIRED_MANIFEST_FIELDS,
  findDuplicateGameIds,
  findFixtureEntries,
  findMissingManifestFields,
  isFixtureGameId,
  loadResultIdMatches,
  validateGameId,
  validateProductionLoads,
  validateProductionRegistry,
} from './game-registry.ts'
import type { RegisteredGame } from './game-registry.ts'

/** A manifest with every required field non-empty and a valid id. */
function makeManifest(overrides: Partial<GameManifest> = {}): GameManifest {
  return {
    id: 'gin-rummy',
    title: 'Gin Rummy',
    summary: 'A two-player knock rummy game.',
    coverUrl: 'https://example.test/cover.jpg',
    version: '1.0.0',
    author: 'maintainer',
    license: 'MIT',
    ...overrides,
  }
}

/** A registered game whose load resolves a definition with the same manifest. */
function makeGame(manifest: GameManifest = makeManifest()): RegisteredGame {
  return {
    manifest,
    load: async () => ({ manifest, Game: () => null }),
  }
}

describe('game registry: RegisteredGame shape', () => {
  it('binds a manifest to an async loader returning a GameDefinition', () => {
    expectTypeOf<RegisteredGame>().toHaveProperty('manifest').toEqualTypeOf<GameManifest>()
    expectTypeOf<RegisteredGame>()
      .toHaveProperty('load')
      .returns.toEqualTypeOf<Promise<GameDefinition>>()
  })

  it('keeps GAME_REGISTRY typed as a readonly list of RegisteredGame', () => {
    expectTypeOf<typeof GAME_REGISTRY>().toMatchTypeOf<readonly RegisteredGame[]>()
  })
})

describe('game registry: id format', () => {
  it('returns null for a valid lowercase-kebab-case id', () => {
    expect(validateGameId('gin-rummy')).toBeNull()
    expect(validateGameId('a1-b2-c3')).toBeNull()
  })

  it('returns a reason for an id outside the shape', () => {
    for (const id of ['', 'Gin-Rummy', 'gin_rummy', '-gin', 'gin-', 'gin--rummy']) {
      expect(validateGameId(id)).not.toBeNull()
    }
  })

  it('stays consistent with isValidGameId', () => {
    for (const id of ['gin-rummy', 'reference-game', '', 'Gin-Rummy', 'gin rummy']) {
      expect(validateGameId(id) === null).toBe(isValidGameId(id))
    }
  })
})

describe('game registry: unique ids', () => {
  it('finds no duplicates in a registry of distinct ids', () => {
    const registry = [makeGame(makeManifest({ id: 'gin-rummy' })), makeGame(makeManifest({ id: 'reference-game' }))]
    expect(findDuplicateGameIds(registry)).toEqual([])
  })

  it('reports a duplicated id exactly once', () => {
    const registry = [
      makeGame(makeManifest({ id: 'gin-rummy' })),
      makeGame(makeManifest({ id: 'gin-rummy' })),
      makeGame(makeManifest({ id: 'gin-rummy' })),
    ]
    expect(findDuplicateGameIds(registry)).toEqual(['gin-rummy'])
  })

  it('returns an empty list for an empty registry', () => {
    expect(findDuplicateGameIds([])).toEqual([])
  })
})

describe('game registry: required manifest fields', () => {
  it('reports nothing for a complete manifest', () => {
    expect(findMissingManifestFields(makeManifest())).toEqual([])
  })

  it('flags every required field when it is empty', () => {
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      expect(findMissingManifestFields(makeManifest({ [field]: '' }))).toContain(field)
    }
  })

  it('treats whitespace-only values as missing', () => {
    expect(findMissingManifestFields(makeManifest({ title: '   ' }))).toContain('title')
  })
})

describe('game registry: load result id matching', () => {
  it('accepts a definition whose manifest id matches the registered manifest', () => {
    const manifest = makeManifest()
    const definition: GameDefinition = { manifest, Game: () => null }
    expect(loadResultIdMatches(manifest, definition)).toBe(true)
  })

  it('rejects a definition carrying a different manifest id', () => {
    const manifest = makeManifest({ id: 'gin-rummy' })
    const other = makeManifest({ id: 'reference-game' })
    const definition: GameDefinition = { manifest: other, Game: () => null }
    expect(loadResultIdMatches(manifest, definition)).toBe(false)
  })

  it('resolves load() to a matching id end to end', async () => {
    const game = makeGame()
    const definition = await game.load()
    expect(loadResultIdMatches(game.manifest, definition)).toBe(true)
  })
})

describe('game registry: fixture exclusion', () => {
  it('reserves reference-game as a fixture id', () => {
    expect(FIXTURE_GAME_IDS).toContain('reference-game')
    expect(isFixtureGameId('reference-game')).toBe(true)
    expect(isFixtureGameId('gin-rummy')).toBe(false)
  })

  it('separates fixture entries from production entries', () => {
    const registry = [
      makeGame(makeManifest({ id: 'gin-rummy' })),
      makeGame(makeManifest({ id: 'reference-game' })),
    ]
    const fixtures = findFixtureEntries(registry)
    expect(fixtures.map(({ manifest }) => manifest.id)).toEqual(['reference-game'])
  })

  it('ships no fixture entries in the production registry', () => {
    expect(findFixtureEntries(GAME_REGISTRY)).toEqual([])
  })
})

describe('game registry: production invariants', () => {
  it('flags an invalid id, a missing field, a duplicate and a fixture', () => {
    const registry = [
      { manifest: makeManifest({ id: 'Bad Id' }), load: () => makeGame().load() },
      makeGame(makeManifest({ id: 'gin-rummy', title: '' })),
      makeGame(makeManifest({ id: 'gin-rummy' })),
      makeGame(makeManifest({ id: 'reference-game' })),
    ]
    const reasons = validateProductionRegistry(registry).map(({ reason }) => reason)

    expect(reasons.some((r) => r.includes('must match the lowercase-kebab-case shape'))).toBe(true)
    expect(reasons.some((r) => r.includes('"title" must be non-empty'))).toBe(true)
    expect(reasons.some((r) => r.includes('registered more than once'))).toBe(true)
    expect(reasons.some((r) => r.includes('must not ship in the production registry'))).toBe(true)
  })

  it('reports no issues for a clean registry', () => {
    const registry = [makeGame(makeManifest({ id: 'gin-rummy' }))]
    expect(validateProductionRegistry(registry)).toEqual([])
  })

  it('keeps the production registry free of static issues', () => {
    expect(validateProductionRegistry(GAME_REGISTRY)).toEqual([])
    expect(findDuplicateGameIds(GAME_REGISTRY)).toEqual([])
  })

  it('resolves every production load to a matching id', async () => {
    expect(await validateProductionLoads(GAME_REGISTRY)).toEqual([])
  })

  it('reports a load whose id mismatches the registered manifest', async () => {
    const registry: readonly RegisteredGame[] = [
      {
        manifest: makeManifest({ id: 'gin-rummy' }),
        load: async () => ({ manifest: makeManifest({ id: 'reference-game' }), Game: () => null }),
      },
    ]
    const issues = await validateProductionLoads(registry)
    expect(issues.map(({ reason }) => reason).some((r) => r.includes('expected "gin-rummy"'))).toBe(true)
  })

  it('reports a load that rejects instead of throwing', async () => {
    const registry: readonly RegisteredGame[] = [
      {
        manifest: makeManifest({ id: 'gin-rummy' }),
        load: async () => {
          throw new Error('module missing')
        },
      },
    ]
    const issues = await validateProductionLoads(registry)
    expect(issues.map(({ reason }) => reason).some((r) => r.includes('module missing'))).toBe(true)
  })
})
