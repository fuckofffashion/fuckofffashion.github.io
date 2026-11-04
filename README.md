# Fuck Off Fashion – Website

Statische Seite ohne Build-Schritt. Lokal ansehen: `python -m http.server 4173 --directory D:/claude/fof/site`, dann http://localhost:4173.

## Dateien

| Datei | Zuständig für |
|---|---|
| `css/tokens.css` | Farben, Schriften, Abstände, Motion-Tokens (Easings, Dauern) |
| `css/base.css` | Komponenten: Buttons, Klebeband, gerissene Kante, Ticker, Glitch, Erpresserbrief, Plakat, Stempel |
| `css/site.css` | Seitenlayout: Kopf, Hero, Manifest, Wand, Selbermachen, Schluss, Fuß, Unterseiten |
| `js/motion.js` | Motion-Tokens für GSAP + wiederverwendbare Effekte (`tapeReveal`, `stamp`, `ransom`, `glitch`, `ticker`, `smoothScroll`) |
| `js/intro.js` | Intro (einmal pro Session, überspringbar, bei Reduced Motion aus) |
| `js/main.js` | Was wann auf der Startseite passiert |
| `js/tragen.js` | Vorne/Hinten-Vorschau (Sektion Tragen) |
| `js/faden.js` | Roter Faden: 3D-Faden (Three.js) am rechten Rand, knotet sich an den Überschriften in `anchors` zum Anarchie-A. Lädt Three.js erst nach dem Intro, bei Reduced Motion gar nicht |
| `tools/build-anarchie.py` | Zeichnet Motiv 008 (rotes A) als PNG neu |
| `assets/video/` | Anarchie-Loop (WebM, MP4, Standbild) für die Anarchie-Sektion. Quelle: HyperFrames-Projekt `D:/claude/fof/clip/loop`, siehe unten |
| `kit/` | Druckvorlagen für Sticker-Bogen und Flyer, `tools/build-kit.py` macht daraus die PDFs in `assets/kit/` |
| `styleguide.html` | Vorschau des Design-Systems (nicht verlinkt, `noindex`) |

## Neues Motiv an die Wand hängen

1. Bild nach `assets/img/` legen (PNG in voller Auflösung zum Download).
2. Vorschau als WebP erzeugen:
   `ffmpeg -i motiv.png -vf scale=1024:-1 -c:v libwebp -quality 80 motiv-1024.webp`
3. In `index.html` einen Platzhalter `<figure class="poster poster--empty …">` durch eine Kopie von Motiv Nr. 001 ersetzen und Bild, Download-Link, Titel und Nummer anpassen.
   Die Schräglage ergibt sich automatisch aus der Position (4er-Rhythmus in `css/site.css`).

## Nach Änderungen an CSS/JS

Den Versionsparameter in allen HTML-Dateien hochzählen (`?v=3` → `?v=4`), sonst zeigen Browser die alte Datei aus dem Cache.

## Anarchie-Loop neu ausgeben

Der Loop kommt aus dem HyperFrames-Projekt `D:/claude/fof/clip/loop` (das Reel für Instagram liegt daneben in `clip/reel`).
Nach einer Änderung dort:

1. `npx hyperframes render loop -q delivery -o renders/fof-loop-anarchie-16x9.mp4` (im Ordner `D:/claude/fof/clip`)
2. Für die Website verkleinern (aus `site/`):
   - `ffmpeg -i ../clip/renders/fof-loop-anarchie-16x9.mp4 -vf scale=1280:-2 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -an assets/video/fof-anarchie-loop.webm`
   - `ffmpeg -i ../clip/renders/fof-loop-anarchie-16x9.mp4 -vf scale=1280:-2 -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart -an assets/video/fof-anarchie-loop.mp4`
   - Standbild: ein Bild als PNG ziehen (`-ss 3 -frames:v 1`) und mit Pillow als WebP speichern. Direkt mit ffmpeg nach WebP wird das Rot rosastichig.
3. Versionsparameter hochzählen.

Das Standbild lädt erst kurz vor der Sektion, das Video erst, wenn es ins Bild kommt (`js/main.js`). Bei reduzierter Bewegung und im Datensparmodus bleibt es beim Standbild.

