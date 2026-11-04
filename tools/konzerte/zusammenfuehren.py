"""Dubletten zwischen KNOX und Radar zusammenführen."""
import math
import re
from dataclasses import replace

from tools.konzerte.ortstabelle import normalisiere, stadtschluessel

STOPPWOERTER = {"the", "and", "und", "support", "special", "guests"}  # "+" und "&" fallen beim Teilen weg
MIN_JACCARD = 0.5
MAX_ABSTAND_KM = 30


def wortmenge(bands):
    woerter = re.split(r"\W+", normalisiere(bands))
    return {w for w in woerter if w and w not in STOPPWOERTER}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def abstand_km(lat1, lon1, lat2, lon2):
    a = (math.sin(math.radians(lat2 - lat1) / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 12742 * math.asin(math.sqrt(a))


def _zu_weit(a, b):
    return (a.lat is not None and b.lat is not None
            and abstand_km(a.lat, a.lon, b.lat, b.lon) > MAX_ABSTAND_KM)


def _links(a, b):
    links, gesehen = [], set()
    for l in a + b:
        if l.get("url") not in gesehen:
            gesehen.add(l.get("url"))
            links.append(l)
    return links


def _vereine(knox, radar):
    ort = {"lat": radar.lat, "lon": radar.lon, "genau": radar.genau} if radar.lat is not None else {}
    return replace(
        knox, zeit=knox.zeit or radar.zeit, genres=list(radar.genres or knox.genres),
        frei=knox.frei or radar.frei, links=_links(knox.links, radar.links),
        quellen=["knox", "radar"], **ort)


def dubletten_in_quelle(termine):
    """Doppelte Einträge innerhalb einer Quelle zusammenlegen: gleiches Datum, gleiche Zeit,
    gleiche Stadt, gleicher Laden und Band-Jaccard >= 0,5. Der erste bleibt, Links werden vereint."""
    behalten, gruppen = [], {}
    for t in termine:
        gruppe = gruppen.setdefault((t.quelle, t.datum, t.zeit, normalisiere(t.laden)), [])
        woerter, schluessel = wortmenge(t.bands), stadtschluessel(t.stadt)
        for k in gruppe:
            if k[0] & schluessel and jaccard(k[1], woerter) >= MIN_JACCARD:
                k[2].links = _links(k[2].links, t.links)
                k[2].frei = k[2].frei or t.frei
                break
        else:
            gruppe.append((schluessel, woerter, t))
            behalten.append(t)
    return behalten


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
            if j >= MIN_JACCARD and not _zu_weit(termine[ki], r):
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
