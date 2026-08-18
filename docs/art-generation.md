# Lanyin artwork generation record

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

## Identity-preserving expression variants

The thinking, pleased, and concerned expressions were generated as edits of
the accepted calm harbor artwork. Each edit used Codex built-in `imagegen` in
`identity-preserve` mode on 2026-08-18. No other reference image was supplied.

### Edit input

Image 1 for all three edits was the same exact project asset:

| Role | Path | SHA-256 |
|---|---|---|
| Identity and scene anchor | `/Users/cuizhixing/.codex/.chatgpt-projects/g-p-6a826b3ab84881918f3729d6c78695a2/dsh-whale-cards/assets/lanyin-harbor.jpg` | `fd253c848047356dcd1189b91f1e8f5715ef3d4abc52d0923bb59b493139a4db` |

### Thinking exact prompt

The following prompt is recorded verbatim:

```text
Use case: identity-preserve
Asset type: in-game character emotion variant for a two-player card table
Input images: Image 1 is the edit target and the exact character/scene anchor.
Primary request: change only Lanyin's facial expression and the smallest natural hand gesture into focused competitive thinking. Her blue eyes glance slightly toward the cards, her eyebrows draw in just a little, her mouth is a calm thoughtful line, and the fingertips of the hand already near the deck lightly pause above it. The mood is clever, attentive, and gently competitive, never angry.
Constraints: preserve the same character identity and exact facial structure, dark navy hair with teal ends, whale ears, whale tail, headphones, earrings, outfit, body proportions, seated pose, camera, framing, table, card deck, room, harbor background, night lighting, palette, painterly anime rendering, and 16:9 composition. Change only expression and the tiny hand gesture. Do not add or remove objects or cards. No text, logo, watermark, border, or UI.
```

### Pleased exact prompt

The following prompt is recorded verbatim:

```text
Use case: identity-preserve
Asset type: in-game character emotion variant for a two-player card table
Input images: Image 1 is the edit target and the exact character/scene anchor.
Primary request: change only Lanyin's facial expression and the smallest natural posture detail into quietly pleased, playful confidence after a clever public card move. Her blue eyes meet the player with a warm lively sparkle, one eyebrow is subtly raised, and her smile is a little wider and teasing but still gentle. Her existing hand near the cards turns slightly palm-down as if she has just placed a card.
Constraints: preserve the same character identity and exact facial structure, dark navy hair with teal ends, whale ears, whale tail, headphones, earrings, outfit, body proportions, seated pose, camera, framing, table, card deck, room, harbor background, night lighting, palette, painterly anime rendering, and 16:9 composition. Change only expression and the tiny hand/posture detail. Do not add or remove objects or cards. No text, logo, watermark, border, or UI.
```

### Concerned exact prompt

The following prompt is recorded verbatim:

```text
Use case: identity-preserve
Asset type: in-game character emotion variant for a two-player card table
Input images: Image 1 is the edit target and the exact character/scene anchor.
Primary request: change only Lanyin's facial expression and the smallest natural gesture into gentle concern and attentiveness, suitable for reminding the player that a DSH task needs input. Her blue eyes look directly toward the player, eyebrows lift slightly at the inner corners, her smile fades into a soft reassuring expression, and the hand already near the deck pauses open in a small inviting gesture. She must look supportive, never alarmed or sad.
Constraints: preserve the same character identity and exact facial structure, dark navy hair with teal ends, whale ears, whale tail, headphones, earrings, outfit, body proportions, seated pose, camera, framing, table, card deck, room, harbor background, night lighting, palette, painterly anime rendering, and 16:9 composition. Change only expression and the tiny hand gesture. Do not add or remove objects or cards. No text, logo, watermark, border, or UI.
```

### Accepted expression files

All four plugin JPEGs retain the same 1672 × 941 composition.

| Expression | Project asset | SHA-256 |
|---|---|---|
| Calm | `assets/lanyin-harbor.jpg` | `fd253c848047356dcd1189b91f1e8f5715ef3d4abc52d0923bb59b493139a4db` |
| Thinking | `assets/lanyin-thinking.jpg` | `e6e5d905c6addc2485b1fbee8193cde3f5aaf2aba2f1165d8831424f50a423e0` |
| Pleased | `assets/lanyin-pleased.jpg` | `edba1a224a8409b0bcc4091ece39e8e1f5cc7a1a767aa443e87bdeaff0655e57` |
| Concerned | `assets/lanyin-concerned.jpg` | `903cd42a547a47be977a68c8ce545ea8dabad7a4bcb6375450f4e868e79d62ae` |

`scripts/embed-assets.mjs` embeds these files as the four self-contained JPEG
data URLs `LANYIN_CALM_ART`, `LANYIN_THINKING_ART`, `LANYIN_PLEASED_ART`, and
`LANYIN_CONCERNED_ART`. `LANYIN_HARBOR_ART` remains a backwards-compatible
alias for the calm artwork. The expression artwork therefore adds no browser
network requests.

### Expression regeneration rules

1. Supply the exact calm JPEG above as Image 1 to an `identity-preserve` edit.
2. Paste the corresponding exact prompt without adding a style or character
   reference.
3. Reject an edit if identity, facial structure, costume, pose, camera, scene,
   lighting, objects, or composition changed beyond the requested expression
   and small gesture.
4. Record the accepted file's SHA-256 and retain the 1672 × 941 composition.
5. Run `npm run generate:assets`; never edit the generated data URLs by hand.
