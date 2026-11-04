import unittest

from tools.konzerte.modell import Termin
from tools.konzerte.zusammenfuehren import dubletten_in_quelle, fuehre_zusammen


def t(quelle, bands, stadt="Dresden", datum="2026-11-05", **kw):
    vorgabe = dict(id=f"{quelle}-{bands}-{stadt}", quelle=quelle, datum=datum, zeit=None, bands=bands, zusatz="",
                   laden="Laden", plz=None, stadt=stadt, land="DE")
    vorgabe.update(kw)
    return Termin(**vorgabe)


def knox(bands, **kw):
    return t("knox", bands, **kw)


def radar(bands, **kw):
    kw.setdefault("lat", 51.05)
    kw.setdefault("lon", 13.74)
    kw.setdefault("genau", True)
    return t("radar", bands, **kw)


class ZusammenfuehrenTest(unittest.TestCase):
    def test_gleiche_bands_werden_eins(self):
        k = knox("Schmutz + Die Fingernägel", id="knox-1", links=[{"quelle": "knox", "url": "http://k"}],
                 zeit="20:00", kommerz=True)
        r = radar("SCHMUTZ / Die Fingernägel", id="radar-1", links=[{"quelle": "radar", "url": "http://r"}],
                  genres=["Punk"], frei=True, zeit="19:00")
        erg = fuehre_zusammen([k, r])
        self.assertEqual(len(erg), 1)
        m = erg[0]
        self.assertEqual(m.id, "knox-1")
        self.assertEqual(m.quelle, "knox")
        self.assertEqual(m.zeit, "20:00")
        self.assertEqual([l["url"] for l in m.links], ["http://k", "http://r"])
        self.assertTrue(m.genau)
        self.assertEqual((m.lat, m.lon), (51.05, 13.74))
        self.assertEqual(m.genres, ["Punk"])
        self.assertTrue(m.frei)
        self.assertTrue(m.kommerz)
        self.assertEqual(m.to_dict()["quellen"], ["knox", "radar"])

    def test_zeit_von_radar_wenn_knox_keine_hat(self):
        erg = fuehre_zusammen([knox("Abc Def"), radar("Abc Def", zeit="21:00")])
        self.assertEqual(erg[0].zeit, "21:00")

    def test_links_ohne_doppelte_url(self):
        l = {"quelle": "knox", "url": "http://x"}
        erg = fuehre_zusammen([knox("Abc", links=[l]), radar("Abc", links=[{"quelle": "radar", "url": "http://x"}])])
        self.assertEqual(len(erg[0].links), 1)

    def test_andere_stadt(self):
        self.assertEqual(len(fuehre_zusammen([knox("Abc Def"), radar("Abc Def", stadt="Leipzig")])), 2)

    def test_anderes_datum(self):
        self.assertEqual(len(fuehre_zusammen([knox("Abc Def"), radar("Abc Def", datum="2026-11-06")])), 2)

    def test_gleiche_quelle_nie(self):
        self.assertEqual(len(fuehre_zusammen([knox("Abc Def"), knox("Abc Def")])), 2)
        self.assertEqual(len(fuehre_zusammen([radar("Abc Def"), radar("Abc Def")])), 2)

    def test_basisform_stadt(self):
        erg = fuehre_zusammen([knox("Abc Def", stadt="Halle (Saale)"), radar("Abc Def", stadt="Halle")])
        self.assertEqual(len(erg), 1)
        erg = fuehre_zusammen([knox("Abc Def", stadt="Frankfurt am Main"), radar("Abc Def", stadt="Frankfurt")])
        self.assertEqual(len(erg), 1)

    def test_bester_treffer_gewinnt(self):
        k = knox("Alpha Beta Gamma", id="knox-1")
        schwach = radar("Alpha Beta Delta Epsilon", id="radar-schwach")  # 2/5
        mittel = radar("Alpha Beta Gamma Delta", id="radar-mittel")  # 3/4
        stark = radar("Alpha Beta Gamma", id="radar-stark")  # 3/3
        erg = fuehre_zusammen([k, mittel, stark, schwach])
        self.assertEqual(sorted(x.id for x in erg), ["knox-1", "radar-mittel", "radar-schwach"])
        self.assertEqual(next(x for x in erg if x.id == "knox-1").quellen, ["knox", "radar"])

    def test_gleichstand_erster(self):
        erg = fuehre_zusammen([knox("Alpha", id="knox-1"), radar("Alpha", id="r1"), radar("Alpha", id="r2")])
        self.assertEqual(sorted(x.id for x in erg), ["knox-1", "r2"])

    def test_leere_wortmenge_nie(self):
        self.assertEqual(len(fuehre_zusammen([knox("The & Guests"), radar("The & Guests")])), 2)
        self.assertEqual(len(fuehre_zusammen([knox("+ & +"), radar("+ & +")])), 2)

    def test_stoppwoerter_zaehlen_nicht(self):
        erg = fuehre_zusammen([knox("Abc + Special Guests"), radar("Abc")])
        self.assertEqual(len(erg), 1)

    def test_unter_schwelle(self):
        self.assertEqual(len(fuehre_zusammen([knox("Alpha Beta Gamma"), radar("Alpha Delta Epsilon")])), 2)

    def test_ohne_quellen_kein_schluessel_im_dict(self):
        self.assertNotIn("quellen", knox("Abc").to_dict())

    def test_radar_ohne_koordinaten_behaelt_knox_werte(self):
        k = knox("Abc Def", lat=51.0, lon=13.0, genau=False)
        erg = fuehre_zusammen([k, radar("Abc Def", lat=None, lon=None, genau=False)])
        self.assertEqual(len(erg), 1)
        self.assertEqual((erg[0].lat, erg[0].lon), (51.0, 13.0))

    def test_leere_radar_genres_behalten_knox_genres(self):
        erg = fuehre_zusammen([knox("Abc Def", genres=["Ska"]), radar("Abc Def", genres=[])])
        self.assertEqual(erg[0].genres, ["Ska"])

    def test_beide_frankfurt_nicht(self):
        k = knox("Abc Def", stadt="Frankfurt am Main", lat=50.11, lon=8.68)
        r = radar("Abc Def", stadt="Frankfurt (Oder)", lat=52.35, lon=14.55)
        self.assertEqual(len(fuehre_zusammen([k, r])), 2)

    def test_nahe_koordinaten_mergen(self):
        k = knox("Abc Def", lat=51.05, lon=13.70)
        self.assertEqual(len(fuehre_zusammen([k, radar("Abc Def")])), 1)


