# Pogo – Grafik-Ideen

Vorschläge des Spieletesters (Rolle: Senior Game Developer für Browserspiele), 21.11.2026, Stand `etappe5` nach den Fixes aus Lauf 2. Es geht darum, wie Pogo grafisch deutlich besser aussehen kann und wie die sieben neuen Mechaniken aus Etappe 5 sichtbar werden. Hier steht nur ein Vorschlag, es ist kein Code geändert.

## Ausgangslage (Bilder von heute)

- **Gesamtbild:** Es ist dunkel und matschig. Nebel (`FogExp2` 0,07 drinnen) und gedämpfte Spots lassen Band und Banner zu grauen Schemen werden. Die Bühne ist das Ziel des Spiels, liest sich aber am schlechtesten (siehe Skizze 1 und 3).
- **Figuren:** Sie wirken wie glatte Plastik-Kapseln (`MeshStandardMaterial`, Rauheit 0,72). Im Gedränge verschwimmen dunkle Jacken zu einem Brei. Du selbst fällst nur durchs weiße Shirt auf.
- **Licht:** Die Spots sind nur als Lichtfleck am Boden zu sehen. Es gibt keinen Lichtkegel und kein Gegenlicht, und die Lampen an den Traversen sind blaue Klötze.
- **Pops:** Auf dunklem Grund sind sie schwach. „IM TAKT!“ in Grün über dem Banner und „NAZIS RAUS!“ in Dunkelrot sind kaum lesbar (Skizze 2). Mehrere Pops überlagern sich.
- **Handy:** Nahe Figuren unten im Bild sind riesig und verdecken einen Teil des Feldes (Skizze 3).
- **Leistung heute (Lauf 2):** 49–198 Zeichenaufrufe; die Grenze im Spec liegt bei etwa 300. p95 der Bildzeit 16,7 ms auf einer starken Grafikkarte. Auf einem Mittelklasse-Handy ist das **nicht gemessen**.

**So lassen:** die Bühnenkante in Rot, die Graffiti-Texturen aus Canvas, die Motive als Aufnäher auf dem Rücken, die Bierfarbe `#f2b632` als Signalfarbe. Das ist FOF und kostet nichts.

**Zu den Leistungsangaben:** Die Kosten unten sind **Schätzungen** aus Zeichenaufrufen, Füllrate (Überzeichnen) und Shader-Aufwand, keine Messung. Nach jedem Einbau mit `?fps` und dem Bildzeit-Recorder aus Lauf 2 messen (Handy-Format, CPU 4×), Ziel p95 unter 20 ms.

## Skizzen

| Bild | Was sich ändert |
|---|---|
| `bilder/2026-11-21-grafik-skizze-1-pc.png` (Altenberg, Strophe) | ① Toon-Shading mit Umriss, ② Lichtkegel aus den Traversen-Lampen, ③ Ring mit Combo-Farbe unter dir, ④ Mitte-Kreis als Kreidespray am Boden, ⑤ Banner als Siebdruck-Plakat, Band mit Gegenlicht, ⑥ HUD als Klebeband-Sticker |
| `bilder/2026-11-21-grafik-skizze-2-stagedive.png` (Altenberg, Stagedive) | ⑦ Pops als Stempel-Sticker, Hand-Hinweis nicht als Pop, ⑧ HAND groß am rechten bzw. linken Bildrand, ⑨ Bier-Gischt als ein Partikelsystem, ⑩ Blob-Schatten statt Schattenkarte |
| `bilder/2026-11-21-grafik-skizze-3-handy.png` (Druckluft drinnen, Refrain, 375×812) | ⑪ Nahe Figuren vor der Kamera ausblenden, ⑫ Band mit Gegenlicht und Lichtkegel, ⑬ Stimmungsbalken als Tape unter dem HUD, ⑭ Bühnenkante als LED-Band im Takt |

Die unbeschrifteten Originale liegen daneben (`2026-11-21-grafik-pc-altenberg-9s.png`, `-24s.png`, `2026-11-21-grafik-handy-innen-12s.png`, `-26s.png`).

## Die Vorschläge, sortiert nach Wirkung pro Aufwand

