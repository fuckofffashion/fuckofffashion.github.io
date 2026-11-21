// Tests für Tour, Rang, Abgucken, Zugabe, Schurken und Motivliste (Pogo Etappe 3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TOUR, ZIELE, KRAFT, RAENGE, leseTour, schreibeTour, mitErgebnis, geschafft, fehlt, rang, kraftFaktor } from "../../js/pogo/tour.js";
import { istHinter, ABGUCKEN_S, ZUGABE, schurkenZeiten, BONUS } from "../../js/pogo/regeln.js";
import { MOTIVE } from "../../js/pogo/motive.js";
import { SONGS, BEAT } from "../../js/pogo/songs.js";

const speicher = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const kaputt = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };

test("Tour: Reihenfolge, Ziele, Kraft", () => {
  assert.deepEqual(TOUR, ["pitcher", "druckluftInnen", "druckluftDraussen", "altenberg"]);
  assert.deepEqual(ZIELE, [750, 1250, 1750, 2250]);
  assert.deepEqual(KRAFT, [1, 1.1, 1.2, 1.3]);
  assert.equal(kraftFaktor("druckluftDraussen"), 1.2);
  assert.equal(kraftFaktor("unbekannt"), 1);
});

test("Tour: alle Läden offen, Ziel je Laden als Abzeichen", () => {
  let t = leseTour(speicher());
  assert.equal(fehlt(t, "altenberg"), 2250);
  assert.equal(geschafft(t, "pitcher"), false);
  t = mitErgebnis(t, "altenberg", 2249);
  assert.equal(fehlt(t, "altenberg"), 1);
  assert.equal(geschafft(t, "altenberg"), false);
  t = mitErgebnis(t, "altenberg", 2250);
  assert.equal(geschafft(t, "altenberg"), true);
  assert.equal(fehlt(t, "altenberg"), 0);
  t = mitErgebnis(t, "pitcher", 750);
  assert.equal(geschafft(t, "pitcher"), true);
  assert.equal(geschafft(t, "druckluftInnen"), false);
  t = mitErgebnis(t, "pitcher", 200); // Bestwert bleibt
  assert.equal(t.best.pitcher, 750);
  assert.equal(t.summe, 2249 + 2250 + 750 + 200);
  assert.equal(geschafft(t, "unbekannt"), false);
});

test("Tour: Speicher hin und zurück, kaputt ergibt Anfang", () => {
  const s = speicher();
  const t = mitErgebnis(leseTour(s), "pitcher", 1600);
  assert.equal(schreibeTour(s, t), true);
  assert.deepEqual(leseTour(s), t);
  assert.deepEqual(leseTour(kaputt), { best: {}, summe: 0 });
  assert.equal(schreibeTour(kaputt, t), false);
  s.setItem("fof-pogo-tour-v1", JSON.stringify({ best: { pitcher: "viel", fremd: 3 }, summe: -5 }));
  assert.deepEqual(leseTour(s), { best: {}, summe: 0 });
});

test("Rang nach Summe", () => {
  assert.deepEqual(RAENGE.map((r) => r.ab), [0, 2000, 8000, 20000]);
  assert.equal(rang(0), "randSteher");
  assert.equal(rang(1999), "randSteher");
  assert.equal(rang(2000), "pogoLehrling");
  assert.equal(rang(8000), "pitSau");
  assert.equal(rang(25000), "pitLegende");
});

test("istHinter: direkt dahinter, nicht daneben, nicht davor", () => {
  const p = { x: 0, z: 0 };
  assert.equal(istHinter({ x: 0.2, z: 0.8 }, p), true);
  assert.equal(istHinter({ x: 0, z: 1.2 }, p), false);
  assert.equal(istHinter({ x: 0.8, z: 0.5 }, p), false);
  assert.equal(istHinter({ x: 0, z: -0.5 }, p), false);
  assert.equal(ABGUCKEN_S, 3);
});

test("Zugabe, Schurken-Zeiten, Boni", () => {
  assert.deepEqual(ZUGABE, { fenster: 5, treffer: 6, dauer: 15, faktor: 1.5 });
  const dan = SONGS[0];
  assert.deepEqual(schurkenZeiten(dan), { schnoesel: 30, fascho: 23.2 });
  assert.deepEqual(schurkenZeiten(BEAT), { schnoesel: 30, fascho: 24 });
  assert.equal(BONUS.abgeguckt, 200); assert.equal(BONUS.schnoesel, 300); assert.equal(BONUS.fascho, 200);
});

test("Motivliste passt zu tools/motive.json, Bilder existieren", () => {
  const wurzel = fileURLToPath(new URL("../../", import.meta.url));
  const quelle = JSON.parse(readFileSync(wurzel + "tools/motive.json", "utf-8"));
  const liste = Array.isArray(quelle) ? quelle : quelle.motive;
  assert.deepEqual(MOTIVE.map((m) => m.nr), liste.map((m) => m.nr));
  for (const m of MOTIVE) assert.ok(existsSync(wurzel + m.bild), m.bild);
});

test("Zugabe-Zeiten: ab letztem Refrain, 15 s, mit Datei höchstens bis Songende", async () => {
  const { zugabeZeiten } = await import("../../js/pogo/regeln.js");
  assert.deepEqual(zugabeZeiten(SONGS[0]), { start: 43, ende: 58 });
  assert.deepEqual(zugabeZeiten(BEAT), { start: 48, ende: 63 });
});

test("Raster ab Versatz: nächster Schlag liegt auf dem Raster", async () => {
  const { rasterAb } = await import("../../js/pogo/regeln.js");
  const s = 60 / 176 / 2;
  const r = rasterAb(48, s);
  assert.ok(r.zeit >= 48 && r.zeit - 48 < s);
  assert.ok(Math.abs(r.zeit - r.k * s) < 1e-9);
  assert.deepEqual(rasterAb(0, s), { k: 0, zeit: 0 });
});

test("Zugabe-Ruf: höchstens ein Treffer pro Schlag, daneben bleibt daneben", async () => {
  const { rufTipp } = await import("../../js/pogo/regeln.js");
  const v = 60 / 120, gezaehlt = new Set();
  assert.equal(rufTipp(v * 3 + 0.02, 120, gezaehlt), "treffer");
  assert.equal(rufTipp(v * 3 - 0.03, 120, gezaehlt), "schon");
  assert.equal(rufTipp(v * 3 + 0.25, 120, gezaehlt), "daneben");
  assert.equal(rufTipp(v * 4, 120, gezaehlt), "treffer");
  assert.equal(gezaehlt.size, 2);
});

test("Pogo-Knöpfe der Säule zeigen auf echte Songs der Band", () => {
  const wurzel = fileURLToPath(new URL("../../", import.meta.url));
  const bands = JSON.parse(readFileSync(wurzel + "tools/bands.json", "utf-8")).bands.filter((b) => b.pogo);
  assert.ok(bands.length >= 1);
  for (const b of bands) assert.equal(SONGS.find((s) => s.id === b.pogo)?.band, b.id, b.id);
});

test("Song aus der Adresse: nur bekannte Songs", async () => {
  const { songAusAdresse } = await import("../../js/pogo/songs.js");
  assert.equal(songAusAdresse("?song=dan-ganove-lauter"), "dan-ganove-lauter");
  assert.equal(songAusAdresse("?song=beat"), null); // eigener Beat ist nicht mehr wählbar
  assert.equal(songAusAdresse("?song=<x>"), null);
  assert.equal(songAusAdresse(""), null);
});
