"""Baut data/orte-tabelle.json aus den GeoNames-Postleitzahl-Dumps (DE, NL, BE).

Lizenz: GeoNames, Creative Commons Attribution 4.0 (siehe readme.txt im Download).
Aufruf: python -m tools.konzerte.build_ortstabelle [--nachbearbeiten]
  ohne Flag:        lädt GeoNames und baut die Tabelle neu (inkl. Nachbearbeitung)
  --nachbearbeiten: wendet nur die Nachbearbeitung (Großempfänger entfernen, dann Aliasse)
                    auf die vorhandene Tabelle an; idempotent, ohne Download
"""
import io
import json
import math
import os
import re
import sys
import urllib.request
import zipfile

from tools.konzerte.ortstabelle import basisform, normalisiere

LAENDER = ("DE", "NL", "BE")
URL = "https://download.geonames.org/export/zip/{}.zip"
URL_STAEDTE = "https://download.geonames.org/export/dump/cities1000.zip"  # ebenfalls CC BY 4.0
RADIUS_KM = 15

# Gängige Ortsnamen, die GeoNames nicht führt: (Land, Alias) -> amtlicher Name in der Tabelle.
ALIASE = {
    ("NL", "Den Haag"): "'s-Gravenhage",
    ("NL", "The Hague"): "'s-Gravenhage",
    ("NL", "Den Bosch"): "'s-Hertogenbosch",
    ("BE", "Brussel"): "Bruxelles",
    ("BE", "Brussels"): "Bruxelles",
    ("BE", "Brüssel"): "Bruxelles",
    ("BE", "Antwerp"): "Antwerpen",
    ("BE", "Bruges"): "Brugge",
    ("BE", "Ghent"): "Gent",
    ("BE", "Gand"): "Gent",
    ("BE", "Lüttich"): "Liège",
    ("BE", "Luik"): "Liège",
    ("BE", "Liege"): "Liège",
    ("BE", "Löwen"): "Leuven",
    ("BE", "Louvain"): "Leuven",
    ("DE", "Cologne"): "Köln",
    ("DE", "Munich"): "München",
    ("DE", "Nuremberg"): "Nürnberg",
}
AUSGABE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "orte-tabelle.json")


def lese_zip(land, daten):
    """Liefert [(land, plz, name, lat, lon)] mit je (plz, name) einem gemittelten Eintrag."""
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        text = z.read(land + ".txt").decode("utf-8")
    summen = {}
    for zeile in text.splitlines():
        s = zeile.split("\t")
        if len(s) < 11:
            continue
        plz, name = s[1].strip(), s[2].strip()
        if land == "NL":
            plz = plz[:4]  # nur PC4
        if not plz or not name:
            continue
        try:
            lat, lon = float(s[9]), float(s[10])
        except ValueError:
            continue
        eintrag = summen.setdefault((plz, name), [0.0, 0.0, 0])
        eintrag[0] += lat
        eintrag[1] += lon
        eintrag[2] += 1
    return [
        [land, plz, name, round(a / n, 3), round(b / n, 3)]
        for (plz, name), (a, b, n) in sorted(summen.items())
    ]


def lese_staedte(daten):
    """cities1000: {(land, normalisierter Name): [(lat, lon, einwohner)]} (Name, ASCII-Name, Alternativnamen)."""
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        text = z.read("cities1000.txt").decode("utf-8")
    index = {}
    for zeile in text.splitlines():
        s = zeile.split("	")
        if len(s) < 15 or s[8] not in LAENDER:
            continue
        try:
            eintrag = (float(s[4]), float(s[5]), int(s[14] or 0))
        except ValueError:
            continue
        namen = {s[1], s[2], *s[3].split(",")}
        for n in {normalisiere(x) for x in namen if x}:
            index.setdefault((s[8], n), []).append(eintrag)
    return index


