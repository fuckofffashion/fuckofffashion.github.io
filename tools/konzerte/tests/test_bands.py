"""Tests für tools/konzerte/bands.py: Termine aus konzerte.json den Bands der Bandseite zuordnen."""
import json
import tempfile
import unittest
from pathlib import Path

from tools.konzerte import bands as b

WURZEL = Path(__file__).resolve().parents[3]
HEUTE = "2026-11-21"


def band(name, **extra):
    return {"id": name.lower().replace(" ", "-"), "name": name, "logo": "x.webp",
            "logo_quelle": "https://example.org/x.png", "web": "https://example.org", **extra}


def termin(bands, datum="2026-12-01", zusatz="", laden="Laden", stadt="Stadt", zeit=None):
    return {"datum": datum, "zeit": zeit, "bands": bands, "zusatz": zusatz, "laden": laden, "stadt": stadt,
            "quelle": "knox", "lat": 50.0, "lon": 7.0}


def treffer(eine_band, termine):
    return b.ordne_zu([eine_band], termine, HEUTE)["bands"][eine_band["id"]]


class Schluessel(unittest.TestCase):
    def test_schluessel_ohne_emoji_und_gross(self):
        self.assertEqual(b.schluessel("☠️ALARMSIGNAL"), "alarmsignal")
        self.assertEqual(b.schluessel("AC/DC"), "ac dc")
        self.assertEqual(b.schluessel("Die Ärzte"), b.schluessel("DIE ARZTE"))


class Zuordnung(unittest.TestCase):
    def test_ganzes_wort(self):
        slime = band("Slime")
        self.assertEqual(treffer(slime, [termin("SLIME + Gäste")])["anzahl"], 1)
        self.assertEqual(treffer(slime, [termin("Slimer")])["anzahl"], 0)

    def test_mehrwortname_mit_anhang(self):
        lf = band("Los Fastidios")
        ts = [termin("Los Fastidios und 1328 Beercore", datum="2026-12-01"),
              termin("☠️LOS FASTIDIOS", datum="2026-12-02")]
        self.assertEqual(treffer(lf, ts)["anzahl"], 2)

    def test_zusatz_nur_mit_schalter(self):
        ts = [termin("Hauptband", zusatz="mit Trijahnity als Support")]
        self.assertEqual(treffer(band("Trijahnity"), ts)["anzahl"], 0)
        self.assertEqual(treffer(band("Trijahnity", auch_zusatz=True), ts)["anzahl"], 1)

    def test_nicht_schliesst_aus(self):
        slime = band("Slime", nicht=["tribute"])
        self.assertEqual(treffer(slime, [termin("Slime Tribute Band")])["anzahl"], 0)
        self.assertEqual(treffer(slime, [termin("Slime")])["anzahl"], 1)

    def test_schreibweisen(self):
        aerzte = band("Die Ärzte", schreibweisen=["Arzte"])
        self.assertEqual(treffer(aerzte, [termin("DIE ARZTE")])["anzahl"], 1)

    def test_vergangenheit_faellt_weg(self):
        ts = [termin("Slime", datum="2026-11-20"), termin("Slime", datum="2026-11-21")]
        r = treffer(band("Slime"), ts)
        self.assertEqual([t["datum"] for t in r["termine"]], ["2026-11-21"])

    def test_doppelte_einmal(self):
        ts = [termin("Slime", laden="AZ"), dict(termin("SLIME", laden="AZ"), quelle="radar")]
        self.assertEqual(treffer(band("Slime"), ts)["anzahl"], 1)

    def test_band_ohne_termine_hat_eintrag(self):
        x = band("X")
        self.assertEqual(treffer(x, []), {"anzahl": 0, "termine": []})

    def test_sortierung(self):
        ts = [termin("Slime", datum="2026-12-05"), termin("Slime", datum="2026-12-01", zeit="21:00", laden="B"),
              termin("Slime", datum="2026-12-01", zeit="19:00", laden="A")]
        r = treffer(band("Slime"), ts)
        self.assertEqual([(t["datum"], t["zeit"]) for t in r["termine"]],
                         [("2026-12-01", "19:00"), ("2026-12-01", "21:00"), ("2026-12-05", None)])
        self.assertEqual(set(r["termine"][0]), {"datum", "zeit", "laden", "stadt"})

    def test_ergebnis_traegt_heute(self):
        self.assertEqual(b.ordne_zu([], [], HEUTE)["heute"], HEUTE)


class LadeBands(unittest.TestCase):
    def schreibe(self, daten):
        d = tempfile.mkdtemp()
        p = Path(d) / "bands.json"
        p.write_text(json.dumps(daten), encoding="utf-8")
        return p

    def test_lade_bands_prueft(self):
        ohne_logo = band("A")
        del ohne_logo["logo"]
        with self.assertRaisesRegex(ValueError, "A"):
            b.lade_bands(self.schreibe({"bands": [ohne_logo]}))
        with self.assertRaisesRegex(ValueError, "doppelt"):
            b.lade_bands(self.schreibe({"bands": [band("A"), band("A")]}))
        with self.assertRaisesRegex(ValueError, "id"):
            b.lade_bands(self.schreibe({"bands": [dict(band("A"), id="A B")]}))

    def test_echte_liste_laedt(self):
        liste = b.lade_bands(WURZEL / "tools" / "bands.json")
        self.assertEqual([x["id"] for x in liste], ["dan-ganove", "alarmsignal", "los-fastidios", "trijahnity"])


if __name__ == "__main__":
    unittest.main()
