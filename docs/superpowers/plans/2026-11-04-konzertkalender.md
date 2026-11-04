# Konzertkalender mit Karte – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine eigene Seite `konzerte.html` zeigt Punk-, Ska- und Hardcore-Konzerte aus KNOX (später auch Radar) in DE, NL und BE. Die Treffer erscheinen als Liste und auf einer Copyshop-Karte, mit Umkreis-, Datums- und Genre-Filter und dem frechen Ton der Seite. Die Daten aktualisiert ein Skript einmal täglich auf Codeberg.

**Architecture:**
- Ein Python-Skript (nur Standardbibliothek) holt die Quellen, ortet die Läden (Cache → Nominatim → GeoNames-Ortstabelle), bestimmt Genre, „frei“ und „Kommerz“ und schreibt `data/konzerte.json`.
- Die Seite lädt diese Datei und filtert im Browser. Kleine ES-Module ohne Abhängigkeiten, rechnende Teile mit `node --test` getestet.
- Die Karte ist ein eigenes SVG aus Natural-Earth-Grenzen (`data/karte.json`). Im Browser gibt es keine fremden Server.
- Codeberg Forgejo Actions startet das Skript täglich und schiebt die Seite in ein separates Pages-Repo.

**Tech Stack:**
- Python 3 (stdlib, `unittest`)
- Vanilla JS (ES-Module), Node 22 `node --test` für JS-Tests
- SVG, das bestehende CSS-Design-System (`css/tokens.css`, `css/base.css`)
- Playwright-MCP für Browserprüfungen, Lighthouse 12
- Codeberg Pages und Forgejo Actions

**Spec:** `docs/superpowers/specs/2026-11-04-konzertkalender-design.md`

## Global Constraints

- **Gebiet:** nur DE, NL, BE. Termine aus anderen Ländern verwirft das Skript.
- **Zeitfenster:** heute bis heute + 180 Tage, Vergangenes fliegt raus.
- **Quellen nur vom Skript abfragen, nie vom Browser.**
  - Im Browser gibt es beim normalen Benutzen keine Anfragen an fremde Hosts (keine Kacheln, kein Geocoding, kein CDN).
  - Einzige Ausnahme ist der Route-Link „Hinkommen“ zu openstreetmap.org, den der Besucher selbst anklickt.
- **Standort:** Geolocation nur auf Knopfdruck, Berechnung im Browser. Der Standort wird nie gesendet und nie gespeichert. In `localStorage` dürfen nur Umkreisstufe, Genre und Schalter stehen.
- **Nominatim:** höchstens 1 Anfrage pro Sekunde. User-Agent `FuckOffFashion-Konzerte/1.0 (+https://fuckofffashion.example/konzerte.html)`, keine private Mailadresse. Höchstens 300 neue Abfragen pro Lauf. „Nicht gefunden“ wird gecacht und frühestens nach 30 Tagen erneut versucht.
- **Quellenangaben sichtbar unter Karte und Liste, wörtlich:**
  - „Konzerttermine bereitgestellt von Knox Punkkonzerte Datenbank“ → `https://knox.p-u-n-k.de/db/`
  - „Radar – radar.squat.net“ → `https://radar.squat.net/`
  - „Kartendaten: Natural Earth (gemeinfrei)“
  - „Orte: GeoNames (CC BY 4.0)“ → `https://www.geonames.org/`
  - „Ortung der Läden © OpenStreetMap-Mitwirkende“ → `https://www.openstreetmap.org/copyright`
- **Umkreisstufen:** Laufweite 5 km, Fahrradweite 25 km, Bahnweite 100 km (Standard), Bandbus-Weite 300 km.
- **Genre-Rückfall:** `"Punk / Hardcore (allgemein)"`. Übernommene Radar-Tags: „Punk / Hardcore / Crust“, „Ska / Reggae“, „Grind Dbeat Death“.
- **Kommerz-Startliste:** eventim, ticketmaster, livenation, myticket, ticketcorner, oeticket. Der Schalter „Kommerz ausblenden“ steht standardmäßig auf **aus**.
- **Feste Texte:**
  - „Wir empfehlen dir nichts. Du entscheidest.“
  - „Du bist hier. Leider.“
  - „Riecht nach Konzern“
  - „Genres raten wir. Wenn's nicht passt: Pogo trotzdem.“
  - „Heute nix. Geh Sticker kleben.“
  - „Kein Konzert im Umkreis? Dann mach eins. Keller, Garage, drei Leute mit Instrumenten.“ (mit Link `https://knox.p-u-n-k.de/db/neu.php`)
- **Rot:** `#ff1a1a`. Reduzierte Bewegung heißt keine animierten Kartenübergänge und kein Sprühen der Marker.
- **Python nur mit Standardbibliothek. JS ohne Abhängigkeiten.** Pfade in Befehlen mit Forward-Slash.
- **Cache-Version:** Nach CSS/JS-Änderungen wird `?v=` in allen HTML-Dateien hochgezählt, beginnend mit `v=13`.
- **Startseite:** Lighthouse mobil Performance darf nicht unter 91 fallen. Vor der Messung laufen keine Clip-Vorschauen und andere Lastprozesse.
- **Fremde Texte** (Bandnamen, Sonstiges) werden nur als Text eingesetzt (`textContent`), nie als HTML.

## Review Focus

1. **Wilde Ortsangaben bei KNOX:**
   - Bei „Bruges, Belgium“, „2020 Antwerpen BL“, „Kortrijk (BE)“, „6525 Nijmegen (Holland)“ und „Amsterdam“ erwartet man das richtige Land.
   - „CH-Langenthal“, „1030 Wien  (Austria)“ und „unbekannt“ müssen rausfallen bzw. als „ohne Ort“ gezählt werden.
   - Test in Task 2.
2. **Datumsgrenzen:**
   - Ein Konzert am letzten Tag eines Von–bis-Zeitraums gehört dazu.
   - Radar-Zeiten mit `+01:00` dürfen nicht über UTC auf den Vortag rutschen.
   - Tests in Task 2, Task 5 und Task 11.
3. **Kein Standort:**
   - Geolocation verweigert oder PLZ nicht gefunden: verständlicher Hinweis, die Seite bleibt mit eingetipptem Ort benutzbar, kein Absturz.
   - Tests in Task 6 und Task 7.
4. **Quelle tot oder Format geändert:**
   - Termine vom Vortag bleiben stehen, der Lauf endet mit 0.
   - Ab dem dritten kaputten Tag in Folge endet der Lauf mit 1.
   - Test in Task 4.
5. **HTML in Bandnamen:** `<script>` oder `&amp;` in Bands/Sonstiges erscheinen als Text, nicht als Code. Test in Task 7.

---

