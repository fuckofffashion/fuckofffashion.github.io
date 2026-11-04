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

## Verbreiten-Kit neu drucken

Nach Änderungen an `kit/sticker.html`, `kit/flyer.html` oder `kit/kit.css`:
`python tools/build-kit.py deine-domain.de`
Die Domain landet als Text und QR-Code auf dem Flyer. Braucht Chrome, PyMuPDF, segno und Pillow.
Danach Dateigrößen in `index.html` (Sektion Mitmachen) prüfen.

## Platzhalter, die noch raus müssen

- Domain `fuckofffashion.example` auf dem Flyer: Kit mit echter Domain neu drucken (siehe oben).
- Mail-Adresse `hallo@fuckofffashion.example` im Knopf „Foto schicken“ (`index.html`, Sektion Mitmachen).
- Impressum und Datenschutz: alle Stellen mit `[bitte ausfüllen]`.

## Eingeschickten Druck an die Wand „Von euch“ hängen

Nur mit Freigabe aus der Mail. Foto verkleinern (`-1024.webp`, siehe oben), in `index.html` ein `<li class="join__slot">` durch ein Bild ersetzen.
