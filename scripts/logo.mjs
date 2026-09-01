// Rasterising helpers for the DASH mark (assets/logo.svg). Used by the app
// asset generator; needs `sharp`, which @capacitor/assets already brings in.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
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
export const ACCENT_LIGHT = oklch(0.76, 0.085, 255) // --accent (light theme)
export const PAPER = '#ffffff'
export const NIGHT = oklch(0.18, 0.005, 285.8) // --bg (dark theme)

/** The mark's inner markup with theme colours fixed (librsvg has no colour-scheme). */
export function viewBox() {
  return readFileSync(LOGO, 'utf8').match(/viewBox="([^"]+)"/)[1]
}

export function markInner({ body = INK, wing = ACCENT } = {}) {
  const svg = readFileSync(LOGO, 'utf8')
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'))
  return inner.replace(/<style>[\s\S]*?<\/style>/, '').replace('class="wing"', `class="wing" stroke="${wing}"`).replace('class="body"', `class="body" fill="${body}"`)
}

/** Full-size square image with the mark centred at `scale` of the side. */
export function composeSvg({ size, scale = 1, bg = null, radius = 0, colours } = {}) {
  const inner = markInner(colours)
  const s = Math.round(size * scale)
  const o = Math.round((size - s) / 2)
  const plate = bg ? `<rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${plate}<svg x="${o}" y="${o}" width="${s}" height="${s}" viewBox="${viewBox()}">${inner}</svg></svg>`
}

export function render(opts) {
  return sharp(Buffer.from(composeSvg(opts))).png()
}

// ---- Android launcher resources ------------------------------------------
// @capacitor/assets rasterises the adaptive layers at 48dp and stretches them
// to 108dp, which blurs the launcher icon. Write the foreground as a
// VectorDrawable instead (sharp at any density, and it doubles as the
// Android 13 monochrome/themed icon); only the pre-8.0 legacy icons stay PNG.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

// box: the logo's viewBox (its enclosing circle) mapped onto the 66dp adaptive safe zone
function vectorDrawable({ body, wing, dp = 108, box = 66 }) {
  const svg = readFileSync(LOGO, 'utf8')
  const d = svg.match(/<path class="body" d="([^"]+)"/)[1]
  const lines = [...svg.matchAll(/<line x1="(\d+)" y1="(\d+)" x2="(\d+)" y2="(\d+)"/g)]
  const [vx, vy, vw] = viewBox().split(' ').map(Number)
  const k = box / vw
  const tx = (dp - box) / 2 - vx * k, ty = (dp - box) / 2 - vy * k
  const bars = lines.map(([, x1, y1, x2, y2]) =>
    `    <path android:pathData="M${x1},${y1} L${x2},${y2}" android:strokeColor="${wing}" android:strokeWidth="62" android:strokeLineCap="round"/>`).join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${dp}dp" android:height="${dp}dp"
    android:viewportWidth="${dp}" android:viewportHeight="${dp}">
  <group android:scaleX="${k.toFixed(6)}" android:scaleY="${k.toFixed(6)}" android:translateX="${tx.toFixed(3)}" android:translateY="${ty.toFixed(3)}">
${bars}
    <path android:pathData="${d}" android:fillColor="${body}"/>
  </group>
</vector>
`
}

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`

export async function writeAndroidLauncher(resDir) {
  const w = (rel, text) => { mkdirSync(path.join(resDir, path.dirname(rel)), { recursive: true }); writeFileSync(path.join(resDir, rel), text) }
  w('drawable/ic_launcher_foreground.xml', vectorDrawable({ body: INK, wing: ACCENT }))
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
    await render({ size, scale: 0.9, bg: PAPER, radius: 0.22 }).toFile(path.join(dir, 'ic_launcher.png'))
    await render({ size, scale: 0.98, bg: PAPER, radius: 0.5 }).toFile(path.join(dir, 'ic_launcher_round.png'))
    for (const stale of ['ic_launcher_foreground.png', 'ic_launcher_background.png']) rmSync(path.join(dir, stale), { force: true })
  }
}
