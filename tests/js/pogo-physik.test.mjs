// Tests für die Physik der Menge (js/pogo/physik.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { person, bewegeMenge, randSchubs, integriere, stoesse } from "../../js/pogo/physik.js";
import { teilBei } from "../../js/pogo/regeln.js";

const L = { x: 3.3, z: [-4.2, 4.2], gitterZ: -3.6, pfeiler: null, wall: false };
const fest = () => { let s = 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

test("stoesse: Überlappung wird aufgelöst", () => {
  const a = person({ x: 0, z: 0 }), b = person({ x: 0.2, z: 0 });
  stoesse([a, b]);
  assert.ok(Math.hypot(b.x - a.x, b.z - a.z) >= a.r + b.r - 1e-9);
});

test("stoesse: Treffer mit dir hat eine Stärke, in der Luft gibt es keinen", () => {
  const ich = person({ x: 0, z: 0, ich: true }), b = person({ x: 0.5, z: 0 });
  b.vx = -4;
  const treffer = stoesse([ich, b]);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].anderer, b);
  assert.ok(treffer[0].schlag > 0);
  const ich2 = person({ x: 0, z: 0, ich: true }), c = person({ x: 0.5, z: 0 });
  c.vx = -4; ich2.inLuft = true;
  assert.equal(stoesse([ich2, c]).length, 0);
});

test("stoesse: Rempeleien ohne dich zählen nicht als Treffer", () => {
  const a = person({ x: 0, z: 0 }), b = person({ x: 0.5, z: 0 });
  b.vx = -4;
  assert.equal(stoesse([a, b]).length, 0);
});

test("randSchubs: am Rand Richtung Mitte, im Pit nichts", () => {
  const ich = person({ x: 3.0, z: 0, ich: true });
  assert.equal(randSchubs(ich, L, 0.1), true);
  assert.ok(ich.vx < 0);
  const ich2 = person({ x: 0, z: 1.5, ich: true });
  assert.equal(randSchubs(ich2, L, 0.1), false);
  assert.equal(ich2.vx, 0);
});

test("integriere: niemand landet vor dem Gitter oder in der Wand", () => {
  const p = person({ x: 0, z: -3.5 }); p.vz = -20;
  const q = person({ x: 3.2, z: 0 }); q.vx = 20;
  integriere([p, q], L, 0.1);
  assert.ok(p.z >= L.gitterZ + p.r - 1e-9);
  assert.ok(q.x <= L.x - q.r + 1e-9);
});

test("integriere: Pfeiler schiebt aus sich heraus", () => {
  const LP = { ...L, pfeiler: { x: 0, z: 0, r: 0.32 } };
  const p = person({ x: 0.1, z: 0 });
  integriere([p], LP, 0.016);
  assert.ok(Math.hypot(p.x, p.z) >= 0.32 + p.r - 1e-9);
});

test("bewegeMenge: mit festem Zufall immer gleich, Rand bleibt beim Anker", () => {
  const baue = () => [person({ x: 0, z: 0 }), person({ x: 1, z: 1 }), person({ x: 3, z: 2, rand: true })];
  const a = baue(), b = baue();
  const za = fest(), zb = fest();
  for (let i = 0; i < 30; i++) { bewegeMenge(a, L, teilBei(25), 0.02, za); integriere(a, L, 0.02); bewegeMenge(b, L, teilBei(25), 0.02, zb); integriere(b, L, 0.02); }
  assert.deepEqual(a.map((p) => [p.x, p.z]), b.map((p) => [p.x, p.z]));
  assert.ok(Math.hypot(a[2].x - 3, a[2].z - 2) < 0.3);
});