## Datei-Landkarte

```
tools/konzerte/
  __init__.py
  listen.json              # pflegbar: Genre-Stichwörter, Radar-Tags, Kommerz-Domains, Frei-Wörter
  modell.py                # Termin (dataclass) + to_dict()
  knox.py                  # KNOX-Feed → Rohtermine, Ort-Zerlegung, Länder-Erkennung
  ortstabelle.py           # GeoNames-Tabelle laden, PLZ-/Namenssuche
  ortung.py                # Cache data/orte.json, Nominatim mit Budget, Rückfall Tabelle
  merkmale.py              # genres(), ist_frei(), ist_kommerz()
  radar.py                 # (Task 11) Radar-API → Rohtermine
  zusammenfuehren.py       # (Task 12) Dubletten
  abholen.py               # CLI: alles zusammen, schreibt data/konzerte.json, Quellenstatus
  build_ortstabelle.py     # einmalig: GeoNames DE/NL/BE → data/orte-tabelle.json
  build_karte.py           # einmalig: Natural Earth → data/karte.json
  tests/
    fixtures/knox-feed.xml, radar-events.json, radar-location.json
    test_knox.py, test_ortstabelle.py, test_ortung.py, test_merkmale.py,
    test_abholen.py, test_radar.py, test_zusammenfuehren.py
data/
  konzerte.json  orte.json  orte-tabelle.json  karte.json  quellen-status.json
js/konzerte/
  geo.js  filter.js  einheiten.js  leer.js  ortssuche.js  karte.js  app.js
tests/js/
  geo.test.mjs  filter.test.mjs  einheiten.test.mjs  leer.test.mjs  ortssuche.test.mjs  karte.test.mjs
konzerte.html
css/konzerte.css
.forgejo/workflows/konzerte.yml     (Task 15)
tools/veroeffentlichen.sh           (Task 15)
```

Tests laufen mit:
- Python: `python -m unittest discover -s tools/konzerte/tests -t .` (aus `D:/claude/fof/site`)
- JS: `node --test tests/js/`

---

## Meilenstein 1: Dünner Durchstich (KNOX → JSON → Liste mit Umkreis und Datum)

### Task 1: Ortstabelle DE/NL/BE

**Files:**
- Create: `tools/__init__.py`, `tools/konzerte/__init__.py`, `tools/konzerte/tests/__init__.py` (alle leer, damit `python -m tools.konzerte.…` und `unittest discover` importieren können), `tools/konzerte/build_ortstabelle.py`, `tools/konzerte/ortstabelle.py`
- Create: `data/orte-tabelle.json` (Ergebnis des Build-Skripts, wird committet)
- Test: `tools/konzerte/tests/test_ortstabelle.py`

**Interfaces:**
- Produces:
  - `data/orte-tabelle.json`: `{"quelle": "GeoNames (CC BY 4.0)", "orte": [[land, plz, name, lat, lon], ...]}`. Koordinaten auf 3 Nachkommastellen, je PLZ+Name ein Eintrag; NL nur PC4 (vier Ziffern).
  - `Ortstabelle.laden(pfad: str) -> Ortstabelle`
  - `Ortstabelle.nach_plz(land: str, plz: str) -> tuple[float, float] | None`: Mittelwert aller Einträge mit dieser PLZ.
  - `Ortstabelle.nach_name(name: str, land: str | None = None) -> tuple[str, float, float] | None`: gibt `(land, lat, lon)` zurück. Vergleich normalisiert (klein, ohne Akzente, „ß“→„ss“, Bindestriche/Leerzeichen gleich). Ohne `land` gilt die Reihenfolge DE, NL, BE.
  - `normalisiere(text: str) -> str` (auch von anderen Modulen benutzt)

- [ ] **Step 1: Write the failing test** (`test_ortstabelle.py`, gegen eine kleine Inline-Tabelle über `Ortstabelle([...])`, nicht gegen die echte Datei)

```python
def test_plz_de(self):    self.assertAlmostEqual(t.nach_plz("DE", "89077")[0], 48.39, delta=0.05)
def test_plz_nl(self):    self.assertIsNotNone(t.nach_plz("NL", "6525"))
def test_name_ohne_land_findet_nl(self): self.assertEqual(t.nach_name("Amsterdam")[0], "NL")
def test_name_mit_akzent(self): self.assertEqual(t.nach_name("Liege", "BE")[0], "BE")   # Tabelle enthält „Liège“
def test_name_unbekannt(self): self.assertIsNone(t.nach_name("Wien"))
def test_normalisiere(self): self.assertEqual(normalisiere("Mönchen-Gladbach"), normalisiere("monchen gladbach"))
```

- [ ] **Step 2:** `python -m unittest tools.konzerte.tests.test_ortstabelle -v` → FAIL (Modul fehlt)
- [ ] **Step 3: Implement `ortstabelle.py`** mit den Signaturen oben. Index als zwei Dicts: `(land, plz)` und `normalisierter Name → [(land, lat, lon)]`.
- [ ] **Step 4: Implement `build_ortstabelle.py`:**
  - Lädt `https://download.geonames.org/export/zip/DE.zip`, `NL.zip` und `BE.zip` (Spalten: country, postal code, place name, …, latitude, longitude) und schreibt `data/orte-tabelle.json`.
  - Vorher prüfen, dass die GeoNames-Lizenzseite CC BY 4.0 nennt; das Ergebnis kommt in die Commit-Message.
  - Lauf: `python -m tools.konzerte.build_ortstabelle` → Datei existiert, Größe unter 1,5 MB.
- [ ] **Step 5:** Tests laufen grün. Stichprobe: `python -c "from tools.konzerte.ortstabelle import Ortstabelle as O; t=O.laden('data/orte-tabelle.json'); print(t.nach_name('Kleve'), t.nach_plz('BE','2000'))"` gibt zwei Treffer aus.
- [ ] **Step 6: Commit** `feat(konzerte): Ortstabelle DE/NL/BE aus GeoNames`

### Task 2: KNOX-Feed lesen

**Files:**
- Create: `tools/konzerte/modell.py`, `tools/konzerte/knox.py`, `tools/konzerte/tests/fixtures/knox-feed.xml`
- Test: `tools/konzerte/tests/test_knox.py`

**Interfaces:**
- Consumes: `Ortstabelle.nach_name()` (Task 1)
- Produces:
  - `@dataclass Termin`. Felder: `id: str, quelle: str, datum: str (YYYY-MM-DD), zeit: str|None, bands: str, zusatz: str, laden: str, plz: str|None, stadt: str, land: str|None, lat: float|None, lon: float|None, genau: bool, genres: list[str], frei: bool, kommerz: bool, links: list[dict], text: str (Sonstiges+Preis, intern)`. Dazu `to_dict()`, das `text` weglässt.
  - `zerlege_ort(roh: str) -> tuple[str|None, str, str|None]`: `(plz, stadt, land)`. `land` ist "DE"/"NL"/"BE", `"X"` für erkannt fremd, `None` für unbekannt.
  - `lese_feed(xml_text: str) -> list[Termin]` (noch ohne Koordinaten, Genre, Merkmale).
