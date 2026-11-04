# Konzertkalender mit Karte – Design

Stand: 4. November 2026 · Projekt: FUCK OFF FASHION (statische Seite, `D:/claude/fof/site`)

> `docs/` ist Arbeitsmaterial und wird nicht mit ausgeliefert (siehe „Hosting“).

## Wozu

Mark und seine Leute wollen spontan wissen: **Wo, wann, was ist los, im Umkreis von etwa 100 km?** Heute klappern sie dafür mehrere Portale ab (vor allem KNOX) und schauen nebenbei bei Spotify. Der Kalender bündelt das an einer Stelle. Er hat eine Karte zur Orientierung und den frechen, dreckigen, lustigen Ton der Seite (der „anarchistische Twist“).

Sie selbst sind der erste Maßstab. Gesucht werden Punk, Ska, Hardcore und Verwandtes, vor allem kleine Läden, AZs und Kneipen.

## Ziele

1. Umkreissuche um den eigenen Standort oder eine eingetippte PLZ / einen Ort.
2. Datumsfilter: ein Tag (Schnellwahl „heute“, „Wochenende“) oder ein Zeitraum von–bis.
3. Genre-Filter, optional und ausdrücklich grob (siehe Daten).
4. Karte und Liste derselben Treffer. Die Liste ist sortierbar nach Datum oder Entfernung.
5. Ein Termin zeigt Band(s), Laden, Ort, Datum, Link zur Quelle bzw. zum Laden und eine Route dorthin.
6. Die Termine aktualisieren sich einmal täglich von selbst, ohne Handarbeit.
7. Alles kostet nichts (außer später ggf. einer eigenen Domain).
8. **Gebiet: Deutschland, Niederlande, Belgien** (Marks Vorgabe). Termine aus anderen Ländern (KNOX hat auch Österreich, Schweiz, Tschechien u. a.) werden beim Abholen verworfen.
   - Wo Mark wohnt, ist nicht gesagt. Annahme Claude: westliches NRW bzw. Niederrhein, nahe NL/BE. Dort ist der Praxistest: Eine 100-km-Suche von dort muss Termine diesseits und jenseits der Grenze zeigen.

## Nicht-Ziele

- Kein eigenes Eintragsformular. Wer einen Gig hat, wird zu KNOX geschickt („Neuer Eintrag“).
- Keine Accounts, keine Merkliste auf dem Server, keine Benachrichtigungen.
- Kein Ticketverkauf, keine Affiliate-Links.
- Kein Spotify, keine kommerziellen Portale (livegigs, Pressure Magazine, Eventim & Co.).
- Keine Empfehlungen, kein Ranking „für dich“.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Besucher-Browser sprechen beim normalen Benutzen mit fremden Servern (Kartenkacheln, Geocoding, CDNs). Das bricht das Datenschutzversprechen der Seite: „keine Inhalte von fremden Servern“.
- Der eigene Standort verlässt das Gerät des Besuchers.
- Die Quellen werden mit Anfragen überflutet (pro Besucher abfragen statt einmal täglich).
- Es sieht aus wie ein Eventim-Klon: glatt, neutral, kommerziell.
- Die Startseite wird spürbar langsamer (Lighthouse mobil heute 91).

## Datenquellen

Alle Quellen werden **nur vom täglichen Skript** abgefragt, nie vom Browser der Besucher. Jede Quelle ist ein eigener, austauschbarer Baustein (Adapter), damit später weitere dazukommen können.

### 1. KNOX Punkkonzerte-Datenbank (Basis, ganz Deutschland)

- Feed: `https://knox.p-u-n-k.de/db/feed.php` (RSS 2.0, gerade etwa 4.300 Termine, rund 3,7 MB).
  - Filter per URL: `datum_von` / `datum_bis` (tt.mm.jjjj), `plz_von` / `plz_bis`, `gruppe`, `allgemein`.
  - Das Skript holt nur den benötigten Zeitraum (siehe „Zeitfenster“).
