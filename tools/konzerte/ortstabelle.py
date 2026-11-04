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


def _mittel(punkte):
    return (sum(p[0] for p in punkte) / len(punkte), sum(p[1] for p in punkte) / len(punkte))


def _haupt_cluster(punkte, radius=0.2):
    """Gleichnamige Orte liegen oft weit auseinander (Kleve in SH und NRW).
    Mittelwert nur über den größten Haufen (Radius ca. 20 km in Grad), bei Gleichstand der erste."""
    beste = max(
        ([q for q in punkte if abs(q[0] - p[0]) <= radius and abs(q[1] - p[1]) <= radius] for p in punkte),
        key=len,
    )
    return _mittel(beste)


class Ortstabelle:
    def __init__(self, zeilen):
        plz = {}
        namen = {}
        for land, code, name, lat, lon in zeilen:
            plz.setdefault((land, code), []).append((lat, lon))
            namen.setdefault(normalisiere(name), {}).setdefault(land, []).append((lat, lon))
        self._plz = {k: _mittel(v) for k, v in plz.items()}
        self._namen = {
            n: {land: _haupt_cluster(p) for land, p in laender.items()} for n, laender in namen.items()
        }

    @classmethod
    def laden(cls, pfad):
        with open(pfad, encoding="utf-8") as f:
            return cls(json.load(f)["orte"])

    def nach_plz(self, land, plz):
        return self._plz.get((land, plz))

    def nach_name(self, name, land=None):
        laender = self._namen.get(normalisiere(name))
        if not laender:
            return None
        for kandidat in (land,) if land else REIHENFOLGE:
            if kandidat in laender:
                lat, lon = laender[kandidat]
                return (kandidat, lat, lon)
        return None
