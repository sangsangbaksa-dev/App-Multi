"""Builds logo.svg (outlined wordmark) and icon.svg / icon-maskable.svg from the self-hosted Newsreader file.
Needs fonttools and brotli. Run from invoice-pwa/: python3 design/build_logo.py"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

INK, ACCENT, PAPER = "#211E18", "#A4401A", "#F3EEE4"
font = TTFont("fonts/newsreader-latin-400-normal.woff2")
gs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm

def outline(text, size, x0, y0):
    """Returns (svg path data, per-letter x positions, end x). y0 is the baseline."""
    s = size / upm
    x, d, xs = x0, [], []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, y0)))
        d.append(pen.getCommands()); xs.append(x)
        x += gs[g].width * s
    return " ".join(d), xs, x

def lens(x1, x2, y, t):
    xm = (x1 + x2) / 2
    return f"M{x1:.1f} {y:.1f}Q{xm:.1f} {y - t:.1f} {x2:.1f} {y:.1f}Q{xm:.1f} {y + t:.1f} {x1:.1f} {y:.1f}Z"

# wordmark
size, pad = 120, 24
d, xs, end = outline("QuickBill", size, pad, 100)
u1, u2 = xs[1], xs[4]  # under "uic" up to the start of "k"... extended below
u2 = xs[5]
w, h = round(end + pad), 140
open("logo.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none">'
    f'<title>QuickBill</title><path d="{d}" fill="{INK}"/><path d="{lens(u1, u2 + 20, 124, 5.5)}" fill="{ACCENT}"/></svg>\n')

# icon: Q on paper with the same underline
isz = 330
qd, qx, qend = outline("Q", isz, 0, 0)
qw = qend
ox, oy = (512 - qw) / 2, 300
qd, _, _ = outline("Q", isz, ox, oy)
ul = lens(ox + qw * 0.12, ox + qw * 0.92, oy + 92, 9)

def icon(rx):
    r = f' rx="{rx}"' if rx else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
            f'<rect width="512" height="512"{r} fill="{PAPER}"/><path d="{qd}" fill="{INK}"/><path d="{ul}" fill="{ACCENT}"/></svg>\n')
open("icon.svg", "w").write(icon(112))
open("icon-maskable.svg", "w").write(icon(0))
print(w, h)
