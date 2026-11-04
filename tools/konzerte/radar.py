"""Radar (radar.squat.net): Konzerte der Hausprojekt- und AZ-Szene über die JSON-API lesen.

Die API kennt keine Orte in der Event-Liste, nur Verweise (uuid). Orte kommen einzeln über
/location/<uuid>.json und werden in data/orte.json unter "radar|<uuid>" gemerkt.
Das Tag-Feld heißt in der echten API "topic" (nicht "tags"); beide Namen werden gelesen.
"""
import json
import re
import time
import urllib.error
import urllib.request
from datetime import date

from tools.konzerte.merkmale import RUECKFALL_GENRE, genres, ist_kommerz
from tools.konzerte.modell import Termin
from tools.konzerte.ortung import ABSTAND_SEKUNDEN, LAENDER, USER_AGENT

API = "https://radar.squat.net/api/1.2"
EVENTS_URL = (API + "/search/events.json?facets[country][]={land}&facets[category][]=music-concert"
              "&fields=uuid,title,date_time,offline,category,price,topic,url&limit={limit}&offset={offset}")
ORT_URL = API + "/location/{uuid}.json"
ORTE_BUDGET = 100
SEITEN_JE_LAND = 5
LIMIT = 500
KOORDINATEN_NEU_TAGE = 30
NICHT_VORHANDEN = (404, 410)
FREI_PREISE = ("free", "by donation")
_ZEIT = re.compile(r"^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})")

_letzte_anfrage = 0.0


def radar_json_netz(url):
    """Eine Radar-Abfrage (höchstens eine pro Sekunde, eine Wiederholung). Gibt das JSON zurück."""
    global _letzte_anfrage
    anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    letzter = None
    for _ in range(2):
        time.sleep(max(0.0, _letzte_anfrage + ABSTAND_SEKUNDEN - time.monotonic()))
        _letzte_anfrage = time.monotonic()
        try:
            with urllib.request.urlopen(anfrage, timeout=60) as antwort:
                return json.load(antwort)
        except urllib.error.HTTPError as e:
            if e.code in NICHT_VORHANDEN:  # endgültige Antwort, keine Wiederholung
                raise
            letzter = e
        except Exception as e:
            letzter = e
    raise letzter


def _tags(ereignis):
    """Tag-Namen; die API liefert Objekte mit "name", Fremdformate dürfen auch Strings sein."""
    namen = []
    for feld in ("topic", "tags"):
        for tag in ereignis.get(feld) or []:
            name = tag.get("name") if isinstance(tag, dict) else tag
            if isinstance(name, str):
                namen.append(name)
    return namen


def _genres(ereignis, listen):
    """Passende Radar-Tags, sonst Stichworttreffer im Titel; leer, wenn nur der Rückfall bliebe."""
    treffer = [t for t in dict.fromkeys(_tags(ereignis)) if t in listen["radar_tags"]]
    if treffer:
        return treffer
    stichworte = genres(ereignis.get("title") or "", listen)
    return [] if stichworte == [RUECKFALL_GENRE] else stichworte


def _zeit(ereignis):
    """(Datum, HH:MM) aus dem lokalen Teil des ersten Termins; keine UTC-Umrechnung."""
    eintraege = ereignis.get("date_time") or []
    start = eintraege[0].get("time_start") if eintraege and isinstance(eintraege[0], dict) else None
    treffer = _ZEIT.match(start) if isinstance(start, str) else None
    return treffer.groups() if treffer else None


