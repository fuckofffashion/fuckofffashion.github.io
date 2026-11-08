// Tests für die Leerstellen-Sprüche.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SPRUECHE, SPRUECHE_EN, spruch } from "../../js/konzerte/leer.js";

test("enthält die festen Sprüche wörtlich", () => {
  assert.ok(SPRUECHE.includes("Heute nix. Geh Sticker kleben."));
  assert.ok(SPRUECHE.includes("Kein Konzert im Umkreis? Dann mach eins. Keller, Garage, drei Leute mit Instrumenten."));
});

test("hat die zwei festen plus vier eigene Sprüche", () => {
  assert.ok(SPRUECHE.length >= 6);
});

test("alle Sprüche sind nicht-leere Texte ohne Duplikate", () => {
  assert.ok(SPRUECHE.every((s) => typeof s === "string" && s.trim().length > 0));
  assert.equal(new Set(SPRUECHE).size, SPRUECHE.length);
});

test("spruch(n) ist deterministisch und läuft zyklisch", () => {
  assert.equal(spruch(0), SPRUECHE[0]);
  assert.equal(spruch(SPRUECHE.length), SPRUECHE[0]);
  assert.equal(spruch(SPRUECHE.length + 2), SPRUECHE[2]);
});

test("spruch(n) bleibt bei negativen, gebrochenen und ungültigen Zahlen im gültigen Bereich", () => {
  const l = SPRUECHE.length;
  assert.equal(spruch(-1), SPRUECHE[l - 1]);
  assert.equal(spruch(1.5), SPRUECHE[1]);
  assert.equal(spruch(NaN), SPRUECHE[0]);
});


test("englische Sprüche: gleich viele, keine leeren, keine Duplikate", () => {
  assert.equal(SPRUECHE_EN.length, SPRUECHE.length);
  assert.ok(SPRUECHE_EN.every((s) => typeof s === "string" && s.trim().length > 0));
  assert.equal(new Set(SPRUECHE_EN).size, SPRUECHE_EN.length);
});

test("spruch(n, 'en') liefert den englischen Spruch an derselben Stelle", () => {
  assert.equal(spruch(0, "en"), "Nothing on. Go slap some stickers up.");
  assert.equal(spruch(1, "en"), "No gig nearby? Put one on. Basement, garage, three people with instruments.");
  assert.equal(spruch(SPRUECHE_EN.length + 2, "en"), SPRUECHE_EN[2]);
  assert.equal(spruch(-1, "en"), SPRUECHE_EN[SPRUECHE_EN.length - 1]);
  assert.equal(spruch(NaN, "en"), SPRUECHE_EN[0]);
});

test("ohne Dokument bleibt spruch(n) deutsch", () => {
  assert.equal(spruch(3), spruch(3, "de"));
  assert.equal(spruch(3), SPRUECHE[3]);
});
