// Säulen-Logik der Bandseite, ohne DOM (Node-Tests: tests/js/bands.test.mjs).
// Säulen nach dem Abstand des nächsten Termins zu heute: bald 0–30 Tage, demnaechst 31–90, spaeter > 90, still = keiner.

export const SAEULEN = ["bald", "demnaechst", "spaeter", "still"];
const GRENZEN = { bald: [0, 30], demnaechst: [31, 90], spaeter: [91, null] };
const MONATE = {
  de: ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const SICHTBAR = 4;

const zahl = (n) => String(n).padStart(2, "0");
const utc = (iso) => { const [j, m, t] = iso.split("-").map(Number); return Date.UTC(j, m - 1, t); };
const plusTage = (iso, n) => new Date(utc(iso) + n * 864e5);

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

export function saeuleFuer(termine, heuteIso) {
  const naechster = kuenftige(termine, heuteIso)[0];
  if (!naechster) return "still";
  const tage = tageBis(naechster.datum, heuteIso);
  if (tage <= GRENZEN.bald[1]) return "bald";
  if (tage <= GRENZEN.demnaechst[1]) return "demnaechst";
  return "spaeter";
}

/** ids in Reihenfolge des HTML (alphabetisch); fehlende Bands oder fehlende Daten zählen als still. */
export function gruppiere(ids, daten, heuteIso) {
  const termineVon = (id) => kuenftige(daten?.bands?.[id]?.termine, heuteIso);
  const gruppen = Object.fromEntries(SAEULEN.map((s) => [s, []]));
  for (const id of ids) gruppen[saeuleFuer(termineVon(id), heuteIso)].push(id);
  for (const s of ["bald", "demnaechst", "spaeter"]) {
    gruppen[s].sort((a, b) => termineVon(a)[0].datum.localeCompare(termineVon(b)[0].datum));
  }
  return SAEULEN.filter((s) => gruppen[s].length).map((s) => ({ saeule: s, ids: gruppen[s] }));
}

/** Zeitraum der Säule als Monatsnamen, z. B. „Nov · Dez“; „ab Feb“ für später, leer für still. */
export function monatsSpanne(heuteIso, saeule, sp = "de") {
  const grenze = GRENZEN[saeule];
  if (!grenze) return "";
  const monat = (d) => MONATE[sp === "en" ? "en" : "de"][d.getUTCMonth()];
  const von = monat(plusTage(heuteIso, grenze[0]));
  if (grenze[1] === null) return `${sp === "en" ? "from" : "ab"} ${von}`;
  const bis = monat(plusTage(heuteIso, grenze[1]));
  return von === bis ? von : `${von} · ${bis}`;
}

export function sichtbare(termine, alle) {
  return alle ? termine : termine.slice(0, SICHTBAR);
}
