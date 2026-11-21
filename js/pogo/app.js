// Pogo: Spielablauf, Eingabe und Anzeigen. Regeln in regeln.js, Menge in physik.js, Bild in szene.js.
import {
  DAUER, teilBei, zone, punkteProSekunde, imTakt, verschuettet, ergebnis, titelSchluessel, geste,
  sprungWertung, GEDRAENGE, STAGEDIVE_AB, BONUS, STAGEDIVE, landeZ, istHinter, ABGUCKEN_S, ZUGABE, schurkenZeiten, zugabeZeiten, rufTipp, stagediveBonus, stillFaktor, BIER_MIN,
} from "./regeln.js?v=32";
import { person, bewegeMenge, randSchubs, integriere, stoesse } from "./physik.js?v=32";
import { sprache, TEXTE } from "./texte.js?v=32";
import { LAEDEN } from "./laeden.js?v=32";
import { erzeugeMusik } from "./musik.js?v=32";
import { SONGS, BEAT, songAusAdresse } from "./songs.js?v=32";
import { leseKutte, schreibeKutte, mitFang, mitMotiv, kutteText } from "./andenken.js?v=32";
import { TOUR, leseTour, schreibeTour, mitErgebnis, geschafft, fehlt, rang, kraftFaktor } from "./tour.js?v=32";
import { MOTIVE } from "./motive.js?v=32";
import { ziehe, AUFGABE_PUNKTE } from "./aufgaben.js?v=32";
import { isoLokal, naechster } from "../bands/saeulen.js?v=32";
import { tagDatum } from "../bands/texte.js?v=32";

const sp = sprache(), T = TEXTE[sp];
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const spielEl = $("pogo-spiel");
const zufall = (a, b) => a + Math.random() * (b - a);

let THREE, S, F; // three.js, Szene, Figuren-Modul
const musik = erzeugeMusik();

/* ---------- Spielzustand ---------- */
let songId = songAusAdresse(location.search) || SONGS[0]?.id || "beat", song = SONGS[0] || BEAT, bandDaten = null;
let speicher = null; try { speicher = globalThis.localStorage; } catch { speicher = null; }
let kutte = leseKutte(speicher), stats, aufgaben = [], tour = leseTour(speicher);
let phase = "aus", selten = null, abguck, schnoesel = null, fascho = null, rufZeit = 0, rufTreffer = 0, rufGezaehlt = new Set(), zugabeEnde = 0, saenger = null, geblendetBis = 0, abgeguckt = null, faktor = 1;
let ladenId = "pitcher", L, leute = [], figuren = new Map(), ich, becher;
let bier, punkte, zeit, laeuft = false, pausiert = false, wall, beruehrt, freibier, surfer, tropfen, randPop;
let stillZeit = 0, sprungBis, reiheSeit, nassBis, letzterSpritzer, duDaTeile, wuerfe, andenken, geplanteWuerfe, stagedive, mikroAn;

