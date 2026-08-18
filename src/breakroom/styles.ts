/**
 * Narrowly scoped breakroom classes (slice B). These ride on top of the
 * existing dark harbor tokens and primitives from `src/ui/styles.ts` — no
 * palette, font or rhythm is redefined here. Anything the shell can reuse
 * (`dwc-topbar`, `dwc-button`, `dwc-task-notice`, `dwc-error`, `dwc-overlay`,
 * `dwc-game-shell`, `dwc-launcher`, `dwc-mark`) stays untouched.
 */

export const BREAKROOM_STYLES = String.raw`
.dwc-breakroom-root {
  /* Reuses the .dwc-root tokens declared in GAME_STYLES. */
}

.dwc-breakroom-hall {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.2rem 1.4rem 1.6rem;
  color: var(--dwc-text);
}

.dwc-breakroom-hall__intro h2 {
  margin: 0.2rem 0 0.35rem;
  font-family: Georgia, "Songti SC", serif;
  font-size: 1.4rem;
  font-weight: 500;
}

.dwc-breakroom-hall__intro p {
  margin: 0;
  max-width: 38rem;
  color: var(--dwc-muted);
  font-size: 0.85rem;
}

.dwc-breakroom-hall__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(18rem, 100%), 1fr));
  gap: 0.9rem;
}

.dwc-breakroom-card {
  display: grid;
  grid-template-rows: 8.5rem auto auto;
  border: 1px solid var(--dwc-line);
  border-radius: 0.85rem;
  overflow: hidden;
  background: var(--dwc-panel);
  transition: border-color 150ms ease, transform 150ms ease;
}

.dwc-breakroom-card:hover {
  border-color: var(--dwc-line-strong);
  transform: translateY(-1px);
}

.dwc-breakroom-card--last-played {
  border-color: var(--dwc-teal);
}

.dwc-breakroom-card__cover {
  background-position: 60% 40%;
  background-size: cover;
  filter: saturate(0.85) brightness(0.85);
}

.dwc-breakroom-card__body {
  padding: 0.7rem 0.85rem 0.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dwc-breakroom-card__heading {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}

.dwc-breakroom-card__heading h3 {
  margin: 0;
  font-family: Georgia, "Songti SC", serif;
  font-size: 1.02rem;
  font-weight: 500;
}

.dwc-breakroom-card__flag {
  padding: 0.1rem 0.45rem;
  border: 1px solid rgb(111 210 202 / 45%);
  border-radius: 999px;
  color: var(--dwc-teal);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
}

.dwc-breakroom-card__summary {
  margin: 0;
  color: var(--dwc-muted);
  font-size: 0.78rem;
}

.dwc-breakroom-card__meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  color: var(--dwc-faint);
  font-size: 0.66rem;
}

.dwc-breakroom-card__meta div {
  display: flex;
  gap: 0.35rem;
}

.dwc-breakroom-card__meta dt {
  margin: 0;
  color: var(--dwc-faint);
}

.dwc-breakroom-card__meta dd {
  margin: 0;
  color: var(--dwc-muted);
}

.dwc-breakroom-card__actions {
  padding: 0.6rem 0.85rem 0.85rem;
  display: flex;
  justify-content: flex-end;
}

.dwc-breakroom-toast {
  position: absolute;
  right: 1.2rem;
  bottom: 1.2rem;
  max-width: min(22rem, calc(100% - 2.4rem));
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--dwc-line-strong);
  border-radius: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--dwc-text);
  background: var(--dwc-panel);
  box-shadow: var(--dwc-shadow);
}

.dwc-breakroom-toast p {
  margin: 0;
  font-size: 0.78rem;
}

.dwc-breakroom-error,
.dwc-breakroom-runtime {
  margin: 1.4rem;
  padding: 1.1rem 1.2rem 1.2rem;
  border: 1px solid rgb(239 142 127 / 40%);
  border-radius: 0.75rem;
  color: #f5c7bf;
  background: #291816;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.dwc-breakroom-runtime--loading,
.dwc-breakroom-runtime--empty {
  border-color: var(--dwc-line);
  color: var(--dwc-muted);
  background: var(--dwc-panel);
}

.dwc-breakroom-error p,
.dwc-breakroom-runtime p {
  margin: 0;
  font-size: 0.82rem;
}

.dwc-breakroom-error__actions {
  display: flex;
  gap: 0.5rem;
}
`
