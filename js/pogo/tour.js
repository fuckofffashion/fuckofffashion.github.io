// Tour: alle Läden offen; jeder Laden hat ein Punkteziel als Abzeichen. Punk-Rang aus allen Ergebnissen. Gespeichert auf dem Gerät.
export const TOUR = ["pitcher", "druckluftInnen", "druckluftDraussen", "altenberg"];
export const ZIELE = [7000, 4500, 3500, 4500]; // etwa 70 % eines guten Spiels (Mensch-Bot, 45 ms Streuung), je Laden gemessen
export const KRAFT = [1, 1.1, 1.2, 1.3];
export const RAENGE = [{ ab: 0, id: "randSteher" }, { ab: 10000, id: "pogoLehrling" }, { ab: 40000, id: "pitSau" }, { ab: 100000, id: "pitLegende" }];
const SCHLUESSEL = "fof-pogo-tour-v1";

export function leseTour(speicher) {
  try {
    const roh = JSON.parse(speicher?.getItem(SCHLUESSEL) ?? "{}");
    const best = {};
    for (const id of TOUR) if (Number.isFinite(roh?.best?.[id]) && roh.best[id] >= 0) best[id] = roh.best[id];
    const summe = Number.isFinite(roh?.summe) && roh.summe >= 0 ? roh.summe : 0;
    return { best, summe };
  } catch { return { best: {}, summe: 0 }; }
}
export function schreibeTour(speicher, tour) {
  try { speicher.setItem(SCHLUESSEL, JSON.stringify(tour)); return true; } catch { return false; }
}
export function mitErgebnis(tour, ladenId, ergebnis) {
  return { best: { ...tour.best, [ladenId]: Math.max(tour.best[ladenId] || 0, ergebnis) }, summe: tour.summe + ergebnis };
}
/** Punkte, die in diesem Laden bis zum Ziel noch fehlen (0 = geschafft). */
export function fehlt(tour, ladenId) {
  const i = TOUR.indexOf(ladenId);
  return i < 0 ? 0 : Math.max(0, ZIELE[i] - (tour.best[ladenId] || 0));
}
export const geschafft = (tour, ladenId) => TOUR.includes(ladenId) && fehlt(tour, ladenId) === 0;
export const rang = (summe) => [...RAENGE].reverse().find((r) => summe >= r.ab).id;
export const kraftFaktor = (ladenId) => KRAFT[TOUR.indexOf(ladenId)] ?? 1;