- Erlaubnis: Die KNOX-Hilfe (`hilfe.php?action=homepage`) beschreibt ausdrücklich, wie man den Feed in die eigene Homepage einbindet, mit dem Mustertext „Konzerttermine bereitgestellt von Knox Punkkonzerte Datenbank“ und Link auf `https://knox.p-u-n-k.de/db/`. Genau diese Quellenangabe kommt sichtbar auf die Seite.
- Felder je Eintrag (im HTML der `description`):
  - Band(s), oft mit freiem Zusatztext wie Genre oder Tourname
  - Datum
  - Ort als „PLZ Stadt“
  - Wo (Laden)
  - optional Webseite, E-Mail und Telefon
  - `guid` mit der KNOX-ID
- Kein Genre-Feld, keine Koordinaten. Es rutschen auch genrefremde Abende rein (Lesungen, Indie-Folk). Das ist akzeptiert.
- **Das Feld „Ort“ ist uneinheitlich** (Stichprobe 4. November 2026): Bei 1.561 von 4.287 Einträgen fehlt eine deutsche PLZ. Vorkommende Formen:
  - nur Stadt („Hamburg“, „Kassel“)
  - ausländische PLZ mit Land in Klammern („6525 Nijmegen (Holland)“, „5038 Tilburg ( Niederlande)“, „1030 Wien  (Austria)“)
  - leer oder „unbekannt“
- Das Land wird aus dem Klammerzusatz erkannt (Holland/Niederlande/NL, Belgien/Belgium/België/Belgique). Ohne Zusatz und mit fünfstelliger PLZ gilt Deutschland, ohne beides wird über den Ortsnamen aufgelöst.
- Einträge ohne auflösbaren Ort kommen nicht in die Umkreissuche. Die Seite nennt ihre Zahl kurz („12 Termine ohne Ort, die findest du bei KNOX“).

### 2. Radar (radar.squat.net, Kalender der Squat- und AZ-Szene)

- API: `https://radar.squat.net/api/1.2/search/events.json` mit `facets[country][]=DE` und `facets[category][]=music-concert` sowie `fields=…`. Orte über `/api/1.2/location/<uuid>.json`.
- Liefert, was KNOX fehlt:
  - Genre-Tags („Punk / Hardcore / Crust“, „Ska / Reggae“ u. a.)
  - genaue Koordinaten (`map.lat` / `map.lon`) und Adresse
  - Preisangabe (`free`, `by donation`, `other`)
  - Tags wie „barrierearm“, „queer“, „FLTI*“
- Sehr Berlin-lastig: aktuell 134 von 136 Konzerten in DE. In NL gibt es 83, meist Amsterdam und Nijmegen und fast alle ohne Genre-Tag. BE: 0.
- Für die vermutete Heimatregion bringt Radar wenig. Der Radar-Adapter kommt deshalb **nach** KNOX, Karte und Twist dran, nicht in den ersten Durchstich.
- **Nur passende Genres übernehmen** (Entscheidung Claude). Radars Kategorie „music/concert“ umfasst alles, auch Hiphop, Elektro und Jazz. Übernommen werden nur Termine mit einem dieser Tags:
  - „Punk / Hardcore / Crust“, „Ska / Reggae“, „Grind Dbeat Death“
  - oder ohne Genre-Tag, aber mit einem Stichwort aus der Genre-Wortliste (siehe Genre) im Titel.
  - Die Tag-Liste steht in derselben pflegbaren Datei.
- Nutzungsbedingungen konnten nicht gelesen werden (Bot-Schutz auf der Webseite). Die API ist öffentlich und für Weiterverwendung gedacht (es gibt ein WordPress-Plugin und einen Go-Client). Quellenangabe mit Link auf radar.squat.net ist Pflicht.

### 3. Sachsenpunk (optional, nur nach Erlaubnis)

- `https://sachsenpunk.de/dates/`: handgepflegte Textliste für Sachsen, Zeilen im Muster „TT.MM. (Wt) Stadt – Laden – Bands“. Kein Feed.
- **Erst einbauen, wenn Mark eine Erlaubnis der Betreiber hat.** Der Adapter wird nicht vorab gebaut.

