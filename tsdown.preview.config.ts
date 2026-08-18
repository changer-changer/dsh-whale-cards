import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'dsh-whale-cards/preview',
  entry: { preview: 'src/preview.tsx' },
  outDir: '../opendesign/mockups/whale-cards',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
  outputOptions: {
    entryFileNames: 'preview.js',
  },
})
