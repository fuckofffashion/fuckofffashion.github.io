// Tests für Szene-Einheiten (Anfahrt in Platten) und Umkreisstufen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STUFEN, STUFEN_EN, anfahrt, stufenName } from "../../js/konzerte/einheiten.js";

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


test("ohne Dokument ist Deutsch der Standard", () => {
  assert.equal(anfahrt(47), anfahrt(47, "de"));
  assert.equal(stufenName(STUFEN[2]), "Bahnweite");
});

test("englische Stufennamen für alle Stufen", () => {
  assert.deepEqual(STUFEN.map((s) => stufenName(s, "en")), ["Walking distance", "Cycling distance", "Train distance", "Tour-van distance"]);
  assert.deepEqual(Object.keys(STUFEN_EN), STUFEN.map((s) => s.id));
});

test("Anfahrt auf Englisch", () => {
  assert.equal(anfahrt(47, "en"), "47 km · one LP by train");
  assert.equal(anfahrt(4, "en"), "4 km · one LP on foot");
  assert.equal(anfahrt(20, "en"), "20 km · 2 LPs by bike");
  assert.equal(anfahrt(250, "en"), "250 km · 4.5 LPs by tour van");
  assert.equal(anfahrt(1, "en"), "1 km · half an LP on foot");
  assert.equal(anfahrt(15, "en"), "15 km · one and a half LPs by bike");
  assert.match(anfahrt(46.6, "en"), /^47 km ·/);
});
