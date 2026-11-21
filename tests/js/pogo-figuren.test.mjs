// Test für das Zusammenfügen der Figurteile (js/pogo/figuren.js) mit dem vendorten three.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../../assets/vendor/three.module.min.js";
import { fuegeZusammen } from "../../js/pogo/figuren.js";

test("fuegeZusammen: zwei Boxen ergeben eine Geometrie mit Farben und versetzten Indizes", () => {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const n = box.attributes.position.count, i = box.index.count;
  const m = new THREE.Matrix4().makeTranslation(2, 0, 0);
  const geo = fuegeZusammen(THREE, [{ geo: box, farbe: "#ff0000" }, { geo: box, farbe: "#00ff00", matrix: m }]);
  assert.equal(geo.attributes.position.count, 2 * n);
  assert.equal(geo.index.count, 2 * i);
  assert.ok(geo.attributes.normal);
  assert.equal(geo.attributes.color.count, 2 * n);
  assert.equal(geo.index.array[i], box.index.array[0] + n);
  // zweite Box verschoben, Farbe grün
  assert.ok(Math.abs(geo.attributes.position.getX(n) - (box.attributes.position.getX(0) + 2)) < 1e-6);
  assert.ok(geo.attributes.color.getY(n) > 0.9 && geo.attributes.color.getX(n) < 0.1);
});

test("Füllring: zeigt den Anteil als Bogen, begrenzt auf 0 bis voll", async () => {
  const { setzeFortschritt, FORTSCHRITT_TEILE } = await import("../../js/pogo/figuren.js");
  const geo = new THREE.RingGeometry(0.55, 0.66, FORTSCHRITT_TEILE);
  setzeFortschritt(geo, 0); assert.equal(geo.drawRange.count, 0);
  setzeFortschritt(geo, 0.5); assert.equal(geo.drawRange.count, 6 * FORTSCHRITT_TEILE / 2);
  setzeFortschritt(geo, 1.7); assert.equal(geo.drawRange.count, geo.index.count);
  setzeFortschritt(geo, -1); assert.equal(geo.drawRange.count, 0);
});

test("Totenkopf wie im Bandlogo: Schädel, Augen, Hut, beweglicher Kiefer", async () => {
  const { baueSchaedel } = await import("../../js/pogo/figuren.js");
  const s = baueSchaedel(THREE);
  assert.ok(s.g.isGroup);
  assert.ok(s.kiefer && s.g.getObjectById(s.kiefer.id), "Kiefer hängt am Schädel");
  assert.ok(s.hut && s.g.getObjectById(s.hut.id), "Hut wie im Logo");
  let meshes = 0; s.g.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes >= 10 && meshes <= 40, `Teile: ${meshes}`);
  assert.ok(s.geos.length > 0 && s.mats.length > 0);
  // Schädel überdeckt den Figurkopf (Radius 0,15)
  const box = new THREE.Box3().setFromObject(s.g);
  assert.ok(box.max.x - box.min.x > 0.32, "breiter als der Kopf");
  s.sprich(1); assert.ok(s.kiefer.rotation.x < -0.3, "Kinn nach unten");
  s.sprich(0); assert.equal(Math.abs(s.kiefer.rotation.x), 0);
});
