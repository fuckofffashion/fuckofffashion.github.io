#!/usr/bin/env bash
# Kopiert die veröffentlichbaren Dateien (Allowlist) in einen Zielordner.
# Aufruf: tools/veroeffentlichen.sh <zielordner>
# Im GitHub-Workflow ist das Ziel ein frischer, leerer Ordner außerhalb des Repos, aus dem
# der Pages-Artefakt-Schritt die Seite hochlädt. Lokal darf es auch ein Ordner mit .git sein.
# Leert vorher den Zielordner (außer .git), damit gelöschte Dateien verschwinden.
# Eine Datei CNAME im Repo-Wurzelordner (eigene Domain) wird mitkopiert, wenn sie existiert.
# Bricht ab, solange [bitte ausfüllen] oder die Platzhalter-Adresse fuckofffashion.example in ausgelieferten Seiten steht.
set -eu

fehler() { echo "veroeffentlichen.sh: $*" >&2; exit 1; }

[ $# -eq 1 ] && [ -n "$1" ] || fehler "Aufruf: $0 <zielordner>"
[ -d "$1" ] || fehler "Zielordner existiert nicht: $1"
ziel=$(CDPATH= cd -- "$1" && pwd -P)

# Immer vom Repo-Wurzelordner aus arbeiten, egal von wo aufgerufen.
cd -- "$(dirname -- "$0")/.."
wurzel=$(CDPATH= cd -- . && pwd -P)

[ "$ziel" != "$wurzel" ] || fehler "Ziel ist das eigene Repo ($wurzel), Abbruch"
case "$wurzel/" in "$ziel"/*) fehler "Ziel enthält das eigene Repo, Abbruch" ;; esac
case "$ziel/" in "$wurzel"/*) fehler "Ziel liegt im eigenen Repo, Abbruch" ;; esac

# Erst prüfen, dass alle Quellen da sind, dann erst das Ziel leeren.
for datei in index.html konzerte.html 404.html impressum.html datenschutz.html en/index.html en/konzerte.html \
             data/konzerte.json data/karte.json data/orte-tabelle.json; do
  [ -f "$datei" ] || fehler "Quelle fehlt: $datei, Abbruch"
done
for ordner in css js assets; do
  [ -d "$ordner" ] || fehler "Quellordner fehlt: $ordner, Abbruch"
done

grep -q -F '<base href="/">' 404.html || fehler "404.html enthält kein <base href=\"/\">, Abbruch"

# Go-live-Schutz: Platzhalter in den Rechtstexten dürfen nicht veröffentlicht werden.
offen=$(grep -l -F '[bitte ausfüllen]' index.html konzerte.html 404.html impressum.html datenschutz.html en/*.html || true)
[ -z "$offen" ] || fehler "Platzhalter [bitte ausfüllen] noch in: $(echo $offen), erst ausfüllen, Abbruch"

# Zweiter Go-live-Schutz: Platzhalter-Domain bzw. -Mail-Adresse in ausgelieferten Seiten.
offen=$(grep -l -F 'fuckofffashion.example' index.html konzerte.html 404.html impressum.html datenschutz.html en/*.html || true)
[ -z "$offen" ] || fehler "Kontaktadresse fehlt noch: Platzhalter fuckofffashion.example steht noch in: $(echo $offen), erst ersetzen, Abbruch"

# Basis der 404.html. GitHub liefert 404.html auch für verschachtelte Adressen aus (/a/b), darum nutzt
# die Datei <base href="/"> und Pfade ab dieser Basis. Nur die Kopie im Ziel wird angepasst, nie die Quelle.
# Reihenfolge (alles vor dem Leeren des Ziels, damit ein Fehler nichts zerstört):
#   1. PAGES_BASE_PATH gesetzt (im Workflow aus actions/configure-pages, "" oder "/name") -> "/" bzw. "/name/"
#   2. CNAME im Repo-Wurzelordner (eigene Domain)                                         -> "/"
#   3. GITHUB_REPOSITORY=besitzer/name: Repo "<besitzer>.github.io" (Groß/Klein egal)     -> "/"
#                                       jedes andere Repo (Projektseite)                  -> "/name/"
#   4. nichts davon (lokaler Lauf)                                                        -> "/"
basis="/"
if [ -n "${PAGES_BASE_PATH+x}" ]; then
  pfad=${PAGES_BASE_PATH#/}; pfad=${pfad%/}
  case "$pfad" in
    *[!A-Za-z0-9._/-]*) fehler "PAGES_BASE_PATH enthält unzulässige Zeichen: $PAGES_BASE_PATH, Abbruch" ;;
  esac
  [ -z "$pfad" ] || basis="/$pfad/"
elif [ ! -f CNAME ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  besitzer=${GITHUB_REPOSITORY%%/*}
  repo=${GITHUB_REPOSITORY#*/}
  case "$besitzer$repo" in
    ""|*[!A-Za-z0-9._-]*) fehler "GITHUB_REPOSITORY hat keinen brauchbaren Namen: $GITHUB_REPOSITORY, Abbruch" ;;
  esac
  [ -n "$besitzer" ] && [ -n "$repo" ] && [ "$besitzer" != "$GITHUB_REPOSITORY" ] || fehler "GITHUB_REPOSITORY hat nicht die Form besitzer/name: $GITHUB_REPOSITORY, Abbruch"
  klein_repo=$(printf '%s' "$repo" | tr 'A-Z' 'a-z')
  klein_site=$(printf '%s.github.io' "$besitzer" | tr 'A-Z' 'a-z')
  [ "$klein_repo" = "$klein_site" ] || basis="/$repo/"
fi

# Ohne .git darf das Ziel nur leer sein (Schutz vor dem Leeren falscher Ordner).
if [ ! -e "$ziel/.git" ] && [ -n "$(ls -A "$ziel")" ]; then
  fehler "Ziel $ziel hat kein .git, ist aber nicht leer, Abbruch"
fi

find "$ziel" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

for datei in index.html konzerte.html 404.html impressum.html datenschutz.html; do
  cp "$datei" "$ziel/$datei"
done
for ordner in css js assets; do
  cp -R "$ordner" "$ziel/$ordner"
done
# Englische Fassung (Impressum und Datenschutz gibt es nur auf Deutsch)
mkdir -p "$ziel/en"
for datei in index.html konzerte.html; do
  cp "en/$datei" "$ziel/en/$datei"
done
mkdir -p "$ziel/data"
for datei in konzerte.json karte.json orte-tabelle.json; do
  cp "data/$datei" "$ziel/data/$datei"
done
if [ -f CNAME ]; then
  cp CNAME "$ziel/CNAME"
fi

# 404.html: Basis in der Kopie setzen (Wert wurde oben berechnet, siehe "Basis der 404.html").
sed "s|<base href=\"/\">|<base href=\"$basis\">|" "$ziel/404.html" > "$ziel/404.html.neu"
mv "$ziel/404.html.neu" "$ziel/404.html"

echo "Veröffentlicht nach $ziel (404.html-Basis: $basis)"