def _km(lat1, lon1, lat2, lon2):
    dx = (lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
    return 111.2 * math.hypot(lat2 - lat1, dx)


def einwohner(zeile, staedte):
    """Einwohner des gleichnamigen cities1000-Orts im selben Land innerhalb 15 km, sonst 0."""
    land, _, name, lat, lon = zeile[:5]
    beste = 0
    for n in {normalisiere(name), normalisiere(basisform(name))}:
        for slat, slon, pop in staedte.get((land, n), ()):
            if pop > beste and _km(lat, lon, slat, slon) <= RADIUS_KM:
                beste = pop
    return beste


def wende_aliase_an(orte, aliase=None):
    """Hängt je Alias eine Zeile an: Kopie der Zielzeile mit den meisten Einwohnern (Gleichstand: erste),
    nur der Name ist der Alias. Existiert der Alias (normalisiert) im Land schon, wird er übersprungen.
    Fehlt das Ziel, wird eine Ausnahme geworfen (sonst bliebe Datendrift unbemerkt). Ändert `orte` in place."""
    for (land, alias), ziel in (ALIASE if aliase is None else aliase).items():
        vorhandene = {normalisiere(z[2]) for z in orte if z[0] == land}
        if normalisiere(alias) in vorhandene:
            continue
        kandidaten = [z for z in orte if z[0] == land and z[2] == ziel]
        if not kandidaten:
            raise ValueError("Alias-Ziel fehlt in der Ortstabelle: %s %s (für %s)" % (land, ziel, alias))
        beste = kandidaten[0]
        for z in kandidaten[1:]:
            if (z[5] if len(z) > 5 else 0) > (beste[5] if len(beste) > 5 else 0):
                beste = z
        orte.append([beste[0], beste[1], alias, *beste[3:]])
    return orte


# --- Großempfänger ---------------------------------------------------------------------------
# GeoNames führt für Firmen und Behörden mit eigener Postleitzahl (Großempfänger) den Namen des
# Empfängers als "Ort". Solche Zeilen gehören nicht in die Ortssuche.

# Rechtsformen: Groß-/Kleinschreibung zählt ("SE" nur groß; "eG", "mbH" exakt so).
_RECHTSFORMEN = re.compile(
    r"(?<![\w])(?:"
    r"AG|SE|KG|KGaA|OHG|GbR|UG|eG|eK|e\.\s?K\.|e\.\s?V\.|eV|"  # Kürzel
    r"g?GmbH|GMBH|mbH|LLP|SAS|SRL|GmbH&Co|Co\.?\s?KG|Co\.|Inc\.?|Ltd\.?|S\.A\.|B\.V\.|"
    r"Aktiengesellschaft|Gesellschaft|Handelsgesellschaft|Stiftung"
    r")(?![\w])|&\s?Co|u\.\s?Co"
)

# Firmen-/Behördenwörter, ohne Rücksicht auf Groß-/Kleinschreibung. Das Wort darf am Ende eines
# Kompositums stehen (Volksbank, Kreissparkasse, Universitätsklinikum), aber nicht am Anfang eines
# anderen Worts: "Bankholzen" bleibt, "Postbauer-Heng" bleibt.
_WOERTER_ENDE = (
    "bank", "sparkasse", "versicherung", "versicherungen", "finanzamt", "verlag", "verlagsgesellschaft",
    "ministerium", "bundesamt", "landesamt", "landratsamt", "bezirksamt", "amtsgericht", "landgericht",
    "staatsanwaltschaft", "polizeipräsidium", "regierungspräsidium", "justizvollzugsanstalt",
    "kreisverwaltung", "stadtverwaltung", "gemeindeverwaltung", "hauptverwaltung", "behörde",
    "krankenkasse", "gesundheitskasse", "krankenversicherung", "rentenversicherung", "familienkasse",
    "berufsgenossenschaft", "handelskammer", "rundfunk", "stadtwerke", "klinikum", "krankenhaus",
    "kliniken", "universität", "universitätsklinikum", "universitätsbibliothek", "hochschule",
    "holding", "niederlassung", "zweigniederlassung", "zentrale", "geschäftsstelle", "filiale",
    "zustellstützpunkt", "postfach", "versand", "logistik", "telekom",
    "gericht", "kammer", "kasse", "amt", "landtag", "regierung", "magistrat", "landrat", "ordinariat",
    "klinik", "rechtsanwälte", "bundeswehr", "verwaltung", "landeshauptstadt", "landkreis",
    "hansestadt", "bezirksdirektion", "dienststelle", "referat", "abteilung", "redaktion", "studio",
    "lotterieeinnahme", "lotterie-einnahme", "gruppe",
)
_WOERTER_ENDE_RE = re.compile(r"(?<![\w])\w*(?:" + "|".join(_WOERTER_ENDE) + r")(?![\w])", re.IGNORECASE)

# Ganze Wörter (keine Komposita), Groß-/Kleinschreibung egal.
_WOERTER_GANZ_RE = re.compile(
    r"(?<![\w])(?:service|services|center|centre|marketing|management|systems|solutions|group|"
    r"international|europe|germany|deutschland|brief|agentur|arbeit|direktion|regionaldirektion|"
    r"abt\.|institut|zeitung|medien|konzern|werke|vertrieb|kundenservice|postbank|"
    r"aok|bkk|ikk|dak|barmer|adac|huk|zdf|ard|rbb|swr|wdr|ndr|bmw|amazon|ikea|partner|"
    r"deutsche|deutscher|deutsches|deutschen|post)(?![\w])",
    re.IGNORECASE,
)


# Echte Gemeinden, die auf ein Behördenwort enden und deshalb nie als Großempfänger gelten.
_ORTE_AUSNAHMEN = {"freiamt", "freigericht", "linsengericht", "maikammer", "hohenkammer"}

# Interne Kennungen wie "KS-542" oder "BMGMT-603".
_KENNUNG_RE = re.compile(r"^[A-Z]{2,6}-\d{3}$")


def ist_grossempfaenger(name):
    """True, wenn der Ortsname eher eine Firma/Behörde (Großempfänger-Postleitzahl) als ein Ort ist."""
    if name.strip().lower() in _ORTE_AUSNAHMEN:
        return False
    if _KENNUNG_RE.match(name) or _RECHTSFORMEN.search(name):
        return True
    if _WOERTER_ENDE_RE.search(name):
        return True
    return bool(_WOERTER_GANZ_RE.search(name))


def entferne_grossempfaenger(orte):
    """Löscht DE-Zeilen mit Firmen-/Behördennamen (in place). Sicherheitsnetz: Ein Name, den eine Zeile
    desselben Landes mit Einwohnern > 0 trägt (also ein cities1000-Ort, die Einwohner stammen von dort),
    bleibt immer erhalten. Andere Länder bleiben unberührt (NL/BE haben solche Zeilen nicht)."""
    echte = {(z[0], normalisiere(z[2])) for z in orte if len(z) > 5 and z[5] > 0}
    behalten = [
        z for z in orte
        if z[0] != "DE" or (z[0], normalisiere(z[2])) in echte or not ist_grossempfaenger(z[2])
    ]
    orte[:] = behalten
    return orte


def nachbearbeiten(orte, aliase=None):
    """Gemeinsamer Nachbearbeitungsschritt für Vollbau und --nachbearbeiten: erst Großempfänger
    entfernen, dann Aliasse ergänzen (Aliasziele sind Orte, nie Großempfänger). Idempotent."""
    entferne_grossempfaenger(orte)
    wende_aliase_an(orte, aliase)
    return orte


def schreibe(orte, pfad):
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    with open(pfad, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"quelle": "GeoNames (CC BY 4.0)", "orte": orte}, f, ensure_ascii=False, separators=(",", ":"))
    print(pfad, os.path.getsize(pfad), "Bytes")


