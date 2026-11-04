// Ortssuche im Browser: sucht in der lokalen Ortstabelle data/orte-tabelle.json.
// Kein Netz, keine Abhängigkeiten, keine DOM-Zugriffe.
// normalisiere() spiegelt die Python-Funktion normalisiere() in tools/konzerte/ortstabelle.py.

// Vorbereiteter Index je Tabellenobjekt, damit die Namen nicht bei jedem Tastendruck neu normalisiert werden.
const indexCache = new WeakMap();

// Klein, ohne Akzente, ß -> ss, Bindestriche/Unterstriche/Leerzeichen gleich.
export function normalisiere(text) {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

function indexVon(tabelle) {
  let index = indexCache.get(tabelle);
  if (!index) {
    index = tabelle.orte.map(([land, plz, name, lat, lon, einw]) => ({
      land,
      plz,
      name,
      lat,
      lon,
      einw: einw || 0,
      nname: normalisiere(name),
    }));
    indexCache.set(tabelle, index);
  }
  return index;
}

// Je Name+Land nur ein Treffer: der mit den meisten Einwohnern, bei Gleichstand der erste.
function eindeutig(treffer) {
  const beste = new Map();
  for (const o of treffer) {
    const schluessel = `${o.nname}|${o.land}`;
    const vorhanden = beste.get(schluessel);
    if (!vorhanden || o.einw > vorhanden.einw) beste.set(schluessel, o);
  }
  return [...beste.values()];
}

function vergleiche(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function suche(index, filter, sortierung, max) {
  return eindeutig(index.filter(filter))
    .sort(sortierung)
    .slice(0, max)
    .map(({ land, plz, name, lat, lon }) => ({ land, plz, name, lat, lon }));
}

// Namenssuche: exakter Treffer zuerst, dann Einwohner absteigend, dann Name.
function namenSuche(index, eingabe, max, plzPraefix) {
  const q = normalisiere(eingabe);
  if (!q) return [];
  return suche(
    index,
    (o) => o.nname.startsWith(q) && (!plzPraefix || o.plz.startsWith(plzPraefix)),
    (a, b) =>
      (a.nname === q ? 0 : 1) - (b.nname === q ? 0 : 1) ||
      b.einw - a.einw ||
      vergleiche(a.name, b.name),
    max,
  );
}

// PLZ-Suche: Präfix der Postleitzahl, aufsteigend nach PLZ.
function plzSuche(index, praefix, max) {
  return suche(
    index,
    (o) => o.plz.startsWith(praefix),
    (a, b) => vergleiche(a.plz, b.plz) || vergleiche(a.name, b.name),
    max,
  );
}

// Eingabe aus Ziffern: PLZ-Präfix. Eingabe mit Buchstaben: Namens-Präfix.
// "47533 Kleve": Buchstaben suchen den Namen, Ziffern filtern die PLZ.
export function sucheOrt(tabelle, eingabe, max = 8) {
  const text = String(eingabe ?? "").trim();
  if (!text || !tabelle || !Array.isArray(tabelle.orte)) return [];
  const index = indexVon(tabelle);

  if (/^\d+$/.test(text)) return plzSuche(index, text, max);

  const gemischt = text.match(/^(\d+)\s+(.*\p{L}.*)$/u);
  if (gemischt) return namenSuche(index, gemischt[2], max, gemischt[1]);

  if (/\p{L}/u.test(text)) return namenSuche(index, text, max, "");

  return [];
}
