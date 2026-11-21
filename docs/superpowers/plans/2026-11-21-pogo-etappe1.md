# Pogo Etappe 1 – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spielbares Pogo (Etappe 1) als eigene, unverlinkte Seite `pogo.html`/`en/pogo.html` mit kompletter Mechanik, eigenem Beat und drei Beispiel-Läden, als Artefakt anspielbar.

**Architecture:** Reine Regeln und Physik ohne three.js/DOM (`js/pogo/regeln.js`, `js/pogo/physik.js`) mit Node-Tests; Darstellung (`figuren.js`, `szene.js`) mit dem vendorten three.js; `musik.js` (WebAudio-Beat); `app.js` verbindet Eingabe, Spielzustand, Anzeigen. Vorlage für Szene, Beat und Figuren: `docs/superpowers/specs/2026-11-21-pogo-3d-entwurf.html`.

**Tech Stack:** Vanilla-JS-Module, three.js r169 (`assets/vendor/three.module.min.js`), WebAudio, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-21-pogo-design.md`

## Global Constraints

- Keine fremden Server, kein Konto, keine Daten an Dritte. three.js nur aus `assets/vendor/`.
- Seiten nicht in `tools/veroeffentlichen.sh`, nirgends verlinkt (Etappe 1).
- Ergebnis = Pogo-Punkte × Bier-Anteil (`Math.round(punkte * bier / 100)`).
- Zonen: Rand (0 Punkte, schubst zurück), Pit, Mitte (doppelt), erste Reihe (doppelt, Gedränge, Ordner), Stagedive aus der ersten Reihe.
- Songablauf 60 s: INTRO bis 6 (Kraft 0,25), STROPHE bis 20 (0,6), REFRAIN bis 30 (1,0), BREAK bis 36 (0,18), STROPHE bis 48 (0,65), LETZTER REFRAIN bis 60 (1,15). BPM 176.
- Ziel 30 fps auf mittlerem Handy, höchstens ~300 Zeichenaufrufe; `?fps` zeigt fps und Zeichenaufrufe.
- Ton erst nach Antippen, Ton-aus-Knopf; reduzierte Bewegung: kein Kamerawackeln, keine Flug-Animation der Texte.
- Deutsch und Englisch; Texte nur in `js/pogo/texte.js` bzw. in den beiden HTML-Seiten.
- Commits per `git commit -F`, Endzeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, Zweig `pogo`.
- Tests: `node --test "tests/js/*.test.mjs"` und `python -m unittest discover -s tools -t . -p "test*.py"`.

## Review Focus

1. Kurzes Antippen springt, Ziehen läuft – nie beides verwechselt (Task 1: `geste()`-Test).
2. Tab im Hintergrund: Spiel und Beat pausieren, kein Zeitsprung beim Zurückkommen (Task 5, Browserprüfung).
3. Songende während Stagedive oder Mikro-Moment: Runde endet sauber mit Endbild (Task 5: `ende` hat Vorrang, Browserprüfung).
4. Ton blockiert oder kein AudioContext: Spiel läuft trotzdem (Task 5).
5. 320 px breiter Bildschirm: Anzeigen überdecken sich nicht, Knöpfe ≥ 44 px (Task 6, Browserprüfung).

---

### Task 1: Spielregeln (`js/pogo/regeln.js`)

**Files:** Create `js/pogo/regeln.js`, Test `tests/js/pogo-regeln.test.mjs`

**Interfaces – Produces:**
- `BPM = 176`, `VIERTEL = 60 / 176`, `DAUER = 60`, `TEILE` (Liste oben), `teilBei(t) -> {bis, name, kraft, kreis?}`
- `zone(x, z, laden) -> "rand"|"pit"|"mitte"|"reihe"`; `laden = { x, z: [zMin, zMax], gitterZ }`. Rand: `|x| > laden.x - 0.9` oder `z > zMax - 0.9`; Reihe: `z < gitterZ + 0.9`; Mitte: Abstand zu `(0, (gitterZ + zMax) / 2)` < 1.6; sonst Pit.
- `punkteProSekunde(zone, teil, ordnerNass) -> number`: rand 0, pit 10, mitte 20, reihe 20; ×1.5 wenn `teil.kraft >= 1`; ×0.5 wenn `ordnerNass`.
- `imTakt(t) -> boolean`: Abstand zum nächsten Vielfachen von `VIERTEL` ≤ 0.08 s.
- `SPRUNG = { bonus: 15, daneben: 3 }` (Punkte bzw. Prozent Bier).
- `verschuettet(schlag, { rucksack, inLuft }) -> number`: 0 wenn `inLuft` oder Schlag (×1.6 bei Rucksack) ≤ 1.6; sonst `Math.min(14, (s - 1.6) * 4.5)`.
- `GEDRAENGE = 1.5` (% Bier pro Sekunde × Kraft in der ersten Reihe).
- `STAGEDIVE_AB = 4` (Sekunden durchgehend in der ersten Reihe), `BONUS = { duDa: 150, plektrum: 100, drumstick: 150, setliste: 300, oi: 40, stagedive: 600 }`.
- `ergebnis(punkte, bier) -> number`.
- `titelSchluessel(punkte, bier) -> "leer"|"randSteher"|"legendaer"|"koenig"|"solide"|"nass"`: bier ≤ 0 → leer; punkte < 300 → randSteher; bier < 20 → legendaer; punkte ≥ 1500 → koenig; bier ≥ 50 → solide; sonst nass.
- `geste(dauerMs, wegPx) -> "tippen"|"ziehen"|null`: wegPx ≥ 12 → ziehen; sonst dauerMs ≤ 250 → tippen; sonst null.

- [ ] **Step 1: Failing tests** (Auszug, alle Funktionen abdecken):

```js
const L = { x: 3.3, z: [-4.2, 4.2], gitterZ: -3.6 };
assert.equal(teilBei(25).name, "REFRAIN!"); assert.equal(teilBei(59.9).kraft, 1.15);
assert.equal(zone(3.0, 0, L), "rand"); assert.equal(zone(0, 4.0, L), "rand");
assert.equal(zone(0, -3.2, L), "reihe"); assert.equal(zone(0, 0.3, L), "mitte"); assert.equal(zone(1.8, 2.5, L), "pit");
assert.equal(punkteProSekunde("rand", teilBei(25), false), 0);
assert.equal(punkteProSekunde("mitte", teilBei(25), false), 30);
assert.equal(punkteProSekunde("reihe", teilBei(10), true), 10);
assert.equal(imTakt(VIERTEL * 7 + 0.05), true); assert.equal(imTakt(VIERTEL * 7 + 0.15), false);
assert.equal(verschuettet(3, { inLuft: true }), 0); assert.equal(verschuettet(1.5, {}), 0);
assert.ok(Math.abs(verschuettet(3, {}) - 6.3) < 1e-9); assert.equal(verschuettet(10, {}), 14);
assert.equal(ergebnis(1000, 50), 500);
assert.equal(titelSchluessel(2000, 0), "leer"); assert.equal(titelSchluessel(100, 90), "randSteher");
assert.equal(titelSchluessel(900, 10), "legendaer"); assert.equal(titelSchluessel(1600, 55), "koenig");
assert.equal(titelSchluessel(800, 60), "solide"); assert.equal(titelSchluessel(800, 30), "nass");
assert.equal(geste(120, 3), "tippen"); assert.equal(geste(120, 20), "ziehen"); assert.equal(geste(600, 4), null);
```

- [ ] **Step 2:** `node --test tests/js/pogo-regeln.test.mjs` → FAIL (Modul fehlt).
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat(pogo): Spielregeln`.

