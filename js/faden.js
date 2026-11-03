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

  /* Anarchie-A als ein durchgehender Fadenweg (1000er-Raster wie Motiv 008).
     Der Faden kommt von oben in die Spitze und läuft am rechten Bein wieder hinaus. */
  const A_UNIT = (() => {
    const raw = [[500, 95], [235, 905], [274, 761]];
    const cx = 500, cy = 535, r = 320, a0 = Math.atan2(761 - cy, 274 - cx);
    for (let k = 1; k <= 72; k++) { const a = a0 + (k / 72) * Math.PI * 2; raw.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    raw.push([327, 625], [110, 625], [890, 590], [667, 605], [500, 95], [765, 905]);
    return raw.map(([x, y]) => [(x - 500) / 1000, (y - 500) / 1000]);
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
  let vw = innerWidth, vh = innerHeight, radius = 3, reveal = 0, first = true;

  function resample(poly, out) {
    const len = [0];
    for (let i = 1; i < poly.length; i++) len.push(len[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    const total = len[len.length - 1] || 1;
    for (let j = 0, s = 0; j < N; j++) {
      const d = total * j / (N - 1);
      while (s < poly.length - 2 && len[s + 1] < d) s++;
      const t = (d - len[s]) / ((len[s + 1] - len[s]) || 1);
      out[j * 2] = poly[s][0] + (poly[s + 1][0] - poly[s][0]) * t;
      out[j * 2 + 1] = poly[s][1] + (poly[s + 1][1] - poly[s][1]) * t;
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
    for (const [x, y] of A_UNIT) poly.push([k.cx + x * k.size, k.cy + y * k.size]);
    for (let y = ey + 16; y <= Math.max(ey + 16, vh + 60); y += 16) poly.push([ex + (lineX(y, time) - ex) * smooth(ey, ey + 220, y), y]);
    resample(poly, shaped);
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
        pos[o] = x + nor[o] * radius; pos[o + 1] = y + nor[o + 1] * radius; pos[o + 2] = nor[o + 2] * radius;
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
    } else target.set(line);
    const rLine = mobile() ? 2 : 3.4;
    const rT = rLine + ((k ? k.radius : rLine) - rLine) * e;
    // weich nachziehen, damit Wechsel zwischen Wegmarken nicht springen
    const f = first ? 1 : .16;
    for (let i = 0; i < N * 2; i++) cur[i] += (target[i] - cur[i]) * f;
    radius += (rT - radius) * f;
    first = false;
    tex.offset.y = time * .15;
    updateTube();
    renderer.render(scene, camera);
  });
}
