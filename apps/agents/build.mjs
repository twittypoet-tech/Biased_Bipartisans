/**
 * esbuild bundle script for agents service.
 *
 * Bundles everything into a single dist/index.js — workspace packages
 * (@bipi/*) and all npm dependencies are inlined. Only packages with
 * native Node.js addons (.node binaries) are kept external, since those
 * must be loaded from the filesystem at runtime.
 */
import { build } from 'esbuild'

const nativeModules = [
  '@livekit/rtc-node',
  'onnxruntime-node',
]

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.cjs',
  external: nativeModules,
  // Suppress warnings about dynamic requires in bundled npm packages
  logLevel: 'warning',
})

console.log('Build complete: dist/index.cjs')