### 1. Du-Ring und Combo-Farbe
- **Was man sieht:** Unter deiner Figur liegt ein flacher, leuchtender Ring aus Sprühfarbe, der im Takt kurz aufpumpt. Seine Farbe zeigt die Combo: weiß ×1, gelb ×2, orange ×3, rot ×4 mit Funken. Beim Sprung im Takt blitzt er auf.
- **Warum:** Lesbarkeit: Man findet sich im Gedränge sofort, auch am Handy. Spielgefühl: Die Combo ist dort sichtbar, wo man hinschaut, statt nur im HUD. Farbe ist dabei nie das einzige Signal: Die Ringstärke wächst mit, und im HUD steht die Zahl ×1–×4.
- **Technik:** `RingGeometry` (geteilt), `MeshBasicMaterial` mit `transparent`, `blending: AdditiveBlending`, `depthWrite: false`, `map` als `CanvasTexture` (gesprühter, ausgefranster Ring). Pro Bild nur `position`, `scale` und `material.color` setzen. Die Takt-Phase kommt aus `musik.uhr()`.
- **Aufwand:** klein.
- **Kosten Handy:** +1 Zeichenaufruf, kleine Fläche. Praktisch null.

### 2. HUD und Pops im Zine-Look
- **Was man sieht:** Bier, Punkte und Ergebnis kleben auf schief abgerissenen Klebeband-Streifen. Pops sind gestempelte Sticker: Anton-Schrift, schwarzer Rand, Papiergrund, ±6° gedreht, mit einem kurzen „Plopp“ beim Erscheinen. Combo (×2 … ×4) und „STIMMUNG KOCHT!“ kommen als großer Stempel, der Stimmungsbalken ist ein Gaffer-Tape-Streifen, der sich mit roter Schraffur füllt.
- **Warum:** Lesbarkeit: Heute gehen grüne und dunkelrote Pops auf dunklem Grund unter (Skizze 2: „NAZIS RAUS!“). Ein Papiergrund mit schwarzem Rand ist auf jedem Hintergrund lesbar (Kontrast > 4,5:1). Marke: Es sieht nach Zine, Siebdruck und Kopierer aus, also FOF statt Standard-Spiel. Ein fester Platz je Pop-Art (Hand-Hinweis immer am linken oder rechten Rand, Lob mittig oben) beendet die Überlagerung („SLOSHHAND! →“ aus Lauf 2).
- **Technik:** Kein three.js nötig, nur DOM und CSS in `pogo.css`. `-webkit-text-stroke` bzw. `paint-order: stroke`, `clip-path: polygon(...)` für die Risskanten, Hintergrund als kleines SVG-Rauschen (`feTurbulence`, inline) oder 1 Bit-Raster als `repeating-linear-gradient`. Animation nur über `transform` und `opacity` (`@keyframes`), unter `prefers-reduced-motion` ohne Drehung und Skalierung. Pops in drei feste Bahnen statt `left: 50 % ± 14 %`.
- **Aufwand:** klein.
- **Kosten Handy:** keine GPU-Last in three.js. Nur auf weniger als 8 gleichzeitige Pops achten, sonst Layout-Arbeit.

### 3. Lichtkegel, LED-Bühnenkante und Stroboskop im Takt
- **Was man sieht:** Aus jedem Spot fällt ein sichtbarer, weicher Lichtkegel in den Dunst; die Kegel wandern mit den Spots und pumpen im Takt. Die rote Bühnenkante ist ein LED-Band, das auf jeden Schlag aufleuchtet. Bei „STIMMUNG KOCHT!“ und bei „LOS!“ der Wall of Death gibt es ein kurzes weißes Stroboskop.
- **Warum:** Stimmung: Der Moment „Konzert“ entsteht erst mit Lichtkegeln im Nebel. Spielgefühl: Das Licht zeigt den Takt, man sieht also, wann man springen soll, auch ohne Ton (bisher nur hörbar). Lesbarkeit: Gegenlicht trennt die Band vom schwarzen Hintergrund (Skizze 1 ⑤, Skizze 3 ⑫).
- **Technik:** Je Spot `ConeGeometry(radius, länge, 24, 1, true)`, Spitze an der Lampe (`geometry.translate`, `mesh.lookAt(spot.target.position)`). Dazu `ShaderMaterial` mit `AdditiveBlending`, `depthWrite: false`, `side: DoubleSide`; die Alpha fällt mit der Länge (`vUv.y`) und zum Rand (Fresnel aus `dot(normal, viewDir)`) ab, Uniform `uTakt`. Gegenlicht: ein vierter `SpotLight` hinter der Band, ohne Schatten, schmal (`angle` 0,35). LED-Kante: `material.emissiveIntensity` im Takt. Stroboskop als DOM-Blitz über `#pogo-blitz` (gibt es schon), nicht als Licht. **Grenze:** höchstens 3 Blitze pro Sekunde (WCAG 2.3.1). Bei 136 BPM sind das Viertel (2,3/s), nie Achtel. Unter `prefers-reduced-motion` aus.
- **Aufwand:** klein.
- **Kosten Handy:** +3 bis 4 Aufrufe, dazu Überzeichnen dort, wo die Kegel groß im Bild sind. Kegel schmal halten und `uIntensitaet` auf dem Handy senken. Geschätzt unter 1 ms.

