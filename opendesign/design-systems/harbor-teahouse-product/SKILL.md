# Harbor Teahouse Product System

Use this system for every DSH teahouse lobby, short-form game, loading state, and companion surface.

## Direction

Build a late-night harbor tea room, not a generic game launcher. The tone is quiet, tactile, and editorial: ink navy surfaces, old-brass wayfinding, petrol-teal interaction feedback, warm ivory copy, and occasional coral danger. Use the supplied harbor and game-table art as spatial anchors, never as decorative thumbnails repeated everywhere.

Lanyin is an adult whale girl and the teahouse proprietor, not a replaceable assistant avatar. She welcomes the player, competes with a recognizable temperament, remembers across games, listens for DSH task state, and guides the player back to work. Preserve her whale silhouette, tide sensitivity, calm wit, and cross-game continuity in copy and behavior without turning every line into a forced ocean metaphor.

## Required rules

- Start with `tokens/colors_and_type.css`; do not invent nearby colors or radii.
- Use `ui-serif`/Songti only for display titles and important scores. Keep controls in the sans stack.
- Keep panels mostly square with 5–12px radii. Pills are only for compact status.
- Every game must provide intro, active turn, disabled action, loading, recoverable error, round result, and match result states.
- Put the current decision and its consequence next to the primary actions.
- Use one primary action per decision. Secondary actions must be visibly quieter.
- Never communicate state by color alone. Pair it with a label, mark, number, or shape.
- Preserve a visible exit back to the lobby and local progress after interruption.
- Minimum target size is 42px. Horizontal game boards may scroll on narrow screens; core actions may not disappear.
- Avoid emoji as interface icons, excessive glass effects, generic gradients, and rounded-card grids with no hierarchy.

## Imagery

- `assets/harbor.jpg`: lobby hero, Gin Rummy companion scene, launcher crop.
- `assets/games.jpg`: formation duel and tide-collection intros.
- Favor left-side copy over darker image regions. Keep faces and lighthouse landmarks unobscured.

## Motion

Use motion to explain arrival, thinking, and score change. 120–280ms is the normal range. Respect `prefers-reduced-motion` and never animate the whole screen indefinitely.
