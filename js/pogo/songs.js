// Songs für Pogo. Jeder Song braucht einen Freigabe-Eintrag (Test in tests/js/pogo-regeln.test.mjs).
// Zeiten in Sekunden ab Dateibeginn; start = erster Schlag (für „im Takt“).
import { TEILE, BPM, DAUER } from "./regeln.js?v=31";

/** Eigener Beat aus dem Browser (Ersatz, wenn kein Song gewählt ist oder die Datei nicht lädt). */
export const BEAT = {
  id: "beat", band: null, titel: null, datei: null, bpm: BPM, start: 0, ende: DAUER, teile: TEILE,
  mikro: [44, 48], wuerfe: { plektrum: 24, drumstick: 56, setliste: 52 }, wall: [31, 36],
};

export const SONGS = [
  {
    id: "dan-ganove-lauter", band: "dan-ganove", bandName: "Dan Ganove", titel: "Es geht noch lauter",
    datei: "assets/audio/dan-ganove-es-geht-noch-lauter.mp3",
    bpm: 135.94, start: 1.513, ende: 58,
    teile: [
      { bis: 7, name: "INTRO", kraft: 0.25 },
      { bis: 22, name: "STROPHE", kraft: 0.6 },
      { bis: 30, name: "REFRAIN!", kraft: 1.0, kreis: true },
      { bis: 37, name: "STROPHE", kraft: 0.65 },
      { bis: 40, name: "BREAK", kraft: 0.18 },
      { bis: 43, name: "AUFBAU", kraft: 0.8 },
      { bis: 58, name: "LETZTER REFRAIN", kraft: 1.15, kreis: true },
    ],
    mikro: [50, 54], wuerfe: { plektrum: 26, drumstick: 55, setliste: 52 }, wall: [37, 40],
    freigabe: { durch: "Dan Ganove", ueber: "Mark", datum: "2026-11-21", art: "mündlich, Datei von Mark geliefert" },
  },
];
