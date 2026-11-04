"""Baut data/orte-tabelle.json aus den GeoNames-Postleitzahl-Dumps (DE, NL, BE).

Lizenz: GeoNames, Creative Commons Attribution 4.0 (siehe readme.txt im Download).
Aufruf: python -m tools.konzerte.build_ortstabelle
"""
import io
import json
import os
import urllib.request
import zipfile

LAENDER = ("DE", "NL", "BE")
URL = "https://download.geonames.org/export/zip/{}.zip"
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


def main():
    orte = []
    for land in LAENDER:
        anfrage = urllib.request.Request(URL.format(land), headers={"User-Agent": "FuckOffFashion-Konzerte/1.0"})
        with urllib.request.urlopen(anfrage, timeout=60) as antwort:
            zeilen = lese_zip(land, antwort.read())
        print(land, len(zeilen), "Einträge")
        orte.extend(zeilen)
    pfad = os.path.normpath(AUSGABE)
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    with open(pfad, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"quelle": "GeoNames (CC BY 4.0)", "orte": orte}, f, ensure_ascii=False, separators=(",", ":"))
    print(pfad, os.path.getsize(pfad), "Bytes")


if __name__ == "__main__":
    main()