class DublettenInQuelleTest(unittest.TestCase):
    def test_kubiz(self):
        a = radar("Punk im KuBiz", id="a", zeit="19:00", laden="KuBiZ", links=[{"quelle": "radar", "url": "u1"}])
        b = radar("Punk im KuBiZ", id="b", zeit="19:00", laden="KuBiZ", frei=True,
                  links=[{"quelle": "radar", "url": "u1"}, {"quelle": "radar", "url": "u2"}])
        erg = dubletten_in_quelle([a, b])
        self.assertEqual([x.id for x in erg], ["a"])
        self.assertEqual([l["url"] for l in erg[0].links], ["u1", "u2"])
        self.assertTrue(erg[0].frei)

    def test_beide_ohne_zeit_zaehlt_gleich(self):
        self.assertEqual(len(dubletten_in_quelle([radar("Punk im KuBiz"), radar("Punk im KuBiZ")])), 1)

    def test_andere_zeit(self):
        a, b = radar("Punk im KuBiz", zeit="19:00"), radar("Punk im KuBiz", zeit="21:00")
        self.assertEqual(len(dubletten_in_quelle([a, b])), 2)

    def test_anderer_laden(self):
        a, b = radar("Punk im KuBiz", laden="A"), radar("Punk im KuBiz", laden="B")
        self.assertEqual(len(dubletten_in_quelle([a, b])), 2)

    def test_knox_und_radar_nicht_hier(self):
        self.assertEqual(len(dubletten_in_quelle([knox("Abc"), radar("Abc")])), 2)


if __name__ == "__main__":
    unittest.main()
