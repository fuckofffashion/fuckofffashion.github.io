// Tests für die Texte der Konzertseite (Deutsch und Englisch).
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEXTE, t, sprache, zahl, gebiet } from "../../js/konzerte/texte.js";

test("ohne Dokument ist die Sprache Deutsch", () => {
  assert.equal(sprache(), "de");
  assert.equal(gebiet(), "de-DE");
  assert.equal(t("heute"), "Heute");
});

test("beide Sprachen haben dieselben Schlüssel mit derselben Art", () => {
  assert.deepEqual(Object.keys(TEXTE.en).sort(), Object.keys(TEXTE.de).sort());
  for (const k of Object.keys(TEXTE.de)) {
    assert.equal(typeof TEXTE.en[k], typeof TEXTE.de[k], k);
  }
});

test("Zahlen: Deutsch mit Punkt, Englisch mit Komma als Tausendertrenner", () => {
  assert.equal(zahl(7280), "7.280");
  assert.equal(zahl(7280, "en"), "7,280");
});

test("Datum und Wochentage auf Englisch", () => {
  assert.equal(t("datum", { t: "14", m: "11" }), "14.11.");
  assert.equal(t("datum", { t: "14", m: "11" }, "en"), "14/11");
  assert.deepEqual(t("wochentage", {}, "en"), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  assert.equal(t("heute", {}, "en"), "Today");
  assert.equal(t("morgen", {}, "en"), "Tomorrow");
});

test("Zähler auf Englisch, Einzahl und Mehrzahl", () => {
  assert.equal(t("zahl", { n: 0, z: "0" }, "en"), "No gigs");
  assert.equal(t("zahl", { n: 1, z: "1" }, "en"), "1 gig");
  assert.equal(t("zahl", { n: 1234, z: "1,234" }, "en"), "1,234 gigs");
  assert.equal(t("imUmkreis", { stufe: "Train distance", um: "you" }, "en"), " within train distance of you");
  assert.equal(t("aussen", { n: 1, z: "1" }, "en"), "1 more hit outside your radius.");
  assert.equal(t("aussen", { n: 3, z: "3" }, "en"), "3 more hits outside your radius.");
});

test("deutsche Texte bleiben wörtlich", () => {
  assert.equal(t("zahl", { n: 0, z: "0" }), "Keine Termine");
  assert.equal(t("zahl", { n: 1, z: "1" }), "1 Termin");
  assert.equal(t("zahl", { n: 1234, z: "1.234" }), "1.234 Termine");
  assert.equal(t("imUmkreis", { stufe: "Bahnweite", um: "Kleve" }), " in Bahnweite um Kleve");
  assert.equal(t("hinFuss", { name: "AZ" }), "Hinkommen zu Fuß zu AZ, öffnet openstreetmap.org");
  assert.equal(t("hinAuto", { name: "AZ" }), "Hinkommen mit dem Auto zu AZ, öffnet openstreetmap.org");
  assert.equal(t("mehr", { z: "1.234" }), "Mehr zeigen (noch 1.234)");
});

test("Wegtexte und Karte auf Englisch", () => {
  assert.equal(t("hinRad", { name: "AZ" }, "en"), "Get to AZ by bike, opens openstreetmap.org");
  assert.equal(t("hinFuss", { name: "AZ" }, "en"), "Get to AZ on foot, opens openstreetmap.org");
  assert.equal(t("mehr", { z: "1,234" }, "en"), "Show more (1,234 left)");
  assert.equal(t("nichtsZu", { q: "Slime" }, "en"), "Nothing for “Slime”.");
  assert.equal(t("gross", {}, "en"), "⤢ Big");
  assert.equal(t("klein", {}, "en"), "✕ Small");
});

test("unbekannte Sprache fällt auf Deutsch zurück", () => {
  assert.equal(t("heute", {}, "fr"), "Heute");
});
