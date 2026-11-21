// Ganove-Kopf in 3D (Totenkopf mit Mütze im Stil von Dan Ganoves Logo), gebaut aus Marks 33 gezeichneten Ansichten.
// Form: eine Kugel, an den Umrissen mehrerer Ansichten zurechtgeschnitzt. Farbe: die Zeichnung, die dem Blickwinkel
// am nächsten liegt, wird wie von einem Beamer daraufgeworfen. Wechselt die nächste Zeichnung, blendet der Kopf in
// gut 0,15 s über statt zu springen. Der Unterkiefer klappt zur Stimme auf (Ecken unter der Zahnreihe sinken ab).

export const KOPF_ATLAS = { bild: "assets/img/pogo/ganove-kopf.webp", daten: "assets/img/pogo/ganove-kopf.json" };
export const KOPF_HOEHE = 0.9; // Höhe des Kopfes (Mützenspitze bis Kinn) in Kopf-Einheiten; ein Atlasfeld ist 1 × 1
const MUND_Y = -0.322;         // Zahnreihe (zwischen Ober- und Unterkiefer) in Kopf-Einheiten
const KIEFER_HUB = 0.05;       // so weit klappt der Unterkiefer bei voller Stimme auf

/** Winkel auf −180 … 180 Grad bringen. */
export const normWinkel = (w) => ((((w + 180) % 360) + 360) % 360) - 180;

/**
 * Ansichten aus den Atlas-Feldern: [{ winkel, feld, spiegel }]. Winkel der Kamera um die Hochachse,
 * 0 = vorn, positiv = Kamera links vom Gesicht (aus Sicht des Kopfes). Wo Mark die positive Seite nicht gezeichnet
 * hat (jenseits seiner letzten Zeichnung dort), nimmt sie das Spiegelbild der negativen.
 */
export function ansichtenAus(felder) {
  const liste = felder.map(({ winkel, feld }) => ({ winkel, feld, spiegel: 0 }));
  const weitestePositiv = Math.max(0, ...felder.filter((f) => f.winkel > 0 && f.winkel < 180).map((f) => f.winkel));
  for (const { winkel, feld } of felder) if (winkel < -weitestePositiv && winkel > -180) liste.push({ winkel: -winkel, feld, spiegel: 1 });
  return liste;
}

/** Index der Ansicht, die dem Winkel am nächsten liegt. Die bisherige bleibt, bis eine andere um mehr als `rest` Grad näher ist. */
export function naechsteAnsicht(ansichten, winkel, bisher = -1, rest = 0.75) {
  let best = 0, bestAbst = Infinity;
  ansichten.forEach((a, i) => { const d = Math.abs(normWinkel(a.winkel - winkel)); if (d < bestAbst) { bestAbst = d; best = i; } });
  if (bisher >= 0 && bisher < ansichten.length && Math.abs(normWinkel(ansichten[bisher].winkel - winkel)) < bestAbst + rest) return bisher;
  return best;
}

/** Gewichte weich zur Ziel-Ansicht ziehen (in place). dauer = Zeitkonstante in s; 0 schaltet sofort um. */
export function blende(gew, ziel, dt, dauer) {
  const k = dauer > 0 ? 1 - Math.exp(-dt / dauer) : 1;
  for (let i = 0; i < gew.length; i++) {
    gew[i] += ((i === ziel ? 1 : 0) - gew[i]) * k;
    if (gew[i] < 1e-3) gew[i] = 0;
  }
  return gew;
}

/** Kamerawinkel aus der Kameraposition im Raum des Kopfes (Gesicht schaut nach +z). */
export const kameraWinkel = (x, z) => (Math.atan2(x, z) * 180) / Math.PI;

/* ---------- three.js-Teil (braucht Browser: Canvas zum Lesen der Umrisse) ---------- */

