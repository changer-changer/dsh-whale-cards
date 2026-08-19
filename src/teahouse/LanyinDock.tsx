/**
 * LanyinDock — the companion's permanent seat in the teahouse shell.
 *
 * Chat, expression, model selection and an inspectable memory list. Never
 * blocks the game: when no model is reachable the chat degrades to local
 * lines and every control still works.
 *
 * @module teahouse/LanyinDock
 */

import { useEffect, useRef, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { EXPRESSION_LABELS } from './lanyin/persona.ts'
import type { LanyinService } from './lanyin/service.ts'

const EXPRESSION_FACE: Readonly<Record<string, string>> = {
  calm: '•ᴗ•',
  thinking: '•˙•',
  happy: '•‿•',
  proud: '•◡‿◡•',
  worried: '•︿•',
  talking: '•ᴥ•',
  offline: '•ᴗ•zzz',
}

export function LanyinDock({ lanyin, collapsed, onToggleCollapsed }: {
  lanyin: LanyinService
  collapsed: boolean
  onToggleCollapsed: () => void
}): React.JSX.Element {
  const state = useSyncExternalStore(lanyin.subscribe, lanyin.getSnapshot)
  const [tab, setTab] = useState<'chat' | 'soul' | 'memory' | 'model'>('chat')
  const [draft, setDraft] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const log = logRef.current
    if (log !== null) log.scrollTop = log.scrollHeight
  }, [state.chat.length, state.chatBusy])

  const send = (): void => {
    const text = draft
    if (text.trim() === '' || state.chatBusy) return
    setDraft('')
    void lanyin.sendChat(text)
  }

  const sendQuickPrompt = (text: string): void => {
    if (state.chatBusy) return
    setTab('chat')
    void lanyin.sendChat(text)
  }

  return (
    <aside className={collapsed ? 'dth-dock dth-dock--collapsed' : 'dth-dock'} aria-label="鲸鱼娘澜音">
      <div className="dth-dock-bar">
        <span className="dth-dock-face" role="img" aria-label={`澜音（${EXPRESSION_LABELS[state.expression]}）`}>
          {EXPRESSION_FACE[state.expression] ?? '•ᴗ•'}
        </span>
        <div className="dth-dock-title">
          <strong>鲸鱼娘 · 澜音</strong>
          <small>{state.agentSessionId !== null
            ? `${state.agentGameTitle ?? '牌局'} · Agent Session ${state.agentBusy ? '思考中' : '在线'}`
            : state.modelLive ? (state.chosen ? `${state.chosen.model} · 守着 DSH 的潮汐` : '正在听 DSH 的回声') : '模型未连接 · 仍会守着牌桌'}</small>
        </div>
        <nav className="dth-dock-actions" aria-label="澜音面板">
          {!collapsed && (
            <>
              <button type="button" className={`dth-dock-toggle${tab === 'chat' ? ' active' : ''}`} onClick={() => { setTab('chat') }}>聊天</button>
              <button type="button" className={`dth-dock-toggle${tab === 'soul' ? ' active' : ''}`} onClick={() => { setTab('soul') }}>Soul</button>
              <button type="button" className={`dth-dock-toggle${tab === 'memory' ? ' active' : ''}`} onClick={() => { setTab('memory') }}>记忆 {state.memories.length > 0 ? `(${state.memories.length})` : ''}</button>
              <button type="button" className={`dth-dock-toggle${tab === 'model' ? ' active' : ''}`} onClick={() => { setTab('model') }}>模型</button>
            </>
          )}
          <button
            type="button"
            className="dth-dock-toggle dth-dock-collapse"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? '展开澜音面板' : '收起澜音面板'}
            title={collapsed ? '展开澜音面板' : '收起澜音面板'}
          >
            {collapsed ? '▴' : '▾'}
          </button>
        </nav>
      </div>

      {!collapsed && tab === 'chat' && (
        <div className="dth-chat">
          <div className="dth-chat-log" ref={logRef} aria-live="polite">
            {state.chat.length === 0 && (
              <p className="dth-mem-empty">和澜音聊两句吧。对她说「记住……」，她会跨局记住这件事。</p>
            )}
            {state.chat.slice(-30).map((turn, index) => (
              <div key={`${turn.at}-${index}`} className={`dth-bubble ${turn.role}`}>
                {turn.text}
                {turn.role === 'assistant' && index === state.chat.length - 1 && turn.text.includes('（模型暂时不在') && (
                  <span className="dth-bubble-tag">本地台词 · 模型未连接</span>
                )}
              </div>
            ))}
            {state.chatBusy && <div className="dth-bubble assistant">…</div>}
          </div>
          {state.agentSessionId !== null && (
            <div className="dth-agent-prompts" aria-label="牌局快捷对话">
              <button type="button" disabled={state.chatBusy} onClick={() => { sendQuickPrompt('我不会玩，请结合当前牌局，用最简单的话教我这一步该考虑什么。') }}>教我这一步</button>
              <button type="button" disabled={state.chatBusy} onClick={() => { sendQuickPrompt('认真一点，拿出你最强的水平和我玩。') }}>认真点</button>
              <button type="button" disabled={state.chatBusy} onClick={() => { sendQuickPrompt('澜音，放我一马嘛。你可以手软一点，但规则不许变。') }}>放我一马</button>
            </div>
          )}
          <form
            className="dth-chat-input"
            onSubmit={(event) => { event.preventDefault(); send() }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => { setDraft(event.target.value) }}
              placeholder={state.modelLive ? '和澜音说句话…（「记住…」会存入长期记忆）' : '模型未连接，澜音会用本地台词陪你…'}
              aria-label="对澜音说"
              maxLength={400}
            />
            <button type="submit" disabled={state.chatBusy || draft.trim() === ''}>发送</button>
          </form>
        </div>
      )}

      {!collapsed && tab === 'memory' && <MemoryPanel lanyin={lanyin} memories={state.memories} />}
      {!collapsed && tab === 'soul' && <SoulPanel soul={state.soul} sessionId={state.agentSessionId} error={state.agentError} />}
      {!collapsed && tab === 'model' && <ModelPanel lanyin={lanyin} />}
    </aside>
  )
}

