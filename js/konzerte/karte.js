// Copyshop-Karte: die Treffer auf einer schwarz-weißen Kopie von DE/NL/BE/LU, Haufen statt Tausender Punkte.
// Die Karte ist Beiwerk und aria-hidden; die Liste ist die zugängliche Ansicht.
// Aufbau: Das äußere <svg> rechnet in Bildschirmpixeln. Darin zwei innere <svg> mit derselben viewBox in km:
// der Kartengrund unter dem Kopierer-Filter (Korn in Pixeln, bleibt beim Zoomen gleich grob) und die Marker
// ohne Filter. Zoomen und Verschieben ändern nur die viewBox; die Haufen werden je Zoomstufe einmal gebildet.

import { MIN_BREITE, begrenze, hoehe, maxBreite, passend, projiziere, stufeVon, umfasse, zoomUm } from "./kartenansicht.js?v=25";

export { projiziere }; // Projektion und Ansichtsrechnung liegen in kartenansicht.js

// Gierige Haufen in Reihenfolge der Punkte: Ein Punkt schließt sich dem nächsten Gründer an, der höchstens
// radiusPx entfernt liegt (massstab = Pixel je km), sonst gründet er einen eigenen Haufen.
// Ein Haufen liegt am Gründer; Gründer liegen mehr als radiusPx auseinander, Kreise überlappen so kaum.
// Ein Gitter mit Zellen von Radiusgröße hält das bei 8.000 Punkten linear.
export function haufen(punkte, radiusPx, massstab) {
  const r = radiusPx / massstab;
  const r2 = r * r;
  const gitter = new Map();
  const zelle = (i, j) => i * 1e6 + j;
  const alle = [];
  for (const p of punkte) {
    const i = Math.floor(p.x / r);
    const j = Math.floor(p.y / r);
    let ziel = null;
    let best = Infinity;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (const h of gitter.get(zelle(i + di, j + dj)) ?? []) {
          const d = (h.x - p.x) ** 2 + (h.y - p.y) ** 2;
          if (d <= r2 && d < best) { best = d; ziel = h; }
        }
      }
    }
    if (!ziel) {
      ziel = { x: p.x, y: p.y, ids: [] };
      const k = zelle(i, j);
      if (!gitter.has(k)) gitter.set(k, []);
      gitter.get(k).push(ziel);
      alle.push(ziel);
    }
    ziel.ids.push(p.id);
  }
  return alle;
}

// Zeichnen ------------------------------------------------------------------
const NS = "http://www.w3.org/2000/svg";
const KARTE_URL = "data/karte.json";
const HAUFEN_PX = 38; // Fangradius eines Haufens auf dem Bildschirm (größer als der Kreis, damit wenig überlappt)
const MARKER_PX = 28;
const STADT_PX = 70; // Mindestabstand zwischen zwei Stadtnamen
const FAHRT_MS = 320;
const RUHE_MS = 200; // so lange nach der letzten Bewegung bleiben die Filter aus
const SCROLL_SPERRE_MS = 400; // Rad kurz nach Seitenscrollen gehört noch der Seite
// Stadtnamen, die bei Platzmangel gewinnen; der Rest folgt alphabetisch
const VORRANG = ["Berlin", "Hamburg", "München", "Köln", "Frankfurt", "Amsterdam", "Brüssel", "Stuttgart", "Leipzig",
  "Dresden", "Hannover", "Bremen", "Rotterdam", "Nürnberg", "Düsseldorf", "Dortmund", "Antwerpen", "Kiel", "Rostock"];
