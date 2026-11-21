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
    { geo: T.stiefel, farbe: "#0d0d0d", matrix: M(-0.1, 0.05, -0.04) }, { geo: T.stiefel, farbe: "#0d0d0d", matrix: M(0.1, 0.05, -0.04) },
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
  if (opt.aufnaeher !== false && (opt.aufnaeher === true || Math.random() < 0.7)) {
    const a = new THREE.Mesh(T.flicken, wahl(T.aufnaeher)); a.position.set(0, 1.02, 0.212); koerper.add(a);
  }
  const armGeo = fuegeZusammen(THREE, [{ geo: T.arm, farbe: opt.aermel || jacke, matrix: M(0, -0.24, 0) }, { geo: T.hand, farbe: haut, matrix: M(0, -0.5, 0) }]);
  const arme = [-1, 1].map((seite) => {
    const schulter = new THREE.Group(); schulter.position.set(0.27 * seite, 1.27, 0); koerper.add(schulter);
    const arm = new THREE.Mesh(armGeo, T.farbe); arm.castShadow = true; schulter.add(arm);
    return schulter;
  });
  return { g, koerper, arme, geos: [rumpf.geometry, armGeo] };
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
