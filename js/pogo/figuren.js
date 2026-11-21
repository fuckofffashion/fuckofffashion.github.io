// Figuren für Pogo (three.js wird hereingereicht). Feste Teile einer Figur werden zu einer Geometrie
// mit Vertexfarben zusammengefügt, damit eine Figur nur wenige Zeichenaufrufe braucht.

/** Hängt Geometrien aneinander: Positionen und Normalen (mit Matrix), Farben je Teil, Indizes versetzt. */
export function fuegeZusammen(THREE, teile) {
  let anzahl = 0, indizes = 0;
  const vor = teile.map(({ geo, farbe, matrix }) => {
    const g = geo.index ? geo.clone() : geo.clone().setIndex([...Array(geo.attributes.position.count).keys()]);
    if (matrix) g.applyMatrix4(matrix);
    anzahl += g.attributes.position.count; indizes += g.index.count;
    return { g, farbe: new THREE.Color(farbe) };
  });
  const pos = new Float32Array(anzahl * 3), nor = new Float32Array(anzahl * 3), col = new Float32Array(anzahl * 3);
  const idx = new (anzahl > 65535 ? Uint32Array : Uint16Array)(indizes);
  let v = 0, k = 0;
  for (const { g, farbe } of vor) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, v * 3);
    nor.set(g.attributes.normal.array, v * 3);
    for (let i = 0; i < n; i++) { col[(v + i) * 3] = farbe.r; col[(v + i) * 3 + 1] = farbe.g; col[(v + i) * 3 + 2] = farbe.b; }
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[k + i] = gi[i] + v;
    v += n; k += gi.length;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}

const JACKEN = ["#141212", "#141212", "#2a3a5c", "#3b2a22", "#5a1414", "#262622", "#3a4a2c"];
const HOSEN = ["#1b1b22", "#2a3550", "#111111", "#3a3a3a"];
const HAUT = ["#e7c4a3", "#c89a74", "#8d5d3e", "#f0d2b8", "#6b4630"];
const HAARE = [["iro", "#e3262b"], ["iro", "#4fd15f"], ["iro", "#f2b632"], ["iro", "#111111"], ["glatze"], ["glatze"],
  ["muetze", "#111111"], ["muetze", "#7a1b1b"], ["kurz", "#2a1d14"], ["lang", "#c9a36a"], ["lang", "#111111"]];
const wahl = (a) => a[(Math.random() * a.length) | 0];

let geteilt = null; // Geometrien, Material und Aufnäher-Texturen, einmal pro Seite
let motivMats = []; // [{ nr, mat }] aus den Motiven der Seite (setzeMotive)

