# Pogo Etappe 3 – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motive auf dem Rücken (seltenes Motiv abgucken), Modeschnösel, Fascho rausschieben, Zugabe mit Sänger in der Menge, Tour mit Freischaltung und Punk-Rang.

**Spec:** `docs/superpowers/specs/2026-11-21-pogo-design.md` (Abschnitt „Etappe 3“)

## Global Constraints

- Alle Regeln aus Etappe 1/2 gelten. Neue Speicherwerte nur in localStorage, abgesichert (try/catch, Müll → Standard).
- Fascho ohne Symbole. Motive nur aus `tools/motive.json`, Texturen höchstens 256 px.
- Werte exakt wie im Spec: Abgucken 3 s, ≤ 1 m dahinter (|dx| ≤ 0,6); +200 / +300 / +200; Zugabe 5 s, ab 6 Treffern, 15 s, ×1,5; Sänger ≤ 1 m, > 2 s allein; Tour-Schwellen 1500/2500/3500, Kraft ×1,0/1,1/1,2/1,3; Ränge 0/2000/8000/20000.

## Review Focus

1. Song endet während Zugabe-Ruf/Zugabe/Stagedive: genau ein Endbild, keine doppelte Wertung (Browser).
2. Motivbilder laden nicht (Artefakt, Netz weg): Figuren tragen die alten Aufnäher, kein Fehler (Task 4).
3. Gesperrter Laden lässt sich nicht per Tastatur starten (Task 5).
4. Schnösel-Rempler kosten kein eigenes Bier (Task 5).
5. Tour-Speicher kaputt: Startbild zeigt PITCHER frei, Rang Rand-Steher (Task 1: Test).

### Task 1: Tour und Rang (`js/pogo/tour.js`)
`TOUR = ["pitcher","druckluftInnen","druckluftDraussen","altenberg"]`, `SCHWELLEN = [1500,2500,3500]`, `KRAFT = [1,1.1,1.2,1.3]`, `RAENGE = [{ab:0,id:"randSteher"},{ab:2000,id:"pogoLehrling"},{ab:8000,id:"pitSau"},{ab:20000,id:"pitLegende"}]`; `leseTour(speicher) -> {best:{}, summe:0}`, `schreibeTour`, `mitErgebnis(tour, ladenId, ergebnis) -> tour`, `frei(tour) -> Set`, `fehlt(tour, ladenId) -> number` (Punkte bis frei, 0 = frei), `rang(summe) -> id`, `kraftFaktor(ladenId)`. Tests: Grenzen, kaputter Speicher, Freischalten der Reihe nach.

### Task 2: Regeln für Abgucken, Zugabe, Schurken (`js/pogo/regeln.js`)
`istHinter(ich, p) -> boolean` (p.z < ich.z, ich.z − p.z ≤ 1, |dx| ≤ 0,6); `ABGUCKEN_S = 3`; `ZUGABE = { fenster: 5, treffer: 6, dauer: 15, faktor: 1.5 }`; `schurkenZeiten(song) -> { schnoesel: Ende des ersten Refrains, fascho: 0,4 · song.ende }`; `BONUS` um `abgeguckt: 200, schnoesel: 300, fascho: 200`. Tests.

### Task 3: Motivliste (`js/pogo/motive.js`)
Aus `tools/motive.json`: `[{ nr, titel, titel_en, bild: "assets/img/<datei>-weiss-1024.webp" }]`. Test: gleiche Anzahl und Nummern wie `tools/motive.json`, jede Bilddatei existiert.

### Task 4: Figuren und Szene
Motiv-Texturen (256 px Leinwand) laden, Aufnäher zufällig aus den Motiven, sonst alte; goldener Ring für das seltene Motiv; Schnösel (helle Jacke, Selfie-Stick mit Handy), Fascho (Bomberjacke, Glatze), getragener Sänger. Blitz als heller Bildschirm-Überzug (ruhig: nur abgedunkelt).

### Task 5: Spielablauf (`app.js`, Texte, Seiten)
Abgucken, Schnösel (3 Rempler, eigene Rempler ohne Bierverlust), Fascho, Zugabe-Ruf mit Klatsch-Takt (`musik.klatschen(bpm)`), Zugabe ab Refrain-Start (`musik.start(url, offset)`), Sänger tragen, Tour-Sperren im Startbild, Rang, Freischalt-Meldung im Endbild, Kutte mit Motiven. Tests grün, Browser, Artefakt, Prüfer.
