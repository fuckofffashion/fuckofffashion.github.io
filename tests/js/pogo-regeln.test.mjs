// Tests für die Spielregeln von Pogo (js/pogo/regeln.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BPM, VIERTEL, DAUER, TEILE, teilBei, zone, punkteProSekunde, imTakt, verschuettet,
  ergebnis, titelSchluessel, geste, STAGEDIVE_AB, BONUS, GEDRAENGE, SPRUNG,
} from "../../js/pogo/regeln.js";

const L = { x: 3.3, z: [-4.2, 4.2], gitterZ: -3.6 };

test("Songablauf: 60 s, Teile und Kraft", () => {
  assert.equal(BPM, 176); assert.equal(DAUER, 60);
  assert.ok(Math.abs(VIERTEL - 60 / 176) < 1e-12);
  assert.equal(TEILE.at(-1).bis, 60);
  assert.equal(teilBei(25).name, "REFRAIN!");
  assert.equal(teilBei(59.9).kraft, 1.15);
  assert.equal(teilBei(70).name, "LETZTER REFRAIN");
});

test("Zonen: Rand, Reihe, Mitte, Pit", () => {
  assert.equal(zone(3.0, 0, L), "rand");
  assert.equal(zone(0, 4.0, L), "rand");
  assert.equal(zone(0, -3.2, L), "reihe");
  assert.equal(zone(0, 0.3, L), "mitte");
  assert.equal(zone(1.8, 2.5, L), "pit");
});

test("Punkte pro Sekunde: Rand nichts, Refrain mehr, Ordner halbiert", () => {
  assert.equal(punkteProSekunde("rand", teilBei(25), false), 0);
  assert.equal(punkteProSekunde("pit", teilBei(10), false), 10);
  assert.equal(punkteProSekunde("mitte", teilBei(25), false), 30);
  assert.equal(punkteProSekunde("reihe", teilBei(10), true), 10);
});

test("imTakt: 80 ms um die Viertel", () => {
  assert.equal(imTakt(VIERTEL * 7 + 0.05), true);
  assert.equal(imTakt(VIERTEL * 7 - 0.05), true);
  assert.equal(imTakt(VIERTEL * 7 + 0.15), false);
});

test("verschuettet: in der Luft nichts, Schwelle, Deckel, Rucksack", () => {
  assert.equal(verschuettet(3, { inLuft: true }), 0);
  assert.equal(verschuettet(1.5, {}), 0);
  assert.ok(Math.abs(verschuettet(3, {}) - 3.15) < 1e-9); // halbiert nach Spieletest 2
  assert.equal(verschuettet(10, {}), 7);
  assert.ok(verschuettet(1.2, { rucksack: true }) > 0);
});

test("Ergebnis und Titel", () => {
  assert.equal(ergebnis(1000, 50), 500);
  // leerer oder fast leerer Becher zählt wie 25 % Bier (Mark, nach dem ersten Spieletest)
  assert.equal(ergebnis(1000, 0), 250);
  assert.equal(ergebnis(1000, 10), 250);
  assert.equal(ergebnis(1000, 25), 250);
  assert.equal(ergebnis(1000, 26), 260);
  assert.equal(titelSchluessel(2000, 0), "leer");
  assert.equal(titelSchluessel(100, 90), "randSteher");
  assert.equal(titelSchluessel(900, 10), "legendaer");
  assert.equal(titelSchluessel(1600, 55), "koenig");
  assert.equal(titelSchluessel(800, 60), "solide");
  assert.equal(titelSchluessel(800, 30), "nass");
});

test("geste: kurz tippen springt, ziehen läuft, langes Halten nichts", () => {
  assert.equal(geste(120, 3), "tippen");
  assert.equal(geste(120, 20), "ziehen");
  assert.equal(geste(600, 4), null);
  assert.equal(geste(600, 30), "ziehen");
});

test("Konstanten", () => {
  assert.equal(STAGEDIVE_AB, 4);
  assert.equal(GEDRAENGE, 0.75);
  assert.deepEqual(SPRUNG, { bonus: 15, daneben: 3 });
  assert.deepEqual(BONUS, { duDa: 150, plektrum: 100, drumstick: 150, setliste: 300, oi: 150, stagedive: 600, abgeguckt: 200, schnoesel: 300, fascho: 200 });
});

