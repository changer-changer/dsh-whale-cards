import { useEffect, useId, useRef } from 'react'

export interface RulesPanelProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onStart?: () => void
}

export function RulesPanel({ open, onClose, onStart }: RulesPanelProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const rootNode = panelRef.current?.getRootNode()
    const activeElement = rootNode instanceof ShadowRoot ? rootNode.activeElement : document.activeElement
    const previousFocus = activeElement instanceof HTMLElement ? activeElement : null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || panelRef.current === null) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      const currentActive = rootNode instanceof ShadowRoot ? rootNode.activeElement : document.activeElement
      if (event.shiftKey && currentActive === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && currentActive === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="dwc-overlay"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}
    >
      <section
        ref={panelRef}
        className="dwc-dialog dwc-rules"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="dwc-dialog__header">
          <div>
            <span className="dwc-eyebrow">GIN RUMMY / QUICK GUIDE</span>
            <h2 id={titleId}>两分钟看懂牌桌</h2>
          </div>
          <button ref={closeRef} type="button" className="dwc-icon-button" onClick={onClose} aria-label="关闭规则">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <p id={descriptionId} className="dwc-dialog__intro">
          目标是把手牌整理成顺子或同点组合，让剩下的散牌分尽可能低。这里采用三手短局，适合一次任务等待。
        </p>

        <ol className="dwc-rules__steps">
          <li><span>01</span><div><strong>摸一张</strong><p>轮到你时，从牌堆摸一张，或拿起桌面的明牌。</p></div></li>
          <li><span>02</span><div><strong>整理组合</strong><p>三张以上连续同花色是顺子；三或四张同点数是同点组。A 只能作为低牌。</p></div></li>
          <li><span>03</span><div><strong>弃一张</strong><p>手里留十张牌。刚拿起的明牌不能在同一轮立刻弃回。</p></div></li>
          <li><span>04</span><div><strong>敲牌结算</strong><p>弃牌后散牌不超过 10 点即可敲牌；散牌为 0 就是 Gin。</p></div></li>
        </ol>

        <div className="dwc-rules__grid">
          <section>
            <h3>散牌点数</h3>
            <dl>
              <div><dt>A</dt><dd>1 点</dd></div>
              <div><dt>2—10</dt><dd>牌面点数</dd></div>
              <div><dt>J / Q / K</dt><dd>10 点</dd></div>
            </dl>
          </section>
          <section>
            <h3>计分方式</h3>
            <dl>
              <div><dt>普通敲牌</dt><dd>双方散牌差</dd></div>
              <div><dt>Gin</dt><dd>20 + 对手散牌</dd></div>
              <div><dt>反截</dt><dd>10 + 散牌差</dd></div>
            </dl>
          </section>
        </div>

        <aside className="dwc-rules__note">
          <span aria-hidden="true">⌁</span>
          <p><strong>牌墙规则</strong>剩两张时不能再摸暗牌。若明牌能让你立即敲牌，可以拿；否则可直接结束本手。</p>
        </aside>

        <footer className="dwc-dialog__footer">
          <button type="button" className="dwc-button dwc-button--quiet" onClick={onClose}>明白了</button>
          {onStart === undefined ? null : (
            <button type="button" className="dwc-button dwc-button--primary" onClick={onStart}>入座开牌</button>
          )}
        </footer>
      </section>
    </div>
  )
}
