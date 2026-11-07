"""Quelle FOF: von Hand gepflegte Termine aus tools/konzerte/eigene.json."""
import json
import re
from datetime import date

from tools.konzerte.modell import Termin
from tools.konzerte.ortstabelle import normalisiere

ZEIT = re.compile(r"^\d{2}:\d{2}$")


def _kurz(text):
    return re.sub(r"[^a-z0-9]+", "-", normalisiere(text)).strip("-")


def lese_eigene(pfad):
    """Liest die Datei und gibt Termine zurück. Ein kaputter Eintrag löst ValueError aus
    (dann behält abholen die Termine vom letzten Lauf), eine leere Liste ist erlaubt."""
    with open(pfad, encoding="utf-8") as f:
        daten = json.load(f)
    termine = []
    for nr, e in enumerate(daten.get("termine", []), 1):
        for feld in ("datum", "bands", "laden", "stadt"):
            if not str(e.get(feld) or "").strip():
                raise ValueError(f"Eintrag {nr}: {feld} fehlt")
        date.fromisoformat(e["datum"])  # ValueError bei falschem Datum
        zeit = e.get("zeit") or None
        if zeit is not None and not ZEIT.match(zeit):
            raise ValueError(f"Eintrag {nr}: zeit muss HH:MM sein")
        links = []
        for url in e.get("links", []):
            if not str(url).startswith(("https://", "http://")):
                raise ValueError(f"Eintrag {nr}: Link ohne http(s): {url}")
            links.append({"quelle": "fof", "url": url})
        lat, lon = e.get("lat"), e.get("lon")
        hat_ort = lat is not None and lon is not None
        termine.append(Termin(
            id=f"fof-{e['datum']}-{_kurz(e['bands'])}-{_kurz(e['stadt'])}",
            quelle="fof", datum=e["datum"], zeit=zeit,
            bands=e["bands"].strip(), zusatz=(e.get("zusatz") or "").strip(),
            laden=e["laden"].strip(), plz=e.get("plz"), stadt=e["stadt"].strip(),
            land=e.get("land") or "DE",
            lat=float(lat) if hat_ort else None, lon=float(lon) if hat_ort else None, genau=hat_ort,
            genres=list(e.get("genres") or []), frei=bool(e.get("frei")), links=links))
    return termine
