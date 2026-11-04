// Tests für die Copyshop-Karte: Projektion und Haufenbildung (ohne DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { projiziere, haufen } from "../../js/konzerte/karte.js";
import { MIN_BREITE, begrenze, hoehe, maxBreite, passend, stufeVon, zoomUm } from "../../js/konzerte/kartenansicht.js";

test("10°O/51°N ist der Nullpunkt", () => {
  const [x0, y0] = projiziere(51, 10);
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(y0) < 1e-9);
});

test("Kleve–Nijmegen liegt auf der Karte bei rund 20,9 km", () => {
  const a = projiziere(51.7883, 6.1387);
  const b = projiziere(51.8126, 5.8372);
  assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - 20.9) < 1);
});

test("Osten ist rechts, Norden ist oben (SVG-y wächst nach Süden)", () => {
  const [xo] = projiziere(51, 11);
  const [, yn] = projiziere(52, 10);
  assert.ok(xo > 0);
  assert.ok(yn < 0);
  // ein Breitengrad sind rund 111 km
  assert.ok(Math.abs(-yn - 111.2) < 0.5);
});

test("nahe Punkte bilden einen Haufen, ferne einen eigenen", () => {
  assert.equal(haufen([{ x: 0, y: 0, id: "a" }, { x: 1, y: 0, id: "b" }, { x: 100, y: 0, id: "c" }], 10, 1).length, 2);
});

test("Haufen behält die Reihenfolge der Ids (gierig, erster Punkt gründet)", () => {
  const h = haufen([{ x: 0, y: 0, id: "a" }, { x: 100, y: 0, id: "c" }, { x: 2, y: 0, id: "b" }], 10, 1);
  assert.deepEqual(h.map((k) => k.ids), [["a", "b"], ["c"]]);
});

test("der Maßstab rechnet Pixel in km um", () => {
  const p = [{ x: 0, y: 0, id: "a" }, { x: 5, y: 0, id: "b" }];
  // 10 px bei 1 px/km = 10 km Radius: ein Haufen
  assert.equal(haufen(p, 10, 1).length, 1);
  // 10 px bei 4 px/km = 2,5 km Radius: zwei Haufen
  assert.equal(haufen(p, 10, 4).length, 2);
});

test("Haufen liegt am Gründer, nicht im Mittel (Nachbarn überlappen so nicht)", () => {
  const [h] = haufen([{ x: 0, y: 0, id: "a" }, { x: 4, y: 2, id: "b" }], 10, 1);
  assert.deepEqual([h.x, h.y], [0, 0]);
});

test("Gründer zweier Haufen liegen weiter als der Radius auseinander", () => {
  const p = Array.from({ length: 200 }, (_, i) => ({ x: (i * 37) % 101, y: (i * 53) % 89, id: String(i) }));
  const h = haufen(p, 12, 1);
  for (let i = 0; i < h.length; i++) {
    for (let j = i + 1; j < h.length; j++) assert.ok(Math.hypot(h[i].x - h[j].x, h[i].y - h[j].y) > 12);
  }
});

test("Gitter verliert keine Nachbarn über Zellgrenzen", () => {
  // Gründer knapp links einer Zellgrenze, Nachbar knapp rechts davon
  const h = haufen([{ x: 9.9, y: -0.1, id: "a" }, { x: 10.1, y: 0.1, id: "b" }], 10, 1);
  assert.equal(h.length, 1);
});

test("leere Eingabe ergibt keine Haufen", () => {
  assert.deepEqual(haufen([], 10, 1), []);
});

// Ansicht: {cx, cy, w} in km, Rahmen {W, H, gebiet} in Pixeln bzw. km ---------------
const RAHMEN = { W: 800, H: 400, gebiet: { x0: -520, y0: -460, x1: 360, y1: 420 } };
// km-Punkt unter einem Bildschirmpunkt
const unter = (r, a, px, py) => [a.cx - a.w / 2 + (px * a.w) / r.W, a.cy - hoehe(r, a.w) / 2 + (py * a.w) / r.W];

test("Zoom um den Zeiger: der Punkt unter dem Zeiger bleibt stehen", () => {
  const a = { cx: 0, cy: 0, w: 400 };
  for (const [px, py, f] of [[100, 50, 0.5], [700, 380, 1.7], [400, 200, 0.8]]) {
    const b = zoomUm(RAHMEN, px, py, f, a);
    const [x0, y0] = unter(RAHMEN, a, px, py);
    const [x1, y1] = unter(RAHMEN, b, px, py);
    assert.ok(Math.abs(x0 - x1) < 1e-9 && Math.abs(y0 - y1) < 1e-9, `${px},${py},${f}`);
    assert.ok(Math.abs(b.w - a.w * f) < 1e-9);
  }
});

test("Zoom und Begrenzung halten 60 km bis Gesamtgebiet ein", () => {
  assert.equal(zoomUm(RAHMEN, 400, 200, 0.01, { cx: 0, cy: 0, w: 400 }).w, MIN_BREITE);
  assert.equal(begrenze(RAHMEN, { cx: 0, cy: 0, w: 1 }).w, MIN_BREITE);
  assert.equal(begrenze(RAHMEN, { cx: 0, cy: 0, w: 1e9 }).w, maxBreite(RAHMEN));
  // Gesamtgebiet passt ganz hinein (hier bestimmt die Höhe: 880 km bei 2:1)
  assert.ok(hoehe(RAHMEN, maxBreite(RAHMEN)) >= 880);
  // Mitte bleibt im Gebiet
  assert.deepEqual(begrenze(RAHMEN, { cx: 9999, cy: -9999, w: 100 }), { cx: 360, cy: -460, w: 100 });
});

test("passend rahmt den Umkreis ganz ein, ohne Ort das ganze Gebiet", () => {
  const a = passend(RAHMEN, { lat: 51, lon: 10 }, 100);
  assert.deepEqual([a.cx, a.cy], [0, 0]);
  assert.ok(a.w >= 200 && hoehe(RAHMEN, a.w) >= 200);
  const g = passend(RAHMEN, null, null);
  assert.equal(g.w, maxBreite(RAHMEN));
  assert.deepEqual([g.cx, g.cy], [-80, -20]);
});

test("Zoomstufen in halben Oktaven", () => {
  assert.deepEqual(stufeVon(1), { stufe: 0, mq: 1 });
  assert.deepEqual(stufeVon(2), { stufe: 2, mq: 2 });
  assert.equal(stufeVon(1.1).stufe, stufeVon(0.95).stufe);
});
