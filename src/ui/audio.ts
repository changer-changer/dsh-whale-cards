import { useCallback, useEffect, useRef } from 'react'

export type SoundKind = 'deal' | 'draw' | 'place' | 'result' | 'tap'

const TONES: Readonly<Record<SoundKind, readonly [number, number, number]>> = {
  tap: [420, 0.028, 0.025],
  draw: [520, 0.045, 0.035],
  place: [330, 0.055, 0.04],
  deal: [610, 0.07, 0.035],
  result: [720, 0.16, 0.05],
}

export function useGameAudio(muted: boolean): (kind: SoundKind) => void {
  const contextRef = useRef<AudioContext | null>(null)

  useEffect(() => () => {
    const context = contextRef.current
    contextRef.current = null
    if (context !== null && context.state !== 'closed') void context.close()
  }, [])

  return useCallback((kind: SoundKind) => {
    if (muted || typeof AudioContext === 'undefined') return
    const context = contextRef.current ?? new AudioContext()
    contextRef.current = context
    const [frequency, duration, gainValue] = TONES[kind]
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, context.currentTime + duration)
    gain.gain.setValueAtTime(gainValue, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + duration)
  }, [muted])
}