def nachbearbeite_datei():
    """Wendet die Nachbearbeitung auf die vorhandene Tabelle an (idempotent, ohne Download)."""
    pfad = os.path.normpath(AUSGABE)
    with open(pfad, encoding="utf-8") as f:
        daten = json.load(f)
    vorher = len(daten["orte"])
    nachbearbeiten(daten["orte"])
    print(vorher, "->", len(daten["orte"]), "Zeilen")
    schreibe(daten["orte"], pfad)


def hole(url):
    anfrage = urllib.request.Request(url, headers={"User-Agent": "FuckOffFashion-Konzerte/1.0"})
    with urllib.request.urlopen(anfrage, timeout=120) as antwort:
        return antwort.read()


def main():
    if "--nachbearbeiten" in sys.argv[1:]:
        nachbearbeite_datei()
        return
    staedte = lese_staedte(hole(URL_STAEDTE))
    orte = []
    for land in LAENDER:
        zeilen = lese_zip(land, hole(URL.format(land)))
        for z in zeilen:
            z.append(einwohner(z, staedte))
        print(land, len(zeilen), "Einträge")
        orte.extend(zeilen)
    nachbearbeiten(orte)
    schreibe(orte, os.path.normpath(AUSGABE))


if __name__ == "__main__":
    main()
