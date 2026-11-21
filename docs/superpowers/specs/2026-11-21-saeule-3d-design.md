# Bandseite als 3D-Litfaßsäule – Design

Stand: 21.11.2026. Ersetzt die Säulen-Darstellung aus `2026-11-21-bandseite-design.md`. Daten, Bandliste, Tageslauf und Bauskript aus jenem Dokument gelten weiter.

## Absicht

Mark gefällt die flache CSS-Säule der Bandseite nicht. Er hat ein Bild geschickt, wie die Säule aussehen soll: eine einzelne, verwitterte Litfaßsäule mit rostrotem Dach und Knauf, Schichten alter, zerrissener Plakate, vorn groß das FUCK-OFF-FASHION-Plakat mit „DIY OR DIE“, ein gesprühtes Anarchie-A, Sticker („KAUF NIX“, „PUNK LEBT“) und darunter die Bandplakate. Daraus entstand ein 3D-Entwurf mit three.js, den Mark freigegeben hat („Ja, das passt, weiter so“):

- Entwurf (Artefakt): https://claude.ai/artifact/TbvNdUSTyZ3XiENoaUFqj8
- Quelltext des Entwurfs: `docs/superpowers/specs/2026-11-21-saeule-3d-entwurf.html` (lädt three.js dort per CDN und die Logos aus `bands/`; beides ist im echten Bau anders, siehe unten). Er ist die **Vorlage für Aussehen und Verhalten**: Malfunktionen der Texturen, Abreiß-Verformung (`forme`), Kamera, Licht.

Die Seite bleibt, was sie ist: Bands, die das Label live gesehen hat und gut findet; ein Plakat abreißen zeigt, wo die Band als Nächstes spielt (nur zukünftige Termine).

## Ziele

1. `bands.html` und `en/bands.html` zeigen **eine** 3D-Säule wie im Entwurf: drehen per Wischen/Ziehen, Plakat antippen → Kamera fährt heran, Plakat rollt sich von unten ab, fällt herunter, darunter klebt ein Terminzettel; daneben (Handy: von unten) ein lesbares Terminblatt mit „Plakat wieder ankleben“ und „Website der Band“.
2. **Reihenfolge nach nächstem Termin**: Wer am frühesten spielt, hängt vorn oben. Bands ohne Termin („gerade still“) kommen danach, alphabetisch.
3. **BALD-Aufkleber** (Marks Entscheidung): Plakate, deren nächster Termin 0–30 Tage entfernt ist, bekommen quer einen roten Aufkleber „BALD“ (englisch „SOON“). Grenzen wie bisher: 30 Tage = bald, 31 nicht mehr. „Heute“ lokal bestimmt (`isoLokal`).
4. Auf jedem Plakat steht in Edding-Schrift der nächste Termin („Sa 21.11. · Ihlow“) oder „gerade still“.
5. Echte Bandlogos aus `assets/img/bands/` (Regel: immer die echten Logos).
6. Englische Fassung mit englischen Texten auf allen gemalten Flächen (siehe Texte).

## Nicht-Ziele

- Kein HyperFrames-Film in diesem Bau. Der Film (Kamerafahrt, Plakat reißt ab) ist ein eigenes Stück für Social Media, später.
- Keine mehreren Säulen, keine Einteilung Bald/Demnächst/Später/Still mehr.
- Keine Änderung an Bandliste, Datenformat (`data/bands.json`), Tageslauf oder `tools/build-bands.py`-Ausgabe, außer was der Bau zwingend braucht.
- Startseite, Konzertseite, Impressum, Datenschutz bleiben unberührt (außer Cache-Version).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Ohne 3D (kein WebGL, alter Browser, Skript scheitert) ist die Seite leer oder die Termine sind nicht erreichbar.
- Auf dem Handy blockiert die Säule das Scrollen der Seite.
- Die Seite ruckelt auf einem mittleren Handy oder heizt es dauerhaft auf (Endlos-Rendern auch außerhalb des Bildschirms).
- Nachgemachte statt echte Bandlogos.
- Fremde Server werden geladen (CDN, Google Fonts).

## Ansätze (betrachtet)

1. **3D obendrauf (gewählt, Claudes Wahl, Mark hat das Wie überlassen).** Die Plakate stehen weiter fertig im HTML (Bauskript). Ein Modul lädt three.js und baut daraus die Säule; ohne 3D bleiben die HTML-Plakate sichtbar. Vorteil: Suchmaschinen, Screenreader und Geräte ohne WebGL bekommen weiter alles; der Ersatz ist immer aktuell.
2. **Nur 3D aus den Daten.** Weniger Code, aber ohne 3D leer und für Suchmaschinen unsichtbar. Verworfen.
3. **Vorgerenderter Film mit Klickflächen (HyperFrames).** Schont das Handy, aber nichts lässt sich drehen oder abreißen. Verworfen für die Seite; der Film kommt später separat.

