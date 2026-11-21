// Tests für den Ganove-Kopf (js/pogo/kopf3d.js): Wahl der Zeichnung nach Blickwinkel und weiches Überblenden.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ansichtenAus, naechsteAnsicht, blende, normWinkel, kameraWinkel, KOPF_ATLAS } from "../../js/pogo/kopf3d.js";

const wurzel = fileURLToPath(new URL("../../", import.meta.url));
const daten = JSON.parse(readFileSync(wurzel + KOPF_ATLAS.daten, "utf8"));

test("Atlas liegt bei und beschreibt Marks 33 Zeichnungen", () => {
  assert.ok(existsSync(wurzel + KOPF_ATLAS.bild));
  assert.equal(daten.felder.length, 33);
  assert.ok(daten.spalten * daten.spalten >= daten.felder.length);
  for (const w of [0, 180, -5, 5, -65, 65, -90, -170]) assert.ok(daten.felder.some((f) => f.winkel === w), `Winkel ${w} fehlt`);
});

test("Gegenseite: gespiegelt nur jenseits von Marks letzter Zeichnung dort", () => {
  const a = ansichtenAus(daten.felder);
  const bei = (w) => a.filter((x) => x.winkel === w);
  assert.equal(bei(35)[0].spiegel, 0);            // von Mark gezeichnet
  assert.equal(bei(10).length, 0);                // kein Spiegelbild zwischen seinen Zeichnungen
  assert.equal(bei(90)[0].spiegel, 1);            // Profil links = Spiegelbild von rechts
  assert.equal(bei(150)[0].spiegel, 1);
  assert.equal(bei(180).length, 1);               // hinten nur einmal
  assert.ok(a.every((x) => Math.abs(x.winkel) <= 180));
});

test("nächste Zeichnung nach Winkel, mit Rest gegen Flattern an der Grenze", () => {
  const a = ansichtenAus([{ winkel: 0, feld: 0 }, { winkel: -10, feld: 1 }, { winkel: 180, feld: 2 }]);
  const idx = (w) => a.findIndex((x) => x.winkel === w);
  assert.equal(naechsteAnsicht(a, 2), idx(0));
  assert.equal(naechsteAnsicht(a, -7), idx(-10));
  assert.equal(naechsteAnsicht(a, 8), idx(10));    // gespiegelte −10
  assert.equal(naechsteAnsicht(a, -179), idx(180)); // über die Naht bei ±180
  // knapp über der Mitte bleibt die bisherige, deutlich darüber wechselt sie
  assert.equal(naechsteAnsicht(a, -5.3, idx(0)), idx(0));
  assert.equal(naechsteAnsicht(a, -6.5, idx(0)), idx(-10));
});

test("Überblenden: weich in Richtung Ziel, Summe bleibt 1, ohne Dauer sofort", () => {
  const g = [1, 0, 0];
  blende(g, 1, 0.05, 0.055);
  assert.ok(g[0] > 0.2 && g[0] < 0.8 && g[1] > 0.2, "nach einem Bild halb übergeblendet");
  assert.ok(Math.abs(g[0] + g[1] - 1) < 1e-9);
  for (let i = 0; i < 30; i++) blende(g, 1, 0.016, 0.055);
  assert.equal(g[0], 0); assert.ok(g[1] > 0.99);
  blende(g, 2, 0.016, 0);
  assert.deepEqual(g, [0, 0, 1]);
});

test("Winkel-Hilfen", () => {
  assert.equal(normWinkel(190), -170); assert.equal(normWinkel(-190), 170); assert.equal(normWinkel(30), 30);
  assert.equal(Math.round(kameraWinkel(0, 5)), 0); assert.equal(Math.round(kameraWinkel(5, 0)), 90); assert.equal(Math.round(kameraWinkel(0, -5)), 180);
});
