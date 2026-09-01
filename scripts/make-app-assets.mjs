#!/usr/bin/env node
// Source art for the store app icons and splash (fed to @capacitor/assets):
//   node scripts/make-app-assets.mjs && npx capacitor-assets generate --android
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, PAPER, NIGHT, ACCENT_LIGHT } from './logo.mjs'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets')
mkdirSync(OUT, { recursive: true })
const out = (n) => path.join(OUT, n)

// Launcher icon (legacy + store listing): the mark on a white rounded tile.
await render({ size: 1024, scale: 0.78, bg: PAPER, radius: 0.22 }).toFile(out('icon-only.png'))
// Adaptive layers: foreground kept inside the 66% safe zone, plain white background.
await render({ size: 1024, scale: 0.6 }).toFile(out('icon-foreground.png'))
await render({ size: 1024, scale: 0, bg: PAPER }).toFile(out('icon-background.png'))
// Splash: the mark centred on a plain ground, one per theme.
await render({ size: 2732, scale: 0.19, bg: PAPER }).toFile(out('splash.png'))
await render({ size: 2732, scale: 0.19, bg: NIGHT, colours: { body: '#ffffff', wing: ACCENT_LIGHT } }).toFile(out('splash-dark.png'))
console.log('assets ->', OUT)