def _lies_ereignis(ereignis, listen):
    """Alles, was ohne Ort feststeht, oder None, wenn das Event rausfällt (Genre oder Zeit fehlt)."""
    zeit = _zeit(ereignis)
    genre = _genres(ereignis, listen) if zeit else []
    if not genre:
        return None
    titel = (ereignis.get("title") or "").strip()
    url = ereignis.get("url") or ""
    preis = ereignis.get("price")
    return {
        "uuid": ereignis.get("uuid") or "",
        "titel": titel,
        "datum": zeit[0],
        "zeit": zeit[1],
        "genres": genre,
        "frei": isinstance(preis, str) and preis.strip().lower() in FREI_PREISE,
        "kommerz": ist_kommerz([titel, url], listen),
        "url": url if url.startswith(("http://", "https://")) else "",
        "orte": [o["id"] for o in ereignis.get("offline") or [] if isinstance(o, dict) and o.get("id")],
    }


def _zahl(wert):
    try:
        return float(wert)
    except (TypeError, ValueError):
        return None


def ort_kompakt(ort):
    """Location-JSON -> was gebraucht und gecacht wird; ein schon kompakter Ort bleibt unverändert."""
    if "address" not in ort and "map" not in ort:
        return ort
    adresse, karte = ort.get("address") or {}, ort.get("map") or {}
    land = (adresse.get("country") or "").upper()
    return {
        "lat": _zahl(karte.get("lat")),
        "lon": _zahl(karte.get("lon")),
        "plz": adresse.get("postal_code") or None,
        "stadt": adresse.get("locality") or "",
        "land": land or None,
        "laden": adresse.get("name_line") or adresse.get("organisation_name") or ort.get("title") or "",
    }


def _ergebnis(antwort):
    """Das "result"-Feld einer Event-Antwort als dict. Fehlt es oder ist es fremd, hat sich das Format geändert."""
    ergebnis = antwort.get("result") if isinstance(antwort, dict) else None
    if ergebnis is False or ergebnis == []:  # echte API: false bei 0 Treffern (BE hat oft keine), PHP-typisch auch []
        return {}
    if not isinstance(ergebnis, dict):
        raise ValueError("Radar-Antwort ohne result-Objekt")
    return ergebnis


def _hat_koordinaten(ort):
    return ort["lat"] is not None and ort["lon"] is not None


def _waehle_ort(uuids, orte):
    """Erster Ort mit Koordinaten; sonst der erste mit Stadt oder PLZ (wird später wie bei KNOX geortet)."""
    kompakt = [ort_kompakt(orte[u]) for u in uuids if u in orte]
    return next((o for o in kompakt if _hat_koordinaten(o)), next((o for o in kompakt if o["stadt"] or o["plz"]), None))


def lese_radar(events_json, orte, listen):
    """Event-Antwort + Orte (uuid -> Location-JSON) -> Termine.

    Ohne Genre, Zeit oder Ort fällt ein Event raus. Ohne Koordinaten bleibt es mit lat/lon None und
    Adresse stehen (genau=False); Stadt oder PLZ genügen, den Rest erledigt die Ortung.
    """
    termine = []
    for ereignis in _ergebnis(events_json).values():
        e = _lies_ereignis(ereignis, listen)
        ort = _waehle_ort(e["orte"], orte) if e else None
        if not ort:
            continue
        termine.append(Termin(
            id=f"radar-{e['uuid']}", quelle="radar", datum=e["datum"], zeit=e["zeit"],
            bands=e["titel"], zusatz="", laden=ort["laden"], plz=ort["plz"], stadt=ort["stadt"],
            land=ort["land"] if ort["land"] in LAENDER else ("X" if ort["land"] else None),
            lat=ort["lat"], lon=ort["lon"], genau=_hat_koordinaten(ort), genres=e["genres"], frei=e["frei"],
            kommerz=e["kommerz"], links=[{"quelle": "radar", "url": e["url"]}] if e["url"] else []))
    return termine


def _ohne_koordinaten_veraltet(eintrag, heute):
    """Ort ohne Koordinaten wird nach 30 Tagen (oder ohne Abrufdatum) neu abgerufen."""
    if eintrag.get("lat") is not None and eintrag.get("lon") is not None:
        return False
    try:
        return (date.fromisoformat(heute) - date.fromisoformat(eintrag["geholt"])).days >= KOORDINATEN_NEU_TAGE
    except (KeyError, TypeError, ValueError):
        return True


