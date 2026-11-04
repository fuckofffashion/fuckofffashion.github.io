"""Baut data/karte.json: Länderumrisse, Regionenlinien und Großstädte aus Natural Earth.

Läuft einmalig beim Bauen (nicht im Browser). Nur Standardbibliothek.
Aufruf: python -m tools.konzerte.build_karte
"""
import json
import os
import tempfile
import urllib.request

NE_TAG = "v5.1.2"
NE_URL = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
          "%s/geojson/%s.geojson")
DATEIEN = ("ne_10m_admin_0_countries", "ne_10m_admin_1_states_provinces_lines",
           "ne_10m_populated_places")

BBOX = [2.3, 49.3, 15.3, 55.2]
TOLERANZ = 0.01
STELLEN = 3
MIN_EINWOHNER = 200000
TIMEOUT = 120

LAENDER = {"DE": "DEU", "NL": "NLD", "BE": "BEL", "LU": "LUX"}
STAEDTE_LAENDER = {"DEU", "NLD", "BEL"}

AUSGABE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "..", "data", "karte.json")


def runden(punkt, stellen=STELLEN):
    """[lon, lat] auf feste Nachkommastellen runden."""
    return [round(punkt[0], stellen), round(punkt[1], stellen)]


def _abstand(p, a, b):
    """Abstand des Punkts p von der Strecke a-b (in Grad, planar)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return ((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2) ** 0.5
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return ((p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2) ** 0.5


def douglas_peucker(punkte, toleranz=TOLERANZ):
    """Linie vereinfachen (iterativ, ohne Rekursionstiefe). Endpunkte bleiben."""
    n = len(punkte)
    if n < 3:
        return [list(p) for p in punkte]
    behalten = [False] * n
    behalten[0] = behalten[-1] = True
    stapel = [(0, n - 1)]
    while stapel:
        i, j = stapel.pop()
        maxd, idx = 0.0, -1
        for k in range(i + 1, j):
            d = _abstand(punkte[k], punkte[i], punkte[j])
            if d > maxd:
                maxd, idx = d, k
        if idx != -1 and maxd > toleranz:
            behalten[idx] = True
            stapel.append((i, idx))
            stapel.append((idx, j))
    return [list(p) for p, b in zip(punkte, behalten) if b]


def vereinfachen(linie):
    """Douglas-Peucker, dann runden, dann aufeinanderfolgende Duplikate entfernen."""
    aus = []
    for p in douglas_peucker(linie):
        r = runden(p)
        if not aus or aus[-1] != r:
            aus.append(r)
    return aus


def im_bbox(punkt):
    return BBOX[0] <= punkt[0] <= BBOX[2] and BBOX[1] <= punkt[1] <= BBOX[3]


def ring_vereinfachen(ring):
    """Ring vereinfachen; None, wenn außerhalb der Karte oder zu klein (< 4 Punkte)."""
    if not any(im_bbox(p) for p in ring):
        return None
    r = vereinfachen(ring)
    if len(r) < 4:
        return None
    return r


def herunterladen(name, ordner):
    url = NE_URL % (NE_TAG, name)
    ziel = os.path.join(ordner, name + ".geojson")
    print("Lade %s ..." % url, flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": "FuckOffFashion-Konzerte/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as antwort, open(ziel, "wb") as f:
        gesamt = 0
        while True:
            block = antwort.read(1 << 20)
            if not block:
                break
            f.write(block)
            gesamt += len(block)
    print("  %.1f MB geladen" % (gesamt / 1e6), flush=True)
    with open(ziel, encoding="utf-8") as f:
        return json.load(f)


def _eig(props, *namen):
    """Eigenschaft unabhängig von Groß-/Kleinschreibung des Feldnamens lesen."""
    klein = {k.lower(): v for k, v in props.items()}
    for n in namen:
        v = klein.get(n.lower())
        if v not in (None, "", "-99", -99):
            return v
    return None


def land_iso(props):
    """ISO-A2 des Features; bei "-99" auf ADM0_A3/ISO_A3 zurückfallen."""
    a2 = _eig(props, "ISO_A2")
    if a2 in LAENDER:
        return a2
    a3 = _eig(props, "ADM0_A3", "ISO_A3")
    for iso, drei in LAENDER.items():
        if a3 == drei:
            return iso
    return None


def laender_bauen(geo):
    gefunden = {}
    for feat in geo["features"]:
        iso = land_iso(feat["properties"])
        if not iso:
            continue
        g = feat["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        ringe = gefunden.setdefault(iso, [])
        for poly in polys:
            for ring in poly[:1]:  # nur Außenring; Löcher braucht die Karte nicht
                r = ring_vereinfachen(ring)
                if r:
                    ringe.append(r)
    return [{"iso": iso, "ringe": gefunden[iso]} for iso in LAENDER if iso in gefunden]


def regionen_bauen(geo):
    linien = []
    for feat in geo["features"]:
        if _eig(feat["properties"], "adm0_a3") not in STAEDTE_LAENDER:
            continue
        g = feat["geometry"]
        teile = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
        for teil in teile:
            if not any(im_bbox(p) for p in teil):
                continue
            l = vereinfachen(teil)
            if len(l) >= 2:
                linien.append(l)
    return linien


def staedte_bauen(geo):
    liste = []
    for feat in geo["features"]:
        p = feat["properties"]
        if _eig(p, "ADM0_A3") not in STAEDTE_LAENDER:
            continue
        if (_eig(p, "POP_MAX") or 0) < MIN_EINWOHNER:
            continue
        name = _eig(p, "NAME_DE") or _eig(p, "NAME")
        lon, lat = feat["geometry"]["coordinates"][:2]
        liste.append({"name": name, "lat": round(lat, STELLEN), "lon": round(lon, STELLEN)})
    liste.sort(key=lambda s: s["name"])
    return liste


def main():
    with tempfile.TemporaryDirectory(prefix="karte_") as tmp:
        laender, linien, orte = (herunterladen(n, tmp) for n in DATEIEN)
    daten = {
        "ne_tag": NE_TAG,
        "bbox": BBOX,
        "laender": laender_bauen(laender),
        "regionen": regionen_bauen(linien),
        "staedte": staedte_bauen(orte),
        "quelle": "Natural Earth (gemeinfrei)",
    }
    pfad = os.path.normpath(AUSGABE)
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    with open(pfad, "w", encoding="utf-8") as f:
        json.dump(daten, f, separators=(",", ":"), ensure_ascii=False)
    print("Geschrieben: %s (%d Bytes, %d Länder, %d Regionenlinien, %d Städte)" % (
        pfad.replace(os.sep, "/"), os.path.getsize(pfad), len(daten["laender"]),
        len(daten["regionen"]), len(daten["staedte"])))


if __name__ == "__main__":
    main()
