#!/usr/bin/env node
// Source art for the store app icons and splash (fed to @capacitor/assets):
//   node scripts/make-app-assets.mjs            # source PNGs + android launcher
//   npx capacitor-assets generate --android     # splash screens (also rewrites
//                                               # the launcher, blurrily)
//   node scripts/make-app-assets.mjs --launcher # so put ours back last
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, writeAndroidLauncher, PAPER, FAINT, NIGHT } from './logo.mjs'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets')
const RES = path.join(OUT, '..', 'android', 'app', 'src', 'main', 'res')
mkdirSync(OUT, { recursive: true })
const out = (n) => path.join(OUT, n)

if (process.argv.includes('--launcher')) {
  await writeAndroidLauncher(RES)
  console.log('android launcher ->', RES)
  process.exit(0)
}

// Store listing icon: the full-bleed leaf, square; Play rounds the corners itself.
await render({ size: 1024, colours: { radius: 0 } }).toFile(out('icon-only.png'))
// Adaptive layers as capacitor-assets expects them (it only uses these for the
// launcher it writes, which --launcher replaces): band + bird on transparent,
// plain white background.
await render({ size: 1024, colours: { page: null } }).toFile(out('icon-foreground.png'))
await render({ size: 1024, scale: 0, bg: PAPER }).toFile(out('icon-background.png'))
// Splash: the leaf centred on a plain ground, one per theme (a faint edge keeps
// the white leaf visible on the white ground).
await render({ size: 2732, scale: 0.24, bg: PAPER, colours: { outline: FAINT } }).toFile(out('splash.png'))
await render({ size: 2732, scale: 0.24, bg: NIGHT }).toFile(out('splash-dark.png'))
await writeAndroidLauncher(RES)
console.log('assets ->', OUT, '+ android launcher')
