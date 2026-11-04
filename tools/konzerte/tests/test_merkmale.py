import unittest

from tools.konzerte.merkmale import genres, ist_frei, ist_kommerz, lade_listen

L = lade_listen()


class MerkmaleTest(unittest.TestCase):
    def test_genre_ska(self):
        self.assertEqual(genres("The Toasters  45 Years in Ska", L), ["Ska / Reggae"])

    def test_genre_rueckfall(self):
        self.assertEqual(genres("Mother's Cake  Fall 2026", L), ["Punk / Hardcore (allgemein)"])

    def test_kein_teilwort(self):
        self.assertNotIn("Ska / Reggae", genres("Skandal im Sperrbezirk", L))

    def test_sonderzeichen_und_reihenfolge(self):
        self.assertEqual(genres("OI! Night mit D-Beat und Punk", L), ["Oi!", "Crust / D-Beat", "Punk"])

    def test_oi_als_wort(self):
        self.assertIn("Oi!", genres("Skinhead oi Abend", L))
        self.assertNotIn("Oi!", genres("Zoigl Fest", L))

    def test_frei(self):
        self.assertTrue(ist_frei("Preis: Eintritt frei", L))
        self.assertFalse(ist_frei("Preis: 8 EUR", L))

    def test_frei_kein_teilwort(self):
        self.assertFalse(ist_frei("Freiburg Festhalle, 12 EUR", L))

    def test_frei_formulierungen(self):
        for text in ("Eintritt frei!", "Eintritt: frei", "Eintritt ist frei", "Freier Eintritt", "Eintritt auf Spende",
                     "Spendenbasis", "gegen Spende", "Hutkasse", "Pay what you can", "gratis", "Kostenlos",
                     "toegang gratis", "gratis entree", "Eintritt frei, Spende willkommen"):
            with self.subTest(text=text):
                self.assertTrue(ist_frei(text, L))

    def test_frei_keine_falschtreffer(self):
        for text in ("Freiburg", "Freitag 20 Uhr", "Free Jazz Abend", "free", "Eintritt 8 EUR", "Eintritt: 5 Euro",
                     "Freizeitzentrum", "Vorverkauf gratisfrei", "Preis frei wählbar Eintritt 10"):
            with self.subTest(text=text):
                self.assertFalse(ist_frei(text, L))

    def test_kommerz(self):
        self.assertTrue(ist_kommerz(["https://www.eventim.de/event/x"], L))

    def test_kein_kommerz(self):
        self.assertFalse(ist_kommerz(["http://www.roxy.ulm.de/"], L))


if __name__ == "__main__":
    unittest.main()
