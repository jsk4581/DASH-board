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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${plate}<svg x="${o}" y="${o}" width="${s}" height="${s}" viewBox="12 96 1090 1090">${inner}</svg></svg>`
}

export function render(opts) {
  return sharp(Buffer.from(composeSvg(opts))).png()
}
