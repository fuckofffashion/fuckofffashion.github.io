// Beispiel-Läden für Etappe 1 (echte Läden folgen in Etappe 2). Maße in Metern.
// z[0] = Bühnenseite, z[1] = hinten; gitterZ = Absperrgitter vor der Bühne.

export const LAEDEN = {
  keller: { x: 3.3, z: [-4.2, 4.2], gitterZ: -3.6, leute: 14, pfeiler: { x: 0.2, z: 0.4, r: 0.32 }, decke: 2.75,
    surfer: false, wall: false, matsch: false, boden: "#24201d", wand: "#1d1715" },
  halle: { x: 6.2, z: [-5.2, 6], gitterZ: -4.6, leute: 22, pfeiler: null, decke: null,
    surfer: true, wall: true, matsch: false, boden: "#2a2420", wand: "#18120f" },
  wiese: { x: 6.2, z: [-5.2, 6], gitterZ: -4.6, leute: 18, pfeiler: null, decke: null,
    surfer: true, wall: false, matsch: true, boden: "#2d3020", wand: null },
};
