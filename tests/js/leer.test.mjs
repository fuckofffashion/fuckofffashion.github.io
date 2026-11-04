// Tests für die Leerstellen-Sprüche.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SPRUECHE, spruch } from "../../js/konzerte/leer.js";

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
