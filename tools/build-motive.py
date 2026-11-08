"""Schreibt die Motiv-Blöcke in index.html und en/index.html aus tools/motive.json neu.

Zwei Blöcke, jeweils zwischen Markern:
  <!-- motive:wand:start … -->      … <!-- motive:wand:end -->      Filterleiste + Wand (Sektion #wand)
  <!-- motive:designer:start … -->  … <!-- motive:designer:end -->  Filterleiste + Motivwahl (Sektion #tragen)

Die Seite bleibt statisches HTML: ohne JavaScript sind alle Motive sichtbar, die
Filterleisten tragen `hidden` und werden erst von js/motive.js eingeblendet.

Aufruf (im Ordner site):
  python tools/build-motive.py            beide Seiten neu schreiben
  python tools/build-motive.py --pruefen  nur prüfen, Exit 1 wenn eine Seite veraltet ist

Englisch: je Motiv titel_en und alt_en, je Gruppe name_en (Pflicht, sonst ValueError).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from html import escape
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[1]
DATEN = WURZEL / "tools" / "motive.json"
INDEX = WURZEL / "index.html"
INDEX_EN = WURZEL / "en" / "index.html"
SEITEN = {"de": INDEX, "en": INDEX_EN}
TYPEN = {"line", "color", "solid"}

# Feste Texte je Sprache. img: Pfad zu den Bildern von der jeweiligen Seite aus.
TEXTE = {
    "de": {"img": "assets/img/", "alle": "Alle", "png_laden": "↓ PNG laden", "schwarz": "↓ Schwarz", "weiss": "↓ Weiß",
           "hell_dunkel": "für helle und dunkle Textilien", "hell": "für helle Textilien", "dunkel": "für dunkle Textilien",
           "wand_label": "Motive nach Thema filtern", "designer_label": "Rückenmotive nach Thema filtern", "nr": "Nr."},
    "en": {"img": "../assets/img/", "alle": "All", "png_laden": "↓ Get PNG", "schwarz": "↓ Black", "weiss": "↓ White",
           "hell_dunkel": "for light and dark fabrics", "hell": "for light fabrics", "dunkel": "for dark fabrics",
           "wand_label": "Filter designs by topic", "designer_label": "Filter back designs by topic", "nr": "No."},
}
HINWEIS = "erzeugt von tools/build-motive.py aus tools/motive.json, nicht von Hand ändern"


def a(text: str) -> str:
    """Attributwert/Text maskieren; Anführungszeichen „…“ bleiben, nur & < > " werden ersetzt."""
    return escape(text, quote=True).replace("&#x27;", "'")


def feld(obj: dict, name: str, sp: str) -> str:
    """Text in der Sprache sp: Deutsch aus name, Englisch aus name_en."""
    return obj[name] if sp == "de" else obj[f"{name}_en"]


def lade(pfad: Path = DATEN) -> dict:
    daten = json.loads(pfad.read_text(encoding="utf-8"))
    pruefe_daten(daten)
    return daten


def pruefe_daten(daten: dict) -> None:
    """Bricht mit ValueError ab, wenn die Liste nicht stimmig ist (lieber hier als auf der Seite)."""
    ids = [g["id"] for g in daten["gruppen"]]
    for g in daten["gruppen"]:
        if not str(g.get("name_en") or "").strip():
            raise ValueError(f"Gruppe {g['id']}: name_en fehlt (englische Seite)")
    for gid in ids:
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", gid):
            raise ValueError(f"Gruppen-ID {gid!r}: nur a-z, 0-9 und Bindestrich (landet in #motive-{gid})")
    if len(set(ids)) != len(ids):
        raise ValueError("Gruppen-IDs doppelt")
    nrs = [m["nr"] for m in daten["motive"]]
    if len(set(nrs)) != len(nrs):
        raise ValueError("Motiv-Nummern doppelt")
    for m in daten["motive"]:
        if m["typ"] not in TYPEN:
            raise ValueError(f"Motiv {m['nr']}: typ {m['typ']!r} unbekannt, erlaubt: {sorted(TYPEN)}")
        for g in m["gruppen"]:
            if g not in ids:
                raise ValueError(f"Motiv {m['nr']}: Gruppe {g!r} steht nicht in 'gruppen'")
        noetig = ("schwarz", "weiss") if m["typ"] == "line" else ("png",)
        for k in noetig:
            if k not in m["groesse"]:
                raise ValueError(f"Motiv {m['nr']}: groesse.{k} fehlt")
        if m["typ"] == "color" and "download" not in m:
            raise ValueError(f"Motiv {m['nr']}: download (Dateiname beim Laden) fehlt")
        for k in ("titel_en", "alt_en"):
            if not str(m.get(k) or "").strip():
                raise ValueError(f"Motiv {m['nr']}: {k} fehlt (englische Seite)")
        if m["designer"] and m["typ"] != "line" and "maske" not in m:
            raise ValueError(f"Motiv {m['nr']}: maske fehlt")
    start = daten["designer_start"]
    if start not in [m["nr"] for m in daten["motive"] if m["designer"]]:
        raise ValueError(f"designer_start {start!r} ist kein Motiv der Motivwahl")


