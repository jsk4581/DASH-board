// Rasterising helpers for the DASH logo (assets/logo.svg): a calendar card
// with the bird inside. Used by the app asset generator; needs `sharp`, which
// @capacitor/assets already brings in.
import sharp from 'sharp'
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const LOGO = path.join(HERE, '..', 'assets', 'logo.svg')

export function oklch(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h), b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const enc = (c) => {
    c = Math.max(0, Math.min(1, c))
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return '#' + lin.map(enc).join('')
}

export const INK = oklch(0.4, 0.12, 255) // --accent-ink (light theme)
export const ACCENT = oklch(0.62, 0.11, 255) // --accent (dark theme value; reads as a fill)
export const PAPER = '#ffffff'
export const FAINT = '#cfd8e6' // card outline
export const NIGHT = oklch(0.18, 0.005, 285.8) // --bg (dark theme)

// ---- parse the SVG once ------------------------------------------------------
function parse() {
  const svg = readFileSync(LOGO, 'utf8')
  const num = (re) => Number(svg.match(re)[1])
  const card = {
    x: num(/class="card" x="([\d.]+)"/), y: num(/class="card"[^>]*? y="([\d.]+)"/),
    w: num(/class="card"[^>]*? width="([\d.]+)"/), h: num(/class="card"[^>]*? height="([\d.]+)"/),
    rx: num(/class="card"[^>]*? rx="([\d.]+)"/),
  }
  const band = svg.match(/class="band" d="([^"]+)"/)[1]
  const [, tx, ty, k] = svg.match(/translate\(([\d.-]+),([\d.-]+)\) scale\(([\d.]+)\)/).map(Number)
  const lines = [...svg.matchAll(/<line x1="(\d+)" y1="(\d+)" x2="(\d+)" y2="(\d+)"/g)].map((m) => m.slice(1).map(Number))
  const bodyPath = svg.match(/class="body" d="([^"]+)"/)[1]
  return { svg, viewBox: svg.match(/viewBox="([^"]+)"/)[1], card, band, bird: { tx, ty, k, lines, bodyPath } }
}

/** The logo's inner markup with colours as presentation attributes (no <style>). */
export function markInner({ body = INK, wing = ACCENT, band = INK, card = PAPER, outline = FAINT } = {}) {
  const { svg } = parse()
  return svg
    .slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'))
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace('class="card"', `fill="${card}" stroke="${outline}" stroke-width="10"`)
    .replace('class="band"', `fill="${band}"`)
    .replace('class="wing"', `stroke="${wing}"`)
    .replace('class="body"', `fill="${body}"`)
}

/** Square image with the logo centred at `scale` of the side, on an optional plate. */
export function composeSvg({ size, scale = 1, bg = null, radius = 0, colours } = {}) {
  const { viewBox } = parse()
  const s = Math.round(size * scale), o = Math.round((size - s) / 2)
  const plate = bg ? `<rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${plate}<svg x="${o}" y="${o}" width="${s}" height="${s}" viewBox="${viewBox}">${markInner(colours)}</svg></svg>`
}

export function render(opts) {
  return sharp(Buffer.from(composeSvg(opts))).png()
}

// ---- Android launcher resources ------------------------------------------
// @capacitor/assets rasterises the adaptive layers at 48dp and stretches them
// to 108dp, which blurs the launcher icon. Write the foreground as a
// VectorDrawable instead (sharp at any density); a stroke-only variant serves
// as the Android 13 monochrome/themed icon. Only the pre-8.0 legacy icons stay PNG.
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

function roundedRectPath({ x, y, w, h, rx }) {
  return `M${x + rx},${y} h${w - 2 * rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${h - 2 * rx} a${rx},${rx} 0 0 1 -${rx},${rx} h-${w - 2 * rx} a${rx},${rx} 0 0 1 -${rx},-${rx} v-${h - 2 * rx} a${rx},${rx} 0 0 1 ${rx},-${rx} Z`
}

// The 1024-unit artwork maps onto the 72dp visible disc of the 108dp adaptive
// canvas; the card's corners stay inside the 66dp safe zone.
function vectorDrawable({ mono = false } = {}) {
  const { card, band, bird } = parse()
  const dp = 108, vis = 72, k = vis / 1024, t = (dp - vis) / 2
  const cardEl = mono
    ? `    <path android:pathData="${roundedRectPath(card)}" android:strokeColor="${INK}" android:strokeWidth="26"/>`
    : `    <path android:pathData="${roundedRectPath(card)}" android:fillColor="${PAPER}" android:strokeColor="${FAINT}" android:strokeWidth="10"/>`
  const bars = bird.lines.map(([x1, y1, x2, y2]) =>
    `      <path android:pathData="M${x1},${y1} L${x2},${y2}" android:strokeColor="${mono ? INK : ACCENT}" android:strokeWidth="62" android:strokeLineCap="round"/>`).join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${dp}dp" android:height="${dp}dp"
    android:viewportWidth="${dp}" android:viewportHeight="${dp}">
  <group android:scaleX="${k.toFixed(6)}" android:scaleY="${k.toFixed(6)}" android:translateX="${t}" android:translateY="${t}">
${cardEl}
    <path android:pathData="${band}" android:fillColor="${INK}"/>
    <group android:scaleX="${bird.k}" android:scaleY="${bird.k}" android:translateX="${bird.tx}" android:translateY="${bird.ty}">
${bars}
      <path android:pathData="${bird.bodyPath}" android:fillColor="${INK}"/>
    </group>
  </group>
</vector>
`
}

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`

export async function writeAndroidLauncher(resDir) {
  const w = (rel, text) => { mkdirSync(path.join(resDir, path.dirname(rel)), { recursive: true }); writeFileSync(path.join(resDir, rel), text) }
  w('drawable/ic_launcher_foreground.xml', vectorDrawable())
  w('drawable/ic_launcher_monochrome.xml', vectorDrawable({ mono: true }))
  // the Capacitor template ships a placeholder foreground under drawable-v24,
  // which would shadow ours on every supported API level
  for (const stale of ['drawable-v24/ic_launcher_foreground.xml', 'drawable/ic_launcher_background.xml']) rmSync(path.join(resDir, stale), { force: true })
  w('values/ic_launcher_background.xml', `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${PAPER}</color>\n</resources>\n`)
  w('mipmap-anydpi-v26/ic_launcher.xml', adaptiveXml)
  w('mipmap-anydpi-v26/ic_launcher_round.xml', adaptiveXml)
  for (const [name, mult] of Object.entries(DENSITIES)) {
    const size = Math.round(48 * mult)
    const dir = path.join(resDir, `mipmap-${name}`)
    mkdirSync(dir, { recursive: true })
    await render({ size, scale: 1, bg: PAPER, radius: 0.22 }).toFile(path.join(dir, 'ic_launcher.png'))
    await render({ size, scale: 1, bg: PAPER, radius: 0.5 }).toFile(path.join(dir, 'ic_launcher_round.png'))
    for (const stale of ['ic_launcher_foreground.png', 'ic_launcher_background.png']) rmSync(path.join(dir, stale), { force: true })
  }
}
