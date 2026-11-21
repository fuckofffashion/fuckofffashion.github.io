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

test("Skelett aus Marks Ansichten: Ansicht nach Kamerawinkel", async () => {
  const { skelettAnsicht } = await import("../../js/pogo/figuren.js");
  assert.deepEqual(skelettAnsicht(0), { bild: "vorne", spiegeln: false });
  assert.deepEqual(skelettAnsicht(15), { bild: "vorne", spiegeln: false });
  assert.equal(skelettAnsicht(40).bild, "dreiviertel");
  assert.notEqual(skelettAnsicht(40).spiegeln, skelettAnsicht(-40).spiegeln);
  assert.equal(skelettAnsicht(90).bild, "rechts");
  assert.equal(skelettAnsicht(-90).bild, "links");
  assert.equal(skelettAnsicht(170).bild, "hinten");
  assert.equal(skelettAnsicht(-170).bild, "hinten");
});

test("Skelett: Bilder liegen bereit, Kiefer sprechen", async () => {
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { SKELETT_BILDER, baueSkelett } = await import("../../js/pogo/figuren.js");
  const wurzel = fileURLToPath(new URL("../../", import.meta.url));
  for (const p of Object.values(SKELETT_BILDER)) assert.ok(existsSync(wurzel + p), p);
  const tex = Object.fromEntries(Object.keys(SKELETT_BILDER).map((k) => [k, new THREE.Texture()]));
  const s = baueSkelett(THREE, tex);
  assert.ok(s.g.isGroup && s.kiefer.isMesh);
  s.sprich(1); assert.ok(s.kiefer.position.y < s.kieferRuhe - 0.02, "Kiefer klappt nach unten");
  s.sprich(0); assert.equal(s.kiefer.position.y, s.kieferRuhe);
  s.zeige(90); assert.equal(s.kiefer.visible, false, "Kiefer nur in der Vorderansicht");
  s.zeige(0); assert.equal(s.kiefer.visible, true);
});
