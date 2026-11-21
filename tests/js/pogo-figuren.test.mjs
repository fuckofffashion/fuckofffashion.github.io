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

test("Figur mit einzelnem Kopf: Kopf ist ein eigenes Teil und fehlt im Rumpf", async () => {
  // baueFigur malt Aufnäher auf Canvas: in Node reicht ein stummer Ersatz
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {} }) }) };
  const { baueFigur } = await import("../../js/pogo/figuren.js");
  const normal = baueFigur(THREE, { haar: ["glatze"], aufnaeher: false });
  const einzeln = baueFigur(THREE, { haar: ["glatze"], aufnaeher: false, kopfEinzeln: true });
  assert.equal(normal.kopf, null);
  assert.ok(einzeln.kopf && einzeln.kopf.parent === einzeln.koerper);
  assert.ok(Math.abs(einzeln.kopf.position.y - 1.56) < 1e-9);
  assert.ok(einzeln.geos[0].attributes.position.count < normal.geos[0].attributes.position.count);
  assert.ok(einzeln.geos.includes(einzeln.kopf.geometry));
});
