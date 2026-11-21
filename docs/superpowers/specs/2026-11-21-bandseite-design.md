# Bandseite „Die Säule“ – Design

Stand: 21.11.2026. Entstanden im Gespräch mit Mark; was er entschieden hat, steht als **Mark**, meine Entscheidungen als **Vorschlag (Claude)**.

## Wozu

Fuck Off Fashion stellt Bands vor, die das Label live gesehen hat und gut findet. Wer die Seite besucht, sieht auf einen Blick, wer bald wo spielt, und kommt mit einem Tipp zu allen Terminen dieser Band. Die Termine kommen aus der vorhandenen Konzertdatenbank (`data/konzerte.json`), die der tägliche Lauf auffrischt. Die Liste fängt klein an und wächst („weitere folgen“, Mark).

## Ziele

- Eigene Seite `bands.html` mit englischer Fassung `en/bands.html`.
- Jede Band erscheint als Plakat auf einer Litfaßsäule, **mit dem echten Bandlogo** (Mark: „immer die Logos der Bands“).
- Ein Tipp aufs Plakat reißt es ab; darunter klebt ein Zettel mit den nächsten Terminen.
- **Nur zukünftige Termine** (Mark). Vergangene Termine erscheinen nirgends.
- Die Seite sortiert sich jeden Tag selbst neu, weil die Termine täglich frisch sind.
- Neue Band hinzufügen = ein Eintrag in einer Datei plus Logo-Datei, sonst nichts.

## Nicht-Ziele

- Keine vergangenen Konzerte, kein Archiv „wo wir sie gesehen haben“ als Liste.
- Keine Bandfotos, keine Pressetexte, keine Musik-Einbettungen (Spotify, YouTube, Bandcamp).
- Keine eigene neue Datenquelle oder kein Scraper für Band-Websites; Termine kommen nur aus `data/konzerte.json`.
- Keine Ticketlinks oder Kaufknöpfe; Links gehen auf die Konzertseite und die offizielle Band-Website.
- Kein Login, keine Bewertungen, keine Kommentare.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- **Falsche Termine an einer Band.** Ein Termin einer anderen Band unter falschem Namen ist schlimmer als gar kein Termin. Im Zweifel nicht zuordnen.
- Bands ohne Termin wirken wie tote Einträge.
- Logos verzerrt, abgeschnitten oder unlesbar (z. B. weißes Logo auf hellem Grund).
- Die Seite lädt fremde Server (Logos von Band-Websites eingebunden statt selbst gehostet). Die Seite verspricht „keine Cookies, kein Tracking“; das bleibt so.
- Pflege nur mit Programmierkenntnissen möglich.

## Gestaltung

### Variante (Mark: „B“)

Mehrere Litfaßsäulen, sortiert nach dem nächsten Konzert der Band. Auf dem Desktop stehen sie nebeneinander wie an einer Straßenecke, am Handy untereinander (kein seitliches Wischen; Mark hat „B, am Handy gestapelt“ bestätigt). Vorbild ist die Skizze https://claude.ai/artifact/83yYLYFwsdtiLWZCiRL3wR, Variante B.

### Säulen (Vorschlag, Claude)

Gruppiert wird nach dem Abstand des **nächsten** Termins zu heute:

| Säule | Regel | Dach-Unterzeile |
|---|---|---|
| Bald | nächster Termin in 0–30 Tagen | Monatsnamen des Zeitraums, z. B. „Nov · Dez“ |
| Demnächst | 31–90 Tage | dito |
| Später | mehr als 90 Tage | dito |
| Gerade still | kein zukünftiger Termin | „keine Termine“ |

Leere Säulen werden nicht gezeigt. Innerhalb einer Säule nach nächstem Termin sortiert, „Gerade still“ alphabetisch. Englisch: Soon / Coming up / Later / Quiet for now.

Breakpoint wie im Rest der Seite: ab 900 px nebeneinander (so viele Spalten wie Säulen, höchstens 4), darunter gestapelt.

### Plakat

- **Schwarz kopiertes Plakat** (Tinte `--ink`) mit Klebeband und leichter Schräglage, wie in der Skizze. Begründung: zwei Logos sind weiß (Los Fastidios, Trijahnity), eines gelb (Alarmsignal); auf Kopierpapier gehen sie unter. Auf Schwarz wirken alle vier gewählten Logos, auch Dan Ganoves rundes Logo mit weißem Ring (Logo-Bogen auf Schwarz und Papier, geprüft am 20.11.2026). Vorschlag (Claude); pro Band später überschreibbar über ein optionales Feld `plakat`.
- Oben das Logo, eingepasst ohne Verzerrung (`object-fit: contain`), `alt` = Bandname.
- Darunter eine Zeile Kurzbeschreibung (aus den Daten belegt, siehe Bandliste) und „Nächstes Mal: Fr 04.12. Oberhausen“ bzw. „Gerade still“.
- Tipp/Klick oder Enter/Leertaste reißt das Plakat ab (Zickzack-Riss, unteres Stück fällt herunter, wie in der Skizze); erneut tippen klebt es wieder an.
- Darunter der **Terminzettel** auf Kopierpapier: die nächsten 4 Termine (Wochentag, Datum, Stadt, Laden); hat die Band mehr, klappt „alle N Termine“ den Rest **auf dem Zettel selbst** auf. Dazu ein Link zur offiziellen Band-Website. Vorschlag (Claude): **kein** Link mit `?suche=` auf die Konzertseite, weil deren Suche wortweise über Band, Zusatz, Laden und Stadt sucht (`js/konzerte/filter.js`) und damit andere Treffer und eine andere Anzahl zeigen würde als das Plakat. Ein allgemeiner Link „Alle Konzerte im Umkreis“ auf `konzerte.html` steht einmal unter den Säulen, nicht auf jedem Zettel.
- Ohne Termine: Zettel sagt „Gerade keine Termine. Kommt wieder.“ plus Website-Link.

