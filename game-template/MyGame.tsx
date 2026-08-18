import { useState } from 'react'
import type { GameProps } from '../src/breakroom/game-contract.ts'

/**
 * Tiny starter game (spec §7 `game-template/`). Copy this directory into
 * `src/games/<your-game-id>/`, rename the identifiers, and replace the body
 * with a real game. The game receives ONLY `GameProps` (storage, companion,
 * onExit) and must never import platform internals beyond the public game seam.
 */

export interface MyGameSave {
  readonly count: number
}

/** Games validate their own saves: anything but a non-negative integer starts fresh. */
export function parseSave(raw: unknown): MyGameSave {
  if (typeof raw === 'object' && raw !== null && 'count' in raw) {
    const { count } = raw as { count: unknown }
    if (typeof count === 'number' && Number.isInteger(count) && count >= 0) {
      return { count }
    }
  }
  return { count: 0 }
}

export function MyGame({ storage, companion, onExit }: GameProps) {
  const [count, setCount] = useState(() => parseSave(storage.load()).count)

  const increment = (): void => {
    const next = count + 1
    setCount(next)
    storage.save({ count: next } satisfies MyGameSave)
    companion.setMood('pleased')
  }

  const reset = (): void => {
    setCount(0)
    storage.clear()
  }

  return (
    <section aria-label="My Game">
      <p>Count: {count}</p>
      <button type="button" onClick={increment}>Add one</button>
      <button type="button" onClick={reset}>Reset</button>
      <button type="button" onClick={() => companion.say('Hello from the template game.')}>
        Say hi
      </button>
      <button type="button" onClick={onExit}>Back to hall</button>
    </section>
  )
}