function SoulPanel({ soul, sessionId, error }: { soul: string; sessionId: string | null; error: string | null }): React.JSX.Element {
  return (
    <div className="dth-side dth-soul-panel">
      <div><span className="dth-kicker">LANYIN / SOUL</span><h4>她是谁</h4></div>
      {soul.split('\n').map((line) => <p key={line}>{line}</p>)}
      <dl>
        <div><dt>当前 Agent</dt><dd>{sessionId ?? '未开启牌局 Session'}</dd></div>
        <div><dt>上下文</dt><dd>每局独立；由 Harness 自动按压力压缩</dd></div>
        <div><dt>长期记忆</dt><dd>只读取右侧「记忆」中的可见条目</dd></div>
      </dl>
      {error !== null && <p className="dth-agent-error">最近一次 Agent 调用：{error}</p>}
    </div>
  )
}

function MemoryPanel({ lanyin, memories }: {
  lanyin: LanyinService
  memories: readonly { id: string; text: string }[]
}): React.JSX.Element {
  const [draft, setDraft] = useState('')

  return (
    <div className="dth-side">
      <h4>长期记忆</h4>
      {memories.length === 0 && <p className="dth-mem-empty">还没有记忆。对澜音说「记住我喜欢喝乌龙」，或在这里直接添加。</p>}
      <div className="dth-mem-list">
        {memories.map((memory) => (
          <div key={memory.id} className="dth-mem-row">
            <input
              defaultValue={memory.text}
              aria-label="记忆内容"
              onBlur={(event) => { lanyin.updateMemory(memory.id, event.target.value) }}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.currentTarget.blur() } }}
            />
            <button type="button" aria-label="删除这条记忆" title="删除" onClick={() => { lanyin.removeMemory(memory.id) }}>×</button>
          </div>
        ))}
      </div>
      <form
        className="dth-mem-row"
        onSubmit={(event) => {
          event.preventDefault()
          if (draft.trim() !== '') {
            lanyin.remember(draft)
            setDraft('')
          }
        }}
      >
        <input
          value={draft}
          onChange={(event) => { setDraft(event.target.value) }}
          placeholder="添加一条澜音该记住的事…"
          aria-label="添加记忆"
          maxLength={240}
        />
        <button type="submit" aria-label="添加记忆" title="添加">＋</button>
      </form>
      <p className="dth-mem-hint">记忆只存在这台浏览器里，可以随时编辑或删除。</p>
    </div>
  )
}

function ModelPanel({ lanyin }: { lanyin: LanyinService }): React.JSX.Element {
  const state = useSyncExternalStore(lanyin.subscribe, lanyin.getSnapshot)
  return (
    <div className="dth-side">
      <h4>澜音的模型</h4>
      {state.models.length === 0 && (
        <p className="dth-mem-empty">{state.modelsError ?? '正在询问 DSH 有哪些模型…'}</p>
      )}
      {state.models.length > 0 && (
        <select
          value={state.chosen === null ? '' : `${state.chosen.provider}::${state.chosen.model}`}
          onChange={(event) => {
            const [provider, model] = event.target.value.split('::')
            if (provider !== undefined && model !== undefined) lanyin.chooseModel(provider, model)
          }}
          aria-label="选择澜音使用的模型"
        >
          {state.models.map((model) => (
            <option key={`${model.provider}-${model.model}`} value={`${model.provider}::${model.model}`}>
              {model.displayName}
            </option>
          ))}
        </select>
      )}
      <p className="dth-mem-hint">
        澜音用 DSH 配置好的模型说话；模型不可用时她会打盹，游戏不受影响。
      </p>
      <button
        type="button"
        className="dth-dock-toggle"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => { void lanyin.refreshModels() }}
      >
        重新加载模型
      </button>
    </div>
  )
}
