// Songs für Pogo. Jeder Song braucht einen Freigabe-Eintrag (Test in tests/js/pogo-regeln.test.mjs).
// Zeiten in Sekunden ab Dateibeginn; start = erster Schlag (für „im Takt“).
import { TEILE, BPM, DAUER } from "./regeln.js?v=46";

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
    // Mitgrölen: nur die Worte des Titels, je Schlag eines (Etappe 5)
    groelen: { worte: ["ES", "GEHT", "NOCH", "LAUTER!"], teile: ["REFRAIN!", "LETZTER REFRAIN"] },
    freigabe: { durch: "Dan Ganove", ueber: "Mark", datum: "2026-11-21", art: "mündlich, Datei von Mark geliefert" },
    // GEMA (Repertoiresuche 2026-11-21): Dan Ganove ist Mitglied, Werk 28404850-001 und 28349843-001, ISWC T-305.133.841-7.
    // Offen: ob Dans mündliches OK für die Website reicht; Mark klärt das mit Dan (Stand 2026-11-21).
    gema: { werknummern: ["28404850-001", "28349843-001"], iswc: "T-305.133.841-7", klaerung: "offen" },
    // Outro nach der Runde: Dan spricht live (5,5 s), von Mark geliefert
    outro: { datei: "assets/audio/dan-ganove-outro.mp3" },
  },
];

/** Song-Id aus der Adresse (?song=…), nur wenn es den Song gibt; sonst null. */
export function songAusAdresse(suche) {
  const id = new URLSearchParams(suche).get("song");
  return id && SONGS.some((s) => s.id === id) ? id : null;
}