### Zusammenführen

- Dubletten zwischen den Quellen werden zu einem Termin vereint, wenn drei Dinge übereinstimmen:
  - gleiches Datum
  - gleiche Stadt (normalisiert)
  - deutliche Überschneidung der Bandnamen (normalisiert, Wortvergleich)
- Der vereinte Termin nennt alle Quellen als Links.
- Bei Widerspruch gewinnt Radar für Koordinaten, Genre und Preis, KNOX für den Rest.

### Zeitfenster

Gespeichert werden Termine von heute bis heute + 180 Tage. Vergangene Termine fliegen beim nächsten Lauf raus.

## Ortung (Koordinaten für KNOX-Termine)

1. **Cache zuerst:** `data/orte.json` ordnet „normalisierte Stadt + Laden“ Koordinaten zu und wird im Repo mitgeführt.
2. **Nominatim** (OpenStreetMap) für neue Läden, nur im Skript:
   - Suche nach „Laden, PLZ Stadt“, Ergebnis in den Cache.
   - Nominatim-Regeln einhalten: höchstens 1 Anfrage pro Sekunde, eigener User-Agent mit Projektname und Seiten-URL (keine private Mailadresse), Ergebnisse cachen.
   - Pro Lauf höchstens N neue Abfragen (Vorschlag N = 300), damit ein Lauf unter dem Zeitlimit von Codeberg bleibt (siehe Hosting).
   - Nicht gefundene Läden merkt sich der Cache als „nicht gefunden“ und versucht sie frühestens nach 30 Tagen erneut.
3. **Rückfall Ortstabelle:** eine freie Tabelle mit Postleitzahlen und Orten samt Mittelpunkt für **DE, NL und BE**, im Repo als Datei.
   - Vorschlag: GeoNames-Postleitzahlen und -Orte, Lizenz CC BY 4.0, also mit Quellenangabe. Der Builder prüft Abdeckung und Lizenz.
   - NL hat vierstellige Postleitzahlen plus zwei Buchstaben (PC4 reicht), BE vierstellige.
   - Reihenfolge: PLZ + Land → Mittelpunkt; sonst Ortsname + Land → Ortsmitte.
   - Termine, die nur über PLZ oder Ortsmitte geortet sind, markiert die Karte als „ungefähr“.
   - Weil die Tabelle offline liegt, löst sie auch die vielen KNOX-Einträge mit nur einem Stadtnamen, ohne Nominatim zu belasten.

Dieselbe Tabelle wird im Browser für die Eingabe „PLZ / Ort“ benutzt (deutsche, niederländische und belgische Orte). Zur Laufzeit gibt es also kein fremdes Geocoding. Für den Browser wird sie auf das Nötige eingedampft: Ort, PLZ, Land, Koordinaten, gerundet.

## Genre

- **Radar:** Tags direkt übernehmen.
- **KNOX:** Stichwortsuche in Bandzeile und Zusatztext.
  - Beispiele: `ska`, `reggae`, `oi`, `hardcore`, `crust`, `psychobilly`, `rockabilly`, `punk`, `metal`, `emo`.
  - Die Wortliste steht in einer Datei und lässt sich pflegen.
  - Ohne Treffer gilt „Punk / Hardcore (allgemein)“.
- Der Filter ist ausdrücklich unscharf, und die Seite sagt das auch frech: „Genres raten wir. Wenn's nicht passt: Pogo trotzdem.“

## Der Twist (alle fünf, nach Marks Freigabe)

1. **Umkreis in Szene-Einheiten.** Regler mit Stufen statt nackter Kilometer:
   - Laufweite 5 km, Fahrradweite 25 km, Bahnweite 100 km (Standard), Bandbus-Weite 300 km.
   - Je Termin steht die Anfahrt menschlich, z. B. „47 km · eine Platte lang Bahn“. Die Umrechnungen (Platte ≈ 40 min, Bahn ≈ 70 km/h, Rad ≈ 15 km/h …) legt der Builder fest, Hauptsache stimmig und kurz.