### Bedienbarkeit

- Der Abreiß-Knopf ist ein echtes `<button>` mit `aria-expanded`; die Links auf dem Zettel sind erst bedienbar, wenn er offen ist (`inert` o. ä.), dann aber per Tastatur erreichbar. Ein Link darf nicht im Knopf stecken.
- `prefers-reduced-motion`: kein fallendes Stück, Riss ohne Übergang.
- Tippflächen mindestens 44 px, Schrift mindestens 12 px, Kontrast 4,5:1 für kleine Schrift (wie die P2/P3-Regeln vom 20.11.).
- Ohne JavaScript: Plakate mit Logo und Beschreibung sind sichtbar; statt Zettel ein Link „Termine auf der Konzertseite“.

### Einbindung

- Neuer Menüpunkt „Bands“ (EN „Bands“) in der Navigation aller Seiten mit Hauptnavigation (Start, Konzerte, jeweils DE und EN), Reihenfolge vor „Konzerte“. Ob er auf schmalen Desktops in die Zeile passt, prüft der Builder; notfalls bekommt er die Klasse `nav--wide` wie andere Punkte.
- Sprachumschalter DE/EN wie auf der Konzertseite.
- Die rote Faden-Animation (`js/faden.js`) kommt **nicht** auf die Bandseite (wie auf der Konzertseite).

## Daten

### Bandliste (handgepflegt)

Neue Datei `tools/bands.json`, gepflegt wie `tools/motive.json`. Pro Band:

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | Kurzname, z. B. `los-fastidios`; auch Dateiname des Logos |
| `name` | ja | Anzeigename und Suchwort für die Konzertseite |
| `schreibweisen` | nein | weitere Namen für die Zuordnung (Standard: nur `name`) |
| `nicht` | nein | Wörter/Muster, bei denen ein Termin trotz Treffer **nicht** zugeordnet wird (Schutz vor falschen Treffern) |
| `logo` | ja | Pfad unter `assets/img/bands/` |
| `logo_quelle` | ja | URL, von der das Logo stammt |
| `web` | ja | offizielle Website |
| `beschreibung` | nein | `{ "de": …, "en": … }`, eine kurze Zeile |
| `auch_zusatz` | nein | `true`: auch im Freitext `zusatz` suchen (Standard: nein) |
| `plakat` | nein | Plakatfarbe, Standard schwarz |

Startliste (Mark, 20.11.2026; Logos am 20.11. von den offiziellen Seiten geladen, liegen in `D:/claude/fof/Bilder/band-logos/` mit `QUELLEN.txt`):

| Band | Logo | Website | Beschreibung (Beleg) |
|---|---|---|---|
| Dan Ganove | **rundes Logo mit Skelett** (Mark), 2019 × 2019 px | https://dan66713.wixsite.com/dan-punkrock | „Akustikpunk aus Oberhausen“ (eigene Terminliste) |
| Alarmsignal | gelber Schriftzug, 600 × 208 px | https://www.alarmsignal-punkrock.de/ | „Deutschpunk“ (KNOX-Eintrag) |
| Los Fastidios | weißes Lorbeer-Logo, 1849 × 1685 px | https://losfastidios.net | „Streetpunk und Ska aus Italien“ (KNOX: „Punk+Ska - Italy“, „Streetpunk to the 2Tone ska“) |
| Trijahnity | weißer Schriftzug, 3000 × 786 px | https://www.trijahnity.de | „Reggae'n Roll“ (eigene Terminliste und Band-Website) |

Logos werden für die Seite als WebP mit Transparenz abgelegt, höchstens 800 px breit (Alarmsignal bleibt bei 600 px), und selbst gehostet.

### Zuordnung Termin → Band (Vorschlag, Claude)

