# Third-Party Notices

`dsh-whale-cards` is an original, clean-room implementation released under
the MIT License in [`LICENSE`](LICENSE). This file records research references
and provenance; it does not add those projects to the runtime dependency tree.

## DSH plugin contract

The package follows the public bundle and browser-client contracts documented
by the MIT-licensed
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) project.
The DSH runtime is supplied by the user's DSH installation and is not vendored
in this package. No DeepSeek Harness source file or artwork is redistributed.

## Gin Rummy rules and validation references

The game engine is original TypeScript written from public descriptions of the
traditional Gin Rummy rules. Its rule wording, state machine, meld search,
scoring code, AI, tests, and interface were written for this project.

The following first-party sources were used as behavioral references:

- [Bicycle Gin Rummy rules](https://bicyclecards.com/how-to-play/gin-rummy):
  reference for the ordinary draw/discard flow, sets and runs, deadwood,
  knocking, Gin, layoffs, undercuts, and the default scoring profile. No text,
  illustration, card design, or other expressive material was copied.
- [Google DeepMind OpenSpiel Gin Rummy](https://github.com/google-deepmind/open_spiel/tree/master/open_spiel/games/gin_rummy)
  ([Apache-2.0](https://github.com/google-deepmind/open_spiel/blob/master/LICENSE)):
  used as a rules and edge-case cross-check. No OpenSpiel source, binary, test
  fixture, or asset is included or translated into this package.
- [RLCard Gin Rummy](https://github.com/datamllab/rlcard)
  ([MIT](https://github.com/datamllab/rlcard/blob/master/LICENSE.md)):
  used as research evidence for a lightweight rule-based opponent. No RLCard
  Python source, GUI, model, fixture, or asset is included or ported.

The package contains an `openSpielCompat` scoring profile to support behavioral
cross-checks. Its name acknowledges the reference; it does not contain
OpenSpiel code.

## Explicitly excluded projects and assets

No code, artwork, character design, costume, dialogue, audio, generated asset,
or other material from
[`Small-tailqwq/dsh-deep-whale`](https://github.com/Small-tailqwq/dsh-deep-whale)
is included. That separate project identifies its skin as a multi-level
derivative work under
[CC BY-NC-SA 4.0](https://github.com/Small-tailqwq/dsh-deep-whale/blob/main/maid-atelier/LICENSE).
It is neither a dependency nor a source asset for `dsh-whale-cards`.

No code or artwork was copied from `dsh-pet` or other `dsh-web-ui` packages.
In particular, this project does not rely on files whose package metadata and
included license text disagree: the researched `dsh-pet`
[`package.json`](https://github.com/zhu1090093659/dsh-web-ui/blob/45207c9ed0436418effd06eb0e8fe67b278dd094/packages/dsh-pet/package.json)
declares Apache-2.0 while its bundled
[`LICENSE`](https://github.com/zhu1090093659/dsh-web-ui/blob/45207c9ed0436418effd06eb0e8fe67b278dd094/packages/dsh-pet/LICENSE)
contains BSD-3-Clause. General interaction ideas such as a disposable global
plugin surface, short event-driven reactions, and cleanup on unload were
implemented independently against the public DSH contract.

## Original artwork

`assets/lanyin-harbor.jpg` depicts the original adult character Lanyin and was
created specifically for this project with Codex's built-in image generation,
without a reference image. Its brief deliberately excludes the maid costume,
lace, palace, gothic ornament, logos, composition, and named-character likeness
associated with the research references above.

The exact generation prompt, source locations, hashes, and optimized plugin
asset path are recorded in [`docs/art-generation.md`](docs/art-generation.md).
No third-party image is embedded in the generated client bundle.

## Package dependencies

React and React DOM are peer dependencies supplied by the DSH browser module
loader. [Zod](https://github.com/colinhacks/zod) is an MIT-licensed runtime
dependency used to validate the strict Host/Client Remote boundary. Development
and test packages remain under their respective upstream licenses. Their
presence in a lockfile does not change this project's MIT license, and their
source trees are not shipped by this package's `files` manifest.
