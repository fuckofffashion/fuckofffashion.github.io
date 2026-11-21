# Spieletest Pogo – Befundliste

Hier schreibt der Spieletester-Agent (`.claude/agents/pogo-spieletester.md`) seine Läufe hinein: Fehler, Vorschläge und offene Fragen zum Browserspiel `pogo.html`.

**Abarbeiten:** Einen Befund umsetzen, dann in seiner Tabellenzeile `offen` durch `erledigt (<Commit>)` ersetzen. Bewusst nicht umgesetzt: `verworfen (<Grund>)`. Fragen klärt Mark, Antwort beim Befund notieren.

**Schwere:** hoch = Spiel bricht ab oder wertet falsch · mittel = stört spürbar · klein = Schönheitsfehler.

## Läufe

## Lauf 2026-11-21 (2) · lokal (master = live) · Rechner 1280×800 + Handy 375×812 · DE + EN

Kurzfazit: Technisch ist Pogo in sehr gutem Zustand: 60 fps in allen acht Runden, p95 der Bildzeit 16,7 ms, kein Speicherleck, keine Konsolenfehler, Touch-Takt auf die Millisekunde fair. Die neue Wertung hat das Faulenzen erledigt (Ergebnis 88 statt 1343), aber das Bier ist zum reinen Zeitlimit geworden: **alle 8 Runden endeten mit leerem Becher**, auch die eines Bots mit 100 % Takt-Treffern und jeder abgewehrten Hand. Damit ist das Ergebnis immer Punkte ÷ 4, der Titel immer „Becher leer.“, und die Ziele 2500, 3500 und 4500 sind nicht erreichbar. Am meisten stört außerdem, dass HUD („Punkte 5371“) und Ziel („noch 157 Punkte“) dasselbe Wort für zwei verschiedene Zahlen benutzen.

**Grenzen des Laufs:** Gespielt haben Skripte (Bots), kein Mensch. Damit der Bot den Takt sicher trifft und Ereignisse findet, hat der Testbrowser `app.js` beim Laden um eine Lesesonde ergänzt (`window.__pogo`, nur im Testbrowser per Playwright-`route`, keine Codeänderung im Projekt). Eingaben liefen trotzdem über echte Tastatur-Ereignisse bzw. echte Touch-Ereignisse (CDP). Die Profi-Bot-Ergebnisse sind deshalb **Obergrenzen**: ein Mensch trifft weniger Takte und wehrt weniger Hände ab. Grafik: echte GPU (Chromium headless, ANGLE/D3D11, NVIDIA RTX 4070 SUPER), also kein Handy-Grafikchip; CPU-Drosselung 4× per DevTools. Nicht geprüft: echtes Handy, Tab-Wechsel, Kontextverlust, Gamepad, Bildschirmleser (in Lauf 1 erledigt bzw. offen).

**Gespielte Runden (8)**

| Runde | Gerät, Sprache | Laden | Spielweise | Punkte | Bier am Ende | Ergebnis | Runde endete |
|---|---|---|---|---|---|---|---|
| 1 | PC, DE | Pitcher | Profi-Bot: Takt, Reihe/Mitte, Stagedive, Würfe, Zugabe | 5371 | 0 % (in der Zugabe) | 1343 | Becher leer, Zugabe 52 s |
| 2 | PC, DE | Pitcher | nur Pfeil hoch halten (eine Taste) | 1514 | 0 % | 379 | Becher leer, 57 s |
| 3 | PC, DE | Druckluft draußen | gar nichts tun | 351 | 0 % | 88 | Becher leer, 57 s |
| 4 | PC, DE | Druckluft drinnen | Profi-Bot | 4930 | 0 % (in der Zugabe) | 1233 | Becher leer, Zugabe 51 s |
| 5 | PC, DE | Zentrum Altenberg | Profi-Bot | 2868 | 0 % | 717 | Becher leer, 48 s |
| 6 | Handy, DE, Touch, CPU 4× | Druckluft draußen | Touch-Bot: ziehen, im Takt tippen, Stagedive, Zugabe | 4210 | 0 % (in der Zugabe) | 1053 | Becher leer, Zugabe 45 s |
| 7 | PC, EN, reduzierte Bewegung | Zentrum Altenberg | Mitte halten, auf **jeden** Schlag springen | 1814 | 0 % | 454 | Becher leer, 33,5 s |
| 8 | PC, EN, reduzierte Bewegung | Pitcher | Profi-Bot, Stagedive **ohne** Abwehr | 4342 | 0 % | 1086 | Becher leer, 55,4 s |

