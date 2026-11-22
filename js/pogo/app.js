// Pogo: Spielablauf, Eingabe und Anzeigen. Regeln in regeln.js, Menge in physik.js, Bild in szene.js.
import {
  DAUER, teilBei, zone, punkteProSekunde, imTakt, verschuettet, ergebnis, titelSchluessel, geste,
  sprungWertung, GEDRAENGE, STAGEDIVE_AB, BONUS, STAGEDIVE, landeZ, istHinter, ABGUCKEN_S, ZUGABE, schurkenZeiten, zugabeZeiten, rufTipp, stagediveBonus, stillFaktor, BIER_MIN, sprungDauer, wilderTeil, nachTonAus,
} from "./regeln.js?v=43";
import { person, bewegeMenge, randSchubs, integriere, stoesse } from "./physik.js?v=43";
import { sprache, TEXTE } from "./texte.js?v=43";
import { LAEDEN } from "./laeden.js?v=43";
import { erzeugeMusik } from "./musik.js?v=43";
import { SONGS, BEAT, songAusAdresse } from "./songs.js?v=43";
import { leseKutte, schreibeKutte, mitFang, mitMotiv, kutteText } from "./andenken.js?v=43";
import { TOUR, ZIELE, leseTour, schreibeTour, mitErgebnis, geschafft, fehlt, rang, kraftFaktor } from "./tour.js?v=43";
import { MOTIVE } from "./motive.js?v=43";
import { COMBO, comboStufe, comboTakt, comboLuecke, STIMMUNG, mitStimmung, stimmungAbfall, zugabeTreffer, groelWort, WALL, wallWertung,
  kreisZeit, kreisTangente, stromWertung, SCHULTERN, wackle, runtergefallen, AUFHEBEN } from "./pit.js?v=43";
import { ziehe, AUFGABE_PUNKTE } from "./aufgaben.js?v=43";
import { isoLokal, naechster } from "../bands/saeulen.js?v=43";
import { tagDatum } from "../bands/texte.js?v=43";
import { KOPF_ATLAS, baueKopfVorlage } from "./kopf3d.js?v=43";

const sp = sprache(), T = TEXTE[sp];
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const spielEl = $("pogo-spiel");
const zufall = (a, b) => a + Math.random() * (b - a);

let THREE, S, F; // three.js, Szene, Figuren-Modul
const bandLogos = new Map(); // Band-Id → geladenes Logo (assets/img/bands/<id>.webp)
let kopfVorlage = null, koepfe = []; // Ganove-Kopf aus Marks Ansichten (kopf3d.js) und die gerade getragenen Köpfe
const musik = erzeugeMusik();

/* ---------- Spielzustand ---------- */
let songId = songAusAdresse(location.search) || SONGS[0]?.id || "beat", song = SONGS[0] || BEAT, bandDaten = null;
let speicher = null; try { speicher = globalThis.localStorage; } catch { speicher = null; }
let kutte = leseKutte(speicher), stats, aufgaben = [], tour = leseTour(speicher);
let phase = "aus", selten = null, abguck, schnoesel = null, fascho = null, rufZeit = 0, rufTreffer = 0, rufGezaehlt = new Set(), zugabeEnde = 0, saenger = null, geblendetBis = 0, abgeguckt = null, faktor = 1;
let ladenId = "pitcher", L, leute = [], figuren = new Map(), ich, becher;
let bier, punkte, zeit, laeuft = false, pausiert = false, wall, beruehrt, freibier, surfer, tropfen, randPop;
let outro = null;
let combo, stimmung = 20, kochtBis = -1, groel, gefallen = null, gefallenAnzahl = 0, naechsterFall = 0, kreis = null, kreisPfeile = [], schultern = { phase: "fertig" }, stimmungEnde = 0, glanz = null, letztesErgebnis = null;
let stillZeit = 0, zieht = false, mikroGezaehlt = new Set(), sprungBis, reiheSeit, nassBis, letzterSpritzer, duDaTeile, wuerfe, andenken, geplanteWuerfe, stagedive, mikroAn;

function neueRunde(neueAufgaben = true) {
  raeumeAuf();
  koepfe.forEach((k) => k.dispose()); koepfe = [];
  L = LAEDEN[ladenId];
  S.baueRaum(L);
  setzeGanoveKopf(S.band[1]);
  S.setzeBanner(bandLogos.get(song.band) || null);
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
  stagedive = { phase: "aus", fertig: false }; mikroAn = false; mikroGezaehlt = new Set();
  abguck = { zeit: 0, fertig: false, erklaertBis: -1 }; schnoesel = null; fascho = null; rufZeit = 0; rufTreffer = 0; saenger = null; geblendetBis = 0; abgeguckt = null; faktor = 1; phase = "aus";
  if (S.band[1]) S.band[1].g.visible = true;
  stroboRest = 0; combo = { serie: 0, letzterSchlag: null }; stimmung = 20; kochtBis = -1; groel = { folge: 0, letzterSchlag: null, getroffen: new Set() };
  gefallen = null; gefallenAnzahl = 0; naechsterFall = AUFHEBEN.erstesNach; kreis = null; stimmungEnde = 0;
  schultern = ladenId === "pitcher" ? { phase: "fertig" } : { phase: "aus", ab: zufall(10, 18) };
  glanz = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.5, 28), new THREE.MeshBasicMaterial({ color: 0x58d26a, transparent: true, opacity: 0.7, depthWrite: false }));
  glanz.rotation.x = -Math.PI / 2; glanz.position.y = 0.04; glanz.visible = false; figuren.get(ich).g.add(glanz); figuren.get(ich).geos.push(glanz.geometry);
  stats = { reiheImLetztenRefrain: false, gefangen: andenken, mitteSekunden: 0, stagediveBier: null, taktSpruenge: 0, surferTreffer: 0, surferGesehen: 0 };
  if (neueAufgaben || !aufgaben.length) aufgaben = ziehe(L);
  zeigeAufgabenUndKutte();
  $("pogo-stagedive").hidden = true; $("pogo-hinweis").textContent = "";
  S.kamera(ich, 0, true);
}

