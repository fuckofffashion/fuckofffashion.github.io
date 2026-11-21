// Geometrie der 3D-Säule ohne three.js (Node-Tests: tests/js/geometrie.test.mjs).
// Gekrümmte Flächen liegen auf einem Zylinder um die y-Achse; th = Winkel, 0 zeigt zur Kamera (+z).

export const R = 1;

/** touch-action der Leinwand: senkrecht scrollt die Seite, Zwei-Finger-Zoom bleibt möglich. */
export const BERUEHRUNG = "pan-y pinch-zoom";

/** Gitter aus (nu+1)·(nv+1) Punkten; Dreiecke so gewickelt, dass die Außenseite die Vorderseite ist. */
export function gitter(nu, nv) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2), index = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i; uv[k * 2] = i / nu; uv[k * 2 + 1] = j / nv; }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    index.push(a, b, c, b, d, c);
  }
  return { pos, uv, index };
}

/**
 * Legt das Gitter auf die Säule. p = 0 klebt, p = 1 ganz abgerollt.
 * Die Risslinie wandert von unten nach oben, rechts etwas voraus; darunter rollt sich das Papier um einen
 * kleinen Zylinder (Radius rc) und klappt nach oben um.
 */
export function forme(pos, nu, nv, s, p = 0) {
  const dth = s.w / s.r, y0 = s.y - s.h / 2, rc = 0.045 + 0.06 * p;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, k = (j * (nu + 1) + i) * 3, th = s.th + (u - 0.5) * dth;
      let y = y0 + v * s.h, raus = 0;
      if (p > 0) {
        const yl = y0 + s.h * (-0.25 + p * 1.6) + (u - 0.5) * 0.32 * s.h, d = yl - y;
        if (d > 0) {
          const phi = d / rc;
          if (phi < Math.PI) { raus = rc * (1 - Math.cos(phi)); y = yl - rc * Math.sin(phi); }
          else { raus = 2 * rc + (d - Math.PI * rc) * 0.18; y = yl + (d - Math.PI * rc); }
        }
      }
      const rr = s.r + raus;
      pos[k] = rr * Math.sin(th); pos[k + 1] = y; pos[k + 2] = rr * Math.cos(th);
    }
  }
}

/** Plätze der Bandplakate [th, y]: vier vorn unter dem Hauptplakat, dann links/rechts um die Säule. */
export const PLATZ = [
  [-0.425, 1.62], [0.43, 1.65], [-0.41, 0.78], [0.44, 0.8],
  [-1.32, 2.6], [1.32, 2.6], [-1.32, 1.7], [1.32, 1.7], [-1.32, 0.8], [1.32, 0.8],
  [-2.2, 2.6], [2.2, 2.6], [-2.2, 1.7], [2.2, 1.7], [-2.2, 0.8], [2.2, 0.8],
];

/** Was eine Zeigerbewegung bedeutet: unter 6 px nichts, sonst waagerecht drehen, senkrecht scrollen. */
export function richtung(dx, dy) {
  if (Math.hypot(dx, dy) < 6) return null;
  return Math.abs(dx) > Math.abs(dy) ? "dreh" : "scroll";
}
