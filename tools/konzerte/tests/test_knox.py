import unittest
from pathlib import Path

from tools.konzerte.knox import lese_feed, zerlege_ort
from tools.konzerte.modell import Termin

FIXTURE = (Path(__file__).parent / "fixtures" / "knox-feed.xml").read_text(encoding="utf-8")


class ZerlegeOrtTest(unittest.TestCase):
    def test_ort_formen(self):
        self.assertEqual(zerlege_ort("89077 Ulm"), ("89077", "Ulm", "DE"))
        self.assertEqual(zerlege_ort("6525 Nijmegen (Holland)"), ("6525", "Nijmegen", "NL"))
        self.assertEqual(zerlege_ort("Kortrijk (BE)"), (None, "Kortrijk", "BE"))
        self.assertEqual(zerlege_ort("2020 Antwerpen BL"), ("2020", "Antwerpen", "BE"))
        self.assertEqual(zerlege_ort("Bruges, Belgium"), (None, "Bruges", "BE"))
        self.assertEqual(zerlege_ort("Hamburg"), (None, "Hamburg", None))
        self.assertEqual(zerlege_ort("1030 Wien  (Austria)")[2], "X")
        self.assertEqual(zerlege_ort("CH-Langenthal")[2], "X")
        self.assertEqual(zerlege_ort("unbekannt"), (None, "", None))

    def test_keine_fehllesung_bei_ortsnamen(self):
        self.assertEqual(zerlege_ort("Bad Oeynhausen"), (None, "Bad Oeynhausen", None))
        self.assertEqual(zerlege_ort("Den Haag"), (None, "Den Haag", None))
        self.assertEqual(zerlege_ort("  Amsterdam "), (None, "Amsterdam", None))
        self.assertEqual(zerlege_ort("1012 Amsterdam"), ("1012", "Amsterdam", None))
        self.assertEqual(zerlege_ort("Utrecht (nl)"), (None, "Utrecht", "NL"))
        self.assertEqual(zerlege_ort("Gent, Niederlande"), (None, "Gent", "NL"))
        self.assertEqual(zerlege_ort(""), (None, "", None))

    def test_unbekannte_zusaetze_gehoeren_zum_namen(self):
        for roh in ("Halle (Saale)", "Frankfurt (Oder)", "Hamburg (St. Pauli)", "Berlin, Kreuzberg"):
            self.assertEqual(zerlege_ort(roh), (None, roh, None), roh)
        self.assertEqual(zerlege_ort("06108 Halle (Saale)"), ("06108", "Halle (Saale)", "DE"))

    def test_bindestrich_in_namen(self):
        self.assertEqual(zerlege_ort("Neu-Ulm"), (None, "Neu-Ulm", None))
        self.assertEqual(zerlege_ort("Ulm-Soeflingen"), (None, "Ulm-Soeflingen", None))
        self.assertEqual(zerlege_ort("89231 Neu-Ulm"), ("89231", "Neu-Ulm", "DE"))
        self.assertEqual(zerlege_ort("DE-Berlin"), (None, "Berlin", "DE"))
        self.assertEqual(zerlege_ort("CH-Langenthal"), (None, "Langenthal", "X"))

    def test_weitere_marker(self):
        self.assertEqual(zerlege_ort("Gent (België)"), (None, "Gent", "BE"))
        self.assertEqual(zerlege_ort("Paris (France)")[2], "X")
        self.assertEqual(zerlege_ort("Berlin (D)"), (None, "Berlin", "DE"))


def _feed(*items):
    return "<rss><channel>%s</channel></rss>" % "".join(items)


def _item(datum, id_="1"):
    return ("<item><description><![CDATA[<b>Band(s):</b> X<br /> <b>Datum:</b> %s<br /> "
            "<b>Ort:</b> Hamburg<br /> <b>Wo:</b> Y<br />]]></description>"
            "<guid>https://knox.p-u-n-k.de/db/index.php?id=%s</guid></item>" % (datum, id_))


