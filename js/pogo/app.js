// Pogo: Spielablauf, Eingabe und Anzeigen. Regeln in regeln.js, Menge in physik.js, Bild in szene.js.
import {
  DAUER, teilBei, zone, punkteProSekunde, imTakt, verschuettet, ergebnis, titelSchluessel, geste,
  SPRUNG, GEDRAENGE, STAGEDIVE_AB, BONUS,
} from "./regeln.js?v=31";
import { person, bewegeMenge, randSchubs, integriere, stoesse } from "./physik.js?v=31";
import { sprache, TEXTE } from "./texte.js?v=31";
import { LAEDEN } from "./laeden.js?v=31";
import { erzeugeMusik } from "./musik.js?v=31";

const sp = sprache(), T = TEXTE[sp];
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const spielEl = $("pogo-spiel");
const zufall = (a, b) => a + Math.random() * (b - a);

let THREE, S, F; // three.js, Szene, Figuren-Modul
const musik = erzeugeMusik();

/* ---------- Spielzustand ---------- */
let ladenId = "keller", L, leute = [], figuren = new Map(), ich, becher;
let bier, punkte, zeit, laeuft = false, pausiert = false, wall, beruehrt, freibier, surfer, tropfen, randPop;
let sprungBis, reiheSeit, nassBis, letzterSpritzer, duDaTeile, wuerfe, andenken, geplanteWuerfe, stagedive, mikroAn;

function neueRunde() {
  L = LAEDEN[ladenId];
  S.baueRaum(L);
  leute = []; figuren = new Map();
  const zMin = L.gitterZ + 0.4, zMax = L.z[1] - 0.4;
  for (let z = zMin + 0.6; z < zMax; z += 0.75) for (const sx of [-1, 1]) leute.push(person({ x: sx * (L.x - 0.3), z, rand: true }));
  for (let i = 0; i < L.leute; i++) leute.push(person({ x: zufall(-L.x + 1, L.x - 1), z: zufall(zMin + 1, zMax - 1.5), rucksack: i === 2 }));
  ich = person({ x: 0, z: zMax - 1.2, ich: true });
  leute.push(ich);
  for (const p of leute) {
    const f = p.ich ? F.baueFigur(THREE, { shirt: "#eeeae0", aermel: "#eeeae0", haar: ["iro", "#d4161b"], aufnaeher: true }) : F.baueFigur(THREE, { rucksack: p.rucksack });
    f.phase = zufall(0, 6.28); f.sprung = zufall(0.22, 0.42); f.armGrund = Math.random() < 0.5 ? zufall(2.3, 2.9) : zufall(0.2, 0.8); f.blick = 0;
    f.g.position.set(p.x, 0, p.z); S.raum.add(f.g); figuren.set(p, f);
  }
  becher = F.baueBecher(THREE); becher.scale.setScalar(1.8); becher.position.y = -0.6; figuren.get(ich).arme[1].add(becher);
  bier = 100; punkte = 0; zeit = 0; wall = null; beruehrt = new Map(); freibier = null; surfer = null; tropfen = []; randPop = -9;
  sprungBis = 0; reiheSeit = 0; nassBis = 0; letzterSpritzer = -99; duDaTeile = new Set(); wuerfe = []; andenken = [];
  geplanteWuerfe = [{ art: "plektrum", t: 24 }, { art: "drumstick", t: 56 }];
  if (Math.random() < 0.3) geplanteWuerfe.push({ art: "setliste", t: 52 });
  stagedive = { phase: "aus", fertig: false }; mikroAn = false;
  $("pogo-stagedive").hidden = true; $("pogo-hinweis").textContent = "";
  S.kamera(ich, 0, true);
}

