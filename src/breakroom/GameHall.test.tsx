import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RegisteredGame } from './game-registry.ts'
import { gameStorageKey, type StorageLike } from './game-storage.ts'
import { GameHall } from './GameHall.tsx'

afterEach(cleanup)

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

function makeRegistry(): readonly RegisteredGame[] {
  return [
    {
      manifest: {
        id: 'alpha-game',
        title: 'Alpha',
        summary: 'first fixture',
        coverUrl: 'https://example.test/alpha.jpg',
        version: '1.0.0',
        author: 'breakroom',
        license: 'MIT',
        estimatedMinutes: [5, 8],
        tags: ['puzzle'],
      },
      load: async () => {
        throw new Error('hall must not load game code')
      },
    },
    {
      manifest: {
        id: 'beta-game',
        title: 'Beta',
        summary: 'second fixture',
        coverUrl: 'https://example.test/beta.jpg',
        version: '0.1.0',
        author: 'breakroom',
        license: 'MIT',
      },
      load: async () => {
        throw new Error('hall must not load game code')
      },
    },
  ]
}

describe('GameHall', () => {
  it('renders one card per registered game without loading any game code', () => {
    const view = render(<GameHall onSelectGame={() => undefined} registry={makeRegistry()} />)
    expect(view.getByRole('heading', { name: 'Alpha' })).toBeTruthy()
    expect(view.getByRole('heading', { name: 'Beta' })).toBeTruthy()
    expect(view.getByText('first fixture')).toBeTruthy()
    expect(view.getByText('约 5–8 分钟')).toBeTruthy()
  })

  it('shows 开始 when no save exists and 继续 when a save is present', () => {
    const adapter = memoryStorage()
    adapter.map.set(gameStorageKey('alpha-game'), JSON.stringify({ level: 3 }))
    const view = render(
      <GameHall onSelectGame={() => undefined} registry={makeRegistry()} storage={{ storage: adapter }} />,
    )
    expect(view.getByRole('button', { name: '继续 Alpha' })).toBeTruthy()
    expect(view.getByRole('button', { name: '开始 Beta' })).toBeTruthy()
  })

  it('treats a corrupt save as no save so the CTA reads 开始', () => {
    const adapter = memoryStorage()
    adapter.map.set(gameStorageKey('alpha-game'), '{ not valid json')
    const view = render(
      <GameHall onSelectGame={() => undefined} registry={makeRegistry()} storage={{ storage: adapter }} />,
    )
    expect(view.getByRole('button', { name: '开始 Alpha' })).toBeTruthy()
  })

  it('calls onSelectGame with the manifest id when a card CTA is clicked', () => {
    const onSelectGame = vi.fn()
    const view = render(<GameHall onSelectGame={onSelectGame} registry={makeRegistry()} />)
    fireEvent.click(view.getByRole('button', { name: '开始 Alpha' }))
    expect(onSelectGame).toHaveBeenCalledWith('alpha-game')
    fireEvent.click(view.getByRole('button', { name: '开始 Beta' }))
    expect(onSelectGame).toHaveBeenCalledWith('beta-game')
  })

  it('marks the last-played card so players see where to resume', () => {
    const view = render(
      <GameHall onSelectGame={() => undefined} registry={makeRegistry()} lastPlayedGameId="alpha-game" />,
    )
    const flag = view.getByText('上次在玩')
    const card = flag.closest('li')
    expect(card?.className).toContain('dwc-breakroom-card--last-played')
  })

  it('renders zero fake install, download, rating or update affordances', () => {
    const view = render(<GameHall onSelectGame={() => undefined} registry={makeRegistry()} />)
    expect(view.queryByRole('button', { name: /安装/ })).toBeNull()
    expect(view.queryByRole('button', { name: /下载/ })).toBeNull()
    expect(view.queryByRole('button', { name: /评分/ })).toBeNull()
    expect(view.queryByRole('button', { name: /更新/ })).toBeNull()
  })
})