### Task 2: Texte und Läden

**Files:** Create `js/pogo/texte.js`, `js/pogo/laeden.js`; Test `tests/js/pogo-regeln.test.mjs` (erweitern)

**Interfaces – Produces:**
- `texte.js`: `sprache()`, `TEXTE.de/en`, `t(schluessel, werte, sp)` wie `js/bands/texte.js`. Schlüssel u. a.: Teilnamen, Pops (`platsch`, `schwapp`, `rucksack`, `stiefel`, `freibier`, `crowdsurfer`, `wall`, `los`, `randSchubs` = „Was stehst du hier rum?“/„Why are you just standing there?“, `duDa`, `abkuehlen`, `plektrum`, `drumstick`, `setliste`, `oi`, `takt`, `stagediveKnopf`, `bierdusche`, `getragen`), Titel je `titelSchluessel` (DE: leer „Becher leer.“, randSteher „Rand-Steher mit vollem Becher. Peinlich.“, legendaer „Trocken, aber legendär.“, koenig „Pit-König.“, solide „Ordentlich gepogt, Bier gerettet.“, nass „Mehr auf dem Shirt als im Becher.“; EN sinngemäß), Endbild-Beschriftungen, Ladenbeschreibungen.
- `laeden.js`: `LAEDEN = { keller, halle, wiese }` mit `{ x, z: [zMin, zMax], gitterZ, leute, pfeiler, decke, surfer, wall, matsch, boden, wand }` – Werte aus dem Entwurf, `gitterZ = z[0] + 0.6`.

