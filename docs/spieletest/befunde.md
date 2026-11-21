# Spieletest Pogo – Befundliste

Hier schreibt der Spieletester-Agent (`.claude/agents/pogo-spieletester.md`) seine Läufe hinein: Fehler, Vorschläge und offene Fragen zum Browserspiel `pogo.html`.

**Abarbeiten:** Einen Befund umsetzen, dann in seiner Tabellenzeile `offen` durch `erledigt (<Commit>)` ersetzen. Bewusst nicht umgesetzt: `verworfen (<Grund>)`. Fragen klärt Mark, Antwort beim Befund notieren.

**Schwere:** hoch = Spiel bricht ab oder wertet falsch · mittel = stört spürbar · klein = Schönheitsfehler.

## Läufe

## Lauf 2026-11-21 · lokal (master) · Rechner 1280×800 + Handy 375×812 · DE + EN

Kurzfazit: Das Spiel läuft stabil (Start per Tastatur, Fenstergröße, Tab-Wechsel, dreifaches „Nochmal“, Stagedive, alle vier Läden, DE und EN ohne deutsche Reste; keine Konsolenfehler, keine 404). Am meisten stört auf dem Handy die Enge im Spielfeld (Aufgaben unter „Ton an“, Songauswahl unter dem Startknopf) und die Wertung: Wer nur im Pit steht, bekommt 327 Punkte, meine groben Spielbots endeten dagegen alle mit leerem Becher und Ergebnis 0.

Grenzen des Laufs: Es spielte ein Skript (Bot), kein Mensch; sein Springen traf den Takt nur etwa jedes vierte Mal (22 von 80), jeder Fehlsprung kostet 3 % Bier. Die Aussagen zur Wertung (PT-03, PT-04) sind deshalb Fragen, keine Fehler. Bildrate nicht belastbar: Der Browser rendert ohne Grafikkarte (Software-GL), 16–28 fps im Rechner-Format, 52–60 fps im Handy-Format. Nicht erreicht: erfolgreiche Zugabe mit getragenem Sänger, Modeschnösel-Rausschmiss, goldenes Motiv am Rechner (auf dem Handy einmal abgeguckt: Motiv 016), Einstieg über die 3D-Säule in `bands.html`.

Gespielte Runden (8): PC/DE Pitcher aktiv · PC/EN Druckluft drinnen aktiv · PC/DE Druckluft draußen faul · PC/DE Pitcher aktiv (mit Takt-Anpassung) · Handy/DE Altenberg aktiv · PC/EN Altenberg nur laufen + Stagedive · Handy/EN Druckluft draußen · PC/DE Tastatur, Hämmern, Resize, Tab-Wechsel (reduzierte Bewegung). Dazu zwei kurze Stagedive-Messungen und zwei Handy-Layoutmessungen.