- Länder-Erkennung, Reihenfolge:
  1. Zusatz in Klammern oder am Ende („Holland“, „Niederlande“, „NL“ → NL; „Belgien“, „Belgium“, „BE“, „BL“ → BE). Jeder andere Länderzusatz oder ein Präfix wie `CH-` → "X".
  2. Fünfstellige PLZ ohne Zusatz → DE.
  3. Sonst `None`; das Land klärt dann die Ortung über den Namen.
  4. Leer oder „unbekannt“ → stadt `""`.
- **Fixture** `knox-feed.xml`: gültiges RSS 2.0 mit 8 `<item>`s im echten KNOX-Format. Vorbild ist der Eintrag „Mother's Cake / Roxy / 89077 Ulm“ mit `guid …index.php?id=651450`. Die Orte:
  - „89077 Ulm“
  - „6525 Nijmegen (Holland)“
  - „Kortrijk (BE)“
  - „2020 Antwerpen BL“
  - „Hamburg“
  - „1030 Wien  (Austria)“
  - „unbekannt“
  - „CH-Langenthal“

  Ein Eintrag hat `<b>Preis:</b> Eintritt frei`, einer `<b>Sonstiges:</b>` mit `<script>alert(1)</script>`, einer einen Webseiten-Link auf `https://www.eventim.de/…`.

- [ ] **Step 1: Write the failing test**

```python
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

def test_feed(self):
    t = lese_feed(FIXTURE)
    self.assertEqual(len(t), 8)
    roxy = next(x for x in t if x.id == "knox-651450")
    self.assertEqual((roxy.datum, roxy.laden, roxy.plz, roxy.stadt), ("2026-11-03", "Roxy", "89077", "Ulm"))
    self.assertEqual(roxy.links[0], {"quelle": "knox", "url": "http://www.roxy.ulm.de/"})
    self.assertIn("<script>", next(x for x in t if "<script>" in x.text).text)   # roh behalten, escapen macht die Seite
```

- [ ] **Step 2:** Test läuft → FAIL
- [ ] **Step 3: Implement `zerlege_ort` und `lese_feed`.**
  - `xml.etree` für Items. Die Felder stehen im `description`-HTML als `<b>Name:</b> Wert<br />`; per Regex auf die Labels Band(s), Datum, Ort, Wo, Webseite, Email, Preis, Sonstiges.
  - HTML-Entities mit `html.unescape` auflösen, Tags in Werten entfernen; Text in `Sonstiges` bleibt inhaltlich erhalten.
  - `bands`/`zusatz`: Die Bandzeile wird an doppelten Leerzeichen getrennt („Mother's Cake  Fall 2026“ → bands „Mother's Cake“, zusatz „Fall 2026“).
  - `id`: `knox-<id aus guid>`.
- [ ] **Step 4:** Tests grün
- [ ] **Step 5: Commit** `feat(konzerte): KNOX-Feed lesen`

### Task 3: Ortung mit Cache, Nominatim-Budget und Tabellen-Rückfall

**Files:**
- Create: `tools/konzerte/ortung.py`
- Test: `tools/konzerte/tests/test_ortung.py`

**Interfaces:**
- Consumes: `Termin`, `Ortstabelle`
- Produces:
  - `class Ortung(cache: dict, tabelle: Ortstabelle, hole: Callable[[str], list[dict]], heute: date, budget: int = 300)`
    - `hole` ist die Nominatim-Suche: Abfrage → Liste von `{"lat","lon"}`. Im Test wird sie ersetzt.
  - `Ortung.orte(t: Termin) -> Termin`: setzt `lat, lon, genau, land` und gibt den Termin zurück; `lat` bleibt `None`, wenn nichts klappt.
  - `Ortung.cache` (für das Speichern)
  - `nominatim_suche(abfrage: str) -> list[dict]`: echte Funktion, `urllib`, User-Agent aus den Global Constraints, `countrycodes=de,nl,be`, schläft vor jeder Anfrage so, dass höchstens 1/s rausgeht.
  - Cache-Format `data/orte.json`: `{"<land>|<norm stadt>|<norm laden>": {"lat":…, "lon":…} | {"nicht_gefunden": "YYYY-MM-DD"}}`
- Reihenfolge in `orte()`:
  1. Hat der Termin `land == "X"`, bleibt `lat` `None`, ohne Abfrage.
  2. Cache-Treffer.
  3. Nominatim mit `"<laden>, <plz> <stadt>"`, solange Budget übrig und der Eintrag nicht „nicht gefunden“ jünger als 30 Tage ist. Ergebnis in den Cache, `genau=True`.
  4. Tabelle: erst `nach_plz(land, plz)`, dann `nach_name(stadt, land)`; das setzt auch ein fehlendes `land`. `genau=False`.

- [ ] **Step 1: Write the failing test**

```python
def test_cache_vor_nominatim(self):      # hole darf nicht aufgerufen werden
def test_budget(self):                   # budget=1, zwei neue Läden → hole genau 1×, zweiter via Tabelle, genau=False
def test_nicht_gefunden_30_tage(self):   # Cache "nicht_gefunden" vor 10 Tagen → kein hole; vor 31 Tagen → hole
def test_ausland_x(self):                # land "X" → lat None, hole nie aufgerufen
def test_land_aus_tabelle(self):         # Termin "Amsterdam", land None, hole liefert [] → land "NL", genau False
def test_nichts_gefunden(self):          # stadt "" → lat None
```

- [ ] **Step 2:** FAIL
- [ ] **Step 3: Implement** wie oben
- [ ] **Step 4:** grün
- [ ] **Step 5: Commit** `feat(konzerte): Ortung mit Cache und Budget`

### Task 4: Merkmale und Abholskript

**Files:**
- Create: `tools/konzerte/listen.json`, `tools/konzerte/merkmale.py`, `tools/konzerte/abholen.py`
- Test: `tools/konzerte/tests/test_merkmale.py`, `tools/konzerte/tests/test_abholen.py`

