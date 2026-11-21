# Bandseite „Die Säule“ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Seite `bands.html` (+ `en/bands.html`), die empfohlene Bands als abreißbare Logo-Plakate auf Litfaßsäulen zeigt, gruppiert nach ihrem nächsten Konzert, mit den zukünftigen Terminen aus der Konzertdatenbank.

**Architecture:** Eine handgepflegte Liste `tools/bands.json` ist die einzige Quelle für Bands. Python ordnet im täglichen Lauf Termine aus `data/konzerte.json` zu und schreibt die kleine Datei `data/bands.json`. Ein Build-Skript schreibt die Plakate fest ins HTML beider Sprachen; ein JS-Modul ordnet sie in Säulen, füllt Termine und steuert das Abreißen.

**Tech Stack:** Statisches HTML/CSS, Vanilla-JS-Module, Python 3 (unittest), node:test, PIL für die Logo-Umwandlung, GitHub Actions (`.github/workflows/konzerte.yml`).

**Spec:** `docs/superpowers/specs/2026-11-21-bandseite-design.md`

## Global Constraints

- Nur zukünftige Termine; vergangene erscheinen nirgends (Server **und** Browser filtern).
- Termine nur aus `data/konzerte.json`; Zuordnung standardmäßig nur über das Feld `bands`, `zusatz` nur bei `"auch_zusatz": true`.
- Echte Bandlogos, selbst gehostet unter `assets/img/bands/<id>.webp`; keine Anfrage an fremde Server von der Seite aus.
- Plakate schwarz (`--ink`), Terminzettel auf Kopierpapier; Farben nur aus `css/tokens.css`.
- Tippflächen ≥ 44 px, Schrift ≥ 12 px, kleiner Text Kontrast ≥ 4,5:1 (kleines Rot = `--blood-hot`).
- Deutsch und Englisch; IDs und Sprungmarken in beiden Fassungen gleich; englische Seiten haben `<html lang="en" data-wurzel="../">` und relative Pfade `../`.
- Kein `js/faden.js` auf der Bandseite.
- Cache-Version überall von `?v=29` auf `?v=30` (Befehl: `grep -rl "?v=29" --include=*.html --include=*.js . | xargs sed -i 's/?v=29/?v=30/g'`).
- Python-Tests liegen in `tools/konzerte/tests/` (nur die läuft der Workflow).
- Commits: Meldung per Datei, `git commit -F <datei>`, letzte Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Kein Push**; online erst auf Marks Ja.

## Review Focus

1. `data/bands.json` fehlt oder lädt nicht → Plakate bleiben sichtbar, Zettel zeigen den Link zur Konzertseite, keine Konsolenfehler (Task 6, Browserprüfung; Fallback-Text in `texte.js`).
2. Band steht in `tools/bands.json`, aber noch nicht in `data/bands.json` (neu eingetragen, Lauf noch nicht gewesen) → landet unter „Gerade still“, kein Absturz (Test in Task 5).
3. `data/bands.json` ist einen Tag alt → Termine von gestern fallen im Browser weg; ist danach keiner übrig, wechselt die Band zu „Gerade still“ (Test in Task 5).
4. Umlaute und Sonderzeichen im Namen („Ärzte“, „☠️ALARMSIGNAL“, „AC/DC“) → gleiche Schlüssel für gleiche Namen, keine Treffer für ähnliche (Tests in Task 1).
5. Heute nach lokaler Zeit, nicht UTC: kurz nach Mitternacht darf ein Termin von heute nicht verschwinden (Test für `isoLokal` in Task 5).

---

### Task 1: Zuordnung Termin → Band

**Files:**
- Create: `tools/bands.json`
- Create: `tools/konzerte/bands.py`
- Test: `tools/konzerte/tests/test_bands.py`