/* ---------- Anzeigen ---------- */
const popsEl = $("pogo-pops");
function pop(text, farbe = "var(--bier)") {
  if (!text) return;
  const p = document.createElement("div"); p.className = "pogo__pop"; p.textContent = text; p.style.color = farbe;
  p.style.left = (50 + zufall(-14, 14)) + "%"; popsEl.append(p); setTimeout(() => p.remove(), 1200);
}
const welt = () => new THREE.Vector3();
function spritzer(menge, farbe = 0xf2b632) {
  const pos = welt(); becher.getWorldPosition(pos);
  const mat = new THREE.MeshBasicMaterial({ color: farbe }), geo = new THREE.SphereGeometry(0.03, 6, 5);
  for (let i = 0; i < Math.min(16, 3 + menge * 1.3); i++) {
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos); S.raum.add(m);
    tropfen.push({ m, v: new THREE.Vector3(zufall(-1.6, 1.6), zufall(0.5, 2.5), zufall(-1.6, 1.6)), t: 0 });
  }
}
function verschuette(menge, grund) {
  if (menge <= 0) return;
  bier = Math.max(0, bier - menge);
  spritzer(menge); if (grund) pop(grund); S.wackeln(menge * 0.015);
}

/* ---------- Aktionen ---------- */
function springe() {
  if (!laeuft || pausiert || stagedive.phase === "getragen" || ich.inLuft) return;
  ich.inLuft = true; sprungBis = zeit + 0.45;
  if (mikroAn && zone(ich.x, ich.z, L) === "reihe") {
    if (imTakt(zeit)) { punkte += BONUS.oi; pop(T.oi, "var(--paper)"); } else pop(T.daneben, "var(--paper-2)");
    return;
  }
  if (imTakt(zeit)) { punkte += SPRUNG.bonus; pop(T.takt, "#58d26a"); }
  else { bier = Math.max(0, bier - SPRUNG.daneben); spritzer(2); }
}
function wische(seite) {
  if (stagedive.phase !== "getragen" || !stagedive.griff) return;
  if (seite === -stagedive.griff.seite) { pop(T.abgewehrt, "#58d26a"); stagedive.griff = null; }
}
function starteStagedive() {
  if (stagedive.phase !== "aus" || stagedive.fertig) return;
  stagedive = { phase: "getragen", t: 0, z0: ich.z, z1: L.z[1] - 1.2, griff: null, naechsterGriff: 0.8, fertig: true };
  ich.vx = ich.vz = 0; $("pogo-stagedive").hidden = true;
  $("pogo-hinweis").textContent = T.getragen;
}

/* ---------- Eingabe ---------- */
const stick = $("pogo-stick"), knauf = $("pogo-knauf");
let zeiger = null;
function beginneZeiger(e) {
  if (!laeuft) return;
  const r = spielEl.getBoundingClientRect();
  zeiger = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, dy: 0, weg: 0, ziehen: false, rx: e.clientX - r.left, ry: e.clientY - r.top };
  S.renderer.domElement.setPointerCapture?.(e.pointerId);
}
function bewegeZeiger(e) {
  if (!zeiger || e.pointerId !== zeiger.id) return;
  let dx = e.clientX - zeiger.x0, dy = e.clientY - zeiger.y0; const d = Math.hypot(dx, dy);
  zeiger.weg = Math.max(zeiger.weg, d);
  if (!zeiger.ziehen && geste(0, zeiger.weg) === "ziehen") {
    zeiger.ziehen = true; stick.style.left = zeiger.rx + "px"; stick.style.top = zeiger.ry + "px"; stick.hidden = false;
  }
  if (stagedive.phase === "getragen" && Math.abs(dx) > 30) { wische(Math.sign(dx)); zeiger.x0 = e.clientX; }
  if (d > 40) { dx *= 40 / d; dy *= 40 / d; }
  zeiger.dx = dx / 40; zeiger.dy = dy / 40; knauf.style.transform = `translate(${dx}px, ${dy}px)`;
}
function beendeZeiger(e) {
  if (!zeiger || (e && e.pointerId !== zeiger.id)) return;
  if (geste(performance.now() - zeiger.t0, zeiger.weg) === "tippen") springe();
  zeiger = null; stick.hidden = true;
}
const tasten = new Set();
addEventListener("keydown", (e) => {
  if (!laeuft) return;
  if (e.key === " ") { e.preventDefault(); springe(); return; }
  if (stagedive.phase === "getragen" && (e.key === "ArrowLeft" || e.key === "a")) { wische(-1); return; }
  if (stagedive.phase === "getragen" && (e.key === "ArrowRight" || e.key === "d")) { wische(1); return; }
  if (/^(Arrow|[wasd]$)/.test(e.key)) { tasten.add(e.key); e.preventDefault(); }
});
addEventListener("keyup", (e) => tasten.delete(e.key));

