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

/** Ergebnis = Punkte × Bier; ein (fast) leerer Becher zählt wie BIER_MIN Prozent. */
export const BIER_MIN = 25;
export const ergebnis = (punkte, bier) => Math.round(punkte * Math.max(bier, BIER_MIN) / 100);

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

/** Stagedive: getragen werden bringt Punkte; wenige Hände greifen nach dem Becher, jede verpasste kostet wenig. */
export const STAGEDIVE = { dauer: 5, griffAlle: 1.5, griffFenster: 1.0, verlust: 10, punkteProSekunde: 60, bonus: 600, bonusAbBier: 50 };
/** Landebonus nur, wenn noch mindestens die Hälfte im Becher ist. */
export const stagediveBonus = (bier) => (bier >= STAGEDIVE.bonusAbBier ? STAGEDIVE.bonus : 0);
/** Wer im Pit länger als STILL_AB Sekunden weder läuft noch springt, bekommt nur halbe Punkte. */
export const STILL_AB = 2;
export const stillFaktor = (stillSekunden) => (stillSekunden > STILL_AB ? 0.5 : 1);
/** Landung mitten im Pit, nicht am Rand (dort würde sofort zurückgeschubst). */
export const landeZ = (laden) => (laden.gitterZ + laden.z[1]) / 2;
/** Höchster möglicher Bierverlust eines Stagedives in Prozent (alle Griffe verpasst). */
export const stagediveVerlustMax = () => Math.floor(STAGEDIVE.dauer / STAGEDIVE.griffAlle) * STAGEDIVE.verlust;

/** Steht ich direkt hinter p (von der Bühne aus gesehen), höchstens 1 m dahinter und ±0,6 m seitlich? */
export function istHinter(ich, p) {
  const dz = ich.z - p.z;
  return dz > 0 && dz <= 1 && Math.abs(ich.x - p.x) <= 0.6;
}
export const ABGUCKEN_S = 3;
export const ZUGABE = { fenster: 5, treffer: 6, dauer: 15, faktor: 1.5 };
/** Wann die Schurken kommen: Schnösel nach dem ersten Refrain, Fascho bei 40 % des Songs. */
export function schurkenZeiten(song) {
  const refrain = song.teile.findIndex((t) => t.kraft >= 1);
  return { schnoesel: song.teile[refrain].bis, fascho: Math.round(song.ende * 0.4 * 10) / 10 };
}
Object.assign(BONUS, { abgeguckt: 200, schnoesel: 300, fascho: 200 });

/** Zugabe: ab Beginn des letzten Refrains ZUGABE.dauer Sekunden; mit Songdatei höchstens bis Songende. */
export function zugabeZeiten(song) {
  const start = song.teile.at(-2).bis, ende = start + ZUGABE.dauer;
  return { start, ende: song.datei ? Math.min(song.ende, ende) : ende };
}
/** Erster Rasterschlag ab einer Songzeit (für den Start mitten im Song). */
export function rasterAb(versatz, schritt) {
  const k = Math.max(0, Math.ceil(versatz / schritt - 1e-9));
  return { k, zeit: k * schritt };
}
/** Tipp im Zugabe-Ruf: "treffer" (neuer Schlag im Takt), "schon" (dieser Schlag zählt schon), "daneben". */
export function rufTipp(t, bpm, gezaehlt) {
  if (!imTakt(t, bpm, 0)) return "daneben";
  const schlag = Math.round(t / (60 / bpm));
  if (gezaehlt.has(schlag)) return "schon";
  gezaehlt.add(schlag); return "treffer";
}
