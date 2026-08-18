import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameErrorBoundary } from './GameErrorBoundary.tsx'

afterEach(cleanup)

function Bomb(): never {
  throw new Error('boom')
}

describe('GameErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    const view = render(
      <GameErrorBoundary gameTitle="参考游戏" onReturnToHall={() => undefined}>
        <p>healthy game</p>
      </GameErrorBoundary>,
    )
    expect(view.getByText('healthy game')).toBeTruthy()
    expect(view.queryByRole('alert')).toBeNull()
  })

  it('swallows a crashing child into its own error view', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const view = render(
      <GameErrorBoundary gameTitle="参考游戏" onReturnToHall={() => undefined}>
        <Bomb />
      </GameErrorBoundary>,
    )
    const alert = view.getByRole('alert')
    expect(alert.textContent).toContain('参考游戏 暂时出问题了')
    expect(view.queryByText('healthy game')).toBeNull()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('returns to the hall when the player confirms, and notifies the parent', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onReturnToHall = vi.fn()
    const view = render(
      <GameErrorBoundary gameTitle="参考游戏" onReturnToHall={onReturnToHall}>
        <Bomb />
      </GameErrorBoundary>,
    )
    fireEvent.click(view.getByRole('button', { name: '返回大厅' }))
    expect(onReturnToHall).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })

  it('lets the player retry after a crash', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let shouldThrow = true
    function Sometimes(): React.JSX.Element {
      if (shouldThrow) throw new Error('transient')
      return <p>recovered</p>
    }
    const view = render(
      <GameErrorBoundary gameTitle="参考游戏" onReturnToHall={() => undefined}>
        <Sometimes />
      </GameErrorBoundary>,
    )
    expect(view.getByRole('alert')).toBeTruthy()

    shouldThrow = false
    fireEvent.click(view.getByRole('button', { name: '重新尝试' }))
    expect(view.getByText('recovered')).toBeTruthy()
    expect(view.queryByRole('alert')).toBeNull()
    consoleError.mockRestore()
  })
})
