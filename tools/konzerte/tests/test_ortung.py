import unittest
from datetime import date, timedelta

from tools.konzerte import ortung
from tools.konzerte.modell import Termin
from tools.konzerte.ortstabelle import Ortstabelle
from tools.konzerte.ortung import Ortung

TABELLE = Ortstabelle([
    ["DE", "89077", "Ulm", 48.399, 9.989, 120000],
    ["NL", "1012", "Amsterdam", 52.373, 4.893, 870000],
    ["BE", "2000", "Antwerpen", 51.22, 4.4, 520000],
])
HEUTE = date(2026, 11, 4)


def termin(laden="Roxy", plz="89077", stadt="Ulm", land="DE"):
    return Termin(id="1", quelle="knox", datum="2026-12-01", zeit=None, bands="X", zusatz="",
                  laden=laden, plz=plz, stadt=stadt, land=land)


class FakeHole:
    def __init__(self, antwort=None, fehler=None):
        self.antwort = [{"lat": 48.4, "lon": 9.99, "land": "DE"}] if antwort is None else antwort
        self.fehler = fehler
        self.abfragen = []

    def __call__(self, abfrage):
        self.abfragen.append(abfrage)
        if self.fehler:
            raise self.fehler
        return self.antwort


def ortung_mit(hole, cache=None, budget=300):
    return Ortung({} if cache is None else cache, TABELLE, hole, HEUTE, budget)


class OrtungTest(unittest.TestCase):
    def test_nominatim_treffer_wird_gecacht(self):
        hole = FakeHole()
        o = ortung_mit(hole)
        t = o.orte(termin())
        self.assertEqual((t.lat, t.lon, t.genau, t.land), (48.4, 9.99, True, "DE"))
        self.assertEqual(hole.abfragen, ["Roxy, 89077 Ulm"])
        self.assertEqual(o.cache["DE|ulm|roxy"], {"lat": 48.4, "lon": 9.99, "land": "DE"})

    def test_ohne_ort_keine_nominatim_abfrage(self):
        hole = FakeHole()
        t = ortung_mit(hole).orte(termin(laden="IMPORT EXPORT", plz=None, stadt="", land=None))
        self.assertEqual(hole.abfragen, [])
        self.assertIsNone(t.lat)

    def test_cache_vor_nominatim(self):
        hole = FakeHole()
        cache = {"DE|ulm|roxy": {"lat": 1.5, "lon": 2.5, "land": "DE"}}
        t = ortung_mit(hole, cache).orte(termin())
        self.assertEqual((t.lat, t.lon, t.genau), (1.5, 2.5, True))
        self.assertEqual(hole.abfragen, [])

    def test_budget(self):
        hole = FakeHole()
        o = ortung_mit(hole, budget=1)
        a = o.orte(termin(laden="Roxy"))
        b = o.orte(termin(laden="Cafe Abseits"))
        self.assertEqual(len(hole.abfragen), 1)
        self.assertTrue(a.genau)
        self.assertFalse(b.genau)
        self.assertAlmostEqual(b.lat, 48.399, places=3)

    def test_nicht_gefunden_30_tage(self):
        for tage, abfragen in ((10, 0), (29, 0), (30, 1), (31, 1)):
            with self.subTest(tage=tage):
                hole = FakeHole()
                alt = (HEUTE - timedelta(days=tage)).isoformat()
                t = ortung_mit(hole, {"DE|ulm|roxy": {"nicht_gefunden": alt}}).orte(termin())
                self.assertEqual(len(hole.abfragen), abfragen)
                self.assertIsNotNone(t.lat)

    def test_nicht_gefunden_wird_gecacht_und_faellt_auf_tabelle(self):
        o = ortung_mit(FakeHole(antwort=[]))
        t = o.orte(termin())
        self.assertEqual(o.cache["DE|ulm|roxy"], {"nicht_gefunden": "2026-11-04"})
        self.assertFalse(t.genau)
        self.assertAlmostEqual(t.lat, 48.399, places=3)

    def test_ausland_x(self):
        hole = FakeHole()
        t = ortung_mit(hole).orte(termin(land="X"))
        self.assertIsNone(t.lat)
        self.assertEqual(hole.abfragen, [])

    def test_land_aus_tabelle(self):
        t = ortung_mit(FakeHole(antwort=[])).orte(termin(plz=None, stadt="Amsterdam", land=None))
        self.assertEqual((t.land, t.genau), ("NL", False))
        self.assertAlmostEqual(t.lat, 52.373, places=3)

    def test_land_aus_nominatim(self):
        hole = FakeHole(antwort=[{"lat": 51.2, "lon": 4.4, "land": "BE"}])
        t = ortung_mit(hole).orte(termin(plz=None, stadt="Antwerpen", land=None))
        self.assertEqual((t.land, t.lat, t.genau), ("BE", 51.2, True))

    def test_hole_ohne_land_nimmt_land_aus_tabelle(self):
        hole = FakeHole(antwort=[{"lat": 52.0, "lon": 4.0}])
        o = ortung_mit(hole)
        t = o.orte(termin(plz=None, stadt="Amsterdam", land=None))
        self.assertEqual((t.land, t.lat, t.lon), ("NL", 52.0, 4.0))
        self.assertEqual(o.cache["|amsterdam|roxy"]["land"], "NL")

    def test_treffer_im_falschen_land_wird_verworfen(self):
        hole = FakeHole(antwort=[{"lat": 51.2, "lon": 4.4, "land": "BE"}])
        o = ortung_mit(hole)
        t = o.orte(termin())
        self.assertEqual(len(hole.abfragen), 1)
        self.assertEqual(t.land, "DE")
        self.assertFalse(t.genau)
        self.assertAlmostEqual(t.lat, 48.399, places=3)
        self.assertEqual(o.cache, {})

    def test_kaputter_cache_ist_ein_fehlschlag(self):
        for eintrag in ("text", None, 5, [], {}, {"lat": 1.0}, {"lat": None, "lon": None},
                        {"nicht_gefunden": 7}, {"nicht_gefunden": "kaputt"}):
            with self.subTest(eintrag=eintrag):
                hole = FakeHole()
                t = ortung_mit(hole, {"DE|ulm|roxy": eintrag}).orte(termin())
                self.assertEqual(len(hole.abfragen), 1)
                self.assertTrue(t.genau)

    def test_nicht_gefunden_in_der_zukunft_wird_neu_versucht(self):
        hole = FakeHole()
        zukunft = (HEUTE + timedelta(days=3)).isoformat()
        ortung_mit(hole, {"DE|ulm|roxy": {"nicht_gefunden": zukunft}}).orte(termin())
        self.assertEqual(len(hole.abfragen), 1)

    def test_tabelle_ueberschreibt_bekanntes_land_nicht(self):
        # Stadt gibt es nur in NL, Termin sagt DE: Land bleibt DE, keine Koordinaten
        t = ortung_mit(FakeHole(antwort=[])).orte(termin(plz=None, stadt="Amsterdam", land="DE"))
        self.assertEqual(t.land, "DE")
        self.assertIsNone(t.lat)

    def test_fehler_von_hole_stoppt_nominatim(self):
        hole = FakeHole(fehler=OSError("HTTP 429"))
        o = ortung_mit(hole)
        a = o.orte(termin(laden="Roxy"))
        b = o.orte(termin(laden="Cafe Abseits"))
        self.assertEqual(len(hole.abfragen), 1)
        self.assertEqual(o.cache, {})
        self.assertEqual(o.fehler, "OSError: HTTP 429")
        self.assertFalse(a.genau)
        self.assertFalse(b.genau)
        self.assertIsNotNone(a.lat)
        self.assertIsNotNone(b.lat)

    def test_ohne_laden_keine_abfrage(self):
        hole = FakeHole()
        t = ortung_mit(hole).orte(termin(laden=""))
        self.assertEqual(hole.abfragen, [])
        self.assertFalse(t.genau)
        self.assertIsNotNone(t.lat)

    def test_nichts_gefunden(self):
        t = ortung_mit(FakeHole(antwort=[])).orte(termin(plz=None, stadt="", land=None))
        self.assertIsNone(t.lat)


