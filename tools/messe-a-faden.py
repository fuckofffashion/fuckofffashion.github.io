"""Misst die Mittellinien (das Skelett) des Anarchie-A aus Motiv 007 für den roten Faden (js/faden.js).

Aufruf:  python tools/messe-a-faden.py [--bild <png>]
Liest    assets/img/fof-007-skate-or-die-schwarz.png und stellt das A genau wie
         tools/build-a-zeichen.py frei. Die Koordinaten liegen darum im Raster von
         assets/img/anarchie-a.svg (viewBox 0 0 626 541).
Gibt aus Ring (Mitte, Radius), die beiden Beine und den Querbalken als Strecken
         (Anfang/Ende der Mittellinie) – das sind die Zahlen in `A_SKELETT` in js/faden.js.
--bild   legt das Skelett zur Kontrolle rot über das freigestellte A.

So wird gemessen:
- Die Stiche (weiße Nähte) werden geschlossen, damit jeder Strich eine volle Fläche ist.
- Ring: Strahlen ab einer groben Mitte, je 2°. Die Mitte des Farbbands auf dem Strahl ist ein
  Punkt der Mittellinie. Ein Kreis wird hineingelegt; Punkte, die auf Beinen oder Balken liegen,
  fallen als Ausreißer heraus. Ein achsparalleles Ellipsen-Fit prüft die Rundheit.
- Beine: Zeilenweise die Mitte jedes Farblaufs innerhalb des Rings (ohne Ring und Balken),
  getrennt nach links und rechts der Ringmitte, dann je eine Gerade (Hauptachse, robust).
- Balken: dasselbe spaltenweise in der Balkenhöhe.
- Enden: alle Farbpixel nahe der Geraden auf die Gerade projiziert, äußerstes Pixel minus
  ENDE_EIN (der Pinsel endet ausgefranst; die Fadenmitte soll nicht bis an die letzte Faser reichen).
Benötigt: Pillow, numpy.
"""
import argparse
import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SITE = Path(__file__).resolve().parent.parent
ENDE_EIN = 10   # Quellpixel, um die die Fadenenden hinter dem äußersten Pinselpixel bleiben

# Freistellen wie beim Zeichen selbst – dieselbe Saat, derselbe Ausschnitt
_spec = importlib.util.spec_from_file_location("a_zeichen", SITE / "tools" / "build-a-zeichen.py")
A_ZEICHEN = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A_ZEICHEN)