| ID | Art | Schwere | Wo | Befund | Status |
|---|---|---|---|---|---|
| PT-20261121-01 | Fehler | mittel | HUD, Handy | Aufgaben-Zeile läuft unter den „Ton an“-Knopf; Schrift nur 10,9 px | erledigt (66aa037) |
| PT-20261121-02 | Fehler | mittel | Startbild, Handy | Startknopf verdeckt die Songauswahl; Startbild scrollt innen | erledigt (f27c9dd: Knopf klebt unten, Läden zweispaltig) |
| PT-20261121-03 | Frage | mittel | Wertung | Nur im Pit stehen bringt 327 Punkte und die ganze Runde | offen (Frage an Mark) |
| PT-20261121-04 | Frage | mittel | Wertung | Leerer Becher = Ergebnis 0, auch mit 500–1300 Punkten | offen (Frage an Mark) |
| PT-20261121-05 | Vorschlag | mittel | Stagedive | Ein Klick ohne Abwehr bringt rund 900 Punkte | offen (Frage an Mark) |
| PT-20261121-06 | Fehler | klein | Kopf der Seite | „Spiel · Entwurf, Etappe 1“ steht noch auf der Seite (DE und EN) | erledigt (66aa037) |
| PT-20261121-07 | Vorschlag | klein | Startbild | Steuerung steht nur unter dem Spielfeld, nicht im Startbild | erledigt (66aa037) |
| PT-20261121-08 | Vorschlag | klein | Startbild, Rechner | Startknopf liegt bei 1280×800 unter dem sichtbaren Bereich | erledigt (66aa037: Links springen aufs Spielfeld) |
| PT-20261121-09 | Frage | klein | Aufgaben | „Kein Stiefel im Bier (+250)“ wird auch bei leerem Becher gutgeschrieben | offen (Frage an Mark) |
| PT-20261121-10 | Vorschlag | klein | Tastatur | Tab/Enter im Spiel: Seite wurde verlassen | verworfen (Tab/Enter sind normales Browserverhalten; abfangen würde Tastaturnutzer einsperren) |
| PT-20261121-11 | Frage | klein | Konsole | Bei jedem Laden die Warnung „CONTEXT_LOST_WEBGL: loseContext“ | offen (harmlos, Ursache nicht geprüft) |

### PT-20261121-01 · Handy: Aufgaben laufen unter „Ton an“
- **Schritte:** 1. 375×812, `pogo.html`, Laden wählen, „Rein in den Pit“. 2. Oben im HUD die Aufgabenzeile ansehen.
- **Erwartet:** Aufgaben und „Ton an“ nebeneinander lesbar, ohne Überdeckung.
- **Beobachtet:** `#pogo-aufgaben` liegt bei x 31–347, y 53–82, `#pogo-ton` bei x 260–337, y 51–95 (DE; EN: Knopf x 243–337, breiter): überlappt. Der Aufgabentext läuft hinter den Knopf. Schriftgröße der Aufgaben 10,88 px, des Knopfes 11,2 px.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-handy-en-spiel-scroll.png`, `docs/spieletest/bilder/2026-11-21-r5-02-spiel0.png`
- **Idee zur Lösung:** Aufgaben unter die Kopfzeile oder rechts Platz für den Knopf lassen (max-width), Schrift etwas größer.

### PT-20261121-02 · Handy: Startknopf verdeckt die Songauswahl
- **Schritte:** 1. 375×812, Seite laden, zum Spielfeld scrollen. 2. Startbild ansehen.
- **Erwartet:** Läden, Song und Startknopf vollständig sichtbar oder klar als scrollbar erkennbar.
- **Beobachtet:** Das Startbild ist 492 px hoch, sein Inhalt 554 px (DE) bzw. 596 px (EN) und scrollt innen (`overflow: auto`). „Rein in den Pit“ (y 436–478) liegt über dem Song „Dan Ganove“ und der Zeile „Musik: …“; vom Song ist nur ein Streifen zu sehen. Mit nur einem Song (vorgewählt) unkritisch; mit mehr Songs wäre die Auswahl schwer bedienbar, ohne zu wissen, dass man innen scrollen kann.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-handy-en-start-scroll.png`, `docs/spieletest/bilder/2026-11-21-handy-de-start-scroll.png`
- **Idee zur Lösung:** Startknopf nicht überlagern (im Fluss unter dem Inhalt lassen) oder Läden-Karten auf dem Handy kompakter machen.