**Interfaces:**
- Produces:
  - `schluessel(text: str) -> str`: `normalisiere(text)` aus `tools/konzerte/ortstabelle.py`, danach alles außer `[a-z0-9 ]` durch Leerzeichen ersetzen, Leerzeichen zusammenfassen, trimmen.
  - `lade_bands(pfad: str | Path) -> list[dict]`: liest `{"bands": [...]}`, prüft Pflichtfelder `id, name, logo, logo_quelle, web`, `id` passt auf `^[a-z0-9]+(-[a-z0-9]+)*$`, IDs eindeutig; sonst `ValueError` mit Bandname im Text.
  - `ordne_zu(bands: list[dict], termine: list[dict], heute: str) -> dict`: Ergebnis `{"heute": heute, "bands": {id: {"anzahl": int, "termine": [{"datum","zeit","laden","stadt"}]}}}`; jede Band aus der Liste hat einen Eintrag, auch mit 0 Terminen.
  - CLI `python -m tools.konzerte.bands [--konzerte data/konzerte.json] [--liste tools/bands.json] [--ziel data/bands.json] [--heute YYYY-MM-DD]`, schreibt das Ergebnis plus `"stand"` aus `konzerte.json`.

Regeln von `ordne_zu`: Suchwörter = `name` + `schreibweisen`; Treffer, wenn `" " + schluessel(wort) + " "` in `" " + schluessel(feld) + " "` vorkommt; Feld = `bands`, bei `auch_zusatz` zusätzlich `zusatz`; Treffer fällt weg, wenn `schluessel(muster)` eines Eintrags aus `nicht` in `schluessel(bands + " " + zusatz)` vorkommt; `datum < heute` fällt weg; doppelte (`datum`, `laden`) zählen einmal; Sortierung `(datum, zeit or "", stadt)`.

`tools/bands.json` (Startliste aus der Spec):

```json
{
  "_hinweis": "Einzige Liste der Bands. Nach jeder Änderung: python tools/build-bands.py und python -m tools.konzerte.bands",
  "bands": [
    { "id": "dan-ganove", "name": "Dan Ganove", "logo": "dan-ganove.webp",
      "logo_quelle": "https://static.wixstatic.com/media/1093e8_c35bda69ecc54d05b6f301076c8a7d78~mv2.png",
      "web": "https://dan66713.wixsite.com/dan-punkrock",
      "beschreibung": { "de": "Akustikpunk aus Oberhausen", "en": "Acoustic punk from Oberhausen" } },
    { "id": "alarmsignal", "name": "Alarmsignal", "logo": "alarmsignal.webp",
      "logo_quelle": "https://www.alarmsignal-punkrock.de/wp-content/uploads/2024/09/Alarmsignal_logo.webp",
      "web": "https://www.alarmsignal-punkrock.de/",
      "beschreibung": { "de": "Deutschpunk", "en": "German punk" } },
    { "id": "los-fastidios", "name": "Los Fastidios", "logo": "los-fastidios.webp",
      "logo_quelle": "https://globaluserfiles.com/media/287625_f24588bbb1474289b12a4f18a6189574ee94fde2.png",
      "web": "https://losfastidios.net",
      "beschreibung": { "de": "Streetpunk und Ska aus Italien", "en": "Street punk and ska from Italy" } },
    { "id": "trijahnity", "name": "Trijahnity", "logo": "trijahnity.webp",
      "logo_quelle": "https://www.trijahnity.de/images/Trijahnity_logo_wei%C3%9F.png",
      "web": "https://www.trijahnity.de",
      "beschreibung": { "de": "Reggae'n Roll", "en": "Reggae'n Roll" } }
  ]
}
```