## Entscheidungen

### Aufbau der Seite

- Kopf wie heute (Label, „Die Säule.“, Einleitung), dann die **Bühne** mit der 3D-Säule, darunter die **Bandleiste**, dann der Link „Alle Konzerte im Umkreis“.
- Die Bühne: dunkler Hintergrund mit warmem Lichtkegel wie im Entwurf, Höhe etwa `min(84vh, 860px)`, mindestens ~540 px. Hinweiszeile „Ziehen zum Drehen · Plakat antippen zum Abreißen“.
- **Bandleiste** = die vorhandenen HTML-Plakate (`article.plakat` aus dem Bauskript), im 3D-Modus als kompakte Knöpfe dargestellt (Name + „Nächstes Mal: …“ bzw. „Gerade still“), in derselben Reihenfolge wie auf der Säule. Sie ist der Weg für Tastatur und Screenreader: Knopf drücken = dasselbe wie Plakat antippen. `aria-expanded` am Knopf spiegelt, ob das Plakat abgerissen ist.
- **Terminblatt**: zeigt den Inhalt des Zettels der Band (wie heute: Überschrift „Nächste Termine“, die ersten 4 Termine, „alle N Termine“ klappt den Rest auf, Link zur Website), plus Knopf „Plakat wieder ankleben“. Desktop (ab 900 px): rechts neben der Säule auf der Bühne; Handy: von unten über die untere Bühnenhälfte, scrollbar. Fokus springt beim Öffnen ins Blatt, beim Schließen zurück auf den Bandknopf. Escape schließt.
- Beim Öffnen auf dem Desktop blendet der Seitenkopf über der Bühne nicht aus (er steht über der Bühne, nicht darauf) – anders als im Entwurf; die Kamera rückt das Plakat links der Mitte ins Bild, damit das Blatt rechts Platz hat.

### Säule (wie im Entwurf)

- Körper (Zylinder, Plakatschicht-Collage gemalt), Dach und Knauf und Sockel aus rostigem Blech (Lathe-Profile wie im Entwurf), FOF-Hauptplakat vorn, Anarchie-A, Sticker. Alles auf Canvas gemalt, mit festem Zufallssamen, damit die Säule bei jedem Laden gleich aussieht.
- **Plätze der Bandplakate**: die ersten vier wie im Entwurf 2×2 vorn unter dem Hauptplakat; weitere links und rechts um die Säule herum, abwechselnd, in Reihen (die Platzliste `PLATZ` des Entwurfs). Ab mehr als ~12 Bands würde die Säule voll; dann wachsen die Plätze um die Rückseite weiter. (Heute 4 Bands; die Platzvergabe muss nur bis 16 Bands sauber funktionieren.)
- Plakatfarben aus dem optionalen Feld `plakat` in `tools/bands.json` (papier/schwarz/rot). `build-bands.py` liest es schon, gesetzt ist es bisher bei keiner Band; der Bau trägt es ein. Fehlt es, gilt schwarz. Die vier heutigen Bands bekommen: Alarmsignal schwarz, Dan Ganove papier, Los Fastidios rot, Trijahnity schwarz (wie im Entwurf; gelbes bzw. weißes Logo braucht dunklen Grund).
- Ruhezustand: Kamera pendelt langsam ±20° um die Säule, bis jemand selbst dreht.
- Drehen: nur waagerecht (Wischen/Ziehen links-rechts), eigene kleine Steuerung statt OrbitControls; `touch-action: pan-y`, damit senkrechtes Wischen die Seite scrollt. Kein Zoom per Mausrad.
- Maus über einem Plakat: untere Ecke hebt sich leicht (Vorschau des Abreißens), Zeiger wird zur Hand.

### Abreißen

- Wie im Entwurf: Kamera fährt in ~0,9 s heran, Plakat rollt sich von unten rechts ab (`forme` mit p 0→1), zeigt die Rückseite (gealtertes Papier mit Kleisterflecken), fällt nach vorn-unten und blendet aus. Darunter wird der gemalte Terminzettel sichtbar (bis 4 Termine, „+ N weitere“).
- Das Terminblatt öffnet sich, sobald das Plakat fällt (an die Animation gekoppelt, nicht an eine Zeit).
- Ein anderes Plakat antippen, während eines offen ist: das erste klebt wieder an, das neue reißt ab.
- „Wieder ankleben“: Plakat blendet ein und rollt sich in ~0,4 s zurück, Kamera fährt zurück in die Gesamtansicht.

