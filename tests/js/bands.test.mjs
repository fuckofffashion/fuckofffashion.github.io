// Tests für die Säulen-Logik der Bandseite (js/bands/saeulen.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isoLokal, tageBis, kuenftige, istBald, ordne, naechster, sichtbare } from "../../js/bands/saeulen.js";
import { TEXTE, t as text } from "../../js/bands/texte.js";

const HEUTE = "2026-11-21";
const t = (datum) => ({ datum, zeit: null, laden: "L", stadt: "S" });

test("tageBis zählt ganze Tage, auch über die Zeitumstellung", () => {
  assert.equal(tageBis("2026-11-22", HEUTE), 1);
  assert.equal(tageBis("2027-03-29", "2027-03-27"), 2);
});

test("kuenftige: gestern fällt weg, heute bleibt", () => {
  assert.deepEqual(kuenftige([t("2026-11-20"), t("2026-11-21")], HEUTE).map((x) => x.datum), ["2026-11-21"]);
});

test("isoLokal nimmt die lokale Zeit, nicht UTC", () => {
  assert.equal(isoLokal(new Date(2026, 10, 21, 0, 30)), "2026-11-21");
  assert.equal(isoLokal(new Date(2026, 10, 21, 23, 59)), "2026-11-21");
});

test("sichtbare: ohne alle die ersten 4", () => {
  const sechs = ["01", "02", "03", "04", "05", "06"].map((d) => t(`2026-12-${d}`));
  assert.equal(sichtbare(sechs, false).length, 4);
  assert.equal(sichtbare(sechs, true).length, 6);
});

test("ordne/istBald: Daten in falscher Form werfen nicht, die Band ist still", () => {
  const daten = { bands: { a: { termine: {} }, b: { termine: "x" }, c: null } };
  assert.deepEqual(ordne(["a", "b", "c"], daten, HEUTE), ["a", "b", "c"]);
  assert.equal(istBald({}, HEUTE), false);
  assert.deepEqual(kuenftige({}, HEUTE), []);
  assert.deepEqual(kuenftige([t("2026-12-01"), null, { datum: 5 }], HEUTE).map((x) => x.datum), ["2026-12-01"]);
});

test("istBald: Grenze 30/31 Tage, Vergangenes zählt nicht", () => {
  assert.equal(istBald([t("2026-11-21")], HEUTE), true);
  assert.equal(istBald([t("2026-12-21")], HEUTE), true);   // Tag 30
  assert.equal(istBald([t("2026-12-22")], HEUTE), false);  // Tag 31
  assert.equal(istBald([t("2026-11-20"), t("2027-01-10")], HEUTE), false);
  assert.equal(istBald(undefined, HEUTE), false);
});

test("ordne: nach nächstem Termin, stille danach in Eingangsreihenfolge", () => {
  const daten = { bands: { a: { termine: [t("2027-03-01")] }, b: { termine: [t("2026-11-20"), t("2026-11-30")] },
    c: { termine: [t("2026-11-25")] }, d: { termine: [] } } };
  assert.deepEqual(ordne(["a", "b", "c", "d", "z"], daten, HEUTE), ["c", "b", "a", "d", "z"]);
});

test("ordne: ohne Daten bleibt die Reihenfolge", () => {
  assert.deepEqual(ordne(["b", "a"], null, HEUTE), ["b", "a"]);
});

test("naechster: erster künftiger oder null", () => {
  assert.equal(naechster([t("2026-11-20"), t("2026-11-22")], HEUTE).datum, "2026-11-22");
  assert.equal(naechster([], HEUTE), null);
});

test("Bandtexte: beide Sprachen gleiche Schlüssel und Arten", () => {
  assert.deepEqual(Object.keys(TEXTE.en).sort(), Object.keys(TEXTE.de).sort());
  for (const k of Object.keys(TEXTE.de)) assert.equal(typeof TEXTE.en[k], typeof TEXTE.de[k], k);
  assert.equal(TEXTE.de.bald, "BALD"); assert.equal(TEXTE.en.bald, "SOON");
  assert.equal(text("mehr", { n: 2 }, "en"), "+ 2 more");
  assert.equal(text("mehr", { n: 3 }, "de"), "+ 3 weitere");
  assert.deepEqual(TEXTE.en.sticker.punk, ["PUNK'S", "ALIVE"]);
  assert.deepEqual(TEXTE.de.sticker.kauf, ["KAUF", "NIX"]);
  assert.equal(TEXTE.de.kopfzeile, "LIVE GESEHEN · FÜR GUT BEFUNDEN");
  assert.equal(TEXTE.en.zettelKopf, "NEXT GIGS");
  assert.deepEqual(TEXTE.en.zettelStill, ["Quiet for now.", "They'll be back."]);
});

test("mulberry32 ist mit gleichem Samen gleich", async () => {
  const { mulberry32 } = await import("../../js/bands/malen.js");
  const a = mulberry32(7), b = mulberry32(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("zettelZeilen: höchstens 4, Rest als mehr, Zeit angehängt", async () => {
  const { zettelZeilen } = await import("../../js/bands/malen.js");
  const ts = ["2026-11-26", "2026-11-29", "2027-02-13", "2027-03-06", "2027-04-15"]
    .map((d, i) => ({ datum: d, zeit: i ? null : "18:00", laden: "L", stadt: "S" }));
  const z = zettelZeilen(ts, "de");
  assert.equal(z.zeilen.length, 4);
  assert.equal(z.mehr, 1);
  assert.deepEqual(z.zeilen[0], { datum: "DO 26.11.", ort: "S · L · 18:00" });
  assert.equal(zettelZeilen(ts, "en").zeilen[0].datum, "THU 26 NOV");
  assert.deepEqual(zettelZeilen([], "de"), { zeilen: [], mehr: 0 });
});

test("zettelLeer: ohne Daten keine Falschaussage „still“", async () => {
  const { zettelLeer } = await import("../../js/bands/malen.js");
  assert.deepEqual(zettelLeer(true, "de"), ["Gerade still.", "Kommt wieder."]);
  assert.deepEqual(zettelLeer(false, "de"), ["Termine gerade", "nicht da."]);
  assert.deepEqual(zettelLeer(false, "en"), ["Gig dates", "unavailable."]);
});
