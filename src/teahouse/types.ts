/**
 * Shared teahouse contracts: the Host RPC protocol and the GameModule seam.
 *
 * The teahouse is one DSH plugin with several curated games. Games never touch
 * DSH internals — they implement {@link GameModule}, and the teahouse shell
 * provides mounting, per-game saves, task notices and the shared Lanyin face.
 *
 * @module teahouse/types
 */

import type { ComponentType } from 'react'

/* ------------------------------------------------------------------ *
 * Host RPC protocol — channel `/teahouse`
 * ------------------------------------------------------------------ */

/** Logical RPC channel this plugin registers on the Host. */
export const TEAHOUSE_CHANNEL = '/teahouse'

/** One selectable DSH model exposed to Lanyin's settings. */
export interface LanyinModelRef {
  readonly provider: string
  readonly model: string
  readonly displayName: string
}

/** Wire form of one chat turn (plain text; the teahouse needs nothing else). */
export interface LanyinWireMessage {
  readonly role: 'user' | 'assistant'
  readonly text: string
}

export interface TeahouseChatRequest {
  readonly provider: string
  readonly model: string
  readonly system: string
  readonly messages: readonly LanyinWireMessage[]
  readonly maxTokens?: number
}

export interface TeahouseChatSuccess {
  readonly ok: true
  readonly text: string
}

export interface TeahouseChatFailure {
  readonly ok: false
  /** Stable machine-readable reason, for graceful degradation in the client. */
  readonly code: 'unavailable' | 'no-model' | 'provider-error' | 'bad-request'
  readonly message: string
}

export type TeahouseChatResult = TeahouseChatSuccess | TeahouseChatFailure

export interface TeahouseModelsResult {
  readonly ok: boolean
  readonly models?: readonly LanyinModelRef[]
  readonly error?: string
}

/** The two deliberately separate play paths. Classic never calls a model. */
export type TeahousePlayMode = 'classic' | 'agent'

export interface GameAgentLegalAction {
  /** Stable engine-owned id. The model may choose only one of these ids. */
  readonly id: string
  /** Short human/model-readable explanation of the action. */
  readonly label: string
}

export interface TeahouseAgentStartRequest {
  readonly sessionId: string
  readonly provider: string
  readonly model: string
  readonly gameId: string
  readonly gameTitle: string
  readonly rules: string
  readonly soul: string
  readonly memories: readonly string[]
}

export interface TeahouseAgentTurnRequest {
  readonly sessionId: string
  readonly situation: string
  readonly legalActions: readonly GameAgentLegalAction[]
}

export interface TeahouseAgentChatRequest {
  readonly sessionId: string
  readonly text: string
  readonly situation?: string
}

export interface TeahouseAgentEventRequest {
  readonly sessionId: string
  readonly event: 'task_done' | 'task_needs_input' | 'game_finished'
  readonly context: string
}

export interface TeahouseAgentEndRequest {
  readonly sessionId: string
}

export interface TeahouseAgentDecision {
  readonly actionId: string
  readonly line: string
  readonly intent: 'fair' | 'merciful' | 'ruthless' | 'mischievous'
}

export type TeahouseAgentResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: 'unavailable' | 'bad-request' | 'not-found' | 'provider-error'; readonly message: string }

/* ------------------------------------------------------------------ *
 * GameModule — the seam game authors implement
 * ------------------------------------------------------------------ */

/** Curated metadata shown on a lobby card. Keep it honest and short. */
export interface GameManifest {
  /** Stable id; also the save-slot namespace. kebab-case. */
  readonly id: string
  readonly title: string
  readonly tagline: string
  /** Approximate minutes for one full round, e.g. "8–12 分钟". */
  readonly duration: string
  /** Thinking load: 'light' | 'medium' | 'heavy'. */
  readonly intensity: 'light' | 'medium' | 'heavy'
  /** Why it is worth playing — one sentence, maintainer's voice. */
  readonly why: string
  /** Emoji or short glyph used on the lobby card. */
  readonly glyph: string
  /** Accent hue (0–360) for card and shell theming. */
  readonly accent: number
}

/** The face the teahouse shell hands to a mounted game. */
export interface GameServices {
  /** True when a LLM round-trip is currently possible (model chosen + bridge up). */
  readonly lanyinAvailable: () => boolean
  /**
   * Ask Lanyin to comment on a game moment. Never throws: on any failure it
   * resolves to a local fallback line, so games can call it unconditionally.
   * Coalesced and rate-limited by the shell — safe to call on every event.
   */
  readonly lanyinRemark: (event: string, context: string) => void
  /** Current opponent mode. Classic is deterministic and never spends tokens. */
  readonly playMode: () => TeahousePlayMode
  /** Open one real Harness Agent Session for this match. No-op in classic mode. */
  readonly beginAgentGame: (input: { gameId: string; gameTitle: string; rules: string }) => Promise<boolean>
  /** Let that Agent select exactly one engine-declared legal action. */
  readonly chooseAgentAction: (input: {
    situation: string
    legalActions: readonly GameAgentLegalAction[]
  }) => Promise<TeahouseAgentDecision | null>
  /** Close the active match session. Long-term memory remains separate. */
  readonly endAgentGame: (summary?: string) => Promise<void>
  /** Persist a JSON save under this game's slot. Opaque to the shell. */
  readonly saveState: (state: unknown) => void
  /** Load the latest save for this game, or null. */
  readonly loadState: <S>() => S | null
  /** Non-blocking DSH task notice while this game is mounted. */
  readonly taskNotice: () => 'done' | 'needs_input' | null
  readonly clearTaskNotice: () => void
  /** Read one shell preference key (shared across games, e.g. audio). */
  readonly getPreference: (key: string) => unknown
  /** Patch shell preference keys. */
  readonly setPreferences: (patch: Record<string, unknown>) => void
  /** Report a finished match so shell-level stats stay game-agnostic. */
  readonly reportMatchResult: (result: { won: boolean; draw?: boolean }) => void
}

export interface GameViewProps {
  readonly services: GameServices
  /** Shell-level pause of heavy effects is not needed today; reserved. */
  readonly preview?: boolean
}

/**
 * A curated game. The shell lazy-loads modules, renders {@link View} inside
 * the shared container, and owns everything DSH-related on the game's behalf.
 */
export interface GameModule {
  readonly manifest: GameManifest
  /** Cheap synchronous probe — has this game got a save to continue? */
  readonly hasSave: () => boolean
  /** Discard any existing save (asked from the lobby card). */
  readonly clearSave: () => void
  readonly View: ComponentType<GameViewProps>
}
