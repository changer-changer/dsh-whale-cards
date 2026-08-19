import { defineConfig } from 'tsdown'

const PACKAGE_ID = 'dsh-whale-cards'

export default defineConfig([
  {
    name: `${PACKAGE_ID}/host`,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    sourcemap: true,
    clean: true,
    deps: {
      // The Host already owns these singleton services. Bundling another copy
      // would split Cordis registries and break Agent/Session scope identity.
      neverBundle: [/^@deepseek-ai\//],
    },
    outputOptions: {
      entryFileNames: 'index.js',
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
      neverBundle: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
