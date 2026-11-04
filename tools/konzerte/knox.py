"""KNOX-Punkkonzerte-Feed (RSS) lesen."""
import datetime
import html
import re
import xml.etree.ElementTree as ET

from tools.konzerte.modell import Termin

_LABELS = ("Band(s)", "Datum", "Ort", "Wo", "Webseite", "Email", "Telefon", "Preis", "Sonstiges")
_FELD = re.compile(r"<b>\s*(" + "|".join(re.escape(l) for l in _LABELS) + r")\s*:\s*</b>", re.I)
_TAG = re.compile(r"<[^>]*>")
_HREF = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.I)
_WS = re.compile(r"\s+")

_NL = {"nl", "holland", "niederlande", "netherlands", "the netherlands"}
_BE = {"be", "b", "bl", "belgien", "belgium", "belgique", "belgië", "belgie"}
_DE = {"de", "d", "deutschland", "germany"}
# Bekannte fremde Länder (Kürzel und Namen). Nur das gilt als "X"; unbekannte Zusätze
# wie "(Saale)" oder ", Kreuzberg" gehören zum Ortsnamen.
_FREMD = {"at", "a", "österreich", "austria", "ch", "schweiz", "suisse", "switzerland",
          "fr", "f", "frankreich", "france", "lu", "l", "luxemburg", "luxembourg",
          "pl", "polen", "poland", "cz", "tschechien", "czechia", "czech republic",
          "dk", "dänemark", "denmark", "it", "i", "italien", "italy", "es", "e", "spanien", "spain",
          "uk", "gb", "england", "großbritannien", "united kingdom", "usa", "us",
          "se", "schweden", "sweden", "no", "norwegen", "norway", "fi", "finnland", "finland",
          "hu", "ungarn", "hungary", "si", "slowenien", "slovenia", "pt", "portugal"}


def _land_aus_marker(marker: str) -> str | None:
    """Länderzusatz -> "DE"/"NL"/"BE"/"X"; None, wenn es kein bekannter Länderzusatz ist."""
    m = marker.strip().lower().rstrip(".")
    if m in _NL:
        return "NL"
    if m in _BE:
        return "BE"
    if m in _DE:
        return "DE"
    if m in _FREMD:
        return "X"
    return None


def _bereinige(s: str) -> str:
    return _WS.sub(" ", s).strip()


def zerlege_ort(roh: str) -> tuple[str | None, str, str | None]:
    """Ortsangabe -> (plz, stadt, land). land: DE/NL/BE, "X" = fremd, None = unbekannt."""
    s = _bereinige(roh or "")
    if not s or s.lower() == "unbekannt":
        return None, "", None
    land = None

    m = re.search(r"\(([^()]*)\)\s*$", s)           # "... (NL)"
    if m and _land_aus_marker(m.group(1)):
        land = _land_aus_marker(m.group(1))
        s = _bereinige(s[:m.start()])
    elif "," in s and _land_aus_marker(s.rpartition(",")[2]):   # "Bruges, Belgium"
        kopf, _, rest = s.rpartition(",")
        land = _land_aus_marker(rest)
        s = _bereinige(kopf)
    else:                                           # "Antwerpen BL" – nur eindeutige Kürzel/Namen
        kopf, _, letztes = s.rpartition(" ")
        if kopf and len(letztes.rstrip(".")) > 1 and _land_aus_marker(letztes):
            land = _land_aus_marker(letztes)
            s = _bereinige(kopf)

    m = re.match(r"^([A-Za-z]{1,3})-(\S.*)$", s)    # "CH-Langenthal", aber nicht "Neu-Ulm"
    if m and _land_aus_marker(m.group(1)):
        land = land or _land_aus_marker(m.group(1))
        s = m.group(2)

    plz = None
    m = re.match(r"^(\d{4,5})\s+(.*)$", s)
    if m:
        plz, s = m.group(1), _bereinige(m.group(2))
    if land is None and plz and len(plz) == 5:
        land = "DE"
    return plz, s, land


def _zerlege_datum(roh: str) -> tuple[str, str | None]:
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", roh)
    if not m:
        raise ValueError(f"Datum nicht lesbar: {roh!r}")
    datum = datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()  # ValueError bei 31.13.
    z = re.search(r"\b(\d{1,2})[:.](\d{2})\s*(?:Uhr)?\s*$", roh[m.end():])
    zeit = f"{int(z.group(1)):02d}:{z.group(2)}" if z and int(z.group(1)) < 24 else None
    return datum, zeit


def _felder(beschreibung: str) -> dict[str, str]:
    treffer = list(_FELD.finditer(beschreibung))
    felder: dict[str, str] = {}
    for i, t in enumerate(treffer):
        ende = treffer[i + 1].start() if i + 1 < len(treffer) else len(beschreibung)
        roh = beschreibung[t.end():ende]
        name = next(l for l in _LABELS if l.lower() == t.group(1).lower())
        felder.setdefault(name, roh)
    return felder


def _text(roh: str) -> str:
    """Echte Tags entfernen, dann Entities auflösen (escapte Tags bleiben als Text)."""
    return _bereinige(html.unescape(_TAG.sub(" ", roh)))


def _links(roh: str) -> list[dict]:
    urls = _HREF.findall(roh) or [_text(roh)]
    out = []
    for u in urls:
        u = html.unescape(u).strip()
        if re.match(r"^https?://\S+$", u, re.I):
            out.append({"quelle": "knox", "url": u})
    return out


def lese_feed(xml_text: str) -> list[Termin]:
    """Einträge lesen. Kaputte Einzeleinträge werden übersprungen; gibt es Einträge,
    aber keiner ist lesbar, wird ValueError ausgelöst (Quelle gilt dann als defekt)."""
    root = ET.fromstring(xml_text)
    termine = []
    gesehen = 0
    for item in root.iter("item"):
        gesehen += 1
        try:
            termine.append(_lese_item(item))
        except ValueError:
            continue
    if gesehen and not termine:
        raise ValueError("KNOX-Feed: kein Eintrag lesbar, Format geändert?")
    return termine


def _lese_item(item) -> Termin:
    m = re.search(r"id=(\d+)", item.findtext("guid") or "")
    if not m:
        raise ValueError("keine id")
    f = _felder(item.findtext("description") or "")
    if "Datum" not in f:
        raise ValueError("kein Datum")
    datum, zeit = _zerlege_datum(_text(f["Datum"]))
    band_zeile = html.unescape(_TAG.sub("", f.get("Band(s)", ""))).replace("\u00a0", " ").strip()
    bands, _, zusatz = band_zeile.partition("  ")  # doppeltes Leerzeichen trennt Band und Zusatz
    bands, zusatz = _bereinige(bands), _bereinige(zusatz)
    plz, stadt, land = zerlege_ort(_text(f.get("Ort", "")))
    text = " ".join(x for x in (_text(f.get("Sonstiges", "")), _text(f.get("Preis", ""))) if x)
    return Termin(
        id=f"knox-{m.group(1)}", quelle="knox", datum=datum, zeit=zeit,
        bands=bands, zusatz=zusatz,
        laden=_text(f.get("Wo", "")), plz=plz, stadt=stadt, land=land,
        links=_links(f.get("Webseite", "")), text=text,
    )
