// Gemalte Texturen der 3D-Säule (Canvas 2D). Vorlage: docs/superpowers/specs/2026-11-21-saeule-3d-entwurf.html.
// Beim Import kein Zugriff auf document: die reinen Helfer oben laufen auch in Node (tests/js/bands.test.mjs).
import { TEXTE, tagDatum } from "./texte.js?v=48";

/* ---------- reine Helfer ---------- */

/** Zufall mit Samen: die Säule sieht bei jedem Laden gleich aus. */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 17);

const ZETTEL_MAX = 4;
/** Zeilen für den gemalten Terminzettel: höchstens 4, der Rest als Anzahl. */
export function zettelZeilen(termine, sp) {
  const zeilen = termine.slice(0, ZETTEL_MAX).map((t) => ({
    datum: tagDatum(t.datum, sp).toUpperCase(),
    ort: `${t.stadt} · ${t.laden}${t.zeit ? " · " + t.zeit : ""}`,
  }));
  return { zeilen, mehr: Math.max(0, termine.length - ZETTEL_MAX) };
}

/** Text auf dem leeren Zettel: „gerade still“ nur, wenn die Daten da sind. */
export function zettelLeer(hatDaten, sp) {
  return hatDaten ? TEXTE[sp].zettelStill : TEXTE[sp].zettelOhneDaten;
}

export const FARBE = {
  papier: { bg: "#e8dfcc", faser: "#f8f3ea", label: "#b5171c", marker: "#141212" },
  schwarz: { bg: "#141212", faser: "#e6dccb", label: "#ff3b3b", marker: "#f1ede4" },
  blut: { bg: "#bf161b", faser: "#efe5d3", label: "#141212", marker: "#f1ede4" },
};

/* ---------- Malwerkzeug für Papier ---------- */

function leinwand(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

function rissPfad(ctx, x, y, w, h, rnd, rough, step) {
  const pts = [];
  const kante = (x0, y0, x1, y1, nx, ny) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      let j = (rnd() - 0.5) * rough * 2;
      if (rnd() < 0.06) j += rnd() * rough * 3.2;
      pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
    }
  };
  kante(x, y, x + w, y, 0, 1); kante(x + w, y, x + w, y + h, -1, 0);
  kante(x + w, y + h, x, y + h, 0, -1); kante(x, y + h, x, y, 1, 0);
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
}

/* Blatt mit heller Faserkante; gibt den Samen zurück, damit Rückseite und Ausschnitt dieselbe Form haben */
function blatt(ctx, x, y, w, h, farbe, rnd, { rough = 8, step = 11, faser = "#efe8da" } = {}) {
  const seed = Math.floor(rnd() * 1e9);
  rissPfad(ctx, x, y, w, h, mulberry32(seed), rough, step); ctx.fillStyle = faser; ctx.fill();
  rissPfad(ctx, x + 5, y + 5, w - 10, h - 10, mulberry32(seed + 1), rough, step); ctx.fillStyle = farbe; ctx.fill();
  return seed;
}
function blattClip(ctx, x, y, w, h, seed, rough = 8, step = 11) {
  rissPfad(ctx, x + 5, y + 5, w - 10, h - 10, mulberry32(seed + 1), rough, step); ctx.clip();
}

function koernung(ctx, w, h, menge, rnd) {
  const d = ctx.getImageData(0, 0, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const n = (rnd() - 0.5) * menge;
    a[i] += n; a[i + 1] += n; a[i + 2] += n;
  }
  ctx.putImageData(d, 0, 0);
}
function knicke(ctx, w, h, rnd, n = 4) {
  ctx.save(); ctx.globalCompositeOperation = "source-atop";
  for (let k = 0; k < n; k++) {
    const vertikal = rnd() < 0.5;
    const p = (0.25 + rnd() * 0.5) * (vertikal ? w : h);
    const zug = (dx, farbe) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 2; ctx.beginPath();
      if (vertikal) { ctx.moveTo(p + dx, 0); ctx.lineTo(p + dx + (rnd() - 0.5) * 30, h); }
      else { ctx.moveTo(0, p + dx); ctx.lineTo(w, p + dx + (rnd() - 0.5) * 30); }
      ctx.stroke();
    };
    zug(0, "rgba(255,255,255,.10)"); zug(2, "rgba(0,0,0,.18)");
  }
  ctx.restore();
}
function kratzer(ctx, w, h, rnd, farbe, n) {
  ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = farbe;
  for (let k = 0; k < n; k++) { ctx.globalAlpha = 0.15 + rnd() * 0.5; ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 6, 1 + rnd() * 3); }
  ctx.restore();
}
function gesperrt(ctx, text, cx, y, abstand) {
  const breiten = [...text].map((z) => ctx.measureText(z).width);
  let x = cx - (breiten.reduce((a, b) => a + b, 0) + abstand * (text.length - 1)) / 2;
  ctx.textAlign = "left";
  [...text].forEach((z, i) => { ctx.fillText(z, x, y); x += breiten[i] + abstand; });
}
/** Schrift setzen und bei Bedarf verkleinern, bis der Text in maxBreite passt. Gewicht steht vor der Größe. */
function passend(ctx, text, maxBreite, groesse, schrift, gewicht = 400) {
  ctx.font = `${gewicht} ${groesse}px ${schrift}`;
  const b = ctx.measureText(text).width;
  if (b > maxBreite) ctx.font = `${gewicht} ${Math.floor(groesse * maxBreite / b)}px ${schrift}`;
}

