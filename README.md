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
| `styleguide.html` | Vorschau des Design-Systems (nicht verlinkt, `noindex`) |

## Neues Motiv an die Wand hängen

1. Bild nach `assets/img/` legen (PNG in voller Auflösung zum Download).
2. Vorschau als WebP erzeugen:
   `ffmpeg -i motiv.png -vf scale=1024:-1 -c:v libwebp -quality 80 motiv-1024.webp`
3. In `index.html` einen Platzhalter `<figure class="poster poster--empty …">` durch eine Kopie von Motiv Nr. 001 ersetzen und Bild, Download-Link, Titel und Nummer anpassen.
   Die Schräglage ergibt sich automatisch aus der Position (4er-Rhythmus in `css/site.css`).

## Nach Änderungen an CSS/JS

Den Versionsparameter in allen HTML-Dateien hochzählen (`?v=3` → `?v=4`), sonst zeigen Browser die alte Datei aus dem Cache.
