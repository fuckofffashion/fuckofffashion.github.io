"""Test für tools/build-motive.py: index.html muss zu tools/motive.json passen.

Schlägt fehl, wenn jemand motive.json geändert und das Neubauen vergessen hat
(oder die Motivblöcke in index.html von Hand bearbeitet hat).
"""
import importlib.util
import json
import unittest
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location("build_motive", WURZEL / "tools" / "build-motive.py")
bm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bm)


def lies_index() -> str:
    with (WURZEL / "index.html").open(encoding="utf-8", newline="") as f:
        return f.read()


def lies_en() -> str:
    with (WURZEL / "en" / "index.html").open(encoding="utf-8", newline="") as f:
        return f.read()


class EnglischPasstZurListe(unittest.TestCase):
    def test_en_index_ist_aktuell(self):
        html = lies_en()
        self.assertEqual(bm.ersetze(html, bm.lade(), "en"), html,
                         "en/index.html ist veraltet: python tools/build-motive.py ausführen")

    def test_englische_wand_nutzt_englische_texte_und_pfade(self):
        html = lies_en()
        for m in bm.lade()["motive"]:
            self.assertIn(bm.a(m["titel_en"]), html)
        self.assertNotIn('src="assets/img/', html)
        self.assertNotIn("PNG laden", html)

    def test_fehlender_englischer_titel_wird_abgelehnt(self):
        d = json.loads((WURZEL / "tools" / "motive.json").read_text(encoding="utf-8"))
        del d["motive"][0]["titel_en"]
        with self.assertRaises(ValueError):
            bm.pruefe_daten(d)


class IndexPasstZurListe(unittest.TestCase):
    def test_index_ist_aktuell(self):
        html = lies_index()
        self.assertEqual(bm.ersetze(html, bm.lade()), html,
                         "index.html ist veraltet: python tools/build-motive.py ausführen")

    def test_jedes_motiv_steht_an_der_wand(self):
        html = lies_index()
        for m in bm.lade()["motive"]:
            self.assertIn(f'<span class="poster__no">Nr. {m["nr"]} · PNG</span>', html)

    def test_filterleisten_ohne_js_versteckt(self):
        html = lies_index()
        self.assertEqual(html.count('class="motivfilter js-motivfilter"'), 2)
        for zeile in html.splitlines():
            if 'class="motivfilter js-motivfilter"' in zeile:
                self.assertIn(" hidden>", zeile)


class Daten(unittest.TestCase):
    def daten(self):
        return json.loads((WURZEL / "tools" / "motive.json").read_text(encoding="utf-8"))

    def test_unbekannte_gruppe_wird_abgelehnt(self):
        d = self.daten()
        d["motive"][0]["gruppen"] = ["gibtsnicht"]
        with self.assertRaises(ValueError):
            bm.pruefe_daten(d)

    def test_doppelte_nummer_wird_abgelehnt(self):
        d = self.daten()
        d["motive"].append(dict(d["motive"][0]))
        with self.assertRaises(ValueError):
            bm.pruefe_daten(d)

    def test_neue_gruppe_erscheint_nur_mit_motiv(self):
        d = self.daten()
        d["gruppen"].append({"id": "neu", "name": "Neu"})
        html = bm.ersetze(lies_index(), d)
        self.assertNotIn('data-gruppe="neu"', html)
        d["motive"][1]["gruppen"] = ["neu"]  # 001 ist auch in der Motivwahl
        html = bm.ersetze(lies_index(), d)
        self.assertEqual(html.count('data-gruppe="neu"'), 2)

    def test_crlf_bleibt_crlf(self):
        html = lies_index().replace("\r\n", "\n").replace("\n", "\r\n")
        neu = bm.ersetze(html, bm.lade())
        self.assertNotIn("\n", neu.replace("\r\n", ""))


if __name__ == "__main__":
    unittest.main()
