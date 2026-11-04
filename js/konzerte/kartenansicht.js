// Rechnen für die Copyshop-Karte, ohne DOM: Projektion und Ansicht.
// Ansicht {cx, cy, w}: Mitte und Breite des Ausschnitts in km. Rahmen {W, H, gebiet}: Größe des
// Kartenelements in Pixeln und das Kartengebiet {x0, y0, x1, y1} in km. Die Höhe folgt dem Seitenverhältnis.

const R = 6371.0088; // mittlerer Erdradius in km
const KM_JE_GRAD = (R * Math.PI) / 180;
const KOS51 = Math.cos((51 * Math.PI) / 180);

export const MIN_BREITE = 60; // km: enger als Regionsebene wird nicht gezoomt

// Abstandstreu-zylindrisch um 10°O/51°N. x nach Osten, y nach Süden (wie SVG), beides in km.
export function projiziere(lat, lon) {
  return [(lon - 10) * KM_JE_GRAD * KOS51, (51 - lat) * KM_JE_GRAD];
}

export const hoehe = (r, w) => (w * r.H) / r.W;

// Weiter hinaus geht es nicht: das ganze Gebiet passt hinein, mit etwas Rand
export function maxBreite(r) {
  const g = r.gebiet;
  return Math.max(g.x1 - g.x0, ((g.y1 - g.y0) * r.W) / r.H) * 1.04;
}

// Breite zwischen MIN_BREITE und maxBreite, Mitte innerhalb des Gebiets
export function begrenze(r, a) {
  const g = r.gebiet;
  const zw = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  return { cx: zw(a.cx, g.x0, g.x1), cy: zw(a.cy, g.y0, g.y1), w: zw(a.w, MIN_BREITE, maxBreite(r)) };
}

// Mit Ort: Umkreis ganz im Bild (Durchmesser × 1,15). Ohne Ort: das ganze Gebiet.
export function passend(r, mitte, radiusKm) {
  const g = r.gebiet;
  if (mitte && radiusKm) {
    const [cx, cy] = projiziere(mitte.lat, mitte.lon);
    const d = radiusKm * 2.3;
    return begrenze(r, { cx, cy, w: Math.max(d, (d * r.W) / r.H) });
  }
  return begrenze(r, { cx: (g.x0 + g.x1) / 2, cy: (g.y0 + g.y1) / 2, w: Infinity });
}

// Zoom um einen Bildschirmpunkt (px, py) relativ zur Ansicht a: der km-Punkt darunter bleibt stehen
export function zoomUm(r, px, py, faktor, a) {
  const kx = a.cx - a.w / 2 + (px * a.w) / r.W;
  const ky = a.cy - hoehe(r, a.w) / 2 + (py * a.w) / r.W;
  const w = Math.min(Math.max(a.w * faktor, MIN_BREITE), maxBreite(r));
  return { cx: kx - (px * w) / r.W + w / 2, cy: ky - (py * w) / r.W + hoehe(r, w) / 2, w };
}

// Zoomstufen in halben Oktaven des Maßstabs (Pixel je km): innerhalb einer Stufe bleiben die Haufen gleich
export function stufeVon(m) {
  const stufe = Math.round(2 * Math.log2(m)) || 0; // -0 vermeiden
  return { stufe, mq: 2 ** (stufe / 2) };
}
