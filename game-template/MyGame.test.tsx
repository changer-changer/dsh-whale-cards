import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameCompanionPort, GameProps } from '../src/breakroom/game-contract.ts'
import {
  findMissingManifestFields,
  GAME_REGISTRY,
  validateGameId,
  validateProductionRegistry,
} from '../src/breakroom/game-registry.ts'
import { createGameStorage, type StorageLike } from '../src/breakroom/game-storage.ts'
import { GameHall } from '../src/breakroom/GameHall.tsx'
import myGameDefinition, { DEV_REGISTRY, MyGame, myGameManifest } from './index.ts'

const MY_GAME_ID = 'my-game'

afterEach(cleanup)

/** Real namespaced storage over an in-memory map, plus a spyable companion port. */
function makeHarness() {
  const map = new Map<string, string>()
  const adapter: StorageLike = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
  const storage = createGameStorage(MY_GAME_ID, { storage: adapter })
  const companion: GameCompanionPort = { say: vi.fn(), setMood: vi.fn(), openChat: vi.fn() }
  const onExit = vi.fn()
  const props: GameProps = { storage, companion, onExit }
  return { props, storage, companion, onExit }
}

describe('template game: definition shape', () => {
  it('ships a valid manifest and a Game component built only from GameProps', () => {
    expect(myGameDefinition.manifest).toBe(myGameManifest)
    expect(myGameDefinition.Game).toBe(MyGame)
    expect(myGameDefinition.manifest.id).toBe(MY_GAME_ID)
    expect(validateGameId(myGameManifest.id)).toBeNull()
    expect(findMissingManifestFields(myGameManifest)).toEqual([])
  })
})

describe('template game: save and restore', () => {
  it('saves through namespaced storage on every increment', () => {
    const { props, storage } = makeHarness()
    const view = render(<MyGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'Add one' }))
    fireEvent.click(view.getByRole('button', { name: 'Add one' }))

    expect(storage.load()).toEqual({ count: 2 })
  })

  it('restores a saved count on mount', () => {
    const { props, storage } = makeHarness()
    storage.save({ count: 5 })

    const view = render(<MyGame {...props} />)

    expect(view.getByText('Count: 5')).toBeTruthy()
  })

  it('starts from zero when the save fails the game own validation', () => {
    const { props, storage } = makeHarness()
    storage.save('not-a-count')

    const view = render(<MyGame {...props} />)

    expect(view.getByText('Count: 0')).toBeTruthy()
  })

  it('clears the save on reset', () => {
    const { props, storage } = makeHarness()
    storage.save({ count: 5 })
    const view = render(<MyGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'Reset' }))

    expect(view.getByText('Count: 0')).toBeTruthy()
    expect(storage.load()).toBeNull()
  })
})

describe('template game: companion port and exit', () => {
  it('reaches the companion through say and setMood only', () => {
    const { props, companion } = makeHarness()
    const view = render(<MyGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'Add one' }))
    expect(companion.setMood).toHaveBeenCalledWith('pleased')

    fireEvent.click(view.getByRole('button', { name: 'Say hi' }))
    expect(companion.say).toHaveBeenCalledWith('Hello from the template game.')
  })

  it('invokes onExit when returning to the hall and keeps the save', () => {
    const { props, storage, onExit } = makeHarness()
    const view = render(<MyGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'Add one' }))
    fireEvent.click(view.getByRole('button', { name: 'Back to hall' }))

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(storage.load()).toEqual({ count: 1 })
  })
})

describe('template game: dev registry flow', () => {
  it('appears in the dev registry, not the production registry', () => {
    expect(DEV_REGISTRY.some(({ manifest }) => manifest.id === MY_GAME_ID)).toBe(true)
    expect(GAME_REGISTRY.some(({ manifest }) => manifest.id === MY_GAME_ID)).toBe(false)
    expect(validateProductionRegistry(GAME_REGISTRY)).toEqual([])
  })

  it('renders its hall card from the dev registry', () => {
    const view = render(<GameHall onSelectGame={vi.fn()} registry={DEV_REGISTRY} />)

    expect(view.getByRole('heading', { name: 'My Game' })).toBeTruthy()
    expect(view.getByRole('button', { name: '开始 My Game' })).toBeTruthy()
  })
})
