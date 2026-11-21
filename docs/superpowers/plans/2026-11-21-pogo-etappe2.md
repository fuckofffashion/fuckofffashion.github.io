# Pogo Etappe 2 – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die drei Beispiel-Läden durch vier echte ersetzen (PITCHER, Druckluft innen, Druckluft draußen, Zentrum Altenberg), dazu Andenken-Sammlung auf dem Gerät und zwei Aufgaben pro Runde.

**Architecture:** Läden bleiben Daten (`laeden.js`) mit einem Feld `deko`, das `szene.js` in Bauteile übersetzt. Andenken (`andenken.js`) und Aufgaben (`aufgaben.js`) sind reine Module mit Node-Tests; `app.js` sammelt Rundenwerte und verdrahtet beides.

**Tech Stack:** wie Etappe 1 (three.js r169 vendort, Vanilla-JS-Module, `node --test`).

**Spec:** `docs/superpowers/specs/2026-11-21-pogo-design.md` (Abschnitt „Etappe 2“)

## Global Constraints

- Ungefährer Nachbau, keine fremden Fotos im Spiel; Texte DE/EN in `texte.js`.
- Andenken nur in `localStorage`, jeder Zugriff in try/catch; ohne Speicher läuft das Spiel normal.
- Aufgaben: 2 pro Runde, je +250 Punkte; Crowdsurfer-Aufgabe nur in Läden mit `surfer: true`.
- Höchstens ~40 Figuren, ≤ 300 Zeichenaufrufe; neue Deko teilt Geometrien/Materialien.
- Alle Etappe-1-Regeln gelten weiter (Spec, Plan Etappe 1).

## Review Focus

1. Speicher gesperrt oder voll (privates Fenster): Startbild und Ende funktionieren, Kutte zeigt „noch leer“ (Task 2: Test mit werfendem Speicher).
2. Gespeicherte Andenken in kaputtem Format (alte Version, fremder Inhalt): wird verworfen statt zu werfen (Task 2: Test).
3. Laden ohne Crowdsurfer zieht nie die Crowdsurfer-Aufgabe (Task 3: Test).
4. Laden-Wechsel mehrfach hintereinander: keine wachsenden Zeichenaufrufe (Task 4, Browser mit `?fps`).
5. Aufgabe, die im Songablauf nicht erreichbar ist (z. B. Plektrum ohne Wurf), darf nicht gezogen werden (Task 3: alle Aufgaben haben eine Bedingung, die der Song erfüllen kann).

---

### Task 1: Echte Läden (`laeden.js`, `texte.js`)

- Läden `pitcher` (x 3.4, z [-4.0, 4.0], decke 2.9, surfer false, wall false, deko ["ventilatoren", "bilderwand"], licht "lila"), `druckluftInnen` (x 3.8, z [-4.2, 4.6], decke 3.2, surfer false, deko ["graffiti"], licht "rot"), `druckluftDraussen` (x 6.0, z [-5.0, 6.0], draussen true, surfer true, deko ["schriftzug", "graffiti", "baenke"], licht "abend"), `altenberg` (x 6.4, z [-5.4, 6.4], surfer true, wall true, deko ["traversen"], licht "blau"); `gitterZ = z[0] + 0.6`; `leute` 14/16/20/22.
- Texte DE/EN: Name und Satz je Laden; Beispiel-Hinweis im Startbild entfällt.
- Tests: genau diese vier ids; Zone-Mitte-Test wie bisher; nur `druckluftDraussen` hat `draussen`; Texte für alle vier in beiden Sprachen.

### Task 2: Andenken (`andenken.js`)

- `leseKutte(speicher) -> { [art]: anzahl }` (Schlüssel `fof-pogo-kutte-v1`; kaputt/fehlend/werfender Speicher → `{}`), `schreibeKutte(speicher, kutte) -> boolean`, `mitFang(kutte, arten: string[]) -> kutte` (neues Objekt), `kutteText(kutte, sp) -> string` (DE „3 Plektren, 1 Drumstick“, Einzahl/Mehrzahl; leer → „noch leer“ / „still empty“).
- Tests: Hin- und Rückweg mit Fake-Speicher; werfender Speicher → `{}` bzw. `false`; Müll im Speicher → `{}`; Einzahl/Mehrzahl DE/EN.

### Task 3: Aufgaben (`aufgaben.js`)

- `AUFGABEN`: `reiheLetzterRefrain`, `plektrum`, `mitte10`, `stagediveVoll`, `takt8`, `surferUeberlebt` – je `{ id, nurMitSurfer?, erfuellt(stats) }`.
- `stats = { reiheImLetztenRefrain: bool, gefangen: string[], mitteSekunden, stagediveBier: number|null, taktSpruenge, surferTreffer, surferGesehen }`.
- `ziehe(laden, zufall = Math.random) -> [aufgabe, aufgabe]` (verschieden; ohne `surfer` nie `surferUeberlebt`).
- `AUFGABE_PUNKTE = 250`.
- Tests: Bedingungen an ihren Grenzen (10 s Mitte, 8 Sprünge, Stagedive 50 %), Ziehen ohne Surfer (1000 Läufe), zwei verschiedene.

### Task 4: Szene je Laden (`szene.js`)

- Bauteile je `deko`: Deckenventilatoren (3, drehen sich, unter der Decke), Bilderwand (bunte Rahmen hinter der Bühne, eine Leinwand-Textur), Graffiti (Leinwand-Textur auf den Wänden), Schriftzug-Gebäude hinter der Bühne mit „druckluft“ in Großbuchstaben aufs Dach (eigene Schrift Anton, keine Logo-Kopie), Bierbänke am Rand, Stahltraversen über der Bühne (Fachwerk aus Boxen). Licht je `licht`: lila, rot, abend (Himmel dunkelblau, weniger Nebel), blau.
- Prüfung im Browser je Laden, `?fps` nach mehrfachem Wechsel.

### Task 5: Spiel verdrahten (`app.js`, Seiten, CSS)

- Rundenwerte (`stats`) mitschreiben; zwei Aufgaben beim Start ziehen, im Startbild und im HUD (klein) zeigen, erfüllte im Endbild abhaken und Punkte addieren.
- Kutte: beim Start lesen und anzeigen; am Ende Fänge hinzufügen und speichern.
- Startbild ohne „Beispiel-Läden“.
- Tests grün, Browser DE/EN, Artefakt aktualisieren, Abschlussprüfung.
