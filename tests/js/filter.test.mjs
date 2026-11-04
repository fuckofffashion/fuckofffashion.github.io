// Tests für Filter und Sortierung der Konzerttermine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { filtern, sortieren } from "../../js/konzerte/filter.js";

const KLEVE = { lat: 51.7883, lon: 6.1387 };

// Testdaten: A Kleve, B Nijmegen (frei), C Köln (kommerz), D Antwerpen
const T = [
  { id: "A", datum: "2026-11-10", zeit: "20:00", bands: ["Alfa"], zusatz: "", laden: "Kulturfabrik", plz: "47533", stadt: "Kleve", land: "DE", lat: 51.7883, lon: 6.1387, genau: true, genres: ["Punk / Hardcore / Crust"], frei: false, kommerz: false, links: [], quelle: "knox" },
  { id: "B", datum: "2026-11-15", zeit: "19:00", bands: ["Bravo"], zusatz: "", laden: "Doornroosje", plz: "6511", stadt: "Nijmegen", land: "NL", lat: 51.8126, lon: 5.8372, genau: true, genres: ["Ska / Reggae"], frei: true, kommerz: false, links: [], quelle: "radar" },
  { id: "C", datum: "2026-11-15", zeit: null, bands: ["Charlie"], zusatz: "", laden: "Arena", plz: "50667", stadt: "Köln", land: "DE", lat: 50.9375, lon: 6.9603, genau: true, genres: ["Grind Dbeat Death"], frei: false, kommerz: true, links: [], quelle: "knox" },
  { id: "D", datum: "2026-12-01", zeit: "21:00", bands: ["Delta"], zusatz: "", laden: "Het Bos", plz: "2000", stadt: "Antwerpen", land: "BE", lat: 51.2194, lon: 4.4025, genau: true, genres: ["Punk / Hardcore (allgemein)"], frei: false, kommerz: false, links: [], quelle: "radar" },
  { id: "E", datum: "2026-11-20", zeit: "18:00", bands: ["Echo"], zusatz: "", laden: "Ohne Ort", plz: "", stadt: "", land: "", genau: false, genres: [], frei: false, kommerz: false, links: [], quelle: "knox" },
];

const ids = (liste) => liste.map((t) => t.id);

test("mitte mit Radius lässt nur Termine im Umkreis zu", () => {
  assert.deepEqual(ids(filtern(T, { mitte: KLEVE, radiusKm: 25 })), ["A", "B"]);
});

test("Termine ohne lat/lon fallen bei gesetztem mitte raus", () => {
  assert.ok(!ids(filtern(T, { mitte: KLEVE })).includes("E"));
});

test("km ist die ungerundete Entfernung, mit mitte gesetzt", () => {
  const b = filtern(T, { mitte: KLEVE }).find((t) => t.id === "B");
  assert.equal(typeof b.km, "number");
  assert.ok(Math.abs(b.km - 20.91) < 0.1);
  assert.notEqual(b.km, Math.round(b.km));
});

test("von und bis sind inklusive", () => {
  assert.deepEqual(ids(filtern(T, { von: "2026-11-15", bis: "2026-11-15" })), ["B", "C"]);
});

test("nurFrei zeigt nur freie Termine", () => {
  assert.deepEqual(ids(filtern(T, { nurFrei: true })), ["B"]);
});

test("ohneKommerz entfernt kommerzielle Termine", () => {
  assert.ok(!ids(filtern(T, { ohneKommerz: true })).includes("C"));
});

test("genre filtert über die Genre-Liste des Termins", () => {
  assert.deepEqual(ids(filtern(T, { genre: "Ska / Reggae" })), ["B"]);
  assert.deepEqual(ids(filtern(T, { genre: null })), ids(filtern(T, {})));
});

test("ohne mitte ist km für alle null", () => {
  assert.ok(filtern(T, {}).every((t) => t.km === null));
});

test("filtern verändert die Eingabe nicht", () => {
  const vorher = JSON.stringify(T);
  filtern(T, { mitte: KLEVE, radiusKm: 25 });
  assert.equal(JSON.stringify(T), vorher);
  assert.ok(T.every((t) => !("km" in t)));
});

test("sortieren nach Entfernung nimmt zuerst den nächsten Termin", () => {
  assert.equal(sortieren(filtern(T, { mitte: KLEVE, radiusKm: 300 }), "entfernung")[0].id, "A");
});

test("sortieren nach Entfernung setzt Termine ohne km ans Ende", () => {
  const liste = [
    { id: "ohne", km: null, datum: "2026-11-01", zeit: null },
    { id: "fern", km: 40, datum: "2026-11-02", zeit: null },
    { id: "nah", km: 3, datum: "2026-11-03", zeit: null },
  ];
  assert.deepEqual(ids(sortieren(liste, "entfernung")), ["nah", "fern", "ohne"]);
});

test("sortieren nach Datum ordnet umgekehrte Eingabe nach Datum um", () => {
  const umgekehrt = [...T].reverse().filter((t) => t.id !== "E");
  assert.deepEqual(ids(sortieren(umgekehrt, "datum")), ["A", "B", "C", "D"]);
});

test("sortieren nach Datum: gleiches Datum, Zeit null kommt nach gesetzter Zeit", () => {
  const liste = [
    { id: "ohneZeit", datum: "2026-11-15", zeit: null, km: null },
    { id: "mitZeit", datum: "2026-11-15", zeit: "19:00", km: null },
  ];
  assert.deepEqual(ids(sortieren(liste, "datum")), ["mitZeit", "ohneZeit"]);
});

test("sortieren nach Entfernung: bei gleicher Entfernung zuerst das frühere Datum", () => {
  const liste = [
    { id: "spaet", km: 5, datum: "2026-11-20", zeit: null },
    { id: "frueh", km: 5, datum: "2026-11-10", zeit: null },
  ];
  assert.deepEqual(ids(sortieren(liste, "entfernung")), ["frueh", "spaet"]);
});

test("sortieren liefert ein neues Array", () => {
  const eingabe = filtern(T, {});
  const ergebnis = sortieren(eingabe, "datum");
  assert.notEqual(ergebnis, eingabe);
});
