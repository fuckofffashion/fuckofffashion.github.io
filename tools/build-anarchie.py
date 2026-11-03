"""Zeichnet Motiv 008: das Anarchie-Zeichen in Knallrot, gesprüht.

Aufruf:  python tools/build-anarchie.py
Schreibt assets/img/fof-008-anarchie.png (3000 px, transparent) und die Web-Vorschau.
Die Sprühkante entsteht per SVG-Filter, der Sprühnebel aus Zufallspunkten mit festem Seed.
"""
import math
import random
import subprocess
from pathlib import Path

from PIL import Image

RED = "#ff1a1a"
SIZE = 3000
CHROME = Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe")
SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "assets" / "img" / "fof-008-anarchie"

rnd = random.Random(8)

# Geometrie im 1000er-Raster: Ring, A mit überstehender Spitze, Querbalken über den Ring hinaus
RING = (500, 535, 320)
A = [(500, 95), (235, 905), (765, 905)]
BAR = [(110, 625), (890, 590)]
W = 74


def along_line(p, q, n):
    return [(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t) for t in (rnd.random() for _ in range(n))]


def along_ring(n):
    cx, cy, r = RING
    return [(cx + r * math.cos(a), cy + r * math.sin(a)) for a in (rnd.uniform(0, 2 * math.pi) for _ in range(n))]


def overspray(points):
    dots = []
    for x, y in points:
        d = abs(rnd.gauss(0, 34)) + W / 2
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(.8, 3.2) if d < W else rnd.uniform(.6, 1.8)
        o = max(.15, 1 - (d - W / 2) / 90)
        dots.append(f'<circle cx="{x + d * math.cos(a):.1f}" cy="{y + d * math.sin(a):.1f}" r="{r:.1f}" opacity="{o:.2f}"/>')
    return dots


def drip(x, y, length, width):
    return (f'<path d="M{x - width / 2:.1f} {y:.1f} v{length:.1f} a{width / 2:.1f} {width / 2:.1f} 0 0 0 {width:.1f} 0 '
            f'v{-length:.1f} z"/><circle cx="{x:.1f}" cy="{y + length + width * .35:.1f}" r="{width * .62:.1f}"/>')


pts = along_ring(1600) + along_line(A[0], A[1], 900) + along_line(A[0], A[2], 900) + along_line(*BAR, 1100)
drips = [drip(150, 640, 120, 13), drip(862, 615, 75, 10), drip(560, 875, 95, 12), drip(250, 890, 85, 11), drip(752, 890, 150, 13)]

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 1000 1000">
  <defs>
    <filter id="spray" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="3" result="wob"/>
      <feDisplacementMap in="SourceGraphic" in2="wob" scale="16" result="a"/>
      <feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="5" result="grain"/>
      <feDisplacementMap in="a" in2="grain" scale="7"/>
    </filter>
  </defs>
  <g fill="{RED}" stroke="none">
    <g filter="url(#spray)">
      <g fill="none" stroke="{RED}" stroke-width="{W}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">
        <circle cx="{RING[0]}" cy="{RING[1]}" r="{RING[2]}"/>
        <path d="M{A[1][0]} {A[1][1]} L{A[0][0]} {A[0][1]} L{A[2][0]} {A[2][1]}"/>
        <path d="M{BAR[0][0]} {BAR[0][1]} L{BAR[1][0]} {BAR[1][1]}" stroke-width="{W - 8}"/>
      </g>
      {"".join(drips)}
    </g>
    {"".join(overspray(pts))}
  </g>
</svg>'''

svg_path = OUT.with_suffix(".svg")
svg_path.write_text(svg, encoding="utf-8")
png = OUT.with_suffix(".png")
subprocess.run([str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={SIZE},{SIZE}",
                "--default-background-color=00000000", f"--screenshot={png}", svg_path.as_uri()],
               check=True, capture_output=True, timeout=120)
svg_path.unlink()

# Ränder knapp beschneiden, dann Druck-PNG und Web-Vorschau
im = Image.open(png).convert("RGBA")
x0, y0, x1, y1 = im.getbbox()
pad = 40
im = im.crop((max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad, im.width), min(y1 + pad, im.height)))
im.save(png, optimize=True)
prev = im.copy()
prev.thumbnail((1024, 1024), Image.LANCZOS)
prev.save(OUT.parent / f"{OUT.name}-1024.webp", quality=88, method=6)
print(f"{png.name}: {im.width} x {im.height}, {png.stat().st_size // 1024} KB")
