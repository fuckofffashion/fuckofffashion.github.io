// Tests für die Entfernungsberechnung (Haversine).
import { test } from "node:test";
import assert from "node:assert/strict";
import { km } from "../../js/konzerte/geo.js";

test("Köln–Düsseldorf liegt bei rund 34,8 km", () => {
  assert.ok(Math.abs(km({ lat: 50.9375, lon: 6.9603 }, { lat: 51.2277, lon: 6.7735 }) - 34.81) < 0.1);
});

test("Nijmegen–Kleve liegt bei rund 20,9 km", () => {
  assert.ok(Math.abs(km({ lat: 51.8126, lon: 5.8372 }, { lat: 51.7883, lon: 6.1387 }) - 20.91) < 0.1);
});

test("gleicher Punkt hat Entfernung 0", () => {
  assert.equal(km({ lat: 51.7883, lon: 6.1387 }, { lat: 51.7883, lon: 6.1387 }), 0);
});

test("Entfernung ist symmetrisch", () => {
  const a = { lat: 50.9375, lon: 6.9603 };
  const b = { lat: 51.8126, lon: 5.8372 };
  assert.equal(km(a, b), km(b, a));
});
