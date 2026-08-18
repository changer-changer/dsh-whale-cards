import { useEffect, useId, useRef } from 'react'
import type { PlayerPreferences } from '../game/persistence.ts'
import type { Difficulty } from '../game/types.ts'

export interface SettingsPanelProps {
  readonly open: boolean
  readonly preferences: PlayerPreferences
  readonly onChange: (next: PlayerPreferences) => void
  readonly onClose: () => void
}

const DIFFICULTIES: readonly { readonly value: Difficulty; readonly label: string; readonly note: string }[] = [
  { value: 'relaxed', label: '松弛', note: '澜音偶尔会留破绽' },
  { value: 'steady', label: '从容', note: '推荐的日常节奏' },
  { value: 'sharp', label: '敏锐', note: '认真计算每一手' },
]

const DIALOGUE_MODES: readonly {
  readonly value: PlayerPreferences['dialogue']
  readonly label: string
  readonly note: string
}[] = [
  { value: 'quiet', label: '安静', note: '只保留必要提示' },
  { value: 'standard', label: '适量', note: '偶尔聊一句' },
  { value: 'lively', label: '健谈', note: '更多牌桌回应' },
]

export function SettingsPanel({ open, preferences, onChange, onClose }: SettingsPanelProps) {
  const titleId = useId()
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
      const first = focusable[0]
      const last = focusable.at(-1)
      if (first === undefined || last === undefined) return
      const currentActive = rootNode instanceof ShadowRoot ? rootNode.activeElement : document.activeElement
      if (event.shiftKey && currentActive === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && currentActive === last) {
        event.preventDefault()
        first.focus()
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
        className="dwc-dialog dwc-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dwc-dialog__header">
          <div>
            <span className="dwc-eyebrow">TABLE CONFIG</span>
            <h2 id={titleId}>牌桌设置</h2>
          </div>
          <button ref={closeRef} type="button" className="dwc-icon-button" onClick={onClose} aria-label="关闭设置">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="dwc-settings__group">
          <div className="dwc-settings__label">
            <h3>澜音的牌力</h3>
            <p>只改变决策强度，不改变发牌。</p>
          </div>
          <div className="dwc-segmented" role="group" aria-label="澜音的牌力">
            {DIFFICULTIES.map((option) => (
              <button
                type="button"
                aria-pressed={preferences.difficulty === option.value}
                className={preferences.difficulty === option.value ? 'dwc-segmented__option is-active' : 'dwc-segmented__option'}
                key={option.value}
                onClick={() => onChange({ ...preferences, difficulty: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dwc-settings__group">
          <div className="dwc-settings__label">
            <h3>牌桌交谈</h3>
            <p>随时可以点对话框主动聊一句。</p>
          </div>
          <div className="dwc-segmented" role="group" aria-label="牌桌交谈频率">
            {DIALOGUE_MODES.map((option) => (
              <button
                type="button"
                aria-pressed={preferences.dialogue === option.value}
                className={preferences.dialogue === option.value ? 'dwc-segmented__option is-active' : 'dwc-segmented__option'}
                key={option.value}
                onClick={() => onChange({ ...preferences, dialogue: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dwc-settings__toggles">
          <div className="dwc-toggle-row">
            <div><strong>快速出牌</strong><span>缩短澜音思考动画，规则与牌力不变。</span></div>
            <button
              type="button"
              className="dwc-switch"
              role="switch"
              aria-label="快速出牌"
              aria-checked={preferences.fastAi}
              onClick={() => onChange({ ...preferences, fastAi: !preferences.fastAi })}
            ><span /></button>
          </div>
          <div className="dwc-toggle-row">
            <div><strong>牌桌音效</strong><span>摸牌、落牌和结算的轻提示音。</span></div>
            <button
              type="button"
              className="dwc-switch"
              role="switch"
              aria-label="牌桌音效"
              aria-checked={!preferences.muted}
              onClick={() => onChange({ ...preferences, muted: !preferences.muted })}
            ><span /></button>
          </div>
        </div>

        <div className="dwc-settings__tutorial">
          <div><strong>新手提示</strong><span>{preferences.tutorialSeen ? '已完成首次引导' : '下次开牌将显示引导'}</span></div>
          <button
            type="button"
            className="dwc-button dwc-button--quiet"
            onClick={() => onChange({ ...preferences, tutorialSeen: false })}
          >再次显示</button>
        </div>

        <footer className="dwc-dialog__footer">
          <p>设置会和牌局一起保存在本机。</p>
          <button type="button" className="dwc-button dwc-button--primary" onClick={onClose}>完成</button>
        </footer>
      </section>
    </div>
  )
}