function neueRunde(neueAufgaben = true) {
  raeumeAuf();
  L = LAEDEN[ladenId];
  S.baueRaum(L);
  leute = []; figuren = new Map();
  const zMin = L.gitterZ + 0.4, zMax = L.z[1] - 0.4;
  for (let z = zMin + 0.6; z < zMax; z += 1.1) for (const sx of [-1, 1]) leute.push(person({ x: sx * (L.x - 0.3), z, rand: true }));
  for (let i = 0; i < L.leute; i++) leute.push(person({ x: zufall(-L.x + 1, L.x - 1), z: zufall(zMin + 1, zMax - 1.5), rucksack: i === 2 }));
  ich = person({ x: 0, z: zMax - 1.2, ich: true });
  leute.push(ich);
  const offen = MOTIVE.filter((m) => !(kutte.motive || []).includes(m.nr) && F.motivMaterial(m.nr));
  const seltenM = offen.length ? offen[(Math.random() * offen.length) | 0] : null;
  const seltenP = seltenM ? leute.find((p) => !p.rand && !p.ich && !p.rucksack) : null;
  selten = seltenP ? { p: seltenP, nr: seltenM.nr, titel: sp === "en" ? seltenM.titel_en : seltenM.titel } : null;
  const meinMotiv = (kutte.motive || []).length ? F.motivMaterial(kutte.motive.at(-1)) : null;
  for (const p of leute) {
    const f = p.ich ? F.baueFigur(THREE, { shirt: "#eeeae0", aermel: "#eeeae0", haar: ["iro", "#d4161b"], aufnaeher: true, aufnaeherMat: meinMotiv })
      : p === seltenP ? F.baueFigur(THREE, { gold: true, aufnaeherMat: F.motivMaterial(seltenM.nr) }) : F.baueFigur(THREE, { rucksack: p.rucksack });
    f.phase = zufall(0, 6.28); f.sprung = zufall(0.22, 0.42); f.armGrund = Math.random() < 0.5 ? zufall(2.3, 2.9) : zufall(0.2, 0.8); f.blick = 0;
    f.g.position.set(p.x, 0, p.z); S.raum.add(f.g); figuren.set(p, f);
  }
  becher = F.baueBecher(THREE); becher.scale.setScalar(1.8); becher.position.y = -0.6; figuren.get(ich).arme[1].add(becher);
  stillZeit = 0; bier = 100; punkte = 0; zeit = 0; wall = null; beruehrt = new Map(); freibier = null; surfer = null; tropfen = []; randPop = -9;
  sprungBis = 0; reiheSeit = 0; nassBis = 0; letzterSpritzer = -99; duDaTeile = new Set(); wuerfe = []; andenken = [];
  geplanteWuerfe = [{ art: "plektrum", t: song.wuerfe.plektrum }, { art: "drumstick", t: song.wuerfe.drumstick }];
  if (Math.random() < 0.3) geplanteWuerfe.push({ art: "setliste", t: song.wuerfe.setliste });
  stagedive = { phase: "aus", fertig: false }; mikroAn = false;
  abguck = { zeit: 0, fertig: false, erklaertBis: -1 }; schnoesel = null; fascho = null; rufZeit = 0; rufTreffer = 0; saenger = null; geblendetBis = 0; abgeguckt = null; faktor = 1; phase = "aus";
  if (S.band[1]) S.band[1].g.visible = true;
  stats = { reiheImLetztenRefrain: false, gefangen: andenken, mitteSekunden: 0, stagediveBier: null, taktSpruenge: 0, surferTreffer: 0, surferGesehen: 0 };
  if (neueAufgaben || !aufgaben.length) aufgaben = ziehe(L);
  zeigeAufgabenUndKutte();
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
const tropfenTeile = new Map();
function spritzer(menge, farbe = 0xf2b632) {
  const pos = welt(); becher.getWorldPosition(pos);
  if (!tropfenTeile.has(farbe)) { const g = new THREE.SphereGeometry(0.03, 6, 5); g.userData.geteilt = true; tropfenTeile.set(farbe, { geo: g, mat: new THREE.MeshBasicMaterial({ color: farbe }) }); }
  const { geo, mat } = tropfenTeile.get(farbe);
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
function springe(t = zeit, uhr = null) {
  if (laeuft && phase === "ruf") {
    const w = rufTipp(uhr ?? musik.uhr() ?? rufZeit, song.bpm, rufGezaehlt);
    if (w === "treffer") { rufTreffer++; pop(T.zugaGa, "var(--paper)"); } else if (w === "daneben") pop(T.daneben, "var(--paper-2)");
    return;
  }
  stillZeit = 0; // jedes Tippen zählt als Mitmachen (auch OI! am Mikro)
  if (!laeuft || pausiert || stagedive.phase === "getragen" || ich.inLuft) return;
  ich.inLuft = true; sprungBis = zeit + 0.45;
  const z = zone(ich.x, ich.z, L);
  if (mikroAn && z === "reihe") {
    if (imTakt(t, song.bpm, song.start)) { punkte += BONUS.oi; pop(T.oi, "var(--paper)"); } else pop(T.daneben, "var(--paper-2)");
    return;
  }
  const w = sprungWertung(z, imTakt(t, song.bpm, song.start));
  if (w.punkte) { punkte += w.punkte; stats.taktSpruenge++; pop(T.takt, "#58d26a"); }
  if (w.bier) { bier = Math.max(0, bier - w.bier); spritzer(2); }
}
function wische(seite) {
  if (!laeuft || stagedive.phase !== "getragen" || !stagedive.griff) return;
  const richtig = seite === stagedive.griff.seite; stagedive.griff = null;
  if (richtig) pop(T.abgewehrt, "#58d26a"); else verschuette(STAGEDIVE.verlust, T.schwapp);
}
function starteStagedive() {
  if (stagedive.phase !== "aus" || stagedive.fertig) return;
  stagedive = { phase: "getragen", t: 0, z0: ich.z, z1: landeZ(L), griff: null, naechsterGriff: 1.0, fertig: true };
  ich.vx = ich.vz = 0; $("pogo-stagedive").hidden = true;
  $("pogo-hinweis").textContent = T.getragen;
}

/* ---------- Eingabe ---------- */
const stick = $("pogo-stick"), knauf = $("pogo-knauf");
let zeiger = null;
function beginneZeiger(e) {
  if (!laeuft) return;
  const r = spielEl.getBoundingClientRect();
  zeiger = { id: e.pointerId, druckZeit: zeit, druckUhr: phase === "ruf" ? musik.uhr() ?? rufZeit : null, x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, dy: 0, weg: 0, ziehen: false, rx: e.clientX - r.left, ry: e.clientY - r.top };
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
  if (geste(performance.now() - zeiger.t0, zeiger.weg) === "tippen") {
    if (stagedive.phase === "getragen") wische(zeiger.rx < spielEl.clientWidth / 2 ? -1 : 1);
    else springe(zeiger.druckZeit, zeiger.druckUhr);
  }
  zeiger = null; stick.hidden = true;
}
const tasten = new Set();
addEventListener("keydown", (e) => {
  if (!laeuft) return;
  if (e.key === " ") { e.preventDefault(); if (!e.repeat) springe(); return; }
  if (stagedive.phase === "getragen" && (e.key === "ArrowLeft" || e.key === "a")) { wische(-1); return; }
  if (stagedive.phase === "getragen" && (e.key === "ArrowRight" || e.key === "d")) { wische(1); return; }
  if (/^(Arrow|[wasd]$)/.test(e.key)) { tasten.add(e.key); e.preventDefault(); }
});
addEventListener("keyup", (e) => tasten.delete(e.key));

/* ---------- Ein Spielschritt ---------- */
const q = { a: null, b: null };
function schritt(dt) {
  zeit += dt;
  const teil0 = teilBei(zeit, song.teile), teil = { ...teil0, kraft: teil0.kraft * kraftFaktor(ladenId) }, kraft = teil.kraft, zMin = L.gitterZ + 0.4, zMax = L.z[1] - 0.4;
  const getragen = stagedive.phase === "getragen";

  if (L.wall) {
    if (zeit > song.wall[0] && zeit < song.wall[1] && !wall) { wall = { phase: "teilen" }; pop(T.wall, "var(--blood-hot)"); }
    if (wall?.phase === "teilen" && zeit >= song.wall[1]) { wall = { phase: "rennen", t: 0 }; pop(T.los, "var(--blood-hot)"); }
    if (wall?.phase === "rennen") { wall.t += dt; if (wall.t > 2.4) wall = { phase: "vorbei" }; }
  }

  // Du: Stick oder Tasten (oben = zur Bühne)
  if (!getragen) {
    let sx = 0, sz = 0;
    if (zeiger?.ziehen) { sx = zeiger.dx; sz = zeiger.dy; }
    if (tasten.has("ArrowLeft") || tasten.has("a")) sx -= 1; if (tasten.has("ArrowRight") || tasten.has("d")) sx += 1;
    if (tasten.has("ArrowUp") || tasten.has("w")) sz -= 1; if (tasten.has("ArrowDown") || tasten.has("s")) sz += 1;
    const sl = Math.hypot(sx, sz);
    stillZeit = sl > 0.12 || ich.inLuft ? 0 : stillZeit + dt;
    if (sl > 0.12) { const f = Math.min(1, sl); ich.vx += (sx / sl) * 22 * f * dt; ich.vz += (sz / sl) * 22 * f * dt; }
    if (randSchubs(ich, L, dt) && zeit - randPop > 3) { randPop = zeit; pop(T.randSchubs, "var(--paper)"); }
  }
  if (ich.inLuft && zeit >= sprungBis) ich.inLuft = false;

  const menge = getragen ? leute.filter((p) => !p.ich) : leute;
  bewegeMenge(menge, L, teil, dt, Math.random, wall);
  schurkenKraefte(dt);
  integriere(menge, L, dt, S.matsch);
  for (const tr of stoesse(menge)) {
    if (schnoesel && tr.anderer === schnoesel.p) { schubseSchnoesel(tr); continue; }
    const letzte = beruehrt.get(tr.anderer) || -9;
    if (zeit - letzte < 0.3) continue;
    const m = verschuettet(tr.schlag, { rucksack: tr.anderer.rucksack, inLuft: ich.inLuft });
    if (m > 0) { beruehrt.set(tr.anderer, zeit); verschuette(m, tr.anderer.rucksack ? T.rucksack : m > 7 ? T.platsch : m > 3 ? T.schwapp : null); }
  }

  // Zonen, Punkte, erste Reihe
  const z = getragen ? "pit" : zone(ich.x, ich.z, L), nass = zeit < nassBis;
  if (!getragen) punkte += punkteProSekunde(z, teil, nass) * dt * faktor * (zeit < geblendetBis ? 0.5 : 1) * stillFaktor(stillZeit);
  if (z === "mitte") stats.mitteSekunden += dt;
  if (z === "reihe" && teil.name === "LETZTER REFRAIN") stats.reiheImLetztenRefrain = true;
  reiheSeit = z === "reihe" && !getragen ? reiheSeit + dt : 0;
  if (z === "reihe") bier = Math.max(0, bier - GEDRAENGE * kraft * dt);
  if (z === "reihe" && kraft >= 1 && reiheSeit > 3 && zeit - letzterSpritzer > 8) {
    letzterSpritzer = zeit; nassBis = zeit + 3; pop(T.abkuehlen, "#7fc8ff"); spritzer(8, 0x7fc8ff);
  }
  if (z === "reihe" && kraft >= 1 && reiheSeit > 1.5 && !duDaTeile.has(teil.bis)) {
    duDaTeile.add(teil.bis); punkte += BONUS.duDa; pop(T.duDa, "var(--blood-hot)"); S.band[1].zeigtBis = zeit + 1.5;
  }
  mikroAn = zeit >= song.mikro[0] && zeit < song.mikro[1];
  const stagediveBereit = !stagedive.fertig && reiheSeit >= STAGEDIVE_AB;
  $("pogo-stagedive").hidden = !stagediveBereit;
  if (!getragen) $("pogo-hinweis").textContent = phase === "zugabe" ? T.saenger : zeit < abguck.erklaertBis ? T.goldHinweis : mikroAn && z === "reihe" ? T.mikro : stillFaktor(stillZeit) < 1 && z !== "rand" ? T.bewegDich : (T.zonen[z] || "");

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
    if (w.weg) { S.raum.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); }
  }
  wuerfe = wuerfe.filter((w) => !w.weg);

  // Stagedive: getragen nach hinten, Hände greifen nach dem Becher
  if (getragen) {
    const sd = stagedive; sd.t += dt;
    ich.z = sd.z0 + (sd.z1 - sd.z0) * Math.min(1, sd.t / STAGEDIVE.dauer); ich.x += Math.sin(zeit * 2) * 0.3 * dt;
    punkte += STAGEDIVE.punkteProSekunde * dt;
    sd.naechsterGriff -= dt;
    if (!sd.griff && sd.naechsterGriff <= 0) { sd.griff = { seite: Math.random() < 0.5 ? -1 : 1, bis: zeit + STAGEDIVE.griffFenster }; sd.naechsterGriff = STAGEDIVE.griffAlle; pop((sd.griff.seite < 0 ? "← " : "") + T.hand + (sd.griff.seite > 0 ? " →" : ""), "var(--blood-hot)"); }
    if (sd.griff && zeit > sd.griff.bis) { sd.griff = null; verschuette(STAGEDIVE.verlust, T.schwapp); }
    if (sd.t >= STAGEDIVE.dauer) {
      stagedive = { phase: "aus", fertig: true }; ich.vx = ich.vz = 0; $("pogo-hinweis").textContent = "";
      stats.stagediveBier = bier;
      const bonus = stagediveBonus(bier);
      if (bonus) { punkte += bonus; pop(T.gelandet, "#58d26a"); } else if (bier > 0) pop(T.gelandetOhne, "var(--paper)"); else pop(T.bierdusche);
    }
  }

  // Crowdsurfer (andere)
  if (L.surfer && !surfer && kraft >= 0.9 && Math.random() < dt * 0.3) {
    const f = F.baueFigur(THREE); f.g.rotation.set(-Math.PI / 2, 0, 0); f.arme.forEach((a, k) => (a.rotation.z = k ? 2.9 : -2.9));
    surfer = { f, x: zufall(-L.x + 1.5, L.x - 1.5), z: zMin, traf: false }; stats.surferGesehen++; f.g.position.set(surfer.x, 2.15, surfer.z); S.raum.add(f.g); pop(T.crowdsurfer, "var(--paper)");
  }
  if (surfer) {
    surfer.z += 1.5 * dt; surfer.x += Math.sin(zeit * 2) * 0.3 * dt; surfer.f.g.position.set(surfer.x, 2.15 + Math.sin(zeit * 9) * 0.06, surfer.z);
    if (!getragen && !surfer.traf && Math.hypot(surfer.x - ich.x, surfer.z - ich.z) < 0.55) { surfer.traf = true; stats.surferTreffer++; verschuette(14, T.stiefel); }
    if (surfer.z > zMax + 1.5) { entferneSurfer(); }
  }

  // Freibier
  if (!freibier && Math.random() < dt * 0.06) {
    const g = F.baueBecher(THREE); g.scale.setScalar(2.4);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.14, 24), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.09; g.add(ring);
    freibier = { g, x: zufall(-L.x + 1, L.x - 1), z: zufall(zMin + 1.5, zMax - 0.5), t: 0 }; g.position.set(freibier.x, 0.25, freibier.z); S.raum.add(g);
  }
  if (freibier) {
    freibier.t += dt; freibier.g.rotation.y += dt * 2; freibier.g.position.y = 0.25 + Math.sin(zeit * 4) * 0.05;
    if (!getragen && Math.hypot(freibier.x - ich.x, freibier.z - ich.z) < 0.55) { bier = Math.min(100, bier + 25); pop(T.freibier, "#58d26a"); entferneFreibier(); }
    else if (freibier.t > 7) entferneFreibier();
  }

  bewegeFiguren(dt, kraft, getragen);
  for (const d of tropfen) { d.t += dt; d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt); }
  for (const d of tropfen) if (d.t > 0.8) S.raum.remove(d.m);
  tropfen = tropfen.filter((d) => d.t <= 0.8);
  S.setzeLicht(kraft, zeit, (song.bpm / 60) * Math.PI);

  extras(dt);
  if (bier <= 0) ende(true);
  else if (phase === "song" && zeit >= song.ende) starteRuf();
  else if (phase === "zugabe" && zeit >= zugabeEnde) ende(false);
}