### 4. Toon-Shading und Umriss für die Figuren
- **Was man sieht:** Die Figuren haben harte Licht-Schatten-Stufen wie im Comic (drei Töne statt weichem Plastikverlauf) und einen schwarzen Tuschestrich als Umriss. Die Spot-Farben fallen als klare Farbflächen auf Jacken und Iros.
- **Warum:** Marke: Ein Comic- oder Siebdruck-Look passt zu Punk und DIY und verzeiht die einfache Geometrie (Kapseln). Lesbarkeit: Durch den Umriss trennen sich Figuren im dunklen Gedränge; Schurken, Goldener und Gefallene bekommen einen farbigen statt schwarzen Strich.
- **Technik:** `MeshToonMaterial({ vertexColors: true, gradientMap })` ersetzt `MeshStandardMaterial` in `figuren.js` (Rumpf und Arme teilen sich ein Material, also eine Stelle). `gradientMap` ist eine `DataTexture` mit 3 Stufen (`RedFormat`, `NearestFilter`, `generateMipmaps = false`). Der Umriss ist eine invertierte Hülle: zweites `Mesh` mit derselben Geometrie, `MeshBasicMaterial({ color: 0x0a0a0a, side: BackSide })`, und per `onBeforeCompile` in `begin_vertex` die Zeile `transformed += normal * 0.018;`. Das Material ist geteilt, eine Kompilierung. Umriss zuerst nur für Rumpf und Kopf (Arme ohne), für dich, Band, Schurken und Goldenen; für alle erst nach Messung.
- **Aufwand:** mittel (Toon allein klein; Umriss und Abstimmung der Lichtstärken mittel).
- **Kosten Handy:** Toon ist im Fragment-Shader günstiger als Standard (kein PBR). Umriss: +1 Aufruf je Figur mit Umriss (8 bis 36). Mit Variante „nur Sonderfiguren“ etwa +8. Bei allen Figuren vorher Vorschlag 8 umsetzen, damit der Schatten-Durchgang die Aufrufe zurückgibt.

### 5. Ein Partikelsystem für Bier, Schweiß und Konfetti
- **Was man sieht:** Rempler spritzen goldene Bier-Gischt mit Schaumflocken, bei „PLATSCH!“ deutlich mehr. Über dem Pit steigt im Refrain Schweißdampf im Spot-Licht auf. Bei „STIMMUNG KOCHT!“, „LOS!“ und am Endbild regnet rot-weißes Konfetti (ausgeschnittene Zettel, kein Glitzer).
- **Warum:** Spielgefühl und Juice: Jeder Treffer und jeder Höhepunkt bekommt eine sichtbare Antwort. Stimmung: Der Dampf zeigt, dass der Laden kocht. Technik: Heute ist jeder Bier-Tropfen ein eigenes `Mesh` (`spritzer()` in `app.js`, bis zu 16 Meshes je Rempler), also bis zu 16 Zeichenaufrufe; das wird zu einem einzigen.
- **Technik:** Für Bier und Dampf ein vorab angelegter Pool von etwa 256 Punkten als `Points` mit `BufferGeometry` (Attribute `position`, `aLeben`, `aFarbe`), `PointsMaterial` mit `sizeAttenuation`, `map` als runder `CanvasTexture`, `transparent`, `depthWrite: false`. Pro Bild auf der CPU bewegen (256 × 3 Zahlen), `attributes.position.needsUpdate = true`, `setDrawRange` für die lebenden. Konfetti als `InstancedMesh(PlaneGeometry, MeshBasicMaterial({ side: DoubleSide }), 150)` mit `setColorAt` (`instanceColor`) und `setMatrixAt` für Taumeln. Unter `prefers-reduced-motion` weniger Konfetti und kein Dampf.
- **Aufwand:** klein bis mittel.
- **Kosten Handy:** 2 Aufrufe statt bis zu 16 und mehr. Mit kleinen Punkten ist das Überzeichnen gering. Unterm Strich eher ein Gewinn.

