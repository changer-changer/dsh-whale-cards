import { defineConfig } from 'tsdown'

const PACKAGE_ID = 'dsh-whale-cards'

export default defineConfig([
  {
    name: `${PACKAGE_ID}/host`,
    entry: {
      index: 'src/index.ts',
      'typert.host': 'src/companion/remote-host.ts',
      'typert.remote-client': 'src/companion/remote-client.ts',
    },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    sourcemap: true,
    clean: true,
    deps: {
      neverBundle: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-llm',
        '@deepseek-ai/dsh-storage-domain',
        '@deepseek-ai/dsh-typert-protocol',
      ],
    },
    outputOptions: {
      entryFileNames: '[name].js',
    },
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      alwaysBundle: ['zod'],
      neverBundle: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
    outputOptions: {
      entryFileNames: 'client.js',
      inlineDynamicImports: true,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