- [ ] **Step 1: Write the failing tests** in `tools/konzerte/tests/test_bands.py` (Termine als kleine Dicts im Test, `heute = "2026-11-21"`):
  - `test_schluessel_ohne_emoji_und_gross` → `schluessel("☠️ALARMSIGNAL") == "alarmsignal"`; `schluessel("AC/DC") == "ac dc"`; `schluessel("Die Ärzte") == schluessel("DIE ARZTE")`.
  - `test_ganzes_wort` → Band „Slime“ trifft `bands="SLIME + Gäste"`, nicht `bands="Slimer"`.
  - `test_mehrwortname_mit_anhang` → „Los Fastidios“ trifft `"Los Fastidios und 1328 Beercore"` und `"☠️LOS FASTIDIOS"`.
  - `test_zusatz_nur_mit_schalter` → Name nur in `zusatz`: 0 Termine ohne, 1 Termin mit `"auch_zusatz": true`.
  - `test_nicht_schliesst_aus` → `"nicht": ["tribute"]` verwirft `"Slime Tribute Band"`.
  - `test_schreibweisen` → `"schreibweisen": ["Arzte"]` trifft `"DIE ARZTE"` für `name="Die Ärzte"`.
  - `test_vergangenheit_faellt_weg` → `datum="2026-11-20"` fehlt, `"2026-11-21"` bleibt.
  - `test_doppelte_einmal` → zwei Termine gleiches `datum`+`laden` aus zwei Quellen ergeben `anzahl == 1`.
  - `test_band_ohne_termine_hat_eintrag` → `ergebnis["bands"]["x"] == {"anzahl": 0, "termine": []}`.
  - `test_sortierung` → nach `(datum, zeit)`.
  - `test_lade_bands_prueft` → fehlendes `logo` und doppelte `id` geben `ValueError`; die echte `tools/bands.json` lädt ohne Fehler.
- [ ] **Step 2: Run** `python -m unittest tools.konzerte.tests.test_bands -v` → FAIL (Modul fehlt).
- [ ] **Step 3: Implement** `tools/konzerte/bands.py` und `tools/bands.json` wie oben.
- [ ] **Step 4: Run** dieselben Tests → PASS. Dann `python -m tools.konzerte.bands` → schreibt `data/bands.json`; Erwartung für Stand 21.11.2026: `dan-ganove` 1–2, `alarmsignal` 2, `los-fastidios` 5, `trijahnity` 0 (Werte aus der Ausgabe in den Commit übernehmen).
- [ ] **Step 5: Commit** `tools/bands.json tools/konzerte/bands.py tools/konzerte/tests/test_bands.py data/bands.json` – „feat: Bands den Konzertterminen zuordnen“.

### Task 2: Täglicher Lauf und Veröffentlichung

**Files:**
- Modify: `tools/konzerte/abholen.py` (nach `schreibe_json(konzerte_pfad, …)`, ca. Zeile 265)
- Modify: `tools/veroeffentlichen.sh` (Quellprüfung Zeile ~26, Kopierlisten Zeile ~78–91)
- Test: `tools/konzerte/tests/test_abholen.py`, `tools/konzerte/tests/test_veroeffentlichen.py`

**Interfaces:**
- Consumes: `lade_bands`, `ordne_zu` aus Task 1.
- Produces: `abholen` schreibt `<daten>/bands.json` (kompakt) mit `{"stand", "heute", "bands"}`; neues Argument `--bands-liste` (Standard `tools/bands.json`). Ein Fehler in der Bandliste darf das Schreiben von `konzerte.json` nicht verhindern: abfangen, `log("FEHLER bands: …")`, alte `bands.json` bleibt.

- [ ] **Step 1: Tests:** in `test_abholen.py` ein Lauf mit den vorhandenen Fixtures und einer Test-Bandliste → `data/bands.json` existiert, `heute` = `--heute`, Band aus Fixture hat ≥ 1 Termin; kaputte Bandliste → `konzerte.json` wird trotzdem geschrieben. In `test_veroeffentlichen.py` die `ALLOWLIST` um `bands.html`, `en/bands.html`, `data/bands.json` erweitern.
- [ ] **Step 2: Run** `python -m unittest discover -s tools/konzerte/tests -t .` → die neuen Tests FAIL.
- [ ] **Step 3: Implement** in `abholen.py` und `veroeffentlichen.sh` (die drei Dateien in Quellprüfung und Kopierlisten). Der Workflow-Commit nimmt `data/*.json` schon mit; `konzerte.yml` bleibt unverändert.
- [ ] **Step 4: Run** alle Python-Tests → PASS.
- [ ] **Step 5: Commit** – „feat: bands.json im täglichen Lauf, Seite in der Veröffentlichung“.

### Task 3: Logos

