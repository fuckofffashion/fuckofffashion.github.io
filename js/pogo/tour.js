// Tour: Läden der Reihe nach freispielen, Punk-Rang aus allen Ergebnissen. Gespeichert auf dem Gerät.
export const TOUR = ["pitcher", "druckluftInnen", "druckluftDraussen", "altenberg"];
export const SCHWELLEN = [1500, 2500, 3500];
export const KRAFT = [1, 1.1, 1.2, 1.3];
export const RAENGE = [{ ab: 0, id: "randSteher" }, { ab: 2000, id: "pogoLehrling" }, { ab: 8000, id: "pitSau" }, { ab: 20000, id: "pitLegende" }];
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
/** Punkte, die im vorigen Laden noch fehlen (0 = frei). */
export function fehlt(tour, ladenId) {
  const i = TOUR.indexOf(ladenId);
  if (i <= 0) return 0;
  if (fehlt(tour, TOUR[i - 1]) > 0) return SCHWELLEN[i - 1];
  return Math.max(0, SCHWELLEN[i - 1] - (tour.best[TOUR[i - 1]] || 0));
}
export const frei = (tour) => new Set(TOUR.filter((id) => fehlt(tour, id) === 0));
export const rang = (summe) => [...RAENGE].reverse().find((r) => summe >= r.ab).id;
export const kraftFaktor = (ladenId) => KRAFT[TOUR.indexOf(ladenId)] ?? 1;
