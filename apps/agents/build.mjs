/**
 * esbuild bundle script for agents service.
 *
 * Strategy:
 * - Workspace packages (@bipi/*) are bundled inline from their TypeScript source.
 *   These point to .ts files which Node.js can't load directly, so they must be inlined.
 * - All npm packages are kept EXTERNAL — they live in node_modules at runtime.
 *   This avoids bundling native modules (sharp, @livekit/rtc-node, etc.) which
 *   break when their binary .node files are inlined.
 * - shamefully-hoist=true in .npmrc ensures ALL transitive npm deps (zod, sharp, etc.)
 *   are hoisted to root node_modules, so they're always resolvable at runtime.
 * - CJS output format — avoids ESM named-import restrictions on CJS native modules
 *   like @livekit/rtc-node.
 */
import { build } from 'esbuild'

const workspacePackages = new Set(['@bipi/shared', '@bipi/db', '@bipi/agent-core'])

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.cjs',
  plugins: [
    {
      name: 'external-npm-packages',
      setup(build) {
        // Keep all npm packages external; only bundle workspace packages inline
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (workspacePackages.has(args.path)) return null // bundle @bipi/* inline
          return { external: true }
        })
      },
    },
  ],
})

console.log('Build complete: dist/index.cjs')
