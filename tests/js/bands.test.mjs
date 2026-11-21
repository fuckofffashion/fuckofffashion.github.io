// Tests für die Säulen-Logik der Bandseite (js/bands/saeulen.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isoLokal, tageBis, kuenftige, saeuleFuer, gruppiere, monatsSpanne, sichtbare } from "../../js/bands/saeulen.js";

const HEUTE = "2026-11-21";
const t = (datum) => ({ datum, zeit: null, laden: "L", stadt: "S" });

test("saeuleFuer: Grenzen 30/31 und 90/91 Tage", () => {
  assert.equal(saeuleFuer([t("2026-11-21")], HEUTE), "bald");
  assert.equal(saeuleFuer([t("2026-12-21")], HEUTE), "bald");          // Tag 30
  assert.equal(saeuleFuer([t("2026-12-22")], HEUTE), "demnaechst");    // Tag 31
  assert.equal(saeuleFuer([t("2027-02-19")], HEUTE), "demnaechst");    // Tag 90
  assert.equal(saeuleFuer([t("2027-02-20")], HEUTE), "spaeter");       // Tag 91
});

test("saeuleFuer: nur vergangene oder keine Termine → still", () => {
  assert.equal(saeuleFuer([t("2026-11-20")], HEUTE), "still");
  assert.equal(saeuleFuer([], HEUTE), "still");
  assert.equal(saeuleFuer(undefined, HEUTE), "still");
});

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

test("gruppiere: Reihenfolge der Säulen, leere fehlen, Sortierung nach nächstem Termin", () => {
  const daten = { bands: {
    a: { anzahl: 1, termine: [t("2027-03-01")] },
    b: { anzahl: 2, termine: [t("2026-11-30"), t("2027-01-01")] },
    c: { anzahl: 1, termine: [t("2026-11-25")] },
    d: { anzahl: 0, termine: [] },
  } };
  assert.deepEqual(gruppiere(["a", "b", "c", "d"], daten, HEUTE), [
    { saeule: "bald", ids: ["c", "b"] },
    { saeule: "spaeter", ids: ["a"] },
    { saeule: "still", ids: ["d"] },
  ]);
});

test("gruppiere: Band fehlt in den Daten → still, in der Reihenfolge der ids", () => {
  const daten = { bands: { a: { anzahl: 1, termine: [t("2026-12-01")] } } };
  assert.deepEqual(gruppiere(["z", "a", "y"], daten, HEUTE), [
    { saeule: "bald", ids: ["a"] },
    { saeule: "still", ids: ["z", "y"] },
  ]);
});

test("gruppiere: ohne Daten sind alle still", () => {
  assert.deepEqual(gruppiere(["a", "b"], null, HEUTE), [{ saeule: "still", ids: ["a", "b"] }]);
});

test("gruppiere: Daten von gestern – Termin von gestern zählt nicht mehr", () => {
  const daten = { bands: { a: { anzahl: 1, termine: [t("2026-11-20")] } } };
  assert.deepEqual(gruppiere(["a"], daten, HEUTE), [{ saeule: "still", ids: ["a"] }]);
});

test("monatsSpanne: Monate des Zeitraums der Säule", () => {
  assert.equal(monatsSpanne(HEUTE, "bald", "de"), "Nov · Dez");
  assert.equal(monatsSpanne(HEUTE, "demnaechst", "de"), "Dez · Feb");
  assert.equal(monatsSpanne(HEUTE, "spaeter", "de"), "ab Feb");
  assert.equal(monatsSpanne(HEUTE, "bald", "en"), "Nov · Dec");
  assert.equal(monatsSpanne(HEUTE, "spaeter", "en"), "from Feb");
  assert.equal(monatsSpanne(HEUTE, "still", "de"), "");
  assert.equal(monatsSpanne("2026-11-01", "bald", "de"), "Nov · Dez");
  assert.equal(monatsSpanne("2026-06-01", "bald", "de"), "Juni · Juli");
});

test("sichtbare: ohne alle die ersten 4", () => {
  const sechs = ["01", "02", "03", "04", "05", "06"].map((d) => t(`2026-12-${d}`));
  assert.equal(sichtbare(sechs, false).length, 4);
  assert.equal(sichtbare(sechs, true).length, 6);
});
