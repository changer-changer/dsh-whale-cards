import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameCompanionPort, GameProps } from './game-contract.ts'
import type { RegisteredGame } from './game-registry.ts'
import { gameStorageKey, type StorageLike } from './game-storage.ts'
import { GameRuntime } from './GameRuntime.tsx'

function memoryStorage(): StorageLike & { readonly map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

function makeCompanion(): GameCompanionPort {
  const say = vi.fn()
  const setMood = vi.fn()
  const openChat = vi.fn()
  return { say, setMood, openChat }
}

const fixtureManifest = {
  id: 'fixture-alpha',
  title: 'Fixture Alpha',
  summary: 'runtime test game',
  coverUrl: 'https://example.test/cover.jpg',
  version: '1.0.0',
  author: 'breakroom',
  license: 'MIT',
} as const

interface AlphaSave {
  readonly clicks: number
}

function FixtureAlphaGame({ storage, companion, onExit }: GameProps): React.JSX.Element {
  const raw = storage.load()
  const initial: AlphaSave =
    typeof raw === 'object' && raw !== null && 'clicks' in raw && typeof (raw as { clicks: unknown }).clicks === 'number'
      ? { clicks: (raw as { clicks: number }).clicks }
      : { clicks: 0 }
  return (
    <section aria-label="fixture-alpha">
      <p>clicks:{initial.clicks}</p>
      <button
        type="button"
        onClick={() => {
          storage.save({ clicks: initial.clicks + 1 } satisfies AlphaSave)
          companion.say('hi')
        }}
      >
        bump
      </button>
      <button type="button" onClick={onExit}>
        leave
      </button>
    </section>
  )
}

function makeRegistry(): readonly RegisteredGame[] {
  return [
    {
      manifest: fixtureManifest,
      load: async () => ({ manifest: fixtureManifest, Game: FixtureAlphaGame }),
    },
  ]
}

beforeEach(() => {
  // Keep jsdom localStorage clean between runs.
  localStorage.clear()
})
afterEach(cleanup)

describe('GameRuntime', () => {
  it('renders a registered game once its definition resolves', async () => {
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={makeCompanion()}
        onExit={() => undefined}
        registry={makeRegistry()}
      />,
    )
    expect(await view.findByText('clicks:0')).toBeTruthy()
  })

  it('reports unknown game ids with a path back to the hall', async () => {
    const onExit = vi.fn()
    const view = render(
      <GameRuntime
        gameId="ghost-game"
        companion={makeCompanion()}
        onExit={onExit}
        registry={makeRegistry()}
      />,
    )
    const alert = await view.findByRole('alert')
    expect(alert.textContent).toContain('没有找到这款游戏')
    fireEvent.click(view.getByRole('button', { name: '返回大厅' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('surfaces a registry load failure without crashing the shell', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing: readonly RegisteredGame[] = [
      {
        manifest: fixtureManifest,
        load: async () => {
          throw new Error('chunk exploded')
        },
      },
    ]
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={makeCompanion()}
        onExit={() => undefined}
        registry={failing}
      />,
    )
    const alert = await view.findByRole('alert')
    expect(alert.textContent).toContain('Fixture Alpha 装载失败')
    expect(alert.textContent).toContain('chunk exploded')
    consoleError.mockRestore()
  })

  it('isolates saves per game id under the namespaced key', async () => {
    const adapter = memoryStorage()
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={makeCompanion()}
        onExit={() => undefined}
        registry={makeRegistry()}
        storage={{ storage: adapter }}
      />,
    )
    await view.findByText('clicks:0')

    fireEvent.click(view.getByRole('button', { name: 'bump' }))

    await waitFor(() => {
      expect(adapter.map.get(gameStorageKey('fixture-alpha'))).toBe(JSON.stringify({ clicks: 1 }))
    })
    // A different game never sees this save.
    expect(adapter.map.has(gameStorageKey('other-game'))).toBe(false)
  })

  it('forwards companion calls from the game verbatim', async () => {
    const companion = makeCompanion()
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={companion}
        onExit={() => undefined}
        registry={makeRegistry()}
      />,
    )
    await view.findByText('clicks:0')

    fireEvent.click(view.getByRole('button', { name: 'bump' }))

    await waitFor(() => {
      expect(companion.say).toHaveBeenCalledWith('hi')
    })
  })

  it('invokes onExit when the game asks to leave', async () => {
    const onExit = vi.fn()
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={makeCompanion()}
        onExit={onExit}
        registry={makeRegistry()}
      />,
    )
    await view.findByText('clicks:0')

    fireEvent.click(view.getByRole('button', { name: 'leave' }))

    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('keeps the save when the runtime unmounts so re-entry restores state', async () => {
    const adapter = memoryStorage()
    const companion = makeCompanion()
    const first = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={companion}
        onExit={() => undefined}
        registry={makeRegistry()}
        storage={{ storage: adapter }}
      />,
    )
    await first.findByText('clicks:0')
    fireEvent.click(first.getByRole('button', { name: 'bump' }))
    await waitFor(() => {
      expect(adapter.map.get(gameStorageKey('fixture-alpha'))).toBe(JSON.stringify({ clicks: 1 }))
    })

    first.unmount()

    const second = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={companion}
        onExit={() => undefined}
        registry={makeRegistry()}
        storage={{ storage: adapter }}
      />,
    )
    expect(await second.findByText('clicks:1')).toBeTruthy()
  })

  it('invokes the definition migrate hook against the shared storage before rendering', async () => {
    const adapter = memoryStorage()
    const migratedKeys: string[] = []
    const migrating: readonly RegisteredGame[] = [
      {
        manifest: fixtureManifest,
        load: async () => ({
          manifest: fixtureManifest,
          migrate: (storage: StorageLike) => {
            storage.setItem(gameStorageKey('fixture-alpha'), JSON.stringify({ clicks: 9 }))
            migratedKeys.push(gameStorageKey('fixture-alpha'))
          },
          Game: FixtureAlphaGame,
        }),
      },
    ]
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={makeCompanion()}
        onExit={() => undefined}
        registry={migrating}
        storage={{ storage: adapter }}
      />,
    )

    expect(await view.findByText('clicks:9')).toBeTruthy()
    expect(migratedKeys).toEqual([gameStorageKey('fixture-alpha')])
  })

  it('emits a single storage failure notice when serialization fails', async () => {
    const onStorageFailure = vi.fn()
    function BrokenSaveGame({ storage }: GameProps): React.JSX.Element {
      return (
        <button
          type="button"
          onClick={() => {
            const cyclic: { self?: unknown } = {}
            cyclic.self = cyclic
            storage.save(cyclic)
          }}
        >
          save broken
        </button>
      )
    }
    const broken: readonly RegisteredGame[] = [
      {
        manifest: fixtureManifest,
        load: async () => ({ manifest: fixtureManifest, Game: BrokenSaveGame }),
      },
    ]
    const view = render(
      <GameRuntime
        gameId="fixture-alpha"
        companion={makeCompanion()}
        onExit={() => undefined}
        registry={broken}
        onStorageFailure={onStorageFailure}
      />,
    )
    const button = await view.findByRole('button', { name: 'save broken' })
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    expect(onStorageFailure).toHaveBeenCalledTimes(1)
    expect(onStorageFailure).toHaveBeenCalledWith({ kind: 'serialization' })
  })
})
