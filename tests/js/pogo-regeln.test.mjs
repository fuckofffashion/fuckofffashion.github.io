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
  assert.ok(Math.abs(verschuettet(3, {}) - 6.3) < 1e-9);
  assert.equal(verschuettet(10, {}), 14);
  assert.ok(verschuettet(1.2, { rucksack: true }) > 0);
});

test("Ergebnis und Titel", () => {
  assert.equal(ergebnis(1000, 50), 500);
  assert.equal(ergebnis(1000, 0), 0);
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
  assert.equal(GEDRAENGE, 1.5);
  assert.deepEqual(SPRUNG, { bonus: 15, daneben: 3 });
  assert.deepEqual(BONUS, { duDa: 150, plektrum: 100, drumstick: 150, setliste: 300, oi: 40, stagedive: 600 });
});

test("Pogo-Texte: DE und EN gleich aufgebaut, alle Titel da", async () => {
  const { TEXTE } = await import("../../js/pogo/texte.js");
  assert.deepEqual(Object.keys(TEXTE.en).sort(), Object.keys(TEXTE.de).sort());
  for (const k of Object.keys(TEXTE.de)) assert.equal(typeof TEXTE.en[k], typeof TEXTE.de[k], k);
  for (const sp of ["de", "en"]) for (const k of ["leer", "randSteher", "legendaer", "koenig", "solide", "nass"]) {
    assert.equal(typeof TEXTE[sp].titel[k], "string", `${sp} ${k}`);
  }
  assert.equal(TEXTE.de.randSchubs, "Was stehst du hier rum?");
  assert.deepEqual(Object.keys(TEXTE.en.laeden).sort(), ["halle", "keller", "wiese"]);
});

test("Läden: Gitter vor dem Pit, Mitte liegt in der Mitte", async () => {
  const { LAEDEN } = await import("../../js/pogo/laeden.js");
  assert.deepEqual(Object.keys(LAEDEN).sort(), ["halle", "keller", "wiese"]);
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
