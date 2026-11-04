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


def lauf(daten, heute="2026-11-01", hole_knox=None, hole_radar=None):
    """Ohne hole_radar läuft Radar nicht (kein Netz in Tests)."""
    argv = ["--ohne-nominatim", "--daten", daten, "--tabelle", TABELLE, "--heute", heute]
    if not hole_radar:
        argv.append("--ohne-radar")
    if not hole_knox:
        argv += ["--knox-datei", FIXTURE]
    ausgabe = io.StringIO()
    with contextlib.redirect_stdout(ausgabe):
        code = abholen.main(argv, hole_knox=hole_knox, hole_radar=hole_radar)
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


FIX = os.path.join(os.path.dirname(__file__), "fixtures")
with open(os.path.join(FIX, "radar-events.json"), encoding="utf-8") as f:
    RADAR_EVENTS = json.load(f)
with open(os.path.join(FIX, "radar-location.json"), encoding="utf-8") as f:
    RADAR_ORT = json.load(f)
LEER = {"result": {}, "count": 0}
ALT_RADAR = dict(ALT, id="radar-alt", quelle="radar", stadt="Berlin")


def radar_ok(url):
    if "/location/" in url:
        return RADAR_ORT
    return RADAR_EVENTS if "country][]=DE" in url else LEER


def radar_tot(url):
    raise OSError("Radar weg")


class RadarAbholenTest(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.daten = self._t.name
        self.addCleanup(self._t.cleanup)

    def test_radar_zweite_quelle(self):
        code, _ = lauf(self.daten, hole_radar=radar_ok)
        self.assertEqual(code, 0)
        k = lies(self.daten, "konzerte.json")
        self.assertEqual([q["id"] for q in k["quellen"]], ["knox", "radar"])
        self.assertEqual(k["quellen"][1], {"id": "radar", "name": "Radar – radar.squat.net", "url": "https://radar.squat.net/"})
        radar = [t for t in k["termine"] if t["quelle"] == "radar"]
        self.assertEqual([(t["bands"], t["datum"], t["zeit"], t["genau"]) for t in radar],
                         [("Punk im KuBiZ", "2026-11-04", "23:30", True)])
        self.assertEqual(radar[0]["genres"], ["Punk / Hardcore / Crust"])  # Merkmale kommen vom Adapter
        self.assertTrue(any(t["quelle"] == "knox" for t in k["termine"]))
        self.assertEqual(lies(self.daten, "quellen-status.json"),
                         {"knox": {"ok_am": "2026-11-01", "fehler_seit": None},
                          "radar": {"ok_am": "2026-11-01", "fehler_seit": None}})
        self.assertIn("radar|5696c22e-aba7-493c-950d-51d175449055", lies(self.daten, "orte.json"))

    def test_radar_ort_ohne_koordinaten_wird_geortet(self):
        ohne = json.loads(json.dumps(RADAR_ORT))
        ohne["map"] = {"lat": None, "lon": None}
        hole = lambda url: ohne if "/location/" in url else radar_ok(url)
        lauf(self.daten, hole_radar=hole)
        radar = [t for t in lies(self.daten, "konzerte.json")["termine"] if t["quelle"] == "radar"]
        self.assertEqual(len(radar), 1)
        self.assertIsNotNone(radar[0]["lat"])  # über die Ortstabelle (PLZ/Stadt), nicht exakt
        self.assertFalse(radar[0]["genau"])
        self.assertEqual(radar[0]["genres"], ["Punk / Hardcore / Crust"])

    def test_radar_tot_behaelt_alte_knox_laeuft(self):
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [ALT_RADAR], "ohne_ort": 0})
        code, ausgabe = lauf(self.daten, hole_radar=radar_tot)
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG radar:", ausgabe)
        self.assertNotIn("WARNUNG knox", ausgabe)
        ids = [t["id"] for t in lies(self.daten, "konzerte.json")["termine"]]
        self.assertIn("radar-alt", ids)
        self.assertTrue(any(i.startswith("knox-") for i in ids))
        status = lies(self.daten, "quellen-status.json")
        self.assertEqual(status["radar"], {"ok_am": None, "fehler_seit": "2026-11-01"})
        self.assertEqual(status["knox"]["fehler_seit"], None)

    def test_radar_ortsausfall_behaelt_alte_termine(self):
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [ALT_RADAR], "ohne_ort": 0})

        def hole(url):
            if "/location/" in url:
                raise OSError("Orte weg")
            return radar_ok(url)
        code, ausgabe = lauf(self.daten, hole_radar=hole)
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG radar:", ausgabe)
        self.assertIn("radar-alt", [t["id"] for t in lies(self.daten, "konzerte.json")["termine"]])
        self.assertEqual(lies(self.daten, "quellen-status.json")["radar"], {"ok_am": None, "fehler_seit": "2026-11-01"})

    def test_radar_dritter_tag_exit_1(self):
        schreibe(self.daten, "quellen-status.json", {"radar": {"ok_am": "2026-10-29", "fehler_seit": "2026-10-30"}})
        code, ausgabe = lauf(self.daten, hole_radar=radar_tot)
        self.assertEqual(code, 1)
        self.assertIn("FEHLER radar:", ausgabe)
        self.assertEqual(lies(self.daten, "quellen-status.json")["radar"],
                         {"ok_am": "2026-10-29", "fehler_seit": "2026-10-30"})

    def test_radar_ohne_events_ist_fehler(self):
        code, ausgabe = lauf(self.daten, hole_radar=lambda url: LEER)
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG radar:", ausgabe)

    def test_knox_tot_radar_laeuft(self):
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [ALT], "ohne_ort": 0})
        code, ausgabe = lauf(self.daten, hole_knox=tot, hole_radar=radar_ok)
        self.assertEqual(code, 0)
        self.assertIn("WARNUNG knox:", ausgabe)
        self.assertEqual(sorted(t["quelle"] for t in lies(self.daten, "konzerte.json")["termine"]), ["knox", "radar"])

    def test_ohne_radar_laesst_radar_unberuehrt(self):
        schreibe(self.daten, "konzerte.json", {"stand": "x", "quellen": [], "termine": [ALT_RADAR], "ohne_ort": 0})
        schreibe(self.daten, "quellen-status.json", {"radar": {"ok_am": "2026-10-31", "fehler_seit": None}})
        code, _ = lauf(self.daten)
        self.assertEqual(code, 0)
        self.assertIn("radar-alt", [t["id"] for t in lies(self.daten, "konzerte.json")["termine"]])
        self.assertEqual(lies(self.daten, "quellen-status.json")["radar"], {"ok_am": "2026-10-31", "fehler_seit": None})

    def test_ohne_ort_bleibt_bei_ausfall_der_quelle(self):
        lauf(self.daten)
        vorher = lies(self.daten, "konzerte.json")["ohne_ort"]
        self.assertGreaterEqual(vorher, 1)
        lauf(self.daten, hole_knox=tot)
        self.assertEqual(lies(self.daten, "konzerte.json")["ohne_ort"], vorher)


if __name__ == "__main__":
    unittest.main()
