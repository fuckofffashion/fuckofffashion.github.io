import copy
import json
import unittest
from pathlib import Path

from tools.konzerte import radar
from tools.konzerte.merkmale import lade_listen
from tools.konzerte.modell import Termin

FIX = Path(__file__).parent / "fixtures"
EVENTS = json.loads((FIX / "radar-events.json").read_text(encoding="utf-8"))
LOC = json.loads((FIX / "radar-location.json").read_text(encoding="utf-8"))
KUBIZ = "5696c22e-aba7-493c-950d-51d175449055"
LEER = {"result": {}, "count": 0}
L = lade_listen()


def mit_event(**felder):
    """Fixture mit nur dem Punk-Event, Felder überschrieben."""
    e = copy.deepcopy(EVENTS["result"]["602683"])
    e.update(felder)
    return {"result": {"1": e}}


def ohne_koordinaten():
    loc = copy.deepcopy(LOC)
    loc["map"] = {"lat": None, "lon": None}
    return loc


class LeseRadarTest(unittest.TestCase):
    def test_punk_ja_comedy_nein(self):
        t = radar.lese_radar(EVENTS, {KUBIZ: LOC}, L)
        self.assertEqual(len(t), 1)
        self.assertIsInstance(t[0], Termin)
        self.assertEqual((t[0].datum, t[0].zeit), ("2026-11-04", "23:30"))  # kein Rutsch auf den 5. oder 4. UTC
        self.assertAlmostEqual(t[0].lat, 52.5572, places=3)
        self.assertAlmostEqual(t[0].lon, 13.47, places=3)
        self.assertTrue(t[0].genau)
        self.assertEqual(t[0].genres, ["Punk / Hardcore / Crust"])

    def test_felder(self):
        t = radar.lese_radar(EVENTS, {KUBIZ: LOC}, L)[0]
        self.assertEqual(t.id, "radar-719ebc00-8235-401d-ab34-70208064a554")
        self.assertEqual(t.quelle, "radar")
        self.assertEqual((t.bands, t.zusatz), ("Punk im KuBiZ", ""))
        self.assertEqual((t.laden, t.plz, t.stadt, t.land), ("KuBiZ", "13088", "Berlin", "DE"))
        self.assertEqual(t.links, [{"quelle": "radar", "url": "https://radar.squat.net/en/node/602683"}])
        self.assertTrue(t.frei)
        self.assertFalse(t.kommerz)

    def test_zeit_ohne_utc_umrechnung(self):
        zeit = {"date_time": [{"time_start": "2026-11-05T00:30:00+02:00"}]}
        t = radar.lese_radar(mit_event(**zeit), {KUBIZ: LOC}, L)[0]
        self.assertEqual((t.datum, t.zeit), ("2026-11-05", "00:30"))

    def test_mehrere_termine_erster_gilt(self):
        zeit = {"date_time": [{"time_start": "2026-11-06T20:00:00+01:00"}, {"time_start": "2026-11-07T20:00:00+01:00"}]}
        self.assertEqual(radar.lese_radar(mit_event(**zeit), {KUBIZ: LOC}, L)[0].datum, "2026-11-06")

    def test_ohne_brauchbare_zeit_faellt_raus(self):
        for zeit in ([], None, [{"time_start": None}], [{"time_start": "kaputt"}]):
            self.assertEqual(radar.lese_radar(mit_event(date_time=zeit), {KUBIZ: LOC}, L), [], zeit)

    def test_ohne_ort_oder_koordinaten_faellt_raus(self):
        self.assertEqual(radar.lese_radar(EVENTS, {}, L), [])
        self.assertEqual(radar.lese_radar(mit_event(offline=[]), {KUBIZ: LOC}, L), [])
        leer = ohne_koordinaten()
        leer["address"].update(locality="", postal_code=None)
        self.assertEqual(radar.lese_radar(EVENTS, {KUBIZ: leer}, L), [])

    def test_ohne_koordinaten_bleibt_mit_adresse(self):
        t = radar.lese_radar(EVENTS, {KUBIZ: ohne_koordinaten()}, L)
        self.assertEqual(len(t), 1)
        self.assertEqual((t[0].lat, t[0].lon, t[0].genau), (None, None, False))
        self.assertEqual((t[0].laden, t[0].plz, t[0].stadt, t[0].land), ("KuBiZ", "13088", "Berlin", "DE"))

    def test_ort_mit_koordinaten_hat_vorrang(self):
        e = mit_event(offline=[{"id": "x1"}, {"id": KUBIZ}])
        self.assertTrue(radar.lese_radar(e, {"x1": ohne_koordinaten(), KUBIZ: LOC}, L)[0].genau)

    def test_erster_ort_mit_koordinaten(self):
        e = mit_event(offline=[{"id": "x1"}, {"id": KUBIZ}])
        t = radar.lese_radar(e, {"x1": ohne_koordinaten(), KUBIZ: LOC}, L)
        self.assertEqual(t[0].laden, "KuBiZ")

    def test_land_grossgeschrieben_und_fremde_als_x(self):
        for kuerzel, erwartet in (("nl", "NL"), ("BE", "BE"), ("FR", "X")):
            loc = copy.deepcopy(LOC)
            loc["address"]["country"] = kuerzel
            self.assertEqual(radar.lese_radar(EVENTS, {KUBIZ: loc}, L)[0].land, erwartet)

    def test_laden_rueckfall_auf_titel(self):
        loc = copy.deepcopy(LOC)
        loc["address"]["name_line"] = ""
        self.assertEqual(radar.lese_radar(EVENTS, {KUBIZ: loc}, L)[0].laden, LOC["title"])

    def test_tags_als_strings_und_feld_tags(self):
        for feld in ("topic", "tags"):
            e = mit_event(**{"topic": [], feld: ["Ska / Reggae"], "title": "Abend"})
            self.assertEqual(radar.lese_radar(e, {KUBIZ: LOC}, L)[0].genres, ["Ska / Reggae"], feld)

    def test_stichwort_im_titel(self):
        e = mit_event(topic=[], title="Ska Party")
        self.assertEqual(radar.lese_radar(e, {KUBIZ: LOC}, L)[0].genres, ["Ska / Reggae"])

    def test_rueckfallgenre_allein_reicht_nicht(self):
        self.assertEqual(radar.lese_radar(mit_event(topic=[], title="Konzert"), {KUBIZ: LOC}, L), [])

    def test_fremde_tags_zaehlen_nicht(self):
        e = mit_event(topic=[{"name": "queer"}], title="Abend")
        self.assertEqual(radar.lese_radar(e, {KUBIZ: LOC}, L), [])

    def test_frei_preis(self):
        for preis, erwartet in (("Free", True), ("BY DONATION", True), ("5 euro", False), (None, False)):
            t = radar.lese_radar(mit_event(price=preis), {KUBIZ: LOC}, L)[0]
            self.assertEqual(t.frei, erwartet, preis)

    def test_kommerz_aus_url(self):
        e = mit_event(url="https://www.eventim.de/x")
        self.assertTrue(radar.lese_radar(e, {KUBIZ: LOC}, L)[0].kommerz)

    def test_nur_http_links(self):
        self.assertEqual(radar.lese_radar(mit_event(url="javascript:alert(1)"), {KUBIZ: LOC}, L)[0].links, [])

    def test_keine_treffer_sind_leer(self):
        for leer in (False, [], {}):
            self.assertEqual(radar.lese_radar({"result": leer, "count": 0}, {}, L), [])

    def test_format_geaendert_wirft(self):
        with self.assertRaises(ValueError):
            radar.lese_radar({"fehler": "x"}, {}, L)


