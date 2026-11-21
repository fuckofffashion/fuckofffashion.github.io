// Andenken-Sammlung („Kutte“): gefangene Sachen bleiben auf dem Gerät (localStorage). Kein Server.
// Jeder Zugriff ist abgesichert: ohne Speicher (privates Fenster, gesperrt, voll) läuft das Spiel normal.

const SCHLUESSEL = "fof-pogo-kutte-v1";
const ARTEN = ["plektrum", "drumstick", "setliste"];

/** Gespeicherte Kutte lesen; kaputt, fremd oder gesperrt → leere Kutte. */
export function leseKutte(speicher) {
  try {
    const roh = JSON.parse(speicher?.getItem(SCHLUESSEL) ?? "{}");
    const k = {};
    for (const a of ARTEN) if (Number.isInteger(roh?.[a]) && roh[a] > 0) k[a] = roh[a];
    return k;
  } catch { return {}; }
}

export function schreibeKutte(speicher, kutte) {
  try { speicher.setItem(SCHLUESSEL, JSON.stringify(kutte)); return true; } catch { return false; }
}

/** Neue Kutte mit den Fängen einer Runde. */
export function mitFang(kutte, arten) {
  const k = { ...kutte };
  for (const a of arten) if (ARTEN.includes(a)) k[a] = (k[a] || 0) + 1;
  return k;
}

const WOERTER = {
  de: { plektrum: ["Plektrum", "Plektren"], drumstick: ["Drumstick", "Drumsticks"], setliste: ["Setliste", "Setlisten"], leer: "noch leer" },
  en: { plektrum: ["pick", "picks"], drumstick: ["drumstick", "drumsticks"], setliste: ["setlist", "setlists"], leer: "still empty" },
};
export function kutteText(kutte, sp = "de") {
  const w = WOERTER[sp] || WOERTER.de;
  const teile = ARTEN.filter((a) => kutte[a]).map((a) => `${kutte[a]} ${w[a][kutte[a] === 1 ? 0 : 1]}`);
  return teile.length ? teile.join(", ") : w.leer;
}
