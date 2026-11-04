// Filter und Sortierung für Konzerttermine. Reine Funktionen ohne DOM.
import { km } from "./geo.js?v=16";

// Liefert neue Objekte mit `km` (Entfernung zur Mitte oder null).
// Die Eingabe bleibt unverändert. Fehlende Optionen heißen "kein Filter".
export function filtern(termine, { mitte, radiusKm, von, bis, genre, nurFrei, ohneKommerz, suche } = {}) {
  const ergebnis = [];
  const woerter = normalisiere(suche).split(" ").filter(Boolean);

  for (const termin of termine) {
    // Umkreis: ohne Koordinaten fliegt der Termin raus, wenn eine Mitte gesetzt ist
    let entfernung = null;
    if (mitte) {
      if (termin.lat == null || termin.lon == null) continue;
      entfernung = km(mitte, termin);
      if (radiusKm != null && entfernung > radiusKm) continue;
    }

    // Zeitraum, beide Grenzen inklusive. Datum ist "YYYY-MM-DD", der Vergleich als String reicht.
    if (von && termin.datum < von) continue;
    if (bis && termin.datum > bis) continue;

    if (genre != null && !(termin.genres ?? []).includes(genre)) continue;
    if (nurFrei && termin.frei !== true) continue;
    if (ohneKommerz && termin.kommerz === true) continue;

    // Textsuche: jedes Wort muss irgendwo in Band, Zusatz, Laden oder Stadt stehen
    if (woerter.length) {
      const text = suchtext(termin);
      if (!woerter.every((w) => text.includes(w))) continue;
    }

    ergebnis.push({ ...termin, km: entfernung });
  }

  return ergebnis;
}

// Für die Suche: klein, Umlaute als ae/oe/ue, ß als ss, übrige Akzente weg,
// Satzzeichen zu Leerzeichen. So findet „Ärzte“ auch „AERZTE“ und umgekehrt.
export function normalisiere(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Suchtext je Termin nur einmal bauen (über 7000 Termine, Suche läuft beim Tippen)
const SUCHTEXTE = new WeakMap();
function suchtext(termin) {
  let t = SUCHTEXTE.get(termin);
  if (t === undefined) {
    const bands = Array.isArray(termin.bands) ? termin.bands.join(" ") : termin.bands;
    t = " " + normalisiere([bands, termin.zusatz, termin.laden, termin.stadt].join(" ")) + " ";
    SUCHTEXTE.set(termin, t);
  }
  return t;
}

// Vergleich für Zeiten und Entfernungen: null kommt ans Ende
function nullLetzt(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// Sortiert eine Kopie der Liste. "datum": Datum, Zeit, Entfernung.
// "entfernung": Entfernung, dann Datum.
export function sortieren(liste, nach) {
  const nachDatum = (a, b) =>
    (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0) ||
    nullLetzt(a.zeit, b.zeit) ||
    nullLetzt(a.km, b.km);

  const nachEntfernung = (a, b) =>
    nullLetzt(a.km, b.km) ||
    (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);

  return [...liste].sort(nach === "entfernung" ? nachEntfernung : nachDatum);
}
