// Tests für Andenken (js/pogo/andenken.js) und Aufgaben (js/pogo/aufgaben.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { leseKutte, schreibeKutte, mitFang, kutteText } from "../../js/pogo/andenken.js";
import { AUFGABEN, ziehe, AUFGABE_PUNKTE } from "../../js/pogo/aufgaben.js";

const speicher = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const kaputt = { getItem() { throw new Error("gesperrt"); }, setItem() { throw new Error("voll"); } };

test("Kutte: speichern und wieder lesen", () => {
  const s = speicher();
  const k = mitFang(mitFang({}, ["plektrum", "plektrum"]), ["drumstick"]);
  assert.deepEqual(k, { plektrum: 2, drumstick: 1 });
  assert.equal(schreibeKutte(s, k), true);
  assert.deepEqual(leseKutte(s), { plektrum: 2, drumstick: 1 });
});

test("Kutte: gesperrter Speicher und Müll im Speicher werfen nicht", () => {
  assert.deepEqual(leseKutte(kaputt), {});
  assert.equal(schreibeKutte(kaputt, { plektrum: 1 }), false);
  const s = speicher(); s.setItem("fof-pogo-kutte-v1", "{kaputt");
  assert.deepEqual(leseKutte(s), {});
  s.setItem("fof-pogo-kutte-v1", JSON.stringify({ plektrum: "viele", setliste: 2, fremd: 9 }));
  assert.deepEqual(leseKutte(s), { setliste: 2 });
  assert.deepEqual(leseKutte(null), {});
});

test("Kutte: Text mit Einzahl und Mehrzahl, leer", () => {
  assert.equal(kutteText({ plektrum: 3, drumstick: 1 }, "de"), "3 Plektren, 1 Drumstick");
  assert.equal(kutteText({ setliste: 2 }, "en"), "2 setlists");
  assert.equal(kutteText({}, "de"), "noch leer");
  assert.equal(kutteText({}, "en"), "still empty");
});

const leer = { reiheImLetztenRefrain: false, gefangen: [], mitteSekunden: 0, stagediveBier: null, taktSpruenge: 0, surferTreffer: 0, surferGesehen: 0 };
const auf = (id) => AUFGABEN.find((a) => a.id === id);

test("Aufgaben: Bedingungen an ihren Grenzen", () => {
  assert.equal(AUFGABE_PUNKTE, 250);
  assert.equal(auf("mitte10").erfuellt({ ...leer, mitteSekunden: 9.9 }), false);
  assert.equal(auf("mitte10").erfuellt({ ...leer, mitteSekunden: 10 }), true);
  assert.equal(auf("takt8").erfuellt({ ...leer, taktSpruenge: 7 }), false);
  assert.equal(auf("takt8").erfuellt({ ...leer, taktSpruenge: 8 }), true);
  assert.equal(auf("stagediveVoll").erfuellt({ ...leer, stagediveBier: 50 }), true);
  assert.equal(auf("stagediveVoll").erfuellt({ ...leer, stagediveBier: 49 }), false);
  assert.equal(auf("stagediveVoll").erfuellt(leer), false);
  assert.equal(auf("plektrum").erfuellt({ ...leer, gefangen: ["plektrum"] }), true);
  assert.equal(auf("reiheLetzterRefrain").erfuellt({ ...leer, reiheImLetztenRefrain: true }), true);
  assert.equal(auf("surferUeberlebt").erfuellt({ ...leer, surferGesehen: 1, surferTreffer: 0 }), true);
  assert.equal(auf("surferUeberlebt").erfuellt({ ...leer, surferGesehen: 1, surferTreffer: 1 }), false);
  assert.equal(auf("surferUeberlebt").erfuellt(leer), false);
});

test("Aufgaben: zwei verschiedene, ohne Crowdsurfer nie die Surfer-Aufgabe", () => {
  for (let i = 0; i < 1000; i++) {
    const [a, b] = ziehe({ surfer: false });
    assert.notEqual(a.id, b.id);
    assert.ok(a.id !== "surferUeberlebt" && b.id !== "surferUeberlebt");
  }
  const ids = new Set();
  for (let i = 0; i < 500; i++) ziehe({ surfer: true }).forEach((a) => ids.add(a.id));
  assert.equal(ids.size, AUFGABEN.length);
});

test("Kutte: abgeguckte Motive werden gemerkt, doppelt nur einmal, Text zählt sie", async () => {
  const { mitMotiv } = await import("../../js/pogo/andenken.js");
  const s = speicher();
  let k = mitMotiv(mitMotiv(mitMotiv({}, "007"), "007"), "013");
  assert.deepEqual(k.motive, ["007", "013"]);
  schreibeKutte(s, k);
  assert.deepEqual(leseKutte(s).motive, ["007", "013"]);
  s.setItem("fof-pogo-kutte-v1", JSON.stringify({ motive: ["007", 5, "<x>", "999"] }));
  assert.deepEqual(leseKutte(s).motive, ["007", "999"]);
  assert.equal(kutteText({ motive: ["007"] }, "de"), "1 Motiv");
  assert.equal(kutteText({ plektrum: 1, motive: ["007", "013"] }, "en"), "1 pick, 2 designs");
});