**Interfaces:**
- Consumes: `lese_feed`, `Ortung`, `Ortstabelle`, `nominatim_suche`
- Produces:
  - `listen.json`: `{"genres": {"Ska / Reggae": ["ska","reggae","rocksteady"], "Oi!": ["oi!"," oi "], "Hardcore": ["hardcore","hc"], "Crust / D-Beat": ["crust","d-beat","dbeat"], "Psychobilly / Rockabilly": ["psychobilly","rockabilly"], "Punk": ["punk"]}, "radar_tags": ["Punk / Hardcore / Crust","Ska / Reggae","Grind Dbeat Death"], "kommerz": ["eventim","ticketmaster","livenation","myticket","ticketcorner","oeticket"], "frei": ["eintritt frei","free entry","spende","soli","umsonst","kostenlos","by donation","free"]}`
  - `genres(text: str, listen) -> list[str]`: Wortgrenzen-Treffer, ohne Treffer `["Punk / Hardcore (allgemein)"]`.
  - `ist_frei(text: str, listen) -> bool`
  - `ist_kommerz(texte_und_links: list[str], listen) -> bool`: Domain-Teilstring in einer URL oder Mail.
  - `abholen.main(argv) -> int`, CLI `python -m tools.konzerte.abholen [--knox-datei PFAD] [--heute YYYY-MM-DD] [--ohne-nominatim] [--daten ORDNER]` (`--daten` Standard `data/`, Tests zeigen auf ein tmp-Verzeichnis)
  - Schreibt:
    - `data/konzerte.json` im Format der Spec (`stand`, `quellen`, `termine`, dazu `"ohne_ort": <Anzahl>`), nur Termine mit `lat` und mit `land` in DE/NL/BE, sortiert nach Datum.
    - `data/orte.json`
    - `data/quellen-status.json`: `{"knox": {"ok_am": "YYYY-MM-DD", "fehler_seit": null | "YYYY-MM-DD"}}`
  - KNOX-Abruf: `https://knox.p-u-n-k.de/db/feed.php?datum_von=<heute tt.mm.jjjj>&datum_bis=<heute+180>`
- Fehlerregel:
  - Schlägt eine Quelle fehl (Netz oder 0 Items oder Parse-Fehler), bleiben ihre Termine aus der vorigen `konzerte.json` stehen, soweit nicht vergangen. `fehler_seit` wird gesetzt, Exit 0, Log-Zeile `WARNUNG knox: …`.
  - Ist `fehler_seit` 2 oder mehr Tage vor heute, also der dritte Tag in Folge: Exit 1.

- [ ] **Step 1: Write the failing tests**

```python
# test_merkmale.py
def test_genre_ska(self):      self.assertEqual(genres("The Toasters  45 Years in Ska", L), ["Ska / Reggae"])
def test_genre_rueckfall(self): self.assertEqual(genres("Mother's Cake  Fall 2026", L), ["Punk / Hardcore (allgemein)"])
def test_kein_teilwort(self):  self.assertNotIn("Ska / Reggae", genres("Skandal im Sperrbezirk", L))
def test_frei(self):           self.assertTrue(ist_frei("Preis: Eintritt frei", L))
def test_kommerz(self):        self.assertTrue(ist_kommerz(["https://www.eventim.de/event/x"], L))
def test_kein_kommerz(self):   self.assertFalse(ist_kommerz(["http://www.roxy.ulm.de/"], L))

# test_abholen.py  (tmp-Verzeichnis, --knox-datei auf die Fixture, --ohne-nominatim, --heute 2026-11-01)
def test_schreibt_json(self):  # konzerte.json existiert; nur DE/NL/BE mit lat; kein Wien, kein Langenthal; ohne_ort >= 1
def test_zeitfenster(self):    # --heute 2026-11-04 → Termin vom 03.11. fehlt
def test_quelle_tot_behaelt_alte(self):  # vorige konzerte.json mit Termin 2026-12-01, Abruf wirft → Termin noch da, Exit 0, fehler_seit gesetzt
def test_dritter_tag_exit_1(self):       # fehler_seit = heute-2 → Exit 1
```

- [ ] **Step 2:** FAIL
- [ ] **Step 3: Implement** `merkmale.py`, dann `abholen.py`. `text` für die Merkmale = Bandzeile + Zusatz + Sonstiges + Preis; für Kommerz zusätzlich alle Links und Mails.
- [ ] **Step 4:** alle Python-Tests grün: `python -m unittest discover -s tools/konzerte/tests -t . -v`
- [ ] **Step 5: Echter Lauf**
  - `python -m tools.konzerte.abholen > data/abholen.log 2>&1` mit Timeout 15 min und Log in Datei (CLAUDE.md).
  - Erwartet:
    - Exit 0
    - `data/konzerte.json` unter 300 KB gzip: `python -c "import gzip;print(len(gzip.compress(open('data/konzerte.json','rb').read())))"`
    - Im Log höchstens 300 Nominatim-Abfragen
- [ ] **Step 6: Commit** `feat(konzerte): Merkmale und Abholskript` (inklusive `data/konzerte.json`, `data/orte.json`, `data/quellen-status.json`; `data/abholen.log` in `.gitignore`)

### Task 5: JS-Kern: Entfernung, Filter, Szene-Einheiten, Leerstellen

**Files:**
- Create: `js/konzerte/geo.js`, `js/konzerte/filter.js`, `js/konzerte/einheiten.js`, `js/konzerte/leer.js`
- Test: `tests/js/geo.test.mjs`, `tests/js/filter.test.mjs`, `tests/js/einheiten.test.mjs`, `tests/js/leer.test.mjs`

**Interfaces:**
- Consumes: Termin-Objekte aus `data/konzerte.json` (Task 4)
- Produces:
  - `geo.js`: `export function km(a: {lat,lon}, b: {lat,lon}): number`. Haversine, R = 6371.0088.
  - `filter.js`:
    - `export function filtern(termine, {mitte, radiusKm, von, bis, genre, nurFrei, ohneKommerz}): Array<termin & {km: number|null}>`
      - `von`/`bis` sind `"YYYY-MM-DD"`-Strings, beide inklusive, Vergleich als String.
      - Ohne `mitte` gibt es keinen Umkreisfilter und `km` ist `null`.
      - `genre` `null` heißt alle.
    - `export function sortieren(liste, nach: "datum"|"entfernung")`: bei gleicher Entfernung nach Datum.
  - `einheiten.js`:
    - `export const STUFEN = [{id:"lauf",km:5,label:"Laufweite"},{id:"rad",km:25,label:"Fahrradweite"},{id:"bahn",km:100,label:"Bahnweite"},{id:"bus",km:300,label:"Bandbus-Weite"}]`
    - `export function anfahrt(km): string`
      - Modus und Tempo nach Entfernung: bis 5 km Fußweg mit 5 km/h, bis 25 km Rad mit 15 km/h, bis 100 km Bahn mit 70 km/h, darüber Bandbus mit 80 km/h.
      - Minuten / 40 = Platten, auf halbe Platten gerundet, mindestens 0,5.
      - Wörter: 0,5 → „eine halbe Platte“, 1 → „eine Platte“, 1,5 → „anderthalb Platten“, sonst „<n mit Komma> Platten“.
      - Format: `"<gerundete km> km · <Platten> lang <Fußweg|Rad|Bahn|Bandbus>"`.
  - `leer.js`: `export const SPRUECHE = [...]` (mindestens die zwei aus den Global Constraints plus 4 eigene im selben Ton), `export function spruch(n: number): string` (deterministisch `SPRUECHE[n % länge]`).

