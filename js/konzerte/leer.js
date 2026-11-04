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
export function spruch(n) {
  return SPRUECHE[n % SPRUECHE.length];
}
