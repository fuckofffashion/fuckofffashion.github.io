// Ordnungs-Logik der Bandseite, ohne DOM (Node-Tests: tests/js/bands.test.mjs).
// Eine Säule: Bands nach nächstem Termin, wer nicht spielt danach. Bald = nächster Termin 0–30 Tage entfernt.

const BALD_TAGE = 30;
const SICHTBAR = 4;

const zahl = (n) => String(n).padStart(2, "0");
const utc = (iso) => { const [j, m, t] = iso.split("-").map(Number); return Date.UTC(j, m - 1, t); };

/** Datum nach lokaler Zeit als YYYY-MM-DD (nicht toISOString: das wäre UTC). */
export function isoLokal(d) {
  return `${d.getFullYear()}-${zahl(d.getMonth() + 1)}-${zahl(d.getDate())}`;
}

/** Ganze Tage von heute bis zum Datum; über die Datumsteile in UTC, damit die Zeitumstellung nicht stört. */
export function tageBis(datumIso, heuteIso) {
  return Math.round((utc(datumIso) - utc(heuteIso)) / 864e5);
}

/** Nur Termine ab heute; Daten in falscher Form (kein Array, Einträge ohne Datum) zählen als keine. */
export function kuenftige(termine, heuteIso) {
  if (!Array.isArray(termine)) return [];
  return termine.filter((t) => typeof t?.datum === "string" && t.datum >= heuteIso);
}

/** Erster künftiger Termin oder null. */
export function naechster(termine, heuteIso) {
  return kuenftige(termine, heuteIso)[0] ?? null;
}

/** Spielt die Band in den nächsten 30 Tagen (Tag 30 zählt noch)? */
export function istBald(termine, heuteIso) {
  const n = naechster(termine, heuteIso);
  return !!n && tageBis(n.datum, heuteIso) <= BALD_TAGE;
}

/** ids nach nächstem Termin aufsteigend; ohne Termin danach, in Eingangsreihenfolge (stabil). */
export function ordne(ids, daten, heuteIso) {
  const erster = (id) => naechster(daten?.bands?.[id]?.termine, heuteIso)?.datum ?? null;
  return ids
    .map((id, i) => ({ id, i, d: erster(id) }))
    .sort((a, b) => (a.d && b.d ? a.d.localeCompare(b.d) || a.i - b.i : a.d ? -1 : b.d ? 1 : a.i - b.i))
    .map((x) => x.id);
}

export function sichtbare(termine, alle) {
  return alle ? termine : termine.slice(0, SICHTBAR);
}