/* ---------- Drucksachen ---------- */

export function malCollage() {
  const W = 2048, H = 1280, c = leinwand(W, H), x = c.getContext("2d"), rnd = mulberry32(7);
  x.fillStyle = "#2a2420"; x.fillRect(0, 0, W, H);
  const farben = ["#e6dccb", "#cfc3ab", "#b5171c", "#151212", "#6e1813", "#8d867b", "#e6dccb", "#151212", "#151212"];
  const worte = ["KAUF NIX", "OI!", "PUNK LEBT", "DIY", "LIVE", "AUSVERKAUFT", "SKA", "SA 12.04.", "EINTRITT FREI", "NO FUTURE?", "KONZERT", "HEUTE", "SOLI", "DIY OR DIE"];
  for (let n = 0; n < 190; n++) {
    const seed = Math.floor(rnd() * 1e9);
    const px = rnd() * W, py = rnd() * H, w = 90 + rnd() * 380, h = 70 + rnd() * 300;
    for (const off of [0, -W, W]) {
      if (px + off + w < -40 || px + off - w > W + 40) continue;
      const r = mulberry32(seed);
      const farbe = farben[Math.floor(r() * farben.length)];
      x.save(); x.translate(px + off, py); x.rotate((r() - 0.5) * 0.28);
      const s = blatt(x, -w / 2, -h / 2, w, h, farbe, r, { rough: 9, step: 12, faser: "#d9cfbc" });
      x.save(); blattClip(x, -w / 2, -h / 2, w, h, s, 9, 12);
      const art = r();
      const hell = farbe === "#e6dccb" || farbe === "#cfc3ab" || farbe === "#8d867b";
      if (art < 0.42) {
        x.fillStyle = hell ? (r() < 0.5 ? "#151212" : "#b5171c") : "#e6dccb";
        x.font = `${Math.floor(h * (0.45 + r() * 0.4))}px Anton`; x.textAlign = "left"; x.textBaseline = "middle";
        x.fillText(worte[Math.floor(r() * worte.length)], -w / 2 - r() * w * 0.4, (r() - 0.5) * h * 0.4);
      } else if (art < 0.6) {
        x.fillStyle = hell ? "rgba(20,18,18,.55)" : "rgba(230,220,203,.35)";
        for (let yy = -h / 2; yy < h / 2; yy += 14) for (let xx = -w / 2; xx < w / 2; xx += 14) {
          x.beginPath(); x.arc(xx, yy, 2 + 3 * Math.abs(Math.sin(xx * 0.02 + yy * 0.01)), 0, 7); x.fill();
        }
      } else if (art < 0.7) {
        x.fillStyle = hell ? "#151212" : "#e6dccb"; x.font = `700 ${Math.floor(18 + r() * 14)}px "Courier Prime"`; x.textAlign = "left";
        for (let yy = -h / 2 + 30; yy < h / 2; yy += 30) x.fillText("KONZERT · EINLASS 20 UHR · NUR ABENDKASSE", -w / 2 + 12, yy);
      }
      x.restore(); x.restore();
    }
  }
  for (let k = 0; k < 26; k++) { // Rost, wo alles abgerissen ist
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 40 + rnd() * 70);
    g.addColorStop(0, "rgba(110,50,28,.9)"); g.addColorStop(1, "rgba(110,50,28,0)");
    x.save(); x.translate(rnd() * W, rnd() * H); x.scale(1, 0.6 + rnd()); x.fillStyle = g; x.fillRect(-120, -120, 240, 240); x.restore();
  }
  for (let k = 0; k < 420; k++) { // Regenspuren
    x.strokeStyle = `rgba(0,0,0,${0.03 + rnd() * 0.08})`; x.lineWidth = 1 + rnd() * 3;
    const sx = rnd() * W, sy = rnd() * H * 0.6; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (rnd() - 0.5) * 6, sy + 80 + rnd() * 420); x.stroke();
  }
  let g = x.createLinearGradient(0, H * 0.72, 0, H);
  g.addColorStop(0, "rgba(22,14,10,0)"); g.addColorStop(1, "rgba(22,14,10,.7)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createLinearGradient(0, 0, 0, 90);
  g.addColorStop(0, "rgba(10,6,4,.75)"); g.addColorStop(1, "rgba(10,6,4,0)"); x.fillStyle = g; x.fillRect(0, 0, W, 90);
  koernung(x, W, H, 26, rnd);
  return c;
}

