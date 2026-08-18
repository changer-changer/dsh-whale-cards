import type { GameManifest } from '../../breakroom/game-contract.ts'

/**
 * Gin Rummy's registry manifest (spec §9). Kept in its own module so the hall
 * can render a card from `GAME_REGISTRY` without importing the React game code;
 * `load()` pulls the full `GameDefinition` lazily.
 *
 * `coverUrl`/`iconUrl` point at the real harbor artwork already shipped under
 * `assets/`. Slice D will wire these through the asset pipeline so they resolve
 * inside the built bundle.
 */
export const ginRummyManifest: GameManifest = {
  id: 'gin-rummy',
  title: 'Gin Rummy',
  summary: '三手双人敲牌：与澜音摸牌、整理顺子与同点、敲牌计分。',
  coverUrl: 'assets/lanyin-harbor.jpg',
  iconUrl: 'assets/lanyin-harbor.jpg',
  version: '1.0.0',
  estimatedMinutes: [8, 12],
  tags: ['card', 'rummy', 'two-player', 'breakroom'],
  author: 'dsh-whale-cards maintainers',
  license: 'MIT',
}