- [ ] **Step 1: Failing tests:** gleiche Schlüssel und Arten in DE/EN; jeder `titelSchluessel`-Wert hat einen Titel in beiden Sprachen; jeder Laden hat `gitterZ > z[0]` und `zone(0, (gitterZ + z[1]) / 2, laden) === "mitte"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS. **Step 5:** Commit `feat(pogo): Texte und Läden`.

### Task 3: Physik der Menge (`js/pogo/physik.js`)

**Files:** Create `js/pogo/physik.js`; Test `tests/js/pogo-physik.test.mjs`

**Interfaces:**
- Consumes: `zone`, `teilBei`, `verschuettet` (Task 1).
- Produces: Person `{ x, z, vx, vz, r, masse, rand, anker, ich, rucksack, inLuft, stoss }`.
  - `bewegeMenge(leute, laden, teil, dt, zufall = Math.random, wall = null)` – Pogo-Stöße, Circle Pit (`teil.kreis && laden.wall`), Zusammenhalt, Wall of Death (`wall.phase` „teilen“/„rennen“), Rand-Leute zum Anker (wie Entwurf).
  - `randSchubs(ich, laden, dt)` – steht `ich` in Zone „rand“, Beschleunigung 8 m/s² Richtung Mitte; gibt `true` zurück, wenn geschubst wurde.
  - `integriere(leute, laden, dt, matsch = [])` – Reibung, Höchstgeschwindigkeit, Wände, Pfeiler, Absperrgitter (`z >= gitterZ`).
  - `stoesse(leute) -> [{ ich: Person, anderer: Person, schlag }]` – Überlappung auflösen, Impuls; Treffer nur mit `ich`, nur wenn `ich.inLuft` falsch.

- [ ] **Step 1: Failing tests:** zwei überlappende Personen sind danach ≥ r1 + r2 auseinander; Treffer mit `ich` liefert `schlag` > 0; mit `ich.inLuft = true` kein Treffer; `randSchubs` am Rand → `vx` zeigt zur Mitte, im Pit → `false`; nach `integriere` ist niemand vor dem Gitter (`z >= gitterZ`); deterministisch mit festem `zufall`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren (Algorithmen aus dem Entwurf übernehmen). **Step 4:** PASS. **Step 5:** Commit `feat(pogo): Physik der Menge`.

### Task 4: Figuren und Szene (three.js)

**Files:** Create `js/pogo/figuren.js`, `js/pogo/szene.js`; Test `tests/js/pogo-figuren.test.mjs`

**Interfaces:**
- `figuren.js`: `fuegeZusammen(THREE, teile: [{ geo, farbe, matrix }]) -> BufferGeometry` (Positionen, Normalen, Vertexfarben, Indizes aneinandergehängt); `baueFigur(THREE, opt) -> { g, arme: [links, rechts], koerper }` – Körper inkl. Beine, Stiefel, Kopf, Frisur als **eine** Mesh mit `vertexColors`, Arme je eine Mesh, Aufnäher eigene Mesh; `baueBecher(THREE)`, `becherStand(b, anteil)`.
- `szene.js`: `baueSzene(THREE, { leinwand, laden, sp, fps })` → `{ scene, camera, renderer, raum, band: [Figur], ordner: Figur, gitter, spots, setzeLicht(kraft, zeit), kamera(ich, dt, sofort, stagedive), render() }`; r169-Licht (physikalisch, Intensitäten neu abgestimmt), Nebel, Absperrgitter bei `gitterZ`, Ordner (gelbes Shirt) davor, Band auf der Bühne.

- [ ] **Step 1: Failing test** (three in Node): `fuegeZusammen` aus zwei Boxen ergibt 2× Eckpunkte und 2× Indizes, Index-Versatz korrekt, Farbattribut vorhanden.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS. **Step 5:** Commit `feat(pogo): Figuren und Szene`.

### Task 5: Spiel, Musik, Seite

**Files:** Create `js/pogo/musik.js`, `js/pogo/app.js`, `pogo.html`, `en/pogo.html`, `css/pogo.css`

**Interfaces:** Consumes alles aus Tasks 1–4. Produces die spielbare Seite.

- [ ] **Step 1:** `musik.js`: Beat aus dem Entwurf als `starteBeat(zeitFn)`, `stoppeBeat()`, `setzeTon(an)`; läuft ohne AudioContext stumm weiter.
- [ ] **Step 2:** `app.js`: Spielzustand (`bier`, `punkte`, `zeit`, `zoneJetzt`, `reiheSeit`, `ordnerNassBis`, `andenken[]`, `stagedive`, `mikro`), Schleife mit dt ≤ 0.05, Pause bei verstecktem Tab. Eingabe: Stick per Ziehen, Tippen = Sprung (`geste`), Leertaste = Sprung, Pfeile/WASD. Abläufe: Rand schubst (Pop `randSchubs`, höchstens alle 3 s), Gedränge, Ordner (im Refrain, wenn ≥ 3 s in der Reihe, dann 3 s nass), „DU DA!“ (einmal je Refrain in der Reihe), Würfe (Plektrum im ersten Refrain, Drumstick 4 s vor Ende, Setliste mit 30 % im letzten Refrain; fliegen 1,2 s im Bogen auf einen Punkt in der Reihe/im vorderen Pit; Fang wenn ≤ 0,7 m), Mikro-Moment (bei t = 44–48 s in der Reihe: jedes Tippen im Takt +40, Pop „OI!“), Stagedive (Knopf nach `STAGEDIVE_AB` s in der Reihe; 5 s Tragen nach hinten auf 2,1 m Höhe, alle ~0,7 s greift eine Hand links oder rechts, Gegenwischen innerhalb 0,6 s wehrt ab, sonst −12 % Bier; am Ende mit Bier > 0 Bonus 600, sonst Pop „Bierdusche“). Crowdsurfer, Freibier, Wall of Death, Circle Pit wie im Entwurf. `ende()` hat Vorrang vor allen laufenden Abläufen.
- [ ] **Step 3:** `pogo.html`/`en/pogo.html`: Kopf wie Bandseite (gleiche Navigation, kein Menüpunkt „Pogo“), Spielfläche, HUD (Bier, Pogo-Punkte, Songteil, Zeit, Zonenhinweis), Start (Ladenwahl), Ende (Ergebnis, Punkte, Bier, Titel, Andenken, Link zur Säule), Ton-Knopf, Stagedive-Knopf, `?fps`-Anzeige. `css/pogo.css` im Stil der Seite.
- [ ] **Step 4:** Alle Tests grün; Seite lokal laden, Konsole ohne Fehler.
- [ ] **Step 5:** Commit `feat(pogo): spielbare Seite Etappe 1`.

### Task 6: Prüfen und als Artefakt zeigen

- [ ] **Step 1:** Vorschau (`fof-site`): DE und EN, Desktop und 375 px und 320 px; eine Runde in jedem Laden; Stagedive, Mikro-Moment, Fang einmal ausgelöst; `?fps` zeigt Zeichenaufrufe ≤ 300.
- [ ] **Step 2:** Artefakt veröffentlichen (`pogo.html` mit `files`: `js/pogo/*`, `assets/vendor/three.module.min.js`, `css/tokens.css`, `css/base.css`, `css/pogo.css`, `assets/fonts/*`).
- [ ] **Step 3:** Abschlussprüfung durch frischen Prüfer, Befunde beheben, Commit.