export function malFOF() {
  const W = 1600, H = 1735, c = leinwand(W, H), x = c.getContext("2d"), r = mulberry32(11);
  const seed = blatt(x, 30, 30, W - 60, H - 60, "#121010", r, { rough: 20, step: 18, faser: "#e9e0cc" });
  x.save(); blattClip(x, 30, 30, W - 60, H - 60, seed, 20, 18);
  x.fillStyle = "#efe6d2"; x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.font = "400 400px Anton"; const F = 400 * 1300 / x.measureText("FASHION").width; x.font = `400 ${F}px Anton`;
  const hoehe = x.measureText("FASHION").actualBoundingBoxAscent, luft = F * 0.07;
  let y = 190 + hoehe;
  for (const wort of ["FUCK", "OFF", "FASHION"]) { x.fillText(wort, W / 2, y); y += hoehe + luft; }
  x.fillStyle = "#121010"; // abgeriebener Druck
  for (let k = 0; k < 3200; k++) { x.globalAlpha = 0.25 + r() * 0.7; x.fillRect(r() * W, 160 + r() * (y - 160), 1 + r() * 5, 1 + r() * 4); }
  x.globalAlpha = 1;
  const sy = y - hoehe + 40; // roter Pinselstrich
  x.strokeStyle = "#d4161b"; x.lineCap = "round";
  for (let k = 0; k < 6; k++) {
    x.globalAlpha = 0.55 + r() * 0.4; x.lineWidth = 12 + r() * 14; x.beginPath();
    x.moveTo(300 + r() * 30, sy + 26 + r() * 14); x.quadraticCurveTo(W / 2, sy + 4 + r() * 16, W - 330 + r() * 30, sy + r() * 14); x.stroke();
  }
  x.globalAlpha = 1;
  x.fillStyle = "#efe6d2"; x.font = '700 92px "Courier Prime"'; gesperrt(x, "DIY OR DIE", W / 2, sy + 190, 22);
  x.restore();
  knicke(x, W, H, r, 5);
  kratzer(x, W, H, r, "#e6dccb", 900);
  koernung(x, W, H, 22, r);
  return c;
}

/** BALD-Aufkleber: rotes Gaffa-Band quer über die rechte obere Ecke. */
function baldBand(x, S, text, seed) {
  x.save(); x.translate(S - 240, 215); x.rotate(-0.21);
  rissPfad(x, -200, -50, 400, 100, mulberry32(seed), 6, 10);
  x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 14; x.shadowOffsetY = 6;
  x.fillStyle = "#d4161b"; x.fill();
  x.shadowColor = "transparent";
  x.fillStyle = "#f1ede4"; x.textAlign = "center"; x.textBaseline = "middle";
  passend(x, text, 330, 74, "Anton"); x.fillText(text, 0, 4);
  x.restore();
}

