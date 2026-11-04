import contextlib
import io
import json
import os
import tempfile
import unittest
from datetime import date, timedelta

from tools.konzerte import abholen

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "knox-feed.xml").replace("\\", "/")
TABELLE = "data/orte-tabelle.json"


def lauf(daten, heute="2026-11-01", hole_knox=None):
    argv = ["--ohne-nominatim", "--daten", daten, "--tabelle", TABELLE, "--heute", heute]
    if not hole_knox:
        argv += ["--knox-datei", FIXTURE]
    ausgabe = io.StringIO()
    with contextlib.redirect_stdout(ausgabe):
        code = abholen.main(argv, hole_knox=hole_knox)
    return code, ausgabe.getvalue()


def lies(daten, name):
    with open(os.path.join(daten, name), encoding="utf-8") as f:
        return json.load(f)


def schreibe(daten, name, inhalt):
    with open(os.path.join(daten, name), "w", encoding="utf-8") as f:
        json.dump(inhalt, f)


def tot():
    raise OSError("Netz weg")


ALT = {"id": "knox-1", "quelle": "knox", "datum": "2026-12-01", "zeit": None, "bands": "Alt", "zusatz": "",
       "laden": "X", "plz": None, "stadt": "Ulm", "land": "DE", "lat": 48.4, "lon": 9.99, "genau": False,
       "genres": ["Punk"], "frei": False, "kommerz": False, "links": []}


class AbholenTest(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.daten = self._t.name
        self.addCleanup(self._t.cleanup)

    def test_schreibt_json(self):
        code, _ = lauf(self.daten)
        self.assertEqual(code, 0)
        k = lies(self.daten, "konzerte.json")
        self.assertEqual(k["quellen"][0]["id"], "knox")
        self.assertTrue(k["termine"])
        for t in k["termine"]:
            self.assertIn(t["land"], ("DE", "NL", "BE"))
            self.assertIsNotNone(t["lat"])
            self.assertNotIn("text", t)
        staedte = {t["stadt"] for t in k["termine"]}
        self.assertNotIn("Wien", staedte)
        self.assertNotIn("Langenthal", staedte)
        self.assertGreaterEqual(k["ohne_ort"], 1)
        self.assertEqual(lies(self.daten, "quellen-status.json"),
                         {"knox": {"ok_am": "2026-11-01", "fehler_seit": None}})
        self.assertTrue(os.path.exists(os.path.join(self.daten, "orte.json")))

    def test_merkmale_gesetzt(self):
        lauf(self.daten)
        nach_band = {t["bands"]: t for t in lies(self.daten, "konzerte.json")["termine"]}
        self.assertTrue(nach_band["Beton Combo"]["kommerz"])
        self.assertTrue(nach_band["De Kift & Friends"]["frei"])
        self.assertFalse(nach_band["Mother’s Cake"]["kommerz"])

    def test_abgesagte_fallen_raus(self):
        with open(FIXTURE, encoding="utf-8") as f:
            feed = f.read().replace("Beton Combo", "Beton Combo ABGESAGT", 1)
        lauf(self.daten, hole_knox=lambda: feed)
        bands = [t["bands"] for t in lies(self.daten, "konzerte.json")["termine"]]
        self.assertNotIn("Beton Combo ABGESAGT", bands)
        self.assertEqual(len(bands), len(lies(self.daten, "konzerte.json")["termine"]))
        self.assertTrue(bands)

    def test_koordinaten_gerundet(self):
        lauf(self.daten)
        for t in lies(self.daten, "konzerte.json")["termine"]:
            self.assertEqual(t["lat"], round(t["lat"], 4))

    def test_zeitfenster(self):
        lauf(self.daten, heute="2026-11-01")
        self.assertTrue(any(t["datum"] == "2026-11-03" for t in lies(self.daten, "konzerte.json")["termine"]))
        lauf(self.daten, heute="2026-11-04")
        self.assertFalse(any(t["datum"] == "2026-11-03" for t in lies(self.daten, "konzerte.json")["termine"]))

    def test_obere_grenze_inklusive(self):
        # 03.11.2026 liegt genau heute+180 bei heute = 2026-05-07
        lauf(self.daten, heute="2026-05-07")
        self.assertTrue(lies(self.daten, "konzerte.json")["termine"])
        lauf(self.daten, heute="2026-05-06")
        self.assertFalse(lies(self.daten, "konzerte.json")["termine"])

    def test_quelle_tot_behaelt_alte(self):
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [ALT], "ohne_ort": 0})
        code, ausgabe = lauf(self.daten, hole_knox=tot)
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG knox:", ausgabe)
        self.assertEqual([t["id"] for t in lies(self.daten, "konzerte.json")["termine"]], ["knox-1"])
        self.assertEqual(lies(self.daten, "quellen-status.json")["knox"]["fehler_seit"], "2026-11-01")

    def test_quelle_tot_wirft_vergangenes_weg(self):
        alt = dict(ALT, datum="2026-10-31")
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [alt], "ohne_ort": 0})
        lauf(self.daten, hole_knox=tot)
        self.assertEqual(lies(self.daten, "konzerte.json")["termine"], [])

    def test_leerer_feed_ist_fehler(self):
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [ALT], "ohne_ort": 0})
        code, ausgabe = lauf(self.daten, hole_knox=lambda: "<rss><channel></channel></rss>")
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG knox:", ausgabe)
        self.assertEqual(len(lies(self.daten, "konzerte.json")["termine"]), 1)

    def test_kaputtes_xml_ist_fehler(self):
        code, ausgabe = lauf(self.daten, hole_knox=lambda: "<rss>")
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG knox:", ausgabe)

    def test_fehler_seit_und_ok_am_bleiben(self):
        schreibe(self.daten, "quellen-status.json", {"knox": {"ok_am": "2026-10-30", "fehler_seit": "2026-10-31"}})
        code, _ = lauf(self.daten, hole_knox=tot)
        self.assertEqual(code, 0)
        self.assertEqual(lies(self.daten, "quellen-status.json"),
                         {"knox": {"ok_am": "2026-10-30", "fehler_seit": "2026-10-31"}})

    def test_dritter_tag_exit_1(self):
        heute = date(2026, 11, 1)
        schreibe(self.daten, "quellen-status.json",
                 {"knox": {"ok_am": "2026-10-29", "fehler_seit": (heute - timedelta(days=2)).isoformat()}})
        code, _ = lauf(self.daten, hole_knox=tot)
        self.assertEqual(code, 1)

    def test_erfolg_setzt_fehler_zurueck(self):
        schreibe(self.daten, "quellen-status.json", {"knox": {"ok_am": "2026-10-29", "fehler_seit": "2026-10-30"}})
        code, _ = lauf(self.daten)
        self.assertEqual(code, 0)
        self.assertEqual(lies(self.daten, "quellen-status.json")["knox"], {"ok_am": "2026-11-01", "fehler_seit": None})


if __name__ == "__main__":
    unittest.main()