**Files:**
- Create: `assets/img/bands/{dan-ganove,alarmsignal,los-fastidios,trijahnity}.webp`
- Create: `assets/img/bands/QUELLEN.txt` (Inhalt aus `D:/claude/fof/Bilder/band-logos/QUELLEN.txt`, Dan Ganove nur rundes Logo)

Quelle: `D:/claude/fof/Bilder/band-logos/` (`dan-ganove-rund.png`, `alarmsignal.webp`, `los-fastidios.png`, `trijahnity.png`). Umwandlung mit PIL: RGBA behalten, auf höchstens 800 px Breite verkleinern (`Image.LANCZOS`, nie vergrößern), WebP `quality=88, method=6`. Das Dan-Ganove-PNG ist im Modus `LA` → vorher `convert("RGBA")`.

- [ ] **Step 1:** Umwandeln (Skript im Scratchpad, `python` ohne `-I` wegen PIL).
- [ ] **Step 2: Verify:** jede Datei hat Alpha (`Image.open(f).mode == "RGBA"`), Breite ≤ 800, Größe je < 150 kB; Ausgabe auflisten.
- [ ] **Step 3: Commit** – „assets: Bandlogos (offizielle Quellen, siehe QUELLEN.txt)“.

### Task 4: Seite und Build-Skript

**Files:**
- Create: `bands.html`, `en/bands.html`
- Create: `tools/build-bands.py`
- Test: `tools/konzerte/tests/test_build_bands.py`

**Interfaces:**
- Consumes: `tools/bands.json` (Format Task 1), Logos aus Task 3.
- Produces (Markup, das Task 6 voraussetzt), je Band zwischen `<!-- bands:plakate:start … -->` und `<!-- bands:plakate:end -->` in `<div class="saeulen js-saeulen">`:

```html
<article class="plakat" id="band-<id>" data-band="<id>">
  <button class="plakat__reiss" type="button" aria-expanded="false" aria-controls="zettel-<id>">
    <img class="plakat__logo" src="assets/img/bands/<logo>" alt="<name>" loading="lazy" decoding="async" width="…" height="…">
    <span class="plakat__text"><beschreibung[sp]></span>
    <span class="plakat__naechst js-naechst"></span>
  </button>
  <div class="plakat__zettel" id="zettel-<id>">
    <div class="js-termine"><p><a href="konzerte.html">Termine auf der Konzertseite</a></p></div>
    <p><a class="scrawl" href="<web>" rel="noopener" target="_blank">Website von <name></a></p>
  </div>
</article>
```

  Ist in `tools/bands.json` `plakat` gesetzt (z. B. `"papier"`), bekommt das `<article>` zusätzlich die Klasse `plakat--<wert>`; `css/bands.css` kennt `plakat--papier` und `plakat--blut`.
  Englisch: Pfade mit `../`, „Gigs on the concert page“, „<name> website“. `width`/`height` aus der WebP-Datei. `build-bands.py` nach dem Muster von `tools/build-motive.py`: `lade()`, `ersetze(html, daten, sp) -> str` (genau ein Markerpaar, sonst `ValueError`), `main(argv)` mit `--pruefen` (Exit 1, wenn eine Seite veraltet ist).

Seitengerüst wie `konzerte.html` (Kopf, Menü, Sprachumschalter, Fuß, `js/menu.js`), Stylesheets `tokens, base, site, bands.css`, Modul `js/bands/app.js`, **ohne** `faden.js`. Einleitung: Label „Bands“, Überschrift „Die Säule.“, ein bis zwei Sätze im Ton der Startseite; unter `.saeulen` ein Link „Alle Konzerte im Umkreis“ → `konzerte.html` (EN „All gigs near you“). Seitentitel/Meta-Beschreibung DE und EN selbst formulieren.

- [ ] **Step 1: Tests** in `test_build_bands.py`: `test_seiten_aktuell` (DE und EN: `ersetze(html) == html`); `test_jedes_logo_existiert`; `test_alt_ist_bandname`; `test_en_nutzt_relative_pfade` (kein `src="assets/`); `test_keine_fremden_bilder` (kein `src="http`); `test_marker_fehlt_gibt_fehler`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** Skript und beide Seiten, dann `python tools/build-bands.py`.
- [ ] **Step 4: Run** Tests und `python tools/build-bands.py --pruefen` → PASS / „passt zu tools/bands.json“ für beide Seiten.
- [ ] **Step 5: Commit** – „feat: Bandseite mit Plakaten aus tools/bands.json“.