/* ---------- Ein Spielschritt ---------- */
const q = { a: null, b: null };
function schritt(dt) {
  zeit += dt;
  const teil = teilBei(zeit), kraft = teil.kraft, zMin = L.gitterZ + 0.4, zMax = L.z[1] - 0.4;
  const getragen = stagedive.phase === "getragen";

  if (L.wall) {
    if (zeit > 31 && zeit < 36 && !wall) { wall = { phase: "teilen" }; pop(T.wall, "var(--blood-hot)"); }
    if (wall?.phase === "teilen" && zeit >= 36) { wall = { phase: "rennen", t: 0 }; pop(T.los, "var(--blood-hot)"); }
    if (wall?.phase === "rennen") { wall.t += dt; if (wall.t > 2.4) wall = { phase: "vorbei" }; }
  }

  // Du: Stick oder Tasten (oben = zur Bühne)
  if (!getragen) {
    let sx = 0, sz = 0;
    if (zeiger?.ziehen) { sx = zeiger.dx; sz = zeiger.dy; }
    if (tasten.has("ArrowLeft") || tasten.has("a")) sx -= 1; if (tasten.has("ArrowRight") || tasten.has("d")) sx += 1;
    if (tasten.has("ArrowUp") || tasten.has("w")) sz -= 1; if (tasten.has("ArrowDown") || tasten.has("s")) sz += 1;
    const sl = Math.hypot(sx, sz);
    if (sl > 0.12) { const f = Math.min(1, sl); ich.vx += (sx / sl) * 22 * f * dt; ich.vz += (sz / sl) * 22 * f * dt; }
    if (randSchubs(ich, L, dt) && zeit - randPop > 3) { randPop = zeit; pop(T.randSchubs, "var(--paper)"); }
  }
  if (ich.inLuft && zeit >= sprungBis) ich.inLuft = false;

  const menge = getragen ? leute.filter((p) => !p.ich) : leute;
  bewegeMenge(menge, L, teil, dt, Math.random, wall);
  integriere(menge, L, dt, S.matsch);
  for (const tr of stoesse(menge)) {
    const letzte = beruehrt.get(tr.anderer) || -9;
    if (zeit - letzte < 0.3) continue;
    const m = verschuettet(tr.schlag, { rucksack: tr.anderer.rucksack, inLuft: ich.inLuft });
    if (m > 0) { beruehrt.set(tr.anderer, zeit); verschuette(m, tr.anderer.rucksack ? T.rucksack : m > 7 ? T.platsch : m > 3 ? T.schwapp : null); }
  }

  // Zonen, Punkte, erste Reihe
  const z = getragen ? "pit" : zone(ich.x, ich.z, L), nass = zeit < nassBis;
  if (!getragen) punkte += punkteProSekunde(z, teil, nass) * dt;
  reiheSeit = z === "reihe" && !getragen ? reiheSeit + dt : 0;
  if (z === "reihe") bier = Math.max(0, bier - GEDRAENGE * kraft * dt);
  if (z === "reihe" && kraft >= 1 && reiheSeit > 3 && zeit - letzterSpritzer > 8) {
    letzterSpritzer = zeit; nassBis = zeit + 3; pop(T.abkuehlen, "#7fc8ff"); spritzer(8, 0x7fc8ff);
  }
  if (z === "reihe" && kraft >= 1 && reiheSeit > 1.5 && !duDaTeile.has(teil.bis)) {
    duDaTeile.add(teil.bis); punkte += BONUS.duDa; pop(T.duDa, "var(--blood-hot)"); S.band[1].zeigtBis = zeit + 1.5;
  }
  mikroAn = zeit >= 44 && zeit < 48;
  const stagediveBereit = !stagedive.fertig && reiheSeit >= STAGEDIVE_AB;
  $("pogo-stagedive").hidden = !stagediveBereit;
  if (!getragen) $("pogo-hinweis").textContent = mikroAn && z === "reihe" ? T.mikro : (T.zonen[z] || "");

  // Würfe von der Bühne
  for (const w of geplanteWuerfe) if (!w.los && zeit >= w.t) {
    w.los = true;
    const art = w.art, farbe = art === "plektrum" ? 0xd4161b : art === "drumstick" ? 0xd8c08a : 0xf1ede4;
    const geo = art === "plektrum" ? new THREE.CylinderGeometry(0.09, 0.09, 0.02, 3) : art === "drumstick" ? new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6) : new THREE.PlaneGeometry(0.3, 0.42);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: farbe, emissive: farbe, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
    m.scale.setScalar(1.6);
    const von = new THREE.Vector3(zufall(-1.6, 1.6), 1.8, L.z[0] - 1), nach = new THREE.Vector3(zufall(-L.x + 1, L.x - 1), 0.15, zufall(L.gitterZ + 0.4, L.gitterZ + 2.2));
    m.position.copy(von); S.raum.add(m);
    wuerfe.push({ art, m, von, nach, t: 0, liegt: 0 });
  }
  for (const w of wuerfe) {
    if (w.t < 1.2) {
      w.t = Math.min(1.2, w.t + dt); const k = w.t / 1.2;
      w.m.position.lerpVectors(w.von, w.nach, k); w.m.position.y += Math.sin(k * Math.PI) * 2.2; w.m.rotation.x += dt * 9; w.m.rotation.z += dt * 6;
    } else w.liegt += dt;
    if (!w.weg && Math.hypot(w.m.position.x - ich.x, w.m.position.z - ich.z) < 0.7 && w.t > 0.6 && !getragen) {
      w.weg = true; punkte += BONUS[w.art]; andenken.push(w.art); pop(T[w.art], "var(--paper)");
    }
    if (w.liegt > 2) w.weg = true;
    if (w.weg) S.raum.remove(w.m);
  }
  wuerfe = wuerfe.filter((w) => !w.weg);

  // Stagedive: getragen nach hinten, Hände greifen nach dem Becher
  if (getragen) {
    const sd = stagedive; sd.t += dt;
    ich.z = sd.z0 + (sd.z1 - sd.z0) * Math.min(1, sd.t / 5); ich.x += Math.sin(zeit * 2) * 0.3 * dt;
    sd.naechsterGriff -= dt;
    if (!sd.griff && sd.naechsterGriff <= 0) { sd.griff = { seite: Math.random() < 0.5 ? -1 : 1, bis: zeit + 0.6 }; sd.naechsterGriff = 0.7; pop((sd.griff.seite < 0 ? "← " : "") + T.hand + (sd.griff.seite > 0 ? " →" : ""), "var(--blood-hot)"); }
    if (sd.griff && zeit > sd.griff.bis) { sd.griff = null; verschuette(12, T.schwapp); }
    if (sd.t >= 5) {
      stagedive = { phase: "aus", fertig: true }; ich.vx = ich.vz = 0; $("pogo-hinweis").textContent = "";
      if (bier > 0) { punkte += BONUS.stagedive; pop(T.gelandet, "#58d26a"); } else pop(T.bierdusche);
    }
  }

  // Crowdsurfer (andere)
  if (L.surfer && !surfer && kraft >= 0.9 && Math.random() < dt * 0.3) {
    const f = F.baueFigur(THREE); f.g.rotation.set(-Math.PI / 2, 0, 0); f.arme.forEach((a, k) => (a.rotation.z = k ? 2.9 : -2.9));
    surfer = { f, x: zufall(-L.x + 1.5, L.x - 1.5), z: zMin, traf: false }; f.g.position.set(surfer.x, 2.15, surfer.z); S.raum.add(f.g); pop(T.crowdsurfer, "var(--paper)");
  }
  if (surfer) {
    surfer.z += 1.5 * dt; surfer.x += Math.sin(zeit * 2) * 0.3 * dt; surfer.f.g.position.set(surfer.x, 2.15 + Math.sin(zeit * 9) * 0.06, surfer.z);
    if (!getragen && !surfer.traf && Math.hypot(surfer.x - ich.x, surfer.z - ich.z) < 0.55) { surfer.traf = true; verschuette(14, T.stiefel); }
    if (surfer.z > zMax + 1.5) { S.raum.remove(surfer.f.g); surfer = null; }
  }

  // Freibier
  if (!freibier && Math.random() < dt * 0.06) {
    const g = F.baueBecher(THREE); g.scale.setScalar(2.4); const licht = new THREE.PointLight(0xffc040, 4, 3, 2); licht.position.y = 0.4; g.add(licht);
    freibier = { g, x: zufall(-L.x + 1, L.x - 1), z: zufall(zMin + 1.5, zMax - 0.5), t: 0 }; g.position.set(freibier.x, 0.25, freibier.z); S.raum.add(g);
  }
  if (freibier) {
    freibier.t += dt; freibier.g.rotation.y += dt * 2; freibier.g.position.y = 0.25 + Math.sin(zeit * 4) * 0.05;
    if (!getragen && Math.hypot(freibier.x - ich.x, freibier.z - ich.z) < 0.55) { bier = Math.min(100, bier + 25); pop(T.freibier, "#58d26a"); S.raum.remove(freibier.g); freibier = null; }
    else if (freibier.t > 7) { S.raum.remove(freibier.g); freibier = null; }
  }

  bewegeFiguren(dt, kraft, getragen);
  for (const d of tropfen) { d.t += dt; d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt); }
  for (const d of tropfen) if (d.t > 0.8) S.raum.remove(d.m);
  tropfen = tropfen.filter((d) => d.t <= 0.8);
  S.setzeLicht(kraft, zeit, (176 / 60) * Math.PI);

  if (bier <= 0) ende(true);
  else if (zeit >= DAUER) ende(false);
}

