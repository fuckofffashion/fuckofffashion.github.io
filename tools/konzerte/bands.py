"""Bandseite: Termine aus data/konzerte.json den Bands aus tools/bands.json zuordnen.

Aufruf: python -m tools.konzerte.bands [--konzerte data/konzerte.json] [--liste tools/bands.json]
                                       [--ziel data/bands.json] [--heute YYYY-MM-DD]

Zugeordnet wird standardmäßig nur über das Feld "bands" eines Termins; der Freitext "zusatz"
zählt nur bei Bands mit "auch_zusatz": true. Ein falscher Termin an einer Band ist schlimmer
als ein fehlender.
"""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

from tools.konzerte.ortstabelle import normalisiere

PFLICHT = ("id", "name", "logo", "logo_quelle", "web")
ID_MUSTER = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def schluessel(text: str) -> str:
    """Vergleichsform: klein, ohne Akzente, nur Buchstaben/Ziffern, Wörter durch ein Leerzeichen getrennt."""
    text = re.sub(r"[^a-z0-9 ]+", " ", normalisiere(text or ""))
    return re.sub(r" +", " ", text).strip()


def lade_bands(pfad) -> list[dict]:
    with open(pfad, encoding="utf-8") as f:
        liste = json.load(f).get("bands", [])
    gesehen = set()
    for nr, e in enumerate(liste, 1):
        wer = e.get("name") or f"Eintrag {nr}"
        for feld in PFLICHT:
            if not str(e.get(feld) or "").strip():
                raise ValueError(f"{wer}: {feld} fehlt")
        if not ID_MUSTER.match(e["id"]):
            raise ValueError(f"{wer}: id {e['id']!r} ist kein Kurzname (a-z, 0-9, Bindestrich)")
        if e["id"] in gesehen:
            raise ValueError(f"{wer}: id {e['id']!r} doppelt")
        gesehen.add(e["id"])
    return liste


def _enthaelt(heuhaufen: str, nadel: str) -> bool:
    return bool(nadel) and f" {nadel} " in f" {heuhaufen} "


def _passt(band: dict, t: dict) -> bool:
    woerter = [schluessel(w) for w in [band["name"], *band.get("schreibweisen", [])]]
    felder = [t.get("bands", "")] + ([t.get("zusatz") or ""] if band.get("auch_zusatz") else [])
    if not any(_enthaelt(schluessel(f), w) for f in felder for w in woerter):
        return False
    ganz = schluessel(f"{t.get('bands', '')} {t.get('zusatz') or ''}")
    return not any(_enthaelt(ganz, schluessel(m)) for m in band.get("nicht", []))


def ordne_zu(bands: list[dict], termine: list[dict], heute: str) -> dict:
    ergebnis = {}
    for band in bands:
        gefunden, gesehen = [], set()
        for t in termine:
            if t["datum"] < heute or not _passt(band, t):
                continue
            kennung = (t["datum"], schluessel(t.get("laden", "")))
            if kennung in gesehen:
                continue
            gesehen.add(kennung)
            gefunden.append({"datum": t["datum"], "zeit": t.get("zeit"), "laden": t.get("laden", ""),
                             "stadt": t.get("stadt", "")})
        gefunden.sort(key=lambda x: (x["datum"], x["zeit"] or "", x["stadt"]))
        ergebnis[band["id"]] = {"anzahl": len(gefunden), "termine": gefunden}
    return {"heute": heute, "bands": ergebnis}


def berechne(konzerte_pfad, liste_pfad, heute: str) -> dict:
    with open(konzerte_pfad, encoding="utf-8") as f:
        konzerte = json.load(f)
    daten = ordne_zu(lade_bands(liste_pfad), konzerte.get("termine", []), heute)
    return {"stand": konzerte.get("stand"), **daten}


def schreibe(pfad, daten: dict) -> None:
    pfad = Path(pfad)
    tmp = pfad.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(daten, f, ensure_ascii=False, separators=(",", ":"))
    tmp.replace(pfad)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="bands", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--konzerte", default="data/konzerte.json")
    p.add_argument("--liste", default="tools/bands.json")
    p.add_argument("--ziel", default="data/bands.json")
    p.add_argument("--heute")
    args = p.parse_args(argv)
    heute = args.heute or date.today().isoformat()
    daten = berechne(args.konzerte, args.liste, heute)
    schreibe(args.ziel, daten)
    for bid, e in daten["bands"].items():
        print(f"{bid}: {e['anzahl']} Termine")
    return 0


if __name__ == "__main__":
    sys.exit(main())
