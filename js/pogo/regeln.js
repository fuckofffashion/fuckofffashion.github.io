// Spielregeln von Pogo, ohne three.js und DOM (Node-Tests: tests/js/pogo-regeln.test.mjs).

export const BPM = 176;
export const VIERTEL = 60 / BPM;
export const DAUER = 60;

/** Songablauf; der Pit folgt der Kraft des Teils. */
export const TEILE = [
  { bis: 6, name: "INTRO", kraft: 0.25 },
  { bis: 20, name: "STROPHE", kraft: 0.6 },
  { bis: 30, name: "REFRAIN!", kraft: 1.0, kreis: true },
  { bis: 36, name: "BREAK", kraft: 0.18 },
  { bis: 48, name: "STROPHE", kraft: 0.65 },
  { bis: 60, name: "LETZTER REFRAIN", kraft: 1.15, kreis: true },
];
export const teilBei = (t, teile = TEILE) => teile.find((x) => t < x.bis) || teile[teile.length - 1];

const RAND_BREITE = 0.9, REIHE_TIEFE = 0.9, MITTE_RADIUS = 1.6;

/** Zone einer Position im Laden: rand (keine Punkte), reihe (am Gitter), mitte, pit. */
export function zone(x, z, laden) {
  if (Math.abs(x) > laden.x - RAND_BREITE || z > laden.z[1] - RAND_BREITE) return "rand";
  if (z < laden.gitterZ + REIHE_TIEFE) return "reihe";
  const mz = (laden.gitterZ + laden.z[1]) / 2;
  if (Math.hypot(x, z - mz) < MITTE_RADIUS) return "mitte";
  return "pit";
}

const GRUNDPUNKTE = { rand: 0, pit: 10, mitte: 20, reihe: 20 };
/** Pogo-Punkte pro Sekunde; wilde Teile zählen 1,5-fach, nass vom Ordner halb. */
export function punkteProSekunde(z, teil, ordnerNass) {
  let p = GRUNDPUNKTE[z] ?? 0;
  if (teil.kraft >= 1) p *= 1.5;
  if (ordnerNass) p *= 0.5;
  return p;
}

/** Liegt der Zeitpunkt (Sekunden seit Songbeginn) höchstens 80 ms neben einem Viertel? start = erster Schlag. */
export function imTakt(t, bpm = BPM, start = 0) {
  const v = 60 / bpm, rest = (((t - start) % v) + v) % v;
  return Math.min(rest, v - rest) <= 0.08;
}

export const SPRUNG = { bonus: 15, daneben: 3 };
export const GEDRAENGE = 1.5;
export const STAGEDIVE_AB = 4;
export const BONUS = { duDa: 150, plektrum: 100, drumstick: 150, setliste: 300, oi: 40, stagedive: 600 };

/** Verschüttetes Bier in Prozent für einen Rempler mit Aufprallgeschwindigkeit `schlag` (m/s). */
export function verschuettet(schlag, { rucksack = false, inLuft = false } = {}) {
  if (inLuft) return 0;
  const s = schlag * (rucksack ? 1.6 : 1);
  if (s <= 1.6) return 0;
  return Math.min(14, (s - 1.6) * 4.5);
}

export const ergebnis = (punkte, bier) => Math.round(punkte * bier / 100);

/** Titel im Endbild aus Pogo-Punkten und Bier. */
export function titelSchluessel(punkte, bier) {
  if (bier <= 0) return "leer";
  if (punkte < 300) return "randSteher";
  if (bier < 20) return "legendaer";
  if (punkte >= 1500) return "koenig";
  if (bier >= 50) return "solide";
  return "nass";
}

/** Was eine Berührung war: weit bewegt = ziehen, kurz und still = tippen, lang und still = nichts. */
export function geste(dauerMs, wegPx) {
  if (wegPx >= 12) return "ziehen";
  if (dauerMs <= 250) return "tippen";
  return null;
}

/** Wertung eines Sprungs: im Takt Bonus (nicht am Rand, sonst lohnt Hinten-Stehen), daneben schwappt Bier. */
export function sprungWertung(z, imTaktGesprungen) {
  if (!imTaktGesprungen) return { punkte: 0, bier: SPRUNG.daneben };
  return { punkte: z === "rand" ? 0 : SPRUNG.bonus, bier: 0 };
}

/** Songzeit aus der Audiouhr: Sekunden seit Songbeginn minus Ausgabelatenz, nie negativ. */
export const songZeit = (audioZeit, start, latenz = 0) => Math.max(0, audioZeit - start - latenz);
