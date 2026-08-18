import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Per-game error boundary (spec §16.2, slice B). A crashing game only renders
 * its own error view inside the runtime; the hall, the launcher, the shell
 * chrome and the companion panel stay mounted and usable.
 */

export interface GameErrorBoundaryProps {
  readonly children: ReactNode
  /** Human-readable game title used in the fallback error view. */
  readonly gameTitle: string
  /** Called when the player asks to leave the broken game for the hall. */
  readonly onReturnToHall: () => void
}

interface GameErrorBoundaryState {
  readonly failed: boolean
}

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  override state: GameErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfacing the crash keeps it observable in tests and in real DSH consoles
    // without taking the rest of the breakroom down.
    console.error('[breakroom] game crashed', error, info.componentStack)
  }

  private readonly reset = (): void => {
    this.setState({ failed: false })
  }

  private readonly returnToHall = (): void => {
    this.reset()
    this.props.onReturnToHall()
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="dwc-breakroom-error" role="alert">
        <strong>{this.props.gameTitle} 暂时出问题了</strong>
        <p>这款游戏刚刚崩掉了，但大厅、澜音和存档都还在。你可以返回大厅继续别的，或者稍后重新进入。</p>
        <div className="dwc-breakroom-error__actions">
          <button type="button" className="dwc-button dwc-button--primary" onClick={this.returnToHall}>
            返回大厅
          </button>
          <button type="button" className="dwc-button" onClick={this.reset}>
            重新尝试
          </button>
        </div>
      </div>
    )
  }
}