### 6. Bodenzeichen: Zonen, Circle Pit, Wall of Death
- **Was man sieht:** Der Boden erzählt die Regeln. Die Mitte ist ein Kreidespray-Kreis mit „2×“, die erste Reihe eine gelbe Tape-Linie vor dem Gitter, der Rand dunkel schraffiert mit „KEINE PUNKTE“. Im Circle Pit dreht sich ein gesprühter Pfeilring über den Boden. Bei der Wall of Death zieht ein Tape-Strich den Pit in zwei Hälften, links rotes und rechts blaues Licht, und auf „LOS!“ reißt das Tape.
- **Warum:** Lesbarkeit: Der Spec sagt „Pit (leuchtet am Boden)“, heute sieht man die Zonen nicht; man erfährt sie nur aus dem Hinweistext. Spielgefühl: Neue Mechaniken (Circle Pit, Wall mit perfektem Start) brauchen ein Bild, sonst versteht man sie nicht ohne Lesen. Farbe ist nie das einzige Signal, es gibt immer Form und Text.
- **Technik:** Zonen direkt in die vorhandene Boden-`CanvasTexture` malen (`bodenTex` in `szene.js`), also **null** zusätzliche Aufrufe. Dafür muss die Textur den Raum einmal ohne `repeat` abdecken, oder es kommt eine zweite, nicht wiederholte Schicht als `PlaneGeometry` mit `MeshBasicMaterial({ transparent: true, polygonOffset: true })` darauf. Circle Pit: `RingGeometry` mit Pfeil-`CanvasTexture`, `rotation.z` im Takt. Wall-Linie: schmale `PlaneGeometry` mit Tape-Textur, beim Reißen zwei Hälften auseinander.
- **Aufwand:** klein.
- **Kosten Handy:** 0 bis 3 Aufrufe, flache Flächen am Boden. Vernachlässigbar.

### 7. Kamera mit Gefühl
- **Was man sieht:** Ein Sprung im Takt zoomt kurz 2° hinein; bei ×4-Combo und in „STIMMUNG KOCHT!“ rückt die Kamera etwas näher und tiefer. Beim perfekten Start der Wall of Death fährt sie in 300 ms zur Seite und zeigt beide Fronten. „Auf die Schultern“ hebt die Kamera 1 m an, sodass man plötzlich über die Köpfe auf die Bühne schaut. Figuren, die näher als 1,6 m vor der Kamera stehen, werden ausgeblendet.
- **Warum:** Spielgefühl: Belohnungen spürt man im Bild. Lesbarkeit am Handy: Heute verdecken riesige Köpfe direkt vor der Linse das untere Drittel (Skizze 3 ⑪). Die Schultern bekommen ihren Sinn: Man sieht mehr.
- **Technik:** In `s.kamera()`: `camera.fov` per Feder zurück (`fov += (ziel - fov) * dt * 8`, `updateProjectionMatrix()` nur bei Änderung), `kamZiel` um Offsets für Schultern und Combo ergänzen. Ausblenden in `bewegeFiguren()`: `f.g.visible = camera.position.distanceTo(f.g.position) > 1.6`. Ein „Zeitlupen“-Effekt geht nicht, weil die Spielzeit der Musik folgt; stattdessen nur Kamera und Speedlines (CSS-Overlay). Unter `prefers-reduced-motion` kein FOV-Kick und kein Schwenk, nur der feste Höhenwechsel.
- **Aufwand:** klein.
- **Kosten Handy:** keine; ausgeblendete Figuren sparen sogar Aufrufe.

