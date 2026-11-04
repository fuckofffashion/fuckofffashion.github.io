"""Tägliches Abholskript: Quellen holen, orten, Merkmale bestimmen, JSON schreiben.

Aufruf: python -m tools.konzerte.abholen [--knox-datei PFAD] [--heute YYYY-MM-DD]
        [--ohne-nominatim] [--ohne-radar] [--daten ORDNER] [--tabelle PFAD]
"""
import argparse
import json
import os
import re
import sys
import tempfile
import urllib.request
from datetime import date, datetime, timedelta

from tools.konzerte import knox, radar
from tools.konzerte.merkmale import genres, ist_frei, ist_kommerz, lade_listen
from tools.konzerte.ortstabelle import Ortstabelle
from tools.konzerte.ortung import LAENDER, USER_AGENT, Ortung, nominatim_suche

FENSTER_TAGE = 180
NOMINATIM_BUDGET = 300
CACHE_SPEICHERN_ALLE = 50
ABGESAGT = re.compile(r"(?<!\w)(abgesagt|cancelled|canceled)(?!\w)", re.I)
AUSFALL_TAGE_BIS_FEHLER = 2  # dritter kaputter Tag in Folge
KNOX_URL = "https://knox.p-u-n-k.de/db/feed.php?datum_von={von}&datum_bis={bis}"
QUELLEN = [
    {"id": "knox", "name": "Knox Punkkonzerte Datenbank", "url": "https://knox.p-u-n-k.de/db/"},
    {"id": "radar", "name": "Radar – radar.squat.net", "url": "https://radar.squat.net/"},
]


def log(text):
    print(text, flush=True)


def tt_mm_jjjj(tag):
    return tag.strftime("%d.%m.%Y")


def hole_knox_netz(von, bis):
    """Eine Abfrage mit einer Wiederholung. Gibt den XML-Text zurück."""
    anfrage = urllib.request.Request(
        KNOX_URL.format(von=tt_mm_jjjj(von), bis=tt_mm_jjjj(bis)), headers={"User-Agent": USER_AGENT})
    letzter = None
    for _ in range(2):
        try:
            with urllib.request.urlopen(anfrage, timeout=60) as antwort:
                return antwort.read().decode("utf-8")
        except Exception as e:
            letzter = e
    raise letzter


