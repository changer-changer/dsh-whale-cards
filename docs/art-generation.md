# Lanyin Harbor artwork generation record

This document records the reproducible brief and file provenance for the
original Lanyin key art bundled with `dsh-whale-cards`.

## Generation mode

- Date: 2026-08-18
- Generator: Codex built-in `imagegen`
- Imagegen use-case mode: `stylized-concept`
- Reference images supplied: none
- Intended use: original key art and in-game background for a desktop DSH
  card-game plugin

## Exact prompt

The following prompt is recorded verbatim:

```text
Use case: stylized-concept
Asset type: original key art and in-game background for a desktop DSH card-game plugin
Primary request: Create a polished original anime-style illustration of an adult whale girl named Lanyin keeping a programmer company during a short card break.
Scene/backdrop: a cozy late-night harbor tea room with dark wood, a broad window overlooking calm water, distant warm dock lights, subtle paper texture and restrained bioluminescent sea-glow details.
Subject: one adult young woman seated on the RIGHT side of a low card table, shoulder-length ink-teal hair with aqua tips, small stylized whale-fin ears and a modest whale-tail silhouette, wearing an original oversized navy bomber-haori jacket over a simple cream shirt, slim headphones resting around her neck; calm observant expression with a slight playful smile; one hand near a small face-down card stack.
Style/medium: premium hand-painted 2D game key art, mature cozy anime visual novel quality, clean face and hands, elegant rather than cute-childlike.
Composition/framing: 16:9 wide scene; character occupies the right 38 percent; generous dark, low-detail negative space across the center-left for the playable card table and UI; camera at seated eye level; no cropped head or hands.
Lighting/mood: warm amber lamp against cool ink-blue night, calm and restorative, intimate but not romanticized.
Color palette: ink navy, warm rice-paper cream, restrained coral orange, sea-glass teal.
Constraints: entirely original character and costume; no maid outfit, no lace, no palace, no gothic ornament, no logos, no user interface, no readable cards, no text, no watermark. Keep the left side visually quiet enough for high-contrast game controls.
Avoid: resemblance to an existing named character, childlike proportions, exaggerated anatomy, fan-service pose, purple gradient, clutter, extra people, extra limbs or fingers.
```

## Output and derived files

All three image files have the same 1672 × 941 composition.

| Role | Path | SHA-256 |
|---|---|---|
| Original imagegen PNG | `/Users/cuizhixing/.codex/generated_images/01a012f1-468a-7b80-98b2-aa35e61328d1/exec-b16f5ca0-adb5-4b27-bb34-be03ae60de8f.png` | `dff5f34963c75972a683b7ebca37a73a3462d918b847a642b2ebd156a07aef0e` |
| Lossless project source copy | `opendesign/design-systems/whale-breakroom/assets/imagery/lanyin-harbor.png` | `dff5f34963c75972a683b7ebca37a73a3462d918b847a642b2ebd156a07aef0e` |
| Size-optimized plugin copy | `dsh-whale-cards/assets/lanyin-harbor.jpg` | `fd253c848047356dcd1189b91f1e8f5715ef3d4abc52d0923bb59b493139a4db` |

The two PNG hashes are identical, confirming that the design-system source is
an exact copy of the original generator output. The JPEG is the distribution
copy used by the plugin.

During `npm run build`, `scripts/embed-assets.mjs` reads the JPEG and regenerates
`src/client/generated/art.ts` as a local `data:image/jpeg;base64,...` constant.
The browser plugin therefore makes no network request for this artwork.

## Regeneration rules

1. Use Codex built-in `imagegen` with no reference image and paste the exact
   prompt above.
2. Preserve the raw PNG before optimization and record a new SHA-256 hash.
3. Visually reject outputs that resemble an existing named character, read as
   childlike, contain malformed hands, introduce text/logos, or violate the
   quiet center-left UI area.
4. Store the accepted lossless source in the design-system path and a
   size-optimized JPEG in `dsh-whale-cards/assets/lanyin-harbor.jpg`.
5. Run `npm run generate:assets`, then test and build the package. Do not edit
   `src/client/generated/art.ts` by hand.

This provenance record documents process and separation from reference works;
it is not a warranty about copyright status in any jurisdiction.
