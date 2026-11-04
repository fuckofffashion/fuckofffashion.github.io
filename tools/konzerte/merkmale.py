"""Merkmale eines Termins: Genres, freier Eintritt, Kommerz-Anbieter."""
import json
import os
import re

RUECKFALL_GENRE = "Punk / Hardcore (allgemein)"


def lade_listen(pfad=None):
    pfad = pfad or os.path.join(os.path.dirname(os.path.abspath(__file__)), "listen.json")
    with open(pfad, encoding="utf-8") as f:
        return json.load(f)


def _trifft(text, stichwort):
    """Ganzes Wort, ohne Groß-/Kleinschreibung; "ska" trifft nicht "Skandal"."""
    stichwort = stichwort.strip().lower()
    if not stichwort:
        return False
    return re.search(r"(?<!\w)" + re.escape(stichwort) + r"(?!\w)", text.lower()) is not None


def genres(text, listen):
    treffer = [name for name, woerter in listen["genres"].items() if any(_trifft(text, w) for w in woerter)]
    return treffer or [RUECKFALL_GENRE]


def ist_frei(text, listen):
    return any(_trifft(text, w) for w in listen["frei"])


def ist_kommerz(texte_und_links, listen):
    """Domain-Teilstring in einer URL, Mail oder einem Text."""
    gross = " ".join(texte_und_links).lower()
    return any(anbieter in gross for anbieter in listen["kommerz"])