2. **Kommerz-Riecher.**
   - Termine, deren Link, Mail oder Text auf große Ticketverkäufer zeigt, bekommen einen schiefen Stempel „Riecht nach Konzern“. Domainliste als pflegbare Datei; Startliste: eventim, ticketmaster, livenation, myticket, ticketcorner, oeticket.
   - Schalter „Kommerz ausblenden“, standardmäßig **aus**: Der Stempel soll gesehen werden.
3. **Freche Leerstellen.** Keine Treffer → statt „0 Ergebnisse“ wechselnde Sprüche:
   - „Heute nix. Geh Sticker kleben.“
   - „Kein Konzert im Umkreis? Dann mach eins. Keller, Garage, drei Leute mit Instrumenten.“ Dazu Link zu KNOX „Neuer Eintrag“.
   - Weitere Sprüche schreibt der Builder im selben Ton.
4. **Kein Algorithmus.** Nur Sortierung nach Datum oder Entfernung. Ein Satz im Kopf der Seite: „Wir empfehlen dir nichts. Du entscheidest.“
5. **Copyshop-Karte.**
   - Schwarz-weiß, wie aus dem Kopierer.
   - Konzerte als kleine rote, gesprühte A (Rot `#ff1a1a`, Motiv 008).
   - Eigener Standort heißt „Du bist hier. Leider.“
6. Dazu, weil Radar es hergibt: Filter **„Eintritt frei / auf Spende“**. Er greift bei Radar-Preisangaben und bei KNOX-Texten mit „Eintritt frei“, „Spende“, „Soli“, „umsonst“.

Ausdrücklich nicht: Witze, die zu Straftaten auffordern (z. B. Schwarzfahren). Grund: Impressumsverantwortung.

## Karte

Entscheidung von Claude (Mark hat die Karte an den Experten übergeben):

- **Keine Kachel-Karte von fremden Servern** (also nicht OSM-Kacheln, Google, Mapbox).
- Stattdessen eine **eigene, schlichte Vektorkarte im Copyshop-Look**:
  - Inhalt: Grenzen von Deutschland, den Niederlanden und Belgien, deutsche Bundesländer bzw. Provinzen, größere Städte als Orientierung, eventuell große Flüsse. Luxemburg wird nur als Umriss zur Orientierung gezeichnet und hat keine Termine.
  - Daten: Natural Earth (gemeinfrei) oder vereinfachte OSM-Daten, als kleine Datei (Ziel unter 300 KB) auf dem eigenen Server.
  - Darstellung: SVG oder Canvas.
- **Zoomen und Verschieben** vom ganzen Gebiet bis Regionsebene.
  - Der Umkreis wird als Kreis gezeichnet.
  - Dichte Stellen (Berlin!) werden zu einem Haufen-Symbol mit Zahl zusammengefasst und gehen beim Reinzoomen auf.
  - Straßengenaue Detailkarten gibt es bewusst nicht. Dafür ist die Route da.
- **Route:** Knopf „Hinkommen“. Er öffnet die Routenplanung von openstreetmap.org mit Ziel-Koordinaten, Standard Fahrrad, umschaltbar auf zu Fuß / Auto. Hier verlässt der Besucher die Seite bewusst; die Seite sagt das neben dem Knopf. Der Startpunkt wird nur mitgegeben, wenn der Besucher seinen Standort freigegeben hat, sonst nur das Ziel.
- Die **Liste** ist die vollwertige, barrierearme Hauptansicht. Die Karte ist Ergänzung: Alles geht auch ohne Karte und per Tastatur.

## Standort und Datenschutz

