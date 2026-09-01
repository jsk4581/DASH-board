#!/usr/bin/env node
// Source art for the store app icons and splash (fed to @capacitor/assets):
//   node scripts/make-app-assets.mjs            # source PNGs + android launcher
//   npx capacitor-assets generate --android     # splash screens (also rewrites
//                                               # the launcher, blurrily)
//   node scripts/make-app-assets.mjs --launcher # so put ours back last
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, writeAndroidLauncher, PAPER, NIGHT } from './logo.mjs'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets')
const RES = path.join(OUT, '..', 'android', 'app', 'src', 'main', 'res')
mkdirSync(OUT, { recursive: true })
const out = (n) => path.join(OUT, n)

if (process.argv.includes('--launcher')) {
  await writeAndroidLauncher(RES)
  console.log('android launcher ->', RES)
  process.exit(0)
}

// Launcher icon (legacy + store listing): the card on a white rounded tile (the artwork carries its own margins).
await render({ size: 1024, scale: 1, bg: PAPER, radius: 0.22 }).toFile(out('icon-only.png'))
// Adaptive layers: foreground kept inside the 66% safe zone, plain white background.
await render({ size: 1024, scale: 0.66 }).toFile(out('icon-foreground.png'))
await render({ size: 1024, scale: 0, bg: PAPER }).toFile(out('icon-background.png'))
// Splash: the mark centred on a plain ground, one per theme.
await render({ size: 2732, scale: 0.24, bg: PAPER }).toFile(out('splash.png'))
await render({ size: 2732, scale: 0.24, bg: NIGHT, colours: { outline: NIGHT } }).toFile(out('splash-dark.png'))
await writeAndroidLauncher(RES)
console.log('assets ->', OUT, '+ android launcher')
