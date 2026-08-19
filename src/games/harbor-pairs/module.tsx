/**
 * Harbor Pairs — the teahouse's template game.
 *
 * A 3-minute memory match that exists to prove the GameModule seam: no DSH
 * knowledge, saves through the shared slot, reports moments to Lanyin. New
 * game authors can copy this file as a starting point.
 *
 * @module games/harbor-pairs/module
 */

import { useCallback, useEffect, useState } from 'react'
import type { GameModule, GameServices, GameViewProps } from '../../teahouse/types.ts'
import { clearSlot, loadSlot, saveSlot, slotExists } from '../../teahouse/storage.ts'

const GAME_ID = 'harbor-pairs'
const GLYPHS = ['⚓', '🛟', '🐋', '🦀', '⭐', '🌊', '⛵', '灯笼鱼'] as const

interface PairsState {
  readonly deck: readonly number[]
  readonly flipped: readonly number[]
  readonly matched: readonly number[]
  readonly moves: number
}

interface PairsSave {
  readonly state: PairsState
  readonly startedAt: number
  readonly bestMoves: number | null
}

function shuffledDeck(): number[] {
  const deck = [...GLYPHS.keys(), ...GLYPHS.keys()]
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function newGame(): PairsSave {
  return { state: { deck: shuffledDeck(), flipped: [], matched: [], moves: 0 }, startedAt: Date.now(), bestMoves: null }
}

function isComplete(state: PairsState): boolean {
  return state.matched.length === state.deck.length
}

export function HarborPairsView({ services }: GameViewProps): React.JSX.Element {
  const [save, setSave] = useState<PairsSave | null>(() => loadSlot(GAME_ID) as PairsSave | null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    saveSlot(GAME_ID, save)
  }, [save])

  const state = save?.state ?? null
  const done = state !== null && isComplete(state)
  const best = save?.bestMoves ?? null

  const start = useCallback(() => {
    const fresh = newGame()
    setSave(fresh)
    services.lanyinRemark('new_game', '开始一局海港记忆配对：翻开两张相同的牌完成配对，步数越少越好。')
  }, [services])

  const flip = useCallback((index: number) => {
    if (busy || state === null) return
    if (state.matched.includes(index) || state.flipped.includes(index) || state.flipped.length >= 2) return
    const flipped = [...state.flipped, index]
    if (flipped.length < 2) {
      setSave((previous) => previous === null ? previous : { ...previous, state: { ...state, flipped } })
      return
    }
    const moves = state.moves + 1
    const [first, second] = flipped
    const isMatch = state.deck[first] === state.deck[second]
    setSave((previous) => previous === null ? previous : {
      ...previous,
      state: { ...state, flipped, moves },
    })
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      setSave((previous) => {
        if (previous === null) return previous
        const current = previous.state
        if (isMatch) {
          const matched = [...current.matched, first, second]
          const next = { ...current, flipped: [], matched }
          const complete = isComplete(next)
          if (complete) services.lanyinRemark('player_win', `海港记忆配对完成：${moves} 步清空全部 8 对。`)
          else services.lanyinRemark('good_move', `配对成功（${GLYPHS[state.deck[first]]}），已配 ${matched.length / 2}/8 对，用了 ${moves} 步。`)
          return { ...previous, state: next, bestMoves: complete ? (previous.bestMoves === null ? moves : Math.min(previous.bestMoves, moves)) : previous.bestMoves }
        }
        return { ...previous, state: { ...current, flipped: [] } }
      })
    }, isMatch ? 350 : 650)
  }, [busy, services, state])

  if (state === null) {
    return (
      <div className="dth-pairs-intro">
        <div className="dth-pairs-glyph" aria-hidden="true">⚓</div>
        <h2>海港记忆配对</h2>
        <p>翻开两张相同的牌完成配对。8 对牌，步数越少越好——正好等一壶茶。</p>
        {best !== null && <p className="dth-pairs-best">你的最好成绩：{best} 步</p>}
        <button type="button" className="dth-primary-button" onClick={start}>开始配对</button>
      </div>
    )
  }

  return (
    <div className="dth-pairs">
      <header className="dth-pairs-meta">
        <span>步数 <strong>{state.moves}</strong></span>
        <span>配对 <strong>{state.matched.length / 2}/8</strong></span>
        {best !== null && <span className="dth-pairs-best">最佳 {best}</span>}
        <button type="button" className="dth-text-button" onClick={start}>重开</button>
      </header>
      <div className={`dth-pairs-grid${done ? ' done' : ''}`} role={done ? 'status' : undefined}>
        {state.deck.map((glyph, index) => {
          const revealed = state.matched.includes(index) || state.flipped.includes(index)
          return (
            <button
              key={index}
              type="button"
              className={`dth-pairs-card${revealed ? ' revealed' : ''}${state.matched.includes(index) ? ' matched' : ''}`}
              onClick={() => { flip(index) }}
              disabled={revealed || state.flipped.length >= 2 || busy || done}
              aria-label={revealed ? `翻开：${GLYPHS[glyph]}` : `第 ${index + 1} 张盖牌`}
            >
              <span aria-hidden="true">{revealed ? GLYPHS[glyph] : ''}</span>
            </button>
          )
        })}
      </div>
      {done && (
        <p className="dth-pairs-done" role="status">全部配对完成 — {state.moves} 步{best === state.moves ? '，新纪录！' : ''}</p>
      )}
    </div>
  )
}

export const harborPairsGame: GameModule = {
  manifest: {
    id: GAME_ID,
    title: '海港记忆配对',
    tagline: '八对海港小物，一壶茶的时间',
    duration: '2–4 分钟',
    intensity: 'light',
    why: '茶歇间的模板游戏：三分钟一局，也是给新游戏作者的活样例。',
    glyph: '⚓',
    accent: 175,
  },
  hasSave: () => slotExists(GAME_ID),
  clearSave: () => clearSlot(GAME_ID),
  View: HarborPairsView,
}

export type { GameServices }