- [ ] **Step 1: Write the failing tests**

```js
// geo.test.mjs
assert.ok(Math.abs(km({lat:50.9375,lon:6.9603},{lat:51.2277,lon:6.7735}) - 34.81) < 0.1);   // Köln–Düsseldorf
assert.ok(Math.abs(km({lat:51.8126,lon:5.8372},{lat:51.7883,lon:6.1387}) - 20.91) < 0.1);   // Nijmegen–Kleve

// filter.test.mjs
// Termine: A 2026-11-10 Kleve, B 2026-11-15 Nijmegen (frei), C 2026-11-15 Köln (kommerz), D 2026-12-01 Antwerpen
filtern(T, {mitte: KLEVE, radiusKm: 25})              // → A, B (C 92 km, D raus)
filtern(T, {von: "2026-11-15", bis: "2026-11-15"})    // → B, C (bis inklusive)
filtern(T, {nurFrei: true})                           // → B
filtern(T, {ohneKommerz: true}).map(t=>t.id)          // enthält nicht C
filtern(T, {}).every(t => t.km === null)              // true
sortieren(filtern(T,{mitte:KLEVE,radiusKm:300}),"entfernung")[0].id  // "A"

// einheiten.test.mjs
assert.equal(anfahrt(47), "47 km · eine Platte lang Bahn");
assert.equal(anfahrt(4),  "4 km · eine Platte lang Fußweg");
assert.equal(anfahrt(20), "20 km · 2 Platten lang Rad");
assert.equal(anfahrt(250),"250 km · 4,5 Platten lang Bandbus");
assert.equal(anfahrt(1),  "1 km · eine halbe Platte lang Fußweg");

// leer.test.mjs
assert.ok(SPRUECHE.includes("Heute nix. Geh Sticker kleben."));
assert.equal(spruch(SPRUECHE.length), SPRUECHE[0]);
```

- [ ] **Step 2:** `node --test tests/js/` → FAIL
- [ ] **Step 3: Implement** die vier Module
- [ ] **Step 4:** `node --test tests/js/` → PASS
- [ ] **Step 5: Commit** `feat(konzerte): JS-Kern Filter, Entfernung, Szene-Einheiten`

### Task 6: Ortssuche im Browser

**Files:**
- Create: `js/konzerte/ortssuche.js`
- Test: `tests/js/ortssuche.test.mjs`

**Interfaces:**
- Consumes: `data/orte-tabelle.json` (Task 1)
- Produces: `export function sucheOrt(tabelle: {orte: Array<[land,plz,name,lat,lon]>}, eingabe: string, max = 8): Array<{land, plz, name, lat, lon}>`
  - Eingabe aus Ziffern: PLZ-Präfix.
  - Eingabe aus Text: Namens-Präfix, normalisiert wie Python-`normalisiere` (klein, ohne Akzente, ß→ss).
  - Je Name+Land nur ein Treffer. Leere oder unbekannte Eingabe gibt `[]`.

- [ ] **Step 1: Write the failing test** (`T` ist eine kleine Inline-Tabelle mit Kleve 47533 DE, Nijmegen 6525 NL, Liège 4000 BE)

```js
sucheOrt(T, "4753").length > 0            // DE-PLZ-Präfix
sucheOrt(T, "nijm")[0].land === "NL"
sucheOrt(T, "liege")[0].name === "Liège"
sucheOrt(T, "").length === 0
sucheOrt(T, "xyzzy").length === 0
```

- [ ] **Step 2:** FAIL · **Step 3:** implementieren · **Step 4:** PASS
- [ ] **Step 5: Commit** `feat(konzerte): Ortssuche`

### Task 7: Seite `konzerte.html` mit Liste, Umkreis, Datum (ohne Karte)

**Files:**
- Create: `konzerte.html`, `css/konzerte.css`, `js/konzerte/app.js`
- Modify: Navigation in `index.html` (Zeilen ~62–67), `404.html`, `impressum.html`, `datenschutz.html`, `styleguide.html`. Dort kommt `<a class="scrawl" href="konzerte.html">Konzerte</a>` hinzu (in `404.html` mit `/konzerte.html`).
- Modify: `?v=12` → `?v=13` in allen HTML-Dateien
- Test: Playwright-Prüfung (Schritte unten)

**Interfaces:**
- Consumes: `filtern`, `sortieren`, `STUFEN`, `anfahrt`, `spruch`, `sucheOrt`, `data/konzerte.json`, `data/orte-tabelle.json`
- Produces:
  - `app.js` (ES-Modul) exportiert `export function renderTermin(t): HTMLElement`. Text wird ausschließlich per `textContent` gesetzt.
  - DOM-Anker für Task 9: `<svg class="js-karte">` als leerer Platzhalter im Layout; `document.dispatchEvent(new CustomEvent("konzerte:treffer", {detail: {treffer, mitte, radiusKm}}))` nach jedem Filtern.
- Seitenaufbau:
  - Kopf und Fuß wie `404.html`, aber mit relativen Pfaden wie `index.html`.
  - `h1`: „Was geht?“. Darunter „Wir empfehlen dir nichts. Du entscheidest.“
  - Filterleiste:
    - Knopf „Wo bin ich?“ (Geolocation)
    - Feld „PLZ / Ort“ mit Vorschlagsliste
    - Umkreis-Regler mit den vier Stufen, Standard Bahnweite
    - Datum: Schnellwahl „Heute“, „Wochenende“, „Alles“ sowie zwei Datumsfelder von/bis
    - Genre-Auswahl mit dem Hinweis „Genres raten wir. Wenn's nicht passt: Pogo trotzdem.“
    - Schalter „Nur Eintritt frei / auf Spende“
    - Schalter „Kommerz ausblenden“ (aus)
  - Liste: Datum, Bands, Zusatz, Laden, Stadt, Land falls nicht DE, `anfahrt(km)` falls Mitte gesetzt, Stempel „Riecht nach Konzern“ bei `kommerz`, Link zur Quelle. Sortierschalter Datum/Entfernung.
  - Leer: `spruch(n)`, wobei `n` mit jedem Filterwechsel hochzählt. Beim KNOX-Spruch steht der Link auf `neu.php`.
  - Unter der Liste: „<ohne_ort> Termine ohne Ort, die findest du bei KNOX“ sowie alle Quellenangaben.
  - Fehlerfälle:
    - Geolocation verweigert/nicht verfügbar → Hinweis „Kein Standort. Tipp eine PLZ oder einen Ort ein.“
    - Datei lädt nicht → „Termine gerade nicht da. Versuch's später.“
  - `localStorage`: nur `{stufe, genre, nurFrei, ohneKommerz}`, jeder Zugriff in try/catch.
  - Die Ortstabelle lädt erst beim ersten Fokus ins Feld „PLZ / Ort“ oder beim ersten Tippen.
  - `css/konzerte.css`: Stil aus den bestehenden Tokens (`--ink`, `--paper`, `--blood-hot`, `.shout`, `.label`, `.btn`, `.stamp`). Ab ≤ 560 px kein horizontaler Überlauf.

