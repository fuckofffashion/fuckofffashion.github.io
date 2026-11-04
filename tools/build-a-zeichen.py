"""Vektorisiert das eingekreiste Anarchie-A aus Motiv 007 „Skate or Die“.

Aufruf:  python tools/build-a-zeichen.py
Liest    assets/img/fof-007-skate-or-die-schwarz.png (Alphakanal = Druckfarbe)
Schreibt assets/img/anarchie-a.svg        – volle Fassung mit den weißen Stichen als Aussparung (evenodd)
         assets/img/anarchie-a-klein.svg  – Fassung für ≤ 32 px (Kopf-Logo, Favicon, Kartenmarker):
                                            Stiche zu, Strich etwas kräftiger, weniger Knoten
und gibt die Länge der Pfade aus. Beide nutzen dasselbe Raster (viewBox), sind also austauschbar.

Das A ist im Motiv eine eigene zusammenhängende Fläche; die Schrift SKATE / OR DIE
besteht aus getrennten Flächen und fällt beim Freistellen weg.
Benötigt: Pillow, numpy, potracer (Modul `potrace`).
"""
from collections import deque
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageFilter

SITE = Path(__file__).resolve().parent.parent
QUELLE = SITE / "assets" / "img" / "fof-007-skate-or-die-schwarz.png"
ZIEL = SITE / "assets" / "img" / "anarchie-a.svg"
ZIEL_KLEIN = SITE / "assets" / "img" / "anarchie-a-klein.svg"
SAAT_ZEILE = 450        # auf dieser Höhe liegt nur das A (Ring links) – keine Schrift
RAND = 2                # Luft um die Form in Quellpixeln
STICH_MAX = 150         # Löcher unter dieser Fläche (Pixel²) sind Stiche, keine Innenflächen von A und Ring
# Hochskalieren vor dem Tracen bringt hier nichts: das Motiv ist schon gerastert, potrace glättet selbst,
# und die Treppen der Vergrößerung verdreifachen nur den Pfad.


def flaeche_mit_saat(maske, saat):
    """Zusammenhängende Fläche (8er-Nachbarschaft) um das Saatpixel – Breitensuche ohne scipy."""
    h, w = maske.shape
    drin = np.zeros_like(maske)
    q = deque([saat])
    drin[saat] = True
    while q:
        y, x = q.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and maske[ny, nx] and not drin[ny, nx]:
                    drin[ny, nx] = True
                    q.append((ny, nx))
    return drin


def zahl(v):
    s = f"{v:.0f}"
    return "0" if s == "-0" else s


def pfad(kurven, ox, oy, nur_aussen=False):
    """potrace-Kurven als kompakter SVG-Pfad mit relativen, ganzzahligen Koordinaten.
    Gerundet wird auf absoluten Punkten, die Deltas daraus – so läuft kein Fehler auf."""
    teile = []
    for k in kurven:
        if nur_aussen and not k._path.sign and abs(k._path.area) < STICH_MAX:
            continue  # übrig gebliebener Stich: zu
        p = lambda pt: (round(pt.x - ox), round(pt.y - oy))
        cx, cy = p(k.start_point)
        teile.append(f"M{zahl(cx)} {zahl(cy)}")
        for s in k.segments:
            if s.is_corner:
                (ax, ay), (bx, by) = p(s.c), p(s.end_point)
                teile.append(f"l{zahl(ax - cx)} {zahl(ay - cy)} {zahl(bx - ax)} {zahl(by - ay)}")
            else:
                (ax, ay), (bx, by), (ex, ey) = p(s.c1), p(s.c2), p(s.end_point)
                teile.append(f"c{zahl(ax - cx)} {zahl(ay - cy)} {zahl(bx - cx)} {zahl(by - cy)} {zahl(ex - cx)} {zahl(ey - cy)}")
                bx, by = ex, ey
            cx, cy = bx, by
        teile.append("z")
    d = "".join(teile)
    # Minuszeichen trennen selbst: "c3 -4" -> "c3-4"
    return d.replace(" -", "-")


def svg(d, vb):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb[0]} {vb[1]}">'
            f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/></svg>\n')


def main():
    alpha = Image.open(QUELLE).getchannel("A")
    a = np.array(alpha) > 127
    form = flaeche_mit_saat(a, (SAAT_ZEILE, int(np.argmax(a[SAAT_ZEILE]))))
    ys, xs = np.nonzero(form)
    y0, y1, x0, x1 = ys.min() - RAND, ys.max() + 1 + RAND, xs.min() - RAND, xs.max() + 1 + RAND
    # Nur die A-Fläche behalten, die weichen Kanten aus dem Alphakanal aber mitnehmen
    weich = np.array(alpha, dtype=np.uint8)
    nah = np.array(Image.fromarray(form.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
    weich = np.where(nah, weich, 0)[y0:y1, x0:x1]
    vb = (x1 - x0, y1 - y0)  # Raster: Quellpixel, viewBox ab 0

    voll = weich > 127
    kurven = potrace.Bitmap(~voll).trace(turdsize=4, alphamax=1.0, opttolerance=0.4)
    d_voll = pfad(kurven, 0, 0)

    # Klein: Stiche schließen (erst weiten, dann schrumpfen), dann um 1 px verstärken,
    # weichzeichnen und neu schwellen – glatte Kante, deutlich weniger Knoten
    m = Image.fromarray(voll.astype(np.uint8) * 255)
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(3))
    klein = np.array(m.filter(ImageFilter.GaussianBlur(1.5))) > 127
    kurven_k = potrace.Bitmap(~klein).trace(turdsize=40, alphamax=1.2, opttolerance=1.0)
    d_klein = pfad(kurven_k, 0, 0, nur_aussen=True)

    ZIEL.write_text(svg(d_voll, vb), encoding="utf-8")
    ZIEL_KLEIN.write_text(svg(d_klein, vb), encoding="utf-8")
    print(f"viewBox 0 0 {vb[0]} {vb[1]}  (Ausschnitt x {x0}-{x1}, y {y0}-{y1} im Motiv)")
    print(f"{ZIEL.name}: Pfad {len(d_voll)} Zeichen, {len(kurven)} Teilpfade, Datei {ZIEL.stat().st_size} Byte")
    print(f"{ZIEL_KLEIN.name}: Pfad {len(d_klein)} Zeichen, Datei {ZIEL_KLEIN.stat().st_size} Byte")


if __name__ == "__main__":
    main()
