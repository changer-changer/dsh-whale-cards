import type { PublicAction } from './types.ts'

export type PublicPressure = 'low' | 'medium' | 'high'

export interface PublicSignal {
  readonly clue: string
  readonly label: string
  readonly pressure: PublicPressure
}

export function currentHandActions(
  history: readonly PublicAction[],
): readonly PublicAction[] {
  let lastDeal = -1
  history.forEach((action, index) => {
    if (action.type === 'deal') lastDeal = index
  })
  return history.slice(lastDeal + 1)
}

export function publicSignal(
  history: readonly PublicAction[],
  stockCount: number,
): PublicSignal {
  const recent = currentHandActions(history).slice(-8)
  const faceUpTakes = recent.filter(
    (action) => action.player === 'lanyin' && action.type === 'take_discard',
  ).length
  const lanyinDraws = recent.filter(
    (action) => action.player === 'lanyin'
      && (action.type === 'draw_stock' || action.type === 'take_discard'),
  ).length
  const score = (faceUpTakes * 2) + (stockCount <= 10 ? 2 : 0)
  const pressure: PublicPressure = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low'
  const label = pressure === 'high' ? '高' : pressure === 'medium' ? '中' : '低'
  const clue = faceUpTakes >= 2
    ? '她最近连续拿走明牌，可能正在追牌。'
    : faceUpTakes === 1
      ? '她拿过一张明牌，这条牌路可以继续观察。'
      : stockCount <= 10
        ? '牌堆已经变薄，双方都更接近摊牌。'
        : lanyinDraws > 0
          ? '她只摸过暗牌，暂时没有可读牌面。'
          : '她还没有公开拿牌迹象。'

  return { clue, label, pressure }
}
