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
    const motive = Array.isArray(roh?.motive) ? [...new Set(roh.motive.filter((m) => typeof m === "string" && /^\d{3}$/.test(m)))] : [];
    if (motive.length) k.motive = motive;
    return k;
  } catch { return {}; }
}

export function schreibeKutte(speicher, kutte) {
  try { speicher.setItem(SCHLUESSEL, JSON.stringify(kutte)); return true; } catch { return false; }
}

/** Neue Kutte mit einem abgeguckten Motiv (Nummer wie "007"), jedes nur einmal. */
export function mitMotiv(kutte, nr) {
  const motive = kutte.motive || [];
  return motive.includes(nr) ? kutte : { ...kutte, motive: [...motive, nr] };
}

/** Neue Kutte mit den Fängen einer Runde. */
export function mitFang(kutte, arten) {
  const k = { ...kutte };
  for (const a of arten) if (ARTEN.includes(a)) k[a] = (k[a] || 0) + 1;
  return k;
}

const WOERTER = {
  de: { plektrum: ["Plektrum", "Plektren"], drumstick: ["Drumstick", "Drumsticks"], setliste: ["Setliste", "Setlisten"], motiv: ["Motiv", "Motive"], leer: "noch leer" },
  en: { plektrum: ["pick", "picks"], drumstick: ["drumstick", "drumsticks"], setliste: ["setlist", "setlists"], motiv: ["design", "designs"], leer: "still empty" },
};
export function kutteText(kutte, sp = "de") {
  const w = WOERTER[sp] || WOERTER.de;
  const teile = ARTEN.filter((a) => kutte[a]).map((a) => `${kutte[a]} ${w[a][kutte[a] === 1 ? 0 : 1]}`);
  const n = kutte.motive?.length || 0;
  if (n) teile.push(`${n} ${w.motiv[n === 1 ? 0 : 1]}`);
  return teile.length ? teile.join(", ") : w.leer;
}
