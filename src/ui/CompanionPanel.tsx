import { useEffect, useId, useRef, useState } from 'react'
import type {
  CompanionModelCatalog,
  CompanionSnapshot,
  ModelSelection,
} from '../companion/core.ts'

export interface CompanionUiMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly text: string
}

export interface CompanionPanelProps {
  readonly open: boolean
  readonly snapshot: CompanionSnapshot | null
  readonly catalog: CompanionModelCatalog | null
  readonly messages: readonly CompanionUiMessage[]
  readonly busy: boolean
  readonly error: string | null
  readonly onClose: () => void
  readonly onSelectModel: (selection: ModelSelection) => void | Promise<void>
  readonly onSend: (text: string) => void | Promise<void>
  readonly onRemember: (text: string) => void | Promise<void>
  readonly onForget: (id: string) => void | Promise<void>
}

const MODEL_SEPARATOR = '\u0000'

function modelValue(selection: ModelSelection | null | undefined): string {
  return selection === null || selection === undefined
    ? ''
    : `${selection.provider}${MODEL_SEPARATOR}${selection.model}`
}

function selectionFrom(value: string): ModelSelection | undefined {
  const separator = value.indexOf(MODEL_SEPARATOR)
  if (separator <= 0 || separator === value.length - 1) return undefined
  return { provider: value.slice(0, separator), model: value.slice(separator + 1) }
}

export function CompanionPanel({
  open,
  snapshot,
  catalog,
  messages,
  busy,
  error,
  onClose,
  onSelectModel,
  onSend,
  onRemember,
  onForget,
}: CompanionPanelProps): React.JSX.Element | null {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState('')
  const [memoryDraft, setMemoryDraft] = useState('')

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
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (first === undefined || last === undefined) return
      const current = rootNode instanceof ShadowRoot ? rootNode.activeElement : document.activeElement
      if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
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

  const selected = modelValue(snapshot?.selectedModel)
  const memories = snapshot?.memories ?? []

  return (
    <div
      className="dwc-overlay dwc-companion-overlay"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}
    >
      <section
        ref={panelRef}
        className="dwc-dialog dwc-companion-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dwc-dialog__header">
          <div>
            <span className="dwc-eyebrow">LANYIN · LOCAL COMPANION</span>
            <h2 id={titleId}>和澜音说说话</h2>
            <small>AI 牌友，不冒充真人</small>
          </div>
          <button ref={closeRef} type="button" className="dwc-icon-button" onClick={onClose} aria-label="关闭澜音对话">×</button>
        </header>

        <div className="dwc-companion__body">
          <section className="dwc-companion__model" aria-label="澜音的独立模型">
            <label htmlFor={`${titleId}-model`}>澜音使用的 DSH 模型</label>
            <select
              id={`${titleId}-model`}
              aria-label="澜音使用的 DSH 模型"
              value={selected}
              disabled={busy || catalog === null}
              onChange={(event) => {
                const selection = selectionFrom(event.currentTarget.value)
                if (selection !== undefined) void onSelectModel(selection)
              }}
            >
              <option value="">请选择一个独立模型</option>
              {catalog?.providers.map((provider) => (
                <optgroup key={provider.id} label={provider.name}>
                  {provider.models.map((model) => (
                    <option key={`${provider.id}/${model.id}`} value={modelValue({ provider: provider.id, model: model.id })}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <small>只影响澜音，不会改动你正在运行的 DSH 任务模型。</small>
          </section>

          <section className="dwc-companion__conversation" aria-label="和澜音的当前对话">
            <div className="dwc-companion__messages" role="log" aria-live="polite">
              {messages.length === 0 ? (
                <p className="dwc-companion__empty">可以聊牌，也可以问她现在的任务状态。她只会看到公开状态，不会读取代码或任务正文。</p>
              ) : messages.map((message) => (
                <p key={message.id} className={`dwc-companion__message is-${message.role}`}>
                  <strong>{message.role === 'assistant' ? '澜音' : '你'}</strong>
                  <span>{message.text}</span>
                </p>
              ))}
            </div>
            <form
              className="dwc-companion__composer"
              onSubmit={(event) => {
                event.preventDefault()
                const text = draft.trim()
                if (text.length === 0 || busy) return
                void Promise.resolve(onSend(text)).then(() => setDraft(''))
              }}
            >
              <textarea
                aria-label="给澜音发消息"
                value={draft}
                maxLength={2_000}
                disabled={busy || snapshot?.selectedModel === null}
                placeholder={snapshot?.selectedModel === null ? '先给澜音选择一个模型' : '聊聊这手牌，或说“记住：……”'}
                onChange={(event) => setDraft(event.currentTarget.value)}
              />
              <button type="submit" disabled={busy || draft.trim().length === 0} aria-label="发送给澜音">
                {busy ? '澜音在想…' : '发送'}
              </button>
            </form>
          </section>

          <section className="dwc-companion__memories" role="region" aria-label="澜音的本机长期记忆">
            <div className="dwc-companion__section-title">
              <div><strong>本机长期记忆</strong><small>保存在当前 DSH 配置中，直到你删除或清理配置。</small></div>
              <span>{memories.length} 条</span>
            </div>
            <form
              className="dwc-companion__memory-form"
              onSubmit={(event) => {
                event.preventDefault()
                const text = memoryDraft.trim()
                if (text.length === 0 || busy) return
                void Promise.resolve(onRemember(text)).then(() => setMemoryDraft(''))
              }}
            >
              <input
                aria-label="新增长期记忆"
                value={memoryDraft}
                maxLength={500}
                placeholder="例如：我喜欢慢一点的节奏"
                onChange={(event) => setMemoryDraft(event.currentTarget.value)}
              />
              <button type="submit" disabled={busy || memoryDraft.trim().length === 0} aria-label="让澜音记住">记住</button>
            </form>
            {memories.length === 0 ? (
              <p className="dwc-companion__empty">还没有长期记忆。只有你明确添加或说“记住：……”的内容才会保存。</p>
            ) : (
              <ul className="dwc-companion__memory-list">
                {memories.map((memory) => (
                  <li key={memory.id}>
                    <span>{memory.text}</span>
                    <button type="button" onClick={() => void onForget(memory.id)} aria-label={`忘记：${memory.text}`}>忘记</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {catalog !== null && catalog.warnings.length > 0 && (
            <p className="dwc-companion__warning">{catalog.warnings.join('；')}</p>
          )}
          {error !== null && <p className="dwc-companion__error" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  )
}
