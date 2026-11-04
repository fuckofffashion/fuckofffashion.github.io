// Copyshop-Karte: die Treffer auf einer schwarz-weißen Kopie von DE/NL/BE/LU, Haufen statt Tausender Punkte.
// Die Karte ist Beiwerk und aria-hidden; die Liste ist die zugängliche Ansicht.
// Aufbau: Das äußere <svg> rechnet in Bildschirmpixeln. Darin zwei innere <svg> mit derselben viewBox in km:
// der Kartengrund unter dem Kopierer-Filter (Korn in Pixeln, bleibt beim Zoomen gleich grob) und die Marker
// ohne Filter. Zoomen und Verschieben ändern nur die viewBox; die Haufen werden je Zoomstufe einmal gebildet.

import { MIN_BREITE, begrenze, hoehe, maxBreite, passend, projiziere, stufeVon, zoomUm } from "./kartenansicht.js?v=14";

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
// Motiv 008 (tools/build-anarchie.py) im 100er-Raster: Ring (50|53,5 r 32), A mit Spitze über dem Ring, Querbalken
const A_PFAD = "M18 53.5a32 32 0 1 0 64 0a32 32 0 1 0-64 0M23.5 90.5 50 9.5l26.5 81M11 62.5 89 59";

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
  const a = knoten("symbol", { id: "kz-a", viewBox: "0 0 100 100" }, defs);
  knoten("circle", { cx: "50", cy: "53", r: "46", fill: "transparent" }, a);
  knoten("path", { d: A_PFAD, fill: "none", stroke: "currentColor", "stroke-width": "11", "stroke-linejoin": "miter" }, a);

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

const zeige = (id) => document.dispatchEvent(new CustomEvent("konzerte:zeige", { detail: { id } }));

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
    if (e.pointerType === "touch" || e.button !== 0) return;
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

export function zeichneKarte(svg, karte, { treffer, mitte, radiusKm }) {
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
  const schluessel = s.mitte ? `${s.mitte.lat},${s.mitte.lon},${s.radiusKm}` : "";
  // Neue Mitte oder neuer Umkreis: passend einrahmen. Sonst bleibt die Ansicht, wo sie war.
  if (!s.ansicht || schluessel !== s.mitteSchluessel) {
    cancelAnimationFrame(s.fahrt);
    s.ansicht = passend(s, s.mitte, s.radiusKm);
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