export function malPlakat(band, bild, { kopfzeile, naechstText, baldText = null }) {
  const S = 1000, M = 34, f = FARBE[band.plakat] || FARBE.schwarz, r = mulberry32(hash(band.id));
  const vorne = leinwand(S, S), x = vorne.getContext("2d");
  const seed = blatt(x, M, M, S - 2 * M, S - 2 * M, f.bg, r, { rough: 10, step: 12, faser: f.faser });
  x.save(); blattClip(x, M, M, S - 2 * M, S - 2 * M, seed, 10, 12);
  x.fillStyle = f.label; x.textBaseline = "alphabetic";
  passend(x, kopfzeile, 860, 32, '"Courier Prime"', 700); gesperrt(x, kopfzeile, S / 2, 128, 3);
  if (bild) {
    const k = Math.min(780 / bild.width, 560 / bild.height);
    x.drawImage(bild, S / 2 - bild.width * k / 2, 470 - bild.height * k / 2, bild.width * k, bild.height * k);
  } else { // Logo fehlt: Bandname groß
    x.fillStyle = f.marker; x.textAlign = "center"; x.textBaseline = "middle";
    passend(x, band.name.toUpperCase(), 780, 220, "Anton"); x.fillText(band.name.toUpperCase(), S / 2, 470);
    x.textBaseline = "alphabetic";
  }
  x.save(); x.translate(S / 2, 862); x.rotate(-0.035); x.fillStyle = f.marker; x.textAlign = "center";
  passend(x, naechstText, 800, 64, '"Permanent Marker"'); x.fillText(naechstText, 0, 0);
  x.strokeStyle = f.marker; x.lineWidth = 5; x.lineCap = "round"; x.beginPath(); x.moveTo(-230, 26); x.quadraticCurveTo(0, 18, 250, 30); x.stroke();
  x.restore(); x.restore();
  for (const [tx, rot] of [[170, -0.6], [S - 170, 0.6]]) { // Klebeband
    x.save(); x.translate(tx, 78); x.rotate(rot);
    rissPfad(x, -110, -28, 220, 56, mulberry32(seed + tx), 5, 9); x.fillStyle = "rgba(226,214,182,.62)"; x.fill(); x.restore();
  }
  knicke(x, S, S, r, 3);
  kratzer(x, S, S, r, band.plakat === "papier" ? "#2a2420" : "#e6dccb", 700);
  if (baldText) baldBand(x, S, baldText, seed + 9);
  koernung(x, S, S, 20, r);

  const hinten = leinwand(S, S), y = hinten.getContext("2d");
  rissPfad(y, M, M, S - 2 * M, S - 2 * M, mulberry32(seed), 10, 12); y.fillStyle = "#d6ccb7"; y.fill();
  y.save(); y.globalCompositeOperation = "source-atop";
  for (let n = 0; n < 40; n++) { y.fillStyle = `rgba(120,96,56,${0.05 + r() * 0.12})`; y.beginPath(); y.ellipse(r() * S, r() * S, 20 + r() * 90, 10 + r() * 60, r() * 3, 0, 7); y.fill(); }
  y.restore();
  koernung(y, S, S, 18, r);
  return { vorne, hinten };
}

export function malZettel(band, termine, sp, hatDaten = true) {
  const S = 900, x0 = 30, c = leinwand(S, S), x = c.getContext("2d"), r = mulberry32(hash(band.id) + 5);
  const T = TEXTE[sp];
  const seed = blatt(x, x0, x0, S - 2 * x0, S - 2 * x0, "#ece5d6", r, { rough: 7, step: 10, faser: "#faf6ee" });
  x.save(); blattClip(x, x0, x0, S - 2 * x0, S - 2 * x0, seed, 7, 10);
  x.strokeStyle = "rgba(60,90,160,.2)"; x.lineWidth = 2;
  for (let yy = 170; yy < S; yy += 60) { x.beginPath(); x.moveTo(0, yy); x.lineTo(S, yy); x.stroke(); }
  x.strokeStyle = "rgba(212,22,27,.4)"; x.beginPath(); x.moveTo(112, 0); x.lineTo(112, S); x.stroke();
  x.textAlign = "left"; x.textBaseline = "alphabetic";
  x.fillStyle = "#b5171c"; x.font = '700 38px "Courier Prime"'; x.fillText(T.zettelKopf, 140, 118);
  x.fillStyle = "#141212"; passend(x, band.name.toUpperCase(), 680, 76, "Anton"); x.fillText(band.name.toUpperCase(), 140, 222);
  const { zeilen, mehr } = zettelZeilen(termine, sp);
  if (!zeilen.length) {
    x.save(); x.translate(150, 420); x.rotate(-0.04); x.font = '64px "Permanent Marker"';
    zettelLeer(hatDaten, sp).forEach((z, i) => x.fillText(z, 0, i * 100)); x.restore();
  } else {
    zeilen.forEach((z, i) => {
      const yy = 330 + i * 120;
      x.fillStyle = "#141212"; x.font = "62px Anton"; x.fillText(z.datum, 140, yy);
      passend(x, z.ort, 640, 34, '"Courier Prime"', 700); x.fillText(z.ort, 140, yy + 44);
    });
    if (mehr) { x.fillStyle = "#b5171c"; x.font = '44px "Permanent Marker"'; x.fillText(T.mehr({ n: mehr }), 150, 830); }
  }
  x.restore();
  koernung(x, S, S, 16, r);
  return c;
}