### Task 5: Säulen-Logik (JS, rein)

**Files:**
- Create: `js/bands/saeulen.js`
- Test: `tests/js/bands.test.mjs`

**Interfaces:**
- Produces:
  - `isoLokal(d: Date) -> string` (`YYYY-MM-DD` nach lokaler Zeit)
  - `tageBis(datumIso: string, heuteIso: string) -> number` (ganze Tage, rechnen in UTC aus den Datumsteilen)
  - `kuenftige(termine: Array, heuteIso: string) -> Array` (ohne `datum < heute`)
  - `saeuleFuer(termine: Array, heuteIso: string) -> "bald" | "demnaechst" | "spaeter" | "still"` (Grenzen 0–30, 31–90, > 90, keine)
  - `gruppiere(ids: string[], daten: {bands: Object} | null, heuteIso: string) -> Array<{saeule: string, ids: string[]}>` in Reihenfolge bald, demnaechst, spaeter, still; leere weg; innerhalb nach nächstem Termin, „still“ in der Reihenfolge von `ids` (die das Build-Skript alphabetisch schreibt); fehlende Band in `daten` oder `daten === null` → „still“.
  - `monatsSpanne(heuteIso: string, saeule: string, sp: "de"|"en") -> string` (z. B. „Nov · Dez“; für „still“ leer)
  - `sichtbare(termine: Array, alle: boolean) -> Array` (ohne `alle` die ersten 4)

- [ ] **Step 1: Tests** in `tests/js/bands.test.mjs` mit `heute = "2026-11-21"`:
  - `saeuleFuer`: Termin am 21.11. → „bald“; Tag 30 (21.12.) → „bald“; Tag 31 (22.12.) → „demnaechst“; Tag 90 (19.02.2027) → „demnaechst“; Tag 91 (20.02.2027) → „spaeter“; nur vergangene → „still“; leer → „still“.
  - `gruppiere`: leere Säulen fehlen; Band ohne Eintrag in `daten` → „still“; `daten === null` → alle „still“; Sortierung nach nächstem Termin.
  - `kuenftige`: „2026-11-20“ fällt weg, „2026-11-21“ bleibt.
  - `isoLokal(new Date(2026, 10, 21, 0, 30))` → „2026-11-21“.
  - `sichtbare`: 6 Termine → 4 bzw. 6.
