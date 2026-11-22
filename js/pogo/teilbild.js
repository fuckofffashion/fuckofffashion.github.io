// Pogo-Ergebnis als Bild zum Teilen (1080 × 1350). Mit Band: unten ein angeklebtes Konzertplakat
// mit Bandlogo, Lied und nächstem Termin (Variante B, von Mark gewählt 2026-11-22). Ohne Band: das bisherige Bild.
import { naechster } from "../bands/saeulen.js?v=48";
import { tagDatum } from "../bands/texte.js?v=48";

/** Band, Lied, Logo und nächstes Konzert des Songs, oder null beim reinen Beat. */
export function teilbildBand(song, bandDaten, heuteIso, sp) {
  if (!song?.band) return null;
  const n = naechster(bandDaten?.bands?.[song.band]?.termine, heuteIso);
  return {
    band: song.bandName, lied: song.titel, logo: `assets/img/bands/${song.band}.webp`,
    konzert: n ? { tag: tagDatum(n.datum, sp), zeit: n.zeit, laden: n.laden, stadt: n.stadt } : null,
  };
}

const ANTON = "Anton, Impact, sans-serif", COURIER = "'Courier Prime', monospace", MARKER = "'Permanent Marker', cursive";
const PAPIER = "#f1ede4", SCHWARZ = "#0b0a0a", ROT = "#d4161b", GOLD = "#f2b632";

function passe(x, img, mx, my, bw, bh) {
  const k = Math.min(bw / img.width, bh / img.height);
  x.drawImage(img, mx - (img.width * k) / 2, my - (img.height * k) / 2, img.width * k, img.height * k);
}

/** Zeichnet das Teilbild. e: { erg, laden, titel, rang, band }, bilder: { motiv, logo } (geladene Bilder oder null). */
export function zeichneTeilbild(x, e, bilder, T) {
  const { motiv = null, logo = null } = bilder;
  x.fillStyle = SCHWARZ; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = ROT; x.fillRect(0, 0, 1080, 18); x.fillRect(0, 1332, 1080, 18);
  x.textAlign = "center"; x.fillStyle = PAPIER;
  if (!e.band) {
    x.font = `64px ${ANTON}`; x.fillText("FUCK OFF FASHION", 540, 120);
    x.font = `220px ${ANTON}`; x.fillText("POGO.", 540, 360);
    x.font = `bold 46px ${COURIER}`; x.fillStyle = "#e3262b"; x.fillText(e.laden.toUpperCase(), 540, 450);
    x.fillStyle = GOLD; x.font = `260px ${ANTON}`; x.fillText(String(e.erg), 540, 740);
    x.fillStyle = PAPIER; x.font = `52px ${MARKER}`; x.fillText(e.titel, 540, 830, 980);
    x.font = `bold 40px ${COURIER}`; x.fillStyle = "#cfc8bb"; x.fillText(`${T.rang}: ${e.rang}`, 540, 900);
    if (motiv) passe(x, motiv, 540, 1080, 300, 260);
    x.fillStyle = PAPIER; x.font = `bold 38px ${COURIER}`; x.fillText("fuckofffashion.github.io/pogo.html", 540, 1275);
    return;
  }
  // Kopf etwas enger, damit unten das Plakat Platz hat; das Motiv klebt schräg rechts oben
  x.font = `60px ${ANTON}`; x.fillText("FUCK OFF FASHION", 540, 112);
  x.font = `190px ${ANTON}`; x.fillText("POGO.", 540, 305);
  x.font = `bold 42px ${COURIER}`; x.fillStyle = "#e3262b"; x.fillText(e.laden.toUpperCase(), 540, 380);
  x.fillStyle = GOLD; x.font = `230px ${ANTON}`; x.fillText(String(e.erg), 540, 620);
  x.fillStyle = PAPIER; x.font = `46px ${MARKER}`; x.fillText(e.titel, 540, 700, 980);
  x.font = `bold 36px ${COURIER}`; x.fillStyle = "#cfc8bb"; x.fillText(`${T.rang}: ${e.rang}`, 540, 758);
  if (motiv) { x.save(); x.translate(935, 300); x.rotate(0.12); passe(x, motiv, 0, 0, 190, 170); x.restore(); }

  // Plakat: Papier, Klebeband, Logo links, Konzert rechts
  const { band } = e, k = band.konzert;
  x.save(); x.translate(540, 1010); x.rotate(-0.018);
  x.fillStyle = PAPIER; x.fillRect(-470, -205, 940, 410);
  x.fillStyle = "rgba(0,0,0,.06)";
  for (let i = 0, s = 7; i < 40; i++) { s = (s * 9301 + 49297) % 233280; const a = s / 233280; s = (s * 9301 + 49297) % 233280; x.fillRect(-470 + a * 940, -205 + (s / 233280) * 410, 3, 3); }
  x.fillStyle = "rgba(242,182,50,.75)";
  x.save(); x.rotate(-0.25); x.fillRect(-520, -215, 150, 44); x.restore();
  x.save(); x.rotate(0.22); x.fillRect(360, -320, 150, 44); x.restore();
  x.fillStyle = SCHWARZ;
  if (logo) passe(x, logo, -300, 10, 300, 300);
  else { x.textAlign = "center"; x.font = `64px ${ANTON}`; x.fillText(band.band.toUpperCase(), -300, 30, 300); }
  x.textAlign = "left";
  x.font = `bold 28px ${COURIER}`; x.fillText(T.gepogtZu({ lied: band.lied }), -110, -140, 560);
  if (k) {
    x.fillStyle = ROT; x.font = `92px ${ANTON}`; x.fillText(T.live, -110, -40);
    x.fillStyle = SCHWARZ; x.font = `64px ${ANTON}`; x.fillText(k.zeit ? `${k.tag} · ${k.zeit}` : k.tag, -110, 45, 560);
    x.font = `bold 40px ${COURIER}`; x.fillText(k.laden, -110, 105, 560);
    x.font = `bold 34px ${COURIER}`; x.fillText(k.stadt.toUpperCase(), -110, 150, 560);
  } else {
    x.font = `bold 40px ${COURIER}`; x.fillText(T.keinKonzert, -110, 20, 560);
  }
  x.restore();
  x.textAlign = "center"; x.fillStyle = PAPIER; x.font = `bold 38px ${COURIER}`; x.fillText("fuckofffashion.github.io/pogo.html", 540, 1285);
}
