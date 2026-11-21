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
