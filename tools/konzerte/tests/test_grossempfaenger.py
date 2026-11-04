import os
import unittest

from tools.konzerte.build_ortstabelle import (
    AUSGABE,
    entferne_grossempfaenger,
    ist_grossempfaenger,
    nachbearbeiten,
)
from tools.konzerte.ortstabelle import Ortstabelle

FIRMEN = [
    "Commerzbank AG",
    "Finanzamt Dresden - Nord",
    "Deutsche Post AG HR Service Germany",
    "Leipziger Verlags- und Druckereigesellschaft mbH & Co. KG",
    "Zalando Logistics SE & Co. KG",
    "Volksbank",
    "Kreissparkasse",
    "Stadtverwaltung",
    "Agentur für Arbeit Kleve",
    "Universitätsklinikum",
]
ORTE = [
    "Bankholzen",
    "Agathenburg",
    "Postbauer-Heng",
    "Kirchheim unter Teck",
    "Bad Kreuznach",
    "Seelze",
    "Freiamt",
    "Maikammer",
    "Weil am Rhein",
    "Sankt Augustin",
]


class ErkennungTest(unittest.TestCase):
    def test_firmen_und_behoerden(self):
        for name in FIRMEN:
            with self.subTest(name=name):
                self.assertTrue(ist_grossempfaenger(name))

    def test_echte_orte(self):
        for name in ORTE:
            with self.subTest(name=name):
                self.assertFalse(ist_grossempfaenger(name))

    def test_se_nur_grossgeschrieben(self):
        self.assertTrue(ist_grossempfaenger("Nordsee SE"))
        self.assertFalse(ist_grossempfaenger("Nordsee se"))

    def test_co_ohne_wortgrenze_ist_kein_treffer(self):
        self.assertFalse(ist_grossempfaenger("Hof & Cottbus"))


class SicherheitsnetzTest(unittest.TestCase):
    def test_name_mit_einwohnern_bleibt(self):
        orte = [
            ["DE", "10115", "Postfach Berlin", 52.5, 13.4, 0],
            ["DE", "99999", "Bank AG", 51.0, 10.0, 0],
            ["DE", "11111", "Bank AG", 51.1, 10.1, 5000],  # gleicher Name mit Einwohnern
        ]
        entferne_grossempfaenger(orte)
        # Postfach Berlin fällt, beide "Bank AG"-Zeilen bleiben (Name hat eine Zeile mit Einwohnern)
        self.assertEqual(sorted(z[1] for z in orte), ["11111", "99999"])

    def test_nur_de_wird_bereinigt(self):
        orte = [["NL", "1000", "Bank AG", 52.0, 4.0, 0], ["DE", "20000", "Bank AG", 53.0, 10.0, 0]]
        entferne_grossempfaenger(orte)
        self.assertEqual([z[0] for z in orte], ["NL"])

    def test_normalisierter_vergleich(self):
        orte = [["DE", "1", "SERVICE", 1.0, 1.0, 0], ["DE", "2", "Service", 1.0, 1.0, 10]]
        entferne_grossempfaenger(orte)
        self.assertEqual(len(orte), 2)


class IdempotenzTest(unittest.TestCase):
    def test_zweimal_gleich_einmal(self):
        orte = [
            ["DE", "80331", "München", 48.137, 11.575, 1500000],
            ["DE", "80000", "Allianz Versicherungs-AG", 48.1, 11.5, 0],
            ["NL", "2511", "'s-Gravenhage", 52.07, 4.31, 500000],
        ]
        aliase = {("NL", "Den Haag"): "'s-Gravenhage"}
        nachbearbeiten(orte, aliase)
        self.assertIn("Den Haag", [z[2] for z in orte])  # Aliasse laufen im selben Schritt
        erst = [list(z) for z in orte]
        nachbearbeiten(orte, aliase)
        self.assertEqual(orte, erst)
        self.assertNotIn("Allianz Versicherungs-AG", [z[2] for z in orte])


class EchteTabelleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.t = Ortstabelle.laden(os.path.normpath(AUSGABE))

    def test_orte_loesen_auf(self):
        for name, land in [("Kleve", "DE"), ("Frankfurt", "DE"), ("Halle", "DE"), ("Den Haag", "NL"),
                           ("Brugge", "BE"), ("Amsterdam", "NL"), ("Neu-Ulm", "DE"),
                           ("Bad Oeynhausen", "DE"), ("Weil am Rhein", "DE")]:
            with self.subTest(name=name):
                treffer = self.t.nach_name(name)
                self.assertIsNotNone(treffer)
                self.assertEqual(treffer[0], land)

    def test_plz_bleiben(self):
        self.assertIsNotNone(self.t.nach_plz("DE", "47533"))
        self.assertIsNotNone(self.t.nach_plz("DE", "01067"))

    def test_groesse(self):
        self.assertLess(os.path.getsize(os.path.normpath(AUSGABE)), 1_500_000)


if __name__ == "__main__":
    unittest.main()