test("Pogo-Texte: DE und EN gleich aufgebaut, alle Titel da", async () => {
  const { TEXTE } = await import("../../js/pogo/texte.js");
  assert.deepEqual(Object.keys(TEXTE.en).sort(), Object.keys(TEXTE.de).sort());
  for (const k of Object.keys(TEXTE.de)) assert.equal(typeof TEXTE.en[k], typeof TEXTE.de[k], k);
  for (const sp of ["de", "en"]) for (const k of ["leer", "randSteher", "legendaer", "koenig", "solide", "nass"]) {
    assert.equal(typeof TEXTE[sp].titel[k], "string", `${sp} ${k}`);
  }
  assert.equal(TEXTE.de.randSchubs, "Was stehst du hier rum?");
  assert.deepEqual(Object.keys(TEXTE.en.laeden).sort(), ["altenberg", "druckluftDraussen", "druckluftInnen", "pitcher"]);
  assert.deepEqual(Object.keys(TEXTE.de.laeden).sort(), ["altenberg", "druckluftDraussen", "druckluftInnen", "pitcher"]);
});

test("Läden: Gitter vor dem Pit, Mitte liegt in der Mitte", async () => {
  const { LAEDEN } = await import("../../js/pogo/laeden.js");
  assert.deepEqual(Object.keys(LAEDEN).sort(), ["altenberg", "druckluftDraussen", "druckluftInnen", "pitcher"]);
  assert.deepEqual(Object.entries(LAEDEN).filter(([, l]) => l.draussen).map(([id]) => id), ["druckluftDraussen"]);
  assert.equal(LAEDEN.pitcher.surfer, false); assert.equal(LAEDEN.altenberg.wall, true);
  for (const l of Object.values(LAEDEN)) assert.ok(Array.isArray(l.deko) && l.deko.length, "deko");
  for (const [id, l] of Object.entries(LAEDEN)) {
    assert.ok(l.gitterZ > l.z[0], id);
    assert.equal(zone(0, (l.gitterZ + l.z[1]) / 2, l), "mitte", id);
  }
});

test("sprungWertung: Takt-Bonus nur außerhalb vom Rand, daneben kostet Bier", async () => {
  const { sprungWertung } = await import("../../js/pogo/regeln.js");
  assert.deepEqual(sprungWertung("pit", true), { punkte: 15, bier: 0 });
  assert.deepEqual(sprungWertung("rand", true), { punkte: 0, bier: 0 });
  assert.deepEqual(sprungWertung("rand", false), { punkte: 0, bier: 3 });
  assert.deepEqual(sprungWertung("reihe", false), { punkte: 0, bier: 3 });
});

test("songZeit: Spielzeit folgt der Audiouhr samt Latenz, nie negativ", async () => {
  const { songZeit } = await import("../../js/pogo/regeln.js");
  assert.ok(Math.abs(songZeit(12.5, 2.0, 0.03) - 10.47) < 1e-9);
  assert.equal(songZeit(1.0, 2.0, 0.03), 0);
});

test("Songs: Teile aufsteigend, Ende passt, Datei da, Freigabe eingetragen", async () => {
  const { SONGS, BEAT } = await import("../../js/pogo/songs.js");
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const wurzel = fileURLToPath(new URL("../../", import.meta.url));
  for (const s of [BEAT, ...SONGS]) {
    for (let i = 1; i < s.teile.length; i++) assert.ok(s.teile[i].bis > s.teile[i - 1].bis, s.id);
    assert.equal(s.teile.at(-1).bis, s.ende, s.id);
    assert.ok(s.mikro[0] < s.mikro[1] && s.mikro[1] <= s.ende, s.id);
    for (const t of Object.values(s.wuerfe)) assert.ok(t > 0 && t < s.ende, s.id);
  }
  for (const s of SONGS) {
    assert.ok(existsSync(wurzel + s.datei), s.datei);
    assert.ok(s.freigabe?.durch && s.freigabe?.datum, `Freigabe fehlt: ${s.id}`);
  }
  const dan = SONGS.find((s) => s.id === "dan-ganove-lauter");
  assert.equal(dan.band, "dan-ganove"); assert.equal(dan.bpm, 135.94); assert.equal(dan.start, 1.513); assert.equal(dan.ende, 58);
});

test("teilBei und imTakt arbeiten mit Songdaten", async () => {
  const { SONGS } = await import("../../js/pogo/songs.js");
  const dan = SONGS[0];
  assert.equal(teilBei(25, dan.teile).name, "REFRAIN!");
  assert.equal(teilBei(38, dan.teile).name, "BREAK");
  assert.equal(teilBei(41, dan.teile).name, "AUFBAU");
  const viertel = 60 / dan.bpm;
  assert.equal(imTakt(dan.start + viertel * 10 + 0.05, dan.bpm, dan.start), true);
  assert.equal(imTakt(dan.start + viertel * 10 + 0.2, dan.bpm, dan.start), false);
  assert.equal(imTakt(VIERTEL * 7 + 0.05), true); // Standard: eigener Beat
});