/** Macht aus geladenen Motivbildern Aufnäher-Materialien (256 px, weißes Motiv auf dunklem Stoff). */
export function setzeMotive(THREE, motive) {
  motivMats = motive.map(({ nr, bild }) => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 192; const x = c.getContext("2d");
    x.fillStyle = "#1b1919"; x.fillRect(0, 0, 256, 192);
    const k = Math.min(232 / bild.width, 168 / bild.height);
    x.drawImage(bild, 128 - bild.width * k / 2, 96 - bild.height * k / 2, bild.width * k, bild.height * k);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return { nr, mat: new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }) };
  });
  return motivMats.length;
}
/** Füllring fürs Abgucken: zeigt einen Bogen vom Anteil 0 bis 1 (RingGeometry mit FORTSCHRITT_TEILE Stücken). */
export const FORTSCHRITT_TEILE = 48;
export function setzeFortschritt(geo, anteil) {
  const a = Math.min(1, Math.max(0, anteil || 0));
  geo.setDrawRange(0, 6 * Math.round(FORTSCHRITT_TEILE * a));
}
export const motivMaterial = (nr) => motivMats.find((m) => m.nr === nr)?.mat || null;
export const zufallsMotiv = () => (motivMats.length ? motivMats[(Math.random() * motivMats.length) | 0] : null);
function teile(THREE) {
  if (geteilt) return geteilt;
  const leinwand = (malen) => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 96; malen(c.getContext("2d"), 128, 96);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const aufnaeher = [
    leinwand((x, w, h) => { x.fillStyle = "#f1ede4"; x.fillRect(0, 0, w, h); x.strokeStyle = "#d4161b"; x.lineWidth = 9; x.beginPath(); x.arc(64, 48, 34, 0, 7); x.stroke(); x.beginPath(); x.moveTo(36, 82); x.lineTo(64, 10); x.lineTo(92, 82); x.moveTo(42, 56); x.lineTo(88, 54); x.stroke(); }),
    leinwand((x, w, h) => { x.fillStyle = "#d4161b"; x.fillRect(0, 0, w, h); x.fillStyle = "#f1ede4"; x.font = "52px Anton, Impact"; x.textAlign = "center"; x.fillText("OI!", 64, 68); }),
    leinwand((x, w, h) => { x.fillStyle = "#111"; x.fillRect(0, 0, w, h); x.fillStyle = "#f1ede4"; x.font = "30px Anton, Impact"; x.textAlign = "center"; x.fillText("FUCK OFF", 64, 42); x.fillStyle = "#d4161b"; x.fillText("FASHION", 64, 78); }),
    leinwand((x, w, h) => { x.fillStyle = "#e9e0cc"; x.fillRect(0, 0, w, h); x.fillStyle = "#111"; x.font = "34px 'Permanent Marker', cursive"; x.textAlign = "center"; x.fillText("DIY", 64, 62); }),
  ];
  geteilt = {
    bein: new THREE.CapsuleGeometry(0.085, 0.46, 3, 8),
    rumpf: new THREE.CapsuleGeometry(0.21, 0.4, 3, 10),
    arm: new THREE.CapsuleGeometry(0.06, 0.42, 3, 7),
    kopf: new THREE.SphereGeometry(0.15, 14, 10),
    hand: new THREE.SphereGeometry(0.057, 8, 6),
    stachel: new THREE.ConeGeometry(0.03, 0.17, 5),
    muetze: new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    haar: new THREE.SphereGeometry(0.155, 14, 8, 0, Math.PI * 2, 0, Math.PI / 1.7),
    rucksack: new THREE.BoxGeometry(0.34, 0.42, 0.18),
    stiefel: new THREE.BoxGeometry(0.13, 0.1, 0.24),
    flicken: new THREE.PlaneGeometry(0.22, 0.165),
    farbe: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.04 }),
    aufnaeher: aufnaeher.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9 })),
  };
  for (const g of Object.values(geteilt)) if (g?.isBufferGeometry) g.userData.geteilt = true;
  return geteilt;
}

