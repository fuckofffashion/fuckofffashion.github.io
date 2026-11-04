"""Dubletten zwischen KNOX und Radar zusammenführen."""
import re
from dataclasses import replace

from tools.konzerte.ortstabelle import normalisiere, stadtschluessel

STOPPWOERTER = {"the", "and", "und", "support", "special", "guests"}  # "+" und "&" fallen beim Teilen weg
MIN_JACCARD = 0.5


def wortmenge(bands):
    woerter = re.split(r"\W+", normalisiere(bands))
    return {w for w in woerter if w and w not in STOPPWOERTER}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _vereine(knox, radar):
    links, gesehen = [], set()
    for l in knox.links + radar.links:
        if l.get("url") not in gesehen:
            gesehen.add(l.get("url"))
            links.append(l)
    return replace(
        knox, zeit=knox.zeit or radar.zeit, lat=radar.lat, lon=radar.lon, genau=radar.genau,
        genres=list(radar.genres), frei=knox.frei or radar.frei, links=links,
        quellen=["knox", "radar"])


def fuehre_zusammen(termine):
    """Gleich: gleiches Datum, gleiche Stadt (auch Basisform), Jaccard der Bandwörter >= 0,5.
    Nur KNOX mit Radar; pro Paar gewinnt der beste Treffer (Gleichstand: der erste)."""
    knox = [(i, t) for i, t in enumerate(termine) if t.quelle == "knox"]
    radar = [(i, t) for i, t in enumerate(termine) if t.quelle == "radar"]
    gruppen = {}
    for i, t in knox:
        for s in stadtschluessel(t.stadt):
            gruppen.setdefault((t.datum, s), []).append(i)
    woerter = {i: wortmenge(t.bands) for i, t in knox + radar}
    paare = []
    for ri, r in radar:
        kandidaten = {ki for s in stadtschluessel(r.stadt) for ki in gruppen.get((r.datum, s), [])}
        for ki in kandidaten:
            j = jaccard(woerter[ki], woerter[ri])
            if j >= MIN_JACCARD:
                paare.append((-j, ki, ri))
    paare.sort()
    knox_zu_radar, radar_belegt = {}, set()
    for _, ki, ri in paare:
        if ki not in knox_zu_radar and ri not in radar_belegt:
            knox_zu_radar[ki] = ri
            radar_belegt.add(ri)
    ergebnis = []
    for i, t in enumerate(termine):
        if i in radar_belegt:
            continue
        ergebnis.append(_vereine(t, termine[knox_zu_radar[i]]) if i in knox_zu_radar else t)
    return ergebnis
