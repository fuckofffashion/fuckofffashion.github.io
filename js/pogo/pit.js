// Mechaniken aus Etappe 5 (reine Regeln, ohne three.js): Combo, Stimmung, Mitgrölen, Wall of Death,
// Circle Pit, Auf die Schultern, Aufheben. Tests: tests/js/pogo-pit.test.mjs. Werte siehe Spec „Etappe 5“.
import { ZUGABE, teilBei } from "./regeln.js?v=48";

/* ---------- Pogo-Combo ---------- */
export const COMBO = { proStufe: 4, max: 4, luecke: 2 };
export const comboStufe = (serie) => Math.min(COMBO.max, 1 + Math.floor(serie / COMBO.proStufe));
/** Mehr als `luecke` Schläge ohne Sprung brechen die Serie. */
export const comboLuecke = (combo, schlag) => combo.serie > 0 && combo.letzterSchlag != null && schlag - combo.letzterSchlag > COMBO.luecke;
/** Sprung im Takt auf Schlag `schlag`: Serie wächst (oder beginnt neu nach einer Lücke). */
export function comboTakt(combo, schlag) {
  const serie = comboLuecke(combo, schlag) ? 1 : combo.serie + 1;
  return { combo: { serie, letzterSchlag: schlag }, neueStufe: comboStufe(serie) > comboStufe(serie - 1) };
}

/* ---------- Stimmung ---------- */
export const STIMMUNG = {
  max: 100, abfall: 2, kochtDauer: 8, faktor: 1.5, nachKochen: 40, zugabeAb: 60, zugabeTreffer: 4,
  plus: { takt: 1, combo: 4, groelen: 10, aufheben: 15, wall: 15, schnoesel: 15, fascho: 20 },
};
export function mitStimmung(wert, plus) {
  const neu = Math.min(STIMMUNG.max, wert + plus);
  return { wert: neu, kocht: neu >= STIMMUNG.max };
}
export const stimmungAbfall = (wert, dt) => Math.max(0, wert - STIMMUNG.abfall * dt);
export const zugabeTreffer = (stimmung) => (stimmung >= STIMMUNG.zugabeAb ? STIMMUNG.zugabeTreffer : ZUGABE.treffer);

/* ---------- Mitgrölen ---------- */
/** Aktuelles Wort zum Mitgrölen oder null (nur in den Teilen aus `song.groelen.teile`). */
export function groelWort(t, song) {
  const g = song.groelen;
  if (!g || !g.teile.includes(teilBei(t, song.teile).name)) return null;
  const schlag = Math.round((t - song.start) / (60 / song.bpm)), n = g.worte.length;
  const index = ((schlag % n) + n) % n;
  return { schlag, index, wort: g.worte[index] };
}

/* ---------- Wall of Death ---------- */
export const WALL = { bonus: 400 };
/** Start nach „LOS!“: innerhalb eines Schlags perfekt; wer vorher über die Mitte lief, war zu früh. */
export function wallWertung({ losZeit, startZeit, zuFrueh, bpm }) {
  if (zuFrueh) return "zufrueh";
  if (startZeit == null) return "spaet";
  const d = startZeit - losZeit;
  return d >= 0 && d <= 60 / bpm ? "perfekt" : "spaet";
}

/* ---------- Circle Pit ---------- */
/** Erster wilder Teil des Songs, höchstens 10 s lang. */
export function kreisZeit(song) {
  const i = song.teile.findIndex((t) => t.kraft >= 1);
  const von = i > 0 ? song.teile[i - 1].bis : 0;
  return { von, bis: Math.min(von + 10, song.teile[i].bis) };
}
/** Einheitsvektor entlang des Kreises um (mx, mz); richtung +1 oder −1. */
export function kreisTangente(x, z, mx, mz, richtung) {
  const dx = x - mx, dz = z - mz, d = Math.hypot(dx, dz) || 1;
  return { x: (-dz / d) * richtung, z: (dx / d) * richtung };
}
/** Läuft man mit dem Strom, dagegen oder quer/zu langsam? */
export function stromWertung(vx, vz, tx, tz) {
  const v = Math.hypot(vx, vz);
  if (v < 0.8) return "neutral";
  const k = (vx * tx + vz * tz) / v;
  return k > 0.5 ? "mit" : k < -0.5 ? "gegen" : "neutral";
}

/* ---------- Auf die Schultern ---------- */
export const SCHULTERN = { dauer: 8, faktor: 2, drift: 1.6, instabil: 0.9, korrektur: 3, fallBier: 15, reichweite: 0.9 };
/** Wackeln: zufälliges Driften, kippt von selbst weiter; eingabe −1…1 hält dagegen. zufall in 0…1. */
export const wackle = (w, eingabe, dt, zufall) =>
  w + (zufall - 0.5) * 2 * SCHULTERN.drift * dt + w * SCHULTERN.instabil * dt - eingabe * SCHULTERN.korrektur * dt;
export const runtergefallen = (w) => Math.abs(w) > 1;

/* ---------- Wer fällt, wird aufgehoben ---------- */
export const AUFHEBEN = { max: 3, erstesNach: 8, alle: 12, wartet: 6, reichweite: 0.8, bonus: 150, bier: 10 };