### Bewegung reduziert (`prefers-reduced-motion`)

3D bleibt, aber: kein Pendeln, keine Ecke beim Darüberfahren, Abreißen ohne Animation (Plakat ist sofort weg, Zettel sichtbar), Kamera springt statt zu fahren.

### Ohne 3D

Wenn WebGL fehlt, die three.js-Datei nicht lädt oder der Aufbau der Szene einen Fehler wirft: Die HTML-Plakate bleiben als flache Plakate sichtbar wie heute (abreißbar per CSS wie bisher), aber **in einem einzigen Raster** statt vier Säulen, nach nächstem Termin sortiert, mit demselben BALD-Aufkleber (als CSS-Element). Ohne JavaScript: Plakate untereinander, Zettel offen (wie heute).

### Daten

- Termine weiter aus `data/bands.json` (Tageslauf). Die Seite filtert beim Anzeigen alles vor heute heraus (Datei kann einen Tag alt sein).
- Kommt die Datei nicht: Säule wird trotzdem gebaut, Plakate ohne Datum („Termine gerade nicht da“ in der Statuszeile wie heute), Reihenfolge alphabetisch, kein BALD.

### Technik

- three.js r169 liegt bereits selbst gehostet unter `assets/vendor/three.module.min.js` (genutzt vom Faden der Startseite) – per dynamischem `import()` laden, keine neue Bibliothek, kein CDN. Schriften (Anton, Archivo, Courier Prime, Permanent Marker) sind schon selbst gehostet (`css/tokens.css`); vor dem Malen mit `document.fonts.load` abwarten (mit Zeitgrenze).
- Gemalte Texturen in Größen wie im Entwurf; Pixelverhältnis höchstens 2; Schattenkarte 2048 am Desktop, 1024 unter 900 px Breite.
- Gerendert wird nur, solange die Bühne im Bild ist (IntersectionObserver) und der Tab sichtbar ist.
- Die DOM-unabhängige Logik kommt in eigene Module mit Node-Tests (wie `js/bands/saeulen.js` heute): Reihenfolge, BALD-Grenze, Platzvergabe, Abreiß-Geometrie (`forme`: p=0 liegt alles auf dem Radius, p=1 ist alles umgeschlagen), Texte DE/EN. Die alte Gruppierung (`gruppiere`, `monatsSpanne`) entfällt mitsamt Tests, `kuenftige`, `isoLokal`, `tageBis`, `sichtbare` bleiben.
- Cache-Version auf v31 anheben.

### Texte (DE / EN)

| Stelle | Deutsch | Englisch |
|---|---|---|
| Kopfzeile Bandplakat | LIVE GESEHEN · FÜR GUT BEFUNDEN | SEEN LIVE · APPROVED |
| kein Termin (Plakat) | gerade still | quiet for now |
| Aufkleber | BALD | SOON |
| Zettel-Kopf | NÄCHSTE TERMINE | NEXT GIGS |
| Zettel ohne Termin | Gerade still. / Kommt wieder. | Quiet for now. / They'll be back. |
| mehr Termine | + N weitere | + N more |
| Sticker | KAUF NIX · PUNK LEBT · DIY | BUY NOTHING · PUNK'S ALIVE · DIY |
| Hinweis | Ziehen zum Drehen · Plakat antippen zum Abreißen | Drag to turn · Tap a poster to tear it off |
| Hauptplakat | FUCK OFF FASHION · DIY OR DIE (beide Sprachen gleich) | |

Datum wie heute über `tagDatum` (de „Sa 21.11.“, en „Sat 21 Nov“). Bestehende Texte aus `js/bands/texte.js` (abreißen/ankleben/keine/datenFehlen …) weiterverwenden.

## Prüfen

- Node-Tests für die neue Logik, Python-Tests wie bisher (245/111 + neue), `build-bands.py --pruefen`.
- Im Browser (Vorschau `fof-site`): Desktop und 375 px, DE und EN, mit und ohne reduzierte Bewegung, mit abgeschaltetem WebGL (Ersatz), mit fehlender `bands.json`. Screenshots an Mark.
- Online erst nach Marks ausdrücklichem Ja.

## Dem Bauenden überlassen

Genaue Lichtwerte, Zufallsmuster der Collage, Kurven der Animation, Dateiaufteilung der Module, Aussehen des BALD-Aufklebers im Detail (rot, quer, Anton-Schrift, leicht schräg – wie ein Stück Gaffa-Band), wie die Bandleiste genau aussieht, solange sie zum Entwurf passt.