def gruppen_attr(m: dict) -> str:
    return f' data-gruppen="{" ".join(m["gruppen"])}"' if m["gruppen"] else ""


def filterleiste(daten: dict, motive: list[dict], einzug: str, *, ziel: str, label: str, hash_: bool, sp: str) -> list[str]:
    """Knöpfe Alle + jede Gruppe, die in dieser Liste mindestens ein Motiv hat."""
    benutzt = {g for m in motive for g in m["gruppen"]}
    attr = ' data-hash' if hash_ else ""
    zeilen = [f'{einzug}<div class="motivfilter js-motivfilter" role="group" aria-label="{a(label)}" '
              f'aria-controls="{ziel}"{attr} hidden>',
              f'{einzug}  <button class="motivfilter__knopf" type="button" data-gruppe="" aria-pressed="true">{TEXTE[sp]["alle"]}</button>']
    for g in daten["gruppen"]:
        if g["id"] in benutzt:
            zeilen.append(f'{einzug}  <button class="motivfilter__knopf" type="button" data-gruppe="{g["id"]}" '
                          f'aria-pressed="false">{a(feld(g, "name", sp))}</button>')
    zeilen.append(f"{einzug}</div>")
    zeilen.append(f'{einzug}<p class="visually-hidden js-motivfilter-live" aria-live="polite"></p>')
    return zeilen


def plakat(m: dict, sp: str) -> list[str]:
    e = " " * 8
    tx = TEXTE[sp]
    d, t = tx["img"] + m["datei"], a(feld(m, "titel", sp))
    line = m["typ"] != "color"
    bild = f"{d}-schwarz-1024.webp" if m["typ"] == "line" else f"{d}-1024.webp"
    z = [f'{e}<figure class="poster js-poster"{gruppen_attr(m)}>',
         f'{e}  <span class="tape"></span><span class="tape"></span>',
         f'{e}  <img class="poster__img{" poster__img--line" if line else ""}" src="{bild}" '
         f'width="{m["breite"]}" height="{m["hoehe"]}" loading="lazy"',
         f'{e}       alt="{a(feld(m, "alt", sp))}">']
    # Dateigrößen: Englisch mit Dezimalpunkt (2.1 MB)
    g = m["groesse"] if sp == "de" else {k: v.replace(",", ".") for k, v in m["groesse"].items()}
    if m["typ"] == "color":
        z.append(f'{e}  <a class="poster__dl" href="{d}.png" download="{a(m["download"])}">{tx["png_laden"]} '
                 f'<span class="visually-hidden">: {t}, {g["png"]}</span></a>')
    elif m["typ"] == "solid":
        z += [f'{e}  <div class="poster__dls">',
              f'{e}    <a class="poster__dl" href="{d}.png" download>↓ PNG '
              f'<span class="visually-hidden">: {t}, {tx["hell_dunkel"]}, {g["png"]}</span></a>',
              f'{e}  </div>']
    else:
        z += [f'{e}  <div class="poster__dls">',
              f'{e}    <a class="poster__dl" href="{d}-schwarz.png" download>{tx["schwarz"]} '
              f'<span class="visually-hidden">: {t}, {tx["hell"]}, {g["schwarz"]}</span></a>',
              f'{e}    <a class="poster__dl poster__dl--alt" href="{d}-weiss.png" download>{tx["weiss"]} '
              f'<span class="visually-hidden">: {t}, {tx["dunkel"]}, {g["weiss"]}</span></a>',
              f'{e}  </div>']
    z += [f'{e}  <figcaption class="poster__meta"><span class="poster__title">{t}</span>'
          f'<span class="poster__no">{tx["nr"]} {m["nr"]} · PNG</span></figcaption>',
          f"{e}</figure>"]
    return z