### PT-20261121-03 · Nur im Pit stehen lohnt sich ein Stück weit
- **Schritte:** 1. PC, DE, „Druckluft draußen“. 2. Nach „Rein in den Pit“ keine Taste, keine Eingabe, 63 s.
- **Erwartet:** Faulenzen bringt (fast) nichts; Spec: „Wer am Rand rumsteht, kriegt keine Punkte.“
- **Beobachtet:** Die Figur steht in der Zone „Pit“ (10 Punkte/s, im Refrain ×1,5). Ergebnis: Punkte 695 × Bier 47 % = 327, Titel „Mehr auf dem Shirt als im Becher.“, die Runde läuft komplett durch bis „Keine Zugabe. Nächstes Mal lauter!“. Zum Vergleich: alle sechs aktiven Bot-Runden endeten nach 25–33 s mit leerem Becher und Ergebnis 0 (nur die Stagedive-Runde PC/EN Altenberg lief 74 s, auch mit 0). Jeder Sprung neben dem Takt kostet 3 % Bier (`SPRUNG.daneben`), der Bot sprang aber grob.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-r3-03-ende.png`
- **Idee zur Lösung:** Entscheiden, ob stehender Pit-Aufenthalt Punkte bringen soll; z. B. Pit-Punkte nur bei Bewegung oder Sprung im Takt, oder Fehlsprung milder bestrafen.

### PT-20261121-04 · Leerer Becher macht das Ergebnis 0
- **Schritte:** 1. Eine aktive Runde spielen, Bier auf 0 laufen lassen.
- **Erwartet:** Offene Frage: soll eine Runde mit 500–1300 Pogo-Punkten als „0“ gewertet werden?
- **Beobachtet:** `ergebnis = Punkte × Bier / 100`. Beispiele: 540 × 0 %, 528 × 0 %, 782 × 0 %, 1314 × 0 % (Altenberg), 847 × 0 %; Ergebnis jeweils 0. Die Runde endet dabei nach 25–33 s von 58 s. Bestwert und Rang (Summe aller Ergebnisse) bleiben so bei 0, die Ladenziele (1500 bis 4500) sind mit solchen Runden nicht zu erreichen. Der Spec nennt das so („zwei Werte und Ergebnis“); ob es für neue Spieler motiviert, ist offen. Das Bot-Spiel ist grob, ein Mensch trifft den Takt besser.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-r1-03-ende.png`, `docs/spieletest/bilder/2026-11-21-r5-03-ende.png`
- **Idee zur Lösung:** Mindestens Teilwertung bei leerem Becher (z. B. 25 % der Punkte) oder im Endbild die Pogo-Punkte größer zeigen als die „0“.

### PT-20261121-05 · Stagedive ist ein Selbstläufer
- **Schritte:** 1. PC, „Pitcher“, nach vorn zur ersten Reihe laufen (Knopf erscheint nach ca. 6 s Spielzeit). 2. „Stagediven!“ klicken. 3. Keine Hand abwehren.
- **Erwartet:** Der Bonus (600) hängt am Becher, der oben bleibt; Hände abwehren soll nötig sein (Spec: „Hände der Menge greifen danach, wischen = Becher wegziehen“).
- **Beobachtet:** Ohne einen einzigen Wisch: Punkte 153 → 1101 in 4 s, Bier 82 % → 68 % (Handy-Format: 132 → 1073, Bier 92 → 77 %). Das sind 60 Punkte/s × 5 s plus 600 Landebonus, nur 6 % Bier je verpasstem Griff. Fast das Pitcher-Ziel (1500) für einen Klick, schon im Intro. Hinweis: Der Test-Browser konnte den pulsierenden Knopf nicht per Elementklick treffen („element is not stable“, wegen der Animation `pogo-puls`); ein Klick an der Koordinate funktionierte. Für Menschen kein Problem.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-stagedive-pc-nach.png`, `docs/spieletest/bilder/2026-11-21-stagedive-handy-nach.png`
- **Idee zur Lösung:** Bonus nur bei Bier > 50 % (wie die Aufgabe) oder Griffe häufiger/teurer; Knopf erst ab Refrain.

### PT-20261121-06 · Alter Kopfzeilentext
- **Schritte:** 1. `pogo.html` bzw. `en/pogo.html` öffnen.
- **Erwartet:** Kein „Entwurf, Etappe 1“ mehr; das Spiel ist verlinkt und im Menü.
- **Beobachtet:** Rote Zeile über der Überschrift: „Spiel · Entwurf, Etappe 1“ (DE) und „Game · draft, stage 1“ (EN, `en/pogo.html` Zeile 43).
- **Beleg:** `docs/spieletest/bilder/2026-11-21-start-pc-de.png`
- **Idee zur Lösung:** Text ändern, z. B. „Spiel“.

### PT-20261121-07 · Steuerung nicht im Startbild
- **Schritte:** 1. Startbild am Rechner oder Handy ansehen.
- **Erwartet:** Man erfährt vor dem Start, wie man läuft und springt.
- **Beobachtet:** Der Satz zur Steuerung (`.pogo__steuerung`) steht unterhalb des Spielfeldes (Handy y 509–588; am Rechner unter dem 768 px hohen Feld, bei 800 px Fensterhöhe nicht im Bild). Im Startbild selbst kein Wort dazu.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-r1-01-start.png`
- **Idee zur Lösung:** Eine Zeile im Startbild über dem Knopf.