**Leistung (Messweg: `requestAnimationFrame`-Abstände über die ganze Runde, `?fps`, `renderer.info`, `performance.memory` nach `gc()`)**

| Messung | Wert |
|---|---|
| Bildzeit, Rechner 1280×800, Runden 1–5, 7, 8 | Mittel 16,7 ms, p95 16,7–16,8 ms, p99 16,8 ms, Ruckler > 50 ms: 0 (einmal genau 50 ms in der ersten Sekunde, r1 und r7) |
| Bildzeit Refrain / Wall of Death (r5, Altenberg) | p95 16,8 ms / 16,7 ms (AUFBAU 37–43 s) |
| Bildzeit Handy 375×812, DPR 2, CPU 4× gedrosselt (r6) | Mittel 16,7 ms, p95 16,7 ms, 2 Ruckler > 50 ms, max 117 ms |
| `?fps` erste Sekunde | 32–51 fps (Shader werden beim ersten Bild kompiliert), danach 60 |
| Zeichenaufrufe | 49–198 (Spec-Grenze ~300) |
| Speicher nach Runde 0/1/2/3/4/5 (eine Seite) | Heap 9,4 / 9,5 / 9,6 / 10,6 / 10,1 / 10,6 MB; Geometrien 94 / 103 / 101 / 129 / 114 / 134 (je nach Laden) |
| Ladenwechsel-Test, 6 Zyklen über alle 4 Läden | Geometrien 94 → 94, Texturen 26 → 26, Heap 9,4 → 9,3 MB: **kein Leck** |
| Touch-Takt (r6, 68 Tipps) | Abstand Audiouhr zu Spieluhr beim Tippen: Median 9 ms, p95 12 ms, max 20 ms; 62 von 62 Tipps im Takt (nach Audiouhr) auch als „IM TAKT“ gewertet |
| Laden ungedrosselt (Handy) | Startknopf klickbar nach 1,0 s |
| Laden Fast 3G (562 ms, 1,47 Mbit/s) + CPU 4× | Spielfeld sichtbar 9,3 s, „Song lädt …“ bis 23,5 s, dann Startknopf; 3454 KB in 47 Anfragen. Größte: Song 1476 KB, three.js 672 KB (lokaler Server ohne gzip; GitHub Pages komprimiert, nicht gemessen), Motivbilder 162/158/104/97 KB |
| Konsole | In allen Sitzungen keine Fehler, keine Warnungen, keine 404 |

**Neue Wertung – löst sie Lauf 1?**
- *Leerer Becher zählt wie 25 %* (PT-20261121-04): Ja, Runden mit leerem Becher zählen jetzt (1343 statt 0). Aber weil jede Runde leer endet, ist die Untergrenze der Normalfall geworden (PT-20261121-12).
- *Stillstand > 2 s = halbe Punkte* (PT-20261121-03): Ja. Faulenzen: 351 Punkte, 97 % der Zeit „still“, Ergebnis 88 (Lauf 1: 327). Profi: 1343, also das 15-Fache. Kleines Schlupfloch: eine Taste gegen das Gitter halten (PT-20261121-21).
- *Stagedive-Bonus nur ab 50 %* (PT-20261121-05): Nur halb. Wer früh und voll springt, landet auch ganz ohne Abwehr mit 67 % und kriegt die 600 (PT-20261121-16).
- *Alle Läden offen mit Zielen*: Offen ja, Ziele ab Laden 2 nicht erreichbar (PT-20261121-13).