// Eingekreistes A aus Motiv 007 „Skate or Die“, kleine Fassung ohne Stiche (tools/build-a-zeichen.py,
// assets/img/anarchie-a-klein.svg), Raster 0 0 626 541
const A_PFAD = "M475 539c0-1-2-4-3-7c-2-2-4-7-5-9c-2-5-7-15-8-15c0 0-1 4 0 9c0 10-1 13-5 13c-3 0-4-1-5-5c-6-19-13-35-16-35c-2 1-24 15-27 17c-1 1-5 3-9 4c-4 2-10 4-15 6c-5 2-12 5-17 6c-4 0-11 2-14 3c-19 6-60 6-93 0c-3-1-9-2-12-2c-17-2-47-15-68-28c-11-8-14-6-17 7c-1 8-1 8-5 10c-5 2-7 4-9 9c-7 15-19 9-13-6c1-4 2-6 1-6c-1-2-2-1-11 10c-6 6-9 6-10-2c-1-6 0-5-5-7c-6-3-6-10 0-18c1-2 3-5 3-8c1-4 8-24 10-28c1-2 0-3-3-6c-2-2-6-7-9-11c-3-3-8-9-11-12c-5-7-10-14-19-30c-8-14-10-18-14-32c-3-9-5-13-6-14c-2-1-18 1-28 3c-15 3-23-4-10-10c3-1 4-2 4-5c0-6-1-6-10-5c-11 2-16 1-16-4c0-4 6-7 15-9c11-2 15-7 6-8c-12-2-4-15 11-17c24-3 26-5 25-14c0-2 0-7 1-11c1-3 2-11 2-18c4-30 24-89 32-95c1 0 2-3 4-7c2-3 4-8 6-10c2-2 7-8 11-13c13-18 34-36 51-45c2-1 6-4 9-6c5-4 24-15 31-17c3-1 6-2 9-4c2-1 7-2 10-3c3 0 9-1 13-2c12-4 21-6 28-7c11-1 13-3 11-8c-2-5-1-7 2-10c3-3 3-3 2-9c-1-10 4-14 10-10c4 2 4 2 9-3c5-6 6-6 12-1c6 5 7 5 11 0c3-5 6-5 9-2c2 1 4 3 6 5c3 3 4 8 6 22c0 7 2 10 5 10c1 0 4 1 5 2c1 0 4 1 7 1c2 0 6 0 8 1c2 0 7 1 11 2c20 3 59 19 66 27c1 1 3 3 4 3c8 0 42 32 51 48c1 2 4 5 5 7c2 2 3 4 3 5c0 0 1 2 2 3c3 4 12 21 14 28c1 3 3 8 4 12c1 3 3 7 4 10c1 2 2 6 3 10c1 3 2 10 4 14c1 5 2 11 3 14c1 6 3 7 7 5c4-2 6-2 20-1c11 1 18 1 26 0c9-1 11-1 14 1c6 2 7 8 1 10c-4 1-11 5-11 7c0 1 1 1 4 1c19-3 24-2 24 3c0 6-8 9-26 10c-13 1-17 2-17 5c0 1 2 2 8 2c8 1 10 2 9 5c-1 4-3 5-25 8c-24 3-26 3-27 4c0 1-2 8-2 16c-2 13-2 16-5 33c-3 12-10 36-13 40c-2 2-7 12-12 22c-5 10-11 19-12 21c-3 3-22 28-23 29c0 1 1 4 3 8c4 12 17 51 17 53c0 10-13 7-18-5c-1-3-3-5-3-5c-2 0 0 13 3 19c3 5 3 16 1 21c-2 4-7 4-9 1zM321 486c7-1 15-2 19-3c4-1 8-2 10-2c4 0 13-3 19-7c10-5 14-7 16-7c2-1 5-3 7-4c2-2 5-4 6-4c1 0 4-2 7-4c3-3 8-6 10-7c8-5 7-9-2-33c-2-5-4-11-5-14c0-2-2-7-3-10c-2-3-4-11-6-17c-2-6-4-13-5-14c-1-2-3-7-4-12c-2-5-4-10-5-12c-1-2-2-6-3-8c-1-3-2-9-4-13c-2-4-3-9-3-10c0-7-3-7-11-3c-4 1-9 3-12 3c-3 0-9 2-14 2c-5 1-13 3-19 4c-6 0-14 2-19 3c-4 0-10 1-12 1c-2 0-6 1-9 1c-3 1-7 2-9 2c-2 0-7 1-11 1c-4 1-11 2-16 3c-10 1-11 2-14 10c-1 4-3 11-5 16c-1 4-3 10-5 11c-1 2-3 7-5 11c-1 5-3 11-5 14c-2 2-3 6-3 7c-1 1-2 5-3 7c-6 13-9 20-10 24c-1 2-2 5-3 6c-4 6-8 24-5 24c0 0 6 3 13 7c17 10 20 11 31 15c5 2 10 4 11 4c2 1 6 2 10 3c4 1 11 2 15 3c5 1 8 2 9 2c0-1 6 0 14 0c7 1 14 2 16 1c3 0 10 0 17-1zM141 408c1-2 3-8 6-13c2-5 6-14 8-19c1-4 4-11 6-15c2-3 3-7 3-7c0-1 2-6 4-10c4-10 4-11 1-11c-1 1-6 1-11 2c-5 1-11 2-13 2c-2 1-9 3-15 3c-25 4-26 4-24 8c0 2 1 5 1 8c1 4 12 27 16 32c1 1 2 3 3 5c1 2 4 6 6 10c3 3 5 6 5 7c0 2 3 1 4-2zM466 394c1-1 3-3 4-4c2-2 11-17 13-22c1-2 4-6 6-9c1-3 3-6 3-6c0-1 1-4 3-6c1-3 3-7 3-9c1-4 3-11 7-23c3-7 4-25 2-27c-2-1-4-1-12 0c-5 1-15 2-21 2c-6 0-15 1-19 2c-5 0-12 1-17 1c-11 0-11 0-7 12c3 5 4 12 5 15c0 3 1 7 2 8c1 1 4 9 6 16c3 7 6 18 8 23c2 5 5 14 7 19c3 13 4 14 7 8zM128 285c3-1 10-1 14-2c11-3 21-4 36-5c14-2 17-3 17-6c0-1 2-5 4-10c2-4 5-10 5-12c1-3 3-6 3-7c1-2 3-6 4-10c2-3 4-9 5-12c2-3 3-6 3-7c0-1 2-5 3-9c2-3 4-8 5-9c0-2 1-6 3-10c1-4 2-9 3-12c0-2 1-6 2-8c2-4 3-6 9-24c2-7 4-13 4-14c0-1 4-10 8-17c1-2 2-6 3-9c0-2 1-6 2-8c1-1 1-3 1-4c-1 0-29 7-34 9c-2 1-7 3-11 3c-8 3-20 9-29 18c-4 3-8 6-8 6c-2 0-23 20-30 30c-7 9-22 32-23 36c-1 1-3 6-5 10c-6 10-11 23-12 30c0 3-1 6-2 7c-1 1-2 5-2 9c-1 4-3 9-4 12c-2 6-3 26-1 26c1 0 5 0 10 0c5-1 13-1 17-1zM270 266c2-1 8-2 13-2c5-1 12-2 15-2c4-1 10-1 14-2c4 0 10-1 13-2c3 0 11-2 17-3c13-2 15-3 13-6c-2-4-7-20-7-23c0-2-1-7-3-12c-2-5-3-9-3-10c0-1-1-3-2-5c-2-2-4-6-4-10c-1-4-3-9-4-12c-1-2-2-6-3-9c-1-2-2-5-3-6c-2-2-3-3-3-6c0-2-1-6-2-10c-1-3-3-9-4-12c-1-9-4-14-5-14c-2 0-9 19-9 23c0 1-2 5-5 10c-3 5-6 13-8 19c-2 7-5 16-7 21c-2 5-4 10-4 11c0 1-1 3-3 6c-2 2-4 6-4 8c-1 3-4 8-5 12c-3 4-4 7-4 10c0 2-1 5-2 7c-1 2-2 6-3 8c0 3-2 6-2 7c-3 6 2 7 14 4zM426 244c4 0 12-2 17-2c5-1 11-1 12-2c2-1 5-1 9-1c4 1 8 1 10 0c3-1 9-1 15-2c13-1 15-2 13-6c-1-2-1-4 0-6c1-4-1-12-7-28c-1-4-3-11-5-15c-7-21-43-62-65-74c-3-2-6-4-7-6c-1-3-14-9-21-10c-3 0-10-2-14-4c-20-7-27-6-24 1c2 4 5 15 8 25c1 4 3 8 4 10c1 1 1 3 0 4c0 2 0 4 2 5c3 3 5 8 6 17c1 5 4 12 6 17c2 5 4 11 5 13c0 2 2 7 4 10c1 4 3 9 4 12c0 4 2 10 4 15c2 4 4 9 4 10c0 2 1 5 2 8c2 2 3 5 3 6c0 5 4 6 15 3z";