### 8. Blob-Schatten statt Schattenkarte (Handy)
- **Was man sieht:** Unter jeder Figur liegt ein weicher dunkler Fleck, der beim Springen kleiner und heller wird. Dadurch sieht man genau, wer in der Luft ist (Springen schützt vor Remplern). Am Rechner bleibt der Bühnenschatten zusätzlich.
- **Warum:** Lesbarkeit: Man erkennt Abstand und Sprunghöhe, das hilft beim Ausweichen. Leistung: Heute werfen Rumpf und Arme jeder Figur Schatten (`castShadow` in `figuren.js`); im Schatten-Durchgang sind das bis zu 3 zusätzliche Aufrufe je Figur. Auf dem Handy ist die PCF-Soft-Schattenkarte das Teuerste, was man weglassen kann.
- **Technik:** `InstancedMesh(PlaneGeometry(1, 1), MeshBasicMaterial({ map: radialerVerlauf, color: 0x000000, transparent: true, depthWrite: false }), maxLeute)`, pro Bild `setMatrixAt` (Position, Skalierung nach Höhe) und `instanceMatrix.needsUpdate = true`. Auf dem Handy `renderer.shadowMap.enabled = false` (die Erkennung `handy` in `szene.js` gibt es schon).
- **Aufwand:** klein bis mittel.
- **Kosten Handy:** +1 Aufruf; der Schatten-Durchgang fällt weg. Geschätzt der größte Leistungsgewinn der Liste, der Puffer für Vorschlag 3, 4 und 10 schafft.

### 9. Band und Bühne als Bühne
- **Was man sieht:** Die Band steht im Gegenlicht mit hellem Rand. Hinter ihr steht eine Backline aus Boxen mit eigenen FOF-Schriftzügen („FUCK OFF FASHION“, „DIY OR DIE“). Das Schlagzeug hat Becken, die im Takt wackeln. Das Banner sieht aus wie ein Siebdruck-Plakat (zweifarbig, leicht versetzt gedruckt) mit dem Bandnamen des gewählten Songs. Beim Mitgrölen leuchten die Titelworte des Songs groß auf dem Banner.
- **Warum:** Stimmung und Marke: Die Bühne ist das Ziel, sie muss das Hellste und Lebendigste im Bild sein. Die Band wird erkennbar, ohne fremde Fotos: nur eigene Typografie. Mitgrölen bekommt seinen festen Ort.
- **Technik:** Banner-`CanvasTexture` neu malen mit `song.bandName` und zwei Farbschichten, die um 2–3 px versetzt sind (Passer). Vor dem Malen `await document.fonts.load("150px Anton")`, damit nicht die Ersatzschrift in der Textur landet. Becken als `CylinderGeometry` (flach), `rotation.x` im Takt. Gegenlicht: siehe Vorschlag 3. Die Titelworte als zweite Canvas-Ebene mit `emissiveMap` und `emissiveIntensity`, die im Takt pumpt.
- **Aufwand:** mittel.
- **Kosten Handy:** +4 bis 6 Aufrufe, eine zusätzliche 1024er-Textur (rund 4 MB GPU-Speicher). Unkritisch.