class FeedRobustTest(unittest.TestCase):
    def test_zeit(self):
        t = lese_feed(_feed(_item("Di, 03.11.2026 20:30 Uhr")))
        self.assertEqual((t[0].datum, t[0].zeit), ("2026-11-03", "20:30"))

    def test_kaputtes_datum_ueberspringt_nur_den_eintrag(self):
        t = lese_feed(_feed(_item("31.13.2026", "1"), _item("kein Datum", "2"), _item("04.11.2026", "3")))
        self.assertEqual([x.id for x in t], ["knox-3"])

    def test_nichts_lesbar_ist_fehler(self):
        with self.assertRaises(ValueError):
            lese_feed(_feed(_item("31.13.2026")))
        self.assertEqual(lese_feed(_feed()), [])


class FeedTest(unittest.TestCase):
    def test_feed(self):
        t = lese_feed(FIXTURE)
        self.assertEqual(len(t), 8)
        roxy = next(x for x in t if x.id == "knox-651450")
        self.assertEqual((roxy.datum, roxy.laden, roxy.plz, roxy.stadt), ("2026-11-03", "Roxy", "89077", "Ulm"))
        self.assertEqual(roxy.links[0], {"quelle": "knox", "url": "http://www.roxy.ulm.de/"})
        self.assertIn("<script>", next(x for x in t if "<script>" in x.text).text)  # roh behalten, escapen macht die Seite

    def test_felder_und_defaults(self):
        t = {x.id: x for x in lese_feed(FIXTURE)}
        roxy = t["knox-651450"]
        self.assertEqual((roxy.bands, roxy.zusatz), ("Mother’s Cake", "Fall 2026"))
        self.assertIsNone(roxy.zeit)
        self.assertEqual(roxy.quelle, "knox")
        self.assertEqual(roxy.land, "DE")
        self.assertEqual((roxy.lat, roxy.lon, roxy.genau, roxy.genres, roxy.frei, roxy.kommerz),
                         (None, None, False, [], False, False))
        self.assertNotIn("text", roxy.to_dict())
        self.assertEqual(roxy.to_dict()["id"], "knox-651450")

    def test_laender_im_feed(self):
        t = {x.id: x for x in lese_feed(FIXTURE)}
        self.assertEqual(t["knox-700001"].land, "NL")
        self.assertEqual(t["knox-700002"].land, "BE")
        self.assertEqual(t["knox-700003"].land, "BE")
        self.assertIsNone(t["knox-700004"].land)
        self.assertEqual(t["knox-700005"].land, "X")
        self.assertEqual(t["knox-700006"].stadt, "")
        self.assertEqual(t["knox-700007"].land, "X")

    def test_links_nur_http(self):
        t = {x.id: x for x in lese_feed(FIXTURE)}
        self.assertEqual(t["knox-700001"].links, [{"quelle": "knox", "url": "https://www.eventim.de/event/beton-combo-12345/"}])
        self.assertEqual(t["knox-700003"].links, [])
        self.assertEqual(t["knox-651450"].links, [{"quelle": "knox", "url": "http://www.roxy.ulm.de/"}])

    def test_text_und_entities(self):
        t = {x.id: x for x in lese_feed(FIXTURE)}
        self.assertIn("Eintritt frei", t["knox-700002"].text)
        self.assertEqual(t["knox-700002"].laden, "Pit's Bar")
        self.assertEqual(t["knox-700002"].bands, "De Kift & Friends")
        self.assertEqual((t["knox-700004"].bands, t["knox-700004"].zusatz), ("Hamburg Allstars", "Special Guests"))
        text = t["knox-700004"].text
        self.assertIn("<script>alert(1)</script>", text)
        self.assertIn("& Tombola", text)
        self.assertIn("8 EUR", text)
        self.assertNotIn("<b>", text)


if __name__ == "__main__":
    unittest.main()