class WarteTest(unittest.TestCase):
    def test_hoechstens_eine_anfrage_pro_sekunde(self):
        ortung._letzte_anfrage = 100.0
        geschlafen = []
        ortung._warte(lambda: 100.25, geschlafen.append)
        self.assertEqual(len(geschlafen), 1)
        self.assertAlmostEqual(geschlafen[0], 0.75)
        geschlafen.clear()
        ortung._warte(lambda: 105.0, geschlafen.append)
        self.assertEqual(geschlafen, [])

    def test_wartezeit_waechst_nicht(self):
        zeit = [100.0]
        waits, starts = [], []

        def schlafen(s):
            waits.append(s)
            zeit[0] += s

        ortung._letzte_anfrage = 0.0
        for _ in range(6):
            ortung._warte(lambda: zeit[0], schlafen)
            starts.append(zeit[0])
            zeit[0] += 0.3  # die Anfrage selbst dauert
        self.assertTrue(all(w <= 1.0 for w in waits), waits)
        self.assertTrue(all(b - a >= 1.0 for a, b in zip(starts, starts[1:])), starts)


class FristTest(unittest.TestCase):
    """Zeitfrist: nach Ablauf keine neuen Nominatim-Abfragen mehr, Rückfall auf die Tabelle."""

    def test_nach_der_frist_keine_abfrage_mehr(self):
        jetzt = [0.0]
        hole = FakeHole()
        o = Ortung({}, TABELLE, hole, HEUTE, 300, frist=100.0, uhr=lambda: jetzt[0])
        a = o.orte(termin(laden="Roxy"))
        jetzt[0] = 100.0
        b = o.orte(termin(laden="Cafe Abseits"))
        c = o.orte(termin(laden="Bar 3"))
        self.assertEqual(hole.abfragen, ["Roxy, 89077 Ulm"])
        self.assertTrue(a.genau)
        self.assertFalse(b.genau)
        self.assertAlmostEqual(c.lat, 48.399, places=3)
        self.assertEqual(o.uebersprungen, 2)
        self.assertEqual(o.budget, 299)

    def test_cache_gilt_auch_nach_der_frist(self):
        hole = FakeHole()
        cache = {"DE|ulm|roxy": {"lat": 1.5, "lon": 2.5, "land": "DE"}}
        o = Ortung(cache, TABELLE, hole, HEUTE, 300, frist=0.0, uhr=lambda: 5.0)
        t = o.orte(termin())
        self.assertEqual((t.lat, t.genau, o.uebersprungen), (1.5, True, 0))

    def test_ohne_frist_unveraendert(self):
        hole = FakeHole()
        o = Ortung({}, TABELLE, hole, HEUTE, 300, uhr=lambda: 1e9)
        o.orte(termin())
        self.assertEqual(len(hole.abfragen), 1)
        self.assertEqual(o.uebersprungen, 0)


if __name__ == "__main__":
    unittest.main()