- [ ] **Step 1: Seite bauen** wie oben
- [ ] **Step 2: Prüfen mit Playwright** gegen `http://localhost:4173/konzerte.html` (Server `fof-site`, ggf. `preview_start`)
  - PLZ „47533“ wählen, Bahnweite → Liste nicht leer, jeder Eintrag zeigt „· … lang …“.
  - Mit dem Test-Termin, dessen Sonstiges `<script>alert(1)</script>` enthält: Es gibt keinen Dialog, der Text erscheint wörtlich. Dafür eine Kopie der Fixture-JSON über `page.route('**/data/konzerte.json')` einspielen.
  - Geolocation per `context.grantPermissions([])` verweigern → Hinweistext sichtbar, Seite bedienbar.
  - Datum von=bis=letzter Tag eines Termins → der Termin ist da.
  - `page.on('request')`: keine Anfrage an einen anderen Host als localhost.
  - Konsole ohne Fehler.
  - 375 px: `document.documentElement.scrollWidth === 375` auf `konzerte.html` und `index.html` (Navigation mit neuem Punkt).
- [ ] **Step 3: Commit** `feat(konzerte): Seite mit Liste, Umkreis und Datum`

**Meilenstein 1 fertig, wenn** eine 100-km-Suche um 47533 Kleve Termine aus DE und NL zeigt. Screenshot als Beleg.

---

## Meilenstein 2: Karte und Twist

### Task 8: Kartendaten

**Files:**
- Create: `tools/konzerte/build_karte.py`, `data/karte.json`

**Interfaces:**
- Produces: `data/karte.json`:
  - `{"bbox": [2.3, 49.3, 15.3, 55.2], "laender": [{"iso":"DE","ringe":[[[lon,lat],…]]}], "regionen": [[[lon,lat],…]], "staedte": [{"name","lat","lon"}], "quelle": "Natural Earth (gemeinfrei)"}`
  - `laender`: DE, NL, BE, LU (LU nur Umriss).
  - `regionen`: Linien der Bundesländer bzw. Provinzen.
  - `staedte`: DE/NL/BE ab 200.000 Einwohnern.
- Daten: Natural Earth 10m `admin_0_countries`, `admin_1_states_provinces_lines` und `populated_places` (GeoJSON aus `github.com/nvkelso/natural-earth-vector`, Tag festhalten). Douglas-Peucker mit Toleranz 0,01°, Koordinaten auf 3 Stellen.

- [ ] **Step 1:** `python -m tools.konzerte.build_karte` → Datei unter 300 KB, enthält DE/NL/BE/LU, mindestens 15 Städte (Prüf-Einzeiler mit `json.load`).
- [ ] **Step 2: Commit** `feat(konzerte): Kartendaten aus Natural Earth`

### Task 9: Copyshop-Karte

**Files:**
- Create: `js/konzerte/karte.js`
- Modify: `js/konzerte/app.js` (Karte einhängen), `css/konzerte.css`, `konzerte.html`
- Test: `tests/js/karte.test.mjs`

**Interfaces:**
- Consumes: `data/karte.json`, Ereignis `konzerte:treffer` (Task 7)
- Produces:
  - `export function projiziere(lat, lon): [x, y]`: abstandstreu-zylindrisch mit `cos(51°)`, x/y in km relativ zu 10°O/51°N.
  - `export function haufen(punkte: Array<{x,y,id}>, radiusPx: number, massstab: number): Array<{x,y,ids:string[]}>`: gierig nach Reihenfolge.
  - `export function zeichneKarte(svg: SVGSVGElement, karte, {treffer, mitte, radiusKm}): void`
- Verhalten:
  - Schwarz-weiß, grobe Kopierer-Kante (SVG-Filter `feTurbulence` und `feDisplacementMap`, fester Seed).
  - Marker: rotes, gesprühtes A als `<symbol>`. Die Form ist vereinfacht nach Motiv 008, ein Pfad aus `tools/build-anarchie.py`-Geometrie.
  - Haufen mit Zahl; Klick auf einen Haufen zoomt hinein.
  - Umkreis als gestrichelter Kreis. Eigener Standort mit Beschriftung „Du bist hier. Leider.“
  - Ungefähr geortete Termine („genau“: false) bekommen einen helleren Marker.
  - Zoom und Verschieben per Rad, Ziehen und Fingern über `viewBox`, Grenzen bei Gebiet bis Regionsebene (etwa 60 km Breite).
  - Klick auf einen Marker scrollt zum Listeneintrag und hebt ihn hervor.
  - Bei reduzierter Bewegung gibt es keine Übergänge.
  - Die Karte ist `aria-hidden`; die Liste ist die zugängliche Ansicht.

- [ ] **Step 1: Write the failing test**

```js
const [x0,y0] = projiziere(51, 10); assert.ok(Math.abs(x0) < 1e-9 && Math.abs(y0) < 1e-9);
const a = projiziere(51.7883, 6.1387), b = projiziere(51.8126, 5.8372);
assert.ok(Math.abs(Math.hypot(a[0]-b[0], a[1]-b[1]) - 20.9) < 1);      // Kleve–Nijmegen
assert.equal(haufen([{x:0,y:0,id:"a"},{x:1,y:0,id:"b"},{x:100,y:0,id:"c"}], 10, 1).length, 2);
```

- [ ] **Step 2:** FAIL · **Step 3:** implementieren · **Step 4:** `node --test tests/js/` PASS
- [ ] **Step 5: Prüfen mit Playwright**
  - 1440 und 375 px: Screenshot mit sichtbarem Umkreis um Kleve und Markern in DE und NL.
  - Berlin-Haufen zeigt eine Zahl.
  - Mit reduzierter Bewegung gibt es keine Animation (keine laufenden `getAnimations()`).
  - Keine fremden Hosts.