def lies_json(pfad, vorgabe):
    try:
        with open(pfad, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return vorgabe


def schreibe_json(pfad, daten, kompakt):
    """Atomar: erst in eine Temp-Datei im selben Ordner, dann ersetzen."""
    ordner = os.path.dirname(os.path.abspath(pfad))
    os.makedirs(ordner, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=ordner, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            if kompakt:
                json.dump(daten, f, ensure_ascii=False, separators=(",", ":"))
            else:
                json.dump(daten, f, ensure_ascii=False, indent=1)
            f.write("\n")
        os.replace(temp, pfad)
    except BaseException:
        if os.path.exists(temp):
            os.remove(temp)
        raise


def ist_abgesagt(t):
    return ABGESAGT.search(f"{t.bands} {t.zusatz}") is not None


def runde(d):
    for k in ("lat", "lon"):
        if d[k] is not None:
            d[k] = round(d[k], 4)
    return d


def merkmale_setzen(t, listen):
    text = " ".join(x for x in (t.bands, t.zusatz, t.text) if x)
    t.genres = genres(text, listen)
    t.frei = ist_frei(text, listen)
    t.kommerz = ist_kommerz([text] + [l["url"] for l in t.links], listen)


def hole_quelle_knox(heute, bis, knox_datei, hole_knox):
    """Quelle KNOX: Rückgabe Liste von Termin. Fehler, Parse-Fehler und 0 Items lösen eine Exception aus."""
    if knox_datei:
        with open(knox_datei, encoding="utf-8") as f:
            xml_text = f.read()
    elif hole_knox:
        xml_text = hole_knox()
    else:
        xml_text = hole_knox_netz(heute, bis)
    termine = knox.lese_feed(xml_text)
    if not termine:
        raise ValueError("Feed enthält 0 Termine")
    return termine




def hole_quelle_radar(heute, bis, listen, cache, hole_radar):
    """Quelle Radar: Rückgabe Liste von Termin (schon geortet, Genres gesetzt). Fehler lösen eine Exception aus."""
    termine, z = radar.sammle_radar(hole_radar or radar.radar_json_netz, cache, listen,
                                    heute.isoformat(), bis.isoformat())
    gelesen = ", ".join(f"{land} {n}" for land, n in z["gelesen"].items())
    log(f"radar: gelesen {gelesen}; mit Genre {z['genre_treffer']}, im Zeitfenster {z['im_fenster']}")
    log(f"radar: {z['orte_geholt']} Orte abgerufen ({z['orte_fehler']} Fehler), {z['behalten']} Termine mit Ort")
    for warnung in z["warnungen"]:
        log(f"WARNUNG radar: {warnung}")
    if z["ohne_land"]:
        log(f"radar: {z['ohne_land']} Termine ohne Land in der Adresse")
    return termine


def alte_termine(vorher, quelle, heute_s):
    """Termine einer Quelle aus dem letzten Lauf, ohne Vergangenes."""
    return [t for t in vorher.get("termine", []) if t.get("quelle") == quelle and t.get("datum", "") >= heute_s]


def ist_geortet(t):
    return t.lat is not None and t.land in LAENDER


def main(argv=None, hole_knox=None, hole_radar=None):
    for strom in (sys.stdout, sys.stderr):
        if hasattr(strom, "reconfigure"):
            strom.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(prog="abholen")
    p.add_argument("--knox-datei")
    p.add_argument("--heute")
    p.add_argument("--ohne-nominatim", action="store_true")
    p.add_argument("--ohne-radar", action="store_true")
    p.add_argument("--daten", default="data")
    p.add_argument("--tabelle", default="data/orte-tabelle.json")
    args = p.parse_args(argv)

    heute = date.fromisoformat(args.heute) if args.heute else date.today()
    bis = heute + timedelta(days=FENSTER_TAGE)
    heute_s, bis_s = heute.isoformat(), bis.isoformat()
    konzerte_pfad = os.path.join(args.daten, "konzerte.json")
    orte_pfad = os.path.join(args.daten, "orte.json")
    status_pfad = os.path.join(args.daten, "quellen-status.json")

    vorher = lies_json(konzerte_pfad, {})
    status = lies_json(status_pfad, {})
    cache = lies_json(orte_pfad, {})
    listen = lade_listen()
    vorher_ohne_ort = vorher.get("ohne_ort_je_quelle", {})
    holer = {
        "knox": lambda: hole_quelle_knox(heute, bis, args.knox_datei, hole_knox),
        "radar": lambda: hole_quelle_radar(heute, bis, listen, cache, hole_radar),
    }
    uebersprungen = {"radar"} if args.ohne_radar else set()

    # Jede Quelle für sich: frische Termine, bei Ausfall die vom letzten erfolgreichen Lauf.
    frisch, ausgabe, ohne_ort_je, neuer_status, ausfaelle = [], [], {}, {}, []
    for quelle in QUELLEN:
        qid = quelle["id"]
        alt = status.get(qid) or {}
        if qid in uebersprungen:
            log(f"{qid}: übersprungen, Termine vom letzten Lauf behalten")
        else:
            try:
                termine = holer[qid]()
                log(f"{qid}: {len(termine)} Termine gelesen")
                frisch += termine
                ohne_ort_je[qid] = 0
                neuer_status[qid] = {"ok_am": heute_s, "fehler_seit": None}
                continue
            except Exception as e:
                fehler = f"{type(e).__name__}: {e}"
                log(f"WARNUNG {qid}: {fehler}")
        ausgabe += alte_termine(vorher, qid, heute_s)
        ohne_ort_je[qid] = vorher_ohne_ort.get(qid, 0)
        log(f"{qid}: {sum(1 for t in ausgabe if t.get('quelle') == qid)} Termine vom letzten erfolgreichen Lauf behalten")
        if qid in uebersprungen:
            if alt:
                neuer_status[qid] = alt
            continue
        fehler_seit = alt.get("fehler_seit") or heute_s
        neuer_status[qid] = {"ok_am": alt.get("ok_am"), "fehler_seit": fehler_seit}
        if (heute - date.fromisoformat(fehler_seit)).days >= AUSFALL_TAGE_BIS_FEHLER:
            ausfaelle.append((qid, fehler_seit))

    nominatim_anfragen = 0
    if frisch:
        gesamt = len(frisch)
        termine = sorted((t for t in frisch if heute_s <= t.datum <= bis_s), key=lambda t: t.datum)
        log(f"Zeitfenster {heute_s} bis {bis_s}: {len(termine)} von {gesamt} Terminen")
        im_fenster = len(termine)
        termine = [t for t in termine if not ist_abgesagt(t)]
        log(f"Abgesagt entfernt: {im_fenster - len(termine)}")
        tabelle = Ortstabelle.laden(args.tabelle)

        def hole(abfrage):
            nonlocal nominatim_anfragen
            nominatim_anfragen += 1
            if nominatim_anfragen % CACHE_SPEICHERN_ALLE == 0:
                schreibe_json(orte_pfad, cache, kompakt=False)
            return nominatim_suche(abfrage)

        ortung = Ortung(cache, tabelle, hole, heute, 0 if args.ohne_nominatim else NOMINATIM_BUDGET)
        for t in termine:
            if t.lat is None:  # Radar kommt mit Koordinaten, KNOX nur mit Ortsangabe
                ortung.orte(t)
            if not t.genres:
                merkmale_setzen(t, listen)
        if ortung.fehler:
            log(f"WARNUNG nominatim: {ortung.fehler}")
        brauchbar = [t for t in termine if ist_geortet(t)]
        for t in termine:
            if t.land != "X" and not ist_geortet(t):
                ohne_ort_je[t.quelle] += 1
        ausgabe += [runde(t.to_dict()) for t in brauchbar]
        genau = sum(1 for t in brauchbar if t.genau)
        log(f"Geortet: {genau} genau, {len(brauchbar) - genau} über die Ortstabelle, {sum(ohne_ort_je.values())} ohne Ort")
        log(f"Nominatim-Anfragen: {nominatim_anfragen}")
    ausgabe.sort(key=lambda d: (d["datum"], d["zeit"] or "", d["stadt"]))
    schreibe_json(orte_pfad, cache, kompakt=False)

    stand = datetime.now().astimezone().isoformat(timespec="seconds")
    schreibe_json(konzerte_pfad,
                  {"stand": stand, "quellen": QUELLEN, "termine": ausgabe, "ohne_ort": sum(ohne_ort_je.values()),
                   "ohne_ort_je_quelle": ohne_ort_je}, kompakt=True)
    schreibe_json(status_pfad, neuer_status, kompakt=False)
    log(f"{len(ausgabe)} Termine geschrieben nach {konzerte_pfad}")

    for qid, fehler_seit in ausfaelle:
        log(f"FEHLER {qid}: seit {fehler_seit} ohne Daten")
    return 1 if ausfaelle else 0


if __name__ == "__main__":
    sys.exit(main())
