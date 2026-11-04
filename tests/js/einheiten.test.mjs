// Tests für Szene-Einheiten (Anfahrt in Platten) und Umkreisstufen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STUFEN, anfahrt } from "../../js/konzerte/einheiten.js";

test("Umkreisstufen sind Laufweite, Fahrradweite, Bahnweite, Bandbus-Weite", () => {
  assert.deepEqual(STUFEN, [
    { id: "lauf", km: 5, label: "Laufweite" },
    { id: "rad", km: 25, label: "Fahrradweite" },
    { id: "bahn", km: 100, label: "Bahnweite" },
    { id: "bus", km: 300, label: "Bandbus-Weite" },
  ]);
});

test("Bahn bei 47 km", () => {
  assert.equal(anfahrt(47), "47 km · eine Platte lang Bahn");
});

test("Fußweg bei 4 km", () => {
  assert.equal(anfahrt(4), "4 km · eine Platte lang Fußweg");
});

test("Rad bei 20 km mit zwei Platten", () => {
  assert.equal(anfahrt(20), "20 km · 2 Platten lang Rad");
});

test("Bandbus bei 250 km mit Komma", () => {
  assert.equal(anfahrt(250), "250 km · 4,5 Platten lang Bandbus");
});

test("mindestens eine halbe Platte bei 1 km", () => {
  assert.equal(anfahrt(1), "1 km · eine halbe Platte lang Fußweg");
});

test("Grenzen sind inklusive: 5 km zu Fuß, 25 km mit Rad, 100 km mit Bahn", () => {
  assert.match(anfahrt(5), /Fußweg$/);
  assert.match(anfahrt(25), / Rad$/);
  assert.match(anfahrt(100), / Bahn$/);
  assert.match(anfahrt(101), / Bandbus$/);
});

test("anderthalb Platten als Wort", () => {
  // 15 km mit dem Rad (15 km/h) sind 60 Minuten, also 1,5 Platten
  assert.equal(anfahrt(15), "15 km · anderthalb Platten lang Rad");
});

test("angezeigte km sind gerundet", () => {
  assert.match(anfahrt(46.6), /^47 km ·/);
});