class SammleRadarTest(unittest.TestCase):
    """Netz ersetzt durch eine Funktion url -> JSON; kein Test geht ins Netz."""

    def setUp(self):
        self.urls = []

    def fake(self, events=None):
        events = events or {}

        def hole(url):
            self.urls.append(url)
            if "/location/" in url:
                return LOC
            land = url.split("country][]=")[1][:2]
            return events.get(land, LEER)
        return hole

    def lauf(self, hole, cache=None, budget=100, heute="2026-11-01", **kw):
        cache = {} if cache is None else cache
        return radar.sammle_radar(hole, cache, L, heute, "2027-04-30", budget, **kw), cache

    def test_holt_events_und_orte_und_cached(self):
        (termine, stats), cache = self.lauf(self.fake({"DE": EVENTS}))
        self.assertEqual([t.id for t in termine], ["radar-719ebc00-8235-401d-ab34-70208064a554"])
        self.assertEqual(stats["gelesen"], {"DE": 2, "NL": 0, "BE": 0})
        self.assertEqual((stats["behalten"], stats["orte_geholt"]), (1, 1))
        self.assertEqual(cache["radar|" + KUBIZ],
                         {"lat": 52.5571858, "lon": 13.4700005, "plz": "13088", "stadt": "Berlin",
                          "land": "DE", "laden": "KuBiZ"})
        self.assertTrue(any("fields=uuid,title,date_time,offline,category,price,topic,url" in u for u in self.urls))
        self.assertTrue(all("facets[category][]=music-concert" in u for u in self.urls if "/search/" in u))

    def test_cache_spart_abruf(self):
        _, cache = self.lauf(self.fake({"DE": EVENTS}))
        self.urls.clear()
        (termine, _), _ = self.lauf(self.fake({"DE": EVENTS}), cache=cache)
        self.assertEqual(len(termine), 1)
        self.assertFalse(any("/location/" in u for u in self.urls))

    def test_ort_budget(self):
        (termine, stats), cache = self.lauf(self.fake({"DE": EVENTS}), budget=0)
        self.assertEqual((termine, stats["orte_geholt"], cache), ([], 0, {}))

    def test_ortfehler_ueberspringt_event(self):
        def hole(url):
            if "/location/" in url:
                raise OSError("weg")
            return EVENTS if "country][]=DE" in url else LEER
        (termine, stats), cache = self.lauf(hole)
        self.assertEqual((termine, cache, stats["orte_fehler"]), ([], {}, 1))

    def test_ort_ohne_koordinaten_wird_gecacht(self):
        def hole(url):
            if "/location/" in url:
                return ohne_koordinaten()
            return EVENTS if "country][]=DE" in url else LEER
        (termine, _), cache = self.lauf(hole)
        self.assertEqual([(t.lat, t.stadt) for t in termine], [(None, "Berlin")])
        self.assertEqual(cache["radar|" + KUBIZ]["geholt"], "2026-11-01")
        self.assertIsNone(cache["radar|" + KUBIZ]["lat"])

    def test_ort_ohne_koordinaten_nach_30_tagen_neu(self):
        eintrag = radar.ort_kompakt(ohne_koordinaten())
        for geholt, neu_abgerufen in (("2026-10-20", False), ("2026-10-02", True), (None, True)):
            self.urls.clear()
            cache = {"radar|" + KUBIZ: dict(eintrag, **({"geholt": geholt} if geholt else {}))}
            (termine, _), cache = self.lauf(self.fake({"DE": EVENTS}), cache=cache)
            self.assertEqual(any("/location/" in u for u in self.urls), neu_abgerufen, geholt)
            self.assertEqual(termine[0].genau, neu_abgerufen, geholt)  # neu abgerufen hat Koordinaten
            self.assertEqual("geholt" in cache["radar|" + KUBIZ], not neu_abgerufen, geholt)

    def test_veralteter_ort_ohne_budget_bleibt_nutzbar(self):
        cache = {"radar|" + KUBIZ: dict(radar.ort_kompakt(ohne_koordinaten()), geholt="2026-01-01")}
        (termine, _), _ = self.lauf(self.fake({"DE": EVENTS}), cache=cache, budget=0)
        self.assertEqual([t.genau for t in termine], [False])

    def test_events_fehler_wirft(self):
        def hole(url):
            raise OSError("weg")
        with self.assertRaises(OSError):
            self.lauf(hole)

    def test_alles_leer_ist_fehler(self):
        with self.assertRaises(ValueError):
            self.lauf(lambda url: LEER)

    def test_ausserhalb_zeitfenster_holt_keinen_ort(self):
        (termine, _), _ = self.lauf(self.fake({"DE": EVENTS}), heute="2026-11-05")
        self.assertEqual(termine, [])
        self.assertFalse(any("/location/" in u for u in self.urls))

    def test_paging_per_offset_bis_fuenf_seiten(self):
        def hole(url):
            self.urls.append(url)
            if "/location/" in url:
                return LOC
            if "country][]=DE" not in url:
                return LEER
            off = int(url.split("offset=")[1].split("&")[0])
            ereignisse = {str(off + i): dict(EVENTS["result"]["603001"], uuid=f"u{off + i}") for i in range(2)}
            return {"count": 99999, "result": ereignisse}
        (_, stats), _ = self.lauf(hole, limit=2)
        de = [u for u in self.urls if "country][]=DE" in u]
        self.assertEqual(len(de), 5)
        self.assertIn("offset=8", de[-1])
        self.assertEqual(stats["gelesen"]["DE"], 10)

    def test_paging_stoppt_bei_count(self):
        self.lauf(self.fake({"DE": EVENTS}))
        self.assertEqual(len([u for u in self.urls if "country][]=DE" in u]), 1)


if __name__ == "__main__":
    unittest.main()
