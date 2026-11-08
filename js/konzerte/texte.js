// Texte der Konzertseite in zwei Sprachen. Die englische Seite liegt in en/ und setzt <html lang="en">.
// Ohne DOM (Node-Tests) gilt Deutsch. Fremde Texte (Bands, Orte) gehören nicht hierher.

export function sprache() {
  return globalThis.document?.documentElement?.lang === "en" ? "en" : "de";
}

// Locale für Zahlen und Datum
export const gebiet = (sp = sprache()) => (sp === "en" ? "en-GB" : "de-DE");
export const zahl = (n, sp = sprache()) => n.toLocaleString(gebiet(sp));

const OSM = "öffnet openstreetmap.org";
const OSM_EN = "opens openstreetmap.org";

export const TEXTE = {
  de: {
    // app.js
    keinStandort: "Kein Standort. Tipp eine PLZ oder einen Ort ein.",
    datenFehlen: "Termine gerade nicht da. Versuch's später.",
    suchtStandort: "Moment, wir gucken, wo du steckst …",
    standortName: "dein Standort",
    standortUm: "deinen Standort",
    nurFrei: "nur frei",
    ohneKommerz: "ohne Kommerz",
    genre: ({ g }) => `Genre: ${g}`,
    allgemein: "Punk / Hardcore (allgemein)",
    mehr: ({ z }) => `Mehr zeigen (noch ${z})`,
    nichtsZu: ({ q }) => `Nichts zu „${q}“.`,
    nichtsZuTipp: "Tippfehler? Oder die Band spielt gerade nicht. Andere Filter lockern hilft manchmal.",
    knoxEintragen: "Termin bei KNOX eintragen",
    zahl: ({ n, z }) => (n === 0 ? "Keine Termine" : `${z} ${n === 1 ? "Termin" : "Termine"}`),
    ueberall: " überall",
    imUmkreis: ({ stufe, um }) => ` in ${stufe} um ${um}`,
    ignoriert: "Die Suche ignoriert gerade deinen Umkreis.",
    nurUmkreis: "Nur im Umkreis",
    aussen: ({ z }) => `Noch ${z} Treffer außerhalb deines Umkreises.`,
    ueberallSuchen: "Überall suchen",
    ohneOrt: ({ n, z }) => (n === 1 ? "1 Termin ohne Ort, den findest du " : `${z} Termine ohne Ort, die findest du `),
    beiKnox: "bei KNOX",
    stand: ({ d }) => `Stand: ${d}`,
    // termin.js
    wochentage: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    datum: ({ t, m }) => `${t}.${m}.`,
    heute: "Heute",
    morgen: "Morgen",
    bandsUnbekannt: "Bands unbekannt",
    frei: "Eintritt frei / Spende",
    kommerz: "Riecht nach Konzern",
    vonFof: "eingetragen von Fuck Off Fashion",
    hinkommen: "Hinkommen",
    diesemTermin: "diesem Termin",
    hinRad: ({ name }) => `Hinkommen zu ${name}, ${OSM}`,
    fuss: "zu Fuß",
    auto: "Auto",
    hinFuss: ({ name }) => `Hinkommen zu Fuß zu ${name}, ${OSM}`,
    hinAuto: ({ name }) => `Hinkommen mit dem Auto zu ${name}, ${OSM}`,
    oeffnetOsm: OSM,
    // karte.js
    duBistHier: "Du bist hier. Leider.",
    klein: "✕ Klein",
    gross: "⤢ Groß",
    // ortsfeld.js
    nichtGefunden: "Kenn ich nicht. Probier die PLZ oder den nächsten größeren Ort.",
    tabelleFehlt: "Ortsliste gerade nicht da. Drück „Wo bin ich?“ oder versuch's später.",
  },
  en: {
    keinStandort: "No location. Type a postcode or a town.",
    datenFehlen: "Gigs aren't loading right now. Try again later.",
    suchtStandort: "Hang on, working out where you are …",
    standortName: "your location",
    standortUm: "you",
    nurFrei: "free only",
    ohneKommerz: "no corporate stuff",
    genre: ({ g }) => `Genre: ${g}`,
    allgemein: "Punk / Hardcore (general)",
    mehr: ({ z }) => `Show more (${z} left)`,
    nichtsZu: ({ q }) => `Nothing for “${q}”.`,
    nichtsZuTipp: "Typo? Or the band just isn't playing. Loosening the other filters sometimes helps.",
    knoxEintragen: "Add a gig on KNOX",
    zahl: ({ n, z }) => (n === 0 ? "No gigs" : `${z} ${n === 1 ? "gig" : "gigs"}`),
    ueberall: " everywhere",
    imUmkreis: ({ stufe, um }) => ` within ${stufe.toLowerCase()} of ${um}`,
    ignoriert: "Search is ignoring your radius right now.",
    nurUmkreis: "Only within radius",
    aussen: ({ n, z }) => `${z} more ${n === 1 ? "hit" : "hits"} outside your radius.`,
    ueberallSuchen: "Search everywhere",
    ohneOrt: ({ n, z }) => (n === 1 ? "1 gig with no location, find it " : `${z} gigs with no location, find them `),
    beiKnox: "on KNOX",
    stand: ({ d }) => `Updated: ${d}`,
    wochentage: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datum: ({ t, m }) => `${t}/${m}`,
    heute: "Today",
    morgen: "Tomorrow",
    bandsUnbekannt: "Bands unknown",
    frei: "Free / donation",
    kommerz: "Smells corporate",
    vonFof: "added by Fuck Off Fashion",
    hinkommen: "Get there",
    diesemTermin: "this gig",
    hinRad: ({ name }) => `Get to ${name} by bike, ${OSM_EN}`,
    fuss: "on foot",
    auto: "car",
    hinFuss: ({ name }) => `Get to ${name} on foot, ${OSM_EN}`,
    hinAuto: ({ name }) => `Get to ${name} by car, ${OSM_EN}`,
    oeffnetOsm: OSM_EN,
    duBistHier: "You are here. Sadly.",
    klein: "✕ Small",
    gross: "⤢ Big",
    nichtGefunden: "Never heard of it. Try the postcode or the next bigger town.",
    tabelleFehlt: "Place list isn't loading. Hit “Where am I?” or try again later.",
  },
};

// Text zum Schlüssel; Funktionen bekommen die Werte. Fehlt ein englischer Text, gilt der deutsche.
export function t(schluessel, werte = {}, sp = sprache()) {
  const eintrag = TEXTE[sp]?.[schluessel] ?? TEXTE.de[schluessel];
  return typeof eintrag === "function" ? eintrag(werte) : eintrag;
}
