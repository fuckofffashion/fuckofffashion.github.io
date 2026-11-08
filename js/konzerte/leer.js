// Sprüche für die leere Konzertliste. Ton: frech, DIY, ohne Beleidigungen gegen Menschen, ohne Markennamen.
import { sprache } from "./texte.js?v=26";

export const SPRUECHE = [
  "Heute nix. Geh Sticker kleben.",
  "Kein Konzert im Umkreis? Dann mach eins. Keller, Garage, drei Leute mit Instrumenten.",
  "Nix los im Umkreis. Dann schreib halt selber ein Zine.",
  "Stille im Umkreis. Lautstärke ist Eigeninitiative.",
  "Kein Termin, viel Zeit. Perfekt für Aufnäher auf die alte Jacke.",
  "Der Kalender ist leer, dein Kopf nicht. Ab in den Proberaum.",
];

// Dieselben Sprüche auf Englisch, gleiche Reihenfolge (Nummer 1 bekommt den KNOX-Link)
export const SPRUECHE_EN = [
  "Nothing on. Go slap some stickers up.",
  "No gig nearby? Put one on. Basement, garage, three people with instruments.",
  "Dead round here. So write your own zine.",
  "Silence all round. Noise is DIY.",
  "No gigs, loads of time. Perfect for sewing patches on the old jacket.",
  "The calendar's empty, your head isn't. Get to the practice room.",
];

// Deterministisch: gleiche Zahl, gleicher Spruch. Läuft zyklisch durch die Liste.
// Negative und gebrochene Zahlen werden abgeschnitten und positiv umgebrochen; NaN und Unendlich ergeben den ersten Spruch.
export function spruch(n, sp = sprache()) {
  const liste = sp === "en" ? SPRUECHE_EN : SPRUECHE;
  const l = liste.length;
  const i = Number.isFinite(n) ? ((Math.trunc(n) % l) + l) % l : 0;
  return liste[i];
}