test("Stagedive lohnt sich: wenige Griffe, kleiner Verlust, Punkte beim Tragen, Landung in der Mitte", async () => {
  const { STAGEDIVE, landeZ, stagediveVerlustMax } = await import("../../js/pogo/regeln.js");
  assert.deepEqual(STAGEDIVE, { dauer: 5, griffAlle: 1.5, griffFenster: 1.0, verlust: 10, punkteProSekunde: 60, bonus: 600, bonusAbBier: 50 });
  const L2 = { x: 3.3, z: [-4.2, 4.2], gitterZ: -3.6 };
  assert.equal(zone(0, landeZ(L2), L2), "mitte");
  // schlimmster Fall: alle Griffe verpasst – 30 % Bier weg; Abwehren lohnt sich jetzt
  assert.equal(stagediveVerlustMax(), 30);
  assert.ok(STAGEDIVE.punkteProSekunde * STAGEDIVE.dauer + STAGEDIVE.bonus >= 900);
});

test("Stagedive-Bonus nur mit mindestens halbem Becher", async () => {
  const { stagediveBonus } = await import("../../js/pogo/regeln.js");
  assert.equal(stagediveBonus(100, 0, 0), 600);
  assert.equal(stagediveBonus(50, 0, 0), 600);
  assert.equal(stagediveBonus(49.9, 0, 0), 0);
  assert.equal(stagediveBonus(0, 0, 0), 0);
});

test("Stillstehen: nach 2 s nur noch halbe Punkte", async () => {
  const { stillFaktor, STILL_AB } = await import("../../js/pogo/regeln.js");
  assert.equal(STILL_AB, 2);
  assert.equal(stillFaktor(0), 1);
  assert.equal(stillFaktor(2), 1);
  assert.equal(stillFaktor(2.01), 0.5);
  assert.equal(stillFaktor(30), 0.5);
});

test("Sprung ist kürzer als ein Schlag, damit jeder Tipp im Takt zählt", async () => {
  const { sprungDauer } = await import("../../js/pogo/regeln.js");
  for (const bpm of [100, 135.94, 176, 200]) assert.ok(sprungDauer(bpm) < 60 / bpm, String(bpm));
  assert.equal(sprungDauer(60), 0.38);
  assert.ok(Math.abs(sprungDauer(176) - 0.85 * 60 / 176) < 1e-9);
});

test("Stagedive-Bonus hängt an abgewehrten Griffen und halbem Becher", async () => {
  const { stagediveBonus } = await import("../../js/pogo/regeln.js");
  assert.equal(stagediveBonus(100, 3, 3), 600);
  assert.equal(stagediveBonus(100, 0, 3), 0);
  assert.equal(stagediveBonus(100, 2, 3), 400);
  assert.equal(stagediveBonus(49, 3, 3), 0);
  assert.equal(stagediveBonus(80, 0, 0), 600); // kein Griff kam: voller Bonus
});

test("Wilder Teil hängt am Song, nicht an der Kraft der Menge", async () => {
  const { wilderTeil } = await import("../../js/pogo/regeln.js");
  assert.equal(wilderTeil({ kraft: 1 }), true);
  assert.equal(wilderTeil({ kraft: 1.4 }), true);
  assert.equal(wilderTeil({ kraft: 0.8 }), false);
});

test("Outro: Song mit Outro hat die Datei, kurz genug zum Abwarten", async () => {
  const { SONGS } = await import("../../js/pogo/songs.js");
  const { existsSync, statSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const wurzel = fileURLToPath(new URL("../../", import.meta.url));
  const dan = SONGS.find((s) => s.id === "dan-ganove-lauter");
  assert.ok(dan.outro?.datei, "Dan hat ein Outro");
  for (const s of SONGS.filter((x) => x.outro)) {
    assert.ok(existsSync(wurzel + s.outro.datei), s.outro.datei);
    assert.ok(statSync(wurzel + s.outro.datei).size < 300_000, "Outro klein halten");
  }
});

test("Ton aus gibt es nicht: der Knopf kostet 100 Punkte, nie unter 0", async () => {
  const { TON_AUS_STRAFE, nachTonAus } = await import("../../js/pogo/regeln.js");
  assert.equal(TON_AUS_STRAFE, 100);
  assert.equal(nachTonAus(450), 350);
  assert.equal(nachTonAus(60), 0);
  assert.equal(nachTonAus(0), 0);
});

test("Ton-aus-Pop: deutsch und englisch", async () => {
  const { TEXTE } = await import("../../js/pogo/texte.js");
  assert.equal(TEXTE.de.tonAusStrafe, "FUCK OFF −100 Punkte");
  assert.equal(TEXTE.en.tonAusStrafe, "FUCK OFF −100 points");
});