- [ ] **Step 2: Run** `node --test tests/js/bands.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `js/bands/saeulen.js` ohne DOM-Zugriff.
- [ ] **Step 4: Run** → PASS; danach alle JS-Tests `node --test "tests/js/*.test.mjs"`.
- [ ] **Step 5: Commit** – „feat: Säulen-Logik der Bandseite“.

### Task 6: Oberfläche – Säulen, Zettel, Abreißen

**Files:**
- Create: `js/bands/app.js`, `js/bands/texte.js`, `css/bands.css`

**Interfaces:**
- Consumes: Markup aus Task 4, Funktionen aus Task 5, `data/bands.json` (Pfad `document.documentElement.dataset.wurzel + "data/bands.json"`, Muster aus `js/konzerte/app.js:17`).
- `texte.js` nach dem Muster von `js/konzerte/texte.js` (`sprache()` über `<html lang>`): Säulennamen DE „Bald / Demnächst / Später / Gerade still“, EN „Soon / Coming up / Later / Quiet for now“; „Nächstes Mal“/„Next up“; „Gerade keine Termine. Kommt wieder.“/„No gigs right now. They'll be back.“; „alle N Termine“/„all N gigs“; Fehlertext, wenn die Daten nicht laden.

Verhalten:
- `bands.html`/`en/bands.html` setzen im `<head>` wie `index.html:24` per Inline-Skript `document.documentElement.classList.add("js")`; `app.js` lädt `bands.json`, ruft `gruppiere`, baut je Säule Dach (Name + `monatsSpanne`), Körper, Fuß und **verschiebt** die vorhandenen `<article class="plakat">` hinein (keine Neuerzeugung, damit No-JS-HTML und JS-Ansicht dieselben Elemente sind).
- Je Plakat: `.js-naechst` = „Nächstes Mal · Fr 04.12. Oberhausen“ bzw. „Gerade still“; Zettel = Liste aus `sichtbare(…)` (Wochentag, TT.MM., Stadt, Laden), bei mehr als 4 ein Knopf „alle N Termine“, der den Rest aufklappt.
- Zettel ist zu und `inert`, bis der Knopf `.plakat__reiss` gedrückt wird; Drücken setzt `aria-expanded`, entfernt `inert`, Riss per `clip-path` (Zickzack wie in der Skizze `https://claude.ai/artifact/83yYLYFwsdtiLWZCiRL3wR`), unteres Stück fällt (WAAPI); nochmal drücken klebt es an. `prefers-reduced-motion`: ohne Fallen und ohne Übergang.
- Daten laden nicht: Plakate bleiben in einer Säule „Bands“, Zettel zeigen den vorhandenen Link zur Konzertseite plus Fehlertext.
- CSS: Säulen mit Dach/Körper/Fuß wie die Skizze; ab `min-width: 900px` nebeneinander (`grid-template-columns: repeat(var(--n), minmax(0,1fr))`, höchstens 4), darunter gestapelt; Plakat `--ink` mit weißem Logo-Kontrast, `object-fit: contain`, Klebeband, `--rot` je Plakat; Zettel Kopierpapier-Linien; ohne `.js` sind Zettel offen sichtbar.

- [ ] **Step 1: Implement** die drei Dateien.
- [ ] **Step 2: Verify im Browser** (Vorschau `fof-site`, Port 4173): 360, 390, 1440 px; DE und EN; Abreißen per Klick und per Tastatur (Tab, Enter), Links im Zettel danach erreichbar; „alle N Termine“ bei Los Fastidios; reduzierte Bewegung (`matchMedia`-Emulation oder CSS-Prüfung); `data/bands.json` umbenannt → Fehlerfall wie oben; ohne JS (Skript-Tag entfernt in einer Kopie) → Plakate + offene Zettel; Konsole ohne Fehler; kein seitlicher Überlauf; alle Knöpfe ≥ 44 px.
- [ ] **Step 3: Commit** – „feat: Säulen und abreißbare Plakate auf der Bandseite“.

### Task 7: Navigation, Sprachpaare, Abschluss

**Files:**
- Modify: Hauptnavigation in `index.html`, `en/index.html`, `konzerte.html`, `en/konzerte.html`, `bands.html`, `en/bands.html` (Link „Bands“ vor „Konzerte“/„Gigs“, auf der Bandseite mit `aria-current="page"`)
- Modify: `tools/konzerte/tests/test_sprachen.py` (`PAARE` um `"bands.html": "en/bands.html"`)
- Modify: `README.md` (Abschnitt Bandseite: Pflege laut Spec „Pflege (für Mark)“)
- Modify: alle `?v=29` → `?v=30`

- [ ] **Step 1:** `test_sprachen.py` erweitern, `python -m unittest tools.konzerte.tests.test_sprachen -v` → FAIL, falls IDs/Umschalter nicht passen; dann Seiten angleichen → PASS.
- [ ] **Step 2:** Nav-Link einfügen; im Browser bei 1100–1440 px prüfen, ob die Zeile passt, sonst Klasse `nav--wide` wie bei „Galerie“.
- [ ] **Step 3:** Cache-Version erhöhen (Befehl in Global Constraints).
- [ ] **Step 4: Run** alles: `python -m unittest discover -s tools -t . -p "test*.py"`, `node --test "tests/js/*.test.mjs"`, `python tools/build-motive.py --pruefen`, `python tools/build-bands.py --pruefen` → alle grün.
- [ ] **Step 5: Commit** – „feat: Bandseite im Menü, Sprachpaare, v30“. Kein Push; Screenshots (Handy, Desktop) an Mark und auf sein Ja warten.