/* ---------- Schurken, Abgucken, Zugabe, Tour ---------- */
function neuePerson(opt, figurOpt) {
  const p = person(opt); Object.assign(p, figurOpt.person || {});
  const f = F.baueFigur(THREE, figurOpt); f.phase = zufall(0, 6.28); f.sprung = 0.25; f.armGrund = 0.6; f.blick = 0;
  f.g.position.set(p.x, 0, p.z); S.raum.add(f.g); leute.push(p); figuren.set(p, f); return p;
}
function entfernePerson(p) {
  const f = figuren.get(p); if (!f) return;
  S.raum.remove(f.g); f.geos.forEach((g) => g.dispose()); figuren.delete(p); leute = leute.filter((x) => x !== p);
}
function schurkenKraefte(dt) {
  if (schnoesel && !schnoesel.raus) { const p = schnoesel.p; p.vx += (ich.x * 0.5 - p.x) * 1.5 * dt; p.vz += (L.gitterZ + 0.6 - p.z) * 1.2 * dt; }
  if (fascho && !fascho.weg) {
    const fp = fascho.p;
    for (const p of leute) { if (p.rand || p.ich || p === fp || p === schnoesel?.p) continue; const dx = fp.x - p.x, dz = fp.z - p.z, d = Math.hypot(dx, dz) || 1; p.vx += (dx / d) * 5 * dt; p.vz += (dz / d) * 5 * dt; }
    fp.vx += Math.sign(fp.x || 1) * 6 * dt; fp.vz += 3 * dt;
  }
}
function schubseSchnoesel(tr) {
  if (tr.schlag <= 1.6 || zeit - (schnoesel.letzter ?? -9) < 0.4) return;
  schnoesel.letzter = zeit; schnoesel.schubse++; pop(T.schubs, "var(--paper)");
  if (schnoesel.schubse >= 3) { schnoesel.raus = true; punkte += BONUS.schnoesel; pop(T.schnoeselRaus, "var(--blood-hot)"); entfernePerson(schnoesel.p); }
}
function extras(dt) {
  const getragen = stagedive.phase === "getragen";
  if (selten && !abguck.fertig && abguck.erklaertBis < 0 && figuren.has(selten.p) && Math.hypot(selten.p.x - ich.x, selten.p.z - ich.z) < 3) {
    abguck.erklaertBis = zeit + 5; pop(T.goldPop, "#ffc83a");
  }
  if (selten && !abguck.fertig && !getragen && figuren.has(selten.p) && istHinter(ich, selten.p)) {
    abguck.zeit += dt;
    F.setzeFortschritt(figuren.get(selten.p).fortschritt, abguck.zeit / ABGUCKEN_S);
    if (abguck.zeit >= ABGUCKEN_S) {
      abguck.fertig = true; abguck.erklaertBis = 0; abgeguckt = selten.nr; punkte += BONUS.abgeguckt; pop(T.abgeguckt, "#ffc83a");
      kutte = mitMotiv(kutte, selten.nr); schreibeKutte(speicher, kutte);
      const a = figuren.get(ich).aufnaeher, mat = F.motivMaterial(selten.nr); if (a && mat) a.material = mat;
    }
  }
  const zz = schurkenZeiten(song);
  if (phase === "song" && !schnoesel && zeit >= zz.schnoesel) {
    const p = neuePerson({ x: zufall(-L.x + 1, L.x - 1), z: L.z[1] - 1.2 }, { shirt: "#e8dcc4", aermel: "#e8dcc4", stiefel: "#f4f4f4", haar: ["kurz", "#c9a36a"], aufnaeher: false, selfie: true, person: { masse: 1.4 } });
    schnoesel = { p, schubse: 0, naechsterBlitz: zeit + 2, raus: false };
  }
  if (phase === "song" && !fascho && zeit >= zz.fascho) {
    const seite = Math.random() < 0.5 ? -1 : 1;
    const p = neuePerson({ x: seite * (L.x - 1.2), z: (L.gitterZ + L.z[1]) / 2 }, { shirt: "#2f3a2a", aermel: "#2f3a2a", haar: ["glatze"], aufnaeher: false, stiefel: "#1a1a1a", person: { masse: 1.6 } });
    fascho = { p, t: 0, weg: false, geholfen: false }; pop(T.fascho, "var(--blood-hot)");
  }
  if (schnoesel && !schnoesel.raus && Math.hypot(schnoesel.p.x - ich.x, schnoesel.p.z - ich.z) < 3 && zeit >= schnoesel.naechsterBlitz) {
    schnoesel.naechsterBlitz = zeit + 4; geblendetBis = zeit + 1.5; pop(T.blitz, "#ffffff");
    const el = $("pogo-blitz"); el.classList.remove("an"); void el.offsetWidth; el.classList.add("an");
  }
  if (fascho && !fascho.weg) {
    fascho.t += dt;
    if (!fascho.geholfen && Math.hypot(fascho.p.x - ich.x, fascho.p.z - ich.z) <= 1.5) { fascho.geholfen = true; punkte += BONUS.fascho; pop(T.faschoGeholfen, "#58d26a"); }
    if (fascho.t > 6) { fascho.weg = true; entfernePerson(fascho.p); }
  }
  if (saenger) {
    saenger.t += dt; const mz = (L.gitterZ + L.z[1]) / 2;
    saenger.x = Math.sin(saenger.t * 0.6) * L.x * 0.5; saenger.z = mz + Math.cos(saenger.t * 0.45) * 2.2;
    saenger.f.g.position.set(saenger.x, 2.15 + Math.sin(zeit * 9) * 0.05, saenger.z); saenger.ring.position.x = saenger.x; saenger.ring.position.z = saenger.z;
    if (Math.hypot(saenger.x - ich.x, saenger.z - ich.z) <= 1) { punkte += 80 * dt; saenger.weg = 0; }
    else { saenger.weg += dt; if (saenger.weg > 2 && !saenger.gefallen) { saenger.gefallen = true; pop(T.saengerFaellt, "var(--blood-hot)"); } }
  }
}
function starteRuf() {
  phase = "ruf"; rufZeit = 0; rufTreffer = 0; rufGezaehlt = new Set();
  if (stagedive.phase === "getragen") { stagedive = { phase: "aus", fertig: true }; ich.vx = ich.vz = 0; }
  $("pogo-stagedive").hidden = true; $("pogo-hinweis").textContent = T.zugabeRuf; pop(T.zugabe, "var(--paper)");
  musik.stopp(); musik.klatschen(song.bpm);
}
function rufSchritt(echt) {
  rufZeit += echt;
  bewegeFiguren(Math.min(0.05, echt), 0.5, false); S.setzeLicht(0.5, rufZeit, (song.bpm / 60) * Math.PI);
  if (rufZeit < ZUGABE.fenster) return;
  if (rufTreffer >= ZUGABE.treffer) starteZugabe(); else { musik.stopp(); pop(T.keineZugabe, "var(--paper)"); ende(false); }
}
function starteZugabe() {
  phase = "zugabe"; faktor = ZUGABE.faktor;
  const zz = zugabeZeiten(song), start = zz.start; zeit = start; zugabeEnde = zz.ende;
  // die Uhr springt zurück: alle Zeitstempel aus dem Song gelten nicht mehr
  nassBis = geblendetBis = sprungBis = 0; stillZeit = 0; ich.inLuft = false; letzterSpritzer = randPop = -99; beruehrt = new Map();
  if (schnoesel) { schnoesel.naechsterBlitz = start + 2; schnoesel.letzter = -99; }
  entferneFreibier(); entferneSurfer();
  musik.start(song.datei ? WURZEL + song.datei : null, start);
  const f = F.baueFigur(THREE, { aufnaeher: false }); f.g.rotation.set(-Math.PI / 2, 0, 0); f.arme.forEach((a, k) => (a.rotation.z = k ? 2.9 : -2.9));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: 0x58d26a, transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; S.raum.add(ring);
  S.raum.add(f.g); saenger = { f, ring, t: 0, x: 0, z: L.gitterZ + 1, weg: 0, gefallen: false };
  if (S.band[1]) S.band[1].g.visible = false;
  pop(T.zugabe, "#58d26a"); $("pogo-hinweis").textContent = T.saenger;
}
function aktualisiereLaeden() {
  for (const id of TOUR) {
    const b = $("pogo-laden-" + id); if (!b) continue;
    const n = fehlt(tour, id); b.querySelector("em").textContent = n > 0 ? T.ziel({ n }) : T.geschafft;
    b.classList.toggle("ist-geschafft", n === 0);
  }
  document.querySelectorAll(".pogo__laden[id^='pogo-laden-']").forEach((x) => x.setAttribute("aria-pressed", String(x.id === "pogo-laden-" + ladenId)));
}