function umriss(atlas, feld, spiegel, SP) {
  const n = 256, z = atlas.width / SP, c = document.createElement("canvas"); c.width = c.height = n;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(atlas, (feld % SP) * z, Math.floor(feld / SP) * z, z, z, 0, 0, n, n);
  const a = x.getImageData(0, 0, n, n).data;
  return (u, v) => {
    if (spiegel) u = 1 - u;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    return a[(Math.min(n - 1, Math.floor((1 - v) * n)) * n + Math.min(n - 1, Math.floor(u * n))) * 4 + 3] > 110;
  };
}

/**
 * Baut einmal je Seite Form, Textur und Shader. Liefert { neu() } – jeder Aufruf ergibt einen Kopf mit eigenen
 * Gewichten: { g, schritt(kameraWelt, dt), sprich(pegel), dispose() }.
 */
export function baueKopfVorlage(THREE, atlasBild, { spalten: SP, felder }, { ruhig = false } = {}) {
  const ansichten = ansichtenAus(felder), N = ansichten.length;
  const richtung = (w) => { const a = (w * Math.PI) / 180; return { dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), rechts: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)) }; };

  // Form aus den Umrissen schnitzen: vorn, hinten, beide Profile, Schrägen vorn und hinten
  const schnitz = ansichten.filter((a) => [0, 180, 90, -90, 45, -45, 130, -130].includes(a.winkel))
    .map((a) => ({ ...richtung(a.winkel), drin: umriss(atlasBild, a.feld, a.spiegel, SP) }));
  const drin = (p) => schnitz.every((s) => s.drin(0.5 + p.dot(s.rechts), 0.5 + p.y));
  const geo = new THREE.SphereGeometry(1, 96, 80);
  const pos = geo.attributes.position, d = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    let lo = 0, hi = 0.75;
    for (let k = 0; k < 20; k++) { const mid = (lo + hi) / 2; p.copy(d).multiplyScalar(mid); if (drin(p)) lo = mid; else hi = mid; }
    pos.setXYZ(i, d.x * lo, d.y * lo, d.z * lo);
  }
  geo.computeVertexNormals(); geo.computeBoundingSphere();

  const tex = new THREE.Texture(atlasBild); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
  const uDir = ansichten.map((a) => richtung(a.winkel).dir), uRechts = ansichten.map((a) => richtung(a.winkel).rechts);
  const uFeld = ansichten.map((a) => new THREE.Vector2(a.feld % SP, Math.floor(a.feld / SP))), uSpiegel = ansichten.map((a) => a.spiegel);
  const vertexShader = `uniform float uKiefer; varying vec3 vP; varying vec3 vN; varying vec3 vW; varying float vMund; varying float vVorn;
    #include <fog_pars_vertex>
    void main() {
      vP = position; vN = normal; vW = normalize(normalMatrix * normal);
      // Unterkiefer: vorn zwischen Zahnreihe und Kinn sinkt ab (nicht Nacken, nicht Schlüsselbein); die Zeichnung wandert mit (vP bleibt die Ruhelage)
      float spalt = smoothstep(${(MUND_Y + 0.006).toFixed(3)}, ${(MUND_Y - 0.006).toFixed(3)}, position.y);
      float vorn = smoothstep(0.06, 0.15, position.z) * smoothstep(0.17, 0.11, abs(position.x)) * smoothstep(-0.47, -0.42, position.y);
      float k = spalt * vorn;
      vMund = spalt; vVorn = vorn;
      vec3 q = position - vec3(0.0, k * uKiefer * ${KIEFER_HUB.toFixed(3)}, 0.0);
      vec4 mvPosition = modelViewMatrix * vec4(q, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const fragmentShader = `#define N ${N}
    #define SP ${SP.toFixed(1)}
    uniform sampler2D tAtlas; uniform float uGew[N]; uniform vec3 uDir[N]; uniform vec3 uRechts[N]; uniform vec2 uFeld[N]; uniform float uSpiegel[N];
    uniform float uLicht; uniform float uKiefer;
    varying vec3 vP; varying vec3 vN; varying vec3 vW; varying float vMund; varying float vVorn;
    #include <fog_pars_fragment>
    vec4 feld(int i, vec3 p) {
      float u = 0.5 + dot(p, uRechts[i]); u = mix(u, 1.0 - u, uSpiegel[i]);
      float v = 0.5 + p.y;
      if (u < 0.002 || u > 0.998 || v < 0.002 || v > 0.998) return vec4(0.0);
      return texture2D(tAtlas, vec2((uFeld[i].x + u) / SP, (SP - 1.0 - uFeld[i].y + v) / SP));
    }
    void main() {
      vec3 n = normalize(vN);
      vec3 summe = vec3(0.0); float gew = 0.0, alle = 0.0;
      for (int i = 0; i < N; i++) {
        if (uGew[i] <= 0.0) continue;   // nur die gerade gezeigte(n) Zeichnung(en)
        float w = uGew[i] * smoothstep(-0.05, 0.3, dot(n, uDir[i]));
        vec4 c = feld(i, vP); summe += c.rgb * c.a * w; gew += c.a * w; alle += w;
      }
      vec3 farbe;
      if (alle > 1e-5 && gew > 0.25 * alle) farbe = summe / gew;
      else {
        // Stellen, die die Zeichnung nicht zeigt (Mützenoberseite, abgewandte Seite): die Ansicht, die zur Fläche schaut
        vec3 s = vec3(0.0); float g = 0.0;
        for (int i = 0; i < N; i++) { float wf = pow(max(dot(n, uDir[i]), 0.0), 24.0); if (wf < 1e-4) continue; vec4 c = feld(i, vP); s += c.rgb * c.a * wf; g += c.a * wf; }
        farbe = g > 0.02 ? s / g : vec3(0.04);
      }
      // aufgeklappter Mund: der gedehnte Streifen zwischen den Kiefern ist Schlund, also dunkel
      farbe = mix(farbe, vec3(0.02, 0.01, 0.01), step(0.02, uKiefer) * step(0.04, vMund) * step(vMund, 0.96) * step(0.5, vVorn));
      float licht = uLicht * (0.82 + 0.18 * max(dot(normalize(vW), normalize(vec3(0.3, 0.6, 1.0))), 0.0));
      gl_FragColor = vec4(farbe * licht, 1.0);
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`;
  const umrissMat = new THREE.MeshBasicMaterial({ color: 0x050404, side: THREE.BackSide });
  const v = new THREE.Vector3();
  const neu = () => {
    const gewichte = new Array(N).fill(0);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        tAtlas: { value: tex }, uGew: { value: gewichte }, uDir: { value: uDir }, uRechts: { value: uRechts }, uFeld: { value: uFeld },
        uSpiegel: { value: uSpiegel }, uLicht: { value: 0.92 }, uKiefer: { value: 0 },
      },
      vertexShader, fragmentShader, fog: true,
    });
    const kopf = new THREE.Mesh(geo, mat), rand = new THREE.Mesh(geo, umrissMat);
    rand.scale.setScalar(1.025); kopf.castShadow = true;
    const g = new THREE.Group(); g.add(rand, kopf);
    let ziel = -1;
    return {
      g,
      /** Kamera (Weltkoordinaten) → nächste Zeichnung, weich überblendet. */
      schritt(kameraWelt, dt) {
        g.worldToLocal(v.copy(kameraWelt));
        const erst = ziel < 0;
        ziel = naechsteAnsicht(ansichten, kameraWinkel(v.x, v.z), ziel);
        blende(gewichte, ziel, erst ? 1 : dt, ruhig || erst ? 0 : 0.055);
      },
      sprich(pegel) { mat.uniforms.uKiefer.value = Math.max(0, Math.min(1, pegel || 0)); },
      dispose() { mat.dispose(); },
    };
  };
  return { neu, ansichten, dispose() { geo.dispose(); tex.dispose(); umrissMat.dispose(); } };
}
