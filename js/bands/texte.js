// Texte der Bandseite in zwei Sprachen. Die englische Seite liegt in en/ und setzt <html lang="en">.

export function sprache() {
  return globalThis.document?.documentElement?.lang === "en" ? "en" : "de";
}

const TAGE = { de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MONATE_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** „Fr 04.12.“ bzw. „Fri 4 Dec“ aus YYYY-MM-DD (Wochentag über UTC, damit die Zeitzone nicht verschiebt). */
export function tagDatum(iso, sp = sprache()) {
  const [j, m, t] = iso.split("-").map(Number);
  const wt = TAGE[sp][new Date(Date.UTC(j, m - 1, t)).getUTCDay()];
  return sp === "en" ? `${wt} ${t} ${MONATE_EN[m - 1]}` : `${wt} ${String(t).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
}

export const TEXTE = {
  de: {
    saeule: { bald: "Bald", demnaechst: "Demnächst", spaeter: "Später", still: "Gerade still", alle: "Bands" },
    stillZeit: "keine Termine",
    naechstes: "Nächstes Mal",
    still: "Gerade still",
    keine: "Gerade keine Termine. Kommt wieder.",
    termine: "Nächste Termine",
    alle: ({ n }) => `alle ${n} Termine`,
    abreissen: ({ name }) => `${name}: Plakat abreißen und Termine zeigen`,
    ankleben: ({ name }) => `${name}: Plakat wieder ankleben`,
    datenFehlen: "Termine gerade nicht da. Die Konzertseite hilft weiter.",
  },
  en: {
    saeule: { bald: "Soon", demnaechst: "Coming up", spaeter: "Later", still: "Quiet for now", alle: "Bands" },
    stillZeit: "no gigs",
    naechstes: "Next up",
    still: "Quiet for now",
    keine: "No gigs right now. They'll be back.",
    termine: "Next gigs",
    alle: ({ n }) => `all ${n} gigs`,
    abreissen: ({ name }) => `${name}: tear off the poster and show gigs`,
    ankleben: ({ name }) => `${name}: stick the poster back up`,
    datenFehlen: "Gig dates aren't available right now. The concert page can help.",
  },
};

export function t(schluessel, werte = {}, sp = sprache()) {
  const wert = TEXTE[sp][schluessel];
  return typeof wert === "function" ? wert(werte) : wert;
}
