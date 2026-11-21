"""Test für tools/build-bands.py: bands.html und en/bands.html müssen zu tools/bands.json passen."""
import importlib.util
import re
import unittest
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location("build_bands", WURZEL / "tools" / "build-bands.py")
bb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bb)


def lies(rel: str) -> str:
    with (WURZEL / rel).open(encoding="utf-8", newline="") as f:
        return f.read()


class Seiten(unittest.TestCase):
    def test_seiten_aktuell(self):
        for sp, rel in (("de", "bands.html"), ("en", "en/bands.html")):
            with self.subTest(rel):
                html = lies(rel)
                self.assertEqual(bb.ersetze(html, bb.lade(), sp), html,
                                 f"{rel} ist veraltet: python tools/build-bands.py ausführen")

    def test_jedes_logo_existiert(self):
        for band in bb.lade()["bands"]:
            self.assertTrue((WURZEL / "assets" / "img" / "bands" / band["logo"]).is_file(), band["logo"])

    def test_alt_ist_bandname(self):
        html = lies("bands.html")
        for band in bb.lade()["bands"]:
            self.assertIn(f'alt="{bb.a(band["name"])}"', html)
            self.assertIn(f'id="band-{band["id"]}"', html)

    def test_en_nutzt_relative_pfade(self):
        html = lies("en/bands.html")
        self.assertNotIn('src="assets/', html)
        self.assertIn('src="../assets/img/bands/', html)

    def test_keine_fremden_bilder(self):
        for rel in ("bands.html", "en/bands.html"):
            self.assertIsNone(re.search(r'src="https?:', lies(rel)), rel)

    def test_marker_fehlt_gibt_fehler(self):
        with self.assertRaises(ValueError):
            bb.ersetze("<main></main>", bb.lade(), "de")

    def test_plakatfarbe_wird_klasse(self):
        daten = {"bands": [dict(bb.lade()["bands"][0], plakat="papier")]}
        html = "<!-- bands:plakate:start -->\n<!-- bands:plakate:end -->"
        self.assertIn('class="plakat plakat--papier"', bb.ersetze(html, daten, "de"))


    def test_pogo_knopf_nur_mit_song(self):
        mit = dict(bb.lade()["bands"][0], id="xy", pogo="xy-song")
        ohne = {k: v for k, v in dict(bb.lade()["bands"][1], id="ohne").items() if k != "pogo"}
        html = "<!-- bands:plakate:start -->\n<!-- bands:plakate:end -->"
        for sp, text in (("de", "POGO zu"), ("en", "POGO to")):
            with self.subTest(sp):
                aus = bb.ersetze(html, {"bands": [mit, ohne]}, sp)
                self.assertEqual(aus.count('href="pogo.html?song=xy-song#pogo-spiel"'), 1)
                self.assertIn(text, aus)
                self.assertEqual(aus.count("plakat__pogo"), 1)


if __name__ == "__main__":
    unittest.main()
