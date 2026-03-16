/**
 * esbuild script for agents service.
 * Bundles workspace packages (@bipi/*) inline from TypeScript source,
 * keeps all external npm packages as-is (they live in node_modules at runtime).
 */
import { build } from 'esbuild'

const workspacePackages = new Set(['@bipi/shared', '@bipi/db', '@bipi/agent-core'])

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  plugins: [
    {
      name: 'external-node-modules',
      setup(build) {
        // Mark everything external EXCEPT workspace packages
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (workspacePackages.has(args.path)) return null // bundle workspace packages inline
          return { external: true }
        })
      },
    },
  ],
})

console.log('Build complete: dist/index.js')
