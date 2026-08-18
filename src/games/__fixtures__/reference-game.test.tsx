import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameCompanionPort, GameProps } from '../../breakroom/game-contract.ts'
import {
  GAME_REGISTRY,
  findFixtureEntries,
  findMissingManifestFields,
  isFixtureGameId,
  validateGameId,
  validateProductionRegistry,
} from '../../breakroom/game-registry.ts'
import { createGameStorage, type StorageLike } from '../../breakroom/game-storage.ts'
import referenceGame, {
  REFERENCE_GAME_BUMP_EVENT,
  REFERENCE_GAME_ID,
  ReferenceGame,
} from './reference-game.tsx'

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
  const storage = createGameStorage(REFERENCE_GAME_ID, { storage: adapter })
  const companion: GameCompanionPort = { say: vi.fn(), setMood: vi.fn(), openChat: vi.fn() }
  const onExit = vi.fn()
  const props: GameProps = { storage, companion, onExit }
  return { props, storage, companion, onExit }
}

function dispatchBump(): void {
  act(() => {
    window.dispatchEvent(new Event(REFERENCE_GAME_BUMP_EVENT))
  })
}

describe('reference fixture: definition shape', () => {
  it('ships a complete, valid manifest on the reserved fixture id', () => {
    expect(referenceGame.manifest.id).toBe(REFERENCE_GAME_ID)
    expect(validateGameId(referenceGame.manifest.id)).toBeNull()
    expect(findMissingManifestFields(referenceGame.manifest)).toEqual([])
    expect(isFixtureGameId(referenceGame.manifest.id)).toBe(true)
    expect(referenceGame.Game).toBe(ReferenceGame)
  })
})

describe('reference fixture: StrictMode mount/unmount cleanup', () => {
  it('nets exactly one bump listener after a StrictMode double mount', () => {
    const { props } = makeHarness()
    const view = render(
      <StrictMode>
        <ReferenceGame {...props} />
      </StrictMode>,
    )

    dispatchBump()

    expect(view.getByText('点数：1')).toBeTruthy()
  })

  it('drops the listener on unmount so a remounted game bumps by one again', () => {
    const first = render(
      <StrictMode>
        <ReferenceGame {...makeHarness().props} />
      </StrictMode>,
    )
    first.unmount()

    const second = render(
      <StrictMode>
        <ReferenceGame {...makeHarness().props} />
      </StrictMode>,
    )
    dispatchBump()

    expect(second.getByText('点数：1')).toBeTruthy()
  })
})

describe('reference fixture: save and restore', () => {
  it('saves the count through namespaced storage on every increment', () => {
    const { props, storage } = makeHarness()
    const view = render(<ReferenceGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: '加一' }))
    fireEvent.click(view.getByRole('button', { name: '加一' }))

    expect(storage.load()).toEqual({ count: 2 })
  })

  it('restores a saved count on mount', () => {
    const { props, storage } = makeHarness()
    storage.save({ count: 5 })

    const view = render(<ReferenceGame {...props} />)

    expect(view.getByText('点数：5')).toBeTruthy()
  })

  it('starts from zero when the save fails the game’s own validation', () => {
    const { props, storage } = makeHarness()
    storage.save('not-a-reference-save')

    const view = render(<ReferenceGame {...props} />)

    expect(view.getByText('点数：0')).toBeTruthy()
  })
})

describe('reference fixture: companion port and exit', () => {
  it('reaches the companion through say, setMood and openChat only', () => {
    const { props, companion } = makeHarness()
    const view = render(<ReferenceGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: '加一' }))
    expect(companion.setMood).toHaveBeenCalledWith('pleased')

    fireEvent.click(view.getByRole('button', { name: '和澜音说一句' }))
    expect(companion.say).toHaveBeenCalledWith('这只是参考游戏，放松点。')

    fireEvent.click(view.getByRole('button', { name: '打开聊天' }))
    expect(companion.openChat).toHaveBeenCalledTimes(1)
  })

  it('invokes onExit when returning to the hall and keeps the save', () => {
    const { props, storage, onExit } = makeHarness()
    const view = render(<ReferenceGame {...props} />)

    fireEvent.click(view.getByRole('button', { name: '加一' }))
    fireEvent.click(view.getByRole('button', { name: '返回大厅' }))

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(storage.load()).toEqual({ count: 1 })
  })
})

describe('reference fixture: production registry exclusion', () => {
  it('stays out of the production registry', () => {
    expect(GAME_REGISTRY.some(({ manifest }) => manifest.id === REFERENCE_GAME_ID)).toBe(false)
    expect(findFixtureEntries(GAME_REGISTRY)).toEqual([])
    expect(validateProductionRegistry(GAME_REGISTRY)).toEqual([])
  })
})