def maske():
    alpha = Image.open(A_ZEICHEN.QUELLE).getchannel("A")
    a = np.array(alpha) > 127
    zeile = A_ZEICHEN.SAAT_ZEILE
    form = A_ZEICHEN.flaeche_mit_saat(a, (zeile, int(np.argmax(a[zeile]))))
    ys, xs = np.nonzero(form)
    r = A_ZEICHEN.RAND
    y0, y1, x0, x1 = ys.min() - r, ys.max() + 1 + r, xs.min() - r, xs.max() + 1 + r
    zu = Image.fromarray(form.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    return np.array(zu)[y0:y1, x0:x1] > 127


def laeufe(reihe):
    d = np.diff(np.concatenate([[0], reihe.astype(int), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1))


def kreis(p):
    a = np.c_[2 * p[:, 0], 2 * p[:, 1], np.ones(len(p))]
    c = np.linalg.lstsq(a, (p ** 2).sum(1), rcond=None)[0]
    return c[0], c[1], np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2)


def gerade(p):
    """robuste Hauptachse: Mitte, Richtung"""
    p = np.asarray(p, float)
    for _ in range(4):
        c = p.mean(0)
        d = np.linalg.svd(p - c)[2][0]
        abst = np.abs((p - c) @ np.array([-d[1], d[0]]))
        p = p[abst < max(6, 2.5 * np.median(abst))]
    c = p.mean(0)
    return c, np.linalg.svd(p - c)[2][0]


def messen(m):
    h, w = m.shape
    # Ring
    gx, gy = w / 2, h * .52
    pkt = []
    for grad in range(0, 360, 2):
        t = np.radians(grad)
        prof = []
        for r in range(150, 300):
            x, y = int(round(gx + r * np.cos(t))), int(round(gy + r * np.sin(t)))
            prof.append(0 <= x < w and 0 <= y < h and m[y, x])
        band = [(s, e) for s, e in laeufe(np.array(prof)) if 12 <= e - s <= 45]
        if band:
            s, e = band[-1]
            pkt.append((gx + (150 + (s + e) / 2) * np.cos(t), gy + (150 + (s + e) / 2) * np.sin(t)))
    p = np.array(pkt)
    for _ in range(3):
        cx, cy, r = kreis(p)
        abw = np.abs(np.hypot(p[:, 0] - cx, p[:, 1] - cy) - r)
        p = p[abw < max(4, 2.5 * np.median(abw))]
    cx, cy, r = kreis(p)
    e = np.linalg.lstsq(np.c_[p[:, 0] ** 2, p[:, 1] ** 2, p[:, 0], p[:, 1]], np.ones(len(p)), rcond=None)[0]
    k = 1 + e[2] ** 2 / (4 * e[0]) + e[3] ** 2 / (4 * e[1])
    rx, ry = np.sqrt(k / e[0]), np.sqrt(k / e[1])

    am_ring = lambda x, y: abs(np.hypot(x - cx, y - cy) - r) < 30
    # Beine
    links, rechts = [], []
    for y in range(int(cy - r * .7), h):
        for s, e_ in laeufe(m[y]):
            mx = (s + e_) / 2
            if not 14 <= e_ - s <= 60 or am_ring(mx, y) or (abs(y - cy) < r * .35 and e_ - s > 45):
                continue
            (links if mx < cx else rechts).append((mx, y))
    # Balken
    balken = []
    for x in range(w):
        for s, e_ in laeufe(m[:, x]):
            my = (s + e_) / 2
            if abs(my - cy) < r * .35 and 14 <= e_ - s <= 50 and not am_ring(x, my):
                balken.append((x, my))

    yy, xx = np.nonzero(m)

    def strecke(c, d):
        if (abs(d[1]) > abs(d[0]) and d[1] < 0) or (abs(d[1]) <= abs(d[0]) and d[0] < 0):
            d = -d  # Beine von oben nach unten, Balken von links nach rechts
        rel = np.c_[xx - c[0], yy - c[1]]
        nah = np.abs(rel @ np.array([-d[1], d[0]])) < 8
        lang = rel[nah] @ d
        return c + (lang.min() + ENDE_EIN) * d, c + (lang.max() - ENDE_EIN) * d

    return {
        "ring": (cx, cy, r), "ellipse": (rx, ry),
        "bein_l": strecke(*gerade(links)), "bein_r": strecke(*gerade(rechts)), "balken": strecke(*gerade(balken)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bild")
    arg = ap.parse_args()
    m = messen(mk := maske())
    f = lambda v: f"{v:.0f}"
    cx, cy, r = m["ring"]
    print(f"Raster {mk.shape[1]} x {mk.shape[0]} (wie anarchie-a.svg)")
    print(f"Ring  Mitte {cx:.1f} {cy:.1f}  r {r:.1f}  (Ellipse rx {m['ellipse'][0]:.1f}, ry {m['ellipse'][1]:.1f})")
    for n in ("bein_l", "bein_r", "balken"):
        (ax, ay), (bx, by) = m[n]
        print(f"{n:7s} {ax:.1f} {ay:.1f} -> {bx:.1f} {by:.1f}  ({np.degrees(np.arctan2(by - ay, bx - ax)):.1f}°)")
    print("\nfür js/faden.js:")
    (l0, l1), (r0, r1), (b0, b1) = m["bein_l"], m["bein_r"], m["balken"]
    print(f"  ring: [{f(cx)}, {f(cy)}, {f(r)}],")
    print(f"  beinL: [[{f(l0[0])}, {f(l0[1])}], [{f(l1[0])}, {f(l1[1])}]],")
    print(f"  beinR: [[{f(r0[0])}, {f(r0[1])}], [{f(r1[0])}, {f(r1[1])}]],")
    print(f"  balken: [[{f(b0[0])}, {f(b0[1])}], [{f(b1[0])}, {f(b1[1])}]],")
    if arg.bild:
        im = Image.fromarray(np.where(mk, 60, 255).astype(np.uint8)).convert("RGB")
        g = ImageDraw.Draw(im)
        g.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 0, 0), width=3)
        for n in ("bein_l", "bein_r", "balken"):
            g.line([tuple(m[n][0]), tuple(m[n][1])], fill=(255, 0, 0), width=3)
        im.save(arg.bild)
        print("Kontrollbild:", arg.bild)


if __name__ == "__main__":
    main()
