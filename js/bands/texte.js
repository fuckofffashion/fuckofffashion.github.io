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
    naechstes: "Nächstes Mal",
    still: "Gerade still",
    keine: "Gerade keine Termine. Kommt wieder.",
    termine: "Nächste Termine",
    alle: ({ n }) => `alle ${n} Termine`,
    abreissen: ({ name }) => `${name}: Plakat abreißen und Termine zeigen`,
    ankleben: ({ name }) => `${name}: Plakat wieder ankleben`,
    datenFehlen: "Termine gerade nicht da. Die Konzertseite hilft weiter.",
    kopfzeile: "LIVE GESEHEN · FÜR GUT BEFUNDEN",
    naechstStill: "gerade still",
    bald: "BALD",
    zettelKopf: "NÄCHSTE TERMINE",
    zettelStill: ["Gerade still.", "Kommt wieder."],
    mehr: ({ n }) => `+ ${n} weitere`,
    sticker: { kauf: ["KAUF", "NIX"], punk: ["PUNK", "LEBT"], diy: ["DIY"] },
    hinweis: "Ziehen zum Drehen · Plakat antippen zum Abreißen",
    wiederAnkleben: "Plakat wieder ankleben",
    buehne: "Litfaßsäule mit den Plakaten aller Bands",
  },
  en: {
    naechstes: "Next up",
    still: "Quiet for now",
    keine: "No gigs right now. They'll be back.",
    termine: "Next gigs",
    alle: ({ n }) => `all ${n} gigs`,
    abreissen: ({ name }) => `${name}: tear off the poster and show gigs`,
    ankleben: ({ name }) => `${name}: stick the poster back up`,
    datenFehlen: "Gig dates aren't available right now. The concert page can help.",
    kopfzeile: "SEEN LIVE · APPROVED",
    naechstStill: "quiet for now",
    bald: "SOON",
    zettelKopf: "NEXT GIGS",
    zettelStill: ["Quiet for now.", "They'll be back."],
    mehr: ({ n }) => `+ ${n} more`,
    sticker: { kauf: ["BUY", "NOTHING"], punk: ["PUNK'S", "ALIVE"], diy: ["DIY"] },
    hinweis: "Drag to turn · Tap a poster to tear it off",
    wiederAnkleben: "Stick the poster back up",
    buehne: "Advertising pillar with posters of all bands",
  },
};

export function t(schluessel, werte = {}, sp = sprache()) {
  const wert = TEXTE[sp][schluessel];
  return typeof wert === "function" ? wert(werte) : wert;
}