| ID | Art | Schwere | Bereich | Wo | Befund | Aufwand | Status |
|---|---|---|---|---|---|---|---|
| PT-20261121-12 | Frage | hoch | Spielgefühl | Wertung, Bier | Becher läuft in jeder Runde leer (8 von 8), auch beim fehlerfreien Bot; Ergebnis ist immer Punkte ÷ 4, Titel immer „Becher leer.“ | mittel | offen |
| PT-20261121-13 | Frage | hoch | Spielgefühl | Tour-Ziele | Ziele 2500 / 3500 / 4500 unerreichbar: bestes Bot-Ergebnis 1233 / 1053 / 717 | klein | offen |
| PT-20261121-14 | Fehler | mittel | Design | HUD, Startbild, Endbild | „Punkte“ heißt im HUD Pogo-Punkte (5371), beim Ziel aber Ergebnis („noch 157 Punkte“) | klein | offen |
| PT-20261121-15 | Vorschlag | mittel | Spielgefühl | Zugabe | Zugabe leert den Becher (Sänger führt durch die Menge) und kann das Ergebnis senken | klein | offen |
| PT-20261121-16 | Vorschlag | mittel | Spielgefühl | Stagedive | Landebonus weiter ohne jede Abwehr sicher, schon im Intro (siehe erledigtes PT-20261121-05) | klein | offen |
| PT-20261121-17 | Vorschlag | mittel | Spielgefühl | Springen, Mikro | Sprung (0,45 s) dauert länger als ein Schlag (0,441 s): jeder zweite Tipp im Takt verpufft ohne Rückmeldung | klein | offen |
| PT-20261121-18 | Fehler | mittel | Design | Startbild, Handy | Klebender Startknopf verdeckt die Steuerungszeile, auf EN auch die Songkarte (siehe erledigtes PT-20261121-02) | klein | offen |
| PT-20261121-19 | Vorschlag | mittel | Leistung | Laden, Handy | Fast 3G + CPU 4×: Startknopf erst nach 23,5 s, 14 s davon „Song lädt …“ ohne Fortschritt | mittel | offen |
| PT-20261121-20 | Fehler | klein | Inhalt | Mikro-Moment | Spec: OI ist der „größte Bonus der Runde“; gemessen 4 × 40 = 160 Punkte, Stagedive 900 | klein | offen |
| PT-20261121-21 | Vorschlag | klein | Spielgefühl | Stillstand-Regel | Pfeil gegen das Gitter halten zählt als Bewegung: eine Taste, 0 % „still“, 1514 Punkte | klein | offen |
| PT-20261121-22 | Vorschlag | klein | Design | Pitcher, erste Reihe | Deckenventilator hängt vor der Kamera und verdeckt die Bühne | klein | offen |
| PT-20261121-23 | Vorschlag | klein | Leistung | Motive | Rückenaufnäher laden 1024-px-Bilder (vier größte zusammen 521 KB) | klein | offen |
| PT-20261121-24 | Vorschlag | klein | Design | Pops | Pop-Texte überlagern sich („SLOSHHAND! →“), gerade beim Stagedive | klein | offen |
| PT-20261121-25 | Vorschlag | klein | Leistung | Spielstart | Erste Sekunde 32–51 fps, einzelnes 50-ms-Bild: Shader kompilieren erst beim Start | klein | offen |
| PT-20261121-26 | Frage | klein | Spielgefühl | Altenberg, Song | Mit Kraft ×1,3 wird der AUFBAU (0,8) zum „wilden Teil“: Punkte ×1,5, „DU DA!“, Ordner | klein | offen |