- Standort per Browser-Geolocation nur auf Knopfdruck („Wo bin ich?“). Alternativ PLZ / Ort eintippen.
- Umkreis-Berechnung (Haversine) läuft im Browser. Der Standort wird nicht gesendet und nicht gespeichert.
- Die letzte Auswahl (Umkreisstufe, Genre, Schalter) darf im `localStorage` stehen, der Standort selbst nicht.
- `datenschutz.html` ergänzen:
  - Abschnitt Konzertkalender: Geolocation bleibt lokal; der Route-Link führt zu openstreetmap.org.
  - Hoster Codeberg (füllt den vorhandenen Platzhalter „Hoster und Speicherdauer der Logs“).
- Quellenangaben sichtbar unter Karte und Liste:
  - „Konzerttermine bereitgestellt von Knox Punkkonzerte Datenbank“ (Link)
  - „Radar – radar.squat.net“ (Link)
  - „Kartendaten © OpenStreetMap-Mitwirkende“ bzw. Natural Earth, je nach Datenquelle
  - PLZ-Tabelle gemäß ihrer Lizenz

## Seitenaufbau

- **Eigene Seite `konzerte.html`.** Karte und Termindaten belasten die Startseite nicht.
  - Gleicher Kopf, Fuß und Stil wie `index.html`.
  - Der rote Faden (`js/faden.js`) darf mitlaufen. Ob er dort eine Wegmarke bekommt, entscheidet der Builder.
- **Navigation:** Neuer Punkt „Konzerte“. Auf schmalen Bildschirmen bleibt die Kopfzeile ohne Überlauf; die vorhandene Regel `.nav--wide` beachten.
- **Startseite:** Kleiner Teaser-Block, z. B. „Was geht? → Konzerte im Umkreis“. Der Teaser lädt keine Termindaten.
- **Termindaten** als eine JSON-Datei (Ziel unter 300 KB komprimiert), geladen erst auf `konzerte.html`.
- **Reduzierte Bewegung:** keine animierten Übergänge auf der Karte, kein Sprühen der Marker.

## Datenformat (Vorschlag, Details beim Builder)

`data/konzerte.json`:

```json
{
  "stand": "2026-11-04T05:00:00+01:00",
  "quellen": [{"id": "knox", "name": "Knox Punkkonzerte Datenbank", "url": "https://knox.p-u-n-k.de/db/"}],
  "termine": [{
    "id": "knox-651450",
    "datum": "2026-11-03", "zeit": null,
    "bands": "Mother's Cake", "zusatz": "Fall 2026",
    "laden": "Roxy", "plz": "89077", "stadt": "Ulm",
    "lat": 48.39, "lon": 9.97, "genau": true,
    "genres": ["Punk / Hardcore (allgemein)"],
    "frei": false, "kommerz": false,
    "links": [{"quelle": "knox", "url": "http://www.roxy.ulm.de/"}]
  }]
}
```

## Tägliches Skript

- `tools/konzerte/abholen.py`: Python, nur Standardbibliothek, wenn möglich. Ablauf:
  1. Quellen holen.
  2. Normalisieren.
  3. Orten (Cache → Nominatim → PLZ).
  4. Genre, „frei“ und „Kommerz“ bestimmen.
  5. Dubletten zusammenführen.
  6. `data/konzerte.json` und `data/orte.json` schreiben.
- Freundlich zu den Quellen: ein Abruf pro Quelle und Tag, eigener User-Agent, Zeitlimits, Wiederholung höchstens einmal.
- **Fehlertolerant:** Fällt eine Quelle aus oder ändert ihr Format, bleiben deren Termine vom Vortag stehen. Der Lauf meldet einen Fehler im Log, bricht aber nicht alles ab. Ist eine Quelle drei Tage in Folge kaputt, schlägt der Lauf sichtbar fehl, damit Mark eine Mail von Codeberg bekommt.
- **Tests:** Parser gegen gespeicherte Beispieldateien (Fixtures) aus KNOX und Radar, dazu Dubletten-Erkennung, Entfernungsrechnung, Kommerz- und Frei-Erkennung.

## Hosting: Codeberg

