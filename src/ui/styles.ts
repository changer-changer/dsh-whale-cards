export const STYLE_ELEMENT_ID = 'dsh-whale-cards-styles'

export const GAME_STYLES = String.raw`
.dwc-root {
  --dwc-bg: #06131a;
  --dwc-bg-raised: #0b1b24;
  --dwc-panel: #10232c;
  --dwc-panel-soft: #142a33;
  --dwc-line: #29414a;
  --dwc-line-strong: #42616a;
  --dwc-text: #eef5f3;
  --dwc-muted: #a9bdbe;
  --dwc-faint: #789094;
  --dwc-teal: #6fd2ca;
  --dwc-teal-dark: #123f43;
  --dwc-amber: #dda961;
  --dwc-danger: #ef8e7f;
  --dwc-card: #f0ecdf;
  --dwc-card-ink: #142127;
  --dwc-shadow: 0 22px 64px rgb(0 0 0 / 38%);
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  overflow: hidden;
  color: var(--dwc-text);
  background: transparent;
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* DSH host shell */
.dwc-launcher,
.dwc-overlay {
  pointer-events: auto;
}

.dwc-launcher {
  position: fixed;
  z-index: 1100;
  top: max(5.25rem, calc(env(safe-area-inset-top) + 4.25rem));
  right: max(1.25rem, env(safe-area-inset-right));
  bottom: auto;
  width: 12.4rem;
  min-height: 4.2rem;
  padding: 0.42rem 0.72rem 0.42rem 4.4rem;
  overflow: hidden;
  border: 1px solid #42616a;
  border-radius: 0.9rem;
  display: flex;
  align-items: center;
  color: var(--dwc-text);
  background: #0b1b24;
  box-shadow: 0 18px 48px rgb(0 0 0 / 42%);
  cursor: pointer;
  text-align: left;
  isolation: isolate;
}

.dwc-launcher::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(90deg, rgb(9 25 33 / 12%), #0b1b24 46%);
}

.dwc-launcher:hover {
  border-color: var(--dwc-teal);
  transform: translateY(-2px);
}

.dwc-launcher-art {
  position: absolute;
  z-index: -2;
  inset: 0 auto 0 0;
  width: 5.6rem;
  background-position: 68% 43%;
  background-size: cover;
  filter: saturate(0.82) brightness(0.82);
}

.dwc-launcher-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dwc-launcher-copy strong {
  font-family: Georgia, "Songti SC", serif;
  font-size: 1rem;
  font-weight: 500;
}

.dwc-launcher-copy small {
  margin-top: 0.1rem;
  overflow: hidden;
  color: var(--dwc-muted);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dwc-launcher-badge {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  width: 0.55rem;
  height: 0.55rem;
  border: 2px solid #0b1b24;
  border-radius: 50%;
  background: var(--dwc-amber);
  box-shadow: 0 0 0 3px rgb(221 169 97 / 15%);
}

.dwc-game-shell {
  width: min(90rem, calc(100vw - 2rem));
  height: min(56rem, calc(100dvh - 2rem));
  min-height: min(42rem, calc(100dvh - 2rem));
  overflow: hidden;
  border: 1px solid var(--dwc-line-strong);
  border-radius: 1rem;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  color: var(--dwc-text);
  background: var(--dwc-bg);
  box-shadow: 0 30px 90px rgb(0 0 0 / 55%);
}

.dwc-topbar {
  grid-row: 1;
  min-height: 3.65rem;
  padding: 0.55rem 0.72rem 0.55rem 1rem;
  border-bottom: 1px solid var(--dwc-line);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #091820;
}

.dwc-brand {
  min-width: 11rem;
  display: flex;
  align-items: center;
  gap: 0.68rem;
}

.dwc-brand > span:last-child {
  display: flex;
  flex-direction: column;
}

.dwc-brand strong {
  font-family: Georgia, "Songti SC", serif;
  font-size: 0.92rem;
  font-weight: 500;
}

.dwc-brand small {
  color: var(--dwc-faint);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.55rem;
  letter-spacing: 0.12em;
}

.dwc-mark {
  position: relative;
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid rgb(111 210 202 / 34%);
  border-radius: 50%;
  display: inline-block;
  flex: 0 0 auto;
  background: var(--dwc-teal-dark);
}

.dwc-mark-wave {
  position: absolute;
  right: 0.35rem;
  bottom: 0.44rem;
  left: 0.35rem;
  height: 0.34rem;
  border-bottom: 2px solid var(--dwc-teal);
  border-radius: 50%;
  transform: rotate(-8deg);
}

.dwc-mark-dot {
  position: absolute;
  top: 0.43rem;
  right: 0.44rem;
  width: 0.24rem;
  height: 0.24rem;
  border-radius: 50%;
  background: var(--dwc-amber);
}

.dwc-match-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.dwc-match-meta span {
  padding: 0.3rem 0.48rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.35rem;
  color: var(--dwc-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.62rem;
}

.dwc-top-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dwc-text-button,
.dwc-close-button {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  color: var(--dwc-muted);
  background: transparent;
  cursor: pointer;
}

.dwc-text-button { padding-inline: 0.7rem; font-size: 0.73rem; }
.dwc-close-button { font-size: 1.1rem; }

.dwc-text-button:hover,
.dwc-close-button:hover {
  color: var(--dwc-text);
  border-color: var(--dwc-line);
  background: var(--dwc-panel-soft);
}

.dwc-task-notice {
  grid-row: 2;
  min-height: 3.7rem;
  padding: 0.52rem 0.72rem 0.52rem 1rem;
  border-bottom: 1px solid rgb(221 169 97 / 32%);
  display: flex;
  align-items: center;
  gap: 0.7rem;
  background: #211c17;
}

.dwc-task-notice > span:not(.dwc-mark) {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.dwc-task-notice strong { font-size: 0.77rem; }
.dwc-task-notice small { color: #bcae9c; font-size: 0.66rem; }

.dwc-task-notice button {
  min-height: 38px;
  padding-inline: 0.7rem;
  border: 1px solid #65523a;
  border-radius: 0.45rem;
  color: #e4d2b8;
  background: transparent;
  cursor: pointer;
}

.dwc-error {
  grid-row: 3;
  min-height: 2.9rem;
  padding: 0.45rem 0.6rem 0.45rem 1rem;
  border-bottom: 1px solid rgb(239 142 127 / 35%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: #f5c7bf;
  background: #291816;
  font-size: 0.74rem;
}

.dwc-error button {
  width: 36px;
  height: 36px;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
}

.dwc-content {
  grid-row: 4;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-color: var(--dwc-line-strong) transparent;
}

.dwc-root *,
.dwc-root *::before,
.dwc-root *::after {
  box-sizing: border-box;
}

.dwc-root button,
.dwc-root input,
.dwc-root select,
.dwc-root textarea {
  font: inherit;
}

.dwc-root button {
  color: inherit;
}

.dwc-root button:focus-visible,
.dwc-root [tabindex]:focus-visible {
  outline: 3px solid #9ae9e2;
  outline-offset: 3px;
}

.dwc-root ::selection {
  color: #06181b;
  background: #9ae9e2;
}

.dwc-eyebrow {
  display: block;
  color: var(--dwc-teal);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1.45;
  text-transform: uppercase;
}

.dwc-button,
.dwc-icon-button {
  appearance: none;
  border: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.dwc-button {
  min-height: 44px;
  padding: 0.68rem 1.05rem;
  border: 1px solid transparent;
  border-radius: 0.62rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  font-weight: 720;
  letter-spacing: 0.01em;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.dwc-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.dwc-button:active:not(:disabled) {
  transform: translateY(0);
}

.dwc-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.dwc-button--primary {
  color: #06181b;
  background: var(--dwc-teal);
  border-color: #8de1da;
  box-shadow: 0 7px 20px rgb(65 186 179 / 17%);
}

.dwc-button--primary:hover:not(:disabled) {
  background: #8ae0d9;
}

.dwc-button--primary > span:not([aria-hidden]) {
  padding-left: 0.45rem;
  border-left: 1px solid rgb(6 24 27 / 22%);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.72rem;
}

.dwc-button--secondary {
  color: var(--dwc-text);
  background: #1b333d;
  border-color: var(--dwc-line-strong);
}

.dwc-button--secondary:hover:not(:disabled) {
  background: #24414b;
  border-color: #57747c;
}

.dwc-button--quiet {
  color: var(--dwc-muted);
  background: transparent;
  border-color: var(--dwc-line);
}

.dwc-button--quiet:hover:not(:disabled) {
  color: var(--dwc-text);
  background: rgb(255 255 255 / 5%);
  border-color: var(--dwc-line-strong);
}

.dwc-button--large {
  min-height: 52px;
  padding-inline: 1.35rem;
  font-size: 0.98rem;
}

.dwc-icon-button {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--dwc-line);
  border-radius: 0.6rem;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  color: var(--dwc-muted);
  background: rgb(4 15 21 / 58%);
  font-size: 1.45rem;
  line-height: 1;
}

.dwc-icon-button:hover {
  color: var(--dwc-text);
  background: var(--dwc-panel-soft);
  border-color: var(--dwc-line-strong);
}

/* Playing cards */
.dwc-card {
  position: relative;
  width: clamp(3.75rem, 5.1vw, 4.45rem);
  height: clamp(5.35rem, 7.25vw, 6.3rem);
  padding: 0.42rem;
  border: 1px solid #c6c0af;
  border-radius: 0.52rem;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  flex: 0 0 auto;
  color: var(--dwc-card-ink);
  background: var(--dwc-card);
  box-shadow: 0 5px 13px rgb(0 0 0 / 28%), inset 0 0 0 1px rgb(255 255 255 / 55%);
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1;
  user-select: none;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, opacity 150ms ease;
}

button.dwc-card {
  appearance: none;
  color: var(--dwc-card-ink);
  cursor: pointer;
}

button.dwc-card--red {
  color: #a43f37;
}

button.dwc-card:hover:not(:disabled) {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgb(0 0 0 / 34%), inset 0 0 0 1px rgb(255 255 255 / 58%);
}

button.dwc-card:disabled {
  cursor: default;
}

.dwc-card--selected,
button.dwc-card--selected:hover:not(:disabled) {
  z-index: 2;
  transform: translateY(-11px);
  border-color: #6dd6cd;
  box-shadow: 0 0 0 3px rgb(111 210 202 / 40%), 0 14px 26px rgb(0 0 0 / 36%);
}

.dwc-card--red {
  color: #a43f37;
}

.dwc-card--meld::after {
  content: "";
  position: absolute;
  right: 0.42rem;
  bottom: 0.42rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: #278a83;
  box-shadow: 0 0 0 2px rgb(39 138 131 / 16%);
}

.dwc-card__rank {
  font-size: clamp(1.02rem, 1.7vw, 1.3rem);
  font-weight: 760;
}

.dwc-card__suit {
  margin-top: 0.12rem;
  font-size: clamp(1.06rem, 1.85vw, 1.4rem);
}

.dwc-card__meld-dot {
  position: absolute;
  right: 0.42rem;
  bottom: 0.42rem;
  width: 0.42rem;
  height: 0.42rem;
  overflow: hidden;
  border-radius: 50%;
  color: transparent;
  background: #278a83;
}

.dwc-card--compact {
  width: 2.85rem;
  height: 4.05rem;
  padding: 0.3rem;
  border-radius: 0.4rem;
}

.dwc-card--compact .dwc-card__rank,
.dwc-card--compact .dwc-card__suit {
  font-size: 0.9rem;
}

.dwc-card--back {
  overflow: hidden;
  padding: 0.32rem;
  border-color: #41616a;
  color: transparent;
  background: #12333d;
  box-shadow: 0 5px 13px rgb(0 0 0 / 28%), inset 0 0 0 2px #0b222b, inset 0 0 0 4px #54747a;
}

.dwc-card--back > i {
  width: 100%;
  height: 100%;
  border: 1px solid #77949a;
  border-radius: 0.28rem;
  display: block;
  background: #173f49;
  opacity: 0.7;
}

.dwc-card--empty {
  border-style: dashed;
  border-color: var(--dwc-line-strong);
  background: transparent;
  box-shadow: none;
}

/* Welcome */
.dwc-welcome {
  position: relative;
  min-height: min(780px, 100dvh);
  overflow: hidden;
  background: #07151d;
  isolation: isolate;
}

.dwc-welcome__art {
  position: absolute;
  z-index: -2;
  inset: 0 0 0 38%;
  overflow: hidden;
  background: #0b2029;
}

.dwc-welcome__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 65% center;
  filter: saturate(0.88) contrast(1.04);
}

.dwc-welcome__art span {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #07151d 0%, rgb(7 21 29 / 92%) 12%, rgb(7 21 29 / 24%) 58%, rgb(7 21 29 / 8%) 100%);
}

.dwc-welcome__content {
  width: min(46rem, 62%);
  min-height: min(780px, 100dvh);
  padding: clamp(2.2rem, 7vh, 5.5rem) clamp(1.5rem, 5.6vw, 5rem) clamp(1.8rem, 4vh, 3rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dwc-welcome__copy {
  max-width: 35rem;
}

.dwc-welcome h1 {
  margin: 0.75rem 0 0;
  color: var(--dwc-text);
  font-family: Georgia, "Songti SC", serif;
  font-size: clamp(3.2rem, 8vw, 6.6rem);
  font-weight: 500;
  letter-spacing: -0.065em;
  line-height: 0.94;
}

.dwc-welcome__lede {
  max-width: 32rem;
  margin: clamp(1.5rem, 4vh, 2.8rem) 0 0;
  color: #c8d6d4;
  font-size: clamp(1rem, 1.45vw, 1.12rem);
  line-height: 1.9;
}

.dwc-welcome__features {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.48rem;
}

.dwc-welcome__features span {
  padding: 0.38rem 0.58rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.35rem;
  color: var(--dwc-muted);
  background: rgb(5 19 26 / 56%);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.7rem;
}

.dwc-welcome__actions {
  margin-top: clamp(1.75rem, 4.5vh, 3rem);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dwc-welcome__footer {
  margin-top: 3rem;
  padding-top: 1.3rem;
  border-top: 1px solid var(--dwc-line);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}

.dwc-welcome__companion {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.dwc-avatar {
  width: 2.65rem;
  height: 2.65rem;
  border: 1px solid #4d7378;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: var(--dwc-teal);
  background: var(--dwc-teal-dark);
  font-family: Georgia, "Songti SC", serif;
}

.dwc-welcome__companion p {
  min-width: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.dwc-welcome__companion strong {
  font-size: 0.83rem;
}

.dwc-welcome__companion p span {
  max-width: 16rem;
  overflow: hidden;
  color: var(--dwc-muted);
  font-size: 0.74rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dwc-stats {
  margin: 0;
  display: flex;
  gap: clamp(0.9rem, 2vw, 1.6rem);
}

.dwc-stats > div {
  min-width: 3.4rem;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
}

.dwc-stats dt {
  color: var(--dwc-faint);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.62rem;
  white-space: nowrap;
}

.dwc-stats dd {
  margin: 0;
  color: var(--dwc-text);
  font-size: 1.02rem;
  font-weight: 720;
}

/* Table */
.dwc-table {
  min-height: min(820px, 100dvh);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: var(--dwc-bg);
}

.dwc-table__bar {
  min-height: 4.15rem;
  padding: 0.72rem clamp(1rem, 2.2vw, 1.8rem);
  border-bottom: 1px solid var(--dwc-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #08171f;
}

.dwc-table__identity {
  display: flex;
  flex-direction: column;
}

.dwc-table__identity strong {
  font-family: Georgia, "Songti SC", serif;
  font-size: 1.2rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.dwc-table__tools {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
}

.dwc-table__tools button {
  min-height: 2rem;
  padding: 0.28rem 0.62rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.38rem;
  color: var(--dwc-muted);
  background: transparent;
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
}

.dwc-table__tools button:hover {
  color: var(--dwc-text);
  border-color: var(--dwc-line-strong);
  background: rgb(255 255 255 / 4%);
}

.dwc-score {
  margin: 0;
  display: flex;
  align-items: center;
  gap: clamp(0.8rem, 2vw, 1.5rem);
}

.dwc-score > div {
  min-width: 2.5rem;
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  gap: 0.45rem;
}

.dwc-score dt {
  color: var(--dwc-muted);
  font-size: 0.75rem;
}

.dwc-score dd {
  margin: 0;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 1.25rem;
  font-weight: 720;
}

.dwc-score .dwc-score__round {
  padding: 0 1rem;
  border-inline: 1px solid var(--dwc-line);
}

.dwc-score__round dd {
  color: var(--dwc-teal);
  font-size: 0.83rem;
}

.dwc-table__stage {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(17.5rem, 0.72fr) minmax(31rem, 1.45fr);
}

.dwc-companion {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--dwc-line);
  background: #0b2028;
}

.dwc-companion__art {
  width: 100%;
  height: 100%;
  min-height: 42rem;
  display: block;
  object-fit: cover;
  object-position: 67% center;
  filter: saturate(0.82) brightness(0.8);
}

.dwc-companion__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgb(5 17 23 / 12%) 20%, rgb(5 17 23 / 18%) 45%, rgb(5 17 23 / 92%) 100%);
  pointer-events: none;
}

.dwc-companion__meta {
  position: absolute;
  inset: 1.15rem 1.15rem auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dwc-companion__meta strong {
  display: block;
  margin-top: 0.2rem;
  font-family: Georgia, "Songti SC", serif;
  font-size: 1.25rem;
  font-weight: 500;
}

.dwc-rapport {
  width: 7rem;
  padding: 0.48rem 0.55rem;
  border: 1px solid rgb(111 210 202 / 35%);
  border-radius: 0.42rem;
  background: rgb(4 16 22 / 68%);
  backdrop-filter: blur(8px);
}

.dwc-rapport span {
  display: block;
  color: #d7e6e3;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.62rem;
}

.dwc-rapport i {
  position: relative;
  width: 100%;
  height: 0.18rem;
  margin-top: 0.38rem;
  overflow: hidden;
  display: block;
  background: #30464c;
}

.dwc-rapport i::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--dwc-progress, 0%);
  background: var(--dwc-teal);
}

.dwc-dialogue {
  position: absolute;
  right: 1.15rem;
  bottom: 1.15rem;
  left: 1.15rem;
  min-height: 6.4rem;
  padding: 0.9rem 3.65rem 0.9rem 1rem;
  border: 1px solid rgb(111 210 202 / 30%);
  border-radius: 0.75rem;
  color: var(--dwc-text);
  background: rgb(5 19 26 / 86%);
  box-shadow: 0 15px 35px rgb(0 0 0 / 30%);
  backdrop-filter: blur(12px);
}

.dwc-dialogue__name {
  color: var(--dwc-teal);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.68rem;
  font-weight: 700;
}

.dwc-dialogue p {
  margin: 0.3rem 0 0;
  color: #dce8e6;
  font-size: 0.88rem;
  line-height: 1.65;
}

.dwc-dialogue .dwc-icon-button {
  position: absolute;
  right: 0.65rem;
  bottom: 0.65rem;
}

.dwc-play-area {
  min-width: 0;
  min-height: 0;
  padding: clamp(0.85rem, 2.3vh, 1.45rem) clamp(0.9rem, 2.1vw, 1.6rem);
  display: grid;
  grid-template-rows: minmax(6.5rem, auto) minmax(13rem, 1fr) minmax(12.5rem, auto);
  gap: 0.8rem;
  background: #0a1921;
}

.dwc-opponent-zone,
.dwc-player-zone {
  min-width: 0;
}

.dwc-zone-label {
  min-height: 1.4rem;
  margin-bottom: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--dwc-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.67rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dwc-zone-label output {
  color: var(--dwc-faint);
  font: inherit;
}

.dwc-opponent-hand {
  height: 4.25rem;
  padding-left: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
}

.dwc-opponent-hand .dwc-card + .dwc-card {
  margin-left: -1.25rem;
}

.dwc-opponent-hand .dwc-card:nth-child(odd) { transform: translateY(0.16rem); }
.dwc-opponent-hand .dwc-card:nth-child(even) { transform: translateY(0); }

.dwc-table-center {
  min-height: 13rem;
  padding: 0.8rem;
  border-block: 1px solid var(--dwc-line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.dwc-pile-group {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: clamp(1.5rem, 6vw, 3.5rem);
}

.dwc-pile {
  position: relative;
  min-width: 5.25rem;
  min-height: 8.5rem;
  padding: 0.15rem 0.35rem 1.65rem;
  border: 0;
  border-radius: 0.65rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.dwc-pile:not(:disabled):hover .dwc-card {
  transform: translateY(-4px) rotate(-1deg);
  border-color: var(--dwc-teal);
}

.dwc-pile:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dwc-pile .dwc-card {
  pointer-events: none;
}

.dwc-pile__label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  color: var(--dwc-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.66rem;
  text-align: center;
}

.dwc-pile__label b {
  color: var(--dwc-text);
  font-weight: 700;
}

.dwc-turn-status {
  min-height: 2rem;
  padding: 0.35rem 0.72rem;
  border: 1px solid var(--dwc-line);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--dwc-muted);
  background: #0d2028;
  font-size: 0.75rem;
}

.dwc-status-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: var(--dwc-teal);
  box-shadow: 0 0 0 0.2rem rgb(111 210 202 / 12%);
}

.dwc-status-dot--thinking {
  animation: dwc-pulse 1.2s ease-in-out infinite;
}

@keyframes dwc-pulse {
  50% { opacity: 0.35; transform: scale(0.74); }
}

.dwc-player-zone {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.dwc-hand {
  min-height: 7.35rem;
  margin: 0;
  padding: 0.85rem 0.4rem 0.4rem;
  display: flex;
  align-items: flex-end;
  gap: clamp(0.18rem, 0.65vw, 0.45rem);
  overflow-x: auto;
  overflow-y: hidden;
  list-style: none;
  scrollbar-color: var(--dwc-line-strong) transparent;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}

.dwc-hand__card {
  position: relative;
  flex: 0 0 auto;
  scroll-snap-align: center;
}

.dwc-hand__card--locked .dwc-card {
  filter: saturate(0.65);
}

.dwc-hand__hint {
  position: absolute;
  z-index: 4;
  right: 50%;
  bottom: 0.28rem;
  padding: 0.12rem 0.2rem;
  transform: translateX(50%);
  color: #5c2f2a;
  background: #f2c9bd;
  font-size: 0.52rem;
  font-weight: 750;
  line-height: 1.1;
  white-space: nowrap;
  pointer-events: none;
}

.dwc-actions {
  min-height: 3.25rem;
  margin-top: 0.7rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--dwc-line);
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) auto auto;
  align-items: center;
  gap: 0.55rem;
}

.dwc-actions__selection {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--dwc-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.69rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Result */
.dwc-result {
  min-height: min(760px, 100dvh);
  padding: clamp(1.25rem, 3.5vw, 2.8rem);
  display: flex;
  flex-direction: column;
  background: #08171f;
}

.dwc-result__hero {
  padding-bottom: clamp(1.4rem, 3vw, 2.4rem);
  border-bottom: 1px solid var(--dwc-line);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
}

.dwc-result__hero h2,
.dwc-result--empty h2 {
  max-width: 42rem;
  margin: 0.55rem 0 0;
  font-family: Georgia, "Songti SC", serif;
  font-size: clamp(2rem, 5vw, 4.3rem);
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.dwc-result__hero p,
.dwc-result--empty p {
  max-width: 38rem;
  margin: 0.85rem 0 0;
  color: var(--dwc-muted);
  line-height: 1.75;
}

.dwc-result-score {
  margin: 0;
  padding: 1rem 1.15rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.7rem;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background: var(--dwc-bg-raised);
}

.dwc-result-score > div {
  min-width: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dwc-result-score dt {
  color: var(--dwc-muted);
  font-size: 0.68rem;
}

.dwc-result-score dd {
  margin: 0.12rem 0 0;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 1.65rem;
  font-weight: 730;
}

.dwc-result-score > span {
  color: var(--dwc-line-strong);
}

.dwc-result__hands {
  margin: clamp(1.25rem, 3vw, 2.4rem) 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.dwc-result-hand {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.75rem;
  background: var(--dwc-bg-raised);
}

.dwc-result-hand > header {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--dwc-line);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.dwc-result-hand > header strong {
  font-size: 0.93rem;
}

.dwc-result-hand > header span {
  color: var(--dwc-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.66rem;
}

.dwc-result-hand__groups {
  min-height: 12.3rem;
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.dwc-result-meld {
  min-width: 0;
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
}

.dwc-result-meld > span {
  color: var(--dwc-teal);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.62rem;
}

.dwc-result-meld > div {
  min-width: 0;
  padding: 0.2rem;
  display: flex;
  gap: 0.28rem;
  overflow-x: auto;
}

.dwc-result-meld--deadwood > span {
  color: var(--dwc-amber);
}

.dwc-result__footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--dwc-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.dwc-result__footer > p {
  margin: 0;
  display: flex;
  gap: 1rem;
  color: var(--dwc-muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.68rem;
}

.dwc-result__footer > div {
  display: flex;
  gap: 0.65rem;
}

.dwc-result--empty {
  align-items: flex-start;
  justify-content: center;
}

.dwc-result--empty .dwc-button {
  margin-top: 1.2rem;
}

/* Modal panels */
.dwc-overlay {
  position: fixed;
  z-index: 1200;
  inset: 0;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  display: grid;
  place-items: center;
  background: rgb(2 10 14 / 78%);
  backdrop-filter: blur(6px);
}

.dwc-dialog {
  width: min(42rem, 100%);
  max-height: min(48rem, calc(100dvh - 2rem));
  overflow: auto;
  border: 1px solid var(--dwc-line-strong);
  border-radius: 0.9rem;
  color: var(--dwc-text);
  background: #0b1c24;
  box-shadow: var(--dwc-shadow);
  scrollbar-color: var(--dwc-line-strong) transparent;
}

.dwc-dialog__header {
  position: sticky;
  z-index: 2;
  top: 0;
  padding: 1.15rem 1.25rem;
  border-bottom: 1px solid var(--dwc-line);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: #0b1c24;
}

.dwc-dialog__header h2 {
  margin: 0.25rem 0 0;
  font-family: Georgia, "Songti SC", serif;
  font-size: clamp(1.55rem, 4vw, 2.2rem);
  font-weight: 500;
  line-height: 1.15;
}

.dwc-dialog__intro {
  margin: 0;
  padding: 1.15rem 1.25rem 0;
  color: var(--dwc-muted);
  font-size: 0.89rem;
  line-height: 1.75;
}

.dwc-dialog__footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--dwc-line);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
}

.dwc-dialog__footer > p {
  margin: 0 auto 0 0;
  color: var(--dwc-faint);
  font-size: 0.7rem;
}

.dwc-rules__steps {
  margin: 0;
  padding: 1.1rem 1.25rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  list-style: none;
}

.dwc-rules__steps li {
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.62rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.7rem;
  background: #10242d;
}

.dwc-rules__steps li > span {
  color: var(--dwc-teal);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.65rem;
  font-weight: 700;
}

.dwc-rules__steps strong {
  font-size: 0.86rem;
}

.dwc-rules__steps p {
  margin: 0.28rem 0 0;
  color: var(--dwc-muted);
  font-size: 0.76rem;
  line-height: 1.6;
}

.dwc-rules__grid {
  padding: 0 1.25rem 1.1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.dwc-rules__grid > section {
  padding: 0.9rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.62rem;
}

.dwc-rules__grid h3 {
  margin: 0 0 0.6rem;
  color: var(--dwc-text);
  font-size: 0.8rem;
}

.dwc-rules__grid dl {
  margin: 0;
}

.dwc-rules__grid dl > div {
  min-height: 1.9rem;
  border-top: 1px solid rgb(41 65 74 / 55%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  font-size: 0.71rem;
}

.dwc-rules__grid dt {
  color: var(--dwc-muted);
}

.dwc-rules__grid dd {
  margin: 0;
  color: var(--dwc-text);
  font-family: "SFMono-Regular", Consolas, monospace;
}

.dwc-rules__note {
  margin: 0 1.25rem 1.1rem;
  padding: 0.75rem 0.85rem;
  border-left: 2px solid var(--dwc-amber);
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  color: var(--dwc-muted);
  background: rgb(221 169 97 / 7%);
}

.dwc-rules__note > span {
  color: var(--dwc-amber);
  font-size: 1.1rem;
}

.dwc-rules__note p {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.6;
}

.dwc-rules__note strong {
  margin-right: 0.45rem;
  color: #ecd4ac;
}

.dwc-settings {
  width: min(43rem, 100%);
}

.dwc-settings__group {
  padding: 1.05rem 1.25rem;
  border-bottom: 1px solid var(--dwc-line);
}

.dwc-settings__label {
  margin-bottom: 0.7rem;
}

.dwc-settings__label h3 {
  margin: 0;
  font-size: 0.88rem;
}

.dwc-settings__label p {
  margin: 0.2rem 0 0;
  color: var(--dwc-muted);
  font-size: 0.72rem;
}

.dwc-segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.dwc-segmented__option {
  min-height: 4.2rem;
  padding: 0.65rem;
  border: 1px solid var(--dwc-line);
  border-radius: 0.55rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  color: var(--dwc-muted);
  background: #0e222b;
  cursor: pointer;
  text-align: left;
}

.dwc-segmented__option:hover {
  border-color: var(--dwc-line-strong);
  background: #142b34;
}

.dwc-segmented__option.is-active {
  color: var(--dwc-text);
  border-color: var(--dwc-teal);
  background: #123339;
  box-shadow: inset 0 0 0 1px rgb(111 210 202 / 18%);
}

.dwc-segmented__option strong {
  font-size: 0.8rem;
}

.dwc-segmented__option span {
  margin-top: 0.18rem;
  color: var(--dwc-faint);
  font-size: 0.64rem;
  line-height: 1.35;
}

.dwc-segmented__option.is-active span {
  color: #b9d1cf;
}

.dwc-settings__toggles {
  border-bottom: 1px solid var(--dwc-line);
}

.dwc-toggle-row,
.dwc-settings__tutorial {
  min-height: 4.6rem;
  padding: 0.8rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.dwc-toggle-row + .dwc-toggle-row {
  border-top: 1px solid rgb(41 65 74 / 60%);
}

.dwc-toggle-row > div,
.dwc-settings__tutorial > div {
  display: flex;
  flex-direction: column;
}

.dwc-toggle-row strong,
.dwc-settings__tutorial strong {
  font-size: 0.82rem;
}

.dwc-toggle-row > div span,
.dwc-settings__tutorial > div span {
  margin-top: 0.18rem;
  color: var(--dwc-muted);
  font-size: 0.69rem;
}

.dwc-switch {
  position: relative;
  width: 3.25rem;
  height: 44px;
  flex: 0 0 auto;
  border: 1px solid var(--dwc-line-strong);
  border-radius: 999px;
  background: #172b34;
  cursor: pointer;
}

.dwc-switch span {
  position: absolute;
  top: 50%;
  left: 0.38rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  transform: translateY(-50%);
  background: var(--dwc-muted);
  transition: left 150ms ease, background-color 150ms ease;
}

.dwc-switch[aria-checked="true"] {
  border-color: var(--dwc-teal);
  background: var(--dwc-teal-dark);
}

.dwc-switch[aria-checked="true"] span {
  left: 1.52rem;
  background: var(--dwc-teal);
}

.dwc-settings__tutorial {
  background: rgb(255 255 255 / 1.5%);
}

@media (max-width: 980px) {
  .dwc-table {
    min-height: 100dvh;
  }

  .dwc-table__stage {
    grid-template-columns: minmax(14rem, 0.52fr) minmax(28rem, 1fr);
  }

  .dwc-companion__meta {
    flex-direction: column;
  }

  .dwc-companion__art {
    object-position: 63% center;
  }

  .dwc-welcome__content {
    width: 68%;
  }

  .dwc-welcome__art {
    left: 32%;
  }
}

@media (max-width: 760px) {
  .dwc-launcher {
    top: max(4.25rem, calc(env(safe-area-inset-top) + 3.5rem));
    right: max(0.75rem, env(safe-area-inset-right));
    width: 3.75rem;
    min-height: 3.75rem;
    padding: 0;
    border-radius: 50%;
  }

  .dwc-launcher-art {
    width: 100%;
    background-position: 63% 36%;
  }

  .dwc-launcher::after {
    background: linear-gradient(180deg, transparent 45%, rgb(11 27 36 / 74%));
  }

  .dwc-launcher-copy {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    border: 0;
    white-space: nowrap;
  }

  .dwc-overlay {
    padding: 0;
  }

  .dwc-game-shell {
    width: 100vw;
    height: 100dvh;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .dwc-topbar {
    padding-inline: 0.65rem;
    gap: 0.35rem;
  }

  .dwc-brand {
    min-width: 0;
    margin-right: auto;
  }

  .dwc-brand small,
  .dwc-match-meta {
    display: none;
  }

  .dwc-text-button {
    padding-inline: 0.5rem;
  }

  .dwc-welcome {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .dwc-welcome__art {
    position: relative;
    inset: auto;
    width: 100%;
    height: clamp(14rem, 39vh, 22rem);
    flex: 0 0 auto;
  }

  .dwc-welcome__art img {
    object-position: 66% 35%;
  }

  .dwc-welcome__art span {
    background: linear-gradient(180deg, rgb(7 21 29 / 4%) 40%, #07151d 100%);
  }

  .dwc-welcome__content {
    width: 100%;
    min-height: auto;
    margin-top: -1.25rem;
    padding: 0 1.15rem max(1.4rem, env(safe-area-inset-bottom));
  }

  .dwc-welcome h1 {
    font-size: clamp(3rem, 17vw, 5rem);
  }

  .dwc-welcome__lede {
    margin-top: 1.15rem;
    line-height: 1.72;
  }

  .dwc-welcome__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .dwc-stats {
    width: 100%;
    justify-content: space-between;
  }

  .dwc-stats > div {
    align-items: flex-start;
  }

  .dwc-table__bar {
    min-height: 3.7rem;
  }

  .dwc-table__identity .dwc-eyebrow {
    display: none;
  }

  .dwc-table__stage {
    display: flex;
    flex-direction: column;
  }

  .dwc-companion {
    min-height: 12.5rem;
    max-height: 12.5rem;
    border-right: 0;
    border-bottom: 1px solid var(--dwc-line);
  }

  .dwc-companion__art {
    min-height: 12.5rem;
    object-position: 64% 30%;
  }

  .dwc-companion__shade {
    background: linear-gradient(90deg, rgb(5 17 23 / 4%) 20%, rgb(5 17 23 / 32%) 60%, rgb(5 17 23 / 82%) 100%);
  }

  .dwc-companion__meta {
    inset: 0.8rem auto auto 0.8rem;
  }

  .dwc-rapport {
    display: none;
  }

  .dwc-dialogue {
    top: 50%;
    right: 0.7rem;
    bottom: auto;
    left: 43%;
    min-height: 6.3rem;
    transform: translateY(-50%);
  }

  .dwc-play-area {
    min-height: 37rem;
    padding: 0.75rem;
    grid-template-rows: 5.5rem 12.2rem minmax(13rem, auto);
  }

  .dwc-opponent-hand {
    height: 3.75rem;
  }

  .dwc-opponent-hand .dwc-card {
    width: 2.55rem;
    height: 3.65rem;
  }

  .dwc-table-center {
    min-height: 12rem;
  }

  .dwc-hand {
    min-height: 7.4rem;
    margin-inline: -0.75rem;
    padding-inline: 0.75rem;
  }

  .dwc-actions {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .dwc-result__hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .dwc-result-score {
    width: 100%;
    justify-content: center;
  }

  .dwc-result__hands {
    grid-template-columns: 1fr;
  }

  .dwc-result__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .dwc-result__footer > div {
    width: 100%;
  }

  .dwc-result__footer .dwc-button {
    flex: 1;
  }
}

@media (max-width: 520px) {
  .dwc-welcome__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .dwc-welcome__actions .dwc-button {
    width: 100%;
  }

  .dwc-welcome__features span {
    font-size: 0.63rem;
  }

  .dwc-score {
    gap: 0.55rem;
  }

  .dwc-score .dwc-score__round {
    padding-inline: 0.55rem;
  }

  .dwc-score > div {
    min-width: auto;
    gap: 0.25rem;
  }

  .dwc-score dt {
    font-size: 0.67rem;
  }

  .dwc-score dd {
    font-size: 1rem;
  }

  .dwc-dialogue {
    left: 38%;
    padding-right: 3.3rem;
  }

  .dwc-dialogue p {
    font-size: 0.78rem;
  }

  .dwc-card {
    width: 3.65rem;
    height: 5.2rem;
  }

  .dwc-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dwc-actions__selection {
    grid-column: 1 / -1;
  }

  .dwc-actions .dwc-button {
    width: 100%;
  }

  .dwc-result {
    padding: 1rem;
  }

  .dwc-result__footer > p {
    width: 100%;
    justify-content: space-between;
  }

  .dwc-result__footer > div {
    flex-direction: column-reverse;
  }

  .dwc-rules__steps,
  .dwc-rules__grid {
    grid-template-columns: 1fr;
  }

  .dwc-dialog__footer {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .dwc-dialog__footer .dwc-button {
    width: 100%;
  }

  .dwc-segmented {
    grid-template-columns: 1fr;
  }

  .dwc-segmented__option {
    min-height: 3.4rem;
  }

  .dwc-toggle-row,
  .dwc-settings__tutorial {
    padding-inline: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dwc-root *,
  .dwc-root *::before,
  .dwc-root *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`
