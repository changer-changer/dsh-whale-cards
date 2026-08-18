import { useEffect, useState } from 'react'
import type { GameDefinition, GameManifest, GameProps } from '../../breakroom/game-contract.ts'

/**
 * Reference fixture game (spec §4.1.10). Proves the game seam is not
 * Gin-specific: a tiny click counter built only from `GameProps` — no cards,
 * no match engine, no DSH adapters. The id is reserved for dev/test use and
 * this module is never admitted to the production `GAME_REGISTRY`.
 */

export const REFERENCE_GAME_ID = 'reference-game'

/**
 * Custom window event the fixture subscribes to. One listener must be active
 * per mounted game: a StrictMode double mount nets to exactly one, and
 * unmounting removes it, so tests can observe effect cleanup balance.
 */
export const REFERENCE_GAME_BUMP_EVENT = 'reference-game:bump'

const manifest: GameManifest = {
  id: REFERENCE_GAME_ID,
  title: '参考游戏',
  summary: '一个极小的点数 fixture，证明游戏接口不绑定任何牌局概念。',
  coverUrl: 'https://example.test/reference-game/cover.jpg',
  version: '1.0.0',
  author: 'dsh-whale-cards maintainers',
  license: 'MIT',
  tags: ['fixture'],
}

interface ReferenceSave {
  readonly count: number
}

/** Games validate their own saves: anything but a non-negative integer count starts fresh. */
function parseSave(raw: unknown): ReferenceSave {
  if (typeof raw === 'object' && raw !== null && 'count' in raw) {
    const { count } = raw as { count: unknown }
    if (typeof count === 'number' && Number.isInteger(count) && count >= 0) {
      return { count }
    }
  }
  return { count: 0 }
}

export function ReferenceGame({ storage, companion, onExit }: GameProps) {
  const [count, setCount] = useState(() => parseSave(storage.load()).count)

  useEffect(() => {
    const bump = (): void => setCount((current) => current + 1)
    window.addEventListener(REFERENCE_GAME_BUMP_EVENT, bump)
    return () => window.removeEventListener(REFERENCE_GAME_BUMP_EVENT, bump)
  }, [])

  const increment = (): void => {
    const next = count + 1
    setCount(next)
    storage.save({ count: next } satisfies ReferenceSave)
    companion.setMood('pleased')
  }

  return (
    <section aria-label="参考游戏">
      <p>点数：{count}</p>
      <button type="button" onClick={increment}>加一</button>
      <button type="button" onClick={() => companion.say('这只是参考游戏，放松点。')}>和澜音说一句</button>
      <button type="button" onClick={companion.openChat}>打开聊天</button>
      <button type="button" onClick={onExit}>返回大厅</button>
    </section>
  )
}

const referenceGame: GameDefinition = { manifest, Game: ReferenceGame }
export default referenceGame