### PT-20261121-12 · Der Becher läuft in jeder Runde leer
- **Schritte:** 1. Eine beliebige Runde aktiv spielen, mit gutem Takt, viel vorn. 2. Bierstand verfolgen.
- **Erwartet:** Bier ist eine Ressource, mit der man haushaltet: wer vorsichtig spielt, kommt mit mehr Bier an und bekommt ein besseres Ergebnis (Spec, Abschnitt Ablauf: „zwei Werte und Ergebnis“; Spec „Offen“: „hinten < Pit < vorn, mit spürbarem Risiko vorn“).
- **Beobachtet:** 8 von 8 Runden endeten mit 0 %, sieben davon vor dem Songende oder in der Zugabe. Auch Runde 7, die die Mitte hielt (kein Gedränge), war nach 33,5 s leer: in Altenberg kosten Rempler im Refrain 10–14 % je „PLATSCH!“, sieben in 10 s (Bier 86 % bei 15 s → 0 % bei 33,5 s). In der ersten Reihe läuft der Becher auch ohne Rempler leer: Pitcher, Runde 8, Bier 67 % bei 14 s → 26 % bei 43 s, fast nur Gedränge (`GEDRAENGE` 1,5 × Kraft %/s). Rechnung über den ganzen Song nur fürs Gedränge: 65 % (Pitcher) bis 85 % (Altenberg, Kraft ×1,3). Folge: Mit `BIER_MIN` = 25 % ist das Ergebnis immer Punkte × 0,25; ob man mit 1 % oder 24 % ankommt, ist egal; jedes Endbild heißt „Becher leer.“ – auch das beste der Sitzung (1343).
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r1-ende.png`, `docs/spieletest/bilder/2026-11-21-L2-r7-ende.png`, `docs/spieletest/bilder/2026-11-21-L2-r8-ende.png`
- **Messwert:** Bierverlauf aus dem Ereignisprotokoll des Bots je Pop („[p… b…]“), Runden 1–8, PC und Handy.
- **Idee zur Lösung:** Gedränge auf etwa 0,6 × Kraft %/s und Rempler auf höchstens 8 % senken, oder Bier nur bei Remplern verlieren und Gedränge als Punkteabzug; Ziel: ein guter Spieler kommt mit 30–60 % an.

### PT-20261121-13 · Ziele ab Laden 2 nicht erreichbar
- **Schritte:** 1. Je Laden eine Profi-Runde (Bot: 100 % Takt-Treffer, alle Hände abgewehrt, Würfe gefangen, Zugabe erreicht).
- **Erwartet:** Ziele schwer, aber schaffbar (Spec Etappe 3: „Jeder Laden hat ein Punkteziel als Abzeichen“).
- **Beobachtet:** Beste Ergebnisse: Pitcher 1343 (Ziel 1500), Druckluft drinnen 1233 (2500), Druckluft draußen 1053 (3500), Altenberg 717 (4500). Mit 25 % Untergrenze bräuchte Altenberg 18 000 Pogo-Punkte; der Bot schaffte 2868. Selbst mit 100 % Bier am Ende wären 4500 Punkte nötig. Ein Mensch liegt unter dem Bot.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r4-ende.png`, `docs/spieletest/bilder/2026-11-21-L2-r5-ende.png`, `docs/spieletest/bilder/2026-11-21-L2-r6-ende.png`
- **Messwert:** Endbild-Werte der Runden 1, 4, 5, 6.
- **Idee zur Lösung:** Erst PT-12 lösen, dann Ziele neu messen; vorläufig z. B. 800 / 1100 / 1400 / 1700.