- **Repo auf Codeberg**, ausgeliefert über Codeberg Pages; kostenlos, gemeinnütziger Verein.
  - Mark legt Account und Repo selbst an (Claude legt keine Accounts an).
  - Inhalte unter freier Lizenz: Motive CC0 wie gehabt, Code z. B. ebenfalls CC0 oder MIT (Builder schlägt vor, Mark entscheidet beim Anlegen).
- **Täglicher Lauf über Forgejo Actions** (hosted runner, z. B. Label `codeberg-tiny`), Zeitplan per `schedule`/cron, etwa 05:00 Uhr.
  - Der Lauf startet das Skript, committet die geänderten Datendateien und veröffentlicht die Seite neu.
  - Limit laut Codeberg etwa 10 Minuten pro Job; das Skript muss darunter bleiben.
- **Ausgeliefert wird nur, was zur Seite gehört.** Nicht mit raus gehen `docs/`, `tools/`, `redesign/` und Testdateien, z. B. über einen eigenen Pages-Branch, in den der Lauf nur die Seite kopiert. Wie genau, entscheidet der Builder.
- **Eigene Domain später:** Datei `.domains` im ausgelieferten Branch und DNS-Eintrag beim Domain-Anbieter. Bis dahin `<name>.codeberg.page`.
- **Was öffentlich wird** (Entscheidung Claude): Codeberg-Repos sind öffentlich, also auch Git-Verlauf und Quelltext, nicht nur die ausgelieferte Seite.
  - `redesign/` (Arbeitsmaterial, etwa 17 MB mit Lighthouse-Berichten) kommt vor dem ersten Push aus dem Repo heraus. Es wird in einen lokalen Ordner außerhalb verschoben und in `.gitignore` eingetragen.
  - `docs/` (dieses Dokument) darf öffentlich sein, wird aber nicht ausgeliefert.
  - Die täglich committeten Termindaten sind dieselben, die die Seite ohnehin zeigt; das ist in Ordnung.
- **Reihenfolge Go-live** (Entscheidung Claude):
  - Gebaut und getestet wird lokal wie bisher.
  - Der Codeberg-Probelauf läuft in einem kleinen, separaten Test-Repo ohne die Seite.
  - Das echte Repo geht erst online, wenn Impressum und Datenschutz ausgefüllt sind (keine `[bitte ausfüllen]`-Platzhalter mehr). Eine öffentliche Seite ohne Impressum ist in Deutschland abmahnfähig.
- **Erster Schritt, bevor gebaut wird:** Probelauf, ob der Zeitplan auf Codebergs gehosteten Runnern zuverlässig startet (eine Woche täglicher Mini-Job).
  - Fallback 1: GitHub Pages + Actions (kostenlos, aber Microsoft).
  - Fallback 2: Uberspace (Zahl-was-du-willst, eigener Cron).
  - Der Wechsel betrifft nur den Lauf, nicht Skript oder Seite.

## Was dem Builder überlassen ist

- Genaue Gestaltung von `konzerte.html` im bestehenden Design-System (`css/tokens.css`, `css/site.css`).
- Wahl SVG oder Canvas, Kartendatenquelle, Haufen-Logik und Zoomstufen.
- Umrechnungen und Formulierungen der Szene-Einheiten, weitere Leerstellen-Sprüche im festgelegten Ton.
- Genaue Normalisierung und Schwellen beim Zusammenführen.
- Reihenfolge der Umsetzung, Rahmen fest:
  1. Dünner Durchstich: KNOX → JSON → Liste mit Umkreis und Datum (inklusive NL/BE und Ortstabelle).
  2. Karte und Twist-Elemente.
  3. Radar.
  4. Hosting.
  
  Innerhalb dieser Schritte entscheidet der Builder.

## Offene Punkte außerhalb des Baus (Mark)

- Codeberg-Account und Repo anlegen.
- Optional: kurze Mail an Knox (rotzloeffel@mail.com) und Radar, dass ihre Termine hier erscheinen.
- Optional: Sachsenpunk um Erlaubnis fragen.
- Domain und Postfach `hallo@…` bleiben wie gehabt offen; die Platzhalter stehen im README.