- Gesucht wird nur im Feld `bands` eines Termins. `zusatz` ist Freitext (Vergleiche, „ex-…“, Tribute) und wird nur für Bands mit `"auch_zusatz": true` in `tools/bands.json` mitgesucht. Begründung: falsche Termine sind schlimmer als fehlende (Anti-Ziel). Am 21.11.2026 kamen alle Treffer der Startliste aus `bands`, keiner nur aus `zusatz`; die Einschränkung kostet heute also nichts.
- Vergleich ohne Groß/Klein, ohne Emoji und Sonderzeichen (z. B. „☠️ALARMSIGNAL“). Dafür eine **eigene Hilfsfunktion** neben `normalisiere()` aus `tools/konzerte/ortstabelle.py`, die diese aufruft und zusätzlich alles außer Buchstaben, Ziffern und Leerzeichen entfernt. `normalisiere()` selbst bleibt unverändert, weil Ortssuche und Konzertfilter sie nutzen.
- Nur **ganze Wörter** bzw. ganze Wortfolgen: „Slime“ trifft nicht „Slimer“.
- Treffer, die ein Muster aus `nicht` enthalten, fallen weg.
- Termine mit `datum` vor heute fallen weg; doppelte Termine (gleiches Datum, gleicher Laden) zählen einmal.
- Abgleich am 20.11.2026 für die Startliste: Dan Ganove 2, Alarmsignal 2, Los Fastidios 5, Trijahnity 0 Termine, keine falschen Treffer. Gegenbeispiel aus Stichproben: „Montreal“ träfe vermutlich die Stadt.

### Wann gerechnet wird (Vorschlag, Claude)

Im **selben täglichen Lauf**, der `data/konzerte.json` schreibt (Workflow `konzerte.yml`, Schritt „Konzerte abholen“), entsteht zusätzlich `data/bands.json`: pro Band die zugeordneten zukünftigen Termine (alle, sortiert) und deren Anzahl. Die Seite lädt nur diese kleine Datei, nicht die 2,5 MB der Konzertdaten. Die Zuordnung ist damit in Python testbar wie der Rest der Datenpipeline.

Die Plakate selbst (Logo, Name, Beschreibung, Links) schreibt ein Build-Skript nach dem Muster von `tools/build-motive.py` fest ins HTML beider Sprachfassungen, mit `--pruefen`-Modus. JavaScript ergänzt nur Termine, Gruppierung in Säulen und das Abreißen. Weil die Datei bis zu einem Tag alt sein kann, filtert die Seite beim Anzeigen noch einmal alles vor heute heraus.

## Pflege (für Mark)

Neue Band: Logo als Datei nach `assets/img/bands/`, Eintrag in `tools/bands.json`, Build-Skript laufen lassen, committen. Der nächste tägliche Lauf hängt die Termine an. Kommt eine Band nur über die eigene Terminliste (`tools/konzerte/eigene.json`), erscheinen ihre Termine nur, wenn sie dort eingetragen sind (betrifft heute Dan Ganove und Trijahnity).

## Rechte

Bandlogos sind in der Regel geschützt. Mark hat entschieden, die echten Logos zu zeigen. Quelle jedes Logos steht in `tools/bands.json` (`logo_quelle`). Am sichersten ist eine kurze Zustimmung der Bands; das liegt bei Mark.

## Tests und Prüfung

- Python: Zuordnung (Groß/Klein, Emoji, ganze Wörter, `nicht`, Vergangenheit, Doppelte), `data/bands.json`-Format, Build-Skript `--pruefen` für DE/EN.
- JS (node --test): Gruppierung in Säulen an den Grenzen 30/31 und 90/91 Tage, Datum vor heute fällt weg, leere Säulen verschwinden.
- Im Browser: 360, 390 und 1440 px, DE und EN, mit und ohne JS, reduzierte Bewegung, Tastatur.
- Cache-Version (`?v=`) beim Ausliefern erhöhen.
- `tools/veroeffentlichen.sh` hat eine feste Liste der Quelldateien; `bands.html`, `en/bands.html` und `data/bands.json` kommen dazu.

## Veröffentlichen

Wie bisher bei FOF: lokal bauen, testen, committen. **Online erst auf Marks ausdrückliches Ja**, dann Push als `manarchy-lab` nach `main` (veröffentlicht automatisch). Neuer Menüpunkt, Seite und Logos gehen damit erst mit dieser Freigabe live.

## Dem Builder überlassen

- Genaue Riss-Animation, Schräglagen, Klebeband, Säulendach und -fuß (Skizze als Vorlage).
- Name und Ort des Build-Skripts und der Zuordnungsfunktion, solange sie den vorhandenen Mustern folgen.
- Ob `data/bands.json` im selben Python-Aufruf oder in einem eigenen Schritt des Workflows entsteht.
- Seitentitel, Meta-Beschreibung und Einleitungstext (kurz, im Ton der Startseite, DE und EN).

## Offene Punkte bei Mark (blockieren den Bau nicht)

- Wo und wann ihr die Bands live gesehen habt, falls das aufs Plakat soll (Feld kann später dazukommen).
- Zustimmung der Bands zur Logo-Nutzung.
- Trijahnity hat zurzeit keine zukünftigen Termine, weder in der Datenbank noch auf der eigenen Website (geprüft 20.11.2026).
