#!/usr/bin/env bash
# Kopiert die veröffentlichbaren Dateien in einen Klon des Pages-Repos.
# Aufruf: tools/veroeffentlichen.sh <zielordner>
# Leert vorher den Zielordner (außer .git und .domains), damit gelöschte Dateien verschwinden.
set -eu

fehler() { echo "veroeffentlichen.sh: $*" >&2; exit 1; }

[ $# -eq 1 ] && [ -n "$1" ] || fehler "Aufruf: $0 <zielordner>"
[ -d "$1" ] || fehler "Zielordner existiert nicht: $1"
ziel=$(cd "$1" && pwd -P)

# Immer vom Repo-Wurzelordner aus arbeiten, egal von wo aufgerufen.
cd "$(dirname "$0")/.."
wurzel=$(pwd -P)

[ "$ziel" != "$wurzel" ] || fehler "Ziel ist das eigene Repo ($wurzel), Abbruch"
case "$wurzel/" in "$ziel"/*) fehler "Ziel enthält das eigene Repo, Abbruch" ;; esac
case "$ziel/" in "$wurzel"/*) fehler "Ziel liegt im eigenen Repo, Abbruch" ;; esac

# Ohne .git darf das Ziel nur leer sein (Schutz vor dem Leeren falscher Ordner).
if [ ! -e "$ziel/.git" ] && [ -n "$(ls -A "$ziel")" ]; then
  fehler "Ziel $ziel hat kein .git, ist aber nicht leer, Abbruch"
fi

find "$ziel" -mindepth 1 -maxdepth 1 ! -name .git ! -name .domains -exec rm -rf {} +

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
if [ -f .domains ]; then
  cp .domains "$ziel/.domains"
fi

echo "Veröffentlicht nach $ziel"
