# Game review checklist

A game enters the curated `GAME_REGISTRY` only after a maintainer confirms every
gate below. Each item needs concrete evidence, not a verbal "looks fine". This
checklist is the acceptance contract for new games, and it pairs with
`docs/game-authoring.md`.

## Source

- [ ] All game source lives in this repository under `src/games/<id>/`.
- [ ] The game imports only the public game seam (the `GameProps` types, the
      registry helpers, the storage helpers) and its own modules.
- [ ] No platform internals are imported by the game.
- [ ] `manifest.id` matches the lowercase-kebab-case shape, is unique across the
      registry, and is not a reserved fixture id.
- [ ] Required manifest fields (`id`, `title`, `summary`, `coverUrl`, `version`,
      `author`, `license`) are all non-empty.
- [ ] The game validates its own saves and never crashes on a malformed save.
- [ ] Only JSON-serializable data is saved; a serialization failure is visible
      but not fatal.
- [ ] The game cleans up timers, event listeners, and audio on unmount and
      survives React StrictMode mount/unmount cycles.
- [ ] The companion is optional; the game is fully playable without it.
- [ ] `onExit` returns to the hall and does not clear the save.

## Assets

- [ ] Cover and icon URLs resolve to assets committed in this repository or to
      embedded data; the card renders without a network request.
- [ ] Asset provenance is recorded (see the pattern in
      `docs/art-generation.md`).
- [ ] No remote download, install, rating, or update affordance is shown in the
      game or its docs.
- [ ] The game does not fetch gameplay assets from the network at runtime.

## License

- [ ] `manifest.license` is non-empty and accurate.
- [ ] `LICENSE` and `THIRD_PARTY_NOTICES.md` are updated when the game brings in
      code, art, audio, or rules from elsewhere.
- [ ] Attribution for derived work is recorded.

## Tests

- [ ] `npm test` passes for the whole suite.
- [ ] `npm run typecheck` passes.
- [ ] The game has tests for definition shape, save/restore (including
      malformed saves), every companion method it calls, `onExit`, and registry
      placement.
- [ ] The game's own rules and edge cases are covered by tests, not only by
      manual play.
- [ ] Tests assert behavior, not private implementation.

## Manual review gates

- [ ] A reviewer who has not seen the internals can copy the template, rename
      it, run `npm test` and `npm run typecheck`, and see the game in the dev
      registry, using only `docs/game-authoring.md`.
- [ ] The hall shows the game's card with cover, title, summary, and a single
      start/continue affordance; no fake install or download buttons.
- [ ] The game renders at 1440 × 900 and 390 × 844 without horizontal page
      overflow; touch targets are at least 44 × 44 CSS px on mobile.
- [ ] Buttons, dialogs, and cards have accessible names; keyboard and Escape
      behave correctly.
- [ ] Starting a game, returning to the hall, and reopening preserves the save.
- [ ] A crashing game is isolated by the error boundary; the hall and companion
      stay usable.
- [ ] The companion panel opens from the hall and from inside the game.
- [ ] The production registry is not polluted: the game is registered in
      `GAME_REGISTRY` only after this checklist passes, and fixture ids never
      ship in it.
- [ ] The built package registers a single plugin entry point.
