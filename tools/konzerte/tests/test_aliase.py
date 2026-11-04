import os
import unittest

from tools.konzerte.build_ortstabelle import AUSGABE, wende_aliase_an
from tools.konzerte.ortstabelle import Ortstabelle

ALIASE = {("NL", "Den Haag"): "'s-Gravenhage", ("DE", "Munich"): "München"}


def tabelle():
    return [
        ["NL", "2500", "'s-Gravenhage", 52.0, 4.3, 100],
        ["NL", "2511", "'s-Gravenhage", 52.07, 4.31, 500000],
        ["NL", "2512", "'s-Gravenhage", 52.08, 4.32, 500000],
        ["DE", "80331", "München", 48.137, 11.575, 1500000],
    ]


class AliaseTest(unittest.TestCase):
    def test_kopiert_zeile_mit_hoechsten_einwohnern(self):
        orte = wende_aliase_an(tabelle(), ALIASE)
        self.assertEqual(len(orte), 6)
        self.assertIn(["NL", "2511", "Den Haag", 52.07, 4.31, 500000], orte)
        self.assertIn(["DE", "80331", "Munich", 48.137, 11.575, 1500000], orte)

    def test_idempotent(self):
        orte = wende_aliase_an(tabelle(), ALIASE)
        wende_aliase_an(orte, ALIASE)
        self.assertEqual(len(orte), 6)

    def test_vorhandener_name_wird_uebersprungen(self):
        orte = tabelle() + [["NL", "9999", "Den  Haag", 1.0, 2.0, 5]]
        wende_aliase_an(orte, {("NL", "den-haag"): "'s-Gravenhage"})
        self.assertEqual(len(orte), 5)

    def test_fehlendes_ziel_wirft(self):
        with self.assertRaises(ValueError):
            wende_aliase_an(tabelle(), {("BE", "Brussels"): "Bruxelles"})


class AliaseEchteTabelleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.t = Ortstabelle.laden(os.path.normpath(AUSGABE))

    def test_den_haag(self):
        land, lat, lon = self.t.nach_name("Den Haag")
        self.assertEqual(land, "NL")
        self.assertAlmostEqual(lat, 52.07, delta=0.1)
        self.assertAlmostEqual(lon, 4.39, delta=0.1)

    def test_brüssel(self):
        self.assertEqual(self.t.nach_name("Brüssel")[0], "BE")

    def test_cologne(self):
        self.assertAlmostEqual(self.t.nach_name("Cologne")[1], 50.94, delta=0.1)


if __name__ == "__main__":
    unittest.main()
