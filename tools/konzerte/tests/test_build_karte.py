import unittest

from tools.konzerte import build_karte as bk


class TestDouglasPeucker(unittest.TestCase):
    def test_gerade_linie_wird_auf_endpunkte_reduziert(self):
        linie = [[0, 0], [1, 0.001], [2, -0.001], [3, 0]]
        self.assertEqual(bk.douglas_peucker(linie, 0.01), [[0, 0], [3, 0]])

    def test_knick_bleibt_erhalten(self):
        linie = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]
        self.assertEqual(bk.douglas_peucker(linie, 0.01), [[0, 0], [2, 0], [2, 2]])

    def test_kurze_linie_unveraendert(self):
        self.assertEqual(bk.douglas_peucker([[0, 0], [1, 1]]), [[0, 0], [1, 1]])

    def test_lange_linie_ohne_rekursionsfehler(self):
        linie = [[i * 0.001, 0.0 if i % 2 else 0.5] for i in range(5000)]
        self.assertGreater(len(bk.douglas_peucker(linie, 0.01)), 2)


class TestRunden(unittest.TestCase):
    def test_drei_stellen(self):
        self.assertEqual(bk.runden([6.95823, 50.93756]), [6.958, 50.938])

    def test_vereinfachen_entfernt_duplikate(self):
        self.assertEqual(bk.vereinfachen([[1.0001, 2.0], [1.0002, 2.0], [5.0, 9.0]]),
                         [[1.0, 2.0], [5.0, 9.0]])

    def test_zu_kleiner_ring_faellt_raus(self):
        ring = [[10, 50], [10.001, 50], [10, 50.001], [10, 50]]
        self.assertIsNone(bk.ring_vereinfachen(ring))

    def test_ring_ausserhalb_bbox_faellt_raus(self):
        ring = [[-68, 12], [-67, 12], [-67, 13], [-68, 13], [-68, 12]]
        self.assertIsNone(bk.ring_vereinfachen(ring))

    def test_iso_minus99_faellt_auf_adm0_a3_zurueck(self):
        self.assertEqual(bk.land_iso({"ISO_A2": "-99", "ADM0_A3": "NLD"}), "NL")


if __name__ == "__main__":
    unittest.main()
