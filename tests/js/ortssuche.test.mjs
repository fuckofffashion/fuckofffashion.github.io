// Tests für die Ortssuche im Browser (kein DOM, reine Funktionen).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sucheOrt, normalisiere } from "../../js/konzerte/ortssuche.js";

// Kleine Inline-Tabelle im Format [land, plz, name, lat, lon, einw].
const T = {
  orte: [
    ["DE", "47533", "Kleve", 51.7883, 6.1387, 50000],
    ["DE", "24783", "Kleve", 54.3, 9.9, 300],
    ["DE", "47533", "Klevebach", 51.7, 6.2, 999999],
    ["NL", "6525", "Nijmegen", 51.8126, 5.8372, 170000],
    ["BE", "4000", "Liège", 50.6326, 5.5797, 200000],
    ["DE", "60311", "Frankfurt am Main", 50.1109, 8.6821, 700000],
    ["DE", "15230", "Frankfurt (Oder)", 52.3475, 14.5506, 58000],
    ["NL", "1011", "Amsterdam", 52.37, 4.89, 800000],
    ["DE", "41061", "Mönchengladbach", 51.1805, 6.4428, 260000],
  ],
};

test("PLZ-Präfix findet Kleve 47533 in DE", () => {
  const treffer = sucheOrt(T, "4753");
  assert.ok(treffer.length > 0);
  assert.equal(treffer[0].land, "DE");
  assert.ok(treffer[0].plz.startsWith("4753"));
});

test("NL-Postleitzahl mit Buchstaben findet den PC4-Eintrag", () => {
  for (const eingabe of ["6525 AB", "6525AB", "6525 ab", " 6525  Ab "]) {
    const treffer = sucheOrt(T, eingabe);
    assert.equal(treffer.length, 1, eingabe);
    assert.deepEqual([treffer[0].land, treffer[0].plz, treffer[0].name], ["NL", "6525", "Nijmegen"]);
  }
});

test("PC4 mit Buchstaben ohne Eintrag und Eingaben, die keine NL-PLZ sind", () => {
  assert.deepEqual(sucheOrt(T, "9999 ZZ"), []);
  assert.equal(sucheOrt(T, "4753 Kleve")[0].name, "Kleve"); // Ortsname, kein Postcode-Suffix
  assert.deepEqual(sucheOrt(T, "6525 A"), []); // ein Buchstabe ist kein Suffix
});

test("Namens-Präfix ohne Akzent findet Nijmegen in NL", () => {
  assert.equal(sucheOrt(T, "nijm")[0].land, "NL");
});

test("Eingabe ohne Akzent findet Liège mit Akzent", () => {
  assert.equal(sucheOrt(T, "liege")[0].name, "Liège");
});

test("leere Eingabe und unbekannte Eingabe geben []", () => {
  assert.deepEqual(sucheOrt(T, ""), []);
  assert.deepEqual(sucheOrt(T, "   "), []);
  assert.deepEqual(sucheOrt(T, "xyzzy"), []);
});

test("Treffer haben genau die Felder land, plz, name, lat, lon", () => {
  assert.deepEqual(Object.keys(sucheOrt(T, "nijm")[0]).sort(), ["land", "lat", "lon", "name", "plz"]);
});

test("je Name+Land nur ein Treffer, der mit den meisten Einwohnern", () => {
  const kleve = sucheOrt(T, "kleve").filter((o) => o.name === "Kleve");
  assert.equal(kleve.length, 1);
  assert.equal(kleve[0].land, "DE");
  assert.equal(kleve[0].plz, "47533");
});

test("exakter Namenstreffer steht vor Präfixtreffern mit mehr Einwohnern", () => {
  // Klevebach hat mehr Einwohner, aber Kleve ist der exakte Namenstreffer.
  assert.equal(sucheOrt(T, "kleve")[0].name, "Kleve");
});

test("Namenssuche sortiert nach Einwohnern, Frankfurt am Main vor Frankfurt (Oder)", () => {
  const treffer = sucheOrt(T, "frankfurt");
  assert.equal(treffer[0].name, "Frankfurt am Main");
  assert.equal(treffer[1].name, "Frankfurt (Oder)");
});

test("PLZ-Suche sortiert nach PLZ aufsteigend", () => {
  const plz = sucheOrt(T, "4").map((o) => o.plz);
  assert.deepEqual(plz, [...plz].sort());
});

test("max begrenzt die Trefferzahl", () => {
  assert.ok(sucheOrt(T, "a", 2).length <= 2);
});

test("gemischte Eingabe: Ziffern filtern die PLZ, Buchstaben suchen den Namen", () => {
  // Klevebach (PLZ 47533) passt ebenfalls zum Namen; Kleve in SH (PLZ 24783) fällt durch den PLZ-Filter.
  const treffer = sucheOrt(T, "47533 Kleve");
  assert.deepEqual(treffer.map((o) => o.name), ["Kleve", "Klevebach"]);
  assert.ok(treffer.every((o) => o.plz === "47533"));
  assert.deepEqual(sucheOrt(T, "99999 Kleve"), []);
});

test("normalisiere stimmt mit Python-normalisiere überein (ortstabelle.py)", () => {
  // Erwartete Werte: Python-Ausgabe von tools/konzerte/ortstabelle.py normalisiere().
  const faelle = [
    ["Liège", "liege"],
    ["Groß-Gerau", "gross gerau"],
    ["Frankfurt (Oder)", "frankfurt (oder)"],
    ["  Den  Haag ", "den haag"],
    ["Mülheim an der Ruhr", "mulheim an der ruhr"],
    ["'s-Hertogenbosch", "'s hertogenbosch"],
  ];
  for (const [eingabe, erwartet] of faelle) {
    assert.equal(normalisiere(eingabe), erwartet, `Eingabe: ${eingabe}`);
  }
});

test("echte Tabelle: kleve -> DE 47533, frankfurt -> Frankfurt am Main", () => {
  const pfad = fileURLToPath(new URL("../../data/orte-tabelle.json", import.meta.url));
  const tabelle = JSON.parse(readFileSync(pfad, "utf8"));

  const kleve = sucheOrt(tabelle, "kleve")[0];
  assert.equal(kleve.land, "DE");
  assert.equal(kleve.plz, "47533");

  const frankfurt = sucheOrt(tabelle, "frankfurt")[0];
  assert.equal(frankfurt.name, "Frankfurt am Main");
  assert.ok(Math.abs(frankfurt.lat - 50.1) < 0.2);

  // Aliase aus build_ortstabelle (Task 8b): deutsche Exonyme finden NL/BE-Städte
  assert.equal(sucheOrt(tabelle, "den haag")[0].land, "NL");
  assert.equal(sucheOrt(tabelle, "brüssel")[0].land, "BE");
});
