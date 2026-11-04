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

// Textsuche: Band, Zusatz (Eventname), Laden, Stadt ---------------------------
import { normalisiere } from "../../js/konzerte/filter.js";

const S = [
  { id: "S1", datum: "2026-11-10", zeit: null, bands: "Die Ärzte, Slime", zusatz: "Soli-Abend fürs AZ", laden: "AZ Mülheim", stadt: "Mülheim", lat: 51.43, lon: 6.88, genres: [], frei: false, kommerz: false, links: [] },
  { id: "S2", datum: "2026-11-11", zeit: null, bands: ["Toxoplasma"], zusatz: "", laden: "Druckluft", stadt: "Oberhausen", lat: 51.47, lon: 6.85, genres: [], frei: false, kommerz: false, links: [] },
  { id: "S3", datum: "2026-11-12", zeit: null, bands: "Rotz & Wasser", zusatz: "Punk im Park Festival", laden: "Stadtpark", stadt: "Kiel", lat: 54.32, lon: 10.12, genres: [], frei: false, kommerz: false, links: [] },
];

test("normalisiere: Kleinschreibung, Umlaute als ae/oe/ue, ß als ss, Satzzeichen weg", () => {
  assert.equal(normalisiere("Die ÄRZTE!"), "die aerzte");
  assert.equal(normalisiere("Straße  &  Soße"), "strasse sosse");
  assert.equal(normalisiere("Motörhead"), "motoerhead");
  assert.equal(normalisiere("  "), "");
  assert.equal(normalisiere(null), "");
});

test("suche findet Band, egal ob mit Umlaut oder ausgeschrieben", () => {
  assert.deepEqual(ids(filtern(S, { suche: "ärzte" })), ["S1"]);
  assert.deepEqual(ids(filtern(S, { suche: "Aerzte" })), ["S1"]);
  assert.deepEqual(ids(filtern(S, { suche: "toxo" })), ["S2"]);
});

test("suche findet Eventname (zusatz), Laden und Stadt", () => {
  assert.deepEqual(ids(filtern(S, { suche: "punk im park" })), ["S3"]);
  assert.deepEqual(ids(filtern(S, { suche: "druckluft" })), ["S2"]);
  assert.deepEqual(ids(filtern(S, { suche: "kiel" })), ["S3"]);
});

test("mehrere Wörter müssen alle passen, Reihenfolge egal", () => {
  assert.deepEqual(ids(filtern(S, { suche: "slime mülheim" })), ["S1"]);
  assert.deepEqual(ids(filtern(S, { suche: "slime kiel" })), []);
});

test("leere oder nur aus Leerzeichen bestehende suche filtert nicht", () => {
  assert.deepEqual(ids(filtern(S, { suche: "" })), ids(S));
  assert.deepEqual(ids(filtern(S, { suche: "   " })), ids(S));
});

test("suche wirkt zusammen mit Umkreis", () => {
  const MUELHEIM = { lat: 51.43, lon: 6.88 };
  assert.deepEqual(ids(filtern(S, { suche: "punk", mitte: MUELHEIM, radiusKm: 25 })), []);
  assert.deepEqual(ids(filtern(S, { suche: "punk", mitte: MUELHEIM, radiusKm: null })), ["S3"]);
});