/** Figur mit Körper (eine Geometrie), zwei beweglichen Armen und optionalem Rückenaufnäher (Rücken zeigt nach +z). */
export function baueFigur(THREE, opt = {}) {
  const T = teile(THREE), M = (x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));
  const jacke = opt.jacke || wahl(JACKEN), haut = opt.haut || wahl(HAUT), hose = wahl(HOSEN);
  const [art, haarFarbe] = opt.haar || wahl(HAARE);
  const stuecke = [
    { geo: T.bein, farbe: hose, matrix: M(-0.1, 0.32, 0) }, { geo: T.bein, farbe: hose, matrix: M(0.1, 0.32, 0) },
    { geo: T.stiefel, farbe: opt.stiefel || "#0d0d0d", matrix: M(-0.1, 0.05, -0.04) }, { geo: T.stiefel, farbe: opt.stiefel || "#0d0d0d", matrix: M(0.1, 0.05, -0.04) },
    { geo: T.rumpf, farbe: opt.shirt || jacke, matrix: M(0, 0.96, 0) },
    { geo: T.kopf, farbe: haut, matrix: M(0, 1.56, 0) },
  ];
  if (opt.rucksack) stuecke.push({ geo: T.rucksack, farbe: "#3d5a2a", matrix: M(0, 1.0, 0.27) });
  if (art === "iro") for (let k = -3; k <= 3; k++) {
    const w = k * 0.38;
    stuecke.push({ geo: T.stachel, farbe: haarFarbe, matrix: M(0, 1.56 + Math.cos(w) * 0.22, Math.sin(w) * 0.22, w) });
  } else if (art === "muetze") stuecke.push({ geo: T.muetze, farbe: haarFarbe, matrix: M(0, 1.58, 0) });
  else if (art === "kurz") stuecke.push({ geo: T.haar, farbe: haarFarbe, matrix: M(0, 1.58, 0) });
  else if (art === "lang") stuecke.push({ geo: T.haar, farbe: haarFarbe, matrix: M(0, 1.53, 0, 0, 1.08, 1.35, 1.08) });

  const g = new THREE.Group(), koerper = new THREE.Group(); g.add(koerper);
  const rumpf = new THREE.Mesh(fuegeZusammen(THREE, stuecke), T.farbe);
  rumpf.castShadow = true; koerper.add(rumpf);
  let aufnaeher = null; const extraGeos = [];
  if (opt.aufnaeherMat || (opt.aufnaeher !== false && (opt.aufnaeher === true || Math.random() < 0.7))) {
    const mat = opt.aufnaeherMat || (motivMats.length && Math.random() < 0.6 ? wahl(motivMats).mat : wahl(T.aufnaeher));
    aufnaeher = new THREE.Mesh(T.flicken, mat); aufnaeher.position.set(0, 1.02, 0.212); koerper.add(aufnaeher);
  }
  let fortschritt = null;
  if (opt.gold) { // seltenes Motiv: goldener Rahmen und Ring am Boden
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xffc83a });
    const rahmen = new THREE.PlaneGeometry(0.27, 0.21); extraGeos.push(rahmen);
    const r = new THREE.Mesh(rahmen, goldMat); r.position.set(0, 1.02, 0.2105); koerper.add(r);
    const ringGeo = new THREE.RingGeometry(0.42, 0.52, 28); extraGeos.push(ringGeo);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffc83a, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    fortschritt = new THREE.RingGeometry(0.56, 0.7, FORTSCHRITT_TEILE, 1, Math.PI / 2); extraGeos.push(fortschritt); setzeFortschritt(fortschritt, 0);
    const voll = new THREE.Mesh(fortschritt, new THREE.MeshBasicMaterial({ color: 0x58d26a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    voll.rotation.x = -Math.PI / 2; voll.position.y = 0.035; g.add(voll);
  }
  const armGeo = fuegeZusammen(THREE, [{ geo: T.arm, farbe: opt.aermel || jacke, matrix: M(0, -0.24, 0) }, { geo: T.hand, farbe: haut, matrix: M(0, -0.5, 0) }]);
  const arme = [-1, 1].map((seite) => {
    const schulter = new THREE.Group(); schulter.position.set(0.27 * seite, 1.27, 0); koerper.add(schulter);
    const arm = new THREE.Mesh(armGeo, T.farbe); arm.castShadow = true; schulter.add(arm);
    return schulter;
  });
  if (opt.selfie) { // Selfie-Stick mit Handy in der rechten Hand
    const stab = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), handy = new THREE.BoxGeometry(0.08, 0.15, 0.015); extraGeos.push(stab, handy);
    const st = new THREE.Mesh(stab, new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8 })); st.position.y = -0.85; arme[1].add(st);
    const h = new THREE.Mesh(handy, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x6688ff, emissiveIntensity: 0.6 })); h.position.y = -1.2; arme[1].add(h);
  }
  return { g, koerper, arme, aufnaeher, fortschritt, geos: [rumpf.geometry, armGeo, ...extraGeos] };
}