### PT-20261121-14 · „Punkte“ bedeutet zwei verschiedene Zahlen
- **Schritte:** 1. Startbild: Pitcher „Ziel: noch 1500 Punkte“. 2. Spielen; HUD zeigt „PUNKTE 2321“ schon in der Strophe. 3. Endbild.
- **Erwartet:** Man sieht während der Runde, ob man das Ziel schafft.
- **Beobachtet:** Im HUD stehen Pogo-Punkte (am Ende 5371), das Ziel zählt aber das Ergebnis (Punkte × Bier): Endbild „Punkte 5371 × Bier 0 % (zählt als 25 %)“, „Ziel: noch 157 Punkte“. Wer 2321 im HUD sieht, glaubt, das Ziel 1500 sei längst geschafft.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r1-refrain.png`, `docs/spieletest/bilder/2026-11-21-L2-r1-ende.png`, `docs/spieletest/bilder/2026-11-21-L2-01-start-pc.png`
- **Idee zur Lösung:** Ziel „noch 157 Ergebnis“ nennen und im HUD das laufende Ergebnis klein neben den Punkten zeigen.

### PT-20261121-15 · Die Zugabe kann das Ergebnis senken
- **Schritte:** 1. Song mit Bier über 25 % beenden, Zugabe-Ruf schaffen. 2. In der Zugabe unter dem Sänger bleiben.
- **Erwartet:** Zugabe ist eine Belohnung (Spec Etappe 3: „Punkte ×1,5 … keine Strafe, nur keine Punkte mehr“).
- **Beobachtet:** Der Sänger zieht Kreise durch den Pit; wer ihm folgt, läuft durch die Menge. Runde 6: Songende 3375 Punkte, 25 % Bier; in der Zugabe „PLATSCH!“ zweimal in 1 s, Bier 25 % → 1 % → 0 % nach 2,5 s, Runde vorbei. Runde 1 und 4 endeten ebenso in der Zugabe. Rechnung: Wer mit 3400 Punkten und 60 % aus dem Song kommt (Ergebnis 2040) und in der Zugabe leer läuft, bräuchte über 4700 Zusatzpunkte, um nicht zu verlieren; die Zugabe dauert 15 s.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r6-ende.png`
- **Messwert:** Ereignisprotokoll r6: „58.0 ZUGABE! [p3375 b25] … 44.4 PLATSCH! [p3434 b15] … 45.4 PLATSCH! [p3480 b1]“.
- **Idee zur Lösung:** In der Zugabe ist man unter dem Sänger rempelfrei, oder das Ergebnis der Zugabe zählt nur, wenn es höher ist.

### PT-20261121-16 · Stagedive-Bonus ohne Abwehr (erneut, vgl. PT-20261121-05)
- **Schritte:** 1. Pitcher, nach vorn, nach 4 s in der ersten Reihe „Stagediven!“ (im Intro, 8,9 s). 2. Keine Hand abwehren.
- **Erwartet:** Ohne Abwehr kein Landebonus (Ziel der Änderung 2887381).
- **Beobachtet:** Bier 97 % → 87 → 77 → 67 % (drei Griffe à 10 %), „LANDED!“, Punkte 746 → 1406 in 1 s, gesamt +900 für einen Klick. Höchster Verlust ist 3 × 10 % = 30 %; wer mit ≥ 80 % springt, bekommt den Bonus immer. Der Knopf erscheint schon im Intro (Handy r6: 7,7 s).
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r8-sd.png`
- **Messwert:** Ereignisprotokoll r8: „8.9 STAGEDIVE bei Bier 97 … 13.9 LANDED! [p1406 b67]“.
- **Idee zur Lösung:** Bonus nach abgewehrten Händen staffeln (0 / 200 / 400 / 600) statt nach Bier; Knopf erst ab dem ersten Refrain.

### PT-20261121-17 · Jeder zweite Tipp im Takt verpufft
- **Schritte:** 1. Auf jeden Schlag springen (Leertaste oder Tippen).
- **Erwartet:** Jeder Treffer wird beantwortet; ein ignorierter Tipp zeigt wenigstens etwas.
- **Beobachtet:** Song 135,94 BPM = 0,441 s je Schlag, ein Sprung dauert 0,45 s (`sprungBis = zeit + 0.45`); während man in der Luft ist, wird `springe()` stumm verworfen. Runde 7: 76 Sprünge exakt auf dem Schlag, 38 gewertet (50 %), ohne „daneben“, ohne Ton. Dasselbe beim Mikro: OI nur auf jedem zweiten Schlag (Runde 6: 4 OI in 4 s).
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r7-mitte.png`
- **Messwert:** Bot-Zähler r7 (Sprünge 76, Treffer 38), Taktzeit aus `songs.js`.
- **Idee zur Lösung:** Sprungdauer an den Schlag koppeln (z. B. 0,8 × Schlagdauer) oder beim Mikro-Moment ohne Sprung zählen.