def thumb(m: dict, start: str, sp: str) -> list[str]:
    e = " " * 14
    d, t = TEXTE[sp]["img"] + m["datei"], a(feld(m, "titel", sp))
    attrs = f'name="motiv" value="{m["nr"]}" data-title="{t}" data-type="{m["typ"]}"'
    if m["typ"] == "line":
        attrs += (f' data-black="{d}-schwarz-1024.webp" data-white="{d}-weiss-1024.webp"'
                  f' data-png-black="{d}-schwarz.png" data-png-white="{d}-weiss.png"')
        bild = f"{d}-schwarz-1024.webp"
    else:
        attrs += f' data-src="{d}-1024.webp" data-png="{d}.png" data-mask="{"true" if m["maske"] else "false"}"'
        bild = f"{d}-1024.webp"
    if m["nr"] == start:
        attrs += " checked"
    return [f'{e}<label class="tr__thumb"{gruppen_attr(m)}><input type="radio" {attrs}>',
            f'{e}  <img src="{bild}" alt="" loading="lazy"><span class="visually-hidden">{TEXTE[sp]["nr"]} {m["nr"]}: {t}</span></label>']


def block_wand(daten: dict, sp: str) -> list[str]:
    motive = daten["motive"]
    z = filterleiste(daten, motive, " " * 6, ziel="wand-motive", label=TEXTE[sp]["wand_label"], hash_=True, sp=sp)
    z.append('      <div class="wall grid" id="wand-motive">')
    for m in motive:
        z += plakat(m, sp)
    z.append("      </div>")
    return z


def block_designer(daten: dict, sp: str) -> list[str]:
    motive = [m for m in daten["motive"] if m["designer"]]
    z = filterleiste(daten, motive, " " * 12, ziel="tr-motive", label=TEXTE[sp]["designer_label"], hash_=False, sp=sp)
    z.append('            <div class="tr__thumbs" id="tr-motive">')
    for m in motive:
        z += thumb(m, daten["designer_start"], sp)
    z.append("            </div>")
    return z


BLOECKE = {"wand": block_wand, "designer": block_designer}


def ersetze(html: str, daten: dict, sp: str = "de") -> str:
    """Ersetzt den Inhalt zwischen den Markern; Zeilenende (LF/CRLF) wie in der Datei."""
    nl = "\r\n" if "\r\n" in html else "\n"
    for name, bau in BLOECKE.items():
        muster = re.compile(
            rf"(?P<kopf>[ \t]*<!-- motive:{name}:start[^>]*-->[ \t]*\r?\n)(?P<inhalt>.*?)(?P<fuss>[ \t]*<!-- motive:{name}:end -->)",
            re.S)
        treffer = muster.findall(html)
        if len(treffer) != 1:
            raise ValueError(f"Seite {sp}: Marker motive:{name}:start/end {len(treffer)}-mal gefunden, erwartet 1")
        inhalt = nl.join(bau(daten, sp)) + nl
        html = muster.sub(lambda mt: mt["kopf"] + inhalt + mt["fuss"], html)
    return html


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
                print(f"{name} ist veraltet: python tools/build-motive.py ausführen", file=sys.stderr)
                veraltet = 1
            else:
                print(f"{name} passt zu tools/motive.json")
        elif neu != alt:
            with seite.open("w", encoding="utf-8", newline="") as f:
                f.write(neu)
            print(f"{name} neu geschrieben")
        else:
            print(f"{name} war schon aktuell")
    return veraltet


if __name__ == "__main__":
    sys.exit(main())
