#!/usr/bin/env bash
# Kopiert die veröffentlichbaren Dateien (Allowlist) in einen Zielordner.
# Aufruf: tools/veroeffentlichen.sh <zielordner>
# Im GitHub-Workflow ist das Ziel ein frischer, leerer Ordner außerhalb des Repos, aus dem
# der Pages-Artefakt-Schritt die Seite hochlädt. Lokal darf es auch ein Ordner mit .git sein.
# Leert vorher den Zielordner (außer .git), damit gelöschte Dateien verschwinden.
# Eine Datei CNAME im Repo-Wurzelordner (eigene Domain) wird mitkopiert, wenn sie existiert.
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
for datei in index.html konzerte.html 404.html impressum.html datenschutz.html              data/konzerte.json data/karte.json data/orte-tabelle.json; do
  [ -f "$datei" ] || fehler "Quelle fehlt: $datei, Abbruch"
done
for ordner in css js assets; do
  [ -d "$ordner" ] || fehler "Quellordner fehlt: $ordner, Abbruch"
done

grep -q -F '<base href="/">' 404.html || fehler "404.html enthält kein <base href=\"/\">, Abbruch"

# Go-live-Schutz: Platzhalter in den Rechtstexten dürfen nicht veröffentlicht werden.
offen=$(grep -l -F '[bitte ausfüllen]' index.html konzerte.html 404.html impressum.html datenschutz.html || true)
[ -z "$offen" ] || fehler "Platzhalter [bitte ausfüllen] noch in: $(echo $offen), erst ausfüllen, Abbruch"

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
mkdir -p "$ziel/data"
for datei in konzerte.json karte.json orte-tabelle.json; do
  cp "data/$datei" "$ziel/data/$datei"
done
if [ -f CNAME ]; then
  cp CNAME "$ziel/CNAME"
fi

# 404.html liefert GitHub auch für verschachtelte Adressen aus (/a/b), darum nutzt die Datei
# <base href="/"> und Pfade ab dieser Basis. Nur die Kopie im Ziel wird angepasst, nie die Quelle:
#   CNAME im Repo-Wurzelordner (eigene Domain)  -> "/"
#   sonst GITHUB_REPOSITORY=besitzer/name        -> "/name/" (Projektseite; Repo "<x>.github.io" -> "/")
#   weder noch (lokal)                           -> "/"
basis="/"
if [ ! -f CNAME ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  repo=${GITHUB_REPOSITORY#*/}
  case "$repo" in
    ""|*[!A-Za-z0-9._-]*) fehler "GITHUB_REPOSITORY hat keinen brauchbaren Repo-Namen: $GITHUB_REPOSITORY, Abbruch" ;;
  esac
  case "$repo" in
    *.github.io) ;;
    *) basis="/$repo/" ;;
  esac
fi
sed "s|<base href=\"/\">|<base href=\"$basis\">|" "$ziel/404.html" > "$ziel/404.html.neu"
mv "$ziel/404.html.neu" "$ziel/404.html"

echo "Veröffentlicht nach $ziel (404.html-Basis: $basis)"
