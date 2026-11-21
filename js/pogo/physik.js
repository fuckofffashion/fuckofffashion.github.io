// Physik der Menge, ohne three.js und DOM (Node-Tests: tests/js/pogo-physik.test.mjs).
// Personen bewegen sich in der Ebene x/z; z wächst von der Bühne nach hinten.
import { zone } from "./regeln.js?v=34";

/** Neue Person; Rand-Leute bekommen ihren Platz als Anker. */
export function person({ x = 0, z = 0, ich = false, rand = false, rucksack = false } = {}) {
  return {
    x, z, vx: 0, vz: 0, r: ich ? 0.3 : rucksack ? 0.42 : 0.32, masse: ich ? 1.2 : rucksack ? 2.2 : 1,
    ich, rand, rucksack, anker: rand ? { x, z } : null, inLuft: false, stoss: 0, wallZiel: null,
  };
}

const mitteZ = (laden) => (laden.gitterZ + laden.z[1]) / 2;

/** Pogo-Stöße, Circle Pit, Wall of Death, Zusammenhalt; Rand-Leute zurück an ihren Platz. */
export function bewegeMenge(leute, laden, teil, dt, zufall = Math.random, wall = null, kreis = null) {
  const kraft = teil.kraft, mz = mitteZ(laden) + 0.6;
  for (const p of leute) {
    if (p.ich) continue;
    if (p.rand) { p.vx += (p.anker.x - p.x) * 6 * dt; p.vz += (p.anker.z - p.z) * 6 * dt; continue; }
    p.stoss -= dt;
    if (wall?.phase === "teilen") {
      const seite = p.x < 0 ? -laden.x + 1.2 : laden.x - 1.2;
      p.vx += (seite - p.x) * 3 * dt;
    } else if (wall?.phase === "rennen") {
      if (p.wallZiel == null) p.wallZiel = p.x < 0 ? laden.x - 1 : -laden.x + 1;
      p.vx += Math.sign(p.wallZiel - p.x) * 14 * dt;
    } else {
      p.wallZiel = null;
      if (p.stoss <= 0) {
        const a = zufall() * Math.PI * 2, s = (0.9 + 2.6 * kraft) * (0.6 + zufall() * 0.7) / p.masse;
        p.vx += Math.cos(a) * s; p.vz += Math.sin(a) * s;
        p.stoss = (0.25 + zufall() * 0.65) / (0.4 + kraft);
      }
      if (kreis && !p.liegt) { // Circle Pit: alle rennen im Kreis um die Mitte, Richtung kreis.richtung
        const dx = p.x, dz = p.z - mz, d = Math.hypot(dx, dz) || 1;
        p.vx += (-dz / d) * 9 * dt * kreis.richtung; p.vz += (dx / d) * 9 * dt * kreis.richtung;
        p.vx += (-dx / d) * (d - 2.6) * 1.2 * dt; p.vz += (-dz / d) * (d - 2.6) * 1.2 * dt;
      }
      p.vx += -p.x * 0.2 * dt; p.vz += (mz - p.z) * 0.2 * dt;
    }
  }
}

/** Wer am Rand steht, wird zurück in den Pit geschubst. Gibt true zurück, wenn geschubst wurde. */
export function randSchubs(ich, laden, dt) {
  if (zone(ich.x, ich.z, laden) !== "rand") return false;
  const dx = -ich.x, dz = mitteZ(laden) - ich.z, d = Math.hypot(dx, dz) || 1;
  ich.vx += (dx / d) * 8 * dt; ich.vz += (dz / d) * 8 * dt;
  return true;
}

/** Reibung, Höchstgeschwindigkeit, Wände, Absperrgitter, Pfeiler, Matsch. */
export function integriere(leute, laden, dt, matsch = []) {
  for (const p of leute) {
    let reib = p.rand ? 10 : p.ich ? 6 : 3.2;
    if (matsch.some((m) => ((p.x - m.x) / m.rx) ** 2 + ((p.z - m.z) / m.rz) ** 2 < 1)) reib *= 2.4;
    const f = Math.exp(-reib * dt); p.vx *= f; p.vz *= f;
    const vmax = p.ich ? 3.4 : 6.5, v = Math.hypot(p.vx, p.vz);
    if (v > vmax) { p.vx *= vmax / v; p.vz *= vmax / v; }
    p.x += p.vx * dt; p.z += p.vz * dt;
    const lo = -laden.x + p.r, hi = laden.x - p.r, vorn = laden.gitterZ + p.r, hinten = laden.z[1] - p.r;
    if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx) * 0.4; }
    if (p.z < vorn) { p.z = vorn; p.vz = Math.abs(p.vz) * 0.4; }
    if (p.z > hinten) { p.z = hinten; p.vz = -Math.abs(p.vz) * 0.4; }
    const q = laden.pfeiler;
    if (q) {
      const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), min = q.r + p.r;
      if (d < min) {
        const nx = d ? dx / d : 1, nz = d ? dz / d : 0;
        p.x = q.x + nx * min; p.z = q.z + nz * min;
        const vn = p.vx * nx + p.vz * nz;
        if (vn < 0) { p.vx -= 1.4 * vn * nx; p.vz -= 1.4 * vn * nz; }
      }
    }
  }
}

/** Zusammenstöße auflösen; meldet Treffer, die dich am Boden erwischen. */
export function stoesse(leute) {
  const treffer = [];
  for (let i = 0; i < leute.length; i++) for (let j = i + 1; j < leute.length; j++) {
    const a = leute[i], b = leute[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.r + b.r;
    if (d >= min || d === 0) continue;
    const nx = dx / d, nz = dz / d, ueber = min - d, ma = a.rand ? 6 : a.masse, mb = b.rand ? 6 : b.masse;
    a.x -= nx * ueber * mb / (ma + mb); a.z -= nz * ueber * mb / (ma + mb);
    b.x += nx * ueber * ma / (ma + mb); b.z += nz * ueber * ma / (ma + mb);
    const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (rel <= 0) continue;
    const jj = (1.6 * rel) / (1 / ma + 1 / mb);
    a.vx -= jj / ma * nx; a.vz -= jj / ma * nz; b.vx += jj / mb * nx; b.vz += jj / mb * nz;
    if (a.ich || b.ich) {
      const ich = a.ich ? a : b, anderer = a.ich ? b : a;
      if (!ich.inLuft) treffer.push({ ich, anderer, schlag: rel });
    }
  }
  return treffer;
}