/* ---------- Aufräumen ---------- */
function gibFrei(obj) { obj.traverse((o) => { if (o.isMesh) { if (!o.geometry.userData.geteilt) o.geometry.dispose(); if (!o.material.vertexColors && !o.material.map) o.material.dispose(); } }); }
function entferneFreibier() { if (!freibier) return; S.raum.remove(freibier.g); gibFrei(freibier.g); freibier = null; }
function entferneSurfer() { if (!surfer) return; S.raum.remove(surfer.f.g); surfer.f.geos.forEach((g) => g.dispose()); surfer = null; }
function raeumeAuf() {
  if (!S?.raum) return;
  entferneFreibier(); entferneSurfer();
  if (saenger) { S.raum.remove(saenger.f.g, saenger.ring); saenger.f.geos.forEach((g) => g.dispose()); saenger.ring.geometry.dispose(); saenger.ring.material.dispose(); saenger = null; }
  for (const w of wuerfe || []) { S.raum.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); }
  for (const d of tropfen || []) S.raum.remove(d.m);
  for (const f of figuren.values()) f.geos.forEach((g) => g.dispose());
  if (becher) gibFrei(becher);
  wuerfe = []; tropfen = [];
}

/* ---------- Figuren bewegen ---------- */
function bewegeFiguren(dt, kraft, getragen) {
  const takt = (song.bpm / 60) * Math.PI;
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
    if (laeuft && phase === "ruf") rufSchritt(echt);
    else if (laeuft) {
      const uhr = musik.uhr();
      let rest = uhr === null ? echt : Math.min(0.25, Math.max(0, uhr - zeit));
      while (rest > 1e-6 && laeuft && phase !== "ruf") { const d = Math.min(0.05, rest); schritt(d); rest -= d; }
    }
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
  $("pogo-teil").textContent = T.teile[teilBei(zeit, song.teile).name];
  const rest = Math.max(0, Math.ceil((phase === "zugabe" ? zugabeEnde : song.ende) - zeit)); $("pogo-zeit").textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`;
}

function zeigeAufgabenUndKutte() {
  const text = aufgaben.map((a) => "□ " + T.aufgaben[a.id]).join("  ·  ");
  $("pogo-aufgaben").textContent = text;
  $("pogo-aufgaben-start").textContent = `${T.aufgabenTitel}: ${text}`;
  $("pogo-kutte").textContent = `${T.rang}: ${T.raenge[rang(tour.summe)]} · ${tourText()} · ${T.kutte}: ${kutteText(kutte, sp)}`;
}
function tourText() {
  return T.tour({ n: TOUR.filter((id) => geschafft(tour, id)).length, von: TOUR.length });
}

function starte() {
  song = SONGS.find((s) => s.id === songId) || BEAT;
  if (song.datei && !musik.bereit(WURZEL + song.datei)) { pop(T.songFehlt, "var(--paper)"); song = BEAT; }
  neueRunde(false);
  $("pogo-start").hidden = true; $("pogo-ende").hidden = true; $("pogo-hud").hidden = false; $("pogo-tonbox").hidden = false;
  spielEl.scrollIntoView({ block: "nearest" });
  laeuft = true; pausiert = false; letzte = performance.now(); phase = "song";
  musik.start(song.datei ? WURZEL + song.datei : null);
}
function ende(leer) {
  if (!laeuft) return;
  phase = "aus";
  laeuft = false; musik.stopp(); beendeZeiger(); tasten.clear();
  stagedive = { phase: "aus", fertig: true }; $("pogo-stagedive").hidden = true; $("pogo-hinweis").textContent = "";
  stats.bierEnde = leer ? 0 : Math.round(bier);
  const erledigt = aufgaben.filter((a) => a.erfuellt(stats));
  punkte += erledigt.length * AUFGABE_PUNKTE;
  if (andenken.length) { kutte = mitFang(kutte, andenken); schreibeKutte(speicher, kutte); }
  const gewertet = aufgaben;
  const liste = $("pogo-ende-aufgaben"); liste.replaceChildren();
  for (const a of gewertet) { const li = document.createElement("li"); const ok = erledigt.includes(a); li.textContent = `${ok ? "✓" : "✗"} ${T.aufgaben[a.id]}${ok ? ` (+${AUFGABE_PUNKTE})` : ""}`; li.className = ok ? "ist-erledigt" : ""; liste.append(li); }
  const b = leer ? 0 : Math.round(bier), p = Math.round(punkte);
  $("pogo-ende-laden").textContent = T.laeden[ladenId].name;
  $("pogo-ende-titel").textContent = T.titel[titelSchluessel(p, b)];
  const erg = ergebnis(p, b);
  $("pogo-ende-zahl").textContent = erg;
  const schonGeschafft = geschafft(tour, ladenId); tour = mitErgebnis(tour, ladenId, erg); schreibeTour(speicher, tour);
  const tourEl = $("pogo-ende-tour"); tourEl.replaceChildren(`${T.rang}: ${T.raenge[rang(tour.summe)]} · ${tourText()}`);
  if (!schonGeschafft && geschafft(tour, ladenId)) tourEl.append(document.createElement("br"), T.ladenGeschafft({ laden: T.laeden[ladenId].name }));
  else if (!geschafft(tour, ladenId)) tourEl.append(document.createElement("br"), T.ziel({ n: fehlt(tour, ladenId) }));
  if (abgeguckt) {
    const m = MOTIVE.find((x) => x.nr === abgeguckt); const a = document.createElement("a");
    a.href = "index.html#wand"; a.textContent = T.zurVorlage;
    tourEl.append(document.createElement("br"), T.motivAbgeguckt({ nr: m.nr, titel: sp === "en" ? m.titel_en : m.titel }), " · ", a);
  }
  aktualisiereLaeden();
  $("pogo-ende-werte").textContent = `${T.punkte} ${p} × ${T.bier} ${b} %` + (b < BIER_MIN ? ` (${T.zaehltAls({ n: BIER_MIN })})` : "");
  zeigeBand();
  $("pogo-ende-andenken").textContent = andenken.length ? `${T.andenken}: ${andenken.map((a) => T[a].replace("!", "")).join(", ")}` : T.keineAndenken;
  $("pogo-ende").hidden = false; $("pogo-hud").hidden = true; $("pogo-tonbox").hidden = true;
  aufgaben = ziehe(L); zeigeAufgabenUndKutte(); // neue Aufgaben für die nächste Runde
  $("pogo-nochmal").focus({ preventScroll: true });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { pausiert = true; tasten.clear(); zeiger = null; stick.hidden = true; if (laeuft) musik.pause(); }
  else { pausiert = false; letzte = performance.now(); if (laeuft) musik.weiter(); }
});

/* ---------- Band im Endbild ---------- */
const WURZEL = document.documentElement.dataset.wurzel || "";
function zeigeBand() {
  const el = $("pogo-ende-band");
  if (!song.band) { el.hidden = true; return; }
  el.replaceChildren();
  const b = document.createElement("b"); b.textContent = `${song.bandName} · ${song.titel}`; el.append(b, document.createElement("br"));
  const n = naechster(bandDaten?.bands?.[song.band]?.termine, isoLokal(new Date()));
  if (n) el.append(`${T.naechstesKonzert}: ${tagDatum(n.datum, sp)} · ${n.stadt} · ${n.laden}`);
  else if (bandDaten) el.append(T.keinKonzert);
  el.hidden = false;
}

/* ---------- Start ---------- */
async function los() {
  const c = document.createElement("canvas");
  const webgl = (() => { try { return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (!webgl) { $("pogo-ohne3d").hidden = false; $("pogo-start").hidden = true; return; }
  try {
    [THREE, { baueSzene: S }, F] = await Promise.all([
      import("../../assets/vendor/three.module.min.js"),
      import("./szene.js?v=32").then((m) => ({ baueSzene: m.baueSzene })),
      import("./figuren.js?v=32"),
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
  for (const id of TOUR) {
    const b = document.createElement("button"); b.type = "button"; b.className = "pogo__laden"; b.id = "pogo-laden-" + id;
    b.setAttribute("aria-pressed", String(id === ladenId));
    b.innerHTML = "<b></b><span></span><em></em>"; b.querySelector("b").textContent = T.laeden[id].name; b.querySelector("span").textContent = T.laeden[id].text;
    b.addEventListener("click", () => { ladenId = id; laedenEl.querySelectorAll(".pogo__laden").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); neueRunde(); });
    laedenEl.append(b);
  }
  aktualisiereLaeden();
  const songsEl = $("pogo-songs");
  for (const s of SONGS) {
    const b = document.createElement("button"); b.type = "button"; b.className = "pogo__laden"; b.id = "pogo-song-" + s.id;
    b.setAttribute("aria-pressed", String(s.id === songId));
    b.innerHTML = "<b></b><span></span>";
    b.querySelector("b").textContent = s.bandName; b.querySelector("span").textContent = `„${s.titel}“`;
    b.addEventListener("click", () => { songId = s.id; songsEl.querySelectorAll(".pogo__laden").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
    songsEl.append(b);
  }
  // „Rein in den Pit“ wartet, bis der gewählte Song geladen ist (sonst Ersatz-Beat)
  const los = $("pogo-los"), losText = los.textContent;
  los.disabled = true; los.textContent = T.laedt;
  Promise.all(SONGS.map((s) => musik.lade(WURZEL + s.datei))).finally(() => { los.disabled = false; los.textContent = losText; });
  fetch(WURZEL + "data/bands.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((d) => { bandDaten = d; }).catch(() => {});
  $("pogo-los").addEventListener("click", starte);
  $("pogo-nochmal").addEventListener("click", starte);
  $("pogo-anderer").addEventListener("click", () => { $("pogo-ende").hidden = true; $("pogo-start").hidden = false; });
  $("pogo-stagedive").addEventListener("click", starteStagedive);
  let tonAn = true;
  $("pogo-ton").addEventListener("click", (e) => { tonAn = !tonAn; musik.setzeTon(tonAn); e.currentTarget.textContent = tonAn ? T.tonAn : T.tonAus; e.currentTarget.setAttribute("aria-pressed", String(tonAn)); });
  $("pogo-start").hidden = false;
  neueRunde();
  requestAnimationFrame(bild);
  ladeMotive().then((n) => { if (n && !laeuft) neueRunde(false); });
}
/** Motivbilder der Seite für die Rückenaufnäher laden; was nicht kommt, fehlt einfach (alte Aufnäher bleiben). */
async function ladeMotive() {
  const lade = (m) => new Promise((ok, nein) => {
    const img = new Image(); const uhr = setTimeout(() => nein(new Error("Zeit")), 6000);
    img.onload = () => { clearTimeout(uhr); ok({ nr: m.nr, bild: img }); }; img.onerror = () => { clearTimeout(uhr); nein(new Error(m.bild)); };
    img.src = WURZEL + m.bild;
  });
  const da = (await Promise.allSettled(MOTIVE.map(lade))).filter((r) => r.status === "fulfilled").map((r) => r.value);
  try { return F.setzeMotive(THREE, da); } catch { return 0; }
}
los();
