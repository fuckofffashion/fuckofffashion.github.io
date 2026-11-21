"""Schreibt die Bandplakate aus tools/bands.json in bands.html und en/bands.html.

Block zwischen den Markern (nicht von Hand ändern):
  <!-- bands:plakate:start … --> … <!-- bands:plakate:end -->

Aufruf:
  python tools/build-bands.py            schreibt beide Seiten neu
  python tools/build-bands.py --pruefen  schreibt nichts, Exit 1 wenn eine Seite veraltet ist

Termine stehen nicht im HTML; die füllt js/bands/app.js aus data/bands.json.
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
DATEN = WURZEL / "tools" / "bands.json"
SEITEN = {"de": WURZEL / "bands.html", "en": WURZEL / "en" / "bands.html"}
LOGOS = WURZEL / "assets" / "img" / "bands"

TEXTE = {
    "de": {"img": "assets/img/bands/", "termine": "Termine auf der Konzertseite", "konzerte": "konzerte.html",
           "web": "Website von {name}", "web_hinweis": "öffnet die Seite der Band",
           "pogo": "POGO zu {name}", "pogo_hinweis": "Browserspiel mit einem Song der Band"},
    "en": {"img": "../assets/img/bands/", "termine": "Gigs on the concert page", "konzerte": "konzerte.html",
           "web": "{name} website", "web_hinweis": "opens the band's site",
           "pogo": "POGO to {name}", "pogo_hinweis": "browser game with one of the band's songs"},
}


def a(text: str) -> str:
    return html.escape(str(text), quote=True)


def lade(pfad: Path = DATEN) -> dict:
    with pfad.open(encoding="utf-8") as f:
        return json.load(f)


def masse(logo: str) -> tuple[int, int]:
    """Breite und Höhe einer WebP-Datei aus dem Dateikopf (ohne PIL, das im Workflow fehlt)."""
    kopf = (LOGOS / logo).read_bytes()[:30]
    if kopf[:4] != b"RIFF" or kopf[8:12] != b"WEBP":
        raise ValueError(f"{logo}: keine WebP-Datei")
    art = kopf[12:16]
    if art == b"VP8X":
        return 1 + int.from_bytes(kopf[24:27], "little"), 1 + int.from_bytes(kopf[27:30], "little")
    if art == b"VP8L":
        bits = int.from_bytes(kopf[21:25], "little")
        return 1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF)
    if art == b"VP8 ":
        return int.from_bytes(kopf[26:28], "little") & 0x3FFF, int.from_bytes(kopf[28:30], "little") & 0x3FFF
    raise ValueError(f"{logo}: unbekanntes WebP-Format {art!r}")


def plakat(b: dict, sp: str) -> list[str]:
    t = TEXTE[sp]
    breite, hoehe = masse(b["logo"])
    klasse = "plakat" + (f" plakat--{a(b['plakat'])}" if b.get("plakat") else "")
    beschreibung = (b.get("beschreibung") or {}).get(sp, "")
    pogo = ([f'    <p class="plakat__pogo"><a class="btn" href="pogo.html?song={a(b["pogo"])}">'
             f'{a(t["pogo"].format(name=b["name"]))}<span class="visually-hidden"> ({t["pogo_hinweis"]})</span></a></p>']
            if b.get("pogo") else [])
    return [
        f'<article class="{klasse}" id="band-{a(b["id"])}" data-band="{a(b["id"])}">',
        f'  <button class="plakat__reiss" type="button" aria-expanded="false" aria-controls="zettel-{a(b["id"])}">',
        f'    <img class="plakat__logo" src="{t["img"]}{a(b["logo"])}" alt="{a(b["name"])}" width="{breite}" height="{hoehe}" loading="lazy" decoding="async">',
        f'    <span class="plakat__text">{a(beschreibung)}</span>',
        '    <span class="plakat__naechst js-naechst"></span>',
        '  </button>',
        f'  <div class="plakat__zettel" id="zettel-{a(b["id"])}">',
        f'    <div class="js-termine"><p><a href="{t["konzerte"]}">{t["termine"]}</a></p></div>',
        f'    <p class="plakat__web"><a class="scrawl" href="{a(b["web"])}" rel="noopener" target="_blank">'
        f'{a(t["web"].format(name=b["name"]))}<span class="visually-hidden"> ({t["web_hinweis"]})</span></a></p>',
        *pogo,
        '  </div>',
        '</article>',
    ]


def block(daten: dict, sp: str) -> list[str]:
    zeilen = []
    for b in sorted(daten["bands"], key=lambda x: x["name"].casefold()):
        zeilen += plakat(b, sp)
    return zeilen


def ersetze(text: str, daten: dict, sp: str = "de") -> str:
    nl = "\r\n" if "\r\n" in text else "\n"
    muster = re.compile(r"(?P<kopf>(?P<einzug>[ \t]*)<!-- bands:plakate:start[^>]*-->[ \t]*\r?\n)(?P<inhalt>.*?)"
                        r"(?P<fuss>[ \t]*<!-- bands:plakate:end -->)", re.S)
    treffer = list(muster.finditer(text))
    if len(treffer) != 1:
        raise ValueError(f"Seite {sp}: Marker bands:plakate:start/end {len(treffer)}-mal gefunden, erwartet 1")
    einzug = treffer[0]["einzug"]
    inhalt = nl.join(einzug + z for z in block(daten, sp)) + nl
    return muster.sub(lambda m: m["kopf"] + inhalt + m["fuss"], text)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--pruefen", action="store_true", help="nichts schreiben, Exit 1 wenn eine Seite veraltet ist")
    args = p.parse_args(argv)
    daten = lade()
    veraltet = 0
    for sp, seite in SEITEN.items():
        name = seite.relative_to(WURZEL).as_posix()
        with seite.open(encoding="utf-8", newline="") as f:
            alt = f.read()
        neu = ersetze(alt, daten, sp)
        if args.pruefen:
            if neu != alt:
                print(f"{name} ist veraltet: python tools/build-bands.py ausführen", file=sys.stderr)
                veraltet = 1
            else:
                print(f"{name} passt zu tools/bands.json")
        elif neu != alt:
            with seite.open("w", encoding="utf-8", newline="") as f:
                f.write(neu)
            print(f"{name} neu geschrieben")
        else:
            print(f"{name} war schon aktuell")
    return veraltet


if __name__ == "__main__":
    sys.exit(main())
