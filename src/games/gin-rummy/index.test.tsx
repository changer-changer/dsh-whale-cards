import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameCompanionPort, GameStorage } from '../../breakroom/game-contract.ts'
import { isValidGameId } from '../../breakroom/game-contract.ts'
import { createGameStorage } from '../../breakroom/game-storage.ts'
import { findMissingManifestFields, loadResultIdMatches } from '../../breakroom/game-registry.ts'
import { createMatch } from '../../game/engine.ts'
import { DEFAULT_APP_STATE } from '../../game/persistence.ts'
import { GinRummyGame } from './GinRummyGame.tsx'
import { ginRummyManifest } from './manifest.ts'
import { migrateGinSave } from './migration.ts'
import { appStateToGinGameSave } from './save.ts'
import ginRummyDefinition from './index.ts'

function makeStorage(): GameStorage {
  return createGameStorage('gin-rummy')
}

function makeCompanion(): GameCompanionPort {
  return { say: vi.fn(), setMood: vi.fn(), openChat: vi.fn() }
}

/** Seeds a fresh, muted, tutorial-complete save so a single click starts a match. */
function seedPlayableState(): void {
  makeStorage().save(appStateToGinGameSave({
    ...DEFAULT_APP_STATE,
    preferences: { ...DEFAULT_APP_STATE.preferences, tutorialSeen: true, muted: true },
  }))
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('gin-rummy manifest', () => {
  it('registers a valid lowercase-kebab-case id', () => {
    expect(isValidGameId(ginRummyManifest.id)).toBe(true)
  })

  it('fills every registry-required manifest field', () => {
    expect(findMissingManifestFields(ginRummyManifest)).toEqual([])
  })
})

describe('gin-rummy GameDefinition', () => {
  it('binds a Game component to the same manifest id', () => {
    expect(ginRummyDefinition.manifest.id).toBe(ginRummyManifest.id)
    expect(typeof ginRummyDefinition.Game).toBe('function')
  })

  it('resolves from a dynamic import with a matching manifest id', async () => {
    const module = await import('./index.ts')
    const definition = module.default
    expect(loadResultIdMatches(ginRummyManifest, definition)).toBe(true)
  })

  it('registers the legacy-to-namespaced migration on the definition', () => {
    expect(ginRummyDefinition.migrate).toBe(migrateGinSave)
  })
})

describe('gin-rummy adapter smoke', () => {
  it('renders the welcome screen and returns to the hall via onExit', () => {
    const onExit = vi.fn()
    const view = render(
      <GinRummyGame storage={makeStorage()} companion={makeCompanion()} onExit={onExit} />,
    )

    expect(view.getByRole('button', { name: '入座开牌' })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: '返回大厅' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('starts a match through the existing controller and reaches the table', () => {
    seedPlayableState()
    const view = render(
      <GinRummyGame storage={makeStorage()} companion={makeCompanion()} onExit={() => undefined} />,
    )

    fireEvent.click(view.getByRole('button', { name: '入座开牌' }))

    expect(view.getByRole('region', { name: '与澜音的 Gin Rummy 牌桌' })).toBeTruthy()
  })

  it('wires the table chat affordance to the narrowed companion port', () => {
    seedPlayableState()
    const companion = makeCompanion()
    const view = render(
      <GinRummyGame storage={makeStorage()} companion={companion} onExit={() => undefined} />,
    )

    fireEvent.click(view.getByRole('button', { name: '入座开牌' }))
    fireEvent.click(view.getByRole('button', { name: '和澜音聊一句' }))

    expect(companion.openChat).toHaveBeenCalledTimes(1)
  })

  it('forwards dialogue and mood out through the narrowed companion port', () => {
    const companion = makeCompanion()
    render(
      <GinRummyGame storage={makeStorage()} companion={companion} onExit={() => undefined} />,
    )

    expect(companion.say).toHaveBeenCalled()
    expect(companion.setMood).toHaveBeenCalled()
  })

  it('restores a match from the namespaced GameStorage instead of the legacy key', () => {
    const match = createMatch(20260818)
    const gameStorage = createGameStorage('gin-rummy')
    gameStorage.save(appStateToGinGameSave({
      ...DEFAULT_APP_STATE,
      match,
      panelOpen: true,
      preferences: { ...DEFAULT_APP_STATE.preferences, muted: true, tutorialSeen: true },
    }))

    const view = render(
      <GinRummyGame storage={gameStorage} companion={makeCompanion()} onExit={() => undefined} />,
    )

    expect(view.getByRole('region', { name: '与澜音的 Gin Rummy 牌桌' })).toBeTruthy()
  })
})