- [ ] **Step 6: Commit** `feat(konzerte): Copyshop-Karte`

### Task 10: Route, Teaser, Datenschutz, Lighthouse

**Files:**
- Modify: `js/konzerte/app.js` (Knopf „Hinkommen“)
- Modify: `index.html` (Teaser-Block nach `#mitmachen`, vor dem Outro), `css/site.css`
- Modify: `datenschutz.html` (neuer Abschnitt, Hoster-Platzhalter ausfüllen), `README.md` (Abschnitt „Konzertkalender“)

**Interfaces:**
- Produces: `export function routenLink(ziel: {lat,lon}, start?: {lat,lon}, modus: "rad"|"fuss"|"auto" = "rad"): string`, getestet in `tests/js/filter.test.mjs` oder einer neuen Datei.
  - Engines: `fossgis_osrm_bike`, `fossgis_osrm_foot`, `fossgis_osrm_car`.
  - Format: `https://www.openstreetmap.org/directions?engine=<engine>&route=<lat1>%2C<lon1>%3B<lat2>%2C<lon2>`; ohne Start ist das erste Paar leer (`route=%3B<lat2>%2C<lon2>`).
  - Start nur, wenn der Standort per Geolocation freigegeben ist, nicht bei eingetipptem Ort.
- Teaser:
  - Überschrift: „Was geht?“
  - Text: „Punk, Ska, Hardcore in deiner Nähe. Ohne Algorithmus.“
  - Knopf „Konzerte im Umkreis“ → `konzerte.html`
  - Lädt keine Daten.
- Datenschutz, neuer Abschnitt „Konzertkalender“:
  - Der Standort bleibt im Browser und wird nicht übertragen.
  - Die Termine kommen von KNOX und Radar über unseren Server, dein Browser fragt dort nicht an.
  - „Hinkommen“ öffnet openstreetmap.org; ab da gelten deren Datenschutzregeln.
  - Hoster: Codeberg e.V., Berlin (Codeberg Pages), Logdauer laut Codeberg-Datenschutzerklärung; der Builder trägt den aktuellen Wert ein.
- Neben „Hinkommen“ steht klein: „öffnet openstreetmap.org“.

- [ ] **Step 1: Test für `routenLink`** mit beiden Formen, dann implementieren, `node --test tests/js/` PASS
- [ ] **Step 2: Teaser und Datenschutz einbauen**, `?v=` hochzählen
- [ ] **Step 3: Lighthouse mobil**
  - Index zweimal messen, Performance mindestens 91; `konzerte.html` einmal messen, Accessibility 100.
  - Läufe mit Timeout, Ergebnis in den Scratchpad.
  - Vorher Clip-Vorschauen und Ähnliches beenden.
- [ ] **Step 4: Commit** `feat(konzerte): Route, Teaser, Datenschutz`

**Meilenstein 2 fertig, wenn** Karte und Liste mit allen Twist-Elementen laufen und Lighthouse belegt ist.

---

## Meilenstein 3: Radar

### Task 11: Radar-Adapter

**Files:**
- Create: `tools/konzerte/radar.py`, `tools/konzerte/tests/fixtures/radar-events.json`, `tools/konzerte/tests/fixtures/radar-location.json`
- Modify: `tools/konzerte/abholen.py` (Radar als zweite Quelle, eigener Eintrag in `quellen-status.json`)
- Test: `tools/konzerte/tests/test_radar.py`

**Interfaces:**
- Consumes: `Termin`, `listen.json` (`radar_tags`, `genres`)
- Produces: `lese_radar(events_json: dict, orte: dict[str, dict], listen) -> list[Termin]`
  - `orte` ist uuid → Location-JSON.
  - `id` = `radar-<event uuid>`.
  - `datum`/`zeit` aus `time_start` als **lokales** Datum und lokale Uhrzeit des Strings, ohne UTC-Umrechnung.
  - `lat`/`lon` aus `map.lat`/`map.lon`, `genau=True`. `plz`, `stadt` und `land` kommen aus `address`.
  - `frei` aus `price` in (`free`, `by donation`).
  - `genres` aus Tags, sonst Stichwortsuche im Titel. Termine ohne passenden Tag **und** ohne Stichwort fallen raus.
- Abruf in `abholen.py`:
  - Je Land DE/NL/BE: `https://radar.squat.net/api/1.2/search/events.json?facets[country][]=<LAND>&facets[category][]=music-concert&fields=uuid,title,date_time,offline,category,price,tags,url&limit=500`
  - Orte über `/api/1.2/location/<uuid>.json`, ebenfalls über den Cache in `data/orte.json` (Schlüssel `radar|<uuid>`).
- Fixture:
  - Zwei Events nach dem echten Muster.
    - „Punk im KuBiZ“: Tag „Punk / Hardcore / Crust“, `time_start` `2026-11-04T23:30:00+01:00`, Location KuBiZ mit lat 52.5571858, lon 13.4700005.
    - Ein Comedy-Abend ohne passende Tags.
  - Dazu ein passendes Location-JSON.

- [ ] **Step 1: Write the failing test**

```python
t = lese_radar(EVENTS, ORTE, L)
self.assertEqual(len(t), 1)                                   # Comedy raus
self.assertEqual((t[0].datum, t[0].zeit), ("2026-11-04", "23:30"))   # kein Rutsch auf den 5. oder 4. UTC
self.assertAlmostEqual(t[0].lat, 52.5572, places=3); self.assertTrue(t[0].genau)
self.assertEqual(t[0].genres, ["Punk / Hardcore / Crust"])
```

- [ ] **Step 2:** FAIL · **Step 3:** implementieren und in `abholen.py` einhängen · **Step 4:** alle Python-Tests PASS
- [ ] **Step 5: Commit** `feat(konzerte): Radar als zweite Quelle`

### Task 12: Dubletten zusammenführen

**Files:**
- Create: `tools/konzerte/zusammenfuehren.py`
- Modify: `tools/konzerte/abholen.py`
- Test: `tools/konzerte/tests/test_zusammenfuehren.py`

**Interfaces:**
- Produces: `fuehre_zusammen(termine: list[Termin]) -> list[Termin]`
  - Gleich heißt: gleiches `datum`, gleiche normalisierte `stadt` und Jaccard der Band-Wortmengen ≥ 0,5. Wortmengen normalisiert, Stoppwörter `the, and, und, +, &, support, special, guests` entfernt.
  - Beim Vereinen: Koordinaten, `genau`, `genres` und `frei` von Radar, der Rest von KNOX. `links` werden aus beiden vereint.

- [ ] **Step 1: Write the failing test**

