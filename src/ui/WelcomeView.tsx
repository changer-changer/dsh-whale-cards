import type { PlayerStats } from '../game/persistence.ts'

export interface WelcomeViewProps {
  readonly artUrl: string
  readonly stats: PlayerStats
  readonly onStart: () => void
  readonly onRules: () => void
}

export function WelcomeView({ artUrl, stats, onStart, onRules }: WelcomeViewProps) {
  const winRate = stats.matchesPlayed === 0
    ? '—'
    : `${Math.round((stats.matchesWon / stats.matchesPlayed) * 100)}%`

  return (
    <main className="dwc-welcome">
      <div className="dwc-welcome__art" aria-hidden="true">
        <img src={artUrl} alt="" draggable={false} />
        <span />
      </div>

      <section className="dwc-welcome__content" aria-labelledby="dwc-welcome-title">
        <div className="dwc-welcome__copy">
          <span className="dwc-eyebrow">DSH / BREAK SESSION · 08—12 MIN</span>
          <h1 id="dwc-welcome-title">鲸牌茶歇</h1>
          <p className="dwc-welcome__lede">
            等待任务的时候，来港湾茶室和澜音打一局。三手 Gin Rummy，思考适中，随时收起，回来还能接着玩。
          </p>
          <div className="dwc-welcome__features" aria-label="游戏特点">
            <span>三手一局</span>
            <span>本地自动保存</span>
            <span>无需联网</span>
          </div>
          <div className="dwc-welcome__actions">
            <button type="button" className="dwc-button dwc-button--primary dwc-button--large" onClick={onStart}>
              入座开牌
              <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="dwc-button dwc-button--quiet" onClick={onRules}>
              先看规则
            </button>
          </div>
        </div>

        <div className="dwc-welcome__footer">
          <div className="dwc-welcome__companion">
            <span className="dwc-avatar" aria-hidden="true">蓝</span>
            <p><strong>澜音</strong><span>“不赶时间。我们把这一手打漂亮。”</span></p>
          </div>
          <dl className="dwc-stats" aria-label="你的牌局记录">
            <div><dt>完成牌局</dt><dd>{stats.matchesPlayed}</dd></div>
            <div><dt>胜率</dt><dd>{winRate}</dd></div>
            <div><dt>熟悉度</dt><dd>{Math.max(0, Math.min(100, stats.rapport))}</dd></div>
          </dl>
        </div>
      </section>
    </main>
  )
}