/* ---------- Figuren bewegen ---------- */
function bewegeFiguren(dt, kraft, getragen) {
  const takt = (176 / 60) * Math.PI;
  for (const p of leute) {
    const f = figuren.get(p);
    f.phase += dt * takt * (0.85 + kraft * 0.3);
    if (p.ich) {
      const hop = p.inLuft ? Math.sin(Math.max(0, 1 - (sprungBis - zeit) / 0.45) * Math.PI) * 0.5 : 0;
      f.g.position.set(p.x, getragen ? 2.1 : hop, p.z);
      f.g.rotation.set(getragen ? -Math.PI / 2 : 0, 0, 0);
      f.arme[1].rotation.z = 2.75 + Math.sin(zeit * 7) * 0.05;
      f.arme[0].rotation.z = -0.5 - Math.abs(Math.sin(f.phase)) * 0.4;
      continue;
    }
    const hop = p.rand ? 0.05 + kraft * 0.08 : f.sprung * (0.3 + kraft * 0.8);
    f.g.position.set(p.x, Math.abs(Math.sin(f.phase)) * hop, p.z);
    const ziel = Math.atan2(p.vx, 6) * 0.6; f.blick += (ziel - f.blick) * Math.min(1, dt * 4);
    f.g.rotation.y = -f.blick + Math.sin(f.phase * 0.5) * 0.15;
    f.arme[0].rotation.z = -(f.armGrund + Math.sin(f.phase * 2) * 0.5 * kraft);
    f.arme[1].rotation.z = f.armGrund * (p.rand ? 0.3 : 1) + Math.cos(f.phase * 2) * 0.5 * kraft;
  }
  // Becher bleibt gerade, egal wie Arm und Körper stehen
  q.a ??= new THREE.Quaternion();
  becher.parent.getWorldQuaternion(q.a); becher.quaternion.copy(q.a.invert());
  F.becherStand(becher, bier / 100, zeit < nassBis);
  // Band und Ordner
  S.band.forEach((b, i) => {
    b.phase += dt * takt;
    b.g.position.y = 0.9 + Math.abs(Math.sin(b.phase)) * 0.12 * (0.4 + kraft);
    if (i === 1) {
      const zeigt = (b.zeigtBis || 0) > zeit;
      b.koerper.rotation.x = mikroAn ? 0.55 : 0; // beugt sich mit dem Mikro zur ersten Reihe
      b.arme[1].rotation.z = zeigt ? 1.5 : mikroAn ? 1.2 : 0.6 + Math.sin(b.phase * 2) * 0.4;
    } else b.arme[1].rotation.z = 0.6 + Math.sin(b.phase * 2) * 0.4;
  });
  const o = S.ordner; o.g.position.x += (ich.x * 0.6 - o.g.position.x) * Math.min(1, dt * 0.8); o.g.rotation.y = 0;
  o.arme[1].rotation.z = zeit < nassBis ? 2.2 : 0.3;
}

