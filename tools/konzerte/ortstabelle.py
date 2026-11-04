"""Ortstabelle für DE/NL/BE: Koordinaten nach Postleitzahl oder Ortsname."""
import json
import re
import unicodedata

REIHENFOLGE = ("DE", "NL", "BE")


def normalisiere(text):
    """Klein, ohne Akzente, ß -> ss, Bindestriche/Leerzeichen gleich."""
    text = text.lower().replace("ß", "ss")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[\s\-_]+", " ", text).strip()


_LAGE = re.compile(r"^(.+?) (?:am|an der|an dem|im|in der|in|ob der|bei|vor der) .+$")


def basisform(name):
    """'Frankfurt (Main)' -> 'Frankfurt', 'Neustadt, Stadt' -> 'Neustadt'."""
    return re.split(r"\s*[(,]", name, maxsplit=1)[0].strip()


def basisnamen(name):
    """Zusätzliche normalisierte Suchschlüssel: ohne Klammer-/Kommazusatz und ohne
    Lagezusatz ('Frankfurt am Main' -> 'frankfurt', 'Neustadt an der Weinstraße' -> 'neustadt')."""
    alle = set()
    for n in (normalisiere(name), normalisiere(basisform(name))):
        alle.add(n)
        m = _LAGE.match(n)
        if m:
            alle.add(m.group(1))
    alle.discard(normalisiere(name))
    return alle


def stadtschluessel(name):
    """Alle normalisierten Namensformen einer Stadt (voll und Basisform); zwei Städte
    gelten als gleich, wenn sich ihre Schlüsselmengen schneiden."""
    return {normalisiere(name)} | basisnamen(name)


def _mittel(punkte):
    return (sum(p[0] for p in punkte) / len(punkte), sum(p[1] for p in punkte) / len(punkte))


def _haupt_cluster(punkte, radius=0.2):
    """Punkte (lat, lon, einw) zu Haufen (Radius ca. 20 km in Grad) bündeln.
    Gleichnamige Orte liegen oft weit auseinander (Kleve in SH und NRW).
    Der Haufen mit der höchsten Einwohnerzahl (Maximum der einw im Haufen) gewinnt,
    bei Gleichstand der größere Haufen, dann der erste.
    Rückgabe: (einw, lat, lon)."""
    beste = max(
        ([q for q in punkte if abs(q[0] - p[0]) <= radius and abs(q[1] - p[1]) <= radius] for p in punkte),
        key=lambda c: (max(q[2] for q in c), len(c)),
    )
    lat, lon = _mittel(beste)
    return (max(q[2] for q in beste), lat, lon)


class Ortstabelle:
    def __init__(self, zeilen):
        plz = {}
        namen = {}
        basis = {}
        for zeile in zeilen:
            land, code, name, lat, lon = zeile[:5]
            einw = zeile[5] if len(zeile) > 5 else 0
            plz.setdefault((land, code), []).append((lat, lon))
            punkt = (lat, lon, einw)
            namen.setdefault(normalisiere(name), {}).setdefault(land, []).append(punkt)
            for schluessel in basisnamen(name):
                basis.setdefault(schluessel, {}).setdefault(land, []).append(punkt)
        self._plz = {k: _mittel(v) for k, v in plz.items()}
        self._namen = self._clustern(namen)
        self._basis = self._clustern(basis)

    @staticmethod
    def _clustern(namen):
        return {n: {land: _haupt_cluster(p) for land, p in laender.items()} for n, laender in namen.items()}

    @classmethod
    def laden(cls, pfad):
        with open(pfad, encoding="utf-8") as f:
            return cls(json.load(f)["orte"])

    def nach_plz(self, land, plz):
        return self._plz.get((land, plz))

    def nach_name(self, name, land=None):
        schluessel = normalisiere(name)
        kandidaten = [land] if land else list(REIHENFOLGE)
        # Volltreffer vor Basisform-Treffer; je Stufe meiste Einwohner, Gleichstand: DE, NL, BE
        for index in (self._namen, self._basis):
            laender = index.get(schluessel, {})
            treffer = [(laender[k][0], -i, k) for i, k in enumerate(kandidaten) if k in laender]
            if treffer:
                k = max(treffer)[2]
                return (k, laender[k][1], laender[k][2])
        return None
