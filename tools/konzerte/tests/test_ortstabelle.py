import unittest

from tools.konzerte.ortstabelle import Ortstabelle, normalisiere

TABELLE = [
    ["DE", "89077", "Ulm", 48.399, 9.989],
    ["DE", "89073", "Ulm", 48.397, 9.993],
    ["DE", "41061", "Mönchengladbach", 51.19, 6.44],
    ["NL", "6525", "Nijmegen", 51.82, 5.86],
    ["NL", "1012", "Amsterdam", 52.373, 4.893],
    ["BE", "4000", "Liège", 50.633, 5.567],
    ["BE", "2000", "Antwerpen", 51.22, 4.4],
    ["DE", "47533", "Kleve", 51.79, 6.14],
    ["DE", "25554", "Kleve", 53.967, 9.4, 300],
    ["DE", "25779", "Kleve", 54.295, 9.124, 200],
    ["DE", "47533", "Kleve", 51.788, 6.139, 50000],
    ["DE", "25832", "Brugge", 54.0, 9.5, 0],
    ["BE", "8000", "Brugge", 51.209, 3.225, 118000],
    ["DE", "60311", "Frankfurt am Main", 50.11, 8.68, 750000],
    ["DE", "15230", "Frankfurt (Oder)", 52.347, 14.554, 57000],
    ["DE", "67433", "Neustadt an der Weinstraße", 49.35, 8.14, 53000],
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
        self.assertEqual(self.t.nach_name("Amsterdam")[0], "NL")

    def test_name_nl_ohne_de_treffer(self):
        self.assertEqual(self.t.nach_name("Nijmegen")[0], "NL")

    def test_name_mit_akzent(self):
        self.assertEqual(self.t.nach_name("Liege", "BE")[0], "BE")

    def test_name_unbekannt(self):
        self.assertIsNone(self.t.nach_name("Wien"))

    def test_name_gleichnamige_orte_kein_mittelwert(self):
        _, lat, lon = self.t.nach_name("Kleve")
        self.assertAlmostEqual(lat, 51.79, delta=0.05)
        self.assertAlmostEqual(lon, 6.14, delta=0.05)

    def test_name_ohne_land_bevorzugt_groesseren_ort(self):
        self.assertEqual(self.t.nach_name("Brugge")[0], "BE")

    def test_name_gleiche_einwohner_de_zuerst(self):
        t = Ortstabelle([["BE", "1", "Xdorf", 51.0, 4.0], ["DE", "2", "Xdorf", 51.0, 8.0]])
        self.assertEqual(t.nach_name("Xdorf")[0], "DE")

    def test_name_basisform(self):
        self.assertEqual(self.t.nach_name("Frankfurt")[0], "DE")

    def test_name_lagezusatz_frankfurt(self):
        self.assertAlmostEqual(self.t.nach_name("Frankfurt")[1], 50.11, delta=0.05)

    def test_name_volltreffer_vor_basisform(self):
        self.assertAlmostEqual(self.t.nach_name("Frankfurt (Oder)")[1], 52.35, delta=0.05)

    def test_name_lagezusatz_neustadt(self):
        self.assertEqual(self.t.nach_name("Neustadt")[0], "DE")

    def test_name_falsches_land(self):
        self.assertIsNone(self.t.nach_name("Kleve", "NL"))

    def test_normalisiere(self):
        self.assertEqual(normalisiere("Mönchen-Gladbach"), normalisiere("monchen gladbach"))

    def test_normalisiere_eszett(self):
        self.assertEqual(normalisiere("Großenhain"), "grossenhain")


if __name__ == "__main__":
    unittest.main()
