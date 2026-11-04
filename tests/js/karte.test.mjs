// Tests für die Copyshop-Karte: Projektion und Haufenbildung (ohne DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { projiziere, haufen } from "../../js/konzerte/karte.js";

test("10°O/51°N ist der Nullpunkt", () => {
  const [x0, y0] = projiziere(51, 10);
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(y0) < 1e-9);
});

test("Kleve–Nijmegen liegt auf der Karte bei rund 20,9 km", () => {
  const a = projiziere(51.7883, 6.1387);
  const b = projiziere(51.8126, 5.8372);
  assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - 20.9) < 1);
});

test("Osten ist rechts, Norden ist oben (SVG-y wächst nach Süden)", () => {
  const [xo] = projiziere(51, 11);
  const [, yn] = projiziere(52, 10);
  assert.ok(xo > 0);
  assert.ok(yn < 0);
  // ein Breitengrad sind rund 111 km
  assert.ok(Math.abs(-yn - 111.2) < 0.5);
});

test("nahe Punkte bilden einen Haufen, ferne einen eigenen", () => {
  assert.equal(haufen([{ x: 0, y: 0, id: "a" }, { x: 1, y: 0, id: "b" }, { x: 100, y: 0, id: "c" }], 10, 1).length, 2);
});

test("Haufen behält die Reihenfolge der Ids (gierig, erster Punkt gründet)", () => {
  const h = haufen([{ x: 0, y: 0, id: "a" }, { x: 100, y: 0, id: "c" }, { x: 2, y: 0, id: "b" }], 10, 1);
  assert.deepEqual(h.map((k) => k.ids), [["a", "b"], ["c"]]);
});

test("der Maßstab rechnet Pixel in km um", () => {
  const p = [{ x: 0, y: 0, id: "a" }, { x: 5, y: 0, id: "b" }];
  // 10 px bei 1 px/km = 10 km Radius: ein Haufen
  assert.equal(haufen(p, 10, 1).length, 1);
  // 10 px bei 4 px/km = 2,5 km Radius: zwei Haufen
  assert.equal(haufen(p, 10, 4).length, 2);
});

test("Haufen liegt im Mittel seiner Punkte", () => {
  const [h] = haufen([{ x: 0, y: 0, id: "a" }, { x: 4, y: 2, id: "b" }], 10, 1);
  assert.deepEqual([h.x, h.y], [2, 1]);
});

test("Gitter verliert keine Nachbarn über Zellgrenzen", () => {
  // Gründer knapp links einer Zellgrenze, Nachbar knapp rechts davon
  const h = haufen([{ x: 9.9, y: -0.1, id: "a" }, { x: 10.1, y: 0.1, id: "b" }], 10, 1);
  assert.equal(h.length, 1);
});

test("leere Eingabe ergibt keine Haufen", () => {
  assert.deepEqual(haufen([], 10, 1), []);
});
