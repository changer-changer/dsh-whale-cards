/**
 * Teahouse shell styles (dth-*). Extends the harbor palette (dwc-*) into a
 * calm, curated arcade: launcher, lobby cards with per-game accent hues,
 * game container, task notice and the Lanyin dock.
 *
 * @module teahouse/teahouse-styles
 */

export const STYLE_ELEMENT_ID = 'dsh-teahouse-styles'

export const TEAHOUSE_STYLES = String.raw`
.dth-root {
  --dth-bg: #06131a;
  --dth-bg-raised: #0b1b24;
  --dth-panel: #10232c;
  --dth-panel-soft: #142a33;
  --dth-line: #29414a;
  --dth-line-strong: #42616a;
  --dth-text: #eef5f3;
  --dth-muted: #a9bdbe;
  --dth-faint: #789094;
  --dth-teal: #6fd2ca;
  --dth-amber: #dda961;
  --dth-danger: #ef8e7f;
  --dth-accent: 195;
  --dth-accent-color: hsl(var(--dth-accent) 55% 62%);
  --dth-accent-soft: hsl(var(--dth-accent) 40% 22%);
  --dth-shadow: 0 22px 64px rgb(0 0 0 / 38%);
  position: relative;
  min-height: 100%;
  color: var(--dth-text);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  color-scheme: dark;
}

.dth-launcher,
.dth-overlay { pointer-events: auto; }

/* ---------- launcher ---------- */

.dth-launcher {
  position: fixed;
  z-index: 1100;
  top: max(5.25rem, calc(env(safe-area-inset-top) + 4.25rem));
  right: max(1.25rem, env(safe-area-inset-right));
  width: 12.4rem;
  min-height: 4.2rem;
  padding: 0.42rem 0.72rem 0.42rem 4.4rem;
  overflow: hidden;
  border: 1px solid var(--dth-line-strong);
  border-radius: 0.9rem;
  display: flex;
  align-items: center;
  color: var(--dth-text);
  background: var(--dth-bg-raised);
  box-shadow: 0 18px 48px rgb(0 0 0 / 42%);
  cursor: pointer;
  text-align: left;
  isolation: isolate;
  transition: transform 160ms ease, border-color 160ms ease;
}

.dth-launcher::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(90deg, rgb(9 25 33 / 12%), var(--dth-bg-raised) 46%);
}

.dth-launcher:hover {
  border-color: var(--dth-teal);
  transform: translateY(-2px);
}

.dth-launcher-art {
  position: absolute;
  z-index: -2;
  inset: 0 auto 0 0;
  width: 5.6rem;
  background-position: 68% 43%;
  background-size: 175%;
}

.dth-launcher-copy { display: grid; gap: 0.1rem; }
.dth-launcher-copy strong { font-size: 0.95rem; letter-spacing: 0.02em; }
.dth-launcher-copy small { color: var(--dth-muted); font-size: 0.72rem; }

.dth-launcher-badge {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--dth-amber);
  box-shadow: 0 0 0 0 rgb(221 169 97 / 60%);
  animation: dth-pulse 2.2s infinite;
}

@keyframes dth-pulse {
  0% { box-shadow: 0 0 0 0 rgb(221 169 97 / 55%); }
  70% { box-shadow: 0 0 0 9px rgb(221 169 97 / 0%); }
  100% { box-shadow: 0 0 0 0 rgb(221 169 97 / 0%); }
}

/* ---------- overlay shell ---------- */

.dth-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: rgb(3 9 13 / 62%);
  backdrop-filter: blur(10px);
  animation: dth-fade-in 180ms ease;
}

@keyframes dth-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dth-shell {
  --dth-accent-color: hsl(var(--dth-accent) 55% 62%);
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(100%, 92rem);
  min-height: min(44rem, calc(100dvh - 1rem));
  max-height: calc(100dvh - 1rem);
  margin: clamp(0.4rem, 2.4vh, 1.6rem) clamp(0.4rem, 2vw, 1.6rem);
  border: 1px solid var(--dth-line);
  border-radius: 1.2rem;
  background:
    radial-gradient(120% 90% at 85% -10%, hsl(var(--dth-accent) 45% 16% / 70%), transparent 55%),
    linear-gradient(180deg, var(--dth-bg-raised), var(--dth-bg) 30%);
  box-shadow: var(--dth-shadow);
  overflow: hidden;
  animation: dth-rise 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
}

@keyframes dth-rise {
  from { transform: translateY(14px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* ---------- top bar ---------- */

.dth-topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 1.1rem;
  border-bottom: 1px solid var(--dth-line);
  background: rgb(6 19 26 / 55%);
}

.dth-brand { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.dth-brand span { display: grid; }
.dth-brand strong { font-size: 1rem; letter-spacing: 0.02em; white-space: nowrap; }
.dth-brand small { color: var(--dth-faint); font-size: 0.62rem; letter-spacing: 0.22em; }

.dth-mark { position: relative; display: inline-block; width: 1.6rem; height: 1.2rem; }
.dth-mark-wave {
  position: absolute; inset: auto 0 0.28rem 0; height: 0.5rem;
  border-radius: 0.6rem 0.6rem 0 0;
  background: linear-gradient(180deg, hsl(var(--dth-accent) 55% 62%), hsl(var(--dth-accent) 45% 40%));
}
.dth-mark-dot {
  position: absolute; top: 0.05rem; left: 50%; width: 0.34rem; height: 0.34rem;
  margin-left: -0.17rem; border-radius: 50%;
  background: var(--dth-amber);
}

.dth-top-actions { display: flex; gap: 0.4rem; }

.dth-top-right { display: flex; align-items: center; gap: 0.8rem; margin-left: auto; }
.dth-stats { color: var(--dth-faint); font-size: 0.72rem; white-space: nowrap; }

.dth-text-button {
  border: none; background: none; color: var(--dth-muted);
  font-size: 0.8rem; padding: 0.3rem 0.5rem; border-radius: 0.5rem; cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}
.dth-text-button:hover { color: var(--dth-text); background: rgb(111 210 202 / 10%); }

.dth-close-button {
  border: 1px solid var(--dth-line);
  background: var(--dth-panel-soft);
  color: var(--dth-text);
  width: 1.9rem; height: 1.9rem; border-radius: 0.6rem;
  font-size: 0.9rem; line-height: 1; cursor: pointer;
  transition: border-color 120ms ease, transform 120ms ease;
}
.dth-close-button:hover { border-color: var(--dth-teal); transform: translateY(-1px); }

/* ---------- task notice ---------- */

.dth-task-notice {
  display: flex; align-items: center; gap: 0.7rem;
  margin: 0.8rem 1.1rem 0;
  padding: 0.6rem 0.9rem;
  border: 1px solid rgb(221 169 97 / 45%);
  border-radius: 0.8rem;
  background: linear-gradient(90deg, rgb(221 169 97 / 14%), rgb(221 169 97 / 5%));
  animation: dth-rise 260ms ease;
}
.dth-task-notice strong { display: block; font-size: 0.86rem; }
.dth-task-notice small { color: var(--dth-muted); font-size: 0.74rem; }
.dth-task-notice button {
  margin-left: auto; flex-shrink: 0;
  border: 1px solid rgb(221 169 97 / 50%); background: none; color: var(--dth-amber);
  padding: 0.34rem 0.8rem; border-radius: 0.6rem; font-size: 0.76rem; cursor: pointer;
}
.dth-task-notice button:hover { background: rgb(221 169 97 / 12%); }

/* ---------- body / lobby ---------- */

.dth-body {
  flex: 1; min-height: 0;
  overflow-y: auto; overscroll-behavior: contain;
  padding: 1rem 1.1rem;
  scrollbar-width: thin; scrollbar-color: var(--dth-line) transparent;
}

.dth-empty { color: var(--dth-muted); text-align: center; padding: 2.4rem 0; }

.dth-lobby { display: grid; gap: 1rem; max-width: 56rem; margin: 0 auto; }

.dth-lobby-hero {
  position: relative;
  border: 1px solid var(--dth-line);
  border-radius: 1rem;
  min-height: 9.5rem;
  display: flex; align-items: flex-end;
  background-position: 72% 40%;
  background-size: cover;
  overflow: hidden;
}
.dth-lobby-hero::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgb(6 19 26 / 10%) 30%, rgb(6 19 26 / 88%));
}
.dth-lobby-hero-copy {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 0.9rem;
  padding: 1rem 1.2rem;
}
.dth-lobby-face {
  display: inline-flex; align-items: center; justify-content: center;
  width: 3.2rem; height: 3.2rem; flex-shrink: 0;
  border-radius: 1rem;
  border: 1px solid rgb(111 210 202 / 35%);
  background: rgb(9 25 33 / 78%);
  font-size: 1.25rem; letter-spacing: 0.04em;
}
.dth-lobby-hero-copy h1 { margin: 0; font-size: 1.15rem; font-weight: 650; }
.dth-lobby-hero-copy p { margin: 0.15rem 0 0; color: var(--dth-muted); font-size: 0.8rem; }

.dth-lobby-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: 0.9rem; }

.dth-game-card {
  --dth-card-accent: 195;
  position: relative;
  display: flex; align-items: center; gap: 0.9rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--dth-line);
  border-radius: 1rem;
  background:
    radial-gradient(130% 120% at 100% 0%, hsl(var(--dth-card-accent) 40% 20% / 55%), transparent 55%),
    var(--dth-panel);
  color: var(--dth-text);
  text-align: left; cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease;
}
.dth-game-card:hover {
  transform: translateY(-3px);
  border-color: hsl(var(--dth-card-accent) 55% 55%);
}

.dth-game-glyph {
  display: inline-flex; align-items: center; justify-content: center;
  width: 3rem; height: 3rem; flex-shrink: 0;
  border-radius: 0.9rem;
  border: 1px solid hsl(var(--dth-card-accent) 45% 40%);
  background: hsl(var(--dth-card-accent) 40% 16%);
  font-size: 1.35rem;
}

.dth-game-copy { display: grid; gap: 0.18rem; min-width: 0; }
.dth-game-copy strong { font-size: 0.95rem; display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
.dth-game-copy small { color: var(--dth-muted); font-size: 0.75rem; }
.dth-game-why { color: var(--dth-faint); font-size: 0.72rem; }

.dth-game-resume {
  font-style: normal; font-size: 0.62rem; font-weight: 600;
  padding: 0.12rem 0.45rem; border-radius: 99px;
  color: hsl(var(--dth-card-accent) 70% 78%);
  background: hsl(var(--dth-card-accent) 45% 22%);
  border: 1px solid hsl(var(--dth-card-accent) 45% 38%);
}

.dth-game-tags { display: flex; gap: 0.4rem; margin-top: 0.25rem; }
.dth-game-tags i {
  font-style: normal; font-size: 0.66rem; color: var(--dth-muted);
  border: 1px solid var(--dth-line); border-radius: 99px; padding: 0.1rem 0.5rem;
  background: rgb(9 25 33 / 55%);
}

.dth-game-go { margin-left: auto; color: var(--dth-faint); font-size: 1.1rem; transition: transform 140ms ease, color 140ms ease; }
.dth-game-card:hover .dth-game-go { transform: translateX(3px); color: hsl(var(--dth-card-accent) 60% 70%); }

.dth-lobby-foot { margin: 0.3rem 0 0; color: var(--dth-faint); font-size: 0.72rem; text-align: center; }

/* ---------- shared game bits ---------- */

.dth-primary-button {
  border: 1px solid hsl(var(--dth-accent) 50% 48%);
  background: hsl(var(--dth-accent) 45% 26%);
  color: var(--dth-text);
  padding: 0.6rem 1.4rem; border-radius: 0.7rem;
  font-size: 0.9rem; cursor: pointer;
  transition: transform 120ms ease, background 120ms ease;
}
.dth-primary-button:hover { transform: translateY(-1px); background: hsl(var(--dth-accent) 45% 32%); }

/* ---------- harbor pairs ---------- */

.dth-pairs-intro {
  display: grid; justify-items: center; gap: 0.7rem;
  max-width: 24rem; margin: 2.5rem auto; text-align: center;
}
.dth-pairs-intro h2 { margin: 0; font-size: 1.2rem; }
.dth-pairs-intro p { margin: 0; color: var(--dth-muted); font-size: 0.84rem; }
.dth-pairs-glyph { font-size: 2.4rem; }
.dth-pairs-best { color: var(--dth-amber); font-size: 0.78rem; }

.dth-pairs { max-width: 30rem; margin: 0 auto; }
.dth-pairs-meta {
  display: flex; align-items: center; gap: 1rem;
  color: var(--dth-muted); font-size: 0.78rem;
  padding-bottom: 0.7rem;
}
.dth-pairs-meta strong { color: var(--dth-text); }
.dth-pairs-meta .dth-text-button { margin-left: auto; }

.dth-pairs-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.55rem;
}
.dth-pairs-card {
  aspect-ratio: 1;
  border: 1px solid var(--dth-line);
  border-radius: 0.8rem;
  background: linear-gradient(160deg, var(--dth-panel-soft), var(--dth-panel));
  color: var(--dth-text);
  font-size: clamp(1.2rem, 4.5vw, 1.8rem);
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}
.dth-pairs-card:not(:disabled):hover { transform: translateY(-2px); border-color: hsl(175 50% 50%); }
.dth-pairs-card.revealed {
  background: hsl(175 40% 18%);
  border-color: hsl(175 45% 42%);
  cursor: default;
}
.dth-pairs-card.matched {
  opacity: 0.55;
  border-color: hsl(175 45% 34%);
  background: hsl(175 35% 12%);
}
.dth-pairs-grid.done .dth-pairs-card { animation: dth-pairs-celebrate 600ms ease; }
@keyframes dth-pairs-celebrate {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
}
.dth-pairs-done { margin: 0.8rem 0 0; text-align: center; color: var(--dth-teal); font-size: 0.9rem; }

/* ---------- harbor clash ---------- */

.dth-clash-intro {
  display: grid; justify-items: center; gap: 0.7rem;
  max-width: 26rem; margin: 2.5rem auto; text-align: center;
}
.dth-clash-intro h2 { margin: 0; font-size: 1.2rem; }
.dth-clash-intro p { margin: 0; color: var(--dth-muted); font-size: 0.84rem; }
.dth-clash-glyph { font-size: 2.4rem; }
.dth-clash-hint { color: var(--dth-faint) !important; font-size: 0.74rem !important; }
.dth-clash-hint strong { color: var(--dth-muted); font-weight: 600; }

.dth-clash { max-width: 34rem; margin: 0 auto; display: grid; gap: 0.7rem; }
.dth-clash-header {
  display: flex; align-items: center; gap: 0.8rem;
  padding-bottom: 0.6rem; border-bottom: 1px solid var(--dth-line);
}
.dth-clash-rounds { display: flex; gap: 0.25rem; color: var(--dth-line); font-size: 0.8rem; }
.dth-clash-rounds span.lit { color: var(--dth-teal); }
.dth-clash-score { display: flex; align-items: center; gap: 0.45rem; color: var(--dth-muted); font-size: 0.8rem; }
.dth-clash-score strong { color: var(--dth-text); font-size: 0.95rem; }
.dth-clash-score .sep { color: var(--dth-faint); }
.dth-clash-turn { margin-left: auto; color: var(--dth-amber); font-size: 0.74rem; }

.dth-clash-side { display: grid; gap: 0.4rem; }
.dth-clash-side-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; color: var(--dth-muted); font-size: 0.72rem; }
.dth-clash-side-name { color: var(--dth-text); font-size: 0.78rem; }
.dth-clash-hand-count { color: var(--dth-faint); }
.dth-clash-power { margin-left: auto; color: var(--dth-muted); }
.dth-clash-power strong { color: var(--dth-text); font-size: 1rem; }
.dth-clash-badge {
  font-size: 0.62rem; font-weight: 600;
  padding: 0.1rem 0.45rem; border-radius: 99px;
}
.dth-clash-badge.fog { color: hsl(262 60% 80%); background: hsl(262 45% 20%); border: 1px solid hsl(262 45% 38%); }
.dth-clash-badge.passed { color: var(--dth-faint); background: rgb(9 25 33 / 60%); border: 1px solid var(--dth-line); }

.dth-clash-field { display: flex; gap: 0.4rem; flex-wrap: wrap; min-height: 2.6rem; align-items: center; }
.dth-clash-empty { color: var(--dth-faint); font-size: 0.7rem; }
.dth-clash-field-card {
  display: flex; align-items: center; gap: 0.4rem;
  border: 1px solid var(--dth-line);
  border-radius: 0.6rem;
  background: var(--dth-panel-soft);
  padding: 0.28rem 0.55rem;
}
.dth-clash-field-power {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 1.5rem; height: 1.5rem;
  border-radius: 0.45rem;
  background: hsl(var(--dth-accent) 40% 22%);
  color: var(--dth-text);
  font-size: 0.82rem; font-weight: 700;
}
.dth-clash-field-name { font-size: 0.74rem; color: var(--dth-text); }

.dth-clash-divider { text-align: center; color: var(--dth-faint); font-size: 0.7rem; letter-spacing: 0.3em; margin: -0.2rem 0; }

.dth-clash-hand { display: flex; gap: 0.4rem; flex-wrap: wrap; min-height: 3.2rem; }
.dth-clash-hand-card {
  position: relative;
  display: grid; justify-items: center; gap: 0.15rem;
  min-width: 3.6rem; padding: 0.45rem 0.5rem 0.5rem;
  border: 1px solid var(--dth-line);
  border-radius: 0.7rem;
  background: linear-gradient(160deg, var(--dth-panel-soft), var(--dth-panel));
  color: var(--dth-text);
  cursor: pointer;
  transition: transform 130ms ease, border-color 130ms ease, background 130ms ease;
}
.dth-clash-hand-card:not(:disabled):hover { transform: translateY(-3px); border-color: hsl(175 50% 50%); }
.dth-clash-hand-card.selected {
  border-color: var(--dth-teal);
  background: hsl(175 40% 20%);
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgb(0 0 0 / 30%);
}
.dth-clash-hand-card:disabled { opacity: 0.65; cursor: default; }
.dth-clash-hand-card.kind-horn { border-color: hsl(262 45% 42%); }
.dth-clash-hand-card.kind-draw { border-color: hsl(32 50% 40%); }
.dth-clash-hand-card.kind-fog { border-color: hsl(195 45% 36%); }
.dth-clash-hand-power { font-size: 1.05rem; font-weight: 700; }
.dth-clash-hand-name { font-size: 0.66rem; color: var(--dth-muted); }
.dth-clash-hand-kind { position: absolute; top: 0.22rem; right: 0.32rem; font-size: 0.68rem; }

.dth-clash-actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; padding-top: 0.3rem; }
.dth-clash-actions .dth-text-button { margin-left: 0; }
.dth-clash-result {
  margin: 0; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 0.6rem;
}
.dth-clash-result.win { color: var(--dth-teal); }
.dth-clash-result.draw { color: var(--dth-amber); }
.dth-clash-result.loss { color: var(--dth-danger); }
.dth-clash-result-score {
  font-size: 0.74rem; font-weight: 500; color: var(--dth-muted);
  border: 1px solid var(--dth-line); border-radius: 99px; padding: 0.1rem 0.55rem;
}

/* ---------- lanyin dock ---------- */

.dth-dock {
  display: flex; flex-direction: column;
  border-top: 1px solid var(--dth-line);
  background: rgb(6 19 26 / 72%);
  max-height: 16rem;
}

.dth-dock-bar { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.9rem; }
.dth-dock-face {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 2.1rem; height: 2.1rem; padding: 0 0.3rem;
  border-radius: 0.7rem;
  border: 1px solid rgb(111 210 202 / 30%);
  background: rgb(9 25 33 / 70%);
  font-size: 0.9rem;
}
.dth-dock-title { display: grid; }
.dth-dock-title strong { font-size: 0.8rem; }
.dth-dock-title small { color: var(--dth-faint); font-size: 0.64rem; }
.dth-dock-status { color: var(--dth-faint); font-size: 0.68rem; margin-left: 0.2rem; }
.dth-dock-status.live { color: hsl(160 50% 62%); }
.dth-dock-actions { margin-left: auto; display: flex; gap: 0.3rem; }
.dth-dock-toggle {
  border: none; background: none; color: var(--dth-muted);
  font-size: 0.68rem; padding: 0.25rem 0.45rem; border-radius: 0.45rem; cursor: pointer;
}
.dth-dock-toggle:hover { color: var(--dth-text); background: rgb(111 210 202 / 10%); }
.dth-dock-toggle.active { color: var(--dth-teal); background: rgb(111 210 202 / 12%); }

.dth-dock-panel { display: grid; grid-template-columns: 1fr 15rem; min-height: 0; flex: 1; }
@media (max-width: 640px) { .dth-dock-panel { grid-template-columns: 1fr; } }

.dth-chat { display: flex; flex-direction: column; min-height: 0; min-width: 0; border-right: 1px solid var(--dth-line); }
@media (max-width: 640px) { .dth-chat { border-right: none; border-bottom: 1px solid var(--dth-line); } }

.dth-chat-log {
  flex: 1; min-height: 4.5rem; max-height: 9rem;
  overflow-y: auto; overscroll-behavior: contain;
  padding: 0.5rem 0.9rem;
  display: flex; flex-direction: column; gap: 0.42rem;
  scrollbar-width: thin; scrollbar-color: var(--dth-line) transparent;
}

.dth-bubble {
  max-width: 86%;
  padding: 0.34rem 0.65rem;
  border-radius: 0.75rem;
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.dth-bubble.user {
  align-self: flex-end;
  background: hsl(var(--dth-accent) 35% 24%);
  border: 1px solid hsl(var(--dth-accent) 40% 36%);
  border-bottom-right-radius: 0.25rem;
}
.dth-bubble.assistant {
  align-self: flex-start;
  background: var(--dth-panel-soft);
  border: 1px solid var(--dth-line);
  border-bottom-left-radius: 0.25rem;
}
.dth-bubble .dth-bubble-tag { display: block; margin-top: 0.15rem; color: var(--dth-faint); font-size: 0.62rem; }

.dth-agent-prompts {
  display: flex;
  gap: 0.35rem;
  padding: 0 0.9rem 0.2rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.dth-agent-prompts::-webkit-scrollbar { display: none; }
.dth-agent-prompts button {
  min-height: 2.35rem;
  flex: 0 0 auto;
  padding: 0.35rem 0.7rem;
  border: 1px solid rgb(102 201 191 / 28%);
  border-radius: 99px;
  color: var(--dth-muted);
  background: rgb(102 201 191 / 7%);
  font-size: 0.68rem;
  cursor: pointer;
}
.dth-agent-prompts button:hover:not(:disabled) { border-color: var(--dth-teal); color: var(--dth-text); }
.dth-agent-prompts button:disabled { opacity: 0.45; cursor: default; }

.dth-chat-input { display: flex; gap: 0.45rem; padding: 0.5rem 0.9rem 0.6rem; }
.dth-chat-input input {
  flex: 1; min-width: 0;
  border: 1px solid var(--dth-line);
  border-radius: 0.65rem;
  background: var(--dth-bg);
  color: var(--dth-text);
  padding: 0.42rem 0.65rem;
  font-size: 0.78rem;
}
.dth-chat-input input:focus { outline: none; border-color: var(--dth-teal); }
.dth-chat-input button {
  border: 1px solid hsl(var(--dth-accent) 45% 42%);
  background: hsl(var(--dth-accent) 40% 22%);
  color: var(--dth-text);
  border-radius: 0.65rem;
  padding: 0.42rem 0.85rem;
  font-size: 0.78rem; cursor: pointer;
}
.dth-chat-input button:disabled { opacity: 0.5; cursor: default; }

.dth-side { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; padding: 0.55rem 0.9rem 0.7rem; gap: 0.55rem; scrollbar-width: thin; }
.dth-side h4 { margin: 0; font-size: 0.68rem; color: var(--dth-faint); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.dth-side select {
  border: 1px solid var(--dth-line); border-radius: 0.55rem;
  background: var(--dth-bg); color: var(--dth-text);
  padding: 0.34rem 0.5rem; font-size: 0.74rem; width: 100%;
}
.dth-mem-list { display: grid; gap: 0.35rem; }
.dth-mem-row { display: flex; align-items: center; gap: 0.4rem; }
.dth-mem-row input {
  flex: 1; min-width: 0;
  border: 1px solid var(--dth-line); border-radius: 0.5rem;
  background: var(--dth-bg); color: var(--dth-text);
  padding: 0.28rem 0.5rem; font-size: 0.72rem;
}
.dth-mem-row input:focus { outline: none; border-color: var(--dth-teal); }
.dth-mem-row button {
  border: none; background: none; color: var(--dth-faint);
  font-size: 0.8rem; cursor: pointer; padding: 0.2rem 0.3rem; border-radius: 0.4rem;
}
.dth-mem-row button:hover { color: var(--dth-danger); background: rgb(239 142 127 / 10%); }
.dth-mem-empty { color: var(--dth-faint); font-size: 0.7rem; }
.dth-mem-hint { color: var(--dth-faint); font-size: 0.66rem; }
.dth-soul-panel { max-height: 11rem; }
.dth-soul-panel p { margin: 0; color: var(--dth-muted); font-size: 0.7rem; line-height: 1.55; }
.dth-soul-panel dl { display: grid; gap: 0.3rem; margin: 0.15rem 0 0; }
.dth-soul-panel dl > div { display: grid; grid-template-columns: 6rem 1fr; gap: 0.55rem; padding-top: 0.3rem; border-top: 1px solid var(--dth-line); }
.dth-soul-panel dt { color: var(--dth-faint); font-size: 0.62rem; }
.dth-soul-panel dd { margin: 0; color: var(--dth-text); font-size: 0.62rem; overflow-wrap: anywhere; }
.dth-agent-error { color: #efb4a8 !important; }
.dth-chat-input button,
.dth-mem-row button { min-width: 2.65rem; min-height: 2.65rem; }

/* ---------- 2026 product surface ---------- */

.dth-root {
  --dth-bg: #071014;
  --dth-bg-raised: #0b171c;
  --dth-panel: #102027;
  --dth-panel-soft: #152930;
  --dth-line: #263b42;
  --dth-line-strong: #405a61;
  --dth-text: #f3f0e8;
  --dth-muted: #a5b5b5;
  --dth-faint: #75898b;
  --dth-teal: #66c9bf;
  --dth-amber: #d7aa63;
  --dth-danger: #d97d6c;
  --dth-display: ui-serif, "Iowan Old Style", "Songti SC", "STSong", serif;
  letter-spacing: 0.005em;
}

.dth-shell {
  width: min(100%, 78rem);
  min-height: min(44rem, calc(100dvh - 1rem));
  max-height: calc(100dvh - 1rem);
  border-color: #30464d;
  border-radius: 0.9rem;
  background: #071014;
}

.dth-root[data-fullscreen="true"] .dth-shell {
  width: 100%;
  min-height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  border: none;
  border-radius: 0;
}

.dth-dock--collapsed { flex: 0 0 auto; max-height: none; }
.dth-dock-collapse { font-size: 0.8rem; line-height: 1; }

.dth-fullscreen-button {
  border: 1px solid var(--dth-line);
  background: var(--dth-panel-soft);
  color: var(--dth-muted);
  width: 1.9rem; height: 1.9rem;
  border-radius: 0.6rem;
  font-size: 0.85rem; line-height: 1;
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}
.dth-fullscreen-button:hover { border-color: var(--dth-teal); color: var(--dth-text); }

.dth-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  border-radius: inherit;
  box-shadow: inset 0 1px rgb(255 255 255 / 5%);
}

.dth-topbar {
  position: relative;
  z-index: 12;
  min-height: 4.25rem;
  padding: 0.78rem 1.35rem;
  background: #0a151a;
}

.dth-brand strong {
  font-family: var(--dth-display);
  font-size: 1.06rem;
  font-weight: 600;
}

.dth-brand small { font-size: 0.58rem; }

.dth-live-dot {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  color: #7f9394;
  font-size: 0.58rem;
  font-weight: 650;
  letter-spacing: 0.16em;
}

.dth-live-dot i {
  width: 0.43rem;
  height: 0.43rem;
  border-radius: 50%;
  background: #62bea8;
  box-shadow: 0 0 0 0.22rem rgb(98 190 168 / 11%);
}

.dth-body { min-height: 0; overflow-y: auto; padding: 1.2rem 1.35rem 1.45rem; }
.dth-body--game { padding: 0; overflow: hidden; display: flex; flex-direction: column; }

.dth-body--game > .dwc-root { flex: 1 1 auto; min-height: 0; }
.dwc-root.dwc-game { display: flex; flex-direction: column; }
.dwc-root.dwc-game > .dwc-table,
.dwc-root.dwc-game > .dwc-welcome,
.dwc-root.dwc-game > .dwc-result { flex: 1 1 auto; min-height: 0; }

@media (max-height: 620px) {
  .dth-body--game { overflow-y: auto; }
  .dth-body--game > .dwc-root { min-height: 30rem; }
}

.dth-kicker {
  display: inline-block;
  color: var(--dth-amber);
  font-size: 0.61rem;
  font-weight: 720;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.dth-lobby {
  width: 100%;
  max-width: 68rem;
  gap: 1.45rem;
}

.dth-lobby-hero {
  min-height: clamp(17rem, 40vh, 22rem);
  align-items: stretch;
  border-color: #3d5155;
  border-radius: 0.75rem;
  background-position: center 43%;
  isolation: isolate;
}

.dth-lobby-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(90deg, rgb(3 10 13 / 88%) 0%, rgb(3 10 13 / 56%) 47%, rgb(3 10 13 / 8%) 74%);
}

.dth-lobby-hero::after {
  z-index: 0;
  background: linear-gradient(0deg, rgb(3 10 13 / 76%), transparent 52%);
}

.dth-lobby-edition {
  position: absolute;
  z-index: 2;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.38rem 0.58rem;
  border: 1px solid rgb(231 222 201 / 25%);
  border-radius: 0.35rem;
  color: #d7d2c6;
  background: rgb(5 15 18 / 62%);
  backdrop-filter: blur(9px);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.dth-lobby-edition span { color: var(--dth-amber); font-variant-numeric: tabular-nums; }
.dth-lobby-edition i { width: 1px; height: 0.75rem; background: rgb(255 255 255 / 22%); }

.dth-lobby-hero-copy {
  align-self: flex-end;
  width: min(42rem, 78%);
  gap: 1.1rem;
  padding: 2.2rem 2rem;
}

.dth-lobby-face {
  width: 3.85rem;
  height: 3.85rem;
  border-radius: 50%;
  border-color: rgb(102 201 191 / 48%);
  box-shadow: 0 0 0 0.38rem rgb(5 18 22 / 52%);
}

.dth-lobby-hero-copy h1 {
  margin-top: 0.22rem;
  font-family: var(--dth-display);
  font-size: clamp(1.85rem, 4vw, 3rem);
  font-weight: 540;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.dth-lobby-hero-copy p {
  max-width: 34rem;
  margin-top: 0.58rem;
  color: #c4cccc;
  font-size: 0.86rem;
  line-height: 1.7;
}

.dth-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: -0.6rem;
}

.dth-section-heading h2 {
  margin: 0.08rem 0 0;
  font-family: var(--dth-display);
  font-size: 1.52rem;
  font-weight: 560;
}

.dth-section-heading p { max-width: 24rem; margin: 0; color: var(--dth-faint); font-size: 0.72rem; text-align: right; }

.dth-lobby-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }

.dth-game-card {
  min-height: 13.5rem;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border-radius: 0.65rem;
  background: #0e1c22;
  box-shadow: none;
}

.dth-game-card.featured {
  grid-column: 1 / -1;
  min-height: 15rem;
}

.dth-game-card:hover {
  transform: translateY(-2px);
  border-color: hsl(var(--dth-card-accent) 42% 52%);
  box-shadow: 0 18px 36px rgb(0 0 0 / 24%);
}

.dth-game-card-art {
  position: relative;
  width: 40%;
  min-width: 9.5rem;
  overflow: hidden;
  background-image: var(--dth-card-art);
  background-position: 54% 50%;
  background-size: cover;
}

.dth-game-card.featured .dth-game-card-art { width: 51%; background-position: 64% 44%; }

.dth-game-card-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 48%, #0e1c22 100%);
}

.dth-game-card-art > i {
  position: absolute;
  z-index: 1;
  left: 0.8rem;
  bottom: 0.75rem;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 50%;
  color: #f3eee0;
  background: rgb(7 16 20 / 68%);
  backdrop-filter: blur(8px);
  font-size: 0.82rem;
  font-style: normal;
}

.dth-game-copy {
  align-content: center;
  flex: 1;
  gap: 0.36rem;
  padding: 1.15rem 1.2rem;
}

.dth-game-index {
  color: hsl(var(--dth-card-accent) 52% 68%);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.dth-game-copy strong {
  font-family: var(--dth-display);
  font-size: 1.32rem;
  font-weight: 580;
}

.dth-game-tagline { color: #d6d6ce !important; font-size: 0.78rem !important; }
.dth-game-why { max-width: 28rem; margin-top: 0.16rem; line-height: 1.55; }
.dth-game-tags { margin-top: 0.38rem; }
.dth-game-tags i { border-radius: 0.28rem; background: transparent; }

.dth-game-go {
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 0.32rem;
  margin: 0 1rem 1rem 0;
  color: #a9b8b7;
  font-size: 0.7rem;
  white-space: nowrap;
}

.dth-game-go i { color: var(--dth-amber); font-size: 0.8rem; font-style: normal; }
.dth-lobby-foot { margin-bottom: 0.6rem; letter-spacing: 0.05em; }

.dth-primary-button,
.dth-secondary-button {
  min-height: 2.65rem;
  padding: 0.62rem 1.08rem;
  border-radius: 0.35rem;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.dth-primary-button {
  border-color: hsl(var(--dth-accent) 42% 48%);
  background: hsl(var(--dth-accent) 38% 29%);
}

.dth-secondary-button {
  border: 1px solid var(--dth-line-strong);
  color: var(--dth-text);
  background: #112128;
  cursor: pointer;
}

.dth-primary-button:disabled,
.dth-secondary-button:disabled { opacity: 0.38; cursor: not-allowed; transform: none; }
.dth-secondary-button:not(:disabled):hover { border-color: var(--dth-amber); }

.dth-game-loading,
.dth-load-failure {
  min-height: min(42rem, calc(100dvh - 9rem));
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.55rem;
  padding: 2rem;
  text-align: center;
}

.dth-game-loading > span {
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--dth-line);
  border-top-color: var(--dth-teal);
  border-radius: 50%;
  animation: dth-spin 900ms linear infinite;
}

.dth-game-loading strong,
.dth-load-failure strong { font-family: var(--dth-display); font-size: 1.45rem; font-weight: 560; }
.dth-game-loading small,
.dth-load-failure p { margin: 0; color: var(--dth-muted); font-size: 0.78rem; }
@keyframes dth-spin { to { transform: rotate(360deg); } }

.dth-inline-error {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.8rem;
  padding: 0.62rem 0.78rem;
  border: 1px solid rgb(217 125 108 / 50%);
  border-radius: 0.35rem;
  color: #f0c4bb;
  background: rgb(110 44 36 / 22%);
  font-size: 0.76rem;
}

.dth-inline-error button { margin-left: auto; border: 0; color: inherit; background: none; cursor: pointer; }

.dth-game-intro {
  position: relative;
  min-height: min(43rem, calc(100dvh - 9rem));
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  isolation: isolate;
  background-image: var(--dth-game-art);
  background-position: center;
  background-size: cover;
}

.dth-game-intro.dth-clash-intro,
.dth-game-intro.dth-tide-intro {
  max-width: none;
  margin: 0;
  justify-items: initial;
  text-align: left;
}

.dth-game-intro::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(90deg, rgb(4 12 15 / 95%) 0%, rgb(4 12 15 / 78%) 45%, rgb(4 12 15 / 18%) 78%);
}

.dth-game-intro::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: auto 0 0;
  height: 48%;
  background: linear-gradient(0deg, #071014, transparent);
}

.dth-game-intro-copy {
  width: min(35rem, 72%);
  padding: clamp(2rem, 6vw, 4.5rem);
}

.dth-game-intro h2 {
  margin: 0.22rem 0 0.5rem;
  font-family: var(--dth-display);
  font-size: clamp(2.4rem, 6vw, 4.4rem);
  font-weight: 530;
  line-height: 1;
  letter-spacing: -0.04em;
}

.dth-game-intro p { max-width: 30rem; margin: 0; color: #c6cecc; line-height: 1.72; }

.dth-rule-chips,
.dth-formation-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  margin: 1.1rem 0 1.35rem;
  padding: 0;
  list-style: none;
}

.dth-rule-chips li,
.dth-formation-preview span {
  padding: 0.28rem 0.55rem;
  border: 1px solid rgb(240 231 211 / 22%);
  border-radius: 0.28rem;
  color: #d8d7cf;
  background: rgb(6 17 21 / 50%);
  font-size: 0.67rem;
}

.dth-formation-preview b { margin-right: 0.3rem; color: var(--dth-amber); }
.dth-personal-best { margin: -0.55rem 0 1rem !important; color: var(--dth-amber) !important; font-size: 0.72rem; }

.dth-tide,
.dth-clash { max-width: none; margin: 0; padding: 1rem 1.2rem 1.3rem; }

.dth-tide { display: block; }
.dth-clash { display: grid; gap: 0.78rem; }

.dth-game-hud {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  min-height: 4rem;
  padding: 0.5rem 0 0.9rem;
  border-bottom: 1px solid var(--dth-line);
}

.dth-game-hud > div:first-child { display: grid; }
.dth-game-hud > div:first-child strong { font-family: var(--dth-display); font-size: 1rem; font-weight: 560; }

.dth-score-ribbon,
.dth-tower-score { display: flex; align-items: center; gap: 0.65rem; color: var(--dth-muted); font-size: 0.7rem; }
.dth-score-ribbon b,
.dth-tower-score b { color: var(--dth-text); font-family: var(--dth-display); font-size: 1.42rem; font-weight: 580; }
.dth-score-ribbon i { color: var(--dth-line-strong); font-style: normal; }
.dth-turn-pill {
  justify-self: end;
  padding: 0.32rem 0.56rem;
  border: 1px solid var(--dth-line);
  border-radius: 99px;
  color: var(--dth-faint);
  font-size: 0.65rem;
}
.dth-turn-pill.active { border-color: rgb(102 201 191 / 50%); color: var(--dth-teal); background: rgb(102 201 191 / 7%); }

/* Tide Relics */

.dth-tide-layout {
  display: grid;
  grid-template-columns: 12.5rem minmax(0, 1fr);
  gap: 0.8rem;
  margin-top: 0.8rem;
}

.dth-tide-meter {
  min-height: 22rem;
  padding: 1.15rem;
  border: 1px solid var(--dth-line);
  background: #0c1a20;
}

.dth-tide-meter > strong { display: block; margin-top: 0.2rem; font-family: var(--dth-display); font-size: 3.5rem; font-weight: 520; line-height: 1; }
.dth-tide-meter > strong small { color: var(--dth-muted); font: 0.7rem Inter, sans-serif; }
.dth-tide-meter > p { margin: 1.35rem 0 0; padding-top: 1rem; border-top: 1px solid var(--dth-line); color: var(--dth-muted); font-size: 0.72rem; line-height: 1.55; }

.dth-risk { margin-top: 1.2rem; }
.dth-risk > span { display: block; height: 0.32rem; overflow: hidden; background: #203139; }
.dth-risk > span i { display: block; height: 100%; background: var(--dth-danger); transition: width 260ms ease; }
.dth-risk small { display: block; margin-top: 0.38rem; color: var(--dth-faint); font-size: 0.64rem; }

.dth-tide-voyage {
  position: relative;
  min-width: 0;
  min-height: 22rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.25rem;
  overflow: hidden;
  border: 1px solid var(--dth-line);
  background: #0a181e;
}

.dth-tide-voyage::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.2;
  background-image: var(--dth-game-art);
  background-position: center;
  background-size: cover;
}

.dth-tide-waterline { position: absolute; inset: 2rem 1.25rem auto; display: flex; align-items: center; gap: 0.7rem; color: var(--dth-faint); }
.dth-tide-waterline span { flex: 1; height: 1px; background: rgb(102 201 191 / 22%); }
.dth-tide-waterline i { width: 0.45rem; height: 0.45rem; border: 1px solid var(--dth-teal); border-radius: 50%; }

.dth-tide-empty { position: relative; display: grid; place-content: center; flex: 1; justify-items: center; color: var(--dth-muted); }
.dth-tide-empty span { font-family: var(--dth-display); font-size: 1.35rem; }
.dth-tide-empty small { margin-top: 0.35rem; color: var(--dth-faint); }

.dth-tide-cards {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0.55rem;
  min-height: 11.5rem;
  margin: 0 0 0.85rem;
  padding: 0;
  overflow-x: auto;
  list-style: none;
}

.dth-tide-card {
  position: relative;
  flex: 0 0 7.15rem;
  height: 10rem;
  display: grid;
  align-content: end;
  gap: 0.14rem;
  padding: 0.72rem;
  overflow: hidden;
  border: 1px solid #4b5d60;
  border-radius: 0.38rem;
  color: #eee8dc;
  background: #16272d;
  box-shadow: 0 10px 20px rgb(0 0 0 / 24%);
  animation: dth-card-arrive 280ms calc(var(--dth-tide-index) * 35ms) both ease-out;
}

@keyframes dth-card-arrive { from { opacity: 0; transform: translateY(0.75rem); } }
.dth-tide-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 0.18rem; background: var(--card-color, var(--dth-teal)); }
.dth-tide-card.family-coral { --card-color: #cf7c69; }
.dth-tide-card.family-light { --card-color: #dbb866; }
.dth-tide-card.family-map { --card-color: #8295bd; }
.dth-tide-card.peril { --card-color: #d76557; border-color: #77504b; background: #2b2020; }
.dth-tide-card-mark { position: absolute; top: 0.58rem; left: 0.62rem; color: var(--card-color); font-family: var(--dth-display); font-size: 1.45rem; }
.dth-tide-card strong { font-family: var(--dth-display); font-size: 0.9rem; font-weight: 600; }
.dth-tide-card small { color: #9fadae; font-size: 0.58rem; }
.dth-tide-card > b { position: absolute; top: 0.55rem; right: 0.62rem; font-family: var(--dth-display); font-size: 1.15rem; }

.dth-tide-ledger { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem; }
.dth-tide-ledger > span { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.36rem; padding: 0.4rem 0.48rem; border: 1px solid #293d43; color: #718587; background: rgb(7 17 21 / 74%); font-size: 0.62rem; }
.dth-tide-ledger > span.active { border-color: rgb(102 201 191 / 42%); color: #cbd7d4; }
.dth-tide-ledger i { font-family: var(--dth-display); font-style: normal; }
.dth-tide-ledger b { color: var(--dth-amber); font-variant-numeric: tabular-nums; }

.dth-game-actions {
  min-height: 5.2rem;
  display: flex;
  align-items: center;
  gap: 0.72rem;
  margin-top: 0.8rem;
  padding: 0.82rem;
  border: 1px solid var(--dth-line);
  background: #0c191f;
}

.dth-game-actions > div:nth-of-type(2) { flex: 1; display: grid; }
.dth-game-actions > div:nth-of-type(2) strong { font-size: 0.78rem; }
.dth-game-actions > div:nth-of-type(2) small { color: var(--dth-faint); font-size: 0.65rem; }
.dth-next-card { position: relative; width: 2.9rem; height: 3.7rem; border: 1px solid #4b5e64; background: #13272d; }
.dth-next-card i { position: absolute; inset: 0.35rem; border: 1px solid rgb(215 170 99 / 38%); }
.dth-next-card span { position: absolute; inset: 0; display: grid; place-items: center; color: var(--dth-amber); font-size: 0.68rem; }

.dth-round-result { flex: 1; display: grid !important; grid-template-columns: 1fr auto; align-items: center; gap: 0.18rem 1rem; }
.dth-round-result > span,
.dth-round-result > small { grid-column: 1; }
.dth-round-result > strong { grid-column: 1; font-family: var(--dth-display); font-size: 1.15rem; font-weight: 560; }
.dth-round-result > button { grid-column: 2; grid-row: 1 / 4; }
.dth-round-result > small { color: var(--dth-muted); }

/* Harbor Clash */

.dth-tower-score > i { width: 0.45rem; height: 0.45rem; border: 1px solid var(--dth-amber); transform: rotate(45deg); opacity: 0.4; }

.dth-clash-board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.58rem; }

.dth-lane {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto 4.6rem auto auto;
  gap: 0.46rem;
  padding: 0.65rem;
  border: 1px solid var(--dth-line);
  background: #0c1a20;
  transition: border-color 150ms ease, background 150ms ease;
}

.dth-lane.selected { border-color: var(--dth-teal); background: #10242a; }
.dth-lane.claimed.human { border-color: rgb(102 201 191 / 60%); }
.dth-lane.claimed.lanyin { border-color: rgb(217 125 108 / 56%); }
.dth-lane > header,
.dth-lane > footer { display: flex; align-items: center; justify-content: space-between; gap: 0.45rem; }
.dth-lane > header span { font-family: var(--dth-display); font-size: 0.87rem; }
.dth-lane > header small,
.dth-lane > footer small { color: var(--dth-faint); font-size: 0.58rem; }
.dth-lane > footer button { border: 0; color: var(--dth-teal); background: none; font-size: 0.61rem; cursor: pointer; }
.dth-lane > footer button:disabled { color: var(--dth-faint); cursor: not-allowed; }

.dth-formation-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.3rem; min-height: 6.6rem; }
.dth-clash-slot { display: grid; place-items: center; min-width: 0; border: 1px dashed #31464d; border-radius: 0.3rem; }
.dth-clash-slot i { width: 0.3rem; height: 0.3rem; border: 1px solid #3d5359; transform: rotate(45deg); }

.dth-signal-card {
  position: relative;
  min-width: 0;
  min-height: 6.6rem;
  display: grid;
  align-content: space-between;
  justify-items: start;
  padding: 0.46rem;
  overflow: hidden;
  border: 1px solid #536168;
  border-radius: 0.3rem;
  color: #efeadd;
  background: #182a30;
  font-family: inherit;
}

button.dth-signal-card { cursor: pointer; }
button.dth-signal-card:hover:not(:disabled),
.dth-signal-card.selected { border-color: var(--dth-teal); transform: translateY(-2px); }
.dth-signal-card.selected { box-shadow: 0 0 0 2px rgb(102 201 191 / 18%); }
.dth-signal-card.suit-ember { border-top-color: #d7aa63; }
.dth-signal-card.suit-mist { border-top-color: #9da9c6; }
.dth-signal-card.suit-tide { border-top-color: #66c9bf; }
.dth-signal-card strong { font-family: var(--dth-display); font-size: 1.42rem; font-weight: 540; line-height: 1; }
.dth-signal-card small { color: #9caaab; font-size: 0.5rem; }
.dth-signal-card > i { position: absolute; width: 2.2rem; height: 2.2rem; right: -1rem; bottom: -1rem; border: 1px solid currentColor; border-radius: 50%; opacity: 0.15; }
.dth-signal-suit { color: var(--dth-amber); font-size: 0.72rem; }
.dth-signal-card.back { border-color: #3d5359; background: repeating-linear-gradient(45deg, #13252b 0 5px, #172e35 5px 10px); }
.dth-signal-card.back > i { inset: 50% auto auto 50%; width: 1.2rem; height: 1.2rem; border-color: var(--dth-amber); border-radius: 0; transform: translate(-50%, -50%) rotate(45deg); opacity: 0.42; }

.dth-beacon {
  position: relative;
  display: grid;
  place-content: center;
  gap: 0.08rem;
  border: 0;
  border-block: 1px solid #33484e;
  color: var(--dth-text);
  background: #0a171c;
  cursor: pointer;
}

.dth-beacon > i { justify-self: center; width: 0.52rem; height: 0.52rem; margin-bottom: 0.16rem; border: 1px solid var(--dth-amber); transform: rotate(45deg); }
.dth-beacon strong { font-family: var(--dth-display); font-size: 0.72rem; font-weight: 560; }
.dth-beacon small { color: var(--dth-faint); font-size: 0.49rem; }
.dth-lane.selected .dth-beacon > i,
.dth-lane.claimed.human .dth-beacon > i { background: var(--dth-teal); border-color: var(--dth-teal); box-shadow: 0 0 1.2rem rgb(102 201 191 / 60%); }
.dth-lane.claimed.lanyin .dth-beacon > i { background: var(--dth-danger); border-color: var(--dth-danger); }

.dth-clash-event { min-height: 2.5rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.48rem 0.68rem; border-left: 2px solid var(--dth-amber); color: var(--dth-muted); background: #0b181d; }
.dth-clash-event > span { width: 0.42rem; height: 0.42rem; border-radius: 50%; background: var(--dth-teal); }
.dth-clash-event > span.thinking { animation: dth-pulse 1.2s infinite; }
.dth-clash-event p { margin: 0; font-size: 0.68rem; }

.dth-clash-hand-area { display: grid; grid-template-columns: 10rem minmax(0, 1fr) auto; align-items: center; gap: 0.8rem; padding: 0.68rem; border: 1px solid var(--dth-line); background: #0c191f; }
.dth-clash-hand-area > header { display: grid; gap: 0.25rem; }
.dth-clash-hand-area > header div { display: grid; }
.dth-clash-hand-area > header strong { font-family: var(--dth-display); font-size: 0.96rem; }
.dth-clash-hand-area > header small { color: var(--dth-faint); font-size: 0.59rem; }
.dth-clash-hand { min-width: 0; display: flex; flex-wrap: nowrap; gap: 0.34rem; overflow-x: auto; padding: 0.2rem; }
.dth-clash-hand .dth-signal-card { flex: 0 0 3.9rem; min-height: 5.6rem; }
.dth-deploy-main { min-width: 6.2rem; }

.dth-formation-guide { color: var(--dth-faint); font-size: 0.65rem; }
.dth-formation-guide summary { width: fit-content; cursor: pointer; }
.dth-formation-guide > div { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.45rem; }
.dth-formation-guide span { padding: 0.25rem 0.45rem; border: 1px solid var(--dth-line); }
.dth-formation-guide b { margin-right: 0.3rem; color: var(--dth-amber); }

/* Gin Rummy is embedded, so keep its own canvas complete inside the shell. */
.dth-launcher-cluster {
  position: fixed;
  z-index: 1100;
  top: max(5.25rem, calc(env(safe-area-inset-top) + 4.25rem));
  right: max(1.25rem, env(safe-area-inset-right));
  display: flex;
  align-items: stretch;
  gap: 0.42rem;
  pointer-events: none;
}

.dth-launcher-cluster .dth-launcher {
  position: relative;
  inset: auto;
  pointer-events: auto;
}

.dth-launcher-quick {
  width: 3.25rem;
  min-height: 4.2rem;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.12rem;
  border: 1px solid #53676a;
  border-radius: 0.72rem;
  color: #f3eee2;
  background: linear-gradient(180deg, #193139, #0d2027);
  box-shadow: 0 16px 38px rgb(0 0 0 / 34%);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}

.dth-launcher-quick:hover { transform: translateY(-2px); border-color: var(--dth-amber); background: #19333a; }
.dth-launcher-quick > span { color: var(--dth-amber); font-size: 0.8rem; }
.dth-launcher-quick > small { color: var(--dth-muted); font-size: 0.57rem; letter-spacing: 0.06em; }

.dth-play-config {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(16rem, 0.75fr);
  gap: 0.72rem;
  padding: 0.7rem;
  border: 1px solid var(--dth-line);
  border-radius: 0.55rem;
  background: #0b181e;
}

.dth-mode-switch { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.45rem; }
.dth-mode-switch button {
  min-height: 3.65rem;
  display: grid;
  align-content: center;
  justify-items: start;
  padding: 0.62rem 0.76rem;
  border: 1px solid #30454b;
  border-radius: 0.42rem;
  color: var(--dth-text);
  background: #102128;
  text-align: left;
  cursor: pointer;
}
.dth-mode-switch button.active { border-color: rgb(102 201 191 / 66%); background: rgb(102 201 191 / 10%); box-shadow: inset 0 0 0 1px rgb(102 201 191 / 12%); }
.dth-mode-switch button:disabled { opacity: 0.46; cursor: not-allowed; }
.dth-mode-switch strong { font-size: 0.76rem; }
.dth-mode-switch small { color: var(--dth-faint); font-size: 0.61rem; }

.dth-default-game {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.65rem;
  border-left: 1px solid var(--dth-line);
}
.dth-default-game > span { min-width: 0; display: grid; }
.dth-default-game strong { font-size: 0.72rem; }
.dth-default-game small { color: var(--dth-faint); font-size: 0.59rem; }
.dth-default-game select {
  min-height: 2.65rem;
  margin-left: auto;
  padding: 0 2rem 0 0.65rem;
  border: 1px solid #40565b;
  border-radius: 0.38rem;
  color: var(--dth-text);
  background: #102128;
}

.dth-close-button,
.dth-text-button,
.dth-task-notice button,
.dth-dock-toggle { min-width: 2.65rem; min-height: 2.65rem; }

.dth-body--game > .dwc-root { min-height: 100%; }
.dth-body--game .dwc-welcome,
.dth-body--game .dwc-table,
.dth-body--game .dwc-result { min-height: min(44rem, calc(100dvh - 9rem)); }
.dth-body--game .dwc-table__stage { min-height: 37rem; }

@media (max-width: 820px) {
  .dth-play-config { grid-template-columns: 1fr; }
  .dth-default-game { border-left: 0; border-top: 1px solid var(--dth-line); }
  .dth-lobby-grid { grid-template-columns: 1fr; }
  .dth-game-card.featured { grid-column: auto; }
  .dth-game-card.featured .dth-game-card-art,
  .dth-game-card-art { width: 42%; }
  .dth-game-hud { grid-template-columns: 1fr auto; }
  .dth-game-hud .dth-turn-pill { grid-column: 1 / -1; justify-self: stretch; text-align: center; }
  .dth-tide-layout { grid-template-columns: 9rem minmax(0, 1fr); }
  .dth-tide-meter { padding: 0.8rem; }
  .dth-tide-meter > strong { font-size: 2.7rem; }
  .dth-clash-board { overflow-x: auto; grid-template-columns: repeat(3, minmax(15rem, 1fr)); padding-bottom: 0.3rem; }
  .dth-clash-hand-area { grid-template-columns: 8rem minmax(0, 1fr); }
  .dth-deploy-main { grid-column: 1 / -1; }
}

/* ---------- narrow screens ---------- */

@media (max-width: 560px) {
  .dth-launcher-cluster { right: max(0.7rem, env(safe-area-inset-right)); gap: 0.32rem; }
  .dth-launcher-cluster .dth-launcher { width: 4.6rem; min-height: 4.6rem; padding: 0; border-radius: 50%; justify-content: center; }
  .dth-launcher-quick { width: 3rem; min-height: 4.6rem; }
  .dth-launcher-art { width: 100%; background-position: center; }
  .dth-launcher-copy { display: none; }
  .dth-shell { margin: 0; border-radius: 0; border: none; }
  .dth-topbar { flex-wrap: wrap; gap: 0.5rem; }
  .dth-stats { display: none; }
  .dth-body { padding: 0.7rem; }
  .dth-body--game { padding: 0; }
  .dth-live-dot { display: none; }
  .dth-brand small { letter-spacing: 0.11em; }
  .dth-top-actions { order: 3; width: 100%; }
  .dth-lobby-hero { min-height: 19rem; background-position: 62% center; }
  .dth-lobby-hero-copy { width: 100%; padding: 1.25rem; }
  .dth-lobby-face { display: none; }
  .dth-lobby-hero-copy h1 { font-size: 2rem; }
  .dth-lobby-edition { top: 0.7rem; right: 0.7rem; }
  .dth-section-heading { align-items: flex-start; flex-direction: column; }
  .dth-section-heading p { text-align: left; }
  .dth-mode-switch { grid-template-columns: 1fr; }
  .dth-default-game { align-items: stretch; flex-direction: column; }
  .dth-default-game select { width: 100%; margin-left: 0; }
  .dth-lobby-grid { grid-template-columns: 1fr; }
  .dth-game-card,
  .dth-game-card.featured { min-height: 19rem; flex-direction: column; }
  .dth-game-card-art,
  .dth-game-card.featured .dth-game-card-art { width: 100%; min-height: 8.5rem; }
  .dth-game-card-art::after { background: linear-gradient(0deg, #0e1c22, transparent 70%); }
  .dth-game-copy { padding: 0.85rem 1rem 1rem; }
  .dth-game-go { display: none; }
  .dth-game-intro { min-height: calc(100dvh - 8rem); background-position: 58% center; }
  .dth-game-intro::before { background: linear-gradient(0deg, rgb(4 12 15 / 97%) 0%, rgb(4 12 15 / 68%) 72%, rgb(4 12 15 / 12%)); }
  .dth-game-intro-copy { width: 100%; padding: 1.4rem; }
  .dth-game-intro h2 { font-size: 2.7rem; }
  .dth-tide,
  .dth-clash { padding: 0.75rem; }
  .dth-game-hud { grid-template-columns: 1fr; gap: 0.45rem; }
  .dth-score-ribbon,
  .dth-tower-score { justify-self: start; }
  .dth-game-hud .dth-turn-pill { grid-column: auto; }
  .dth-tide-layout { grid-template-columns: 1fr; }
  .dth-tide-meter { min-height: 8.5rem; }
  .dth-tide-meter > p { margin-top: 0.7rem; padding-top: 0.65rem; }
  .dth-tide-voyage { min-height: 20rem; padding: 0.8rem; }
  .dth-tide-ledger { grid-template-columns: repeat(2, 1fr); }
  .dth-game-actions { align-items: stretch; flex-direction: column; }
  .dth-next-card { display: none; }
  .dth-game-actions > div:nth-of-type(2) { width: 100%; }
  .dth-game-actions > button { width: 100%; }
  .dth-round-result { grid-template-columns: 1fr; width: 100%; }
  .dth-round-result > button { grid-column: 1; grid-row: auto; width: 100%; }
  .dth-clash-board { grid-template-columns: repeat(3, minmax(14rem, 1fr)); }
  .dth-clash-hand-area { grid-template-columns: 1fr; }
  .dth-clash-hand-area > header { grid-template-columns: 1fr auto; }
  .dth-deploy-main { grid-column: auto; width: 100%; }
  .dth-pairs-grid { gap: 0.4rem; }
  .dth-dock { max-height: 18rem; }
}

@media (prefers-reduced-motion: reduce) {
  .dth-root *,
  .dth-root *::before,
  .dth-root *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`