### PT-20261121-18 · Handy: Startknopf verdeckt die Steuerungszeile (vgl. PT-20261121-02)
- **Schritte:** 1. 375×812, `pogo.html` bzw. `en/pogo.html`, zum Spielfeld scrollen, Startbild ansehen.
- **Erwartet:** Steuerung und Song lesbar, Startknopf darunter.
- **Beobachtet:** Startbild 492 px hoch, Inhalt 551 px (DE) bzw. 593 px (EN), scrollt innen ohne Hinweis. Die neue Steuerungszeile (`.pogo__kurz`, y 750–805) liegt unter dem klebenden Startknopf (y 755–797). Auf EN liegt auch die Songkarte (y 726–784) halb darunter. Erst nach Innen-Scrollen frei (y 691–746).
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r6-start.png`, `docs/spieletest/bilder/2026-11-21-L2-handy-start-unten-de.png`
- **Messwert:** `getBoundingClientRect()` im Testbrowser, 375×812, DPR 2.
- **Idee zur Lösung:** Steuerungszeile über die Läden setzen oder auf dem Handy die Ladenkarten einzeilig (nur Name + Ziel).

### PT-20261121-19 · Langes Warten auf den Song bei schwachem Netz
- **Schritte:** 1. Handy-Format, DevTools „Fast 3G“ (562 ms, 1,47 Mbit/s), CPU 4×, Cache aus. 2. `pogo.html` laden, auf „Rein in den Pit“ warten.
- **Erwartet:** In wenigen Sekunden spielbar.
- **Beobachtet:** Spielfeld nach 9,3 s, dann 14 s „Song lädt …“ ohne Fortschritt, Knopf nach 23,5 s. Song: 1476 KB, 192 kbit/s, 63 s (gespielt werden 58 s). Ungedrosselt 1,0 s.
- **Messwert:** CDP `Network.emulateNetworkConditions` + `Emulation.setCPUThrottlingRate`, Zeitpunkte aus dem Zustand von `#pogo-los`.
- **Idee zur Lösung:** Song mit 96 kbit/s und auf 58 s gekürzt (rund 700 KB) und Ladebalken im Knopf; ohne Song nach ~8 s den Ersatz-Beat anbieten.

### PT-20261121-20 · Mikro-Moment ist nicht der größte Bonus
- **Schritte:** 1. Im letzten Refrain (50–54 s) in der ersten Reihe stehen und im Takt tippen.
- **Erwartet:** Spec Etappe 1: „Mikro-Moment … (je Treffer Punkte; größter Bonus der Runde)“.
- **Beobachtet:** OI = 40 Punkte, wegen PT-17 höchstens jeder zweite Schlag: Runde 6 4 OI = 160 Punkte, Runde 8 3 OI = 120. Zum Vergleich: Stagedive 900, Setliste 300, Abgucken 200, „DU DA!“ 150.
- **Beleg:** Ereignisprotokoll r6 („50.6 OI! … 53.2 OI!“), r8.
- **Idee zur Lösung:** OI auf 100 oder Serienbonus für 4 OI in Folge.

