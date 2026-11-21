// 3D-Litfaßsäule der Bandseite (three.js wird von app.js geladen und hereingereicht).
// Vorlage für Aussehen und Verhalten: docs/superpowers/specs/2026-11-21-saeule-3d-entwurf.html.
import { malCollage, malFOF, malPlakat, malZettel, malSprayA, malSticker, malRost, malFleck } from "./malen.js?v=38";
import { R, BERUEHRUNG, gitter, forme, PLATZ, richtung } from "./geometrie.js?v=38";
import { TEXTE, tagDatum } from "./texte.js?v=38";

const KOERPER = { unten: 0.3, oben: 4.0 };
const ZIEL = { y: 2.42 };

/**
 * @param THREE  three.js-Modul
 * @param opt.buehne     Element, in das die Leinwand kommt
 * @param opt.bands      [{ id, name, plakat, bild, termine, naechstText, baldText }] in Platzreihenfolge
 * @param opt.sp         "de" | "en"
 * @param opt.ruhig      reduzierte Bewegung
 * @param opt.beiAntippen(id)
 */
const POGO = "__pogo"; // Kennung des POGO!-Aufklebers für den Klick-Strahl

export function baueSzene(THREE, { buehne, bands, sp, ruhig, beiAntippen }) {
  const T = TEXTE[sp];
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const leinwand = renderer.domElement;
  leinwand.className = "buehne__leinwand";
  leinwand.setAttribute("role", "img");
  leinwand.setAttribute("aria-label", T.buehne);
  leinwand.style.touchAction = BERUEHRUNG;
  buehne.prepend(leinwand);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const texturen = [];
  const tex = (canvas, rep) => {
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    if (rep) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 1); }
    texturen.push(t); return t;
  };

  /* Licht */
  scene.add(new THREE.HemisphereLight(0xffeedd, 0x2a1410, 0.55));
  const key = new THREE.DirectionalLight(0xffe0c0, 2.7);
  key.position.set(3.2, 7.5, 6); key.castShadow = true;
  const karte = buehne.clientWidth >= 900 ? 2048 : 1024;
  key.shadow.mapSize.set(karte, karte);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 6, bottom: -1, near: 1, far: 20 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.target.position.set(0, 2.2, 0); scene.add(key, key.target);
  const kante = new THREE.DirectionalLight(0xff3a2a, 1.9); kante.position.set(-4.5, 3.5, -4.5); scene.add(kante);
  const kante2 = new THREE.DirectionalLight(0xffb090, 0.6); kante2.position.set(5, 2, -3); scene.add(kante2);

  /* Säule: Körper mit Plakatschichten (Naht hinten), Dach, Knauf, Sockel */
  const hk = KOERPER.oben - KOERPER.unten;
  const koerper = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, hk, 128, 1, true, Math.PI, Math.PI * 2),
    new THREE.MeshStandardMaterial({ map: tex(malCollage()), roughness: 0.93 }),
  );
  koerper.position.y = KOERPER.unten + hk / 2; koerper.receiveShadow = true; scene.add(koerper);

  const rostDach = new THREE.MeshStandardMaterial({ map: tex(malRost(21, "#8a2a20"), 3), roughness: 0.78, metalness: 0.35, side: THREE.DoubleSide });
  const rostSockel = new THREE.MeshStandardMaterial({ map: tex(malRost(42, "#5e221a"), 3), roughness: 0.85, metalness: 0.3 });
  const v2 = (a, b) => new THREE.Vector2(a, b);
  const dach = new THREE.Mesh(new THREE.LatheGeometry([
    v2(0.995, -0.14), v2(1.03, -0.13), v2(1.035, -0.01), v2(1.06, 0.0), v2(1.25, 0.08), v2(1.27, 0.14), v2(1.24, 0.19),
    v2(1.1, 0.22), v2(0.92, 0.35), v2(0.68, 0.5), v2(0.42, 0.59), v2(0.2, 0.635), v2(0.08, 0.65), v2(0.06, 0.72), v2(0.0, 0.73),
  ], 96), rostDach);
  dach.position.y = KOERPER.oben; dach.castShadow = true; dach.receiveShadow = true; scene.add(dach);
  const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 20), rostDach);
  knauf.position.y = KOERPER.oben + 0.82; knauf.castShadow = true; scene.add(knauf);
  const sockel = new THREE.Mesh(new THREE.LatheGeometry([
    v2(0, 0), v2(1.17, 0), v2(1.17, 0.07), v2(1.13, 0.12), v2(1.13, 0.17), v2(1.07, 0.22), v2(1.03, 0.3), v2(0.99, 0.32),
  ], 96), rostSockel);
  sockel.castShadow = true; sockel.receiveShadow = true; scene.add(sockel);

  const boden = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.32 }));
  boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; scene.add(boden);
  const fleck = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: tex(malFleck()), transparent: true, depthWrite: false }));
  fleck.rotation.x = -Math.PI / 2; fleck.position.y = 0.002; scene.add(fleck);

  /* Gekrümmte Flächen */
  const flaecheGeo = (s, nu, nv) => {
    const g = gitter(nu, nv);
    const geo = new THREE.BufferGeometry();
    geo.setIndex(g.index);
    geo.setAttribute("position", new THREE.BufferAttribute(g.pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(g.uv, 2));
    geo.userData = { nu, nv, s };
    neuForm(geo, 0);
    return geo;
  };
  function neuForm(geo, p) {
    const { nu, nv, s } = geo.userData;
    forme(geo.attributes.position.array, nu, nv, s, p);
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  }
  const flaeche = (canvas, s, reihenfolge, nu = 24, nv = 24) => {
    const m = new THREE.Mesh(flaecheGeo(s, nu, nv), new THREE.MeshStandardMaterial({ map: tex(canvas), transparent: true, alphaTest: 0.5, roughness: 0.88 }));
    m.renderOrder = reihenfolge; m.receiveShadow = true; scene.add(m); return m;
  };

  // Hauptplakat, Anarchie-A und Sticker; Sticker liegen über y 3.0, damit sie keinen Bandplatz verdecken
  flaeche(malFOF(), { th: 0, y: 2.97, w: 1.68, h: 1.82, r: R + 0.006 }, 2, 40, 30);
  flaeche(malSprayA(), { th: 0.64, y: 3.5, w: 0.62, h: 0.62, r: R + 0.012 }, 4);
  flaeche(malSticker(T.sticker.kauf, 520, 400, -0.12, 31), { th: -0.8, y: 3.52, w: 0.52, h: 0.4, r: R + 0.011 }, 4);
  flaeche(malSticker(T.sticker.punk, 440, 420, 0.1, 32), { th: 1.5, y: 3.45, w: 0.42, h: 0.4, r: R + 0.011 }, 4);
  flaeche(malSticker(T.sticker.diy, 360, 260, 0.2, 33, "#bf161b", "#f1ede4"), { th: -1.62, y: 3.42, w: 0.34, h: 0.25, r: R + 0.011 }, 4);
  // POGO!-Aufkleber: antippen öffnet das Browserspiel
  const pogoSticker = flaeche(malSticker(T.sticker.pogo, 440, 360, -0.1, 34, "#f2b632", "#141212"), { th: 3.0, y: 3.4, w: 0.8, h: 0.62, r: R + 0.011 }, 4);
  pogoSticker.userData.id = POGO;

  /* Bandplakate mit Zettel darunter */
  const plakate = bands.slice(0, PLATZ.length).map((band, i) => {
    const [th, y] = PLATZ[i];
    const s = { th, y, w: 0.8, h: 0.8, r: R + 0.008 };
    flaeche(malZettel(band, band.termine, sp, band.hatDaten), { th, y: y + 0.01, w: 0.74, h: 0.74, r: R + 0.004 }, 1, 16, 16);
    const { vorne, hinten } = malPlakat(band, band.bild, { kopfzeile: T.kopfzeile, naechstText: band.naechstText, baldText: band.baldText });
    const geo = flaecheGeo(s, 36, 36);
    const vorderMat = new THREE.MeshStandardMaterial({ map: tex(vorne), transparent: true, alphaTest: 0.5, roughness: 0.82, side: THREE.FrontSide });
    const rueckMat = new THREE.MeshStandardMaterial({ map: tex(hinten), transparent: true, alphaTest: 0.5, roughness: 0.95, side: THREE.BackSide });
    const gruppe = new THREE.Group();
    const vorn = new THREE.Mesh(geo, vorderMat), rueck = new THREE.Mesh(geo, rueckMat);
    vorn.renderOrder = 3; rueck.renderOrder = 3; vorn.receiveShadow = true; vorn.castShadow = true;
    vorn.customDepthMaterial = new THREE.MeshDepthMaterial({ map: vorderMat.map, alphaTest: 0.5 });
    vorn.userData.id = band.id;
    gruppe.add(vorn, rueck); scene.add(gruppe);
    return { id: band.id, s, geo, gruppe, mats: [vorderMat, rueckMat], vorn, p: 0, zustand: "haengt", t: 0, warte: 0, fertig: null };
  });
  const finde = (id) => plakate.find((x) => x.id === id);

  /* Kamera */
  let az = 0, abstand = 10, modus = "gesamt", aktiv = null, benutzt = ruhig, flug = null, zeit = 0, schwebt = null;
  const ziel = new THREE.Vector3(0, ZIEL.y, 0);
  const tan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function gesamtPos(winkel = az) {
    return new THREE.Vector3(Math.sin(winkel) * abstand, ZIEL.y + 0.5, Math.cos(winkel) * abstand);
  }
  function plakatAnsicht(pl) {
    const { th, y } = pl.s, breit = buehne.clientWidth >= 900;
    const raus = new THREE.Vector3(Math.sin(th), 0, Math.cos(th)), quer = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    const z = raus.clone().multiplyScalar(R).setY(y).addScaledVector(quer, breit ? 0.42 : 0);
    if (!breit) z.y -= 0.42;
    const d = Math.max(3.1, 0.62 / (tan() * camera.aspect));
    return { pos: z.clone().addScaledVector(raus, d).add(new THREE.Vector3(0, 0.25, 0)), ziel: z };
  }
  function fliegeZu(ansicht, dauer = 0.95) {
    flug = { von: { pos: camera.position.clone(), ziel: ziel.clone() }, nach: ansicht, t: 0, dauer: ruhig ? 0 : dauer };
  }
  function passeAn() {
    const w = buehne.clientWidth, h = buehne.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    abstand = Math.max(2.95 / tan(), 1.6 / (tan() * camera.aspect));
    if (!flug) {
      if (modus === "gesamt") { camera.position.copy(gesamtPos()); ziel.set(0, ZIEL.y, 0); }
      else if (aktiv) { const a = plakatAnsicht(finde(aktiv)); camera.position.copy(a.pos); ziel.copy(a.ziel); }
      camera.lookAt(ziel);
    }
    zeichne = true;
  }

  /* Zeiger: waagerecht drehen, senkrecht scrollen lassen, kurz = antippen */
  const strahl = new THREE.Raycaster(), maus = new THREE.Vector2();
  let zeiger = null, schwung = 0;
  const triff = (e) => {
    const r = leinwand.getBoundingClientRect();
    maus.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    strahl.setFromCamera(maus, camera);
    const ziele = [...plakate.filter((p) => p.gruppe.visible && p.zustand === "haengt").map((p) => p.vorn), pogoSticker];
    return strahl.intersectObjects(ziele)[0]?.object.userData.id ?? null;
  };
  const runter = (e) => { zeiger = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, art: null }; };
  const bewegt = (e) => {
    if (zeiger && e.pointerId === zeiger.id) {
      if (!zeiger.art) {
        zeiger.art = richtung(e.clientX - zeiger.x0, e.clientY - zeiger.y0);
        if (zeiger.art === "dreh") { try { leinwand.setPointerCapture(e.pointerId); } catch {} }
      }
      if (zeiger.art === "dreh" && modus === "gesamt") {
        const dx = e.clientX - zeiger.x; benutzt = true;
        az -= dx * 0.006; schwung = -dx * 0.006; zeichne = true;
      }
      zeiger.x = e.clientX;
      return;
    }
    if (e.pointerType === "mouse" && modus !== "gesamt") leinwand.style.cursor = triff(e) === POGO ? "pointer" : "";
    if (e.pointerType === "mouse" && modus === "gesamt") {
      const neu = triff(e);
      if (neu !== schwebt) { schwebt = neu; zeichne = true; }
      leinwand.style.cursor = schwebt ? "pointer" : "grab";
    }
  };
  const hoch = (e) => {
    if (!zeiger || e.pointerId !== zeiger.id) return;
    const kurz = !zeiger.art;
    zeiger = null;
    if (kurz) { const id = triff(e); if (id === POGO) location.assign("pogo.html#pogo-spiel"); else if (id) beiAntippen(id); } // auch in der Plakatansicht: Nachbar antippen wechselt
  };
  const abbruch = () => { zeiger = null; };
  const raus = () => { if (schwebt) { schwebt = null; zeichne = true; } };
  leinwand.addEventListener("pointerdown", runter);
  leinwand.addEventListener("pointermove", bewegt);
  leinwand.addEventListener("pointerup", hoch);
  leinwand.addEventListener("pointercancel", abbruch);
  leinwand.addEventListener("pointerleave", raus);

  /* Bildschleife: nur bei sichtbarer Bühne und sichtbarem Tab */
  const uhr = new THREE.Clock();
  const sanft = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let zeichne = true, imBild = false, laeuft = false;
  buehne.bilder = 0; // Zähler für die Prüfung
  function bild() {
    const dt = Math.min(uhr.getDelta(), 0.1); zeit += dt;
    if (flug) {
      flug.t = flug.dauer ? Math.min(1, flug.t + dt / flug.dauer) : 1;
      const k = sanft(flug.t);
      camera.position.lerpVectors(flug.von.pos, flug.nach.pos, k);
      ziel.lerpVectors(flug.von.ziel, flug.nach.ziel, k);
      if (flug.t >= 1) flug = null;
      zeichne = true;
    } else if (modus === "gesamt") {
      if (!benutzt) az = 0.34 * Math.sin(zeit * 0.22);
      else if (Math.abs(schwung) > 1e-4 && !zeiger) { az += schwung; schwung *= 0.9; }
      if (!benutzt || Math.abs(schwung) > 1e-4) { camera.position.copy(gesamtPos()); zeichne = true; }
    }
    for (const pl of plakate) {
      const alt = pl.p;
      if (pl.zustand === "haengt") {
        const soll = !ruhig && schwebt === pl.id && modus === "gesamt" ? 0.17 : 0;
        pl.p += (soll - pl.p) * Math.min(1, dt * 10); if (Math.abs(pl.p) < 1e-3 && soll === 0) pl.p = 0;
      } else if (pl.zustand === "reisst") {
        if (pl.warte > 0) pl.warte -= dt;
        else {
          pl.p = Math.min(1, pl.p + dt * (0.5 + 2.6 * pl.p));
          if (pl.p >= 1) { pl.zustand = "faellt"; pl.t = 0; const f = pl.fertig; pl.fertig = null; f?.(); }
        }
      } else if (pl.zustand === "faellt") {
        pl.t = Math.min(1, pl.t + dt / 0.75);
        const r = new THREE.Vector3(Math.sin(pl.s.th), 0, Math.cos(pl.s.th));
        pl.gruppe.position.copy(r.multiplyScalar(0.9 * pl.t)).add(new THREE.Vector3(0, -2.2 * pl.t * pl.t, 0));
        pl.mats.forEach((m) => (m.opacity = 1 - pl.t));
        if (pl.t >= 1) { pl.zustand = "weg"; pl.gruppe.visible = false; }
        zeichne = true;
      } else if (pl.zustand === "klebt") {
        pl.t = Math.min(1, pl.t + dt / 0.25); pl.mats.forEach((m) => (m.opacity = pl.t));
        pl.p = Math.max(0, pl.p - dt * 2.4);
        if (pl.p <= 0) { pl.zustand = "haengt"; pl.mats.forEach((m) => (m.opacity = 1)); }
        zeichne = true;
      }
      if (pl.p !== alt) { neuForm(pl.geo, pl.p); zeichne = true; }
    }
    if (!zeichne) return;
    zeichne = false;
    camera.lookAt(ziel);
    renderer.render(scene, camera);
    buehne.bilder++;
  }
  function pruefeLauf() {
    const soll = imBild && document.visibilityState === "visible";
    if (soll === laeuft) return;
    laeuft = soll;
    if (soll) { uhr.getDelta(); zeichne = true; }
    renderer.setAnimationLoop(soll ? bild : null);
  }
  const io = new IntersectionObserver(([e]) => { imBild = e.isIntersecting; pruefeLauf(); });
  io.observe(buehne);
  document.addEventListener("visibilitychange", pruefeLauf);
  const ro = new ResizeObserver(passeAn);
  ro.observe(buehne);
  passeAn();
  camera.position.copy(gesamtPos()); camera.lookAt(ziel);
  renderer.render(scene, camera); // erstes Bild sofort, auch bevor der Observer meldet

  return {
    reisse(id, fertig) {
      const pl = finde(id); if (!pl) { fertig(); return; }
      aktiv = id; modus = "plakat"; schwebt = null; benutzt = true; leinwand.style.cursor = "";
      fliegeZu(plakatAnsicht(pl));
      if (ruhig || !laeuft) { pl.zustand = "weg"; pl.gruppe.visible = false; zeichne = true; fertig(); return; }
      pl.zustand = "reisst"; pl.warte = 0.35; pl.fertig = fertig;
    },
    klebe(id, zurueck) {
      const pl = finde(id); if (!pl) return;
      pl.fertig = null;
      pl.gruppe.visible = true; pl.gruppe.position.set(0, 0, 0);
      if (ruhig || !laeuft) { pl.zustand = "haengt"; pl.p = 0; pl.mats.forEach((m) => (m.opacity = 1)); neuForm(pl.geo, 0); }
      else { pl.zustand = "klebt"; pl.p = 1; pl.t = 0; pl.mats.forEach((m) => (m.opacity = 0)); }
      if (zurueck) { aktiv = null; modus = "gesamt"; fliegeZu({ pos: gesamtPos(), ziel: new THREE.Vector3(0, ZIEL.y, 0) }); }
      zeichne = true;
    },
    ende() {
      renderer.setAnimationLoop(null);
      io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", pruefeLauf);
      texturen.forEach((t) => t.dispose());
      scene.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => m.dispose?.()); });
      renderer.dispose(); renderer.forceContextLoss?.();
      leinwand.remove();
    },
  };
}

/** Text unter dem Logo: nächster Termin, sonst „gerade still“ (bzw. Beschreibung, wenn keine Daten da sind). */
export function naechstText(n, sp, hatDaten, beschreibung) {
  if (n) return `${tagDatum(n.datum, sp)} · ${n.stadt}`;
  return hatDaten ? TEXTE[sp].naechstStill : beschreibung || "";
}
