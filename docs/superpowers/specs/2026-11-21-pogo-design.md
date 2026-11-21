# Pogo – Browserspiel für Fuck Off Fashion – Design

Stand: 21.11.2026. Vorlage für Aussehen und Grundgefühl: `docs/superpowers/specs/2026-11-21-pogo-3d-entwurf.html` (3D-Wegwerf-Entwurf, von Mark angespielt: „lustig und geht schon mal in die richtige Richtung“). Der 2D-Entwurf davor wurde verworfen („nicht nur ein paar Punkte, die auf einem Bild rumwuseln“).

## Absicht

Ein kurzes, lustiges Spiel auf der FOF-Seite: Du stehst im Moshpit, hältst dein Bier hoch und versuchst, so viel wie möglich zu pogen, ohne alles zu verschütten. Es soll Spaß machen, zur Haltung des Labels passen (kein Konto, kein Tracking, kein Kaufen) und am Ende zu den Bands der Säule und ihren Konzerten führen. Später läuft im Spiel echte Musik der Bands von der Säule und man spielt in echten Läden, in denen Mark und Co. oft waren.

## Spielprinzip (Marks Entscheidungen und Wünsche)

- Pit von schräg oben, **Kamera hinter deiner Figur** (Mark).
- Figuren sind richtige 3D-Figuren im Comic-Stil (Iro, Jacken, Rückenaufnäher), nicht fotorealistisch, aber keine Punkte (Mark).
- Man wählt den **Laden**, in dem gespielt wird (Mark). Jeder Laden hat Eigenheiten.
- Später laufen **Songs der Bands von der Säule**; Mark fragt jede Band selbst, bevor ein Song ins Spiel kommt (Mark).
- **Hinten stehen darf sich nicht lohnen** (Mark). Belohnt wird, wer **nach vorn zur Band** kommt (Mark).

### Regeln (Claudes Vorschlag, mit Mark besprochen)

- Eine Runde = ein Song-Ausschnitt (jetzt 60 s eigener Beat; mit echten Songs 60–90 s). Songteile: Intro, Strophe, Refrain, Break, Strophe, letzter Refrain; der Pit folgt der Musik (Strophe schubst, Refrain Gedränge, Break Luft holen).
- **Zwei Werte:** Bier (0–100 %, sinkt durch Rempler) und Pogo-Punkte. **Ergebnis = Pogo-Punkte × Bier-Anteil.**
- **Zonen** (von hinten nach vorn):
  - *Rand*: keine Punkte. Die Leute am Rand schubsen dich zurück in den Pit („Was stehst du hier rum?“).
  - *Pit* (leuchtet am Boden): Punkte pro Sekunde; Mitte doppelt.
  - *Erste Reihe* (am Absperrgitter): doppelte Punkte, aber **Gedränge** (Becher schwappt langsam auch ohne Rempler) und der **Ordner** im gelben Shirt (spritzt Wasser, „ABKÜHLEN!“: Punkte kurz halbiert, Bier verwässert = kein Verlust, aber sichtbar heller).
  - *Bühnenkante*: Knopf „Stagediven!“.
- **Springen** per Antippen (bzw. Leertaste): in der Luft rempelt dich keiner; Landung auf dem Beat = Bonus; Sprung neben dem Takt schwappt etwas.
- **Band bemerkt dich** (nur erste Reihe): Sänger zeigt im Refrain „DU DA!“ (Bonus); Gitarrist wirft **Plektrum**, Drummer am Ende **Drumstick**, selten **Setliste** – fangen = hinlaufen, solange es fliegt (Bonus).
- **Mikro-Moment**: einmal pro Song hält der Sänger das Mikro in die erste Reihe; wer dort steht, tippt „OI! OI! OI!“ im Takt (je Treffer Punkte; größter Bonus der Runde).
- **Stagedive**: von der Bühnenkante in die Menge, dann als Crowdsurfer über die Köpfe nach hinten getragen; Becher muss oben bleiben (Hände der Menge greifen danach, wischen = Becher wegziehen). Bier überlebt = riesiger Bonus; sonst Bierdusche.
- Weiter wie im Entwurf: Crowdsurfer anderer Leute (Stiefel im Bier), Freibier am Boden (+25 %), Typ mit Rucksack (rempelt doppelt), Circle Pit und Wall of Death in der Halle, Pfeiler und niedrige Decke im Keller, Regen und Matsch auf der Wiese.
- **Endbild**: Ergebnis, Pogo-Punkte, Bier, Titel aus beidem („Pit-König mit halbem Bier“, „Trocken, aber legendär“, „Rand-Steher mit vollem Becher – peinlich“), gefangene Andenken. Darunter Link zur Säule; mit echtem Song: Band und ihr nächstes Konzert aus `data/bands.json`.

## Ziele

1. Spielbar am Handy mit einem Finger (ziehen = laufen, tippen = springen) und am Rechner (Maus/Tasten).
2. Eine Runde dauert einen Song, Neustart sofort.
3. Deutsch und Englisch (`pogo.html`, `en/pogo.html`).
4. Später: echte Läden, echte Songs, Einstieg über die Säule („POGO!“-Sticker, „Pogo zu [Band]“ im Terminblatt).

## Nicht-Ziele

- Keine Bestenliste auf einem Server, kein Konto, keine Daten an Dritte.
- Kein fotorealistisches 3D, keine fremden 3D-Modelle.
- Keine Musik ohne Freigabe; kein Download fremder Songs von irgendwo.