/** Plastikbecher mit Bier und Schaum; becherStand setzt die Füllhöhe (0–1). */
export function baueBecher(THREE) {
  const g = new THREE.Group();
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.15, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.2, side: THREE.DoubleSide }));
  const bier = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.044, 1, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2b632, emissive: 0x5a3a00, roughness: 0.3, transparent: true, opacity: 0.92 }));
  const schaum = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.025, 16), new THREE.MeshStandardMaterial({ color: 0xfff8e6, roughness: 0.9 }));
  g.add(wand, bier, schaum);
  g.userData = { bier, schaum };
  becherStand(g, 1);
  return g;
}
export function becherStand(b, anteil, verwaessert = false) {
  const h = 0.13 * Math.max(0.02, Math.min(1, anteil));
  b.userData.bier.scale.y = h; b.userData.bier.position.y = -0.065 + h / 2;
  b.userData.bier.material.color.set(verwaessert ? 0xf6dc8a : 0xf2b632);
  b.userData.schaum.position.y = -0.065 + h + 0.005; b.userData.schaum.visible = anteil > 0.03;
}

/* ---------- Skelett für das Outro (Ansichten von Mark, im Stil von Dan Ganoves Logo) ---------- */
export const SKELETT_BILDER = {
  vorne: "assets/img/pogo/dan-skelett-vorne-oben.webp", kiefer: "assets/img/pogo/dan-skelett-vorne-kiefer.webp",
  dreiviertel: "assets/img/pogo/dan-skelett-dreiviertel.webp", links: "assets/img/pogo/dan-skelett-links.webp",
  rechts: "assets/img/pogo/dan-skelett-rechts.webp", hinten: "assets/img/pogo/dan-skelett-hinten.webp",
};
/** Welche Ansicht passt zum Blickwinkel (Grad; 0 = Kamera genau vor der Figur, positiv = Kamera rechts von ihr). */
export function skelettAnsicht(winkel) {
  const a = ((winkel + 540) % 360) - 180, b = Math.abs(a);
  if (b <= 20) return { bild: "vorne", spiegeln: false };
  if (b <= 55) return { bild: "dreiviertel", spiegeln: a < 0 };
  if (b <= 125) return { bild: a > 0 ? "rechts" : "links", spiegeln: false };
  return { bild: "hinten", spiegeln: false };
}
/**
 * Skelett-Büste als Bildtafel (Kopf mit Mütze, Brustkorb, Schulterstummel), 0,95 m hoch.
 * texturen: { vorne, kiefer, dreiviertel, links, rechts, hinten } als THREE.Texture.
 * Mittelpunkt liegt auf Brusthöhe; Blickrichtung −z wie die Figuren (Tafel ist dafür gedreht).
 */
export function baueSkelett(THREE, texturen) {
  const H = 0.95, B = H * 0.75, KIEFER_OBEN = 259 / 512, KIEFER_UNTEN = 299 / 512;
  const g = new THREE.Group();
  const mats = {}, geos = [];
  for (const [k, t] of Object.entries(texturen)) mats[k] = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
  const tafelGeo = new THREE.PlaneGeometry(B, H); geos.push(tafelGeo);
  const tafel = new THREE.Mesh(tafelGeo, mats.vorne); tafel.rotation.y = Math.PI; g.add(tafel);
  // Kiefer: gleiche Tafel, nur der Unterkiefer ist sichtbar; liegt minimal davor und klappt beim Sprechen nach unten
  const kiefer = new THREE.Mesh(tafelGeo, mats.kiefer); kiefer.rotation.y = Math.PI; kiefer.position.z = -0.002; g.add(kiefer);
  const kieferRuhe = 0;
  const hub = H * (KIEFER_UNTEN - KIEFER_OBEN) * 0.45;
  const sprich = (pegel) => { kiefer.position.y = kieferRuhe - Math.max(0, Math.min(1, pegel)) * hub; };
  const zeige = (winkel) => {
    const a = skelettAnsicht(winkel), vorn = a.bild === "vorne";
    tafel.material = mats[a.bild]; tafel.scale.x = (a.spiegeln ? -1 : 1) * (vorn || a.bild === "dreiviertel" || a.bild === "hinten" ? 1 : 0.65);
    kiefer.visible = vorn;
  };
  return { g, kiefer, kieferRuhe, sprich, zeige, geos, mats: Object.values(mats), hoehe: H };
}