const zustaende = new WeakMap(); // svg -> Zustand der Karte
const ruhig = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function knoten(tag, attr = {}, eltern = null) {
  const k = document.createElementNS(NS, tag);
  for (const [n, w] of Object.entries(attr)) k.setAttribute(n, w);
  if (eltern) eltern.append(k);
  return k;
}

const linie = (punkte) => punkte.map(([lon, lat], i) => {
  const [x, y] = projiziere(lat, lon);
  return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join("");

function aufbauen(svg, karte) {
  svg.replaceChildren();
  svg.setAttribute("focusable", "false");
  const defs = knoten("defs", {}, svg);
  // Kopierer-Kante: grobes Wabern plus feines Korn, fester Seed, in Bildschirmpixeln
  const filter = knoten("filter", { id: "kz-kopie", filterUnits: "userSpaceOnUse", x: "0", y: "0", width: "100%", height: "100%" }, defs);
  knoten("feTurbulence", { type: "fractalNoise", baseFrequency: ".035", numOctaves: "2", seed: "8", result: "welle" }, filter);
  knoten("feDisplacementMap", { in: "SourceGraphic", in2: "welle", scale: "5", xChannelSelector: "R", yChannelSelector: "G", result: "kante" }, filter);
  knoten("feTurbulence", { type: "fractalNoise", baseFrequency: ".8", numOctaves: "1", seed: "3", result: "korn" }, filter);
  knoten("feDisplacementMap", { in: "kante", in2: "korn", scale: "2.5", xChannelSelector: "R", yChannelSelector: "G" }, filter);
  // Sprühkante fürs A: feines Korn verschiebt die Kante, darum ein körniger Sprühnebel. Ein Filter für
  // die ganze A-Ebene, in Pixeln, fester Seed.
  const spray = knoten("filter", { id: "kz-spray", filterUnits: "userSpaceOnUse", x: "0", y: "0", width: "100%", height: "100%" }, defs);
  knoten("feTurbulence", { type: "fractalNoise", baseFrequency: ".7", numOctaves: "1", seed: "8", result: "korn" }, spray);
  knoten("feDisplacementMap", { in: "SourceGraphic", in2: "korn", scale: "2.2", xChannelSelector: "R", yChannelSelector: "G", result: "kante" }, spray);
  knoten("feGaussianBlur", { in: "kante", stdDeviation: "2.2", result: "nebel" }, spray);
  knoten("feColorMatrix", { in: "korn", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3.2 0 0 0 -1.5", result: "staub" }, spray);
  knoten("feComposite", { in: "nebel", in2: "staub", operator: "in", result: "hauch" }, spray);
  const merge = knoten("feMerge", {}, spray);
  knoten("feMergeNode", { in: "hauch" }, merge);
  knoten("feMergeNode", { in: "kante" }, merge);
  // Rotes gesprühtes A; der unsichtbare Kreis macht die ganze Fläche anklickbar
  const a = knoten("symbol", { id: "kz-a", viewBox: "0 0 626 541" }, defs);
  knoten("circle", { cx: "313", cy: "280", r: "290", fill: "transparent" }, a);
  knoten("path", { d: A_PFAD, fill: "currentColor", "fill-rule": "evenodd" }, a);

  const welt = (eltern) => knoten("svg", { width: "100%", height: "100%", preserveAspectRatio: "none", overflow: "hidden" }, eltern);
  // Filter hängen an <g> im Pixelraum; während einer Bewegung schaltet .is-bewegt sie ab (CSS)
  const grund = welt(knoten("g", { class: "kz-karte__kopie", filter: "url(#kz-kopie)" }, svg));
  const oben = welt(svg);
  const sprueh = welt(knoten("g", { class: "kz-karte__spray", filter: "url(#kz-spray)" }, svg));
  const haufenWelt = welt(svg);
  const land = knoten("g", { class: "kz-karte__land" }, grund);
  for (const l of karte.laender ?? []) knoten("path", { d: (l.ringe ?? []).map((r) => `${linie(r)}Z`).join("") }, land);
  knoten("path", { class: "kz-karte__regionen", d: (karte.regionen ?? []).map(linie).join("") }, grund);
  // Städte ohne Filter: die Namen sollen lesbar bleiben
  const staedte = knoten("g", { class: "kz-karte__staedte" }, oben);
  const umkreis = knoten("g", { class: "kz-karte__umkreis" }, oben);
  const marker = knoten("g", { class: "kz-karte__marker" }, sprueh);
  const stapel = knoten("g", { class: "kz-karte__stapel" }, haufenWelt);

  const [x0, y0] = projiziere(karte.bbox[3], karte.bbox[0]);
  const [x1, y1] = projiziere(karte.bbox[1], karte.bbox[2]);
  const rang = (n) => (VORRANG.includes(n) ? VORRANG.indexOf(n) : VORRANG.length);
  const orte = (karte.staedte ?? [])
    .map((s) => { const [x, y] = projiziere(s.lat, s.lon); return { x, y, id: s.name }; })
    .sort((p, q) => rang(p.id) - rang(q.id));

  return {
    svg, welten: [grund, oben, sprueh, haufenWelt], ebenen: { staedte, umkreis, marker, stapel }, orte,
    gebiet: { x0, y0, x1, y1 }, W: 1, H: 1, ansicht: null,
    treffer: [], nachId: new Map(), punkte: [], cache: new Map(), stadtCache: new Map(),
    mitte: null, radiusKm: null, mitteSchluessel: "", gezeichnet: [], geplant: false, fahrt: 0, ruhe: 0,
  };
}

// Der Zustand s dient zugleich als Rahmen {W, H, gebiet} für kartenansicht.js
const massstab = (s) => s.W / s.ansicht.w;
const radiusPx = (n) => (n === 1 ? MARKER_PX / 2 : 11 + 2.5 * Math.log10(n));

// Während Ziehen, Zoomen und Fahrten sind die teuren Filter aus; nach kurzer Ruhe kommen sie zurück
function bewegt(s) {
  s.svg.classList.add("is-bewegt");
  clearTimeout(s.ruhe);
  s.ruhe = setTimeout(() => s.svg.classList.remove("is-bewegt"), RUHE_MS);
}

function plane(s) {
  if (s.geplant) return;
  s.geplant = true;
  requestAnimationFrame(() => {
    s.geplant = false;
    render(s);
  });
}

function render(s) {
  const { cx, cy, w } = s.ansicht;
  const h = hoehe(s, w);
  const vx = cx - w / 2;
  const vy = cy - h / 2;
  const vb = `${vx} ${vy} ${w} ${h}`;
  for (const welt of s.welten) welt.setAttribute("viewBox", vb);
  const m = massstab(s);
  const px = (n) => (n / m).toFixed(3);
  const { stufe, mq } = stufeVon(m);
  const rand = MARKER_PX / m;
  const sichtbar = (p) => p.x > vx - rand && p.x < vx + w + rand && p.y > vy - rand && p.y < vy + h + rand;

  // Marker: Haufen dieser Zoomstufe, nur was im Bild liegt. Einzelne A in die Sprühebene, Haufen darüber.
  if (!s.cache.has(stufe)) s.cache.set(stufe, haufen(s.punkte, HAUFEN_PX, mq));
  s.gezeichnet = s.cache.get(stufe).filter(sichtbar);
  const marker = document.createDocumentFragment();
  const stapel = document.createDocumentFragment();
  s.gezeichnet.forEach((k, i) => {
    const ungefaehr = k.ids.every((id) => s.nachId.get(id)?.genau === false);
    const klasse = ungefaehr ? " is-ungefaehr" : "";
    if (k.ids.length === 1) {
      knoten("use", { href: "#kz-a", class: `kz-karte__a${klasse}`, "data-i": i, x: k.x - MARKER_PX / 2 / m, y: k.y - MARKER_PX / 2 / m, width: px(MARKER_PX), height: px(MARKER_PX) }, marker);
      return;
    }
    const g = knoten("g", { class: `kz-karte__haufen${klasse}`, "data-i": i }, stapel);
    knoten("circle", { cx: k.x, cy: k.y, r: px(radiusPx(k.ids.length)), "stroke-width": px(2.5) }, g);
    const t = knoten("text", { x: k.x, y: k.y, dy: ".36em", "text-anchor": "middle", "font-size": px(k.ids.length > 99 ? 11 : 13) }, g);
    t.textContent = k.ids.length.toLocaleString("de-DE");
  });
  s.ebenen.marker.replaceChildren(marker);
  s.ebenen.stapel.replaceChildren(stapel);

  // Städte: Punkt immer, Name nur, wenn er auf dieser Stufe Platz hat und kein Marker darauf liegt
  if (!s.stadtCache.has(stufe)) s.stadtCache.set(stufe, new Set(haufen(s.orte, STADT_PX, mq).map((k) => k.ids[0])));
  const benannt = s.stadtCache.get(stufe);
  const verdeckt = (x0, y0, x1, y1) => s.gezeichnet.some((k) => {
    const dx = k.x - Math.min(Math.max(k.x, x0), x1);
    const dy = k.y - Math.min(Math.max(k.y, y0), y1);
    return Math.hypot(dx, dy) < (radiusPx(k.ids.length) + 2) / m;
  });
  const staedte = document.createDocumentFragment();
  for (const o of s.orte) {
    if (!sichtbar(o)) continue;
    knoten("rect", { x: o.x - 2.5 / m, y: o.y - 2.5 / m, width: px(5), height: px(5) }, staedte);
    const x = o.x + 6 / m;
    if (benannt.has(o.id) && !verdeckt(x, o.y - 9 / m, x + (o.id.length * 7.2) / m, o.y + 4 / m)) {
      const t = knoten("text", { x, y: o.y + 4 / m, "font-size": px(12) }, staedte);
      t.textContent = o.id;
    }
  }
  s.ebenen.staedte.replaceChildren(staedte);

  // Umkreis und Mitte
  const kreis = document.createDocumentFragment();
  if (s.mitte) {
    const [mx, my] = projiziere(s.mitte.lat, s.mitte.lon);
    if (s.radiusKm) {
      knoten("circle", { class: "kz-karte__kreis", cx: mx, cy: my, r: s.radiusKm, "stroke-width": px(2.5), "stroke-dasharray": `${px(10)} ${px(7)}` }, kreis);
    }
    knoten("circle", { class: "kz-karte__mitte", cx: mx, cy: my, r: px(5), "stroke-width": px(3) }, kreis);
    // Der Satz gilt nur für den echten Standort, nicht für einen eingetippten Ort
    if (s.mitte.art === "geo") {
      const satz = "Du bist hier. Leider.";
      const breite = satz.length * 7.2 + 12; // Courier: 0,6 em je Zeichen bei 12 px
      knoten("rect", { class: "kz-karte__schild", x: mx + 10 / m, y: my - 11 / m, width: px(breite), height: px(20) }, kreis);
      const t = knoten("text", { class: "kz-karte__satz", x: mx + 16 / m, y: my + 3.5 / m, "font-size": px(12) }, kreis);
      t.textContent = satz;
    }
  }
  s.ebenen.umkreis.replaceChildren(kreis);
}

// Ansicht setzen, auf Wunsch mit kurzer Fahrt (bei reduzierter Bewegung immer sofort)
function fahre(s, ziel, weich = true) {
  ziel = begrenze(s, ziel);
  cancelAnimationFrame(s.fahrt);
  if (!weich || ruhig()) {
    s.ansicht = ziel;
    plane(s);
    return;
  }
  const von = s.ansicht;
  const t0 = performance.now();
  const schritt = (jetzt) => {
    const t = Math.min(1, (jetzt - t0) / FAHRT_MS);
    const e = 1 - (1 - t) ** 3;
    s.ansicht = {
      cx: von.cx + (ziel.cx - von.cx) * e,
      cy: von.cy + (ziel.cy - von.cy) * e,
      w: von.w * (ziel.w / von.w) ** e,
    };
    bewegt(s);
    render(s);
    if (t < 1) s.fahrt = requestAnimationFrame(schritt);
  };
  s.fahrt = requestAnimationFrame(schritt);
}

const zeige = (id) => {
  document.dispatchEvent(new CustomEvent("konzerte:gross", { detail: { an: false } })); // erst klein, dann zur Liste
  document.dispatchEvent(new CustomEvent("konzerte:zeige", { detail: { id } }));
};

function bedienung(s) {
  const svg = s.svg;
  const lage = (x, y) => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };

  // Mausrad zoomt nur über der Karte. Am Zoomrand bleibt das Rad bei der Seite (kein Festhalten),
  // ebenso kurz nach Seitenscrollen: wer über die Karte hinweg scrollt, bleibt nicht in ihr hängen.
  let gescrollt = -Infinity;
  addEventListener("scroll", () => { gescrollt = performance.now(); }, { passive: true });
  svg.addEventListener("wheel", (e) => {
    if (performance.now() - gescrollt < SCROLL_SPERRE_MS) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    if (!dy) return;
    const faktor = Math.exp(Math.max(-300, Math.min(300, dy)) * 0.0018);
    const w = s.ansicht.w;
    if ((faktor > 1 && w >= maxBreite(s) - 1e-6) || (faktor < 1 && w <= MIN_BREITE + 1e-6)) return;
    e.preventDefault();
    cancelAnimationFrame(s.fahrt);
    s.ansicht = begrenze(s, zoomUm(s, ...lage(e.clientX, e.clientY), faktor, s.ansicht));
    bewegt(s);
    plane(s);
  }, { passive: false });

  // Ziehen mit Maus oder Stift. Erst ab 4 px gilt es als Ziehen, sonst bleibt es ein Klick.
  let zug = null;
  s.gezogen = false;
  svg.addEventListener("pointerdown", (e) => {
    s.gezogen = false; // auch bei Fingern: ein altes Mausziehen darf keinen Tipp schlucken
    if ((e.pointerType === "touch" && !s.gross) || e.button !== 0) return; // in der Großansicht schiebt ein Finger
    zug = { id: e.pointerId, x: e.clientX, y: e.clientY, a: s.ansicht };
  });
  svg.addEventListener("pointermove", (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const dx = e.clientX - zug.x;
    const dy = e.clientY - zug.y;
    if (!s.gezogen && Math.hypot(dx, dy) < 4) return;
    if (!s.gezogen) {
      s.gezogen = true;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add("is-ziehen");
      cancelAnimationFrame(s.fahrt);
    }
    const m = s.W / zug.a.w;
    s.ansicht = begrenze(s, { ...zug.a, cx: zug.a.cx - dx / m, cy: zug.a.cy - dy / m });
    bewegt(s);
    plane(s);
  });
  const loslassen = () => { zug = null; svg.classList.remove("is-ziehen"); };
  svg.addEventListener("pointerup", loslassen);
  svg.addEventListener("pointercancel", loslassen);

  // Finger: Ein Finger scrollt die Seite (touch-action im CSS), erst zwei Finger zoomen und schieben.
  let griff = null;
  const zwei = (e) => {
    const [a, b] = e.touches;
    return { mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
  };
  svg.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 2) return;
    loslassen(); // der zweite Finger übernimmt vom Ein-Finger-Ziehen
    cancelAnimationFrame(s.fahrt);
    griff = { ...zwei(e), a: s.ansicht };
  }, { passive: true });
  svg.addEventListener("touchmove", (e) => {
    if (!griff || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const jetzt = zwei(e);
    const [px, py] = lage(griff.mx, griff.my);
    const z = zoomUm(s, px, py, griff.d / Math.max(jetzt.d, 1), griff.a);
    const m = s.W / z.w;
    s.ansicht = begrenze(s, { ...z, cx: z.cx - (jetzt.mx - griff.mx) / m, cy: z.cy - (jetzt.my - griff.my) / m });
    bewegt(s);
    plane(s);
  }, { passive: false });
  const ende = (e) => { if (e.touches.length < 2) griff = null; };
  svg.addEventListener("touchend", ende);
  svg.addEventListener("touchcancel", ende);

  // Knöpfe: Plus und Minus zoomen um die Mitte, „Groß“ legt die Karte über die ganze Seite
  const rahmen = svg.closest(".kz-karte");
  const knopf = (wahl) => rahmen?.querySelector(wahl);
  const zoome = (faktor) => fahre(s, zoomUm(s, s.W / 2, s.H / 2, faktor, s.ansicht));
  knopf(".js-karte-rein")?.addEventListener("click", () => zoome(0.5));
  knopf(".js-karte-raus")?.addEventListener("click", () => zoome(2));
  const gross = knopf(".js-karte-gross");
  s.gross = false;
  const setzeGross = (an) => {
    if (!rahmen || s.gross === an) return;
    s.gross = an;
    rahmen.classList.toggle("is-gross", an);
    document.documentElement.classList.toggle("kz-karte-offen", an);
    if (gross) {
      gross.setAttribute("aria-pressed", String(an));
      gross.textContent = an ? "✕ Klein" : "⤢ Groß";
    }
  };
  gross?.addEventListener("click", () => setzeGross(!s.gross));
  document.addEventListener("konzerte:gross", (e) => setzeGross(Boolean(e.detail?.an)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setzeGross(false); });

  // Klick: Haufen zoomt hinein, ein A springt zum Listeneintrag
  svg.addEventListener("click", (e) => {
    if (s.gezogen) return;
    const ziel = e.target.closest?.("[data-i]");
    const k = ziel && s.gezeichnet[Number(ziel.dataset.i)];
    if (!k) return;
    if (k.ids.length === 1) return zeige(k.ids[0]);
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const id of k.ids) {
      const p = s.nachId.get(id);
      [x0, y0, x1, y1] = [Math.min(x0, p.x), Math.min(y0, p.y), Math.max(x1, p.x), Math.max(y1, p.y)];
    }
    const breite = Math.max(x1 - x0, ((y1 - y0) * s.W) / s.H) * 1.6;
    // Alle am selben Fleck oder schon ganz nah dran: dann gleich zum ersten Termin in der Liste
    if (breite < 1 || s.ansicht.w <= MIN_BREITE * 1.05) return zeige(k.ids[0]);
    fahre(s, { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.min(s.ansicht.w / 2, breite) });
  });

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height || (r.width === s.W && r.height === s.H)) return;
      [s.W, s.H] = [r.width, r.height];
      s.ansicht = begrenze(s, s.ansicht);
      plane(s);
    }).observe(svg);
  }
}