### PT-20261121-21 · Eine Taste gegen das Gitter halten zählt als Bewegung
- **Schritte:** 1. Pitcher, nach dem Start nur Pfeil hoch gedrückt halten.
- **Erwartet:** Wer nur steht, bekommt halbe Punkte.
- **Beobachtet:** Die Figur steht 54,8 s am Gitter, `stillZeit` bleibt 0 (gedrückte Taste zählt als Laufen), voller Satz erste Reihe, zweimal „DU DA!“, Plektrum: 1514 Punkte, Ergebnis 379. Das ist 4,3-mal Faulenzen, aber nur 28 % einer Profi-Runde – deshalb klein.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r2-ende.png`
- **Idee zur Lösung:** Bewegung an tatsächliche Geschwindigkeit koppeln (`hypot(vx, vz) > 0,3`) statt an Tastendruck.

### PT-20261121-22 · Pitcher: Ventilator verdeckt die Bühne
- **Schritte:** 1. Pitcher, in die erste Reihe laufen.
- **Erwartet:** Band, Würfe und Sänger gut sichtbar.
- **Beobachtet:** Ein Deckenventilator hängt genau zwischen Kamera (Höhe 2,9 m) und Bühne (Decke 2,9 m); Flügel und Nabe decken die Bandmitte und den Sänger ab, das „IM TAKT!“ liegt darüber.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r1-refrain.png`, `docs/spieletest/bilder/2026-11-21-L2-r8-sd.png`
- **Idee zur Lösung:** Ventilatoren über dem Pit nach hinten versetzen oder in Kameranähe ausblenden.

### PT-20261121-23 · Motivbilder in 1024 px
- **Beobachtet:** `ladeMotive()` lädt die Motive für die Rückenaufnäher in 1024 px; die vier größten: 162, 158, 104, 97 KB (zusammen 521 KB). Ein Aufnäher ist auf dem Handy wenige Pixel groß.
- **Messwert:** CDP `Network.loadingFinished`, Laden mit Fast 3G.
- **Idee zur Lösung:** 256-px-Fassungen der Motive für das Spiel.

### PT-20261121-24 · Pop-Texte überlagern sich
- **Beobachtet:** Beim Stagedive kommen „schwapp“ und „HAND! →“ gleichzeitig und liegen übereinander („SLOSHHAND! →“); der Pfeil, der die Richtung sagt, wird schwer lesbar.
- **Beleg:** `docs/spieletest/bilder/2026-11-21-L2-r8-sd.png`
- **Idee zur Lösung:** Hand-Hinweis fest am linken/rechten Rand statt als Pop.

### PT-20261121-25 · Erste Sekunde ruckelt
- **Beobachtet:** `?fps` zeigt in der ersten Sekunde 32 (r1, r7), 46 (r3), 51 fps (r5, r8); längstes Bild 50 ms, danach durchgehend 16,7 ms. Auf einer starken GPU; auf einem Handy länger zu erwarten (nicht gemessen).
- **Idee zur Lösung:** `renderer.compile(scene, camera)` während das Startbild steht.

### PT-20261121-26 · AUFBAU zählt in Altenberg als Refrain
- **Beobachtet:** `teil.kraft × kraftFaktor` = 0,8 × 1,3 = 1,04 ≥ 1: im AUFBAU (40–43 s) gibt es ×1,5 Punkte, ein drittes „DU DA!“ und den Ordner („40.0 ABKÜHLEN! / DU DA!“ in r5). In den anderen Läden nicht. Gewollt?

### Top 3 für mehr Spaß
1. **Bierverlust halbieren (PT-12, Aufwand klein bis mittel).** Zwei Zahlen in `regeln.js` (Gedränge, Rempler-Deckel) entscheiden, ob das Bier eine Ressource oder ein Countdown ist; danach gibt es wieder verschiedene Titel, und „vorn oder sicher“ wird eine echte Entscheidung.
2. **Sprung kürzer als ein Schlag (PT-17, klein).** Wer auf jeden Schlag tippt, bekommt jedes Mal „IM TAKT!“ statt stummer Hälfte; das ist das Kerngefühl des Spiels, und der Mikro-Moment wird dadurch automatisch größer.
3. **Ergebnis live im HUD und Ziel in derselben Einheit (PT-14 mit PT-13, klein).** Man sieht während der Runde, wie nah man am Abzeichen ist; mit erreichbaren Zielen ist das der stärkste Grund für „Nochmal“.

## Lauf 2026-11-21 · lokal (master) · Rechner 1280×800 + Handy 375×812 · DE + EN

