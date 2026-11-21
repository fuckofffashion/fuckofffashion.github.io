// Aufgaben pro Runde: zwei werden gezogen, jede erfüllte bringt Punkte.
// stats = { reiheImLetztenRefrain, gefangen: [], mitteSekunden, stagediveBier (null = kein Stagedive), taktSpruenge, surferTreffer, surferGesehen }

export const AUFGABE_PUNKTE = 250;

export const AUFGABEN = [
  { id: "reiheLetzterRefrain", erfuellt: (s) => s.reiheImLetztenRefrain },
  { id: "plektrum", erfuellt: (s) => s.gefangen.includes("plektrum") },
  { id: "mitte10", erfuellt: (s) => s.mitteSekunden >= 10 },
  { id: "stagediveVoll", erfuellt: (s) => s.stagediveBier != null && s.stagediveBier >= 50 },
  { id: "takt8", erfuellt: (s) => s.taktSpruenge >= 8 },
  { id: "surferUeberlebt", nurMitSurfer: true, erfuellt: (s) => s.surferGesehen > 0 && s.surferTreffer === 0 },
];

/** Zwei verschiedene Aufgaben, passend zum Laden (ohne Crowdsurfer keine Surfer-Aufgabe). */
export function ziehe(laden, zufall = Math.random) {
  const pool = AUFGABEN.filter((a) => !a.nurMitSurfer || laden.surfer);
  const erste = pool[Math.floor(zufall() * pool.length)];
  const rest = pool.filter((a) => a !== erste);
  return [erste, rest[Math.floor(zufall() * rest.length)]];
}