/* ---------- Ablauf ---------- */
let letzte = performance.now(), fpsZeit = 0, fpsBilder = 0;
const fpsEl = $("pogo-fps"), zeigeFps = new URLSearchParams(location.search).has("fps");
if (zeigeFps) fpsEl.hidden = false;
function bild(jetzt) {
  // Spielzeit = echte Zeit (der Beat läuft nach der Uhr); Physik in Teilschritten von höchstens 50 ms
  const echt = Math.min(0.25, (jetzt - letzte) / 1000 || 0); letzte = jetzt;
  const dt = Math.min(0.05, echt);
  if (!pausiert) {
    if (laeuft) { let rest = echt; while (rest > 1e-6 && laeuft) { const d = Math.min(0.05, rest); schritt(d); rest -= d; } }
    else if (L) { bewegeMenge(leute.filter((p) => !p.ich), L, { kraft: 0.3 }, dt); integriere(leute, L, dt, S.matsch); bewegeFiguren(dt, 0.3, false); S.setzeLicht(0.3, performance.now() / 1000, 3); }
    if (L) S.kamera(ich, dt, false, stagedive?.phase === "getragen");
    S.render();
    if (laeuft) zeigeStand();
    if (zeigeFps) { fpsBilder++; fpsZeit += echt; if (fpsZeit > 0.5) { fpsEl.textContent = `${Math.round(fpsBilder / fpsZeit)} fps · ${S.zeichenaufrufe()} Aufrufe`; fpsZeit = 0; fpsBilder = 0; } }
  }
  requestAnimationFrame(bild);
}
function zeigeStand() {
  const b = Math.round(bier);
  $("pogo-bierstand").style.height = b + "%"; $("pogo-bier").textContent = b + " %";
  $("pogo-punkte").textContent = Math.round(punkte);
  $("pogo-teil").textContent = T.teile[teilBei(zeit).name];
  const rest = Math.max(0, Math.ceil(DAUER - zeit)); $("pogo-zeit").textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`;
}

function starte() {
  neueRunde();
  $("pogo-start").hidden = true; $("pogo-ende").hidden = true; $("pogo-hud").hidden = false; $("pogo-tonbox").hidden = false;
  spielEl.scrollIntoView({ block: "nearest" });
  laeuft = true; pausiert = false;
  musik.start(() => zeit);
}
function ende(leer) {
  laeuft = false; musik.stopp(); beendeZeiger(); tasten.clear();
  stagedive = { phase: "aus", fertig: true }; $("pogo-stagedive").hidden = true; $("pogo-hinweis").textContent = "";
  const b = leer ? 0 : Math.round(bier), p = Math.round(punkte);
  $("pogo-ende-laden").textContent = T.laeden[ladenId].name;
  $("pogo-ende-titel").textContent = T.titel[titelSchluessel(p, b)];
  $("pogo-ende-zahl").textContent = ergebnis(p, b);
  $("pogo-ende-werte").textContent = `${T.punkte} ${p} × ${T.bier} ${b} %`;
  $("pogo-ende-andenken").textContent = andenken.length ? `${T.andenken}: ${andenken.map((a) => T[a].replace("!", "")).join(", ")}` : T.keineAndenken;
  $("pogo-ende").hidden = false; $("pogo-hud").hidden = true; $("pogo-tonbox").hidden = true;
  $("pogo-nochmal").focus({ preventScroll: true });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { pausiert = true; if (laeuft) musik.pause(); }
  else { pausiert = false; letzte = performance.now(); if (laeuft) musik.weiter(); }
});

/* ---------- Start ---------- */
async function los() {
  const c = document.createElement("canvas");
  const webgl = (() => { try { return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (!webgl) { $("pogo-ohne3d").hidden = false; $("pogo-start").hidden = true; return; }
  try {
    [THREE, { baueSzene: S }, F] = await Promise.all([
      import("../../assets/vendor/three.module.min.js"),
      import("./szene.js?v=31").then((m) => ({ baueSzene: m.baueSzene })),
      import("./figuren.js?v=31"),
    ]);
    S = S(THREE, { container: spielEl, ruhig });
  } catch (fehler) {
    console.warn("Pogo: 3D nicht möglich", fehler);
    $("pogo-ohne3d").hidden = false; $("pogo-start").hidden = true; return;
  }
  const el = S.renderer.domElement;
  el.addEventListener("pointerdown", beginneZeiger);
  el.addEventListener("pointermove", bewegeZeiger);
  el.addEventListener("pointerup", beendeZeiger);
  el.addEventListener("pointercancel", () => { zeiger = null; stick.hidden = true; });

  const laedenEl = $("pogo-laeden");
  for (const id of Object.keys(LAEDEN)) {
    const b = document.createElement("button"); b.type = "button"; b.className = "pogo__laden"; b.id = "pogo-laden-" + id;
    b.setAttribute("aria-pressed", String(id === ladenId));
    b.innerHTML = "<b></b><span></span>"; b.querySelector("b").textContent = T.laeden[id].name; b.querySelector("span").textContent = T.laeden[id].text;
    b.addEventListener("click", () => { ladenId = id; laedenEl.querySelectorAll(".pogo__laden").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); neueRunde(); });
    laedenEl.append(b);
  }
  $("pogo-los").addEventListener("click", starte);
  $("pogo-nochmal").addEventListener("click", starte);
  $("pogo-anderer").addEventListener("click", () => { $("pogo-ende").hidden = true; $("pogo-start").hidden = false; });
  $("pogo-stagedive").addEventListener("click", starteStagedive);
  let tonAn = true;
  $("pogo-ton").addEventListener("click", (e) => { tonAn = !tonAn; musik.setzeTon(tonAn); e.currentTarget.textContent = tonAn ? T.tonAn : T.tonAus; e.currentTarget.setAttribute("aria-pressed", String(tonAn)); });
  $("pogo-start").hidden = false;
  neueRunde();
  requestAnimationFrame(bild);
}
los();