### 10. Siebdruck- und Kopierer-Filter (eigener Vollbild-Shader)
- **Was man sieht:** Das ganze Bild bekommt den FOF-Druck-Look. Die Farben sind auf wenige Töne reduziert, in den Schatten liegt ein Punktraster wie beim Zeitungsdruck, dazu leichtes Kopierer-Korn und ein 1-px-Versatz des Rotkanals wie bei verrutschtem Siebdruck. Bei „STIMMUNG KOCHT!“ wird der Versatz kurz stärker.
- **Warum:** Marke: Das ist der stärkste Einzelhebel für „sieht aus wie FOF“ und nicht wie ein generisches 3D-Spiel. Die Seite selbst lebt von Zine und Siebdruck. Lesbarkeit: Die Reduktion auf wenige Töne macht das dunkle Bild sogar klarer.
- **Technik:** Kein `EffectComposer`. Die Zusatzmodule aus `three/examples` importieren den nackten Namen `"three"` und bräuchten eine Import-Map und mehrere Dateien. Stattdessen etwa 60 Zeilen eigener Code:
  - Szene in ein `WebGLRenderTarget` mit 0,75-facher Auflösung rendern (`type: HalfFloatType` am Rechner, `UnsignedByteType` am Handy).
  - Dann ein bildschirmfüllendes Dreieck (`BufferGeometry` mit 3 Ecken) mit `ShaderMaterial` in einer eigenen `Scene` und einer `OrthographicCamera(-1, 1, 1, -1, 0, 1)` zeichnen.
  - Im Shader: Posterize auf 5 Stufen, Raster aus `gl_FragCoord` (nur unter Helligkeit 0,35), Korn aus einer Hash-Funktion (unter `prefers-reduced-motion` stehend statt flimmernd), Rotkanal-Versatz, zum Schluss `#include <colorspace_fragment>` für sRGB.
  - `antialias: false` am Renderer, weil das Raster die Kanten ohnehin überdeckt.
  - Abschaltbar machen (Qualitätsstufe), falls p95 über 20 ms geht.
- **Aufwand:** mittel bis groß (Shader schnell geschrieben, aber Abstimmung der Lichtwerte mit Vorschlag 4 und Test auf echten Handys nötig).
- **Kosten Handy:** +1 Vollbild-Durchgang bei 0,75 Auflösung (etwa 0,8 MP bei Handy-Pixeldichte 1,5). Dafür fallen MSAA und volle Auflösung der Szene weg. Geschätzt ±1 ms, also neutral bis leicht teurer. **Als einziger Vorschlag vor dem Einbau auf einem echten Mittelklasse-Handy messen.**

### 11. Menge mit Charakter und neuen Mechaniken
- **Was man sieht:** Die Menge ist bunter: Kutten mit Nieten, unterschiedlich hohe Iros, ein paar Schilder („OI!“, „DIY“). Im Takt wechselt jede Figur zwischen Faust-Pumpen und Headbangen. Beim Mitgrölen fliegen aus 3–4 Mündern Sprechblasen mit den Titelworten. Gefallene liegen sichtbar am Boden, mit pulsierendem Hand-Symbol und Ring. Wer aufgehoben ist, reckt kurz beide Arme hoch.
- **Warum:** Spielgefühl: „Gefallene aufheben“ und „Mitgrölen“ müssen sofort erkennbar sein, sonst übersieht man sie im Gedränge. Stimmung: Die Menge wirkt wie Leute statt wie ein Haufen Klone. Leistung: Die feste Reihe am Rand (14 Leute, kaum Bewegung) kann zusammengelegt werden.
- **Technik:** Mehr Varianten in `figuren.js` über die vorhandenen Farblisten und `fuegeZusammen()` (Nieten als kleine `IcosahedronGeometry` mit in den Rumpf gemischt, Schild als Teil des Arms). Sprechblasen und Hand-Symbol als `Sprite` mit `SpriteMaterial({ map: CanvasTexture, depthTest: false })`, aus einem Pool von 4 bis 6 wiederverwendet. Randreihe als `InstancedMesh` je Teilgeometrie (Rumpf, Arm) mit `instanceColor`, Arme mit fester Haltung.
- **Aufwand:** mittel.
- **Kosten Handy:** Randreihe als Instancing spart geschätzt 40–50 Aufrufe (14 Figuren × 3–4 Meshes → 2–3). Sprites +4 bis 6. Unterm Strich ein Gewinn.

### 12. Läden mit eigenem Gesicht
- **Was man sieht:**
  - **PITCHER:** eine Theke mit Zapfhähnen und eine Leuchtschrift über der Bühne.
  - **Druckluft draußen:** eine Lichterkette über dem Hof und Baumsilhouetten vor dem Abendhimmel.
  - **Druckluft drinnen:** dichtere Graffiti bis unter die Decke und Rohre an der Decke.
  - **Zentrum Altenberg:** Ziegelwand, hohe Fabrikfenster mit Mondlicht und Moving Heads an den Traversen.
