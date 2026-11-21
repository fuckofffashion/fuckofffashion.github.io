// Echte Läden (Etappe 2), ungefähr nachgebaut – Mark: „nicht zu genau nehmen“. Maße in Metern.
// z[0] = Bühnenseite, z[1] = hinten; gitterZ = Absperrgitter vor der Bühne.
// deko: Bauteile, die szene.js je Laden aufstellt; licht: Grundstimmung der Bühne.

export const LAEDEN = {
  pitcher: { x: 3.4, z: [-4.0, 4.0], gitterZ: -3.4, leute: 14, pfeiler: null, decke: 2.9, draussen: false,
    surfer: false, wall: false, matsch: false, boden: "#2a1c18", wand: "#3a1612", deko: ["ventilatoren", "bilderwand"], licht: "lila" },
  druckluftInnen: { x: 3.8, z: [-4.2, 4.6], gitterZ: -3.6, leute: 16, pfeiler: null, decke: 3.2, draussen: false,
    surfer: false, wall: false, matsch: false, boden: "#22201e", wand: "#262422", deko: ["graffiti"], licht: "rot" },
  druckluftDraussen: { x: 6.0, z: [-5.0, 6.0], gitterZ: -4.4, leute: 20, pfeiler: null, decke: null, draussen: true,
    surfer: true, wall: false, matsch: false, boden: "#34312c", wand: null, deko: ["schriftzug", "graffiti", "baenke"], licht: "abend" },
  altenberg: { x: 6.4, z: [-5.4, 6.4], gitterZ: -4.8, leute: 22, pfeiler: null, decke: null, draussen: false,
    surfer: true, wall: true, matsch: false, boden: "#2a2522", wand: "#1c1714", deko: ["traversen"], licht: "blau" },
};