export function malSprayA() {
  const S = 640, c = leinwand(S, S), x = c.getContext("2d"), r = mulberry32(3);
  x.lineCap = "round"; x.lineJoin = "round";
  const sprueh = (pfad, lw) => {
    for (const [a, extra, blur] of [[0.28, 22, 18], [0.5, 8, 8], [0.95, 0, 2]]) {
      x.globalAlpha = a; x.lineWidth = lw + extra; x.strokeStyle = "#d4161b"; x.shadowColor = "rgba(212,22,27,.7)"; x.shadowBlur = blur;
      x.beginPath(); pfad(); x.stroke();
    }
    x.shadowBlur = 0; x.globalAlpha = 1;
  };
  sprueh(() => x.arc(320, 320, 212, 0, Math.PI * 2), 30);
  sprueh(() => { x.moveTo(140, 575); x.lineTo(322, 48); x.lineTo(505, 575); }, 34);
  sprueh(() => { x.moveTo(170, 392); x.lineTo(478, 372); }, 30);
  x.fillStyle = "#d4161b";
  for (const [dx, dy] of [[140, 580], [505, 580], [260, 530], [400, 532], [470, 392], [200, 396]]) { // Tropfen
    const len = 30 + r() * 110; x.lineWidth = 6 + r() * 5; x.strokeStyle = "#c3141a";
    x.beginPath(); x.moveTo(dx, dy); x.lineTo(dx + (r() - 0.5) * 4, Math.min(S - 14, dy + len)); x.stroke();
    x.beginPath(); x.arc(dx, Math.min(S - 14, dy + len), 6 + r() * 3, 0, 7); x.fill();
  }
  for (let k = 0; k < 900; k++) {
    const a = r() * Math.PI * 2, d = 160 + r() * 110;
    x.globalAlpha = r() * 0.6; x.beginPath(); x.arc(320 + Math.cos(a) * d, 320 + Math.sin(a) * d, r() * 2.4, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  return c;
}

export function malSticker(zeilen, w, h, rot, seedZahl, farbe = "#e9e0cc", schrift = "#141212") {
  const c = leinwand(w, h), x = c.getContext("2d"), r = mulberry32(seedZahl);
  x.translate(w / 2, h / 2); x.rotate(rot);
  const bw = w * 0.78, bh = h * 0.74;
  const s = blatt(x, -bw / 2, -bh / 2, bw, bh, farbe, r, { rough: 7, step: 10, faser: "#f7f2e8" });
  x.save(); blattClip(x, -bw / 2, -bh / 2, bw, bh, s, 7, 10);
  x.fillStyle = schrift; x.textAlign = "center"; x.textBaseline = "middle";
  const fs = Math.floor(bh / (zeilen.length + 0.6));
  const breiteste = zeilen.reduce((a, z) => (z.length > a.length ? z : a), "");
  passend(x, breiteste, bw * 0.86, fs, '"Permanent Marker"');
  zeilen.forEach((z, i) => x.fillText(z, 0, (i - (zeilen.length - 1) / 2) * fs * 0.95));
  x.restore();
  x.setTransform(1, 0, 0, 1, 0, 0);
  koernung(x, w, h, 18, r);
  return c;
}

export function malRost(seedZahl, grund) {
  const W = 1024, H = 512, c = leinwand(W, H), x = c.getContext("2d"), r = mulberry32(seedZahl);
  x.fillStyle = grund; x.fillRect(0, 0, W, H);
  const fleck = (farbe, n, min, max) => {
    for (let k = 0; k < n; k++) {
      const rad = min + r() * (max - min), px = r() * W, py = r() * H;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, farbe); g.addColorStop(1, farbe.replace(/[\d.]+\)$/, "0)"));
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
  };
  fleck("rgba(58,20,14,.8)", 160, 10, 70);
  fleck("rgba(160,72,38,.6)", 120, 6, 40);
  fleck("rgba(30,12,8,.7)", 60, 4, 18);
  x.fillStyle = "rgba(200,185,160,.75)";
  for (let k = 0; k < 500; k++) { x.globalAlpha = 0.3 + r() * 0.6; x.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3); }
  x.globalAlpha = 1;
  for (let k = 0; k < 140; k++) {
    x.strokeStyle = `rgba(40,14,8,${0.08 + r() * 0.15})`; x.lineWidth = 1 + r() * 3;
    const px = r() * W; x.beginPath(); x.moveTo(px, r() * H * 0.4); x.lineTo(px + (r() - 0.5) * 8, H); x.stroke();
  }
  koernung(x, W, H, 30, r);
  return c;
}

/** Bodenschatten: weicher dunkler Fleck. */
export function malFleck() {
  const c = leinwand(256, 256), x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return c;
}
