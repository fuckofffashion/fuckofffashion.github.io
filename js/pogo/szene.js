// Szene von Pogo: Renderer, Licht, Laden mit Bühne, Band, Gitter und Ordner, Kamera hinter dir.
// three.js wird hereingereicht (app.js lädt es aus assets/vendor/). Vorlage: docs/superpowers/specs/2026-11-21-pogo-3d-entwurf.html.
import { baueFigur } from "./figuren.js?v=40";

const zufall = (a, b) => a + Math.random() * (b - a);

let kegelMat = null, kegelGeo = null;
/** Banner malen. seiten = Breite/Höhe der Fläche in Metern, damit ein rundes Logo rund bleibt. */
function malBanner(x, w, h, logo, seiten) {
  x.fillStyle = "#0d0b0b"; x.fillRect(0, 0, w, h);
  if (logo?.width) {
    // Logo mehrfach über die ganze Breite, gleichmäßig verteilt
    const hPx = h * 0.86, wPx = (hPx * (w / h)) / seiten * (logo.width / logo.height);
    const n = Math.max(1, Math.floor(w / (wPx * 1.18))), luecke = (w - n * wPx) / n;
    for (let i = 0; i < n; i++) x.drawImage(logo, luecke / 2 + i * (wPx + luecke), (h - hPx) / 2, wPx, hPx);
    return;
  }
  x.fillStyle = "#f1ede4"; x.font = "150px Anton, Impact"; x.textAlign = "center"; x.fillText("POGO", w / 2 - 120, 190);
  x.fillStyle = "#d4161b"; x.font = "44px 'Courier Prime', monospace"; x.fillText("FUCK OFF", w / 2 + 230, 120); x.fillText("FASHION", w / 2 + 230, 175);
}
export function baueSzene(THREE, { container, ruhig = false }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const handy = Math.min(innerWidth, innerHeight) < 600;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, handy ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "pogo__leinwand";
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
  const passeAn = () => {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 62 : 50; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(passeAn); ro.observe(container); passeAn();

  const leinwand = (w, h, malen) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; malen(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const mat = (farbe, extra = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.75, metalness: 0.05, ...extra });

  const s = { renderer, scene, camera, raum: null, band: [], ordner: null, spots: [], regen: null, matsch: [], wackelStaerke: 0 };
  let texturen = [];

  s.baueRaum = (L) => {
    if (s.raum) {
      scene.remove(s.raum);
      s.raum.traverse((o) => {
        if ((o.isMesh || o.isLineSegments) && !o.geometry.userData.geteilt) o.geometry.dispose();
        if ((o.isMesh || o.isLineSegments) && (o.userData.eigenesMaterial || o.material.userData?.einmalig)) o.material.dispose();
        if (o.isLight) o.dispose?.();
      });
      texturen.forEach((t) => t.dispose()); texturen = [];
    }
    const raum = new THREE.Group(); scene.add(raum); s.raum = raum;
    const eigen = (m) => { m.userData.eigenesMaterial = true; return m; };
    const textur = (t) => { texturen.push(t); return t; };
    const draussen = L.draussen || L.matsch;
    scene.background = new THREE.Color(draussen ? 0x15203a : 0x070505);
    scene.fog = new THREE.FogExp2(draussen ? 0x1a2440 : 0x120c0a, draussen ? 0.035 : 0.07);

    raum.add(new THREE.HemisphereLight(draussen ? 0x4a5a7a : 0x5a3a30, 0x0a0807, draussen ? 1.6 : 1.1));
    raum.add(new THREE.AmbientLight(0xffffff, 0.25));

    const bodenTex = textur(leinwand(1024, 1024, (x, w, h) => {
      x.fillStyle = L.boden; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,.25)" : (draussen ? "rgba(60,45,25,.5)" : "rgba(160,120,40,.12)"); x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, zufall(8, 70), zufall(6, 40), Math.random() * 3, 0, 7); x.fill(); }
      for (let i = 0; i < 60; i++) { x.fillStyle = Math.random() < 0.5 ? "#cfc8ba" : "#b8261f"; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, zufall(3, 6), 0, 7); x.fill(); }
    }));
    bodenTex.wrapS = bodenTex.wrapT = THREE.RepeatWrapping; bodenTex.repeat.set(3, 3);
    const boden = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), eigen(new THREE.MeshStandardMaterial({ map: bodenTex, roughness: draussen ? 0.95 : 0.6 })));
    boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; raum.add(boden);

    s.matsch = [];
    if (L.matsch) for (let i = 0; i < 6; i++) {
      const m = { x: zufall(-L.x + 1, L.x - 1), z: zufall(L.gitterZ + 2, L.z[1] - 1), rx: zufall(0.9, 1.6), rz: zufall(0.6, 1.1) };
      const fl = new THREE.Mesh(new THREE.CircleGeometry(1, 28), eigen(mat(0x2b1f12, { roughness: 0.35, metalness: 0.1 })));
      fl.rotation.x = -Math.PI / 2; fl.scale.set(m.rx, m.rz, 1); fl.position.set(m.x, 0.01, m.z); fl.receiveShadow = true; raum.add(fl); s.matsch.push(m);
    }

    // Bühne, Boxen, Schlagzeug, Banner
    const bz = L.z[0] - 0.2;
    const buehne = new THREE.Mesh(new THREE.BoxGeometry(L.x * 2 + 2, 0.9, 3), eigen(mat("#111111"))); buehne.position.set(0, 0.45, bz - 1.5); buehne.receiveShadow = true; raum.add(buehne);
    const kante = new THREE.Mesh(new THREE.BoxGeometry(L.x * 2 + 2, 0.07, 0.07), eigen(new THREE.MeshStandardMaterial({ color: 0xd4161b, emissive: 0xff2a1a, emissiveIntensity: 0.5 }))); kante.position.set(0, 0.9, bz); raum.add(kante);
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), eigen(mat("#1a1817"))); box.position.set(sx * (L.x - 0.2), 1.35 + k * 0.9, bz - 0.6); box.castShadow = true; raum.add(box);
    }
    const kessel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 20), eigen(mat("#7a1b1b", { metalness: 0.4, roughness: 0.4 }))); kessel.rotation.x = Math.PI / 2; kessel.position.set(0, 1.25, bz - 2.1); raum.add(kessel);
    // Banner hinter der Band: Logo der Band zum gewählten Song (s.setzeBanner), ohne Logo der Spielname
    const bannerTex = textur(leinwand(1024, 280, (x, w, h) => malBanner(x, w, h, null, (L.x * 1.5) / 1.6)));
    // leicht von hinten beleuchtet, damit das Logo im Nebel lesbar bleibt; unter niedriger Decke tiefer und vor der Bilderwand
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(L.x * 1.5, 1.6), eigen(new THREE.MeshStandardMaterial({ roughness: 0.9, map: bannerTex, emissive: 0xffffff, emissiveMap: bannerTex, emissiveIntensity: 0.45 })));
    banner.position.set(0, L.decke ? Math.min(3.3, L.decke - 0.85) : 3.3, L.decke ? bz - 2.85 : bz - 3); raum.add(banner);
    s.banner = { tex: bannerTex, seiten: (L.x * 1.5) / 1.6 };

    // Band: links Gitarre, Mitte Gesang mit Mikroständer, rechts Bass
    s.band = [];
    for (const [bx, gitarre] of [[-1.6, true], [0, false], [1.6, true]]) {
      const f = baueFigur(THREE, gitarre ? { aufnaeher: false } : { aufnaeher: false, haar: ["glatze"], kopfEinzeln: true }); f.g.position.set(bx, 0.9, bz - 1.0); f.g.rotation.y = Math.PI; raum.add(f.g);
      if (gitarre) { const gi = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.06), eigen(mat("#d4161b", { roughness: 0.3, metalness: 0.3 }))); gi.position.set(0.05, 0.95, -0.25); gi.rotation.z = 0.9; f.koerper.add(gi); }
      else { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), eigen(mat("#999999", { metalness: 0.8, roughness: 0.3 }))); st.position.set(0, 0.75, -0.45); f.g.add(st); f.staender = st; }
      f.basisX = bx; f.phase = Math.random() * 6; s.band.push(f);
    }

    // Absperrgitter vor der Bühne und der Ordner dahinter
    const gitterMat = eigen(mat("#8f8f8a", { metalness: 0.7, roughness: 0.35 }));
    for (let x = -L.x; x < L.x; x += 1.1) {
      const teil = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.1, 0.08), gitterMat); teil.position.set(x + 0.55, 0.55, L.gitterZ - 0.12); teil.castShadow = true; raum.add(teil);
    }
    s.ordner = baueFigur(THREE, { shirt: "#f2c21b", aermel: "#f2c21b", haar: ["glatze"], aufnaeher: false });
    s.ordner.g.position.set(0, 0, L.gitterZ - 0.6); raum.add(s.ordner.g);

    // Wände bzw. Zaun, Decke, Pfeiler
    if (L.wand) for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, L.z[1] - L.z[0] + 8), eigen(mat(L.wand))); w.position.set(sx * (L.x + 0.45), 2.5, (L.z[0] + L.z[1]) / 2 - 2); w.receiveShadow = true; raum.add(w); }
    else for (const sx of [-1, 1]) { const zaun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, L.z[1] - L.z[0]), eigen(mat("#8a8a86", { metalness: 0.6, roughness: 0.4 }))); zaun.position.set(sx * (L.x + 0.4), 0.55, (L.z[0] + L.z[1]) / 2); raum.add(zaun); }
    if (L.decke) { const d = new THREE.Mesh(new THREE.PlaneGeometry(L.x * 2 + 2, 30), eigen(mat("#141010"))); d.rotation.x = Math.PI / 2; d.position.set(0, L.decke, 0); raum.add(d); }
    if (L.pfeiler) { const h = L.decke || 4; const p = new THREE.Mesh(new THREE.CylinderGeometry(L.pfeiler.r, L.pfeiler.r, h, 20), eigen(mat("#3a3330"))); p.position.set(L.pfeiler.x, h / 2, L.pfeiler.z); p.castShadow = true; p.receiveShadow = true; raum.add(p); }

    // Deko je Laden (ungefährer Nachbau, siehe Design „Etappe 2“)
    s.ventilatoren = [];
    const deko = new Set(L.deko || []);
    const graffitiTex = deko.has("graffiti") ? textur(leinwand(1024, 512, (x, w, h) => {
      x.fillStyle = "#2b2826"; x.fillRect(0, 0, w, h);
      const farben = ["#e3262b", "#4fd15f", "#f2b632", "#3aa0ff", "#ff5fd2", "#f1ede4", "#111111"];
      const worte = ["PUNK", "OI!", "DIY", "KRACH", "LAUT", "FCK", "PIT", "RUHRPOTT", "NO FUTURE", "SKA"];
      for (let i = 0; i < 60; i++) { x.strokeStyle = farben[i % farben.length]; x.lineWidth = zufall(3, 12); x.globalAlpha = zufall(0.4, 0.9); x.beginPath(); x.moveTo(zufall(0, w), zufall(0, h)); x.bezierCurveTo(zufall(0, w), zufall(0, h), zufall(0, w), zufall(0, h), zufall(0, w), zufall(0, h)); x.stroke(); }
      for (let i = 0; i < 14; i++) { x.globalAlpha = 0.95; x.fillStyle = farben[(i * 3) % farben.length]; x.font = `${Math.floor(zufall(50, 120))}px 'Permanent Marker', cursive`; x.save(); x.translate(zufall(0, w), zufall(60, h)); x.rotate(zufall(-0.3, 0.3)); x.fillText(worte[i % worte.length], 0, 0); x.restore(); }
      x.globalAlpha = 1;
    })) : null;
    if (graffitiTex) { graffitiTex.wrapS = THREE.RepeatWrapping; graffitiTex.repeat.set(2, 1); }
    if (graffitiTex && L.wand) for (const sx of [-1, 1]) { // Graffiti auf den Innenwänden
      const g = new THREE.Mesh(new THREE.PlaneGeometry(L.z[1] - L.z[0] + 2, 3.2), eigen(new THREE.MeshStandardMaterial({ map: graffitiTex, roughness: 0.9 })));
      g.rotation.y = -sx * Math.PI / 2; g.position.set(sx * (L.x + 0.29), 1.7, (L.z[0] + L.z[1]) / 2); raum.add(g);
    }

    if (deko.has("ventilatoren") && L.decke) {
      const blattGeo = new THREE.BoxGeometry(0.9, 0.02, 0.14), nabeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10);
      const schwarz = eigen(mat("#0e0e0e", { metalness: 0.3, roughness: 0.5 }));
      // seitlich und nicht direkt vor der Bühne, damit sie in der ersten Reihe nicht vor der Kamera hängen
      [[-0.55, (L.gitterZ + L.z[1]) / 2], [0.55, L.z[1] - 1.5]].forEach(([fx, z]) => {
        const v = new THREE.Group(); v.position.set(fx * L.x, L.decke - 0.15, z);
        const nabe = new THREE.Mesh(nabeGeo, schwarz); v.add(nabe);
        for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(blattGeo, schwarz); b.rotation.y = (k * Math.PI) / 2; b.position.set(Math.cos((k * Math.PI) / 2) * 0.45, -0.05, -Math.sin((k * Math.PI) / 2) * 0.45); v.add(b); }
        raum.add(v); s.ventilatoren.push(v);
      });
    }
    if (deko.has("bilderwand")) {
      const bilder = textur(leinwand(1024, 512, (x, w, h) => {
        x.fillStyle = "#3a1612"; x.fillRect(0, 0, w, h);
        const farben = ["#d9a441", "#b8261f", "#f1ede4", "#3a6ea5", "#6b8e23", "#8b4513", "#e3262b", "#111"];
        for (let i = 0; i < 70; i++) { const bw = zufall(40, 120), bh = zufall(40, 140), px = zufall(0, w - bw), py = zufall(0, h - bh); x.fillStyle = "#c9a227"; x.fillRect(px - 5, py - 5, bw + 10, bh + 10); x.fillStyle = farben[i % farben.length]; x.fillRect(px, py, bw, bh); }
      }));
      const wand = new THREE.Mesh(new THREE.PlaneGeometry(L.x * 2 + 2, 2.6), eigen(new THREE.MeshStandardMaterial({ map: bilder, roughness: 0.8 })));
      wand.position.set(0, 2.2, bz - 2.9); raum.add(wand);
    }
    if (deko.has("traversen")) {
      const stahl = eigen(mat("#8a8d90", { metalness: 0.8, roughness: 0.35 }));
      const quer = new THREE.BoxGeometry(L.x * 2 + 1, 0.12, 0.12), senk = new THREE.BoxGeometry(0.12, 5.2, 0.12);
      for (const z of [bz - 0.4, bz - 2.4]) for (const y of [4.9, 5.4]) { const t = new THREE.Mesh(quer, stahl); t.position.set(0, y, z); raum.add(t); }
      for (const x of [-L.x - 0.2, L.x + 0.2]) for (const z of [bz - 0.4, bz - 2.4]) { const t = new THREE.Mesh(senk, stahl); t.position.set(x, 2.6, z); raum.add(t); }
      const lampe = new THREE.CylinderGeometry(0.12, 0.16, 0.3, 10), lampenMat = eigen(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x4060ff, emissiveIntensity: 0.8 }));
      for (let i = -3; i <= 3; i++) { const l = new THREE.Mesh(lampe, lampenMat); l.position.set(i * L.x * 0.28, 4.7, bz - 0.4); raum.add(l); }
    }
    if (deko.has("schriftzug")) {
      const haus = new THREE.Mesh(new THREE.BoxGeometry(L.x * 2 + 6, 4.2, 3), eigen(new THREE.MeshStandardMaterial({ map: graffitiTex || null, color: graffitiTex ? 0xffffff : 0x3a3633, roughness: 0.9 })));
      haus.position.set(0, 2.1, bz - 4.8); raum.add(haus);
      const schrift = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), eigen(new THREE.MeshBasicMaterial({ transparent: true, map: textur(leinwand(1024, 220, (x, w, h) => { x.fillStyle = "#f1ede4"; x.font = "180px Anton, Impact"; x.textAlign = "center"; x.fillText("druckluft", w / 2, 190); })) })));
      schrift.position.set(0, 5.0, bz - 3.25); raum.add(schrift);
    }
    if (deko.has("baenke")) {
      const holz = eigen(mat("#7a5a3a", { roughness: 0.9 })), tisch = new THREE.BoxGeometry(0.6, 0.08, 2.2), bank = new THREE.BoxGeometry(0.25, 0.06, 2.2);
      for (const sx of [-1, 1]) for (const z of [L.z[0] + 2, L.z[0] + 5, L.z[0] + 8]) {
        const t = new THREE.Mesh(tisch, holz); t.position.set(sx * (L.x + 1.4), 0.75, z); t.castShadow = true; raum.add(t);
        for (const dx of [-0.5, 0.5]) { const b = new THREE.Mesh(bank, holz); b.position.set(sx * (L.x + 1.4) + dx, 0.45, z); raum.add(b); }
      }
    }

    // Bühnenlicht (physikalische Lichtstärken, three r169)
    s.spots = [];
    const farben = { lila: [0x9a3cff, 0xffe8ff, 0x3c6cff], rot: [0xff2a1a, 0xfff0d8, 0xff6a20], blau: [0x2a6aff, 0xe8f0ff, 0x2ad0ff], abend: [0xff8a40, 0xfff0d8, 0xff4a80] }[L.licht] || [0xff2a1a, 0xfff0d8, 0xff6a20];
    [-L.x * 0.6, 0, L.x * 0.6].forEach((sx, i) => {
      const spot = new THREE.SpotLight(farben[i], i === 1 ? 190 : 135, 0, 0.5, 0.6, 2);
      spot.position.set(sx, L.decke ? L.decke - 0.15 : 5.5, bz - 0.5);
      spot.target.position.set(sx * 0.5, 0, 1); raum.add(spot, spot.target);
      if (i === 1) { spot.castShadow = true; spot.shadow.mapSize.set(handy ? 512 : 1024, handy ? 512 : 1024); spot.shadow.bias = -0.0008; }
      spot.userData.grund = spot.intensity; s.spots.push(spot);
    });
    const fuell = new THREE.PointLight(0xffd0a0, 25, 0, 2); fuell.position.set(0, 3, L.z[1]); raum.add(fuell);
    // Lichtkegel im Dunst: ein offener Kegel je Spot, additiv, weich zum Rand und zum Boden hin
    s.kegel = [];
    kegelMat ??= new THREE.ShaderMaterial({
      uniforms: { uFarbe: { value: new THREE.Color() }, uStaerke: { value: 0.35 } },
      vertexShader: `varying float vT; varying float vRand;
        void main() {
          vT = position.z;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vRand = abs(dot(n, normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uFarbe; uniform float uStaerke; varying float vT; varying float vRand;
        void main() { float a = uStaerke * (1.0 - vT * 0.75) * pow(vRand, 1.2); gl_FragColor = vec4(uFarbe, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    kegelMat.userData.geteilt = true;
    kegelGeo ??= new THREE.ConeGeometry(1, 1, 24, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2);
    kegelGeo.userData.geteilt = true;
    s.spots.forEach((sp, i) => {
      const m = new THREE.Mesh(kegelGeo, kegelMat.clone()); m.material.userData.einmalig = true; m.material.uniforms.uFarbe.value.setHex(sp.color.getHex());
      m.material.uniforms.uStaerke.value = handy ? 0.3 : 0.42; m.userData.grund = m.material.uniforms.uStaerke.value;
      m.renderOrder = 5; raum.add(m); s.kegel.push(m);
    });
    // Gegenlicht hinter der Band, damit sie sich vom dunklen Hintergrund abhebt
    const gegen = new THREE.SpotLight(0xfff2e0, 140, 0, 0.6, 0.5, 2); gegen.position.set(0, 4.2, bz - 3.6); gegen.target.position.set(0, 1.4, bz - 0.8); raum.add(gegen, gegen.target);
    s.kante = kante;

    s.regen = null;
    if (L.regen) {
      const n = 900, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) { const x = zufall(-9, 9), y = zufall(0, 8), z = zufall(-8, 9); pos.set([x, y, z, x + 0.03, y + 0.35, z], i * 6); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      s.regen = new THREE.LineSegments(geo, eigen(new THREE.LineBasicMaterial({ color: 0x9aaccc, transparent: true, opacity: 0.35 })));
      raum.add(s.regen);
    }
    s.laden = L;
    return s;
  };

  /** Bandlogo (HTMLImageElement) aufs Banner malen; null = Spielname. */
  s.setzeBanner = (logo) => {
    const b = s.banner; if (!b) return;
    const c = b.tex.image; malBanner(c.getContext("2d"), c.width, c.height, logo, b.seiten); b.tex.needsUpdate = true;
  };

  /** Licht im Takt, Spots wandern über den Pit. schlag: Schläge seit Songbeginn (Bruchteil = Phase im Schlag). */
  s.setzeLicht = (kraft, zeit, takt, schlag = null) => {
    const L = s.laden, mz = (L.gitterZ + L.z[1]) / 2;
    const phase = schlag == null ? 0.5 : schlag - Math.floor(schlag), puls = ruhig ? 0.3 : Math.pow(1 - phase, 3); // kurz nach jedem Schlag hell
    s.spots.forEach((sp, i) => {
      sp.target.position.x = Math.sin(zeit * (0.7 + i * 0.3) + i) * L.x * 0.7;
      sp.target.position.z = mz + Math.cos(zeit * 0.5 + i) * 2.5;
      sp.intensity = sp.userData.grund * (0.7 + 0.5 * kraft) * (1 + 0.25 * Math.max(0, Math.sin(zeit * takt * 2)));
      const k = s.kegel?.[i]; if (!k) return;
      k.position.copy(sp.position); k.lookAt(sp.target.position);
      const len = k.position.distanceTo(sp.target.position) * 1.05, r = len * Math.tan(sp.angle) * 0.75; k.scale.set(r, r, len);
      k.material.uniforms.uStaerke.value = k.userData.grund * (0.6 + 0.35 * Math.min(kraft, 1.6)) * (0.8 + 0.35 * puls);
    });
    if (s.kante) s.kante.material.emissiveIntensity = 0.35 + (0.4 + 2.2 * puls) * Math.min(1.4, 0.4 + kraft);
    for (const v of s.ventilatoren || []) v.rotation.y = ruhig ? 0 : zeit * 6;
    if (s.regen) { s.regen.position.y -= 0.15; if (s.regen.position.y < -4) s.regen.position.y += 4; }
  };

  const kamZiel = new THREE.Vector3(), blick = new THREE.Vector3();
  /** Kamera hinter dir; beim Stagedive höher und weiter weg. */
  s.kamera = (ich, dt, sofort = false, stagedive = false) => {
    const hoch = (camera.aspect < 1 ? 3.4 : 2.9) + (stagedive ? 1.4 : 0), hinten = (camera.aspect < 1 ? 4.6 : 4.1) + (stagedive ? 1.5 : 0);
    kamZiel.set(ich.x * 0.75, hoch, ich.z + hinten);
    blick.set(ich.x * 0.85, stagedive ? 1.8 : 1.15, ich.z - 3.2);
    if (sofort) camera.position.copy(kamZiel); else camera.position.lerp(kamZiel, Math.min(1, dt * 4));
    camera.lookAt(blick);
    if (!ruhig && s.wackelStaerke > 0.002) { const w = s.wackelStaerke; camera.position.x += zufall(-w, w); camera.position.y += zufall(-w, w); }
    s.wackelStaerke *= Math.exp(-6 * dt);
  };
  /** Outro: Kamera schwenkt zu `ziel` (Position der Figur) und zoomt heran. anteil 0…1: 0 = Schwenk beginnt, 1 = ganz nah. */
  s.kameraAuf = (ziel, dt, anteil) => {
    const k = Math.min(1, Math.max(0, anteil)), nah = k * k * (3 - 2 * k); // weich ein- und auslaufen
    kamZiel.set(ziel.x + 0.25 * (1 - nah), ziel.y + 1.9 - 0.25 * nah, ziel.z + 4.2 - 2.4 * nah);
    blick.set(ziel.x, ziel.y + 1.45 + 0.15 * nah, ziel.z); // am Ende auf den Kopf
    camera.position.lerp(kamZiel, Math.min(1, dt * 3)); camera.lookAt(blick);
    const fov = (camera.aspect < 1 ? 62 : 50) - (camera.aspect < 1 ? 27 : 23) * nah; // heranzoomen
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  };
  /** Nach dem Outro: Blickwinkel wieder normal. */
  s.kameraNormal = () => { camera.fov = camera.aspect < 1 ? 62 : 50; camera.updateProjectionMatrix(); };
  s.wackeln = (staerke) => { if (!ruhig) s.wackelStaerke = Math.min(0.25, s.wackelStaerke + staerke); };
  s.render = () => renderer.render(scene, camera);
  s.zeichenaufrufe = () => renderer.info.render.calls;
  return s;
}