Kurzfazit: Das Spiel läuft stabil (Start per Tastatur, Fenstergröße, Tab-Wechsel, dreifaches „Nochmal“, Stagedive, alle vier Läden, DE und EN ohne deutsche Reste; keine Konsolenfehler, keine 404). Am meisten stört auf dem Handy die Enge im Spielfeld (Aufgaben unter „Ton an“, Songauswahl unter dem Startknopf) und die Wertung: Wer nur im Pit steht, bekommt 327 Punkte, meine groben Spielbots endeten dagegen alle mit leerem Becher und Ergebnis 0.

Grenzen des Laufs: Es spielte ein Skript (Bot), kein Mensch; sein Springen traf den Takt nur etwa jedes vierte Mal (22 von 80), jeder Fehlsprung kostet 3 % Bier. Die Aussagen zur Wertung (PT-03, PT-04) sind deshalb Fragen, keine Fehler. Bildrate nicht belastbar: Der Browser rendert ohne Grafikkarte (Software-GL), 16–28 fps im Rechner-Format, 52–60 fps im Handy-Format. Nicht erreicht: erfolgreiche Zugabe mit getragenem Sänger, Modeschnösel-Rausschmiss, goldenes Motiv am Rechner (auf dem Handy einmal abgeguckt: Motiv 016), Einstieg über die 3D-Säule in `bands.html`.

Gespielte Runden (8): PC/DE Pitcher aktiv · PC/EN Druckluft drinnen aktiv · PC/DE Druckluft draußen faul · PC/DE Pitcher aktiv (mit Takt-Anpassung) · Handy/DE Altenberg aktiv · PC/EN Altenberg nur laufen + Stagedive · Handy/EN Druckluft draußen · PC/DE Tastatur, Hämmern, Resize, Tab-Wechsel (reduzierte Bewegung). Dazu zwei kurze Stagedive-Messungen und zwei Handy-Layoutmessungen.

| ID | Art | Schwere | Wo | Befund | Status |
|---|---|---|---|---|---|
| PT-20261121-01 | Fehler | mittel | HUD, Handy | Aufgaben-Zeile läuft unter den „Ton an“-Knopf; Schrift nur 10,9 px | erledigt (66aa037) |
| PT-20261121-02 | Fehler | mittel | Startbild, Handy | Startknopf verdeckt die Songauswahl; Startbild scrollt innen | erledigt (f27c9dd: Knopf klebt unten, Läden zweispaltig) |
| PT-20261121-03 | Frage | mittel | Wertung | Nur im Pit stehen bringt 327 Punkte und die ganze Runde | erledigt (2887381) |
| PT-20261121-04 | Frage | mittel | Wertung | Leerer Becher = Ergebnis 0, auch mit 500–1300 Punkten | erledigt (2887381) |
| PT-20261121-05 | Vorschlag | mittel | Stagedive | Ein Klick ohne Abwehr bringt rund 900 Punkte | erledigt (2887381) |
| PT-20261121-06 | Fehler | klein | Kopf der Seite | „Spiel · Entwurf, Etappe 1“ steht noch auf der Seite (DE und EN) | erledigt (66aa037) |
| PT-20261121-07 | Vorschlag | klein | Startbild | Steuerung steht nur unter dem Spielfeld, nicht im Startbild | erledigt (66aa037) |
| PT-20261121-08 | Vorschlag | klein | Startbild, Rechner | Startknopf liegt bei 1280×800 unter dem sichtbaren Bereich | erledigt (66aa037: Links springen aufs Spielfeld) |
| PT-20261121-09 | Frage | klein | Aufgaben | „Kein Stiefel im Bier (+250)“ wird auch bei leerem Becher gutgeschrieben | erledigt (2887381) |
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
- **Lauf 2 (2026-11-21):** Mit echter GPU (ANGLE/D3D11) in fünf Browsersitzungen nicht aufgetreten; die Warnung kommt offenbar nur mit Software-GL (SwiftShader).