/* ---------- Anzeigen ---------- */
const popsEl = $("pogo-pops");
/** Pop-Text im Bild. wichtig: Ansage mit Vorrang (bleibt länger, wird nicht verdrängt). */
function pop(text, farbe = "var(--bier)", wichtig = false) {
  if (!text) return;
  while (popsEl.children.length >= 3) {
    const alt = [...popsEl.children].find((x) => !x.dataset.wichtig);
    if (!alt) { if (!wichtig) return; popsEl.firstElementChild.remove(); } else alt.remove();
  }
  const p = document.createElement("div"); p.className = "pogo__pop" + (wichtig ? " pogo__pop--wichtig" : ""); p.textContent = text;
  p.style.setProperty("--akzent", farbe); p.style.setProperty("--dreh", zufall(-6, 6).toFixed(1) + "deg");
  if (wichtig) p.dataset.wichtig = "1";
  // feste Bahnen: Hand-Hinweise an den Rand, Ansagen oben mittig, Rest gestapelt darunter
  const links = text.startsWith("← "), rechts = text.endsWith(" →");
  p.style.left = links ? "22%" : rechts ? "78%" : "50%";
  p.style.top = wichtig ? "16%" : links || rechts ? "48%" : (31 + 12 * [...popsEl.children].filter((x) => !x.dataset.wichtig).length) + "%";
  popsEl.append(p); setTimeout(() => p.remove(), wichtig ? 1800 : 1100);
}
const ansage = (text, farbe = "var(--blood-hot)") => pop(text, farbe, true);
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
  if (menge <= 0 || phase === "zugabe") return; // Zugabe ist Party: Bier zählt nicht mehr
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
  if (laeuft && !pausiert && stagedive.phase !== "getragen" && tippAktion()) return;
  if (!laeuft || pausiert || stagedive.phase === "getragen" || ich.inLuft) return;
  ich.inLuft = true; sprungBis = zeit + sprungDauer(song.bpm);
  const z = zone(ich.x, ich.z, L);
  if (mikroAn && z === "reihe") {
    const w = rufTipp(t - song.start, song.bpm, mikroGezaehlt);
    if (w === "treffer") { punkte += BONUS.oi; pop(T.oi, "var(--paper)"); taktTreffer(t); } else if (w === "daneben") { pop(T.daneben, "var(--paper-2)"); brichCombo(); }
    return;
  }
  const imSchlag = imTakt(t, song.bpm, song.start), w = sprungWertung(z, imSchlag);
  if (w.punkte) { punkte += w.punkte * comboStufe(combo.serie) * kochFaktor(); stats.taktSpruenge++; taktTreffer(t); pulsiere("pogo-combo"); }
  else if (!imSchlag && z !== "rand") brichCombo();
  if (w.bier && phase !== "zugabe") { bier = Math.max(0, bier - w.bier); spritzer(2); }
}
function wische(seite) {
  if (!laeuft || stagedive.phase !== "getragen" || !stagedive.griff) return;
  const richtig = seite === stagedive.griff.seite; stagedive.griff = null;
  if (richtig) { stagedive.abgewehrt++; pop(T.abgewehrt, "#58d26a"); } else verschuette(STAGEDIVE.verlust, T.schwapp);
}
function starteStagedive() {
  if (stagedive.phase !== "aus" || stagedive.fertig) return;
  stagedive = { phase: "getragen", t: 0, z0: ich.z, z1: landeZ(L), griff: null, naechsterGriff: 1.0, fertig: true, griffe: 0, abgewehrt: 0 };
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
// jedes Tippen und jede Taste holt den Ton zurück, falls der Browser ihn angehalten hat (Anruf, App-Wechsel, abgelehnter Start)
addEventListener("pointerdown", () => musik.wecke(), true);
addEventListener("keydown", () => musik.wecke(), true);
addEventListener("keydown", (e) => {
  if (outro && (e.key === " " || e.key === "Enter" || e.key === "Escape")) { e.preventDefault(); if (outroWegbar()) endeOutro(); return; }
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
  const vorX = ich.x, vorZ = ich.z;
  zeit += dt;
  const teil0 = teilBei(zeit, song.teile), teil = { ...teil0, kraft: teil0.kraft * kraftFaktor(ladenId) }, kraft = teil.kraft, zMin = L.gitterZ + 0.4, zMax = L.z[1] - 0.4;
  const getragen = stagedive.phase === "getragen", oben = schultern.phase === "oben";

  if (L.wall) {
    if (zeit > song.wall[0] && zeit < song.wall[1] && !wall) { wall = { phase: "teilen", seite: Math.sign(ich.x) || 1, zuFrueh: false }; ansage(T.wall); }
    if (wall?.phase === "teilen" && !wall.zuFrueh && Math.sign(ich.x) === -wall.seite && Math.abs(ich.x) > 0.4) { wall.zuFrueh = true; ansage(T.wallFrueh, "var(--paper)"); }
    if (wall?.phase === "teilen" && zeit >= song.wall[1]) { wall = { phase: "rennen", t: 0, seite: wall.seite, zuFrueh: wall.zuFrueh, losZeit: zeit, startZeit: null, gewertet: false }; ansage(T.los); strobo(2); }
    if (wall?.phase === "rennen") {
      wall.t += dt;
      if (wall.startZeit == null && -wall.seite * ich.vx > 1.2) wall.startZeit = zeit;
      if (!wall.gewertet && (wall.startZeit != null || wall.t > (60 / song.bpm) * 1.5)) {
        wall.gewertet = true;
        if (wallWertung({ losZeit: wall.losZeit, startZeit: wall.startZeit, zuFrueh: wall.zuFrueh, bpm: song.bpm }) === "perfekt") { punkte += WALL.bonus; stimmungPlus(STIMMUNG.plus.wall); ansage(T.wallPerfekt, "#58d26a"); }
      }
      if (wall.t > 2.4) wall = { phase: "vorbei" };
    }
  }
  kreisSchritt(dt);
  stimmungSchritt(dt);
  if (getragen || oben) { if (combo.serie) combo.letzterSchlag = schlagJetzt(); } // pausiert, bricht nicht
  else if (comboLuecke(combo, schlagJetzt())) brichCombo();

  // Du: Stick oder Tasten (oben = zur Bühne); auf den Schultern nur links/rechts für die Balance
  if (oben) schulterSchritt(dt, eingabeX());
  else if (!getragen) {
    let sx = 0, sz = 0;
    if (zeiger?.ziehen) { sx = zeiger.dx; sz = zeiger.dy; }
    if (tasten.has("ArrowLeft") || tasten.has("a")) sx -= 1; if (tasten.has("ArrowRight") || tasten.has("d")) sx += 1;
    if (tasten.has("ArrowUp") || tasten.has("w")) sz -= 1; if (tasten.has("ArrowDown") || tasten.has("s")) sz += 1;
    const sl = Math.hypot(sx, sz);
    zieht = sl > 0.12;
    if (sl > 0.12) { const f = Math.min(1, sl); ich.vx += (sx / sl) * 22 * f * dt; ich.vz += (sz / sl) * 22 * f * dt; }
    if (randSchubs(ich, L, dt) && zeit - randPop > 3) { randPop = zeit; pop(T.randSchubs, "var(--paper)"); }
  }
  if (ich.inLuft && zeit >= sprungBis) ich.inLuft = false;

  const menge = getragen || oben ? leute.filter((p) => !p.ich) : leute;
  bewegeMenge(menge, L, teil, dt, Math.random, wall, kreis && !kreis.vorbei ? kreis : null);
  schurkenKraefte(dt);
  if (gefallen) { gefallen.p.vx = gefallen.p.vz = 0; }
  if (schultern.kumpel) { schultern.kumpel.vx *= 0.4; schultern.kumpel.vz *= 0.4; }
  integriere(menge, L, dt, S.matsch);
  // Stillstand: Eingabe allein reicht nicht (Pfeil gegen das Gitter), die Figur muss sich auch bewegen
  const weg = Math.hypot(ich.x - vorX, ich.z - vorZ) / Math.max(dt, 1e-6);
  stillZeit = getragen || oben || (zieht && weg > 0.35) || ich.inLuft ? 0 : stillZeit + dt;
  if (schultern.phase === "oben") { ich.x = schultern.kumpel.x; ich.z = schultern.kumpel.z; ich.vx = ich.vz = 0; } // live prüfen: schulterSchritt kann gerade beendet haben
  for (const tr of stoesse(menge)) {
    if (schnoesel && tr.anderer === schnoesel.p) { schubseSchnoesel(tr); continue; }
    const letzte = beruehrt.get(tr.anderer) || -9;
    if (zeit - letzte < 0.3) continue;
    const m = verschuettet(tr.schlag, { rucksack: tr.anderer.rucksack, inLuft: ich.inLuft });
    if (m > 0) { beruehrt.set(tr.anderer, zeit); brichCombo(); verschuette(m, tr.anderer.rucksack ? T.rucksack : m > 7 ? T.platsch : m > 3 ? T.schwapp : null); }
  }

  // Zonen, Punkte, erste Reihe
  const z = getragen || oben ? "pit" : zone(ich.x, ich.z, L), nass = zeit < nassBis;
  if (!getragen) punkte += punkteProSekunde(z, teil0, nass) * dt * faktor * (zeit < geblendetBis ? 0.5 : 1) * stillFaktor(stillZeit)
    * kochFaktor() * (kreis?.strom === "mit" ? 1.5 : 1) * (oben ? SCHULTERN.faktor : 1);
  pitEreignisse(dt, getragen || oben);
  if (z === "mitte") stats.mitteSekunden += dt;
  if (z === "reihe" && teil.name === "LETZTER REFRAIN") stats.reiheImLetztenRefrain = true;
  reiheSeit = z === "reihe" && !getragen ? reiheSeit + dt : 0;
  if (z === "reihe" && phase !== "zugabe") bier = Math.max(0, bier - GEDRAENGE * kraft * dt);
  if (z === "reihe" && wilderTeil(teil0) && reiheSeit > 3 && zeit - letzterSpritzer > 8) {
    letzterSpritzer = zeit; nassBis = zeit + 3; pop(T.abkuehlen, "#7fc8ff"); spritzer(8, 0x7fc8ff);
  }
  if (z === "reihe" && wilderTeil(teil0) && reiheSeit > 1.5 && !duDaTeile.has(teil.bis)) {
    duDaTeile.add(teil.bis); punkte += BONUS.duDa; pop(T.duDa, "var(--blood-hot)"); S.band[1].zeigtBis = zeit + 1.5;
  }
  mikroAn = zeit >= song.mikro[0] && zeit < song.mikro[1];
  const stagediveBereit = !stagedive.fertig && reiheSeit >= STAGEDIVE_AB;
  $("pogo-stagedive").hidden = !stagediveBereit;
  if (!getragen) $("pogo-hinweis").textContent = phase === "zugabe" ? T.saenger : zeit < abguck.erklaertBis ? T.goldHinweis : mikroAn && z === "reihe" ? T.mikro
    : oben ? T.schulterOben : gefallen ? T.gefallen : schultern.phase === "angebot" ? T.schulterAngebot : wall?.phase === "teilen" ? T.wallSeite
    : kreis && !kreis.vorbei ? (zeit < kreis.mitBis ? T.kreisMit : T.kreisHinweis)
    : stillFaktor(stillZeit) < 1 && z !== "rand" ? T.bewegDich : (T.zonen[z] || "");

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
    if (!sd.griff && sd.naechsterGriff <= 0) { sd.griff = { seite: Math.random() < 0.5 ? -1 : 1, bis: zeit + STAGEDIVE.griffFenster }; sd.griffe++; sd.naechsterGriff = STAGEDIVE.griffAlle; pop((sd.griff.seite < 0 ? "← " : "") + T.hand + (sd.griff.seite > 0 ? " →" : ""), "var(--blood-hot)"); }
    if (sd.griff && zeit > sd.griff.bis) { sd.griff = null; verschuette(STAGEDIVE.verlust, T.schwapp); }
    if (sd.t >= STAGEDIVE.dauer) {
      stagedive = { phase: "aus", fertig: true }; ich.vx = ich.vz = 0; $("pogo-hinweis").textContent = "";
      stats.stagediveBier = bier;
      const bonus = stagediveBonus(bier, sd.abgewehrt, sd.griffe); // sd: der Stagedive, der gerade endet
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
    if (!getragen && !oben && !surfer.traf && Math.hypot(surfer.x - ich.x, surfer.z - ich.z) < 0.55) { surfer.traf = true; stats.surferTreffer++; brichCombo(); verschuette(14, T.stiefel); }
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
  S.setzeLicht(zeit < kochtBis ? Math.max(kraft, 1.6) : kraft, zeit, (song.bpm / 60) * Math.PI, (zeit - song.start) / (60 / song.bpm));
  stroboSchritt();

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
  if (schnoesel.schubse >= 3) { schnoesel.raus = true; punkte += BONUS.schnoesel; pop(T.schnoeselRaus, "var(--blood-hot)"); stimmungPlus(STIMMUNG.plus.schnoesel); entfernePerson(schnoesel.p); }
}
function extras(dt) {
  const getragen = stagedive.phase === "getragen";
  if (selten && !abguck.fertig && abguck.erklaertBis < 0 && figuren.has(selten.p) && Math.hypot(selten.p.x - ich.x, selten.p.z - ich.z) < 3) {
    abguck.erklaertBis = zeit + 5; ansage(T.goldPop, "#ffc83a");
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
    fascho = { p, t: 0, weg: false, geholfen: false }; ansage(T.fascho);
  }
  if (schnoesel && !schnoesel.raus && Math.hypot(schnoesel.p.x - ich.x, schnoesel.p.z - ich.z) < 3 && zeit >= schnoesel.naechsterBlitz) {
    schnoesel.naechsterBlitz = zeit + 4; geblendetBis = zeit + 1.5; pop(T.blitz, "#ffffff");
    const el = $("pogo-blitz"); el.classList.remove("an"); void el.offsetWidth; el.classList.add("an");
  }
  if (fascho && !fascho.weg) {
    fascho.t += dt;
    if (!fascho.geholfen && Math.hypot(fascho.p.x - ich.x, fascho.p.z - ich.z) <= 1.5) { fascho.geholfen = true; punkte += BONUS.fascho; stimmungPlus(STIMMUNG.plus.fascho); pop(T.faschoGeholfen, "#58d26a"); }
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
  if (schultern.phase === "oben") schulterEnde(false);
  if (gefallen) aufstehen(false);
  if (schultern.phase === "angebot") { entferneSchulterRing(); schultern = { phase: "fertig" }; }
  entferneKreis(); stimmungEnde = stimmung;
  $("pogo-stagedive").hidden = true; $("pogo-hinweis").textContent = T.zugabeRufN({ n: zugabeTreffer(stimmungEnde) }); pop(T.zugabe, "var(--paper)");
  musik.stopp(); musik.klatschen(song.bpm);
}
function rufSchritt(echt) {
  rufZeit += echt;
  bewegeFiguren(Math.min(0.05, echt), 0.5, false); S.setzeLicht(0.5, rufZeit, (song.bpm / 60) * Math.PI, rufZeit / (60 / song.bpm));
  if (rufZeit < ZUGABE.fenster) return;
  if (rufTreffer >= zugabeTreffer(stimmungEnde)) starteZugabe(); else { musik.stopp(); pop(T.keineZugabe, "var(--paper)"); ende(false); }
}
function starteZugabe() {
  phase = "zugabe"; faktor = ZUGABE.faktor;
  const zz = zugabeZeiten(song), start = zz.start; zeit = start; zugabeEnde = zz.ende;
  kochtBis = -1; combo = { serie: 0, letzterSchlag: null }; groel = { folge: 0, letzterSchlag: null, getroffen: new Set() }; // nie Kochen in der Zugabe
  // die Uhr springt zurück: alle Zeitstempel aus dem Song gelten nicht mehr
  nassBis = geblendetBis = sprungBis = 0; stillZeit = 0; ich.inLuft = false; letzterSpritzer = randPop = -99; beruehrt = new Map();
  if (schnoesel) { schnoesel.naechsterBlitz = start + 2; schnoesel.letzter = -99; }
  entferneFreibier(); entferneSurfer();
  musik.start(song.datei ? WURZEL + song.datei : null, start);
  const f = F.baueFigur(THREE, { aufnaeher: false, haar: ["glatze"], kopfEinzeln: true }); setzeGanoveKopf(f); f.g.rotation.set(-Math.PI / 2, 0, 0); f.arme.forEach((a, k) => (a.rotation.z = k ? 2.9 : -2.9));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: 0x58d26a, transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; S.raum.add(ring);
  S.raum.add(f.g); saenger = { f, ring, t: 0, x: 0, z: L.gitterZ + 1, weg: 0, gefallen: false };
  if (S.band[1]) S.band[1].g.visible = false;
  ansage(T.zugabe, "#58d26a"); $("pogo-hinweis").textContent = T.saenger;
}
function aktualisiereLaeden() {
  for (const id of TOUR) {
    const b = $("pogo-laden-" + id); if (!b) continue;
    const n = fehlt(tour, id); b.querySelector("em").textContent = n > 0 ? T.ziel({ n, ziel: ZIELE[TOUR.indexOf(id)] }) : T.geschafft;
    b.classList.toggle("ist-geschafft", n === 0);
  }
  document.querySelectorAll(".pogo__laden[id^='pogo-laden-']").forEach((x) => x.setAttribute("aria-pressed", String(x.id === "pogo-laden-" + ladenId)));
}

/* ---------- Etappe 5: Combo, Stimmung, Mitgrölen, Circle Pit, Aufheben, Schultern, Teilen ---------- */
const schlagJetzt = (t = zeit) => Math.round((t - song.start) / (60 / song.bpm));
const kochFaktor = () => (zeit < kochtBis ? STIMMUNG.faktor : 1);
/* Stroboskop: n Blitze, je einer auf den nächsten Schlägen. Höchstens ein Blitz pro Schlag, also unter 3 pro Sekunde
   (WCAG 2.3.1); bei reduzierter Bewegung aus. */
let stroboRest = 0, stroboSchlag = -1;
function strobo(n) { if (!ruhig) stroboRest = Math.max(stroboRest, n); }
function stroboSchritt() {
  if (stroboRest <= 0) return;
  const s = schlagJetzt(); if (s === stroboSchlag || 60 / song.bpm < 0.34) return;
  stroboSchlag = s; stroboRest--;
  const el = $("pogo-strobo"); el.classList.remove("an"); void el.offsetWidth; el.classList.add("an");
}
function pulsiere(id) { const el = $(id); if (!el || el.hidden) return; el.classList.remove("puls"); void el.offsetWidth; el.classList.add("puls"); }
function stimmungPlus(n) {
  if (zeit < kochtBis || phase === "zugabe") return; // kocht schon; in der Zugabe kein Kochen
  const r = mitStimmung(stimmung, n); stimmung = r.wert;
  if (r.kocht) { kochtBis = zeit + STIMMUNG.kochtDauer; ansage(T.kocht, "#ff5fd2"); S.wackeln(0.08); strobo(4); }
}
function stimmungSchritt(dt) {
  if (kochtBis > 0 && zeit >= kochtBis) { kochtBis = -1; stimmung = STIMMUNG.nachKochen; }
  else if (zeit >= kochtBis) stimmung = stimmungAbfall(stimmung, dt);
}
function brichCombo() {
  if (combo.serie >= COMBO.proStufe) pop(T.comboWeg, "var(--paper-2)");
  combo = { serie: 0, letzterSchlag: null };
}
/** Sprung (oder OI!) im Takt: Combo, Stimmung, Mitgrölen. */
function taktTreffer(t) {
  const schlag = schlagJetzt(t), r = comboTakt(combo, schlag);
  combo = r.combo; stimmungPlus(STIMMUNG.plus.takt);
  if (r.neueStufe) { pop(T.comboPop({ n: comboStufe(combo.serie) }), "#f2b632"); stimmungPlus(STIMMUNG.plus.combo); }
  const g = groelWort(t, song);
  if (!g) return;
  groel.folge = groel.letzterSchlag != null && g.schlag - groel.letzterSchlag === 1 ? groel.folge + 1 : 1;
  groel.letzterSchlag = g.schlag; groel.getroffen.add(g.schlag);
  if (groel.folge >= song.groelen.worte.length) {
    groel.folge = 0; punkte += 200; stimmungPlus(STIMMUNG.plus.groelen);
    ansage(song.groelen.worte.join(" "), "var(--bier)"); S.wackeln(0.05);
  }
}
let groelStand = "";
function zeigeGroelen() {
  const el = $("pogo-groelen"), g = phase === "song" || phase === "zugabe" ? groelWort(zeit, song) : null;
  if (!g) { if (!el.hidden) { el.hidden = true; groelStand = ""; } return; }
  const n = song.groelen.worte.length, erster = g.schlag - g.index;
  const stand = g.schlag + ":" + [...Array(n).keys()].map((i) => (groel.getroffen.has(erster + i) ? 1 : 0)).join("");
  if (stand === groelStand) return;
  groelStand = stand; el.hidden = false; el.replaceChildren();
  song.groelen.worte.forEach((w, i) => {
    const s = document.createElement("span"); s.textContent = w;
    if (groel.getroffen.has(erster + i)) s.className = "getroffen"; else if (i === g.index) s.className = "jetzt";
    el.append(s);
  });
}

/* Tippen: erst Aufheben und Schultern, dann erst springen */
function tippAktion() {
  if (schultern.phase === "oben") return true;
  if (gefallen && Math.hypot(gefallen.p.x - ich.x, gefallen.p.z - ich.z) <= AUFHEBEN.reichweite) { aufstehen(true); return true; }
  if (schultern.phase === "angebot" && Math.hypot(schultern.kumpel.x - ich.x, schultern.kumpel.z - ich.z) <= SCHULTERN.reichweite) {
    schultern = { ...schultern, phase: "oben", t: 0, wackel: Math.random() < 0.5 ? -0.15 : 0.15 };
    entferneSchulterRing(); ansage(T.schulterPop, "#3aa0ff"); return true;
  }
  return false;
}
const eingabeX = () => {
  let x = zeiger?.ziehen ? zeiger.dx : 0;
  if (tasten.has("ArrowLeft") || tasten.has("a")) x -= 1; if (tasten.has("ArrowRight") || tasten.has("d")) x += 1;
  return Math.max(-1, Math.min(1, x));
};

/* Gefallene, Schulter-Angebot */
const mitteZ = () => (L.gitterZ + L.z[1]) / 2;
function kandidat() {
  const frei = leute.filter((p) => !p.rand && !p.ich && !p.liegt && p !== selten?.p && p !== schultern.kumpel && p !== schnoesel?.p && p !== fascho?.p && zone(p.x, p.z, L) !== "rand");
  // im Bild: vor dir (Richtung Bühne) und nicht zu weit weg
  const vorn = frei.filter((p) => p.z < ich.z - 0.4 && Math.hypot(p.x - ich.x, p.z - ich.z) < 4.5);
  const wahl = vorn.length ? vorn : frei;
  return wahl.length ? wahl[(Math.random() * wahl.length) | 0] : null;
}
function bodenRing(farbe, innen, aussen) {
  const r = new THREE.Mesh(new THREE.RingGeometry(innen, aussen, 32), new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.8, depthWrite: false }));
  r.rotation.x = -Math.PI / 2; r.position.y = 0.04; S.raum.add(r); return r;
}
function weg(mesh) { if (!mesh) return; S.raum.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
function pitEreignisse(dt, beschaeftigt) {
  if (gefallen && zeit > gefallen.bis) aufstehen(false);
  if (schultern.phase === "angebot" && zeit > schultern.bis) { entferneSchulterRing(); schultern = { phase: "fertig" }; }
  if (phase !== "song") return;
  // jemand fällt hin
  if (!gefallen && gefallenAnzahl < AUFHEBEN.max && zeit >= naechsterFall && !beschaeftigt) {
    const p = kandidat();
    if (p) { p.liegt = true; gefallen = { p, bis: zeit + AUFHEBEN.wartet, ring: bodenRing(0xd4161b, 0.5, 0.64) }; gefallenAnzahl++; ansage(T.gefallenPop); }
    naechsterFall = zeit + AUFHEBEN.alle;
  }
  if (gefallen) gefallen.ring.position.set(gefallen.p.x, 0.04, gefallen.p.z);
  // Kumpel bietet Schultern an
  if (schultern.phase === "aus" && zeit >= schultern.ab && !beschaeftigt) {
    const p = kandidat();
    if (p) { schultern = { phase: "angebot", kumpel: p, bis: zeit + 12, ring: bodenRing(0x3aa0ff, 0.55, 0.7) }; } // blau: eigener Ring nur für den Kumpel
    else schultern.ab = zeit + 3;
  }
  if (schultern.phase === "angebot") schultern.ring.position.set(schultern.kumpel.x, 0.04, schultern.kumpel.z);
}
function aufstehen(geholfen) {
  if (!gefallen) return;
  gefallen.p.liegt = false; weg(gefallen.ring);
  if (geholfen) { punkte += AUFHEBEN.bonus; bier = Math.min(100, bier + AUFHEBEN.bier); stimmungPlus(STIMMUNG.plus.aufheben); pop(T.aufheben, "#58d26a"); }
  gefallen = null;
}
function entferneSchulterRing() { if (schultern?.ring) { weg(schultern.ring); schultern.ring = null; } }
function schulterSchritt(dt, eingabe) {
  schultern.t += dt;
  schultern.wackel = wackle(schultern.wackel, eingabe, dt, Math.random());
  if (runtergefallen(schultern.wackel)) schulterEnde(false);
  else if (schultern.t >= SCHULTERN.dauer) schulterEnde(true);
}
function schulterEnde(sauber) {
  const k = schultern.kumpel;
  schultern = { phase: "fertig" };
  if (k) { ich.x = k.x + 0.5; ich.z = Math.min(L.z[1] - 0.6, k.z + 0.5); }
  if (sauber) pop(T.schulterSauber, "#58d26a");
  else if (phase !== "ruf") { verschuette(SCHULTERN.fallBier, T.schulterRunter); brichCombo(); }
}

/* Circle Pit (nur große Läden) */
function kreisSchritt(dt) {
  if (L.x < 5 || phase !== "song") { if (kreis && !kreis.vorbei) { kreis.vorbei = true; entferneKreis(); } return; }
  const kz = kreisZeit(song);
  if (!kreis && zeit >= kz.von && zeit < kz.bis) {
    kreis = { richtung: 1, gedreht: false, bis: kz.bis, mitte: Math.min(kz.von + 5, kz.bis - 1.5), winkel: 0, strom: "neutral", letzterRempler: -9, schonBis: -1, mitBis: -1 };
    ansage(T.kreis); baueKreisPfeile();
  }
  if (!kreis || kreis.vorbei) return;
  if (zeit >= kreis.bis) { kreis.vorbei = true; kreis.strom = "neutral"; entferneKreis(); return; }
  if (!kreis.gedreht && zeit >= kreis.mitte) { kreis.gedreht = true; kreis.richtung = -1; kreis.schonBis = zeit + 1.5; ansage(T.kreisUm); }
  const mz = mitteZ() + 0.6, tg = kreisTangente(ich.x, ich.z, 0, mz, kreis.richtung);
  kreis.strom = stagedive.phase === "getragen" || schultern.phase === "oben" ? "neutral" : stromWertung(ich.vx, ich.vz, tg.x, tg.z);
  if (kreis.strom === "mit") kreis.mitBis = zeit + 0.6;
  if (kreis.strom === "gegen" && zeit >= kreis.schonBis && zeit - kreis.letzterRempler > 0.8) { kreis.letzterRempler = zeit; brichCombo(); verschuette(4, T.umgerannt); }
  // Pfeile drehen sich mit
  kreis.winkel += kreis.richtung * dt * 1.1;
  kreisPfeile.forEach((m, i) => {
    const a = kreis.winkel + (i / kreisPfeile.length) * Math.PI * 2, r = 2.6;
    m.position.set(Math.cos(a) * r, 0.08, mz + Math.sin(a) * r);
    const t = kreisTangente(m.position.x, m.position.z, 0, mz, kreis.richtung);
    m.lookAt(m.position.x + t.x, 0.08, m.position.z + t.z);
  });
}
let pfeilGeo = null, pfeilMat = null;
function baueKreisPfeile() {
  pfeilGeo ??= new THREE.ConeGeometry(0.14, 0.4, 3).rotateX(Math.PI / 2);
  pfeilMat ??= new THREE.MeshBasicMaterial({ color: 0xe3262b });
  pfeilGeo.userData.geteilt = true;
  kreisPfeile = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(pfeilGeo, pfeilMat); S.raum.add(m); return m; });
}
function entferneKreis() { for (const m of kreisPfeile) S.raum.remove(m); kreisPfeile = []; }

/* Ergebnis als Bild teilen (Teilen-Menü des Geräts, sonst Download) */
let teiltGerade = false;
async function teileErgebnis() {
  const e = letztesErgebnis; if (!e || teiltGerade) return;
  teiltGerade = true;
  try { await teileBild(e); } finally { teiltGerade = false; }
}
async function teileBild(e) {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const x = c.getContext("2d");
  await document.fonts?.ready;
  x.fillStyle = "#0b0a0a"; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = "#d4161b"; x.fillRect(0, 0, 1080, 18); x.fillRect(0, 1332, 1080, 18);
  x.textAlign = "center"; x.fillStyle = "#f1ede4";
  x.font = "64px Anton, Impact, sans-serif"; x.fillText("FUCK OFF FASHION", 540, 120);
  x.font = "220px Anton, Impact, sans-serif"; x.fillText("POGO.", 540, 360);
  x.font = "bold 46px 'Courier Prime', monospace"; x.fillStyle = "#e3262b"; x.fillText(e.laden.toUpperCase(), 540, 450);
  x.fillStyle = "#f2b632"; x.font = "260px Anton, Impact, sans-serif"; x.fillText(String(e.erg), 540, 740);
  x.fillStyle = "#f1ede4"; x.font = "52px 'Permanent Marker', cursive"; x.fillText(e.titel, 540, 830, 980);
  x.font = "bold 40px 'Courier Prime', monospace"; x.fillStyle = "#cfc8bb"; x.fillText(`${T.rang}: ${e.rang}`, 540, 900);
  const m = e.motiv && MOTIVE.find((v) => v.nr === e.motiv);
  if (m) {
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = WURZEL + m.bild; });
    if (img) { const k = Math.min(300 / img.width, 260 / img.height); x.drawImage(img, 540 - (img.width * k) / 2, 950, img.width * k, img.height * k); }
  }
  x.fillStyle = "#f1ede4"; x.font = "bold 38px 'Courier Prime', monospace"; x.fillText("fuckofffashion.github.io/pogo.html", 540, 1275);
  const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
  if (!blob) return;
  const datei = new File([blob], "pogo-ergebnis.png", { type: "image/png" });
  const url = new URL("pogo.html", location.href).href, text = T.teilenText({ erg: e.erg, laden: e.laden });
  try {
    if (navigator.canShare?.({ files: [datei] })) { await navigator.share({ files: [datei], title: "Pogo · FUCK OFF FASHION", text, url }); return; }
  } catch (f) { if (f?.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pogo-ergebnis.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- Outro: Sänger tritt vor, Kamera schwenkt heran, Band spricht ---------- */
function starteOutro() {
  const url = song.outro && WURZEL + song.outro.datei, sanger = S.band[1];
  if (!url || !sanger || !musik.bereit(url)) return false;
  const dauer = musik.spieleEinmal(url); if (!dauer) return false;
  if (saenger) { saenger.f.g.visible = false; saenger.ring.visible = false; } // getragener Sänger aus der Zugabe ist wieder auf der Bühne
  sanger.g.visible = true; if (sanger.staender) sanger.staender.visible = false; // Mikro vom Ständer genommen
  outro = { t: 0, dauer: dauer + 0.6, figur: sanger, basisZ: sanger.g.position.z };
  $("pogo-hinweis").textContent = T.outro({ band: song.bandName });
  return true;
}
function outroSchritt(dt) {
  const o = outro; o.t += dt;
  bewegeMenge(leute.filter((p) => !p.ich), L, { kraft: 0.4 }, dt); integriere(leute, L, dt, S.matsch); bewegeFiguren(dt, 0.4, false);
  S.setzeLicht(0.6, performance.now() / 1000, 3);
  // Sänger tritt an die Bühnenkante und hebt das Mikro
  const vor = Math.min(1, o.t / 1.1), f = o.figur;
  f.g.position.z = o.basisZ + 0.8 * vor; f.koerper.rotation.x = 0.15 * vor; f.arme[1].rotation.z = 1.25 + Math.sin(o.t * 5) * 0.08;
  // erst schwenken (0,8 s), dann heranzoomen
  S.kameraAuf(f.g.position, dt, Math.max(0, (o.t - 0.8) / 1.4));
  // der Ganove-Kopf spricht: Unterkiefer folgt der Stimme
  f.ganove?.sprich(musik.pegel());
  if (o.t >= o.dauer) endeOutro();
}
/** Wegtippen erst nach einer kurzen Sperre: wer beim Rundenende noch tippt oder hüpft, soll das Outro nicht sofort beenden. */
const OUTRO_SPERRE = 1.5;
const outroWegbar = () => !!outro && outro.t >= OUTRO_SPERRE;
function endeOutro() {
  if (!outro) return;
  musik.stoppeEinmal();
  const f = outro.figur; f.g.position.z = outro.basisZ; f.koerper.rotation.x = 0;
  f.ganove?.sprich(0); if (f.staender) f.staender.visible = true;
  outro = null; S.kameraNormal(); S.kamera(ich, 0, true);
  zeigeEndbild();
}

/* ---------- Aufräumen ---------- */
function gibFrei(obj) { obj.traverse((o) => { if (o.isMesh) { if (!o.geometry.userData.geteilt) o.geometry.dispose(); if (!o.material.vertexColors && !o.material.map) o.material.dispose(); } }); }
function entferneFreibier() { if (!freibier) return; S.raum.remove(freibier.g); gibFrei(freibier.g); freibier = null; }
function entferneSurfer() { if (!surfer) return; S.raum.remove(surfer.f.g); surfer.f.geos.forEach((g) => g.dispose()); surfer = null; }
/** Setzt der Figur den Ganove-Kopf auf (statt ihres Kugelkopfs); ohne geladenen Atlas bleibt alles, wie es ist. */
function setzeGanoveKopf(f) {
  if (!kopfVorlage || !f?.kopf || f.ganove) return;
  const k = kopfVorlage.neu();
  k.g.scale.setScalar(0.47); k.g.position.set(0, 1.6, 0); k.g.rotation.y = Math.PI; // Figuren schauen nach −z
  f.koerper.add(k.g); f.kopf.visible = false; f.ganove = k; koepfe.push(k);
}
function raeumeAuf() {
  if (!S?.raum) return;
  entferneFreibier(); entferneSurfer();
  entferneKreis(); if (gefallen) aufstehen(false); entferneSchulterRing(); glanz?.material.dispose(); glanz = null;
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
      const hop = p.inLuft ? Math.sin(Math.max(0, 1 - (sprungBis - zeit) / 0.45) * Math.PI) * 0.5 : 0, oben = schultern.phase === "oben";
      f.g.position.set(p.x, getragen ? 2.1 : oben ? 1.05 : hop, p.z);
      f.g.rotation.set(getragen ? -Math.PI / 2 : 0, 0, oben ? schultern.wackel * 0.45 : 0);
      if (glanz) {
        const st = comboStufe(combo?.serie || 0);
        glanz.visible = st >= 2 && !getragen && !oben; glanz.material.color.setHex(st >= 4 ? 0xe3262b : st === 3 ? 0xff8a1e : 0xf2b632);
        glanz.scale.setScalar(0.9 + st * 0.12); glanz.material.opacity = 0.45 + Math.abs(Math.sin(zeit * 6)) * 0.4;
      }
      f.arme[1].rotation.z = 2.75 + Math.sin(zeit * 7) * 0.05;
      f.arme[0].rotation.z = -0.5 - Math.abs(Math.sin(f.phase)) * 0.4;
      continue;
    }
    if (p.liegt) { f.g.position.set(p.x, 0.16, p.z); f.g.rotation.set(-Math.PI / 2, 0, 0.4); continue; }
    const hop = p.rand ? 0.05 + kraft * 0.08 : f.sprung * (0.3 + kraft * 0.8);
    f.g.position.set(p.x, Math.abs(Math.sin(f.phase)) * hop, p.z); f.g.rotation.x = 0; f.g.rotation.z = 0;
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
    else if (outro) outroSchritt(dt);
    else if (L) { bewegeMenge(leute.filter((p) => !p.ich), L, { kraft: 0.3 }, dt); integriere(leute, L, dt, S.matsch); bewegeFiguren(dt, 0.3, false); S.setzeLicht(0.3, performance.now() / 1000, 3); }
    if (L && !outro) S.kamera(ich, dt, false, stagedive?.phase === "getragen" || schultern?.phase === "oben");
    for (const k of koepfe) k.schritt(S.camera.position, echt);
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
  $("pogo-ergebnis").textContent = ergebnis(Math.round(punkte), Math.round(bier));
  const st = comboStufe(combo.serie), ce = $("pogo-combo"); ce.hidden = st < 2; ce.textContent = "×" + st;
  const sb = $("pogo-stimmung-box"); sb.hidden = false; $("pogo-stimmung").style.width = Math.round(stimmung) + "%"; sb.classList.toggle("kocht", zeit < kochtBis);
  zeigeGroelen();
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
  try { S.renderer.compile(S.scene, S.camera); } catch {} // Shader vorab bauen: kein Ruckler in der ersten Sekunde
  $("pogo-start").hidden = true; $("pogo-ende").hidden = true; $("pogo-hud").hidden = false; $("pogo-tonbox").hidden = false;
  spielEl.scrollIntoView({ block: "nearest" });
  laeuft = true; pausiert = false; letzte = performance.now(); phase = "song";
  musik.start(song.datei ? WURZEL + song.datei : null);
  // läuft der Ton nach dem Start nicht, sagen wir es (statt stumm weiterzuspielen)
  setTimeout(() => { if (laeuft && !pausiert && !musik.laeuftTon()) pop(T.keinTon, "var(--paper)", true); }, 1500);
}
function ende(leer) {
  if (!laeuft) return;
  phase = "aus";
  if (gefallen) aufstehen(false);
  entferneSchulterRing(); schultern = { phase: "fertig" }; entferneKreis();
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
  $("pogo-groelen").hidden = true; $("pogo-stimmung-box").hidden = true;
  const schonGeschafft = geschafft(tour, ladenId); tour = mitErgebnis(tour, ladenId, erg); schreibeTour(speicher, tour);
  const tourEl = $("pogo-ende-tour"); tourEl.replaceChildren(`${T.rang}: ${T.raenge[rang(tour.summe)]} · ${tourText()}`);
  if (!schonGeschafft && geschafft(tour, ladenId)) tourEl.append(document.createElement("br"), T.ladenGeschafft({ laden: T.laeden[ladenId].name }));
  else if (!geschafft(tour, ladenId)) tourEl.append(document.createElement("br"), T.ziel({ n: fehlt(tour, ladenId), ziel: ZIELE[TOUR.indexOf(ladenId)] }));
  if (abgeguckt) {
    const m = MOTIVE.find((x) => x.nr === abgeguckt); const a = document.createElement("a");
    a.href = "index.html#wand"; a.textContent = T.zurVorlage;
    tourEl.append(document.createElement("br"), T.motivAbgeguckt({ nr: m.nr, titel: sp === "en" ? m.titel_en : m.titel }), " · ", a);
  }
  aktualisiereLaeden();
  letztesErgebnis = { erg, p, b, laden: T.laeden[ladenId].name, titel: T.titel[titelSchluessel(p, b)], rang: T.raenge[rang(tour.summe)], motiv: abgeguckt || (kutte.motive || []).at(-1) || null };
  $("pogo-ende-werte").textContent = `${T.punkte} ${p} × ${T.bier} ${b} %` + (b < BIER_MIN ? ` (${T.zaehltAls({ n: BIER_MIN })})` : "");
  zeigeBand();
  $("pogo-ende-andenken").textContent = andenken.length ? `${T.andenken}: ${andenken.map((a) => T[a].replace("!", "")).join(", ")}` : T.keineAndenken;
  $("pogo-hud").hidden = true; $("pogo-tonbox").hidden = true;
  aufgaben = ziehe(L); zeigeAufgabenUndKutte(); // neue Aufgaben für die nächste Runde
  if (!starteOutro()) zeigeEndbild();
}
function zeigeEndbild() {
  $("pogo-hinweis").textContent = "";
  $("pogo-ende").hidden = false;
  $("pogo-nochmal").focus({ preventScroll: true });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && outro) endeOutro();
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
      import("./szene.js?v=43").then((m) => ({ baueSzene: m.baueSzene })),
      import("./figuren.js?v=43"),
    ]);
    S = S(THREE, { container: spielEl, ruhig });
  } catch (fehler) {
    console.warn("Pogo: 3D nicht möglich", fehler);
    $("pogo-ohne3d").hidden = false; $("pogo-start").hidden = true; return;
  }
  const el = S.renderer.domElement;
  el.addEventListener("pointerdown", (e) => { if (outro) { if (outroWegbar()) endeOutro(); return; } beginneZeiger(e); });
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
  if (SONGS.length === 1) { songsEl.hidden = true; songsEl.previousElementSibling.textContent = `Song: ${SONGS[0].bandName} · „${SONGS[0].titel}“`; }
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
  const anteile = SONGS.map(() => 0);
  const zeigeLaden = () => { los.textContent = `${T.laedt} ${Math.round((100 * anteile.reduce((a, b) => a + b, 0)) / Math.max(1, anteile.length))} %`; };
  for (const s of SONGS) if (s.outro) musik.lade(WURZEL + s.outro.datei);
  Promise.all(SONGS.map((s, i) => musik.lade(WURZEL + s.datei, (a) => { anteile[i] = a; if (los.disabled) zeigeLaden(); })))
    .finally(() => { los.disabled = false; los.textContent = losText; });
  fetch(WURZEL + "data/bands.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((d) => { bandDaten = d; }).catch(() => {});
  $("pogo-los").addEventListener("click", starte);
  $("pogo-nochmal").addEventListener("click", starte);
  $("pogo-anderer").addEventListener("click", () => { $("pogo-ende").hidden = true; $("pogo-start").hidden = false; });
  $("pogo-stagedive").addEventListener("click", starteStagedive);
  $("pogo-teilen").addEventListener("click", teileErgebnis);
  // Lautlos gibt es nicht: der Knopf kostet Punkte, die Musik läuft weiter (leiser nur über die Lautstärketasten)
  $("pogo-ton").addEventListener("click", () => { if (!laeuft) return; punkte = nachTonAus(punkte); pop(T.tonAusStrafe, "var(--blood-hot)", true); });
  $("pogo-start").hidden = false;
  neueRunde();
  requestAnimationFrame(bild);
  ladeMotive().then((n) => { if (n && !laeuft) neueRunde(false); });
  // Ganove-Kopf laden (Atlas aus Marks Ansichten); klappt das nicht, behält der Sänger seinen normalen Kopf
  Promise.all([
    new Promise((ok, nein) => { const img = new Image(); img.onload = () => ok(img); img.onerror = nein; img.src = WURZEL + KOPF_ATLAS.bild; }),
    fetch(WURZEL + KOPF_ATLAS.daten).then((r) => (r.ok ? r.json() : Promise.reject(new Error(KOPF_ATLAS.daten)))),
  ]).then(([img, daten]) => { kopfVorlage = baueKopfVorlage(THREE, img, daten, { ruhig }); setzeGanoveKopf(S.band[1]); }).catch(() => {});
  // echte Bandlogos fürs Banner hinter der Band
  for (const b of new Set(SONGS.map((s) => s.band).filter(Boolean))) {
    const img = new Image();
    img.onload = () => { bandLogos.set(b, img); if (!laeuft && song.band === b) S.setzeBanner(img); };
    img.src = `${WURZEL}assets/img/bands/${b}.webp`;
  }
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