## Verbreiten-Kit neu drucken

Nach Änderungen an `kit/sticker.html`, `kit/flyer.html` oder `kit/kit.css`:
`python tools/build-kit.py deine-domain.de`
Die Domain landet als Text und QR-Code auf dem Flyer. Braucht Chrome, PyMuPDF, segno und Pillow.
Danach Dateigrößen in `index.html` (Sektion Mitmachen) prüfen.

## Konzertkalender

Seite `konzerte.html` mit Liste, Filtern und Copyshop-Karte. Kein Build-Schritt im Browser, die Daten werden vorab erzeugt.

| Pfad | Zuständig für |
|---|---|
| `js/konzerte/` | Browser-Module: `app.js` (Zustand, Liste), `filter.js`, `termin.js` (ein Termin), `route.js` (Link „Hinkommen“), `karte.js`, `ortsfeld.js`, `ortssuche.js`, `geo.js` |
| `tools/konzerte/` | Python-Abholer: KNOX und Radar holen, orten, zusammenführen |
| `data/*.json` | `konzerte.json` (Termine), `orte.json`, `orte-tabelle.json` (Ortssuche), `karte.json` (Umrisse), `quellen-status.json` |

Daten erzeugen (im Ordner `site`):

- Termine: `python -m tools.konzerte.abholen`. Optionen: `--ohne-radar`, `--ohne-nominatim`, `--knox-datei PFAD`, `--heute YYYY-MM-DD`, `--daten ORDNER`, `--tabelle PFAD`.
- Ortstabelle: `python -m tools.konzerte.build_ortstabelle` lädt GeoNames neu; mit `--nachbearbeiten` nur Großempfänger entfernen und Aliasse anwenden, ohne Download.
- Karte: `python -m tools.konzerte.build_karte`.

Tests:

- Browser-Module: `node --test "tests/js/*.test.mjs"`
- Python: `python -m unittest discover -s tools/konzerte/tests -t .`

## Täglicher Lauf und Veröffentlichung (GitHub)

Die Seite liegt auf GitHub Pages, der tägliche Lauf auf GitHub Actions (`.github/workflows/konzerte.yml`).
Der Lauf startet täglich um 04:00 UTC, bei jedem Push auf `main` (außer reinen `data/`-Änderungen) und von Hand (Actions > konzerte > Run workflow).
Er testet, holt die Konzerte, committet geänderte `data/*.json` als `konzerte-bot` und stellt die Seite online.
Lokal heißt der Branch `master`, auf GitHub `main` (`git push -u origin master:main`).

- Veröffentlicht wird nur eine feste Dateiliste: `tools/veroeffentlichen.sh <leerer-ordner>`. Das Skript bricht ab, solange in den Rechtstexten `[bitte ausfüllen]` steht.
- Eine Datei `CNAME` im Repo-Wurzelordner wird mitkopiert; bei Veröffentlichung per Actions zählt aber die Einstellung unter Settings > Pages > Custom domain.
- Ein Projekt-Repo erscheint unter `https://<benutzer>.github.io/fuckofffashion/`. `404.html` hat ein `<base href="/">`; `tools/veroeffentlichen.sh` setzt es in der Kopie auf `/<repo>/` (aus `GITHUB_REPOSITORY`), mit `CNAME` im Repo-Wurzelordner auf `/`.
- Einrichtung (Konto, Repo, Pages-Einstellung): `bash tools/github-einrichten.sh`.

## Platzhalter, die noch raus müssen

- Domain `fuckofffashion.example` auf dem Flyer: Kit mit echter Domain neu drucken (siehe oben).
- Mail-Adresse `hallo@fuckofffashion.example` im Knopf „Foto schicken“ (`index.html`, Sektion Mitmachen).
- Impressum und Datenschutz: alle Stellen mit `[bitte ausfüllen]`.

## Eingeschickten Druck an die Wand „Von euch“ hängen

Nur mit Freigabe aus der Mail. Foto verkleinern (`-1024.webp`, siehe oben), in `index.html` ein `<li class="join__slot">` durch ein Bild ersetzen.
