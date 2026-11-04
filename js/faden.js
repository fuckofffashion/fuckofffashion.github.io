/* =========================================================
   Roter Faden (Prototyp)
   Ein roter 3D-Faden läuft am rechten Rand durch die ganze Seite.
   An Wegmarken knotet er sich zum kleinen Anarchie-A, im Hero und
   im Schluss zum großen. Alles in Bildschirm-Pixeln, Orthokamera.
   ========================================================= */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Three.js erst nach dem Intro und wenn der Browser Luft hat, damit der Seitenstart nicht leidet
if (!reduced) (window.FOF?.introDone || Promise.resolve())
  .then(() => new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 1500 })))
  .then(() => import("../assets/vendor/three.module.min.js"))
  .then(start);

function start(THREE) {
  const N = 520;        // Punkte entlang des Fadens
  const R = 10;         // Segmente rund um den Faden
  const RED = "#ff1a1a";

  /* Anarchie-A als ein durchgehender Fadenweg: das eingekreiste A aus Motiv 007 „Skate or Die“
     (dasselbe Zeichen wie Logo, Intro, Laufschrift, Favicon und Kartenmarker).
     Die Zahlen sind die Mittellinien des Pinselzeichens im Raster von assets/img/anarchie-a.svg
     (viewBox 0 0 626 541), gemessen mit `python tools/messe-a-faden.py`:
     Ring fast exakt rund (Ellipsen-Fit rx 225,7 / ry 226,6), die Beine kreuzen sich knapp über dem
     Ring und stehen oben über, unten laufen sie über den Ring hinaus; der Balken liegt auf
     Ringmitte, steigt nach rechts um 7,4° und steht links und rechts weit über.
     Ein Seil hat keine Pinselkante, darum nur das Skelett. */
  const A_SKELETT = {
    ring: [305, 282, 226],                // Mitte x, y, Radius
    beinL: [[324, 11], [128, 516]],       // Spitze (überstehend) -> Fuß
    beinR: [[304, 12], [478, 528]],
    balken: [[11, 324], [612, 246]],      // links -> rechts
  };
  const VORLAUF = 40; // Einlauf über der linken Spitze, in Rasterpixeln
  const RING_R = .3; // Ringradius als Anteil der Knotengröße (das ganze A ist damit 0,80 breit und 0,69 hoch)

  /* Ein Weg ohne Absetzen: Der Faden kommt von oben in die linke Beinspitze, läuft das linke Bein
     hinunter, zieht Ring, Balken und die zweite Spitze nach und geht am rechten Fuß wieder hinaus.
     Sechs freie Enden lassen sich nicht in einem Zug ziehen; wo nötig läuft der Faden auf sich
     selbst zurück (Fußstummel links, Balkenenden, Ringbögen bei Balken und Spitze).
     Wird einmal beim Start gerechnet, nicht pro Bild. */
  const A_UNIT = (() => {
    const { ring: [cx, cy, r], beinL, beinR, balken } = A_SKELETT;
    const schnitt = ([p, q], [s, t]) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], ex = t[0] - s[0], ey = t[1] - s[1];
      const u = ((s[0] - p[0]) * ey - (s[1] - p[1]) * ex) / (dx * ey - dy * ex);
      return [p[0] + dx * u, p[1] + dy * u];
    };
    const amRing = ([p, q]) => { // beide Schnittpunkte der Geraden mit dem Ring, in Laufrichtung
      const dx = q[0] - p[0], dy = q[1] - p[1], fx = p[0] - cx, fy = p[1] - cy;
      const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
      const w = Math.sqrt(b * b - 4 * a * c);
      return [(-b - w) / (2 * a), (-b + w) / (2 * a)].map(u => [p[0] + dx * u, p[1] + dy * u]);
    };
    const X = schnitt(beinL, beinR);
    const [QL, PL] = amRing(beinL), [QR, PR] = amRing(beinR), [RL, RR] = amRing(balken);
    const BL = schnitt(balken, beinL), BR = schnitt(balken, beinR);
    const [tipL, footL] = beinL, [tipR, footR] = beinR, [barL, barR] = balken;
    // Jeder Punkt trägt eine Lage: 0 = erster Lauf, 1 = Rücklauf über schon gelegten Faden.
    // Der Rücklauf liegt ein Stück höher (z), sonst flimmern zwei deckungsgleiche Röhren ineinander.
    const raw = [];
    let z = 0;
    const zu = (...p) => p.forEach(([x, y]) => raw.push([x, y, z]));
    const lage = n => { if (n !== z) { z = n; zu(raw[raw.length - 1]); } }; // Wendepunkt doppelt, Sprung in z
    const bogen = (p, q) => { // kürzerer Ringbogen von p nach q, alle 5°
      const a0 = Math.atan2(p[1] - cy, p[0] - cx);
      let d = Math.atan2(q[1] - cy, q[0] - cx) - a0;
      d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      const n = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 36)));
      for (let k = 1; k <= n; k++) zu([cx + r * Math.cos(a0 + d * k / n), cy + r * Math.sin(a0 + d * k / n)]);
    };
    // Der ankommende Faden läuft die letzten Pixel in Verlängerung des linken Beins ein, so kreuzen
    // sich oben wie im Zeichen zwei überstehende Spitzen statt eines Hakens
    const ein = Math.hypot(tipL[0] - X[0], tipL[1] - X[1]);
    zu([tipL[0] + (tipL[0] - X[0]) / ein * VORLAUF, tipL[1] + (tipL[1] - X[1]) / ein * VORLAUF]);
    zu(tipL, X, QL, BL, PL, footL); lage(1); zu(PL); lage(0);         // linkes Bein, Fuß zurück
    bogen(PL, RL); zu(barL); lage(1); zu(RL); bogen(RL, PL); lage(0); // Balken links
    bogen(PL, PR); bogen(PR, RR); zu(barR); lage(1); zu(RR); lage(0); // unten rum, Balken rechts
    bogen(RR, QR); zu(X, tipR); lage(1); zu(X, QR); bogen(QR, RR); lage(0); // zweite Spitze
    zu(BR, BL, RL);                                                    // Balken durch den Ring
    bogen(RL, QL); bogen(QL, QR);                                      // Ring oben schließen
    zu(BR, PR, footR);                                                 // rechtes Bein hinaus
    const s = RING_R / r;
    return raw.map(([x, y, z]) => [(x - cx) * s, (y - cy) * s, z]);
  })();
  const APEX = A_UNIT[0], EXIT = A_UNIT[A_UNIT.length - 1];

  /* Wegmarken: wo sich der Faden zum A knotet */
  const mobile = () => vw < 700;
  // Der Faden läuft mittig im freien Rand rechts neben dem Seitenraster
  let rail = 0, railW = 0;
  const measureRail = () => {
    const right = document.querySelector(".wrap").getBoundingClientRect().right;
    railW = Math.max(16, vw - right); rail = right + railW / 2;
  };
  const knotSize = () => Math.min(110, Math.max(40, railW * 1.1));
  const knot = sel => ({ el: document.querySelector(sel), range: [.06, .32], at: r => {
    const s = knotSize();
    return { cx: rail, cy: r.top + r.height / 2, size: s, radius: mobile() ? 2.2 : 3.4 };
  } });
  const anchors = [
    { el: document.querySelector(".hero__logo"), range: [.22, .55], at: r => {
      const s = Math.min(r.width, r.height) * .95;
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: s, radius: Math.min(13, Math.max(5, s * .03)) };
    } },
    knot("#t-anarchie"), knot("#t-wand"), knot("#t-tragen"), knot("#t-join"),
    { el: document.querySelector(".outro__title"), range: [.12, .48], at: (r, vw, vh) => {
      // unter der Schluss-Zeile, rechts neben Text und Knopf
      const s = Math.min(vw * (mobile() ? .42 : .3), vh * .5, 400);
      return { cx: vw * (mobile() ? .72 : .74), cy: r.bottom + s * .5 + 24, size: s, radius: Math.min(12, Math.max(4, s * .028)) };
    } },
  ].filter(a => a.el);

  /* Szene */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  Object.assign(renderer.domElement.style, { position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "55", pointerEvents: "none" });
  renderer.domElement.setAttribute("aria-hidden", "true");
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  scene.add(sun, sun.target);

  // Kordel-Textur: schräge Fasern, laufen beim Scrollen mit
  const tex = (() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = RED; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = "rgba(130,0,0,.32)"; g.lineWidth = 7;
    for (let x = -64; x < 128; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 64, 64); g.stroke(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .5, metalness: 0, emissive: 0x6a0000 });

  // Röhre von Hand: Ringe aus R+1 Punkten (Naht doppelt für saubere Textur)
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * (R + 1) * 3), nor = new Float32Array(pos.length), uv = new Float32Array(N * (R + 1) * 2);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < R; k++) {
    const a = i * (R + 1) + k, b = a + R + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  /* Formen */
  const cur = new Float32Array(N * 2), target = new Float32Array(N * 2), line = new Float32Array(N * 2), shaped = new Float32Array(N * 2);
  const lift = new Float32Array(N), liftShaped = new Float32Array(N); // Lage des Rücklaufs (0/1), siehe A_UNIT
  const HUB = .5; // so viele Fadenradien liegt der Rücklauf höher
  let vw = innerWidth, vh = innerHeight, radius = 3, reveal = 0, first = true;

  function resample(poly, out, outZ) {
    const len = [0];
    for (let i = 1; i < poly.length; i++) len.push(len[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    const total = len[len.length - 1] || 1;
    for (let j = 0, s = 0; j < N; j++) {
      const d = total * j / (N - 1);
      while (s < poly.length - 2 && len[s + 1] < d) s++;
      const t = (d - len[s]) / ((len[s + 1] - len[s]) || 1);
      out[j * 2] = poly[s][0] + (poly[s + 1][0] - poly[s][0]) * t;
      out[j * 2 + 1] = poly[s][1] + (poly[s + 1][1] - poly[s][1]) * t;
      if (outZ) outZ[j] = (poly[s][2] || 0) + ((poly[s + 1][2] || 0) - (poly[s][2] || 0)) * t;
    }
  }

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  function lineX(y, time) {
    const p = y + scrollY, amp = Math.min(11, railW * .18);
    return rail + amp * Math.sin(p * .006 + time * .6) + amp * .4 * Math.sin(p * .017 - time * .4);
  }

  function buildLine(time) {
    const poly = [];
    for (let y = -60; y <= vh + 60; y += 16) poly.push([lineX(y, time), y]);
    resample(poly, line);
  }

  function buildKnot(k, time) {
    const ax = k.cx + APEX[0] * k.size, ay = k.cy + APEX[1] * k.size;
    const ex = k.cx + EXIT[0] * k.size, ey = k.cy + EXIT[1] * k.size;
    const poly = [];
    for (let y = -60; y < ay; y += 16) poly.push([lineX(y, time) + (ax - lineX(y, time)) * smooth(ay - 220, ay, y), y]);
    for (const [x, y, z] of A_UNIT) poly.push([k.cx + x * k.size, k.cy + y * k.size, z]);
    for (let y = ey + 16; y <= Math.max(ey + 16, vh + 60); y += 16) poly.push([ex + (lineX(y, time) - ex) * smooth(ey, ey + 220, y), y]);
    resample(poly, shaped, liftShaped);
  }

  function pickAnchor() {
    let best = null, bw = 0;
    for (const a of anchors) {
      const r = a.el.getBoundingClientRect();
      const k = a.at(r, vw, vh);
      const w = 1 - smooth(a.range[0], a.range[1], Math.abs(k.cy - vh / 2) / vh);
      if (w > bw) { bw = w; best = k; }
    }
    return { k: best, w: bw };
  }

  function updateTube() {
    let arc = 0;
    for (let i = 0; i < N; i++) {
      const x = cur[i * 2], y = -cur[i * 2 + 1];
      const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1);
      let tx = cur[i1 * 2] - cur[i0 * 2], ty = -(cur[i1 * 2 + 1] - cur[i0 * 2 + 1]);
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      if (i > 0) arc += Math.hypot(cur[i * 2] - cur[i * 2 - 2], cur[i * 2 + 1] - cur[i * 2 - 1]);
      const nx = -ty, ny = tx; // senkrecht in der Ebene, die zweite Achse ist z
      for (let k = 0; k <= R; k++) {
        const a = (k / R) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const o = (i * (R + 1) + k) * 3;
        nor[o] = nx * c; nor[o + 1] = ny * c; nor[o + 2] = s;
        pos[o] = x + nor[o] * radius; pos[o + 1] = y + nor[o + 1] * radius; pos[o + 2] = (nor[o + 2] + lift[i] * HUB) * radius;
        const u = (i * (R + 1) + k) * 2;
        uv[u] = arc / (radius * 9); uv[u + 1] = k / R;
      }
    }
    geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = geo.attributes.uv.needsUpdate = true;
    geo.setDrawRange(0, Math.floor(reveal * (N - 1)) * R * 6);
  }

  function resize() {
    vw = document.documentElement.clientWidth; vh = innerHeight;
    measureRail();
    renderer.setSize(innerWidth, vh, false);
    camera.right = innerWidth; camera.bottom = -vh; camera.updateProjectionMatrix();
    sun.target.position.set(vw / 2, -vh / 2, 0);
    sun.position.set(vw * .2, -vh * .1, 600);
  }
  addEventListener("resize", resize);
  addEventListener("pointermove", e => sun.position.set(e.clientX, -e.clientY, 420));
  resize();

  // Hero-Emblem übernimmt der Faden
  document.documentElement.classList.add("faden-on");

  const clock = new THREE.Clock();
  gsap.to({ v: 0 }, { v: 1, duration: 1.8, ease: "power2.inOut", onUpdate() { reveal = this.targets()[0].v; } });

  renderer.setAnimationLoop(() => {
    const time = clock.getElapsedTime();
    buildLine(time);
    const { k, w } = pickAnchor();
    const e = w * w * (3 - 2 * w);
    if (k && e > .001) {
      buildKnot(k, time);
      for (let i = 0; i < N * 2; i++) target[i] = line[i] + (shaped[i] - line[i]) * e;
      for (let i = 0; i < N; i++) liftShaped[i] *= e;
    } else { target.set(line); liftShaped.fill(0); }
    const rLine = mobile() ? 2 : 3.4;
    const rT = rLine + ((k ? k.radius : rLine) - rLine) * e;
    // weich nachziehen, damit Wechsel zwischen Wegmarken nicht springen
    const f = first ? 1 : .16;
    for (let i = 0; i < N * 2; i++) cur[i] += (target[i] - cur[i]) * f;
    for (let i = 0; i < N; i++) lift[i] += (liftShaped[i] - lift[i]) * f;
    radius += (rT - radius) * f;
    first = false;
    tex.offset.y = time * .15;
    updateTube();
    renderer.render(scene, camera);
  });
}
