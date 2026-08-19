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
  position: absolute;
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
  width: min(100%, 74rem);
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

/* ---------- narrow screens ---------- */

@media (max-width: 560px) {
  .dth-launcher { width: 4.6rem; min-height: 4.6rem; padding: 0; border-radius: 50%; justify-content: center; }
  .dth-launcher-art { width: 100%; background-position: center; }
  .dth-launcher-copy { display: none; }
  .dth-shell { margin: 0; border-radius: 0; border: none; }
  .dth-topbar { flex-wrap: wrap; gap: 0.5rem; }
  .dth-stats { display: none; }
  .dth-body { padding: 0.7rem; }
  .dth-lobby-grid { grid-template-columns: 1fr; }
  .dth-game-go { display: none; }
  .dth-pairs-grid { gap: 0.4rem; }
  .dth-dock { max-height: 18rem; }
}
`
