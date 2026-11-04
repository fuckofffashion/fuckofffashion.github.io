"""Ortung der Termine: Cache, Nominatim (gedrosselt, mit Budget), Ortstabelle als Rückfall."""
import json
import time
import urllib.parse
import urllib.request
from datetime import date

from tools.konzerte.ortstabelle import normalisiere

USER_AGENT = "FuckOffFashion-Konzerte/1.0 (+https://fuckofffashion.example/konzerte.html)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
ABSTAND_SEKUNDEN = 1.0
NICHT_GEFUNDEN_TAGE = 30
LAENDER = ("DE", "NL", "BE")

_letzte_anfrage = 0.0


def _warte(uhr=time.monotonic, schlafen=time.sleep):
    """Schläft so lange, dass zwischen zwei Anfragen mindestens eine Sekunde liegt."""
    global _letzte_anfrage
    rest = _letzte_anfrage + ABSTAND_SEKUNDEN - uhr()
    if rest > 0:
        schlafen(rest)
    _letzte_anfrage = uhr() + max(rest, 0)


def nominatim_suche(abfrage):
    """Eine Nominatim-Suche. Rückgabe: [{"lat", "lon", "land"}] oder []. Fehler werden nicht gefangen."""
    parameter = urllib.parse.urlencode({
        "q": abfrage,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1,
        "countrycodes": "de,nl,be",
    })
    anfrage = urllib.request.Request(f"{NOMINATIM_URL}?{parameter}", headers={"User-Agent": USER_AGENT})
    _warte()
    with urllib.request.urlopen(anfrage, timeout=20) as antwort:
        daten = json.load(antwort)
    ergebnis = []
    for eintrag in daten[:1]:
        land = (eintrag.get("address") or {}).get("country_code", "").upper()
        ergebnis.append({
            "lat": float(eintrag["lat"]),
            "lon": float(eintrag["lon"]),
            "land": land if land in LAENDER else None,
        })
    return ergebnis


class Ortung:
    def __init__(self, cache, tabelle, hole, heute, budget=300):
        self.cache = cache
        self.tabelle = tabelle
        self.hole = hole
        self.heute = heute
        self.budget = budget

    def orte(self, t):
        if t.land == "X":
            return t
        schluessel = f"{t.land or ''}|{normalisiere(t.stadt)}|{normalisiere(t.laden)}"
        eintrag = self.cache.get(schluessel)
        if eintrag and "lat" in eintrag:
            self._setze(t, eintrag["lat"], eintrag["lon"], eintrag.get("land"), True)
            return t
        if t.laden and self.budget > 0 and not self._kuerzlich_nicht_gefunden(eintrag):
            if self._nominatim(t, schluessel):
                return t
        self._tabelle(t)
        return t

    def _kuerzlich_nicht_gefunden(self, eintrag):
        if not eintrag or "nicht_gefunden" not in eintrag:
            return False
        try:
            seit = (self.heute - date.fromisoformat(eintrag["nicht_gefunden"])).days
        except ValueError:
            return False
        return seit < NICHT_GEFUNDEN_TAGE

    def _nominatim(self, t, schluessel):
        """True bei Treffer. Bei Fehler wird Nominatim für den Rest des Laufs abgeschaltet."""
        ort = " ".join(teil for teil in (t.plz, t.stadt) if teil)
        abfrage = ", ".join(teil for teil in (t.laden, ort) if teil)
        self.budget -= 1
        try:
            treffer = self.hole(abfrage)
        except Exception:
            self.budget = 0
            return False
        if not treffer:
            self.cache[schluessel] = {"nicht_gefunden": self.heute.isoformat()}
            return False
        lat, lon, land = treffer[0]["lat"], treffer[0]["lon"], treffer[0].get("land")
        if t.land is None and land is None and t.stadt:
            gefunden = self.tabelle.nach_name(t.stadt)
            land = gefunden[0] if gefunden else None
        self._setze(t, lat, lon, land, True)
        self.cache[schluessel] = {"lat": lat, "lon": lon, "land": t.land}
        return True

    def _tabelle(self, t):
        # nach_plz liefert (lat, lon), nach_name (land, lat, lon)
        punkt = None
        if t.plz and t.land in LAENDER:
            punkt = self.tabelle.nach_plz(t.land, t.plz)
        if punkt:
            self._setze(t, punkt[0], punkt[1], t.land, False)
            return
        if t.stadt:
            treffer = self.tabelle.nach_name(t.stadt, t.land if t.land in LAENDER else None)
            if treffer:
                self._setze(t, treffer[1], treffer[2], treffer[0], False)

    @staticmethod
    def _setze(t, lat, lon, land, genau):
        t.lat, t.lon, t.genau = lat, lon, genau
        if t.land not in LAENDER and land in LAENDER:
            t.land = land