- **Warum:** Wiedererkennung: Heute unterscheiden sich die Läden vor allem in Farbe und Größe; man sollte nach einer Sekunde wissen, wo man ist. Marke: Die Läden sind echte Orte der Szene. Alles entsteht aus eigener Typografie und prozeduralen Canvas-Mustern, ohne fremde Fotos und ohne nachgebaute Logos.
- **Technik:** Leuchtschrift als `CanvasTexture` (Text zweimal gemalt, einmal mit `shadowBlur` als Glühen) auf `MeshBasicMaterial` mit `AdditiveBlending`, also Glühen ohne Bloom-Pass. Lichterkette als `Points` mit Farbattribut und Funkeln über `aPhase`. Ziegel und Fenster als `CanvasTexture`, Fenster als `MeshBasicMaterial` (emissiv wirkend, unbeleuchtet). Moving Heads: kleine Kegel aus Vorschlag 3, die im Takt schwenken. Alles in `szene.js` unter `deko`, wie heute schon.
- **Aufwand:** mittel (je Laden ein halber Tag).
- **Kosten Handy:** +3 bis 8 Aufrufe je Laden, 1–2 zusätzliche Texturen. Unkritisch.

## Welche Grafik zeigt welche neue Mechanik?

| Mechanik (Etappe 5) | Sichtbar durch |
|---|---|
| Combo bis ×4 | Du-Ring (1), Stempel im HUD (2), FOV-Kick und Nähe (7) |
| Circle Pit | drehender Pfeilring am Boden (6), Kamera leicht mitgedreht (7, nicht bei reduzierter Bewegung) |
| Gefallene aufheben | liegende Figur mit Hand-Sprite und Ring (11), farbiger Umriss (4) |
| Wall of Death mit perfektem Start | Tape-Linie und zwei Lichtfarben (6), Kamera-Schwenk (7), Stroboskop auf „LOS!“ (3) |
| Mitgrölen mit den Titelworten | Titelworte leuchten auf dem Banner (9), Sprechblasen aus der Menge (11) |
| Stimmungsbalken, „STIMMUNG KOCHT!“ | Tape-Balken und Stempel (2), Licht pumpt stärker, Dampf, Konfetti, Stroboskop (3, 5), stärkerer Druckversatz (10) |
| Auf die Schultern | Kamera 1 m höher, Blick über die Köpfe (7) |

## Reihenfolge und Budget

1. **Erst 8 und 7**, also Blob-Schatten und das Ausblenden naher Figuren. Das schafft Leistungspuffer und behebt die Handy-Verdeckung.
2. **Dann 1, 2, 3, 5 und 6.** Sie sind günstig, bringen am meisten Spielgefühl und machen die Etappe-5-Mechaniken lesbar.
3. **Dann 4 und 9.** Sie legen den Stil fest.
4. **Zuletzt 10, 11 und 12**, jeweils mit Messung davor und danach.

Faustregel für das Budget auf dem Handy:
- höchstens 250 Zeichenaufrufe,
- höchstens ein Vollbild-Durchgang,
- keine Schattenkarte,
- Pixeldichte höchstens 1,5 (ist schon so),
- automatische Stufe: Liegt p95 über 3 s länger als 20 ms, zuerst Vorschlag 10 aus, dann Kegel-Intensität und Umrisse.

## Top 5 (je eine Zeile)

1. **Du-Ring mit Combo-Farbe:** Man findet sich sofort und sieht die Combo dort, wo man hinschaut. Aufwand klein, praktisch keine Leistungskosten.
2. **Zine-HUD und Stempel-Pops:** Lesbar auf jedem Hintergrund, ohne Überlagerung, sofort FOF. Aufwand klein, reines CSS.
3. **Lichtkegel, LED-Kante und Stroboskop im Takt:** Konzertstimmung, und man sieht den Takt. Aufwand klein, höchstens 3 Blitze pro Sekunde.
4. **Ein Partikelsystem für Bier, Dampf und Konfetti:** Juice für jeden Treffer und Höhepunkt, und dabei weniger Zeichenaufrufe als heute. Aufwand klein bis mittel.
5. **Toon-Shading mit Umriss:** Der Comic-Look passt zur Marke und trennt die Figuren im Gedränge. Aufwand mittel.
