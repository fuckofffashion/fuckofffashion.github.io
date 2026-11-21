// Tests für die Geometrie der 3D-Säule (js/bands/geometrie.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { gitter, forme, PLATZ, richtung, R } from "../../js/bands/geometrie.js";

const S = { th: 0, y: 1, w: 0.8, h: 0.8, r: 1.008 };
const radius = (pos, i) => Math.hypot(pos[i], pos[i + 2]);

test("gitter: Größen passen zu nu × nv", () => {
  const g = gitter(4, 3);
  assert.equal(g.pos.length, 5 * 4 * 3);
  assert.equal(g.uv.length, 5 * 4 * 2);
  assert.equal(g.index.length, 4 * 3 * 6);
  assert.equal(R, 1);
});

test("forme p=0: alle Punkte auf Radius r, Höhe im Plakat", () => {
  const g = gitter(4, 4);
  forme(g.pos, 4, 4, S, 0);
  for (let i = 0; i < g.pos.length; i += 3) {
    assert.ok(Math.abs(radius(g.pos, i) - 1.008) < 1e-6);
    assert.ok(g.pos[i + 1] >= 0.6 - 1e-9 && g.pos[i + 1] <= 1.4 + 1e-9);
  }
});

test("forme p=1: jeder Punkt ist abgehoben", () => {
  const g = gitter(4, 4);
  forme(g.pos, 4, 4, S, 1);
  for (let i = 0; i < g.pos.length; i += 3) assert.ok(radius(g.pos, i) > 1.05, `Punkt ${i / 3}`);
});

test("forme kleines p: nur unten rechts hebt sich, oben links bleibt", () => {
  const g = gitter(4, 4);
  forme(g.pos, 4, 4, S, 0.17);
  const k = (i, j) => (j * 5 + i) * 3;
  assert.ok(radius(g.pos, k(4, 0)) > 1.01);            // unten rechts
  assert.ok(Math.abs(radius(g.pos, k(0, 4)) - 1.008) < 1e-6); // oben links
});

test("PLATZ: 16 Plätze, keine Überlappung in einer Reihe", () => {
  assert.equal(PLATZ.length, 16);
  assert.deepEqual(PLATZ.slice(0, 4), [[-0.425, 1.62], [0.43, 1.65], [-0.41, 0.78], [0.44, 0.8]]);
  for (const [a, b] of PLATZ.flatMap((p, i) => PLATZ.slice(i + 1).map((q) => [p, q]))) {
    if (Math.abs(a[1] - b[1]) < 0.8) {
      const d = Math.abs(a[0] - b[0]) % (2 * Math.PI);
      assert.ok(Math.min(d, 2 * Math.PI - d) >= 0.82, `${a} ${b}`);
    }
  }
});

test("richtung: waagerecht dreht, senkrecht scrollt, kurz ist nichts", () => {
  assert.equal(richtung(3, 2), null);
  assert.equal(richtung(20, 5), "dreh");
  assert.equal(richtung(-20, 5), "dreh");
  assert.equal(richtung(4, 30), "scroll");
});