export function zeichneKarte(svg, karte, { treffer, mitte, radiusKm, suche = "" }) {
  let s = zustaende.get(svg);
  if (!s) {
    s = aufbauen(svg, karte);
    zustaende.set(svg, s);
    bedienung(s);
  }
  const r = svg.getBoundingClientRect();
  if (r.width && r.height) [s.W, s.H] = [r.width, r.height];

  s.treffer = Array.isArray(treffer) ? treffer : [];
  s.punkte = [];
  s.nachId = new Map();
  for (const t of s.treffer) {
    if (!Number.isFinite(t.lat) || !Number.isFinite(t.lon)) continue;
    const [x, y] = projiziere(t.lat, t.lon);
    const p = { x, y, id: String(t.id), genau: t.genau !== false };
    s.punkte.push(p);
    s.nachId.set(p.id, p);
  }
  s.cache.clear();

  s.mitte = mitte && Number.isFinite(mitte.lat) && Number.isFinite(mitte.lon) ? mitte : null;
  s.radiusKm = s.mitte && Number.isFinite(radiusKm) ? radiusKm : null;
  const ort = s.mitte ? `${s.mitte.lat},${s.mitte.lon},${s.radiusKm}` : "";
  const schluessel = `${ort}|${suche}`;
  // Neue Mitte, neuer Umkreis oder neue Suche: neu einrahmen. Bei einer Suche rahmen die Treffer das Bild,
  // sonst der Umkreis. Andere Filter lassen die Ansicht, wo sie war.
  if (!s.ansicht || schluessel !== s.mitteSchluessel) {
    const ziel = suche && s.punkte.length ? umfasse(s, s.punkte) : passend(s, s.mitte, s.radiusKm);
    if (s.ansicht) fahre(s, ziel);
    else s.ansicht = ziel;
  }
  s.mitteSchluessel = schluessel;
  plane(s);
}

// Hängt die Karte in den Rahmen: lädt data/karte.json und zeichnet bei jedem „konzerte:treffer“.
// Der Rahmen bleibt versteckt, bis Karte und Treffer da sind; ohne Kartendaten bleibt nur die Liste.
export function starteKarte(rahmen) {
  const svg = rahmen?.querySelector("svg");
  if (!svg) return;
  let karte = null;
  let letzte = null;
  const versuche = () => {
    if (!karte || !letzte) return;
    rahmen.hidden = false; // erst sichtbar machen, sonst misst die Karte 0 × 0
    zeichneKarte(svg, karte, letzte);
  };
  document.addEventListener("konzerte:treffer", (e) => {
    letzte = e.detail;
    versuche();
  });
  fetch(KARTE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((k) => {
      if (!k || !Array.isArray(k.laender) || !Array.isArray(k.bbox)) throw new Error("Format");
      karte = k;
      versuche();
    })
    .catch((fehler) => console.error("Karte nicht geladen:", fehler));
}
