#!/usr/bin/env python3
"""Source art for the store app icons and splash (fed to @capacitor/assets).

    python3 scripts/make-app-assets.py && npx capacitor-assets generate --android
"""
import math, os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
os.makedirs(OUT, exist_ok=True)


def oklch(L, C, h_deg):
    h = math.radians(h_deg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    def enc(c):
        c = max(0.0, min(1.0, c))
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return int(round(max(0.0, min(1.0, c)) * 255))

    return (enc(r), enc(g), enc(bl))


ACCENT = oklch(0.62, 0.11, 255)   # app.css --accent (dark theme), reads well as a fill
INK = oklch(0.40, 0.12, 255)      # --accent-ink
PAPER = (255, 255, 255)
FAINT = oklch(0.86, 0.02, 255)


def glyph(size, scale=1.0, bg=None, rounded=False):
    """The calendar mark, drawn in a 512-unit space scaled to `size`."""
    img = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=ACCENT)
    k = size / 512.0 * scale
    off = (size - 512 * k) / 2

    def R(x0, y0, x1, y1):
        return [off + x0 * k, off + y0 * k, off + x1 * k, off + y1 * k]

    d.rounded_rectangle(R(168, 92, 200, 160), radius=int(16 * k), fill=INK)
    d.rounded_rectangle(R(312, 92, 344, 160), radius=int(16 * k), fill=INK)
    d.rounded_rectangle(R(96, 128, 416, 432), radius=int(44 * k), fill=PAPER)
    d.rounded_rectangle(R(96, 128, 416, 216), radius=int(44 * k), fill=INK)
    d.rectangle(R(96, 186, 416, 216), fill=INK)
    for r in range(2):
        for c in range(3):
            x, y = 140 + c * 92, 258 + r * 78
            d.rounded_rectangle(R(x, y, x + 60, y + 46), radius=int(14 * k), fill=ACCENT if (r, c) == (0, 1) else FAINT)
    return img


# Launcher icon (legacy + store listing) and adaptive layers.
glyph(1024, rounded=True).save(os.path.join(OUT, "icon-only.png"))
glyph(1024, scale=0.72).save(os.path.join(OUT, "icon-foreground.png"))  # adaptive: keep inside the safe zone
Image.new("RGB", (1024, 1024), ACCENT).save(os.path.join(OUT, "icon-background.png"))

# Splash: the mark centred on a plain ground, one per theme.
for name, ground in (("splash.png", PAPER), ("splash-dark.png", oklch(0.18, 0.005, 285.8))):
    s = Image.new("RGB", (2732, 2732), ground)
    mark = glyph(520, rounded=True)
    s.paste(mark, ((2732 - 520) // 2, (2732 - 520) // 2), mark)
    s.save(os.path.join(OUT, name))
print("assets ->", OUT)
