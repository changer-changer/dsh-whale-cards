import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'game-template/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
