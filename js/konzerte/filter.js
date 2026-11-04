// Filter und Sortierung für Konzerttermine. Reine Funktionen ohne DOM.
import { km } from "./geo.js?v=16";

// Liefert neue Objekte mit `km` (Entfernung zur Mitte oder null).
// Die Eingabe bleibt unverändert. Fehlende Optionen heißen "kein Filter".
export function filtern(termine, { mitte, radiusKm, von, bis, genre, nurFrei, ohneKommerz } = {}) {
  const ergebnis = [];

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

    ergebnis.push({ ...termin, km: entfernung });
  }

  return ergebnis;
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