### PT-20261121-08 · Rechner: Startknopf unter dem sichtbaren Bereich
- **Schritte:** 1. 1280×800, `pogo.html` laden, nicht scrollen.
- **Erwartet:** Man sieht, dass es ein Spiel mit Startknopf gibt.
- **Beobachtet:** Kopf, Überschrift und Einleitung belegen die obere Hälfte; das Spielfeld beginnt bei y ≈ 465, sichtbar sind nur Aufgaben, Rang und die Überschrift „Wo pogst du heute?“. Läden, Song und Knopf liegen darunter.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-start-pc-de.png`
- **Idee zur Lösung:** Kopfbereich kleiner machen oder beim Wählen eines Ladens zum Spielfeld scrollen.

### PT-20261121-09 · Aufgabe „Kein Stiefel im Bier“ bei leerem Becher
- **Schritte:** 1. Runde mit der Aufgabe „Kein Stiefel im Bier“ (Crowdsurfer überleben ohne Treffer) spielen, bis der Becher leer ist.
- **Erwartet:** Offene Frage: soll die Aufgabe zählen, wenn die Runde früh mit leerem Becher abbricht?
- **Beobachtet:** Handy/DE Altenberg und PC/EN Altenberg: „✓ Kein Stiefel im Bier (+250)“ bei Bier 0 %; Punkte 532 → 782 bzw. 1063 → 1314.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-r5-03-ende.png`

### PT-20261121-10 · Tab/Enter im Spiel
- **Schritte:** 1. Per Tastatur starten (Enter auf „Rein in den Pit“). 2. Während der Runde Tab und Enter zwischen Pfeiltasten und Leertaste drücken.
- **Erwartet:** Tab/Enter stören die Runde nicht.
- **Beobachtet:** Die Seite war danach nicht mehr `pogo.html` (Skript fand `#pogo-spiel` nicht mehr). Ziel der Navigation nicht festgestellt; denkbar ist ein fokussierter Link der Kopfzeile. Ohne Tab/Enter blieb alles stabil (Hämmern mit a, d, w, s, Pfeilen, Escape, Shift, q: keine Fehler; Leertaste gehalten springt nur einmal, gut).
- **Beleg:** kein Bild (Seitenwechsel)
- **Idee zur Lösung:** Optional Tab im Spiel abfangen oder den Fokus auf den Spielbereich setzen.

### PT-20261121-11 · Konsolenwarnung bei jedem Laden
- **Schritte:** 1. Eine beliebige Pogo-Seite laden, Konsole lesen.
- **Erwartet:** Keine Warnungen.
- **Beobachtet:** Jedes Mal „WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost“ (alle Läufe), dazu im Testbrowser „GPU stall due to ReadPixels“ (Software-GL, vermutlich nur dort). Ursache der ersten Meldung nicht geprüft; Spiel läuft danach normal. Sonst keine Fehler, keine fehlgeschlagenen Anfragen (404).

