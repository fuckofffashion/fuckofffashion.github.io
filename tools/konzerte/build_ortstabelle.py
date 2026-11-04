"""Baut data/orte-tabelle.json aus den GeoNames-Postleitzahl-Dumps (DE, NL, BE).

Lizenz: GeoNames, Creative Commons Attribution 4.0 (siehe readme.txt im Download).
Aufruf: python -m tools.konzerte.build_ortstabelle [--nur-aliase]
"""
import io
import json
import math
import os
import sys
import urllib.request
import zipfile

from tools.konzerte.ortstabelle import basisform, normalisiere

LAENDER = ("DE", "NL", "BE")
URL = "https://download.geonames.org/export/zip/{}.zip"
URL_STAEDTE = "https://download.geonames.org/export/dump/cities1000.zip"  # ebenfalls CC BY 4.0
RADIUS_KM = 15

# Gängige Ortsnamen, die GeoNames nicht führt: (Land, Alias) -> amtlicher Name in der Tabelle.
ALIASE = {
    ("NL", "Den Haag"): "'s-Gravenhage",
    ("NL", "The Hague"): "'s-Gravenhage",
    ("NL", "Den Bosch"): "'s-Hertogenbosch",
    ("BE", "Brussel"): "Bruxelles",
    ("BE", "Brussels"): "Bruxelles",
    ("BE", "Brüssel"): "Bruxelles",
    ("BE", "Antwerp"): "Antwerpen",
    ("BE", "Bruges"): "Brugge",
    ("BE", "Ghent"): "Gent",
    ("BE", "Gand"): "Gent",
    ("BE", "Lüttich"): "Liège",
    ("BE", "Luik"): "Liège",
    ("BE", "Liege"): "Liège",
    ("BE", "Löwen"): "Leuven",
    ("BE", "Louvain"): "Leuven",
    ("DE", "Cologne"): "Köln",
    ("DE", "Munich"): "München",
    ("DE", "Nuremberg"): "Nürnberg",
}
AUSGABE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "orte-tabelle.json")


def lese_zip(land, daten):
    """Liefert [(land, plz, name, lat, lon)] mit je (plz, name) einem gemittelten Eintrag."""
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        text = z.read(land + ".txt").decode("utf-8")
    summen = {}
    for zeile in text.splitlines():
        s = zeile.split("\t")
        if len(s) < 11:
            continue
        plz, name = s[1].strip(), s[2].strip()
        if land == "NL":
            plz = plz[:4]  # nur PC4
        if not plz or not name:
            continue
        try:
            lat, lon = float(s[9]), float(s[10])
        except ValueError:
            continue
        eintrag = summen.setdefault((plz, name), [0.0, 0.0, 0])
        eintrag[0] += lat
        eintrag[1] += lon
        eintrag[2] += 1
    return [
        [land, plz, name, round(a / n, 3), round(b / n, 3)]
        for (plz, name), (a, b, n) in sorted(summen.items())
    ]


def lese_staedte(daten):
    """cities1000: {(land, normalisierter Name): [(lat, lon, einwohner)]} (Name, ASCII-Name, Alternativnamen)."""
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        text = z.read("cities1000.txt").decode("utf-8")
    index = {}
    for zeile in text.splitlines():
        s = zeile.split("	")
        if len(s) < 15 or s[8] not in LAENDER:
            continue
        try:
            eintrag = (float(s[4]), float(s[5]), int(s[14] or 0))
        except ValueError:
            continue
        namen = {s[1], s[2], *s[3].split(",")}
        for n in {normalisiere(x) for x in namen if x}:
            index.setdefault((s[8], n), []).append(eintrag)
    return index


def _km(lat1, lon1, lat2, lon2):
    dx = (lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
    return 111.2 * math.hypot(lat2 - lat1, dx)


def einwohner(zeile, staedte):
    """Einwohner des gleichnamigen cities1000-Orts im selben Land innerhalb 15 km, sonst 0."""
    land, _, name, lat, lon = zeile[:5]
    beste = 0
    for n in {normalisiere(name), normalisiere(basisform(name))}:
        for slat, slon, pop in staedte.get((land, n), ()):
            if pop > beste and _km(lat, lon, slat, slon) <= RADIUS_KM:
                beste = pop
    return beste


def wende_aliase_an(orte, aliase=None):
    """Hängt je Alias eine Zeile an: Kopie der Zielzeile mit den meisten Einwohnern (Gleichstand: erste),
    nur der Name ist der Alias. Existiert der Alias (normalisiert) im Land schon, wird er übersprungen.
    Fehlt das Ziel, wird eine Ausnahme geworfen (sonst bliebe Datendrift unbemerkt). Ändert `orte` in place."""
    for (land, alias), ziel in (ALIASE if aliase is None else aliase).items():
        vorhandene = {normalisiere(z[2]) for z in orte if z[0] == land}
        if normalisiere(alias) in vorhandene:
            continue
        kandidaten = [z for z in orte if z[0] == land and z[2] == ziel]
        if not kandidaten:
            raise ValueError("Alias-Ziel fehlt in der Ortstabelle: %s %s (für %s)" % (land, ziel, alias))
        beste = kandidaten[0]
        for z in kandidaten[1:]:
            if (z[5] if len(z) > 5 else 0) > (beste[5] if len(beste) > 5 else 0):
                beste = z
        orte.append([beste[0], beste[1], alias, *beste[3:]])
    return orte


def schreibe(orte, pfad):
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    with open(pfad, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"quelle": "GeoNames (CC BY 4.0)", "orte": orte}, f, ensure_ascii=False, separators=(",", ":"))
    print(pfad, os.path.getsize(pfad), "Bytes")


def nur_aliase():
    """Wendet die Aliasse auf die vorhandene Tabelle an (idempotent, ohne Download)."""
    pfad = os.path.normpath(AUSGABE)
    with open(pfad, encoding="utf-8") as f:
        daten = json.load(f)
    vorher = len(daten["orte"])
    wende_aliase_an(daten["orte"])
    print(len(daten["orte"]) - vorher, "Aliasse ergänzt")
    schreibe(daten["orte"], pfad)


def hole(url):
    anfrage = urllib.request.Request(url, headers={"User-Agent": "FuckOffFashion-Konzerte/1.0"})
    with urllib.request.urlopen(anfrage, timeout=120) as antwort:
        return antwort.read()


def main():
    if "--nur-aliase" in sys.argv[1:]:
        nur_aliase()
        return
    staedte = lese_staedte(hole(URL_STAEDTE))
    orte = []
    for land in LAENDER:
        zeilen = lese_zip(land, hole(URL.format(land)))
        for z in zeilen:
            z.append(einwohner(z, staedte))
        print(land, len(zeilen), "Einträge")
        orte.extend(zeilen)
    wende_aliase_an(orte)
    schreibe(orte, os.path.normpath(AUSGABE))


if __name__ == "__main__":
    main()
