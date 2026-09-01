// Rasterising helpers for the DASH logo (assets/logo.svg): a full-bleed
// calendar leaf with the bird on it. Used by the app asset generator; needs
// `sharp`, which @capacitor/assets already brings in.
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
export const FAINT = '#cfd8e6' // leaf outline (only where the leaf sits on a light ground)
export const NIGHT = oklch(0.18, 0.005, 285.8) // --bg (dark theme)

// ---- parse the SVG once ------------------------------------------------------
function parse() {
  const svg = readFileSync(LOGO, 'utf8')
  const num = (re) => Number(svg.match(re)[1])
  const page = { rx: num(/class="page"[^>]*? rx="([\d.]+)"/), stroke: num(/\.page[^}]*stroke-width: ([\d.]+)/) }
  const bandH = num(/<rect class="band" width="1024" height="([\d.]+)"/)
  const tabs = [...svg.matchAll(/<circle class="band" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map((m) => m.slice(1).map(Number))
  const [, cx, cy, tx, ty, k] = svg.match(/data-cx="([\d.]+)" data-cy="([\d.]+)" transform="translate\(([\d.-]+),([\d.-]+)\) scale\(([\d.]+)\)/).map(Number)
  const lines = [...svg.matchAll(/<line x1="(\d+)" y1="(\d+)" x2="(\d+)" y2="(\d+)"/g)].map((m) => m.slice(1).map(Number))
  const bodyPath = svg.match(/class="body" d="([^"]+)"/)[1]
  return { page, bandH, tabs, bird: { cx, cy, tx, ty, k, lines, bodyPath } }
}

function birdEl({ body, wing, scale = 1 }) {
  const { bird } = parse()
  const bars = bird.lines.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('')
  // optional extra scaling about the bird's own centre (maskable icons)
  const about = scale === 1 ? '' : `translate(${bird.cx},${bird.cy}) scale(${scale}) translate(${-bird.cx},${-bird.cy}) `
  return `<g transform="${about}translate(${bird.tx},${bird.ty}) scale(${bird.k})"><g fill="none" stroke="${wing}" stroke-width="62" stroke-linecap="round">${bars}</g><path d="${bird.bodyPath}" fill="${body}"/></g>`
}

/**
 * The leaf's inner markup (1024 units) with colours as presentation attributes.
 * radius: corner radius as a fraction of the side (0 = square, 0.5 = disc);
 *         null keeps the SVG's own rounding. page: null draws no leaf (band +
 *         bird on a transparent ground, for adaptive foregrounds).
 */
export function markInner({ body = INK, wing = ACCENT, band = INK, page = PAPER, outline = null, radius = null, birdScale = 1, id = 'leaf' } = {}) {
  const { page: pg, bandH, tabs } = parse()
  const rx = radius == null ? pg.rx : Math.round(1024 * radius)
  const clip = page ? `<clipPath id="${id}"><rect width="1024" height="1024" rx="${rx}"/></clipPath>` : ''
  const leaf = page ? `<rect width="1024" height="1024" rx="${rx}" fill="${page}"/>` : ''
  const edge = page && outline ? `<rect width="1024" height="1024" rx="${rx}" fill="none" stroke="${outline}" stroke-width="${pg.stroke}"/>` : ''
  const bandEl = `<rect width="1024" height="${bandH}" fill="${band}"/>` + tabs.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${band}"/>`).join('')
  const inner = leaf + bandEl + birdEl({ body, wing, scale: birdScale }) + edge
  return page ? `${clip}<g clip-path="url(#${id})">${inner}</g>` : inner
}

/** Square image with the leaf centred at `scale` of the side, on an optional plate. */
export function composeSvg({ size, scale = 1, bg = null, plateRadius = 0, colours } = {}) {
  const s = Math.round(size * scale), o = Math.round((size - s) / 2)
  const plate = bg ? `<rect width="${size}" height="${size}" rx="${Math.round(size * plateRadius)}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${plate}<svg x="${o}" y="${o}" width="${s}" height="${s}" viewBox="0 0 1024 1024">${markInner(colours)}</svg></svg>`
}

export function render(opts) {
  return sharp(Buffer.from(composeSvg(opts))).png()
}

// ---- Android launcher resources ------------------------------------------
// @capacitor/assets rasterises the adaptive layers at 48dp and stretches them
// to 108dp, which blurs the launcher icon. Write the foreground as a
// VectorDrawable instead (sharp at any density); the same shapes in one colour
// serve as the Android 13 monochrome/themed icon. Only the pre-8.0 legacy
// icons stay PNG.
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

// The 1024-unit leaf maps onto the 72dp visible disc of the 108dp adaptive
// canvas (the launcher mask is the leaf's edge); the bird stays inside the
// 66dp safe zone. The band runs across the whole 108dp canvas so no mask
// shape can expose the background beside it. The white leaf itself is the
// background layer.
function vectorDrawable({ mono = false } = {}) {
  const { bandH, tabs, bird } = parse()
  const dp = 108, vis = 72, k = vis / 1024, t = (dp - vis) / 2
  const bandColor = INK, wing = mono ? INK : ACCENT
  const bars = bird.lines.map(([x1, y1, x2, y2]) =>
    `      <path android:pathData="M${x1},${y1} L${x2},${y2}" android:strokeColor="${wing}" android:strokeWidth="62" android:strokeLineCap="round"/>`).join('\n')
  const tabEls = tabs.map(([cx, cy, r]) =>
    `    <path android:pathData="M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 -${2 * r},0 Z" android:fillColor="${bandColor}"/>`).join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${dp}dp" android:height="${dp}dp"
    android:viewportWidth="${dp}" android:viewportHeight="${dp}">
  <path android:pathData="M0,0 H${dp} V${(t + bandH * k).toFixed(3)} H0 Z" android:fillColor="${bandColor}"/>
  <group android:scaleX="${k.toFixed(6)}" android:scaleY="${k.toFixed(6)}" android:translateX="${t}" android:translateY="${t}">
${tabEls}
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
    await render({ size, colours: { radius: 0.22 } }).toFile(path.join(dir, 'ic_launcher.png'))
    await render({ size, colours: { radius: 0.5 } }).toFile(path.join(dir, 'ic_launcher_round.png'))
    for (const stale of ['ic_launcher_foreground.png', 'ic_launcher_background.png']) rmSync(path.join(dir, stale), { force: true })
  }
}
