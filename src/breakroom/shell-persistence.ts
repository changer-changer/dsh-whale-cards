import type { GameId } from './game-contract.ts'

/**
 * Shell route and panel visibility state, persisted separately from any game
 * save (spec §10.1). The shell key only owns `panelOpen`, the current route,
 * and an optional "resume me" pointer; every game's own save stays under its
 * namespaced `dsh-breakroom:game:<id>:v1` key.
 */

export const SHELL_STORAGE_KEY = 'dsh-breakroom:shell:v1'

export type ShellRoute =
  | { readonly kind: 'hall' }
  | { readonly kind: 'game'; readonly gameId: GameId }

export interface BreakroomShellState {
  readonly version: 1
  readonly panelOpen: boolean
  readonly route: ShellRoute
  readonly lastPlayedGameId?: GameId
}

export const HALL_ROUTE: ShellRoute = { kind: 'hall' }

export const DEFAULT_SHELL_STATE: BreakroomShellState = {
  version: 1,
  panelOpen: false,
  route: HALL_ROUTE,
}

export type ShellAction =
  | { readonly type: 'open-panel' }
  | { readonly type: 'close-panel' }
  | { readonly type: 'open-game'; readonly gameId: GameId }
  | { readonly type: 'return-to-hall' }

/**
 * Pure shell reducer (spec §16.1). All transitions are explicit and total;
 * `open-game` and `return-to-hall` never touch any game's own save.
 */
export function shellReducer(state: BreakroomShellState, action: ShellAction): BreakroomShellState {
  switch (action.type) {
    case 'open-panel':
      return { ...state, panelOpen: true }
    case 'close-panel':
      return { ...state, panelOpen: false }
    case 'open-game':
      return {
        ...state,
        panelOpen: true,
        route: { kind: 'game', gameId: action.gameId },
        lastPlayedGameId: action.gameId,
      }
    case 'return-to-hall':
      return { ...state, route: HALL_ROUTE }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidRoute(value: unknown): value is ShellRoute {
  if (!isRecord(value)) return false
  if (value.kind === 'hall') return true
  if (value.kind === 'game') return typeof value.gameId === 'string' && value.gameId.length > 0
  return false
}

/** Accepts unknown input and returns a shell state or `null` when invalid. */
export function parseShellState(raw: unknown): BreakroomShellState | null {
  if (!isRecord(raw)) return null
  if (raw.version !== 1) return null
  if (typeof raw.panelOpen !== 'boolean') return null
  if (!isValidRoute(raw.route)) return null
  const lastPlayedGameId = raw.lastPlayedGameId
  if (lastPlayedGameId !== undefined && typeof lastPlayedGameId !== 'string') return null
  return {
    version: 1,
    panelOpen: raw.panelOpen,
    route: raw.route,
    ...(lastPlayedGameId === undefined ? {} : { lastPlayedGameId }),
  }
}

/** Minimal storage contract shared with the game storage adapter. */
export interface ShellStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function resolveDefaultStorage(): ShellStorageLike | null {
  try {
    const storage: ShellStorageLike | undefined = window.localStorage
    return storage ?? null
  } catch {
    return null
  }
}

/** Reads the shell state, returning the safe default when missing or corrupt. */
export function loadShellState(storage: ShellStorageLike | null = resolveDefaultStorage()): BreakroomShellState {
  if (storage === null) return DEFAULT_SHELL_STATE
  let serialized: string | null
  try {
    serialized = storage.getItem(SHELL_STORAGE_KEY)
  } catch {
    return DEFAULT_SHELL_STATE
  }
  if (serialized === null) return DEFAULT_SHELL_STATE
  try {
    const parsed: unknown = JSON.parse(serialized)
    return parseShellState(parsed) ?? DEFAULT_SHELL_STATE
  } catch {
    return DEFAULT_SHELL_STATE
  }
}

/** Writes the shell state; failures are non-fatal and stay invisible to games. */
export function saveShellState(
  state: BreakroomShellState,
  storage: ShellStorageLike | null = resolveDefaultStorage(),
): void {
  if (storage === null) return
  try {
    storage.setItem(SHELL_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage may be unavailable; the panel stays usable for this session.
  }
}

/** Clears only the shell key. Used by tests; never invoked from production code. */
export function clearShellState(storage: ShellStorageLike | null = resolveDefaultStorage()): void {
  if (storage === null) return
  try {
    storage.removeItem(SHELL_STORAGE_KEY)
  } catch {
    // Non-fatal.
  }
}
