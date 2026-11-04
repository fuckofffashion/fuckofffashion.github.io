// Sprüche für die leere Konzertliste. Ton: frech, DIY, ohne Beleidigungen gegen Menschen, ohne Markennamen.

export const SPRUECHE = [
  "Heute nix. Geh Sticker kleben.",
  "Kein Konzert im Umkreis? Dann mach eins. Keller, Garage, drei Leute mit Instrumenten.",
  "Nix los im Umkreis. Dann schreib halt selber ein Zine.",
  "Stille im Umkreis. Lautstärke ist Eigeninitiative.",
  "Kein Termin, viel Zeit. Perfekt für Aufnäher auf die alte Jacke.",
  "Der Kalender ist leer, dein Kopf nicht. Ab in den Proberaum.",
];

// Deterministisch: gleiche Zahl, gleicher Spruch. Läuft zyklisch durch die Liste.
// Negative und gebrochene Zahlen werden abgeschnitten und positiv umgebrochen; NaN und Unendlich ergeben den ersten Spruch.
export function spruch(n) {
  const l = SPRUECHE.length;
  const i = Number.isFinite(n) ? ((Math.trunc(n) % l) + l) % l : 0;
  return SPRUECHE[i];
}
