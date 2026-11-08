"""Deutsch/Englisch: Die englischen Seiten unter en/ passen zu den deutschen.

- gleiche Sprungmarken (IDs), damit der Umschalter an derselben Stelle landet
- Umschalter auf jeder Seite, mit dem richtigen Ziel
- englische Seiten finden CSS, JS, Bilder und Daten eine Ebene höher (../)
"""
import re
import unittest
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[3]
PAARE = {"index.html": "en/index.html", "konzerte.html": "en/konzerte.html"}
NUR_DEUTSCH = ["impressum.html", "datenschutz.html", "404.html"]


def lies(rel: str) -> str:
    return (WURZEL / rel).read_text(encoding="utf-8")


def ids(html: str) -> set[str]:
    return set(re.findall(r'\sid="([^"]+)"', html))


def umschalter(html: str) -> list[str]:
    return re.findall(r'<a class="head__sprache js-sprache"[^>]*>', html)


class SprachenTest(unittest.TestCase):
    def test_gleiche_sprungmarken(self):
        for de, en in PAARE.items():
            with self.subTest(seite=de):
                self.assertEqual(ids(lies(de)), ids(lies(en)))

    def test_englische_seiten_sind_englisch_und_eine_ebene_tiefer(self):
        for en in PAARE.values():
            with self.subTest(seite=en):
                html = lies(en)
                self.assertRegex(html, r'<html lang="en" data-wurzel="\.\./">')
                self.assertIsNone(re.search(r'(?:src|srcset|href|content|poster|data-[a-z-]+)="(?:css|js|assets|data)/', html),
                                  "Pfad ohne ../ in " + en)
                self.assertNotIn("url(assets", html)
                self.assertNotIn('url("assets', html)

    def test_umschalter_zeigt_auf_die_andere_sprache(self):
        for de, en in PAARE.items():
            with self.subTest(seite=de):
                (a,) = umschalter(lies(de))
                self.assertIn(f'href="{en}"' if de != "index.html" else 'href="en/"', a)
                self.assertIn('lang="en"', a)
                (b,) = umschalter(lies(en))
                self.assertIn(f'href="../{de}"' if de != "index.html" else 'href="../"', b)
                self.assertIn('lang="de"', b)
        for de in NUR_DEUTSCH:
            with self.subTest(seite=de):
                (a,) = umschalter(lies(de))
                self.assertIn('href="en/"', a)

    def test_hreflang_auf_beiden_seiten_gleich(self):
        for de, en in PAARE.items():
            with self.subTest(seite=de):
                muster = r'<link rel="alternate" hreflang="[^"]+" href="[^"]+">'
                self.assertEqual(re.findall(muster, lies(de)), re.findall(muster, lies(en)))
                self.assertEqual(len(re.findall(muster, lies(de))), 3)

    def test_rechtstexte_verlinkt_auf_deutsche_fassung(self):
        for en in PAARE.values():
            with self.subTest(seite=en):
                html = lies(en)
                self.assertIn('href="../impressum.html"', html)
                self.assertIn('href="../datenschutz.html"', html)


if __name__ == "__main__":
    unittest.main()
