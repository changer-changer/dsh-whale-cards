import type { HandResult, MatchState, MeldLayout, Player } from '../game/types.ts'
import { CardView } from './CardView.tsx'

export interface ResultViewProps {
  readonly match: MatchState
  readonly onNext: () => void
  readonly onNewMatch: () => void
}

const PLAYER_NAME: Record<Player, string> = {
  human: '你',
  lanyin: '澜音',
}

function resultCopy(result: HandResult): { eyebrow: string; title: string; note: string } {
  if (result.kind === 'draw') {
    return { eyebrow: 'HAND DRAWN', title: '潮水退到牌墙', note: '本手和局，双方都不计分。' }
  }
  const winner = result.winner === null ? '本手无人' : PLAYER_NAME[result.winner]
  if (result.kind === 'gin') {
    return {
      eyebrow: 'GIN',
      title: result.winner === 'human' ? '漂亮，Gin！' : '澜音亮出了 Gin',
      note: `${winner}拿到 Gin 奖励与对手散牌分，共 ${result.points} 分。`,
    }
  }
  if (result.kind === 'undercut') {
    return {
      eyebrow: 'UNDERCUT',
      title: result.winner === 'human' ? '你反截了这一手' : '澜音完成反截',
      note: `${winner}的散牌更低，含反截奖励共得 ${result.points} 分。`,
    }
  }
  return {
    eyebrow: 'KNOCK',
    title: result.winner === 'human' ? '这一手是你的' : '澜音敲牌得分',
    note: `${winner}凭散牌差拿下 ${result.points} 分。`,
  }
}

function LayoutSummary({ label, layout }: { readonly label: string; readonly layout: MeldLayout }) {
  return (
    <section className="dwc-result-hand" aria-label={`${label}的结算手牌`}>
      <header>
        <strong>{label}</strong>
        <span>散牌 {layout.deadwoodPoints} 点</span>
      </header>
      <div className="dwc-result-hand__groups">
        {layout.melds.map((meld, index) => (
          <div className="dwc-result-meld" key={`${meld.kind}-${index}`}>
            <span>{meld.kind === 'run' ? '顺子' : '同点'}</span>
            <div>
              {meld.cards.map((card) => <CardView card={card} compact key={card.id} />)}
            </div>
          </div>
        ))}
        {layout.laidOff !== undefined && layout.laidOff.length > 0 ? (
          <div className="dwc-result-meld dwc-result-meld--layoff">
            <span>接牌</span>
            <div>
              {layout.laidOff.map((card) => <CardView card={card} compact key={card.id} />)}
            </div>
          </div>
        ) : null}
        {layout.deadwood.length > 0 ? (
          <div className="dwc-result-meld dwc-result-meld--deadwood">
            <span>散牌</span>
            <div>
              {layout.deadwood.map((card) => <CardView card={card} compact key={card.id} />)}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function ResultView({ match, onNext, onNewMatch }: ResultViewProps) {
  const result = match.handResult
  const matchOver = match.phase === 'match_over'

  if (result === undefined) {
    return (
      <section className="dwc-result dwc-result--empty" aria-labelledby="dwc-result-title">
        <span className="dwc-eyebrow">RESULT UNAVAILABLE</span>
        <h2 id="dwc-result-title">这手牌还没有结算</h2>
        <p>可以返回牌桌继续，或直接开始一场新牌局。</p>
        <button type="button" className="dwc-button dwc-button--primary" onClick={onNewMatch}>开始新牌局</button>
      </section>
    )
  }

  const copy = resultCopy(result)
  const finalWinner = match.scores.human === match.scores.lanyin
    ? null
    : match.scores.human > match.scores.lanyin ? 'human' : 'lanyin'

  return (
    <section className="dwc-result" aria-labelledby="dwc-result-title">
      <header className="dwc-result__hero">
        <div>
          <span className="dwc-eyebrow">{matchOver ? 'MATCH COMPLETE' : copy.eyebrow}</span>
          <h2 id="dwc-result-title">
            {matchOver
              ? finalWinner === null ? '今晚平分秋色' : finalWinner === 'human' ? '你赢下了今晚的牌局' : '澜音赢下了今晚的牌局'
              : copy.title}
          </h2>
          <p>{matchOver ? `最后一手：${copy.note}` : copy.note}</p>
        </div>
        <dl className="dwc-result-score" aria-label="牌局比分">
          <div><dt>你</dt><dd>{match.scores.human}</dd></div>
          <span aria-hidden="true">—</span>
          <div><dt>澜音</dt><dd>{match.scores.lanyin}</dd></div>
        </dl>
      </header>

      <div className="dwc-result__hands">
        <LayoutSummary label="你" layout={result.humanLayout} />
        <LayoutSummary label="澜音" layout={result.lanyinLayout} />
      </div>

      <footer className="dwc-result__footer">
        <p>
          <span>第 {result.round} / {match.rules.handCount} 手</span>
          <span>{result.kind === 'draw' ? '和局 · +0' : `${PLAYER_NAME[result.winner as Player]} · +${result.points}`}</span>
        </p>
        <div>
          {matchOver ? (
            <button type="button" className="dwc-button dwc-button--quiet" onClick={onNewMatch}>
              再来一局
            </button>
          ) : null}
          {!matchOver ? (
            <button type="button" className="dwc-button dwc-button--primary" onClick={onNext}>
              继续下一手
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  )
}
