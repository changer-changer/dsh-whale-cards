import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CompanionChatReply,
  CompanionModelCatalog,
  CompanionPort,
  CompanionSnapshot,
  CompanionTaskContext,
  ModelSelection,
} from '../companion/core.ts'
import { publicSignal } from '../game/public-signals.ts'
import type { MatchState } from '../game/types.ts'
import type { CompanionUiMessage } from './CompanionPanel.tsx'
import type { TaskListSource, TaskListSnapshot } from './task-status.ts'

export interface CompanionController {
  readonly snapshot: CompanionSnapshot | null
  readonly catalog: CompanionModelCatalog | null
  readonly messages: readonly CompanionUiMessage[]
  readonly busy: boolean
  readonly error: string | null
  readonly mood: CompanionChatReply['mood']
  clearError(): void
  forget(id: string): Promise<void>
  remember(text: string): Promise<void>
  selectModel(selection: ModelSelection): Promise<void>
  send(text: string): Promise<void>
}

function taskContext(source: TaskListSource | undefined): CompanionTaskContext | undefined {
  if (source === undefined) return undefined
  const snapshot: TaskListSnapshot = source.getSnapshot()
  const rows = Object.values(snapshot.byId).filter((row) => row !== undefined)
  const currentId = snapshot.current === null || snapshot.current === undefined
    ? undefined
    : String(snapshot.current)
  const current = currentId === undefined ? undefined : snapshot.byId[currentId]
  const currentTitle = current?.displayTitle?.trim() || current?.title?.trim() || undefined
  return {
    currentTitle,
    running: rows.filter((row) => row.running === true).length,
    needsInput: rows.filter((row) => row.pendingInteraction !== undefined).length,
    completed: rows.filter((row) => row.completed === true).length,
  }
}

function gameContext(match: MatchState | null) {
  if (match === null) return undefined
  return {
    round: match.round,
    humanScore: match.scores.human,
    lanyinScore: match.scores.lanyin,
    publicSignal: publicSignal(match.history, match.stock.length).clue,
  }
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : '澜音暂时没接上话，牌局仍然可以继续。'
}

export function useCompanion(
  port: CompanionPort | undefined,
  taskSource: TaskListSource | undefined,
  match: MatchState | null,
): CompanionController {
  const [snapshot, setSnapshot] = useState<CompanionSnapshot | null>(null)
  const [catalog, setCatalog] = useState<CompanionModelCatalog | null>(null)
  const [messages, setMessages] = useState<CompanionUiMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mood, setMood] = useState<CompanionChatReply['mood']>('calm')
  const nextMessageId = useRef(0)
  const currentChat = useRef<AbortController | null>(null)

  useEffect(() => {
    currentChat.current?.abort()
    let active = true
    setSnapshot(null)
    setCatalog(null)
    setError(null)
    if (port === undefined) return () => { active = false }
    void Promise.all([port.snapshot(), port.listModels()]).then(([nextSnapshot, nextCatalog]) => {
      if (!active) return
      setSnapshot(nextSnapshot)
      setCatalog(nextCatalog)
    }).catch((cause: unknown) => {
      if (active) setError(errorMessage(cause))
    })
    return () => {
      active = false
      currentChat.current?.abort()
    }
  }, [port])

  const selectModel = useCallback(async (selection: ModelSelection) => {
    if (port === undefined) return
    setBusy(true)
    setError(null)
    try {
      setSnapshot(await port.selectModel(selection))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }, [port])

  const remember = useCallback(async (text: string) => {
    if (port === undefined) return
    setBusy(true)
    setError(null)
    try {
      setSnapshot(await port.remember({ text }))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }, [port])

  const forget = useCallback(async (id: string) => {
    if (port === undefined) return
    setBusy(true)
    setError(null)
    try {
      setSnapshot(await port.forget({ id }))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }, [port])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (port === undefined || trimmed.length === 0 || busy) return
    const userMessage: CompanionUiMessage = {
      id: `user-${++nextMessageId.current}`,
      role: 'user',
      text: trimmed,
    }
    setMessages((previous) => [...previous, userMessage])
    setBusy(true)
    setError(null)
    setMood('thinking')
    const controller = new AbortController()
    currentChat.current = controller
    try {
      const reply = await port.chat({
        text: trimmed,
        task: taskContext(taskSource),
        game: gameContext(match),
      }, controller.signal)
      setSnapshot(reply.state)
      setMood(reply.mood)
      setMessages((previous) => [...previous, {
        id: `assistant-${++nextMessageId.current}`,
        role: 'assistant',
        text: reply.text,
      }])
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(errorMessage(cause))
        setMood('concerned')
      }
    } finally {
      if (currentChat.current === controller) currentChat.current = null
      setBusy(false)
    }
  }, [busy, match, port, taskSource])

  const clearError = useCallback(() => setError(null), [])

  return {
    snapshot,
    catalog,
    messages,
    busy,
    error,
    mood,
    clearError,
    forget,
    remember,
    selectModel,
    send,
  }
}