```python
# KNOX "Schmutz + Die Fingernägel" Dresden 2026-11-05 und Radar "SCHMUTZ / Die Fingernägel" Dresden 2026-11-05 → 1 Termin, 2 Links, genau True
# gleiche Bands, andere Stadt → 2 Termine
# gleiche Stadt, anderes Datum → 2 Termine
```

- [ ] **Step 2:** FAIL · **Step 3:** implementieren · **Step 4:** PASS
- [ ] **Step 5: Echter Lauf** (wie Task 4, Step 5) → Exit 0, Radar-Termine in Berlin auf der Karte sichtbar
- [ ] **Step 6: Commit** `feat(konzerte): Dubletten zusammenführen`

---

## Meilenstein 4: Hosting auf Codeberg

Die Schritte, die nur Mark machen kann (Accounts, Tokens, DNS), kommen in einen Wizard. Claude legt keine Accounts an und gibt keine Zugangsdaten ein.

### Task 13: Repo aufräumen

**Files:**
- Move: `redesign/` → `D:/claude/fof/redesign-archiv/` (außerhalb des Repos)
- Modify: `.gitignore` (`redesign/`, `data/abholen.log`, `__pycache__/`)
- Create: `LICENSE` (CC0 1.0 für Motive und Code, außer `assets/vendor/*` mit eigenen Lizenzen; Vorschlag, Mark bestätigt in Task 14)

- [ ] **Step 1:** verschieben, `git rm -r --cached redesign`, `.gitignore` ergänzen
- [ ] **Step 2:** `git status` zeigt keine Dateien aus `redesign/` mehr; Seite lokal unverändert (Startseite lädt, Konsole leer)
- [ ] **Step 3: Commit** `chore: Arbeitsmaterial aus dem Repo, Lizenz`

### Task 14: Codeberg-Probelauf und Einrichtungs-Wizard

**Files:**
- Create: `tools/codeberg-einrichten.sh` (mit dem Skill `mattpocock-skills:wizard` erzeugen)
- Create, im separaten Test-Repo `fof-probe`: `.forgejo/workflows/probe.yml`

**Inhalt des Wizards**, Schritt für Schritt für Mark:
1. Codeberg-Account bzw. Organisation `fuckofffashion` anlegen.
2. Repos `site` (Quelltext) und `pages` (nur Ausgabe) anlegen, dazu `fof-probe` für den Test.
3. Lizenz bestätigen.
4. Zugriffstoken mit Schreibrecht auf `pages` erzeugen und im Repo `site` als Secret `PAGES_TOKEN` hinterlegen.
5. Später, mit eigener Domain: `.domains` im Repo `pages` und DNS-Eintrag laut Codeberg-Pages-Doku.

Begründung für zwei Repos:
- Ein Repo namens `pages` wird unter `fuckofffashion.codeberg.page` an der Wurzel ausgeliefert.
- Unter `/site/` würden die absoluten Pfade in `404.html` brechen.

Probelauf `probe.yml`:
- `on: schedule: - cron: "0 4 * * *"` (05:00 MEZ) plus `workflow_dispatch`.
- `runs-on: codeberg-tiny`.
- Der Job schreibt `date -u` in `probe.log` und committet.

- [ ] **Step 1:** Wizard mit dem Skill erzeugen und Mark übergeben
- [ ] **Step 2:** Mark führt den Wizard aus. Danach `probe.yml` pushen.
- [ ] **Step 3:** Nach 7 Tagen: `probe.log` hat 7 Einträge zwischen 04:00 und 06:00 UTC → Codeberg tragfähig.
  - Sonst Fallback aus der Spec (GitHub Actions oder Uberspace) mit Mark entscheiden; nur Task 15 ändert sich.

### Task 15: Täglicher Lauf und Veröffentlichung

**Files:**
- Create: `.forgejo/workflows/konzerte.yml`, `tools/veroeffentlichen.sh`

**Interfaces:**
- `tools/veroeffentlichen.sh <zielordner>` kopiert nur diese Allowlist:
  - `index.html`, `konzerte.html`, `404.html`, `impressum.html`, `datenschutz.html`
  - `css/`, `js/`, `assets/`
  - `data/konzerte.json`, `data/karte.json`, `data/orte-tabelle.json`
  - `.domains`, falls vorhanden

  Nicht kopiert werden `docs/`, `tools/`, `tests/`, `kit/`, `styleguide.html`, `README.md`, `data/orte.json` und `data/quellen-status.json`.
- Workflow `konzerte.yml`:
  - Auslöser: `schedule` `0 4 * * *`, `push` auf `main`, `workflow_dispatch`.
  - `runs-on: codeberg-tiny`.
  - Schritte:
    1. checkout
    2. `python3 -m unittest discover -s tools/konzerte/tests -t .`
    3. `node --test tests/js/`, falls Node im Image vorhanden ist (sonst überspringen und das im Log vermerken)
    4. `timeout 540 python3 -m tools.konzerte.abholen`
    5. geänderte `data/*.json` nach `main` committen (Bot-Name „konzerte-bot“)
    6. Repo `pages` mit `PAGES_TOKEN` klonen, `tools/veroeffentlichen.sh` in den Klon, committen, pushen
  - Endet `abholen.py` mit 1, schlägt der Workflow fehl. Codeberg schickt Mark dann eine Mail.

- [ ] **Step 1: Lokal testen**: `bash tools/veroeffentlichen.sh /tmp/fof-pages` (im Scratchpad) → Ordner enthält genau die Allowlist (`find`-Ausgabe prüfen).
- [ ] **Step 2: Workflow anlegen.** **Noch nicht in das echte Repo pushen.** Der Push wartet auf Task 16.
- [ ] **Step 3: Commit** `ci: täglicher Konzertlauf und Veröffentlichung`

### Task 16: Go-live (gesperrt bis Impressum/Datenschutz fertig)

- [ ] **Step 1: Sperre prüfen.**
  - `grep -c "bitte ausfüllen" impressum.html datenschutz.html` muss überall 0 sein.
  - Domain- und Mail-Platzhalter laut README sind ersetzt, oder Mark entscheidet ausdrücklich, mit `fuckofffashion.codeberg.page` zu starten. Dann zeigt der Nominatim-User-Agent auf diese Adresse.
  - Ist eine Bedingung offen: anhalten und Mark fragen.
- [ ] **Step 2:** Mark gibt frei → Remote `origin` auf Codeberg `site` setzen und `main` pushen.
- [ ] **Step 3:** Workflow per `workflow_dispatch` starten, Log lesen: Tests grün, Abholen Exit 0, Push nach `pages` ok.
- [ ] **Step 4: Beleg**
  - `https://fuckofffashion.codeberg.page/konzerte.html` lädt, zeigt Termine, keine fremden Hosts im Netzwerkprotokoll.
  - Screenshot und Workflow-Log-Auszug an Mark.
