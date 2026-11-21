// Tests für die Mechaniken aus Etappe 5 (js/pogo/pit.js): Combo, Stimmung, Mitgrölen, Wall, Circle Pit, Schultern, Aufheben.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMBO, comboStufe, comboTakt, comboLuecke, STIMMUNG, mitStimmung, stimmungAbfall, zugabeTreffer,
  groelWort, WALL, wallWertung, kreisZeit, kreisTangente, stromWertung, SCHULTERN, wackle, runtergefallen, AUFHEBEN,
} from "../../js/pogo/pit.js";
import { SONGS, BEAT } from "../../js/pogo/songs.js";
import { ZUGABE } from "../../js/pogo/regeln.js";

test("Combo: alle 4 Takt-Sprünge eine Stufe, höchstens ×4", () => {
  assert.deepEqual(COMBO, { proStufe: 4, max: 4, luecke: 2 });
  assert.equal(comboStufe(0), 1);
  assert.equal(comboStufe(3), 1);
  assert.equal(comboStufe(4), 2);
  assert.equal(comboStufe(12), 4);
  assert.equal(comboStufe(99), 4);
});

test("Combo: Serie wächst im Takt, Lücke von mehr als 2 Schlägen bricht sie", () => {
  let c = { serie: 0, letzterSchlag: null };
  for (let s = 10; s < 14; s++) c = comboTakt(c, s).combo;
  assert.equal(c.serie, 4);
  const r = comboTakt(c, 14);
  assert.equal(r.combo.serie, 5);
  assert.equal(r.neueStufe, false);
  const s4 = comboTakt({ serie: 3, letzterSchlag: 20 }, 21);
  assert.equal(s4.neueStufe, true); // 4. Sprung: Stufe 2
  assert.equal(comboLuecke({ serie: 5, letzterSchlag: 30 }, 32), false);
  assert.equal(comboLuecke({ serie: 5, letzterSchlag: 30 }, 33), true);
  assert.equal(comboLuecke({ serie: 0, letzterSchlag: null }, 99), false);
  // nach einer Lücke beginnt die Serie neu
  assert.equal(comboTakt({ serie: 7, letzterSchlag: 30 }, 34).combo.serie, 1);
});

test("Stimmung: steigt, kocht bei 100, sinkt langsam; ab 60 reichen 4 Zugabe-Treffer", () => {
  assert.equal(STIMMUNG.max, 100);
  assert.deepEqual(mitStimmung(50, 10), { wert: 60, kocht: false });
  assert.deepEqual(mitStimmung(95, 10), { wert: 100, kocht: true });
  assert.equal(stimmungAbfall(0.5, 2), 0);
  assert.equal(stimmungAbfall(3, 1), 1);
  assert.equal(zugabeTreffer(59), ZUGABE.treffer);
  assert.equal(zugabeTreffer(60), 4);
  assert.deepEqual(STIMMUNG.plus, { takt: 1, combo: 4, groelen: 10, aufheben: 15, wall: 15, schnoesel: 15, fascho: 20 });
  // nach Spieletest 3: seltener und schwächer kochen (Höhepunkt statt Dauerzustand)
  assert.equal(STIMMUNG.abfall, 2); assert.equal(STIMMUNG.kochtDauer, 8); assert.equal(STIMMUNG.faktor, 1.5);
  assert.equal(stimmungAbfall(10, 2), 6);
});

test("Mitgrölen: nur in den Refrains, ein Wort pro Schlag, nur Titelworte", () => {
  const dan = SONGS[0];
  assert.deepEqual(dan.groelen.worte, ["ES", "GEHT", "NOCH", "LAUTER!"]);
  assert.equal(groelWort(10, dan), null); // Strophe
  const v = 60 / dan.bpm;
  const a = groelWort(dan.start + 60 * v, dan); // Schlag 60 ≈ 28 s: erster Refrain
  assert.equal(a.schlag, 60);
  assert.equal(a.index, 0);
  assert.equal(groelWort(dan.start + 61 * v, dan).wort, "GEHT");
  assert.equal(groelWort(30, BEAT), null); // ohne Eintrag kein Mitgrölen
});

test("Wall of Death: perfekter Start innerhalb eines Schlags, zu früh verliert", () => {
  assert.deepEqual(WALL, { bonus: 400 });
  assert.equal(wallWertung({ losZeit: 40, startZeit: 40.3, zuFrueh: false, bpm: 120 }), "perfekt");
  assert.equal(wallWertung({ losZeit: 40, startZeit: 40.6, zuFrueh: false, bpm: 120 }), "spaet");
  assert.equal(wallWertung({ losZeit: 40, startZeit: 40.1, zuFrueh: true, bpm: 120 }), "zufrueh");
  assert.equal(wallWertung({ losZeit: 40, startZeit: null, zuFrueh: false, bpm: 120 }), "spaet");
});

test("Circle Pit: im ersten Refrain, höchstens 10 s; Tangente und Strom", () => {
  const dan = SONGS[0];
  assert.deepEqual(kreisZeit(dan), { von: 22, bis: 30 });
  const t = kreisTangente(1, 0, 0, 0, 1);
  assert.ok(Math.abs(Math.hypot(t.x, t.z) - 1) < 1e-9);
  assert.ok(Math.abs(t.x) < 1e-9);
  const g = kreisTangente(1, 0, 0, 0, -1);
  assert.ok(Math.abs(g.z + t.z) < 1e-9); // andere Richtung
  assert.equal(stromWertung(0, 2, 0, 1), "mit");
  assert.equal(stromWertung(0, -2, 0, 1), "gegen");
  assert.equal(stromWertung(2, 0, 0, 1), "neutral");
  assert.equal(stromWertung(0, 0.3, 0, 1), "neutral"); // zu langsam
});

test("Schultern: Wackeln wächst ohne Gegenhalten, Gegenhalten fängt es, über 1 fällt man", () => {
  assert.deepEqual(SCHULTERN, { dauer: 8, faktor: 2, drift: 1.6, instabil: 0.9, korrektur: 3, fallBier: 15, reichweite: 0.9 });
  let w = 0.3;
  for (let i = 0; i < 40; i++) w = wackle(w, 0, 0.05, 0.5);
  assert.ok(w > 0.9, "ohne Gegenhalten kippt es");
  let v = 0.3;
  for (let i = 0; i < 40; i++) v = wackle(v, Math.sign(v), 0.05, 0.5);
  assert.ok(Math.abs(v) < 0.3, "gegenhalten fängt es");
  assert.equal(runtergefallen(1.01), true);
  assert.equal(runtergefallen(-0.99), false);
});

test("Aufheben: Werte", () => {
  assert.deepEqual(AUFHEBEN, { max: 3, erstesNach: 8, alle: 12, wartet: 6, reichweite: 0.8, bonus: 150, bier: 10 });
});
