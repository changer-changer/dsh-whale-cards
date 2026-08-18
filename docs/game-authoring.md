# Game authoring guide

This guide explains how to add a game to the breakroom. It is written for a
maintainer who is new to this repository. You need TypeScript and React
experience, and nothing else. The guide deliberately describes only the public
game interface and never platform internals, so it stays useful even if you
know nothing about how the package mounts into the host.

## The public game interface

A game is a `GameDefinition`: a `manifest` plus a React `Game` component. The
component renders with a single props object, `GameProps`, which carries three
things and nothing else:

- `storage` for the game's own save data. You own the format and validate it
  yourself. `storage.load()` returns `unknown`; `storage.save(value)` stores
  JSON-serializable data; `storage.clear()` drops the save.
- `companion` for optional lines to the breakroom companion. It exposes only
  `say(text)`, `setMood(mood)`, and `openChat()`. The companion is a nice extra,
  never a requirement for the game to be playable.
- `onExit()` to return to the hall. It does not close the whole breakroom, and
  it never clears your save.

That is the whole contract. A game must not import anything outside the public
game seam, must not read platform task state directly, and must not reach for
the full companion surface. If you catch yourself importing a platform adapter,
stop: keep that need inside the game's own module instead.

## Manifest rules

The `manifest` is what the hall renders before your game loads. It must have:

- `id`: lowercase kebab-case, for example `my-game`. It must match
  `^[a-z0-9]+(?:-[a-z0-9]+)*$`, be unique across the registry, and never be
  reused for a different game after release.
- `title`, `summary`, `coverUrl`, `version`, `author`, `license`: all
  non-empty. `coverUrl` should resolve to an asset that ships inside this
  repository so the card renders without a network request.
- Optional `iconUrl`, `estimatedMinutes`, and `tags`.

## Start from the template

`game-template/` holds a tiny, tested starter game built only from `GameProps`.
It is the fastest way to begin, and it stays green so you always have a known
good baseline.

### Copy and rename

1. Copy the template into the games folder. Use your own game id for the folder
   name:

   ```sh
   cp -R game-template src/games/my-game
   ```

2. Rename the files to match your game:

   ```sh
   cd src/games/my-game
   mv MyGame.tsx MyRealGame.tsx
   mv MyGame.test.tsx MyRealGame.test.tsx
   ```

   `index.ts` keeps its name: the registry loads it as the game entry point.

3. Fix the imports. The template lives at the repository root, so it imports
   the game seam as `../src/breakroom/...`. Inside `src/games/<your-game>/`
   those become `../../breakroom/...`. Update every relative import in the
   three files.

4. Rename the identifiers and the manifest:

   - The `MyGame` component and its `MyGameSave` and `parseSave` helpers in the
     component file.
   - `myGameManifest`, `myGameDefinition`, and the `MyGame` re-exports in
     `index.ts`.
   - `id: 'my-game'` becomes your id; set `title`, `summary`, `author`,
     `version`, `license`, and tags.

   The manifest id must match the lowercase-kebab-case shape and stay unique
   across the whole registry.

### Run the tests

The package test runner picks up every `*.test.{ts,tsx}` under `src/` and
`game-template/` automatically, so after the copy your game's tests run with the
rest:

```sh
npm test
npm run typecheck
```

Both must pass before you continue. The template's tests are a starting point:
replace them with tests that describe your own game, but keep the same five
behaviors covered:

- definition shape: valid id, complete manifest, `Game` is the component.
- save and restore, including rejecting a malformed save.
- the companion port methods you actually call.
- `onExit` returns to the hall and keeps the save.
- registry placement, covered next.

## The dev registry flow

While a game is in development it must not touch the production registry. The
template ships a dev registry for exactly this reason:

```ts
export const DEV_REGISTRY: readonly RegisteredGame[] = [
  ...GAME_REGISTRY,
  { manifest: myGameManifest, load: async () => myGameDefinition },
]
```

`DEV_REGISTRY` is the curated games plus your in-development game. To see your
game in the hall during local work, render the hall or the breakroom shell with
`registry={DEV_REGISTRY}`. The template test does exactly this: it renders the
hall with the dev registry and asserts your game's card appears.

The production `GAME_REGISTRY` stays untouched until review. Only a maintainer
moves a reviewed game into it, and only after every gate in
`docs/game-review-checklist.md` passes. Games are never downloaded at runtime:
every game ships inside the package bundle, and the registry is a curated
in-package list, not a remote catalog.

## What a game must ship with

Before a game is reviewable it needs, at minimum:

- All source in this repository under `src/games/<your-game>/`. Games are not
  fetched from elsewhere.
- Any art, audio, or other assets committed in the repository, with provenance
  recorded (see `docs/art-generation.md` for the existing record pattern).
  Cover and icon URLs resolve to in-repo assets or embedded data.
- A non-empty `license` in the manifest, with `LICENSE` and
  `THIRD_PARTY_NOTICES.md` updated when the game brings in code, art, audio, or
  rules from elsewhere.
- Tests that run with `npm test`, covering the five behaviors above plus your
  game's actual rules and edge cases.
- A clean `npm run typecheck`.

Manual review gates are listed in `docs/game-review-checklist.md`. That document
is the acceptance contract for the curated registry.

## Rules to follow

- Use only `GameProps`. Do not import platform internals.
- Validate your own saves. A malformed save must not crash the game.
- Save only JSON-serializable data. A serialization failure is visible but not
  fatal.
- Clean up timers, event listeners, and audio on unmount. The game must survive
  React StrictMode mount/unmount cycles.
- Treat the companion as optional. The game must be fully playable without it.
- Do not promise remote downloads, installs, ratings, or updates in the game UI
  or its docs. Those do not exist.
- Keep platform concepts out of the game UI. The hall and shell are the only
  platform-facing surfaces a player sees.
- A game may use browser or network capabilities, but all of its source must
  live in this repository and pass maintainer review.
