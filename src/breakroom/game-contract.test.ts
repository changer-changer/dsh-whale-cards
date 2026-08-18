import { describe, expect, expectTypeOf, it } from 'vitest'
import { GAME_ID_PATTERN, isValidGameId } from './game-contract.ts'
import type {
  CompanionMood,
  GameCompanionPort,
  GameDefinition,
  GameManifest,
  GameProps,
  GameStorage,
} from './game-contract.ts'

const VALID_IDS = [
  'gin-rummy',
  'reference-game',
  'a',
  '7',
  'a1-b2-c3',
  'tic-tac-toe-2',
] as const

const INVALID_IDS = [
  '',
  'Gin-Rummy',
  '-gin',
  'gin-',
  'gin--rummy',
  'gin_rummy',
  'gin rummy',
  'gin.rummy',
  'gin/rummy',
  'gin-rummy!',
  ' gin-rummy',
  'gin-rummy ',
] as const

describe('game contract: manifest id shape', () => {
  it('accepts lowercase-kebab-case ids', () => {
    for (const id of VALID_IDS) {
      expect(isValidGameId(id)).toBe(true)
    }
  })

  it('rejects ids outside the lowercase-kebab-case shape', () => {
    for (const id of INVALID_IDS) {
      expect(isValidGameId(id)).toBe(false)
    }
  })

  it('anchors the whole id instead of matching a substring', () => {
    expect(isValidGameId('prefix gin-rummy suffix')).toBe(false)
    expect(isValidGameId('gin-rummy\n')).toBe(false)
  })

  it('keeps isValidGameId consistent with GAME_ID_PATTERN', () => {
    const samples: readonly string[] = [...VALID_IDS, ...INVALID_IDS, 'pre-fix']
    for (const id of samples) {
      expect(isValidGameId(id)).toBe(GAME_ID_PATTERN.test(id))
    }
  })
})

describe('game contract: manifest completeness', () => {
  it('requires id, title, summary, cover, version, author and license', () => {
    expectTypeOf<GameManifest>().toHaveProperty('id').toEqualTypeOf<string>()
    expectTypeOf<GameManifest>().toHaveProperty('title').toEqualTypeOf<string>()
    expectTypeOf<GameManifest>().toHaveProperty('summary').toEqualTypeOf<string>()
    expectTypeOf<GameManifest>().toHaveProperty('coverUrl').toEqualTypeOf<string>()
    expectTypeOf<GameManifest>().toHaveProperty('version').toEqualTypeOf<string>()
    expectTypeOf<GameManifest>().toHaveProperty('author').toEqualTypeOf<string>()
    expectTypeOf<GameManifest>().toHaveProperty('license').toEqualTypeOf<string>()
  })

  it('keeps icon, estimated minutes and tags optional', () => {
    expectTypeOf<GameManifest>().toHaveProperty('iconUrl').toEqualTypeOf<string | undefined>()
    expectTypeOf<GameManifest>().toHaveProperty('estimatedMinutes')
      .toEqualTypeOf<readonly number[] | undefined>()
    expectTypeOf<GameManifest>().toHaveProperty('tags')
      .toEqualTypeOf<readonly string[] | undefined>()
  })

  it('accepts a manifest whose required fields are all non-empty with a valid id', () => {
    const manifest: GameManifest = {
      id: 'gin-rummy',
      title: 'Gin Rummy',
      summary: 'A two-player knock rummy game.',
      coverUrl: 'https://example.test/cover.jpg',
      version: '1.0.0',
      author: 'maintainer',
      license: 'MIT',
    }

    for (const field of ['id', 'title', 'summary', 'coverUrl', 'version', 'author', 'license'] as const) {
      expect(manifest[field]).not.toBe('')
    }
    expect(isValidGameId(manifest.id)).toBe(true)
  })
})

describe('game contract: storage and companion ports', () => {
  it('exposes load, save and clear on GameStorage', () => {
    expectTypeOf<GameStorage>().toHaveProperty('load').toBeFunction()
    expectTypeOf<GameStorage>().toHaveProperty('save').toBeFunction()
    expectTypeOf<GameStorage>().toHaveProperty('clear').toBeFunction()
  })

  it('returns unknown from load so games validate their own saves', () => {
    expectTypeOf<GameStorage>().toHaveProperty('load').returns.toEqualTypeOf<unknown>()
  })

  it('exposes exactly say, setMood and openChat on GameCompanionPort', () => {
    expectTypeOf<keyof GameCompanionPort>().toEqualTypeOf<'say' | 'setMood' | 'openChat'>()
  })

  it('narrows CompanionMood to the four documented expressions', () => {
    expectTypeOf<CompanionMood>().toEqualTypeOf<'calm' | 'thinking' | 'pleased' | 'concerned'>()
  })
})

describe('game contract: definition and props', () => {
  it('binds a GameDefinition to a manifest plus a Game component', () => {
    expectTypeOf<GameDefinition>().toHaveProperty('manifest').toEqualTypeOf<GameManifest>()
    expectTypeOf<GameDefinition>().toHaveProperty('Game')
  })

  it('passes storage, companion and onExit to a game', () => {
    expectTypeOf<GameProps>().toHaveProperty('storage').toEqualTypeOf<GameStorage>()
    expectTypeOf<GameProps>().toHaveProperty('companion').toEqualTypeOf<GameCompanionPort>()
    expectTypeOf<GameProps>().toHaveProperty('onExit').toBeFunction()
  })

  it('constructs a complete definition and props from the named exports', () => {
    const storage: GameStorage = {
      load: () => null,
      save: () => undefined,
      clear: () => undefined,
    }
    const companion: GameCompanionPort = {
      say: () => undefined,
      setMood: () => undefined,
      openChat: () => undefined,
    }
    const manifest: GameManifest = {
      id: 'gin-rummy',
      title: 'Gin Rummy',
      summary: 'A two-player knock rummy game.',
      coverUrl: 'https://example.test/cover.jpg',
      version: '1.0.0',
      author: 'maintainer',
      license: 'MIT',
    }
    const Game = () => null
    const onExit = () => undefined

    const definition: GameDefinition = { manifest, Game }
    const props: GameProps = { storage, companion, onExit }

    expect(definition.manifest.id).toBe(manifest.id)
    expect(definition.Game).toBe(Game)
    expect(props.storage).toBe(storage)
    expect(props.companion).toBe(companion)
    expect(props.onExit).toBe(onExit)
  })
})
