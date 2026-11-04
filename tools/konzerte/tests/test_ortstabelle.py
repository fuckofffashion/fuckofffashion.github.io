import unittest

from tools.konzerte.ortstabelle import Ortstabelle, normalisiere

TABELLE = [
    ["DE", "89077", "Ulm", 48.399, 9.989],
    ["DE", "89073", "Ulm", 48.397, 9.993],
    ["DE", "41061", "Mönchengladbach", 51.19, 6.44],
    ["NL", "6525", "Nijmegen", 51.82, 5.86],
    ["NL", "1012", "Amsterdam", 52.373, 4.893],
    ["DE", "10115", "Amsterdam", 52.0, 13.0],
    ["BE", "4000", "Liège", 50.633, 5.567],
    ["BE", "2000", "Antwerpen", 51.22, 4.4],
    ["DE", "47533", "Kleve", 51.79, 6.14],
    ["DE", "47534", "Kleve", 51.80, 6.15],
    ["DE", "25554", "Kleve", 53.967, 9.4],
]


class OrtstabelleTest(unittest.TestCase):
    def setUp(self):
        self.t = Ortstabelle(TABELLE)

    def test_plz_de(self):
        self.assertAlmostEqual(self.t.nach_plz("DE", "89077")[0], 48.39, delta=0.05)

    def test_plz_mittelwert(self):
        lat, lon = self.t.nach_plz("DE", "89077")
        self.assertAlmostEqual(lat, 48.399, places=3)

    def test_plz_nl(self):
        self.assertIsNotNone(self.t.nach_plz("NL", "6525"))

    def test_plz_unbekannt(self):
        self.assertIsNone(self.t.nach_plz("DE", "00000"))

    def test_name_ohne_land_findet_nl(self):
        # Reihenfolge DE, NL, BE: Amsterdam gibt es hier auch in DE -> DE zuerst
        self.assertEqual(self.t.nach_name("Amsterdam")[0], "DE")
        self.assertEqual(self.t.nach_name("Amsterdam", "NL")[0], "NL")

    def test_name_nl_ohne_de_treffer(self):
        self.assertEqual(self.t.nach_name("Nijmegen")[0], "NL")

    def test_name_mit_akzent(self):
        self.assertEqual(self.t.nach_name("Liege", "BE")[0], "BE")

    def test_name_unbekannt(self):
        self.assertIsNone(self.t.nach_name("Wien"))

    def test_name_gleichnamige_orte_kein_mittelwert(self):
        _, lat, lon = self.t.nach_name("Kleve")
        self.assertAlmostEqual(lat, 51.795, delta=0.05)
        self.assertAlmostEqual(lon, 6.145, delta=0.05)

    def test_name_falsches_land(self):
        self.assertIsNone(self.t.nach_name("Kleve", "NL"))

    def test_normalisiere(self):
        self.assertEqual(normalisiere("Mönchen-Gladbach"), normalisiere("monchen gladbach"))

    def test_normalisiere_eszett(self):
        self.assertEqual(normalisiere("Großenhain"), "grossenhain")


if __name__ == "__main__":
    unittest.main()