## Anti-Ziele

- Hinten-Stehen lohnt sich.
- Frust: unfaire Treffer aus dem Nichts, zu lange Runden, lange Ladezeit.
- Das Spiel bremst die restliche Seite (es lädt nur auf seiner eigenen Seite).
- Handy wird heiß oder ruckelt stark.

## Ansätze

1. **Eigene Seite in der FOF-Seite, Code in `js/pogo/`, three.js aus `assets/vendor/` (gewählt; Mark hat das Wie überlassen).** Spielregeln als reine Module mit Node-Tests, wie bei der Bandseite. Zwischenstände zum Anspielen als Artefakt mit genau diesem Code.
2. Eigenes Projekt neben der Seite – verworfen, Bands/Konzerte/Säule müssten später doppelt angebunden werden.
3. Spiele-Engine (Phaser, Babylon) – verworfen, neue große Abhängigkeit, three.js reicht.

## Etappen

- **Etappe 1 (jetzt):** komplette Spielmechanik mit eigenem Beat und den drei Beispiel-Läden aus dem Entwurf (Kellerclub, AJZ-Halle, Festivalwiese): zwei Werte und Ergebnis, Zonen inkl. Rand schubst zurück, Springen mit Takt-Bonus, erste Reihe mit Gedränge und Ordner, „DU DA!“, Wurfgeschenke, Mikro-Moment, Stagedive, Endbild mit Titel und Link zur Säule. DE/EN. Test als Artefakt; **nicht** auf der Seite verlinkt und **nicht** veröffentlicht.
- **Etappe 2:** echte Läden von Mark (Name, Eigenheiten, ggf. seine Fotos als Vorlage), Andenken-Sammlung (auf dem Gerät gespeichert), kleine Aufgaben pro Song.
- **Etappe 3:** echte Songs mit Freigabe (Datei, Ausschnitt, Songteile von Hand markiert, Freigabe-Eintrag: Band, Datum, wer zugestimmt hat), Endbild mit Band und nächstem Konzert, Einstieg über die Säule, Veröffentlichung auf Marks Ja.

## Technik (Claudes Entscheidungen)

- three.js r169 per `import()` aus `assets/vendor/three.module.min.js`; Schriften aus `css/tokens.css`. Ohne WebGL: Hinweis und Link zur Säule.
- Reine Logik ohne three.js/DOM in eigenen Modulen mit Node-Tests: Songteile und Takt, Zonen (Rand/Pit/Mitte/erste Reihe/Kante), Punkte pro Sekunde, Ergebnis und Titel, Takt-Treffer beim Springen und beim Mikro-Moment, Rempler → verschüttete Menge.
- Höchstens ~40 Figuren, gemeinsame Geometrien/Materialien, Pixelverhältnis ≤ 1,75, Schatten nur vom mittleren Bühnenlicht, Rendern pausiert bei verstecktem Tab.
- Musik: eigener Beat per WebAudio, startet erst nach Antippen, Ton-aus-Knopf.
- Bewegung reduziert: kein Kamerawackeln, Texte ohne Flug-Animation.

### Entscheidungen nach der Bauprüfung (Claude)

- **Repo und Test:** Der Code liegt auf dem Zweig `pogo` als `pogo.html`, `en/pogo.html`, `js/pogo/`, `css/pogo.css`. Die Seiten kommen in Etappe 1 **nicht** in die Liste von `tools/veroeffentlichen.sh` und werden nirgends verlinkt. Zum Anspielen wird dieselbe Seite als Mehrdatei-Artefakt veröffentlicht (`files`: die Module, `assets/vendor/three.module.min.js`, die CSS-Dateien und die Schriften aus `assets/fonts/`); es gibt kein Build-Skript und keine zweite Fassung. Lädt das Artefakt die eigenen Schriften nicht, greifen die Ersatzschriften aus `css/tokens.css`; das ist für den Test in Ordnung.
- **Aussehen:** Der Entwurf lief mit three r160 und alten Lichtwerten. Die Szene wird für r169 (physikalische Lichtstärken) neu abgestimmt; Ziel ist dieselbe Stimmung (dunkel, rotes/weißes Bühnenlicht, Nebel, Comic-Figuren mit Iro und Rückenaufnähern), nicht pixelgleich. Keine eigene Portierungs-Etappe.
- **Leistung:** Zielgerät ist ein mittleres Handy (drei, vier Jahre alt); Ziel 30 Bilder pro Sekunde, am Rechner 60. Höchstens etwa 300 Zeichenaufrufe: feste Teile einer Figur (Rumpf, Kopf, Frisur, Aufnäher, Stiefel) werden je Figur zu einer Geometrie zusammengefügt, nur Arme und Beine bleiben beweglich. Schatten nur vom mittleren Bühnenlicht, auf Handys mit kleiner Schattenkarte. Eine versteckte Anzeige (`?fps` in der Adresse) zeigt Bilder pro Sekunde und Zeichenaufrufe zum Prüfen.

## Dem Bauenden überlassen

Genaue Punktwerte und Wahrscheinlichkeiten (Ziel: hinten < Pit < vorn, mit spürbarem Risiko vorn), Aussehen von Ordner, Gitter, Wurfgeschenken, Kamera beim Stagedive, Texte der Titel im Stil der Seite.