def _hole_land(hole, land, limit, seiten, warnungen):
    """Alle Events eines Landes; Paging über offset, bis count erreicht ist (höchstens `seiten` Seiten)."""
    alle = {}
    for seite in range(seiten):
        antwort = hole(EVENTS_URL.format(land=land, limit=limit, offset=seite * limit))
        seite_ergebnis = _ergebnis(antwort)
        if antwort.get("count") is None and len(seite_ergebnis) >= limit:
            warnungen.append(f"{land}: Antwort ohne count bei voller Seite, Paging kann abgeschnitten sein")
        neu = {k: v for k, v in seite_ergebnis.items() if k not in alle}
        alle.update(neu)
        if not neu or len(alle) >= (antwort.get("count") or 0):
            break
    return alle


def sammle_radar(hole, cache, listen, von, bis, budget=ORTE_BUDGET, limit=LIMIT, seiten=SEITEN_JE_LAND):
    """Events der drei Länder holen, Orte nachladen (Cache, `budget` neue Abrufe) und lesen.

    hole: url -> JSON (Netz ersetzbar). von/bis: ISO-Daten; nur Events dazwischen kosten einen Ortsabruf.
    Rückgabe: (Termine, Zahlen fürs Log). Fehler beim Event-Abruf oder 0 Events insgesamt lösen eine Exception aus.
    """
    ereignisse, gelesen, warnungen = {}, {}, []
    for land in LAENDER:
        je_land = _hole_land(hole, land, limit, seiten, warnungen)
        gelesen[land] = len(je_land)
        ereignisse.update(je_land)
    if not ereignisse:
        raise ValueError("Radar lieferte 0 Events")

    zahlen = {"gelesen": gelesen, "genre_treffer": 0, "im_fenster": 0, "orte_geholt": 0, "orte_fehler": 0,
              "warnungen": warnungen}
    orte = {}
    for ereignis in ereignisse.values():
        e = _lies_ereignis(ereignis, listen)
        if not e:
            continue
        zahlen["genre_treffer"] += 1
        if not von <= e["datum"] <= bis:
            continue
        zahlen["im_fenster"] += 1
        for uuid in e["orte"]:
            schluessel = f"radar|{uuid}"
            alt = cache.get(schluessel) if isinstance(cache.get(schluessel), dict) else None
            if (alt is None or _ohne_koordinaten_veraltet(alt, von)) and budget > 0:
                budget -= 1
                zahlen["orte_geholt"] += 1
                try:
                    neu = ort_kompakt(hole(ORT_URL.format(uuid=uuid)))
                    if neu["lat"] is None or neu["lon"] is None:
                        neu["geholt"] = von
                    cache[schluessel] = neu
                except urllib.error.HTTPError as fehler:
                    if fehler.code in NICHT_VORHANDEN:  # Ort gibt es nicht mehr: Marker, nach 30 Tagen neuer Versuch
                        cache[schluessel] = {"lat": None, "lon": None, "plz": None, "stadt": "", "land": None,
                                             "laden": "", "geholt": von}
                    else:
                        zahlen["orte_fehler"] += 1
                except Exception:
                    zahlen["orte_fehler"] += 1
            if isinstance(cache.get(schluessel), dict):
                orte[uuid] = cache[schluessel]
                if orte[uuid].get("lat") is not None and orte[uuid].get("lon") is not None:
                    break
    termine = lese_radar({"result": ereignisse}, orte, listen)
    if zahlen["im_fenster"] and not termine and zahlen["orte_fehler"]:
        raise ValueError(f"Radar: {zahlen['im_fenster']} passende Events, aber alle Ortsabrufe schlugen fehl "
                         f"({zahlen['orte_fehler']} Fehler)")
    zahlen["behalten"] = len(termine)
    zahlen["ohne_land"] = sum(1 for t in termine if t.land is None)
    return termine, zahlen
